// Mine Anything: break unbreakable blocks, scoop fluids/fire/portals/air, and make
// blocks that normally drop nothing drop themselves.
import { world, system } from "@minecraft/server";
import * as U from "./util.js";

const BEDROCK_PICKAXE = "mineany:bedrock_pickaxe";

// Blocks survival normally can't break, and how many bare-handed hits they take.
export const TOUGH = {
  "minecraft:bedrock": 24,
  "minecraft:reinforced_deepslate": 20,
  "minecraft:end_portal_frame": 16,
  "minecraft:end_gateway": 16,
};
const TOUGH_DROP = { "minecraft:end_gateway": "mineany:end_fragment" };

// Classroom and admin blocks are never mineable, erasable or replaceable.
export const PROTECTED = new Set([
  "minecraft:barrier", "minecraft:border_block", "minecraft:allow", "minecraft:deny", "minecraft:command_block",
  "minecraft:chain_command_block", "minecraft:repeating_command_block", "minecraft:structure_block",
  "minecraft:structure_void", "minecraft:jigsaw", "minecraft:light_block", "minecraft:camera",
]);

// Right-click these with any pickaxe to collect them.
const SCOOP = {
  "minecraft:water": ["mineany:water_cube", "Water"],
  "minecraft:flowing_water": ["mineany:water_cube", "Water"],
  "minecraft:bubble_column": ["mineany:water_cube", "Water"],
  "minecraft:lava": ["mineany:lava_cube", "Lava"],
  "minecraft:flowing_lava": ["mineany:lava_cube", "Lava"],
  "minecraft:fire": ["mineany:captured_flame", "Fire"],
  "minecraft:soul_fire": ["mineany:captured_flame", "Soul Fire"],
  "minecraft:portal": ["mineany:portal_shard", "a Nether Portal"],
  "minecraft:end_portal": ["mineany:end_fragment", "an End Portal"],
};

// Some blocks change id while lit/powered; drop the normal item instead.
const SELF_ITEM = {
  "minecraft:lit_redstone_ore": "minecraft:redstone_ore",
  "minecraft:lit_deepslate_redstone_ore": "minecraft:deepslate_redstone_ore",
  "minecraft:lit_furnace": "minecraft:furnace",
  "minecraft:lit_blast_furnace": "minecraft:blast_furnace",
  "minecraft:lit_smoker": "minecraft:smoker",
  "minecraft:lit_redstone_lamp": "minecraft:redstone_lamp",
  "minecraft:unlit_redstone_torch": "minecraft:redstone_torch",
  "minecraft:powered_repeater": "minecraft:repeater",
  "minecraft:unpowered_repeater": "minecraft:repeater",
  "minecraft:powered_comparator": "minecraft:comparator",
  "minecraft:unpowered_comparator": "minecraft:comparator",
  "minecraft:redstone_wire": "minecraft:redstone",
  "minecraft:daylight_detector_inverted": "minecraft:daylight_detector",
};

// Never drop these as items (would duplicate or make no sense).
const NO_SELF_DROP = new Set([
  "minecraft:cake", "minecraft:fire", "minecraft:soul_fire", "minecraft:frosted_ice", "minecraft:powder_snow",
  "minecraft:piston_arm_collision", "minecraft:sticky_piston_arm_collision", "minecraft:moving_block",
  "minecraft:wheat", "minecraft:beetroot", "minecraft:cocoa", "minecraft:air",
]);
const noInstaMine = (id) =>
  NO_SELF_DROP.has(id) || id.includes("door") || id.includes("_bed") || id === "minecraft:bed" ||
  id.includes("candle_cake") || ["minecraft:tall_grass", "minecraft:large_fern", "minecraft:sunflower",
    "minecraft:lilac", "minecraft:rose_bush", "minecraft:peony", "minecraft:pitcher_plant", "minecraft:tall_dry_grass",
    "minecraft:small_dripleaf_block", "minecraft:big_dripleaf"].includes(id);

export const ANYTHING_MINER = "mineany:anything_miner";

const PICKAXE_POWER = [["anything_miner", 5], ["bedrock", Infinity], ["netherite", 6], ["diamond", 5], ["iron", 4],
  ["golden", 4], ["copper", 3], ["stone", 2.5], ["wooden", 1.5]];

export const isPickaxe = (id) => !!id && (id.endsWith("_pickaxe") || id === ANYTHING_MINER);

function power(toolId) {
  if (!isPickaxe(toolId)) return 1;
  for (const [key, p] of PICKAXE_POWER) if (toolId.includes(key)) return p;
  return 2;
}

function mineSound(dim, loc) {
  U.sound(dim, "dig.stone", loc);
  U.burst(dim, "minecraft:critical_hit_emitter", loc, 3, 0.4);
}

// ------------------------------------------------------------------ unbreakable blocks

const progress = new Map();

export function hitTough(player, block, toolId) {
  const typeId = block.typeId;
  if (!TOUGH[typeId] || PROTECTED.has(typeId)) return;
  const now = system.currentTick;
  const key = U.blockKey(block);
  let p = progress.get(player.id);
  if (!p || p.key !== key || now - p.last > 80) p = { key, hits: 0, last: -99 };
  if (now - p.last < 3) return; // holding the button fires very fast; cap the rate
  p.last = now;
  p.hits++;
  progress.set(player.id, p);

  const needed = Math.max(1, Math.ceil(TOUGH[typeId] / power(toolId)));
  const loc = U.blockCenter(block.location);
  if (p.hits < needed) {
    const filled = Math.round((p.hits / needed) * 10);
    U.actionbar(player, `§fMining ${U.prettyName(typeId)}  §a${"|".repeat(filled)}§8${"|".repeat(10 - filled)}  §7keep hitting!`);
    mineSound(block.dimension, loc);
    return;
  }
  progress.delete(player.id);
  breakTough(player, block);
}

function breakTough(player, block) {
  const dim = block.dimension;
  const loc = U.blockCenter(block.location);
  const typeId = block.typeId;
  let hasEye = false;
  try {
    hasEye = !!block.permutation.getState("end_portal_eye_bit");
  } catch {}
  try {
    block.setType("minecraft:air");
  } catch {
    return;
  }
  U.spawnStack(dim, TOUGH_DROP[typeId] ?? typeId, loc);
  if (hasEye) U.spawnStack(dim, "minecraft:ender_eye", loc);
  U.burst(dim, "minecraft:critical_hit_emitter", loc, 10, 0.6);
  U.sound(dim, "random.break", loc);
  U.actionbar(player, `§eYou mined ${U.prettyName(typeId)}!`);
}

// Bedrock Pickaxe: one hit breaks (almost) anything and drops the block itself.
function instaMine(player, block) {
  const typeId = block.typeId;
  if (block.isAir || block.isLiquid || PROTECTED.has(typeId) || noInstaMine(typeId)) return false;
  try {
    if (block.getComponent("minecraft:inventory")) return false; // keep chest contents safe
  } catch {}
  const dropId = SELF_ITEM[typeId] ?? typeId;
  if (!U.makeStack(dropId)) return false; // no matching item: let normal mining handle it
  const dim = block.dimension;
  const loc = U.blockCenter(block.location);
  try {
    block.setType("minecraft:air");
  } catch {
    return false;
  }
  if (!U.isCreative(player)) U.spawnStack(dim, dropId, loc);
  mineSound(dim, loc);
  return true;
}

world.afterEvents.entityHitBlock.subscribe(({ damagingEntity: player, hitBlock: block }) => {
  if (player?.typeId !== "minecraft:player" || !block || U.isCreative(player)) return;
  const tool = U.held(player)?.typeId;
  if (TOUGH[block.typeId]) hitTough(player, block, tool);
  else if (tool === BEDROCK_PICKAXE) instaMine(player, block);
});

// ------------------------------------------------------------------ fluids, fire, portals, air

const lastScoop = new Map();
const lastAir = new Map();

export function scoop(player) {
  const now = system.currentTick;
  if ((lastScoop.get(player.id) ?? -99) > now - 5) return;
  lastScoop.set(player.id, now);

  let hit;
  try {
    hit = player.getBlockFromViewDirection({ maxDistance: 6, includeLiquidBlocks: true, includePassableBlocks: true });
  } catch {}
  const block = hit?.block;
  if (block && !block.isAir) {
    const found = SCOOP[block.typeId];
    if (!found) return;
    const [reward, label] = found;
    const dim = block.dimension;
    const loc = U.blockCenter(block.location);
    try {
      block.setType("minecraft:air");
    } catch {
      return;
    }
    U.giveItem(player, reward);
    U.burst(dim, block.typeId.includes("lava") ? "minecraft:lava_particle" : "minecraft:critical_hit_emitter", loc, 5, 0.4);
    U.sound(dim, label === "Water" ? "bucket.fill_water" : label === "Lava" ? "bucket.fill_lava" : "random.pop", loc);
    U.actionbar(player, `§bYou mined ${label}!`);
    return;
  }

  // Nothing within reach: you mined the air itself.
  if ((lastAir.get(player.id) ?? -99) > now - 15) return;
  lastAir.set(player.id, now);
  U.giveItem(player, "mineany:air_cube");
  try {
    const head = player.getHeadLocation();
    const dir = player.getViewDirection();
    U.burst(player.dimension, "minecraft:endrod", U.offset(head, dir.x * 3, dir.y * 3, dir.z * 3), 4, 0.3);
  } catch {}
  U.sound(player.dimension, "random.pop", player.location, { pitch: 1.6 });
  U.actionbar(player, "§fYou mined some §bAir§f!");
}

world.afterEvents.itemUse.subscribe(({ source: player, itemStack }) => {
  if (player?.typeId === "minecraft:player" && isPickaxe(itemStack?.typeId)) scoop(player);
});

// ------------------------------------------------------------------ everything drops something

const pending = new Map();

world.beforeEvents.playerBreakBlock.subscribe(({ block, player }) => {
  if (U.isCreative(player) || NO_SELF_DROP.has(block.typeId)) return;
  let before = [];
  try {
    before = block.dimension.getEntities({ type: "minecraft:item", location: U.blockCenter(block.location), maxDistance: 3 }).map((e) => e.id);
  } catch {}
  pending.set(U.blockKey(block), { typeId: block.typeId, before: new Set(before), tick: system.currentTick });
});

world.afterEvents.playerBreakBlock.subscribe(({ block, dimension }) => {
  const key = U.blockKey(block);
  const info = pending.get(key);
  if (!info) return;
  pending.delete(key);
  const loc = U.blockCenter(block.location);
  system.runTimeout(() => {
    let items = [];
    try {
      items = dimension.getEntities({ type: "minecraft:item", location: loc, maxDistance: 2.5 });
    } catch {}
    if (items.some((e) => !info.before.has(e.id))) return; // it dropped something already
    U.spawnStack(dimension, SELF_ITEM[info.typeId] ?? info.typeId, loc);
  }, 1);
});

system.runInterval(() => {
  const now = system.currentTick;
  for (const [key, info] of pending) if (now - info.tick > 40) pending.delete(key);
}, 200);
