"""Pixel art for Mine Anything: tool/armor icons from shape templates + material palettes."""
from png import Canvas, hex_rgba, mix, rng_for, shade

K = hex_rgba("#16121c")
HANDLE = hex_rgba("#8b5a2b")
HANDLE_DARK = hex_rgba("#5b3a1e")

MATERIALS = {
    "bedrock": (hex_rgba("#a3a3a3"), hex_rgba("#666666"), hex_rgba("#353535")),
    "magma": (hex_rgba("#ffd54a"), hex_rgba("#ff7a1a"), hex_rgba("#b3261e")),
    "water": (hex_rgba("#a8e6ff"), hex_rgba("#2f8cff"), hex_rgba("#1b4fbf")),
    "cloud": (hex_rgba("#ffffff"), hex_rgba("#dcefff"), hex_rgba("#9fbfe0")),
    "portal": (hex_rgba("#f0b8ff"), hex_rgba("#b44cff"), hex_rgba("#5c1a99")),
    "anything": (hex_rgba("#b8fff6"), hex_rgba("#3fd0ff"), hex_rgba("#8a4dff")),
}


def outline(cv):
    """Add a dark 1px outline around every opaque pixel."""
    filled = {(x, y) for y in range(cv.h) for x in range(cv.w) if cv.get(x, y)[3] > 0}
    for x, y in filled:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in filled and 0 <= n[0] < cv.w and 0 <= n[1] < cv.h:
                cv.set(n[0], n[1], K)


def speckle(cv, material, rng, amount=0.12):
    """Mottle opaque non-outline pixels (bedrock looks noisy)."""
    for y in range(cv.h):
        for x in range(cv.w):
            c = cv.get(x, y)
            if c[3] > 0 and c != K and c not in (HANDLE, HANDLE_DARK):
                cv.set(x, y, shade(c, 1 + rng.uniform(-amount, amount)))


def handle(cv, x0, x1, total):
    """Diagonal handle along x + y = total, from x0 to x1, two pixels wide."""
    for x in range(x0, x1 + 1):
        cv.set(x, total - x, HANDLE)
        cv.set(x + 1, total - x, HANDLE_DARK)


def pickaxe(material):
    light, mid, dark = MATERIALS[material]
    cv = Canvas(16, 16)
    handle(cv, 2, 8, 15)
    cx, cy = 3, 12
    for y in range(16):
        for x in range(16):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if 8.6 <= d <= 11.2 and x >= 4 and y <= 11:
                cv.set(x, y, light if d > 10.3 else mid)
    for x, y in ((4, 2), (4, 3), (12, 10), (13, 10), (5, 2), (13, 11)):
        if cv.get(x, y)[3]:
            cv.set(x, y, dark)
    outline(cv)
    return cv


def sword(material):
    light, mid, dark = MATERIALS[material]
    cv = Canvas(16, 16)
    for x in range(5, 14):
        y = 15 - x
        cv.set(x, y - 1, light)
        cv.set(x, y, mid)
        cv.set(x + 1, y, dark)
    cv.set(14, 0, light)
    for i in range(-2, 3):
        cv.set(4 + i, 10 + i, hex_rgba("#3a3a3a") if material == "bedrock" else dark)
    for x in range(2, 4):
        cv.set(x, 15 - x - 1, HANDLE)
        cv.set(x + 1, 15 - x - 1, HANDLE_DARK)
    cv.set(1, 14, dark)
    outline(cv)
    return cv


ARMOR = {
    "helmet": [
        "................",
        "................",
        "................",
        "....LLLLLLLL....",
        "...LMMMMMMMML...",
        "...LMMMMMMMML...",
        "...MM......MM...",
        "...MD......DM...",
        "...DD......DD...",
    ],
    "chestplate": [
        "................",
        "..LLL......LLL..",
        ".LLMML....LMMLL.",
        ".LMMMMLLLLMMMML.",
        ".MMM.MMMMMM.MMM.",
        "..DD.MMMMMM.DD..",
        ".....MMMMMM.....",
        ".....MMMMMM.....",
        ".....DMMMMD.....",
        ".....DDDDDD.....",
    ],
    "leggings": [
        "................",
        "....LLLLLLLL....",
        "....MMMMMMMM....",
        "....MMMMMMMM....",
        "....MMM..MMM....",
        "....MMM..MMM....",
        "....MMM..MMM....",
        "....MMM..MMM....",
        "....MDD..DDM....",
        "....DDD..DDD....",
    ],
    "boots": [
        "................",
        "................",
        "...LLL....LLL...",
        "...LMM....MML...",
        "...MMM....MMM...",
        "...MMM....MMM...",
        "..MMMM....MMMM..",
        "..MMMM....MMMM..",
        "..DDDD....DDDD..",
    ],
}


def armor_icon(material, piece):
    light, mid, dark = MATERIALS[material]
    cv = Canvas(16, 16)
    cv.ascii(ARMOR[piece], {"L": light, "M": mid, "D": dark}, oy=2)
    outline(cv)
    return cv


def shield():
    light, mid, dark = MATERIALS["magma"]
    obsidian = hex_rgba("#2e1f45")
    cv = Canvas(16, 16)
    cv.ascii([
        "...OOOOOOOOOO...",
        "...OLLLLLLLLO...",
        "...OLMMMMMMLO...",
        "...OMMYYYYMMO...",
        "...OMYYWWYYMO...",
        "...OMYWWWWYMO...",
        "...OMYYWWYYMO...",
        "...OMMYYYYMMO...",
        "...OMMMMMMMMO...",
        "....ODMMMMDO....",
        ".....ODMMDO.....",
        "......ODDO......",
        ".......OO.......",
    ], {"O": obsidian, "L": light, "M": mid, "D": dark, "Y": hex_rgba("#ffe066"), "W": hex_rgba("#fff7d6")}, oy=1)
    outline(cv)
    return cv


def wand():
    light, mid, dark = MATERIALS["portal"]
    cv = Canvas(16, 16)
    for x in range(2, 10):
        cv.set(x, 14 - x, hex_rgba("#2e1f45"))
        cv.set(x + 1, 14 - x, hex_rgba("#1a1026"))
    cv.ascii([".LM.", "LMMD", "MMDD", ".DD."], {"L": light, "M": mid, "D": dark}, ox=10, oy=1)
    cv.set(11, 2, hex_rgba("#ffffff"))
    outline(cv)
    return cv


def cube(top, left, right, alpha=255):
    """Isometric block icon."""
    cv = Canvas(16, 16)

    def inside(poly, px, py):
        n, hit = len(poly), False
        for i in range(n):
            (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % n]
            if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
                hit = not hit
        return hit

    faces = [
        ([(8, 0.5), (15.5, 4.2), (8, 8), (0.5, 4.2)], top),
        ([(0.5, 4.2), (8, 8), (8, 15.5), (0.5, 11.8)], left),
        ([(8, 8), (15.5, 4.2), (15.5, 11.8), (8, 15.5)], right),
    ]
    rng = rng_for(str(top))
    for y in range(16):
        for x in range(16):
            for poly, color in faces:
                if inside(poly, x + 0.5, y + 0.5):
                    c = shade(color, 1 + rng.uniform(-0.06, 0.06))
                    cv.set(x, y, (c[0], c[1], c[2], alpha))
                    break
    outline(cv)
    return cv


BOTTLE = [
    "................",
    "......kkkk......",
    "......kWWk......",
    ".......kk.......",
    "......kGGk......",
    ".....kGGGGk.....",
    "....kGVVVVGk....",
    "...kGVVCVVVGk...",
    "...kGVCCVVCGk...",
    "...kGVVCCVVGk...",
    "...kGVCVVVVGk...",
    "...kGVVVVCVGk...",
    "....kGVVVVGk....",
    ".....kkkkkk.....",
    "................",
    "................",
]

SHARD = [
    "................",
    "..........kk....",
    ".........kwLk...",
    "........kLLMk...",
    "........kLMMk...",
    ".......kLMMDk...",
    "......kLMMDk....",
    ".....kLMMDk.....",
    "....kLMMDk......",
    "....kMMDDk......",
    "...kMMDDk...kk..",
    "...kMDDk...kLMk.",
    "..kMDDk....kMDk.",
    "..kDDk......kk..",
    "...kk...........",
    "................",
]

BOOK = [
    "................",
    "..kkkkkkkkkk....",
    "..kPPPPPPPPPk...",
    "..kPPPPPPPPPkW..",
    "..kPPPGGGPPPkW..",
    "..kPPPGPGPPPkW..",
    "..kPPPPGPPPPkW..",
    "..kPPPGGGPPPkW..",
    "..kPPPPGPPPPkW..",
    "..kPPPPGPPPPkW..",
    "..kPPPPPPPPPkW..",
    "..kPPPPPPPPPkW..",
    "..kDDDDDDDDDkW..",
    "...kWWWWWWWWWk..",
    "....kkkkkkkkkk..",
    "................",
]


def from_ascii(rows, palette):
    cv = Canvas(16, 16)
    cv.ascii(rows, palette)
    return cv


def item_textures():
    rng = rng_for("bedrock-speckle")
    out = {}
    for mat, prefix in (("bedrock", "bedrock"),):
        out[f"{prefix}_pickaxe"] = pickaxe(mat)
        out[f"{prefix}_sword"] = sword(mat)
        for piece in ("helmet", "chestplate", "leggings", "boots"):
            out[f"{prefix}_{piece}"] = armor_icon(mat, piece)
    for name in list(out):
        speckle(out[name], "bedrock", rng)
    out["anything_miner"] = pickaxe("anything")
    out["magma_blade"] = sword("magma")
    out["tidal_blade"] = sword("water")
    out["cloud_boots"] = armor_icon("cloud", "boots")
    out["lava_shield"] = shield()
    out["warp_wand"] = wand()
    out["water_cube"] = cube(hex_rgba("#6ec3ff"), hex_rgba("#2f7de0"), hex_rgba("#1b56b0"), 230)
    out["lava_cube"] = cube(hex_rgba("#ffb13b"), hex_rgba("#f06a14"), hex_rgba("#b8330f"))
    out["air_cube"] = cube(hex_rgba("#ffffff"), hex_rgba("#e6f4ff"), hex_rgba("#c8e2f7"), 150)
    out["captured_flame"] = from_ascii(BOTTLE, {"k": K, "W": hex_rgba("#c9a26b"), "G": hex_rgba("#e8f4ff", 200),
                                                "V": hex_rgba("#ff7a1a"), "C": hex_rgba("#ffe066")})
    out["portal_shard"] = from_ascii(SHARD, {"k": K, "w": hex_rgba("#ffffff"), "L": hex_rgba("#f0b8ff"),
                                             "M": hex_rgba("#b44cff"), "D": hex_rgba("#5c1a99")})
    out["end_fragment"] = from_ascii(SHARD, {"k": K, "w": hex_rgba("#d9fff2"), "L": hex_rgba("#6ff2c8"),
                                             "M": hex_rgba("#1d6b5a"), "D": hex_rgba("#0b1f24")})
    out["miners_guide"] = from_ascii(BOOK, {"k": K, "P": hex_rgba("#6b4a2b"), "D": hex_rgba("#43301c"),
                                            "G": hex_rgba("#ffd23f"), "W": hex_rgba("#efe6d2")})
    return out


# Armor layer textures use the standard 64x32 humanoid armor layout.
LAYER_1_REGIONS = [(0, 0, 32, 16), (0, 16, 56, 16)]  # head, legs(boots), body, arms
LAYER_2_REGIONS = [(0, 16, 40, 16)]  # legs + waist


def armor_layer(material, layer):
    light, mid, dark = MATERIALS[material]
    rng = rng_for(f"{material}{layer}")
    cv = Canvas(64, 32)
    for x0, y0, w, h in (LAYER_1_REGIONS if layer == 1 else LAYER_2_REGIONS):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                r = rng.random()
                base = light if r < 0.2 else dark if r > 0.8 else mid
                cv.set(x, y, shade(base, 1 + rng.uniform(-0.08, 0.08)))
    return cv


def pack_icon():
    size = 128
    cv = Canvas(size, size)
    top, bottom = hex_rgba("#3a3f4a"), hex_rgba("#14161b")
    for y in range(size):
        for x in range(size):
            cv.set(x, y, mix(top, bottom, y / size))
    cv.paste(item_textures()["bedrock_pickaxe"].scaled(6), 16, 12)
    cv.paste(item_textures()["lava_cube"].scaled(3), 78, 78)
    return cv
