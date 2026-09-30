"""Behavior-pack and resource-pack JSON for Mine Anything."""
import uuid

NS = "mineany"
VERSION = [1, 0, 0]
MIN_ENGINE = [1, 21, 90]  # @minecraft/server 2.0.0 needs 1.21.90+
DESCRIPTION = "Mine ANYTHING: bedrock, water, lava, fire, portals, even air. Craft bedrock gear and elemental tools."


def stable_uuid(name):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"mineanything/{name}"))


BP_UUID = stable_uuid("bp")
RP_UUID = stable_uuid("rp")

# --------------------------------------------------------------------------- items

PICKAXE_TAGS = ("query.any_tag('stone', 'metal', 'diamond_pick_diggable', 'iron_pick_diggable', 'stone_pick_diggable', "
                "'wood', 'dirt', 'sand', 'gravel', 'grass', 'snow', 'ice', 'plant', 'rail', "
                "'minecraft:is_pickaxe_item_destructible', 'minecraft:is_axe_item_destructible', "
                "'minecraft:is_shovel_item_destructible', 'minecraft:is_hoe_item_destructible')")


def item(name, category, components, glint=False):
    comps = {
        "minecraft:icon": {"textures": {"default": f"{NS}_{name}"}},
        "minecraft:display_name": {"value": f"item.{NS}:{name}.name"},
    }
    if glint:
        comps["minecraft:glint"] = True
    comps.update(components)
    return {"format_version": "1.21.100", "minecraft:item": {
        "description": {"identifier": f"{NS}:{name}", "menu_category": {"category": category}},
        "components": comps}}


def material(name, glint=False):
    return item(name, "items", {"minecraft:max_stack_size": 64}, glint)


def weapon(name, damage, durability=None, enchant_slot="sword", tags=("minecraft:is_sword",), extra=None):
    comps = {
        "minecraft:max_stack_size": 1,
        "minecraft:hand_equipped": {"value": True},
        "minecraft:damage": {"value": damage},
        "minecraft:enchantable": {"slot": enchant_slot, "value": 15},
        "minecraft:tags": {"tags": list(tags)},
    }
    if durability:
        comps["minecraft:durability"] = {"max_durability": durability}
    comps.update(extra or {})
    return item(name, "equipment", comps)


ARMOR_SLOTS = {
    "helmet": ("slot.armor.head", "armor_head"),
    "chestplate": ("slot.armor.chest", "armor_torso"),
    "leggings": ("slot.armor.legs", "armor_legs"),
    "boots": ("slot.armor.feet", "armor_feet"),
}


def armor(name, piece, protection):
    slot, enchant = ARMOR_SLOTS[piece]
    return item(name, "equipment", {
        "minecraft:max_stack_size": 1,
        "minecraft:wearable": {"slot": slot, "protection": protection},
        "minecraft:enchantable": {"slot": enchant, "value": 15},
        "minecraft:tags": {"tags": ["minecraft:is_armor"]},
    })


ITEMS = {
    # things you mine
    "water_cube": lambda: material("water_cube"),
    "lava_cube": lambda: material("lava_cube"),
    "air_cube": lambda: material("air_cube"),
    "captured_flame": lambda: material("captured_flame"),
    "portal_shard": lambda: material("portal_shard", glint=True),
    "end_fragment": lambda: material("end_fragment", glint=True),
    # starter tool, given on first join (never breaks)
    "anything_miner": lambda: weapon("anything_miner", 5, enchant_slot="pickaxe",
                                     tags=("minecraft:is_pickaxe", "minecraft:is_tool", "minecraft:iron_tier"),
                                     extra={"minecraft:glint": True, "minecraft:digger": {"use_efficiency": True, "destroy_speeds": [
                                         {"block": {"tags": PICKAXE_TAGS}, "speed": 8}]}}),
    # bedrock gear (no durability: bedrock never breaks)
    "bedrock_pickaxe": lambda: weapon("bedrock_pickaxe", 7, enchant_slot="pickaxe",
                                      tags=("minecraft:is_pickaxe", "minecraft:is_tool", "minecraft:netherite_tier"),
                                      extra={"minecraft:digger": {"use_efficiency": True, "destroy_speeds": [
                                          {"block": {"tags": PICKAXE_TAGS}, "speed": 40}]}}),
    "bedrock_sword": lambda: weapon("bedrock_sword", 14),
    "bedrock_helmet": lambda: armor("bedrock_helmet", "helmet", 4),
    "bedrock_chestplate": lambda: armor("bedrock_chestplate", "chestplate", 9),
    "bedrock_leggings": lambda: armor("bedrock_leggings", "leggings", 7),
    "bedrock_boots": lambda: armor("bedrock_boots", "boots", 4),
    # elemental tools
    "magma_blade": lambda: weapon("magma_blade", 10, durability=1600),
    "tidal_blade": lambda: weapon("tidal_blade", 9, durability=1600),
    "lava_shield": lambda: item("lava_shield", "equipment", {
        "minecraft:max_stack_size": 1, "minecraft:allow_off_hand": {"value": True}}),
    "cloud_boots": lambda: armor("cloud_boots", "boots", 2),
    "warp_wand": lambda: item("warp_wand", "equipment", {
        "minecraft:max_stack_size": 1, "minecraft:hand_equipped": {"value": True}}, glint=True),
    "miners_guide": lambda: item("miners_guide", "items", {"minecraft:max_stack_size": 1}, glint=True),
}

ITEM_NAMES = {
    "water_cube": "Water Cube", "lava_cube": "Lava Cube", "air_cube": "Air Cube",
    "captured_flame": "Captured Flame", "portal_shard": "Portal Shard", "end_fragment": "End Portal Fragment",
    "anything_miner": "Anything Miner", "bedrock_pickaxe": "Bedrock Pickaxe", "bedrock_sword": "Bedrock Sword", "bedrock_helmet": "Bedrock Helmet",
    "bedrock_chestplate": "Bedrock Chestplate", "bedrock_leggings": "Bedrock Leggings",
    "bedrock_boots": "Bedrock Boots", "magma_blade": "Magma Blade", "tidal_blade": "Tidal Blade",
    "lava_shield": "Lava Shield", "cloud_boots": "Cloud Boots", "warp_wand": "Warp Wand",
    "miners_guide": "Miner's Guide",
}

# Armor that renders on the body: item -> (texture base, piece)
WORN = {
    "bedrock_helmet": ("bedrock", "helmet"), "bedrock_chestplate": ("bedrock", "chestplate"),
    "bedrock_leggings": ("bedrock", "leggings"), "bedrock_boots": ("bedrock", "boots"),
    "cloud_boots": ("cloud", "boots"),
}
LAYER_VAR = {"helmet": "helmet_layer_visible", "chestplate": "chest_layer_visible",
             "leggings": "leg_layer_visible", "boots": "boot_layer_visible"}

# --------------------------------------------------------------------------- recipes

B, S = "minecraft:bedrock", "minecraft:stick"


def shaped(name, pattern, key, result, count=1):
    return {"format_version": "1.21.0", "minecraft:recipe_shaped": {
        "description": {"identifier": f"{NS}:{name}"}, "tags": ["crafting_table"], "pattern": pattern,
        "key": {k: {"item": v} for k, v in key.items()}, "unlock": {"context": "AlwaysUnlocked"},
        "result": {"item": result, "count": count}}}


def shapeless(name, ingredients, result, count=1):
    return {"format_version": "1.21.0", "minecraft:recipe_shapeless": {
        "description": {"identifier": f"{NS}:{name}"}, "tags": ["crafting_table"],
        "ingredients": [{"item": i} for i in ingredients], "unlock": {"context": "AlwaysUnlocked"},
        "result": {"item": result, "count": count}}}


def n(x):
    return f"{NS}:{x}"


RECIPES = {
    "anything_miner": shaped("anything_miner", ["IDI", " S ", " S "], {"I": "minecraft:iron_ingot", "D": "minecraft:diamond", "S": S}, n("anything_miner")),
    "bedrock_pickaxe": shaped("bedrock_pickaxe", ["BBB", " S ", " S "], {"B": B, "S": S}, n("bedrock_pickaxe")),
    "bedrock_sword": shaped("bedrock_sword", ["B", "B", "S"], {"B": B, "S": S}, n("bedrock_sword")),
    "bedrock_helmet": shaped("bedrock_helmet", ["BBB", "B B"], {"B": B}, n("bedrock_helmet")),
    "bedrock_chestplate": shaped("bedrock_chestplate", ["B B", "BBB", "BBB"], {"B": B}, n("bedrock_chestplate")),
    "bedrock_leggings": shaped("bedrock_leggings", ["BBB", "B B", "B B"], {"B": B}, n("bedrock_leggings")),
    "bedrock_boots": shaped("bedrock_boots", ["B B", "B B"], {"B": B}, n("bedrock_boots")),
    "magma_blade": shaped("magma_blade", ["L", "F", "S"], {"L": n("lava_cube"), "F": n("captured_flame"), "S": S}, n("magma_blade")),
    "lava_shield": shaped("lava_shield", ["LIL", "LLL", " L "], {"L": n("lava_cube"), "I": "minecraft:iron_ingot"}, n("lava_shield")),
    "tidal_blade": shaped("tidal_blade", ["W", "W", "S"], {"W": n("water_cube"), "S": S}, n("tidal_blade")),
    "cloud_boots": shaped("cloud_boots", ["A A", "A A"], {"A": n("air_cube")}, n("cloud_boots")),
    "warp_wand": shaped("warp_wand", ["P", "P", "S"], {"P": n("portal_shard"), "S": S}, n("warp_wand")),
    "water_bucket": shapeless("water_bucket", ["minecraft:bucket", n("water_cube")], "minecraft:water_bucket"),
    "lava_bucket": shapeless("lava_bucket", ["minecraft:bucket", n("lava_cube")], "minecraft:lava_bucket"),
    "miners_guide": shapeless("miners_guide", ["minecraft:book", "minecraft:cobblestone"], n("miners_guide")),
}

# --------------------------------------------------------------------------- handbook

# A real written book, handed out with `/loot give @s loot "mineany/handbook"`.
# Dark § colors only: the page background is parchment.
HANDBOOK_PAGES = [
    "§l§6MINE ANYTHING§r\n§8The Handbook§r\n\nYou can mine blocks nobody else can: bedrock, water, lava, fire, portals and even air!\n\n"
    "Start with your §5Anything Miner§r. Turn the page!",
    "§l§4Unbreakable blocks§r\n\nBedrock, End portal frames and reinforced deepslate CAN break. Keep hitting them and "
    "watch the bar at the bottom of the screen.\n\nAnything Miner: 5 hits\nBy hand: 24 hits",
    "§l§1Scooping§r\n\nHold your Anything Miner (or any pickaxe) and RIGHT-CLICK:\n\nWater = Water Cube\n"
    "Lava = Lava Cube\nFire = Captured Flame\nNether portal = Portal Shard\nEnd portal = End Fragment\nThe sky = Air Cube",
    "§l§1Using cubes§r\n\nRight-click a block with a Water or Lava Cube to place it.\n\nAir Cube: erases a block.\n\n"
    "End Fragment: places an End portal!\n\nBucket + cube = a full bucket.",
    "§l§8Bedrock Pickaxe§r\n\nRecipe: 3 Bedrock across the top, 2 Sticks down the middle.\n\n"
    "Breaks almost any block in ONE hit and drops the block itself. Never breaks!",
    "§l§8Bedrock Sword & Armor§r\n\nSword: 2 Bedrock on top of 1 Stick. 14 damage!\n\n"
    "Armor: Bedrock in the same shapes as iron armor. Wear all 4 pieces for Resistance II.",
    "§l§4Magma Blade§r\n\nRecipe, top to bottom: Lava Cube, Captured Flame, Stick.\n\n"
    "Sets enemies on fire. You can't get burned while you hold it.",
    "§l§4Lava Shield§r\n\nRecipe:\nLava, Iron Ingot, Lava\nLava, Lava, Lava\n(empty), Lava, (empty)\n\n"
    "Hold it in your OFF-HAND: no fire damage, less damage overall, and attackers catch fire.",
    "§l§1Tidal Blade§r\n\nRecipe: 2 Water Cubes on top of a Stick.\n\n"
    "Knocks enemies flying. RIGHT-CLICK to send a tidal wave that pushes every mob away.",
    "§l§3Cloud Boots§r\n\nRecipe: 4 Air Cubes in a boots shape.\n\nSuper jump and no fall damage. "
    "Hold sneak if you want to fall normally.",
    "§l§5Warp Wand§r\n\nRecipe: 2 Portal Shards on top of a Stick.\n\n"
    "RIGHT-CLICK to teleport to the block you are looking at, up to 48 blocks away.",
    "§l§6Lost something?§r\n\nAnything Miner: Iron, Diamond, Iron across the top, 2 Sticks down the middle.\n\n"
    "Lost this book? Ask for a new one with:\n/scriptevent mineany:book\n\nHave fun mining EVERYTHING!",
]


def handbook_loot():
    return {"pools": [{"rolls": 1, "entries": [{"type": "item", "name": "minecraft:written_book", "weight": 1, "functions": [
        {"function": "set_book_contents", "author": "Mine Anything", "title": "Mine Anything Handbook", "pages": HANDBOOK_PAGES}]}]}]}


# --------------------------------------------------------------------------- manifests

def bp_manifest():
    return {
        "format_version": 2,
        "header": {"name": "Mine Anything (Behavior)", "description": DESCRIPTION, "uuid": BP_UUID,
                   "version": VERSION, "min_engine_version": MIN_ENGINE},
        "modules": [
            {"type": "data", "uuid": stable_uuid("bp-data"), "version": VERSION},
            {"type": "script", "language": "javascript", "uuid": stable_uuid("bp-script"), "version": VERSION,
             "entry": "scripts/main.js"},
        ],
        "dependencies": [
            {"uuid": RP_UUID, "version": VERSION},
            {"module_name": "@minecraft/server", "version": "2.0.0"},
            {"module_name": "@minecraft/server-ui", "version": "2.0.0"},
        ],
    }


def rp_manifest():
    return {
        "format_version": 2,
        "header": {"name": "Mine Anything (Resources)", "description": DESCRIPTION, "uuid": RP_UUID,
                   "version": VERSION, "min_engine_version": MIN_ENGINE},
        "modules": [{"type": "resources", "uuid": stable_uuid("rp-resources"), "version": VERSION}],
        "dependencies": [{"uuid": BP_UUID, "version": VERSION}],
    }


# --------------------------------------------------------------------------- resource pack

def item_texture_json():
    return {"resource_pack_name": "mine_anything", "texture_name": "atlas.items",
            "texture_data": {f"{NS}_{name}": {"textures": f"textures/items/{NS}/{name}"} for name in ITEMS}}


def attachables(name):
    """Two attachables per armor piece, mirroring vanilla: one for players, one for other mobs."""
    material, piece = WORN[name]
    layer = 2 if piece == "leggings" else 1
    texture = f"textures/models/armor/{NS}_{material}_{layer}"
    setup = f"variable.{LAYER_VAR[piece]} = 0.0;"
    generic = {"format_version": "1.10.0", "minecraft:attachable": {"description": {
        "identifier": f"{NS}:{name}",
        "materials": {"default": "armor", "enchanted": "armor_enchanted"},
        "textures": {"default": texture, "enchanted": "textures/misc/enchanted_actor_glint"},
        "geometry": {"default": f"geometry.humanoid.armor.{piece}"},
        "scripts": {"parent_setup": setup},
        "render_controllers": ["controller.render.armor"],
    }}}
    player = {"format_version": "1.10.0", "minecraft:attachable": {"description": {
        "identifier": f"{NS}:{name}.player",
        "item": {f"{NS}:{name}": "query.owner_identifier == 'minecraft:player'"},
        "materials": {"default": "armor", "enchanted": "armor_enchanted"},
        "textures": {"default": texture, "enchanted": "textures/misc/enchanted_actor_glint"},
        "geometry": {"default": f"geometry.player.armor.{piece}"},
        "scripts": {"parent_setup": setup, "animate": ["offset"]},
        "animations": {"offset": f"animation.armor.{piece}.offset"},
        "render_controllers": ["controller.render.armor.player"],
    }}}
    return {f"attachables/{name}.json": generic, f"attachables/{name}.player.json": player}


def lang_lines():
    lines = ["## Mine Anything"]
    for key, label in ITEM_NAMES.items():
        lines.append(f"item.{NS}:{key}.name={label}")
    lines.append("pack.name=Mine Anything")
    lines.append(f"pack.description={DESCRIPTION}")
    return "\n".join(lines) + "\n"
