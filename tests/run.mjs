// Drives the built scripts against the mock API.  Run after build.py:  node tests/run.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { S, world, system, advance, fireBefore, Dimension, Entity, Player, ItemStack } from "./mock/server.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const sandbox = path.join(root, "build", "test");

fs.rmSync(sandbox, { recursive: true, force: true });
fs.cpSync(path.join(root, "build", "MineAnything_BP", "scripts"), path.join(sandbox, "scripts"), { recursive: true });
fs.writeFileSync(path.join(sandbox, "package.json"), JSON.stringify({ type: "module" }));
for (const [name, file] of [["server", "server.mjs"], ["server-ui", "server-ui.mjs"]]) {
  const dir = path.join(sandbox, "node_modules", "@minecraft", name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: `@minecraft/${name}`, type: "module", main: "index.js" }));
  fs.writeFileSync(path.join(dir, "index.js"), `export * from ${JSON.stringify(pathToFileURL(path.join(here, "mock", file)).href)};\n`);
}

const failures = [];
const warnings = [];
console.warn = (...a) => warnings.push(a.join(" "));
const check = (cond, msg) => {
  if (!cond) failures.push(msg);
};
const flush = () => new Promise((r) => setTimeout(r, 0));

const overworld = new Dimension("minecraft:overworld");
const nether = new Dimension("minecraft:nether");
S.early = true;
await import(pathToFileURL(path.join(sandbox, "scripts", "main.js")).href);
S.early = false;

const steve = new Player("Steve", overworld, { x: 0.5, y: 64, z: 0.5 });
world.afterEvents.playerSpawn.fire({ player: steve, initialSpawn: true });
advance(90);
check(steve.inventory.includes("mineany:anything_miner"), "new player gets the Anything Miner");
check(S.log.includes('cmd loot give @s loot "mineany/handbook"'), "new player gets the handbook (loot command)");
check(steve.titles.some((t) => t.includes("MINE ANYTHING")), "welcome title");
const giftCount = steve.inventory.length;
world.afterEvents.playerSpawn.fire({ player: steve, initialSpawn: true });
advance(90);
check(steve.inventory.length === giftCount && S.log.filter((l) => l.includes("handbook")).length === 1, "gifts are only given once");
// A player from the first version (only had the old tag) still gets the new gifts.
const alex = new Player("Alex", overworld, { x: 3.5, y: 64, z: 0.5 });
alex.tags.add("mineany:got_guide");
alex.failCommands = true;
world.afterEvents.playerSpawn.fire({ player: alex, initialSpawn: true });
advance(90);
check(alex.inventory.includes("mineany:anything_miner"), "existing players get the Anything Miner on their next join");
check(alex.inventory.includes("mineany:miners_guide"), "if the book command fails, the menu guide is given instead");
alex.remove();
S.players.splice(S.players.indexOf(alex), 1);

const hold = (id, slot = "Mainhand") => {
  steve.equipment[slot] = id ? new ItemStack(id, 1) : undefined;
};
const itemsAt = (dim, loc) => dim.getEntities({ type: "minecraft:item", location: { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 }, maxDistance: 2 })
  .map((e) => e.itemStack.typeId);
function hit(loc, times, dim = overworld) {
  for (let i = 0; i < times; i++) {
    world.afterEvents.entityHitBlock.fire({ damagingEntity: steve, hitBlock: dim.getBlock(loc) });
    advance(3);
  }
}

// ---- unbreakable blocks
let at = { x: 10, y: 63, z: 0 };
overworld.setBlockAt(at, "minecraft:bedrock");
hold(undefined);
hit(at, 23);
check(overworld.blockAt(at) === "minecraft:bedrock", "bedrock survives 23 bare-handed hits");
check(steve.actionbars.at(-1).includes("keep hitting"), "mining progress bar shown");
hit(at, 1);
check(overworld.blockAt(at) === "minecraft:air", "bedrock breaks on hit 24 by hand");
check(itemsAt(overworld, at).includes("minecraft:bedrock"), "bedrock item drops");

at = { x: 20, y: 63, z: 0 };
overworld.setBlockAt(at, "minecraft:bedrock");
hold("minecraft:diamond_pickaxe");
hit(at, 5);
check(overworld.blockAt(at) === "minecraft:air", "diamond pickaxe breaks bedrock in 5 hits");

at = { x: 30, y: 63, z: 0 };
overworld.setBlockAt(at, "minecraft:bedrock");
for (let i = 0; i < 10; i++) world.afterEvents.entityHitBlock.fire({ damagingEntity: steve, hitBlock: overworld.getBlock(at) });
check(overworld.blockAt(at) === "minecraft:bedrock", "hits in the same tick only count once");
for (let i = 0; i < 5; i++) {
  fireBefore(world.beforeEvents.playerInteractWithBlock, { player: steve, block: overworld.getBlock(at), blockFace: "Up", itemStack: steve.equipment.Mainhand });
  advance(3);
}
check(overworld.blockAt(at) === "minecraft:air", "right-clicking with a pickaxe also mines bedrock");

at = { x: 35, y: 63, z: 0 };
overworld.setBlockAt(at, "minecraft:bedrock");
hold("mineany:anything_miner");
hit(at, 4);
check(overworld.blockAt(at) === "minecraft:bedrock", "anything miner: bedrock survives 4 hits");
hit(at, 1);
check(overworld.blockAt(at) === "minecraft:air", "anything miner breaks bedrock in 5 hits");
overworld.setBlockAt({ x: 0, y: 64, z: 5 }, "minecraft:lava");
steve.look = { block: overworld.getBlock({ x: 0, y: 64, z: 5 }), face: "North" };
world.afterEvents.itemUse.fire({ source: steve, itemStack: steve.equipment.Mainhand });
check(steve.inventory.at(-1) === "mineany:lava_cube", "anything miner scoops lava");
steve.look = undefined;
advance(20);

at = { x: 40, y: 63, z: 0 };
overworld.setBlockAt(at, "minecraft:end_portal_frame");
overworld.eyes.add(overworld.key(at));
hold("minecraft:netherite_pickaxe");
hit(at, 3);
check(itemsAt(overworld, at).includes("minecraft:end_portal_frame") && itemsAt(overworld, at).includes("minecraft:ender_eye"), "end portal frame drops itself and its eye");

at = { x: 50, y: 63, z: 0 };
overworld.setBlockAt(at, "minecraft:border_block");
hold("mineany:bedrock_pickaxe");
hit(at, 30);
check(overworld.blockAt(at) === "minecraft:border_block", "border blocks can never be mined");

// ---- bedrock pickaxe one-hit mining
at = { x: 60, y: 63, z: 0 };
overworld.setBlockAt(at, "minecraft:diamond_ore");
hit(at, 1);
check(overworld.blockAt(at) === "minecraft:air" && itemsAt(overworld, at).includes("minecraft:diamond_ore"), "bedrock pickaxe one-hits blocks and drops the block");
at = { x: 70, y: 63, z: 0 };
overworld.setBlockAt(at, "minecraft:chest");
hit(at, 1);
check(overworld.blockAt(at) === "minecraft:chest", "bedrock pickaxe leaves chests to normal mining (contents stay safe)");
at = { x: 80, y: 63, z: 0 };
overworld.setBlockAt(at, "minecraft:bedrock");
hit(at, 1);
check(overworld.blockAt(at) === "minecraft:air", "bedrock pickaxe breaks bedrock in one hit");

// ---- scooping with a pickaxe
hold("minecraft:iron_pickaxe");
const scoopTests = [["minecraft:water", "mineany:water_cube"], ["minecraft:lava", "mineany:lava_cube"],
  ["minecraft:fire", "mineany:captured_flame"], ["minecraft:portal", "mineany:portal_shard"],
  ["minecraft:end_portal", "mineany:end_fragment"]];
let sawOptions;
for (const [block, reward] of scoopTests) {
  const loc = { x: 0, y: 64, z: 5 };
  overworld.setBlockAt(loc, block);
  steve.look = (opts) => {
    sawOptions = opts;
    return { block: overworld.getBlock(loc), face: "North" };
  };
  world.afterEvents.itemUse.fire({ source: steve, itemStack: steve.equipment.Mainhand });
  check(overworld.blockAt(loc) === "minecraft:air" && steve.inventory.at(-1) === reward, `scooping ${block} gives ${reward}`);
  advance(10);
}
check(sawOptions?.includeLiquidBlocks && sawOptions?.includePassableBlocks, "raycast includes liquids and passable blocks");
steve.look = undefined;
world.afterEvents.itemUse.fire({ source: steve, itemStack: steve.equipment.Mainhand });
check(steve.inventory.at(-1) === "mineany:air_cube", "right-clicking the sky gives an Air Cube");
const before = steve.inventory.length;
advance(6);
world.afterEvents.itemUse.fire({ source: steve, itemStack: steve.equipment.Mainhand });
check(steve.inventory.length === before, "air mining has a short cooldown");
steve.look = { block: overworld.getBlock({ x: 0, y: 63, z: 0 }), face: "Up" };
advance(20);
world.afterEvents.itemUse.fire({ source: steve, itemStack: steve.equipment.Mainhand });
check(steve.inventory.length === before && overworld.blockAt({ x: 0, y: 63, z: 0 }) === "minecraft:stone", "looking at normal blocks does nothing");

// ---- blocks that drop nothing drop themselves
function breakNormally(loc, typeId, vanillaDrops) {
  overworld.setBlockAt(loc, typeId);
  fireBefore(world.beforeEvents.playerBreakBlock, { block: overworld.getBlock(loc), player: steve });
  overworld.setBlockAt(loc, "minecraft:air");
  for (const d of vanillaDrops) overworld.spawnItem(new ItemStack(d), { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 });
  world.afterEvents.playerBreakBlock.fire({ block: overworld.getBlock(loc), dimension: overworld, player: steve });
  advance(2);
  return itemsAt(overworld, loc);
}
check(breakNormally({ x: 100, y: 63, z: 0 }, "minecraft:glass", []).join() === "minecraft:glass", "glass drops itself");
check(breakNormally({ x: 110, y: 63, z: 0 }, "minecraft:mob_spawner", []).join() === "minecraft:mob_spawner", "spawners drop themselves");
check(breakNormally({ x: 120, y: 63, z: 0 }, "minecraft:stone", ["minecraft:cobblestone"]).join() === "minecraft:cobblestone", "normal drops are left alone");
check(breakNormally({ x: 130, y: 63, z: 0 }, "minecraft:lit_redstone_ore", []).join() === "minecraft:redstone_ore", "lit blocks drop their normal item");
check(breakNormally({ x: 140, y: 63, z: 0 }, "minecraft:cake", []).length === 0, "cake does not duplicate");

// ---- placing cubes
function useOn(loc, face, id, amount = 3, dim = overworld) {
  steve.dimension = dim;
  steve.equipment.Mainhand = new ItemStack(id, amount);
  const ev = fireBefore(world.beforeEvents.playerInteractWithBlock, { player: steve, block: dim.getBlock(loc), blockFace: face, itemStack: steve.equipment.Mainhand });
  advance(5);
  steve.dimension = overworld;
  return ev;
}
let ev = useOn({ x: 5, y: 63, z: 5 }, "Up", "mineany:water_cube");
check(ev.cancel === true, "cube use cancels the vanilla interaction");
check(overworld.blockAt({ x: 5, y: 64, z: 5 }) === "minecraft:water" && steve.equipment.Mainhand.amount === 2, "water cube places water and is used up");
useOn({ x: 7, y: 63, z: 5 }, "East", "mineany:lava_cube", 1);
check(overworld.blockAt({ x: 8, y: 63, z: 5 }) === "minecraft:stone", "cubes don't replace solid blocks");
useOn({ x: 7, y: 63, z: 5 }, "Up", "mineany:lava_cube", 1);
check(overworld.blockAt({ x: 7, y: 64, z: 5 }) === "minecraft:lava" && steve.equipment.Mainhand === undefined, "last lava cube is used up");
useOn({ x: 5, y: 63, z: 5 }, "Up", "mineany:water_cube", 2, nether);
check(nether.blockAt({ x: 5, y: 64, z: 5 }) === "minecraft:air", "water evaporates in the Nether");
useOn({ x: 9, y: 63, z: 5 }, "Up", "mineany:end_fragment");
check(overworld.blockAt({ x: 9, y: 64, z: 5 }) === "minecraft:end_portal", "end fragment places an End portal");
useOn({ x: 11, y: 63, z: 5 }, "Up", "mineany:air_cube");
check(overworld.blockAt({ x: 11, y: 63, z: 5 }) === "minecraft:air", "air cube erases the block");
overworld.setBlockAt({ x: 13, y: 63, z: 5 }, "minecraft:deny");
useOn({ x: 13, y: 63, z: 5 }, "Up", "mineany:air_cube");
check(overworld.blockAt({ x: 13, y: 63, z: 5 }) === "minecraft:deny", "air cube can't erase deny blocks");

// ---- tools
const zombie = new Entity("minecraft:zombie", overworld, { x: 2, y: 64, z: 0.5 });
hold("mineany:magma_blade");
world.afterEvents.entityHitEntity.fire({ damagingEntity: steve, hitEntity: zombie });
check(zombie.onFire > 0, "magma blade sets targets on fire");
hold("mineany:tidal_blade");
world.afterEvents.entityHitEntity.fire({ damagingEntity: steve, hitEntity: zombie });
world.afterEvents.itemUse.fire({ source: steve, itemStack: steve.equipment.Mainhand });
check(zombie.knocked >= 2, "tidal blade knocks back (hit + wave)");
hold("mineany:lava_shield", "Offhand");
zombie.onFire = 0;
world.afterEvents.entityHurt.fire({ hurtEntity: steve, damageSource: { damagingEntity: zombie } });
check(zombie.onFire > 0, "lava shield burns attackers");
hold("mineany:warp_wand");
overworld.setBlockAt({ x: 0, y: 63, z: 30 }, "minecraft:stone");
steve.look = { block: overworld.getBlock({ x: 0, y: 63, z: 30 }), face: "Up" };
world.afterEvents.itemUse.fire({ source: steve, itemStack: steve.equipment.Mainhand });
check(steve.location.z === 30.5 && steve.location.y === 64, `warp wand teleports on top of the block (${JSON.stringify(steve.location)})`);
for (const [slot, id] of [["Head", "helmet"], ["Chest", "chestplate"], ["Legs", "leggings"], ["Feet", "boots"]]) hold(`mineany:bedrock_${id}`, slot);
steve.effects = [];
advance(20);
check(steve.effects.includes("resistance") && steve.effects.includes("fire_resistance"), "bedrock set + shield effects");
hold("mineany:cloud_boots", "Feet");
steve.velocity = { x: 0, y: -0.8, z: 0 };
steve.effects = [];
advance(4);
check(steve.effects.includes("slow_falling"), "cloud boots catch a fall");
check(steve.effects.includes("jump_boost") || (advance(10), steve.effects.includes("jump_boost")), "cloud boots give jump boost");

// ---- commands & guide
const invBefore = steve.inventory.length;
system.afterEvents.scriptEventReceive.fire({ id: "mineany:kit", sourceEntity: steve });
check(steve.inventory.length - invBefore === 12, "kit command gives all tools");
system.afterEvents.scriptEventReceive.fire({ id: "mineany:book", sourceEntity: steve });
check(S.log.filter((l) => l.includes("handbook")).length === 2, "/scriptevent mineany:book gives another handbook");
hold("mineany:miners_guide");
advance(20);
world.afterEvents.itemUse.fire({ source: steve, itemStack: steve.equipment.Mainhand });
await flush();
check(S.forms.some((f) => f.title.includes("Miner's Guide") && f.body.includes("Bedrock")), "guide opens");

advance(100);
for (const w of warnings) failures.push(`warning: ${w}`);
if (failures.length) {
  console.log(`FAILED (${failures.length}):`);
  for (const f of failures) console.log("  -", f);
  process.exit(1);
}
console.log("All script checks passed.");
