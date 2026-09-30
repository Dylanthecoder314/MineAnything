import { world, ItemStack } from "@minecraft/server";

export const rand = (min, max) => min + Math.random() * (max - min);

// GameMode enum values changed case between API versions, so compare loosely.
export function isCreative(player) {
  try {
    const mode = String(player.getGameMode()).toLowerCase();
    return mode === "creative" || mode === "spectator";
  } catch {
    return false;
  }
}

export const blockCenter = (loc) => ({ x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 });
export const offset = (loc, dx, dy, dz) => ({ x: loc.x + dx, y: loc.y + dy, z: loc.z + dz });
export const blockKey = (block) => `${block.dimension.id}|${block.x}|${block.y}|${block.z}`;

export const FACE = { Up: [0, 1, 0], Down: [0, -1, 0], North: [0, 0, -1], South: [0, 0, 1], East: [1, 0, 0], West: [-1, 0, 0] };

export function makeStack(id, amount = 1) {
  try {
    const stack = new ItemStack(id, 1);
    stack.amount = Math.max(1, Math.min(amount, stack.maxAmount));
    return stack;
  } catch {
    return undefined;
  }
}

export function spawnStack(dim, id, loc, amount = 1) {
  const stack = makeStack(id, amount);
  if (!stack) return undefined;
  try {
    return dim.spawnItem(stack, loc);
  } catch {
    return undefined;
  }
}

export function giveItem(player, id, amount = 1) {
  const stack = makeStack(id, amount);
  if (!stack) return;
  try {
    const leftover = player.getComponent("minecraft:inventory").container.addItem(stack);
    if (leftover) player.dimension.spawnItem(leftover, player.location);
  } catch {}
}

export function held(player, slot = "Mainhand") {
  try {
    return player.getComponent("minecraft:equippable")?.getEquipment(slot);
  } catch {
    return undefined;
  }
}

// Use up one of the item in the main hand (not in Creative).
export function consumeHeld(player) {
  if (isCreative(player)) return;
  try {
    const eq = player.getComponent("minecraft:equippable");
    const stack = eq.getEquipment("Mainhand");
    if (!stack) return;
    if (stack.amount > 1) {
      stack.amount -= 1;
      eq.setEquipment("Mainhand", stack);
    } else {
      eq.setEquipment("Mainhand", undefined);
    }
  } catch {}
}

export function particle(dim, id, loc) {
  try {
    dim.spawnParticle(id, loc);
  } catch {}
}

export function burst(dim, id, loc, count, radius) {
  for (let i = 0; i < count; i++) {
    particle(dim, id, offset(loc, rand(-radius, radius), rand(-radius, radius), rand(-radius, radius)));
  }
}

export function sound(dim, id, loc, options = {}) {
  try {
    dim.playSound(id, loc, options);
  } catch {}
}

export function actionbar(player, text) {
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {}
}

export function title(player, main, subtitle = "") {
  try {
    player.onScreenDisplay.setTitle(main, { subtitle, fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
  } catch {}
}

export function tell(player, message) {
  try {
    player.sendMessage(message);
  } catch {}
}

export function effect(entity, id, seconds, amplifier = 0, showParticles = true) {
  try {
    entity.addEffect(id, Math.round(seconds * 20), { amplifier, showParticles });
  } catch {}
}

// applyKnockback takes (VectorXZ, vertical) in 2.x and (dirX, dirZ, h, v) in 1.x.
export function knockback(entity, dx, dz, horizontal, vertical) {
  const len = Math.hypot(dx, dz) || 1;
  try {
    entity.applyKnockback({ x: (dx / len) * horizontal, z: (dz / len) * horizontal }, vertical);
  } catch {
    try {
      entity.applyKnockback(dx / len, dz / len, horizontal, vertical);
    } catch {}
  }
}

export function isOpen(dim, loc) {
  try {
    const block = dim.getBlock({ x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) });
    return !!block && (block.isAir || REPLACEABLE.has(block.typeId));
  } catch {
    return false;
  }
}

export const REPLACEABLE = new Set([
  "minecraft:short_grass", "minecraft:tall_grass", "minecraft:fern", "minecraft:large_fern", "minecraft:snow_layer",
  "minecraft:short_dry_grass", "minecraft:tall_dry_grass", "minecraft:bush", "minecraft:leaf_litter",
  "minecraft:deadbush", "minecraft:vine", "minecraft:glow_lichen", "minecraft:seagrass", "minecraft:fire",
  "minecraft:soul_fire", "minecraft:water", "minecraft:flowing_water", "minecraft:lava", "minecraft:flowing_lava",
]);

export function prettyName(id) {
  return id
    .replace(/^[a-z_]+:/, "")
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function allPlayers() {
  try {
    return world.getAllPlayers();
  } catch {
    return [];
  }
}
