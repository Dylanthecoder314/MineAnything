# Mine Anything: a Minecraft Education add-on

Mine the unmineable: **bedrock, water, lava, fire, Nether portals, End portals, even air**.
Then craft bedrock gear and elemental tools from what you collect.

Inspired by Wisp's video [*You Can Mine ANYTHING!*](https://www.youtube.com/watch?v=DibRBYkPiuw).
This is an independent fan recreation for Minecraft Education and Bedrock. It uses no code or
assets from the original mod.

Works on **Minecraft Education 1.21.90 or newer** (built against 1.26.32) and on Minecraft
Bedrock 1.21.90+.

## Install
1. Download **`MineAnything.mcaddon`** from the
   [latest release](https://github.com/Dylanthecoder314/MineAnything/releases/latest) and double-click it.
2. Create a world. Under **Behavior Packs**, activate **Mine Anything (Behavior)**.
3. When you join, you get the **Anything Miner** (a starter pickaxe that never breaks) and the
   **Mine Anything Handbook**, a real book with a page for every tool and recipe.
   Lost the book? Run `/scriptevent mineany:book`.

It can run alongside Chaos Drops. If both are on, Chaos Drops' random drops win for normal blocks.

## How to mine anything
| Target | How | You get |
|---|---|---|
| Bedrock, reinforced deepslate, End portal frames | Keep hitting it (or right-click it with a pickaxe). By hand it takes 24 hits; a diamond pickaxe takes 5. | The block itself |
| Water, lava | Right-click it while holding any pickaxe | Water Cube / Lava Cube |
| Fire, soul fire | Right-click with a pickaxe | Captured Flame |
| Nether portal / End portal | Right-click with a pickaxe | Portal Shard / End Portal Fragment |
| The sky | Right-click with a pickaxe while looking at nothing | Air Cube |
| Glass, ice, spawners, stone by hand... | Break them normally | They now drop themselves |

Education **border, allow and deny blocks** (and command/structure blocks) can never be mined or erased.

## Items
| Item | Recipe | What it does |
|---|---|---|
| Water / Lava Cube | mined | Right-click a block to place a water or lava source. Stacks to 64. Water evaporates in the Nether. |
| Air Cube | mined | Right-click a block to erase it |
| End Portal Fragment | mined | Right-click a block to place an End portal |
| **Anything Miner** | given on first join; or Iron, Diamond, Iron + 2 Sticks | Starter tool: breaks bedrock in 5 hits, scoops everything, never breaks |
| **Bedrock Pickaxe** | 3 Bedrock + 2 Sticks | Breaks almost any block in one hit and drops the block itself. Never breaks. |
| **Bedrock Sword** | 2 Bedrock + Stick | 14 damage, never breaks |
| **Bedrock Armor** | Bedrock in the usual armor shapes | Strongest armor. Wearing all four gives Resistance II. |
| **Magma Blade** | Lava Cube / Captured Flame / Stick | Sets enemies on fire. Fire immunity while held. |
| **Lava Shield** | Lava Cubes + Iron Ingot (shield shape) | Hold it in your off-hand for fire immunity and Resistance. Burns attackers. |
| **Tidal Blade** | 2 Water Cubes + Stick | Knocks enemies flying. Right-click for a tidal wave. |
| **Cloud Boots** | 4 Air Cubes (boots shape) | Super jump and no fall damage. Sneak to fall normally. |
| **Warp Wand** | 2 Portal Shards + Stick | Teleport to the block you're looking at (up to 48 blocks) |
| Bucket + Water/Lava Cube | shapeless | A filled bucket |

Commands (cheats on): `/scriptevent mineany:guide` opens the guide. `/scriptevent mineany:kit` gives every tool.

## Building
```
python3 build.py       # generates build/ and dist/*.mcaddon, validates every reference
node tests/run.mjs     # runs the scripts against a mock of the Minecraft API
```

## License
[MIT](LICENSE). Not affiliated with Mojang Studios, Microsoft or Wisp.
