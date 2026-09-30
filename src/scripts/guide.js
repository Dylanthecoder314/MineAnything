import { ActionFormData } from "@minecraft/server-ui";

const GUIDE = [
  "§l§6HOW TO MINE ANYTHING§r",
  "§f- §bAnything Miner§f (you get one when you join; recipe: Iron, Diamond, Iron / 2 Sticks): never breaks,",
  "§f  breaks bedrock in 5 hits, and scoops everything below.",
  "§f- §eBedrock, End portal frames, reinforced deepslate:§f keep hitting them. A better pickaxe needs fewer hits.",
  "§f- §bWater, lava, fire, portals:§f right-click them while holding any pickaxe.",
  "§f- §fAir:§f right-click the sky with a pickaxe to get an Air Cube.",
  "§f- Blocks that normally drop nothing (glass, ice, spawners, stone by hand) now drop themselves.",
  "",
  "§l§6USING WHAT YOU MINE§r",
  "§f- §bWater Cube / Lava Cube:§f right-click a block to place it. Stackable buckets!",
  "§f- §fAir Cube:§f right-click a block to erase it.",
  "§f- §2End Portal Fragment:§f right-click a block to place an End portal. Jump in!",
  "",
  "§l§7BEDROCK GEAR §r§7(never breaks)",
  "§f- Pickaxe (3 Bedrock + 2 Sticks): breaks almost any block in one hit and drops the block itself.",
  "§f- Sword (2 Bedrock + Stick): 14 damage.",
  "§f- Helmet, Chestplate, Leggings, Boots: same shapes as iron armor. Wear all 4 for Resistance II.",
  "",
  "§l§cLAVA & FIRE§r",
  "§f- Magma Blade (Lava Cube / Captured Flame / Stick): sets enemies on fire. Fire immunity while held.",
  "§f- Lava Shield (Lava Cubes + 1 Iron Ingot, shield shape): hold in your OFF-HAND for fire immunity",
  "§f  and Resistance. Burns anyone who hits you.",
  "",
  "§l§9WATER & AIR§r",
  "§f- Tidal Blade (2 Water Cubes + Stick): knocks enemies flying. Right-click for a tidal wave.",
  "§f- Cloud Boots (4 Air Cubes, boots shape): super jump and no fall damage (sneak to fall fast).",
  "",
  "§l§5PORTAL§r",
  "§f- Warp Wand (2 Portal Shards + Stick): right-click to teleport to the block you're looking at.",
  "",
  "§7Bucket + Water/Lava Cube = a filled bucket. Border, allow and deny blocks can never be mined.",
].join("\n");

export function openGuide(player) {
  new ActionFormData().title("§6§lMiner's Guide").body(GUIDE).button("Got it!").show(player).catch(() => {});
}
