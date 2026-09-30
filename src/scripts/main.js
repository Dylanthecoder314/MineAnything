// Mine Anything entry point.
import { world, system } from "@minecraft/server";
import "./mining.js";
import "./tools.js";
import { openGuide } from "./guide.js";
import * as U from "./util.js";

// The handbook is a real written book built by a loot table (loot_tables/mineany/handbook.json).
export function giveHandbook(player) {
  try {
    player.runCommand('loot give @s loot "mineany/handbook"');
    return true;
  } catch {
    U.giveItem(player, "mineany:miners_guide"); // fallback: the menu-style guide
    return false;
  }
}

// Each gift has its own tag, so players from older versions still get new ones.
function giveStarterItems(player) {
  if (!player.hasTag("mineany:got_miner")) {
    player.addTag("mineany:got_miner");
    U.giveItem(player, "mineany:anything_miner");
  }
  if (!player.hasTag("mineany:got_book")) {
    player.addTag("mineany:got_book");
    giveHandbook(player);
  }
}

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) return;
  system.runTimeout(() => {
    try {
      U.title(player, "§6§lMINE ANYTHING", "§eBedrock, water, lava, fire, even air!");
      U.tell(player, "§6[Mine Anything] §fYou got the §bAnything Miner§f! Keep hitting §ebedrock§f to break it, and right-click §bwater, lava, fire, portals or the sky§f to collect them.");
      U.tell(player, "§6[Mine Anything] §7Read the §6Mine Anything Handbook§7 to learn every tool and recipe.");
      giveStarterItems(player);
    } catch {}
  }, 80);
});

// /scriptevent mineany:book | mineany:guide | mineany:kit (every tool, for testing)
system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
  const player = sourceEntity?.typeId === "minecraft:player" ? sourceEntity : U.allPlayers()[0];
  if (!player) return;
  if (id === "mineany:book") giveHandbook(player);
  if (id === "mineany:guide") openGuide(player);
  if (id === "mineany:kit") {
    for (const item of ["anything_miner", "bedrock_pickaxe", "bedrock_sword", "bedrock_helmet", "bedrock_chestplate",
      "bedrock_leggings", "bedrock_boots", "magma_blade", "tidal_blade", "lava_shield", "cloud_boots", "warp_wand"]) {
      U.giveItem(player, `mineany:${item}`);
    }
  }
});
