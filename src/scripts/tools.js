// Custom tool powers and placeable cubes.
import { world, system } from "@minecraft/server";
import { PROTECTED, TOUGH, hitTough, isPickaxe } from "./mining.js";
import { openGuide } from "./guide.js";
import * as U from "./util.js";

const PLACES = {
  "mineany:water_cube": "minecraft:water",
  "mineany:lava_cube": "minecraft:lava",
  "mineany:end_fragment": "minecraft:end_portal",
};
const AIR_CUBE = "mineany:air_cube";
const MAGMA = "mineany:magma_blade";
const TIDAL = "mineany:tidal_blade";
const SHIELD = "mineany:lava_shield";
const CLOUD = "mineany:cloud_boots";
const WAND = "mineany:warp_wand";
const BEDROCK_SET = ["mineany:bedrock_helmet", "mineany:bedrock_chestplate", "mineany:bedrock_leggings", "mineany:bedrock_boots"];

const cooldowns = new Map();
function ready(player, what, ticks) {
  const key = `${player.id}:${what}`;
  const now = system.currentTick;
  if ((cooldowns.get(key) ?? -999) > now) return false;
  cooldowns.set(key, now + ticks);
  return true;
}

// ------------------------------------------------------------------ right-clicking blocks

// The before-event fires for every right-click on a block, even when nothing would happen.
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const { player, block, blockFace, itemStack } = event;
  const id = itemStack?.typeId;
  if (!id) return;
  if (PLACES[id] || id === AIR_CUBE) {
    event.cancel = true;
    system.run(() => useCube(player, block, blockFace, id));
  } else if (isPickaxe(id) && TOUGH[block.typeId]) {
    system.run(() => hitTough(player, block, id));
  }
});

function useCube(player, block, face, id) {
  if (!ready(player, "cube", 4)) return;
  const dim = block.dimension;
  if (id === AIR_CUBE) {
    if (block.isAir || PROTECTED.has(block.typeId)) return;
    const loc = U.blockCenter(block.location);
    try {
      block.setType("minecraft:air");
    } catch {
      return;
    }
    U.consumeHeld(player);
    U.burst(dim, "minecraft:endrod", loc, 5, 0.4);
    U.sound(dim, "random.pop", loc);
    return;
  }
  const [dx, dy, dz] = U.FACE[face] ?? [0, 1, 0];
  const at = { x: block.x + dx, y: block.y + dy, z: block.z + dz };
  if (!U.isOpen(dim, at)) return;
  const loc = U.blockCenter(at);
  if (id === "mineany:water_cube" && dim.id === "minecraft:nether") {
    U.consumeHeld(player);
    U.sound(dim, "random.fizz", loc);
    U.burst(dim, "minecraft:campfire_smoke_particle", loc, 4, 0.3);
    U.actionbar(player, "§7The water evaporated in the Nether heat!");
    return;
  }
  try {
    dim.getBlock(at).setType(PLACES[id]);
  } catch {
    return;
  }
  U.consumeHeld(player);
  U.sound(dim, id.includes("water") ? "bucket.empty_water" : id.includes("lava") ? "bucket.empty_lava" : "random.orb", loc);
}

// ------------------------------------------------------------------ right-clicking the air

world.afterEvents.itemUse.subscribe(({ source: player, itemStack }) => {
  if (player?.typeId !== "minecraft:player") return;
  switch (itemStack?.typeId) {
    case TIDAL:
      return tidalWave(player);
    case WAND:
      return warp(player);
    case "mineany:miners_guide":
      if (ready(player, "guide", 10)) openGuide(player);
  }
});

function tidalWave(player) {
  if (!ready(player, "wave", 60)) return U.actionbar(player, "§7The tide is still coming back...");
  const dim = player.dimension;
  const at = player.location;
  let targets = [];
  try {
    targets = dim.getEntities({ location: at, maxDistance: 7, excludeTypes: ["minecraft:item", "minecraft:xp_orb", "minecraft:player"] });
  } catch {}
  for (const e of targets) U.knockback(e, e.location.x - at.x, e.location.z - at.z, 2.4, 0.55);
  try {
    player.extinguishFire();
  } catch {}
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    U.particle(dim, "minecraft:knockback_roar_particle", U.offset(at, Math.cos(a) * 2.5, 0.5, Math.sin(a) * 2.5));
  }
  U.sound(dim, "bucket.empty_water", at, { pitch: 0.6 });
  U.actionbar(player, `§bTidal wave! §7(pushed ${targets.length})`);
}

function warp(player) {
  if (!ready(player, "warp", 30)) return;
  let hit;
  try {
    hit = player.getBlockFromViewDirection({ maxDistance: 48 });
  } catch {}
  if (!hit?.block) return U.actionbar(player, "§7Look at a block to warp to it (up to 48 blocks).");
  const b = hit.block;
  const dim = player.dimension;
  const top = { x: b.x + 0.5, y: b.y + 1, z: b.z + 0.5 };
  const [dx, dy, dz] = U.FACE[hit.face] ?? [0, 1, 0];
  const side = { x: b.x + dx + 0.5, y: b.y + dy, z: b.z + dz + 0.5 };
  const roomy = (l) => U.isOpen(dim, l) && U.isOpen(dim, U.offset(l, 0, 1, 0));
  const dest = roomy(top) ? top : roomy(side) ? side : undefined;
  if (!dest) return U.actionbar(player, "§7No room to land there.");
  U.burst(dim, "minecraft:mob_portal", player.location, 10, 0.6);
  try {
    player.teleport(dest);
  } catch {
    return;
  }
  U.burst(dim, "minecraft:mob_portal", dest, 10, 0.6);
  U.sound(dim, "mob.endermen.portal", dest);
}

// ------------------------------------------------------------------ combat

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity: player, hitEntity: target }) => {
  if (player?.typeId !== "minecraft:player" || !target) return;
  const tool = U.held(player)?.typeId;
  if (tool === MAGMA) {
    try {
      target.setOnFire(5, true);
    } catch {}
    U.burst(target.dimension, "minecraft:basic_flame_particle", target.location, 4, 0.4);
  } else if (tool === TIDAL) {
    U.knockback(target, target.location.x - player.location.x, target.location.z - player.location.z, 2.0, 0.4);
  }
});

world.afterEvents.entityHurt.subscribe(({ hurtEntity, damageSource }) => {
  if (hurtEntity?.typeId !== "minecraft:player" || U.held(hurtEntity, "Offhand")?.typeId !== SHIELD) return;
  const attacker = damageSource?.damagingEntity;
  if (!attacker || attacker.id === hurtEntity.id) return;
  try {
    attacker.setOnFire(4, true);
  } catch {}
  U.knockback(attacker, attacker.location.x - hurtEntity.location.x, attacker.location.z - hurtEntity.location.z, 0.8, 0.2);
});

// ------------------------------------------------------------------ passive powers

system.runInterval(() => {
  for (const p of U.allPlayers()) {
    const slot = (s) => U.held(p, s)?.typeId;
    const main = slot("Mainhand");
    const off = slot("Offhand");
    if (BEDROCK_SET.every((id, i) => slot(["Head", "Chest", "Legs", "Feet"][i]) === id)) U.effect(p, "resistance", 1.5, 1, false);
    if (main === MAGMA || off === SHIELD) U.effect(p, "fire_resistance", 1.5, 0, false);
    if (off === SHIELD) U.effect(p, "resistance", 1.5, 0, false);
    if (main === TIDAL) U.effect(p, "water_breathing", 1.5, 0, false);
    if (slot("Feet") === CLOUD) U.effect(p, "jump_boost", 1.5, 1, false);
  }
}, 10);

// Cloud Boots: catch the player before a fall can hurt.
system.runInterval(() => {
  for (const p of U.allPlayers()) {
    if (U.held(p, "Feet")?.typeId !== CLOUD || p.isSneaking) continue;
    try {
      if (p.getVelocity().y < -0.45) U.effect(p, "slow_falling", 0.5, 0, false);
    } catch {}
  }
}, 2);
