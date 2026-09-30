"""Build Mine Anything into dist/MineAnything.mcaddon.

    python3 build.py

Generates both packs into build/, validates every cross-reference, syntax-checks the
scripts with Node (if installed) and zips the result.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "tools"))

import art  # noqa: E402
import content as C  # noqa: E402

BUILD = os.path.join(ROOT, "build")
DIST = os.path.join(ROOT, "dist")
BP = os.path.join(BUILD, "MineAnything_BP")
RP = os.path.join(BUILD, "MineAnything_RP")
errors = []


def write_json(base, rel, data):
    path = os.path.join(base, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def write_text(base, rel, text):
    path = os.path.join(base, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def save_png(base, rel, canvas):
    path = os.path.join(base, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    canvas.save(path)


def generate():
    shutil.rmtree(BUILD, ignore_errors=True)

    # ---- behavior pack
    write_json(BP, "manifest.json", C.bp_manifest())
    save_png(BP, "pack_icon.png", art.pack_icon())
    for name, fn in C.ITEMS.items():
        write_json(BP, f"items/{name}.json", fn())
    for name, recipe in C.RECIPES.items():
        write_json(BP, f"recipes/{name}.json", recipe)
    write_json(BP, "loot_tables/mineany/handbook.json", C.handbook_loot())
    os.makedirs(os.path.join(BP, "scripts"), exist_ok=True)
    src = os.path.join(ROOT, "src", "scripts")
    for f in os.listdir(src):
        if f.endswith(".js"):
            shutil.copy(os.path.join(src, f), os.path.join(BP, "scripts", f))
    write_text(BP, "texts/en_US.lang", f"pack.name=Mine Anything\npack.description={C.DESCRIPTION}\n")
    write_json(BP, "texts/languages.json", ["en_US"])

    # ---- resource pack
    write_json(RP, "manifest.json", C.rp_manifest())
    save_png(RP, "pack_icon.png", art.pack_icon())
    for name, canvas in art.item_textures().items():
        save_png(RP, f"textures/items/{C.NS}/{name}.png", canvas)
    write_json(RP, "textures/item_texture.json", C.item_texture_json())
    for material in {m for m, _ in C.WORN.values()}:
        for layer in (1, 2):
            save_png(RP, f"textures/models/armor/{C.NS}_{material}_{layer}.png", art.armor_layer(material, layer))
    for name in C.WORN:
        for rel, data in C.attachables(name).items():
            write_json(RP, rel, data)
    write_text(RP, "texts/en_US.lang", C.lang_lines())
    write_json(RP, "texts/languages.json", ["en_US"])


# --------------------------------------------------------------------------- validation

def check(cond, msg):
    if not cond:
        errors.append(msg)


def load_all_json(base):
    out = {}
    for root, _, files in os.walk(base):
        for f in files:
            if f.endswith(".json"):
                path = os.path.join(root, f)
                try:
                    with open(path, encoding="utf-8") as fh:
                        out[os.path.relpath(path, base)] = json.load(fh)
                except Exception as e:  # noqa: BLE001
                    errors.append(f"bad JSON {path}: {e}")
    return out


def validate():
    bp = load_all_json(BP)
    rp = load_all_json(RP)
    with open(os.path.join(ROOT, "data", "vanilla_items.json")) as f:
        vanilla = {i for i, _ in json.load(f)["items"]}
    known = vanilla | {f"{C.NS}:{n}" for n in C.ITEMS} | {"minecraft:water_bucket", "minecraft:lava_bucket"}

    for path, data in bp.items():
        if path.startswith("recipes/"):
            body = next(v for k, v in data.items() if k.startswith("minecraft:recipe"))
            items = [k["item"] for k in body.get("key", {}).values()] + [i["item"] for i in body.get("ingredients", [])]
            for it in items + [body["result"]["item"]]:
                check(it in known, f"{path}: unknown item {it}")
            if "pattern" in body:
                check(set("".join(body["pattern"])) - {" "} == set(body["key"]), f"{path}: pattern/key mismatch")
        if path.startswith("items/"):
            icon = data["minecraft:item"]["components"]["minecraft:icon"]["textures"]["default"]
            check(icon in rp["textures/item_texture.json"]["texture_data"], f"{path}: icon {icon} not registered")

    book = bp["loot_tables/mineany/handbook.json"]["pools"][0]["entries"][0]
    pages = book["functions"][0]["pages"]
    check(book["name"] == "minecraft:written_book", "handbook must be a written book")
    check(len(pages) <= 50, "handbook has too many pages")
    for i, page in enumerate(pages, 1):
        check(len(page) <= 256, f"handbook page {i} is {len(page)} chars (max 256)")
        check(not re.search(r"§[efab7]", page), f"handbook page {i} uses a light color that's unreadable on paper")
    scripts_text = "".join(open(os.path.join(BP, "scripts", f), encoding="utf-8").read() for f in os.listdir(os.path.join(BP, "scripts")))
    check('loot "mineany/handbook"' in scripts_text, "scripts must hand out the handbook loot table")

    for key, entry in rp["textures/item_texture.json"]["texture_data"].items():
        check(os.path.exists(os.path.join(RP, entry["textures"] + ".png")), f"missing texture for {key}")
    for path, data in rp.items():
        if path.startswith("attachables/"):
            desc = data["minecraft:attachable"]["description"]
            tex = desc["textures"]["default"]
            check(os.path.exists(os.path.join(RP, tex + ".png")), f"{path}: missing {tex}")
            item_id = desc["identifier"].split(".player")[0]
            check(f"items/{item_id.split(':')[1]}.json" in bp, f"{path}: no item {item_id}")

    lang = open(os.path.join(RP, "texts/en_US.lang"), encoding="utf-8").read()
    for n in C.ITEMS:
        check(f"item.{C.NS}:{n}.name=" in lang, f"lang missing {n}")
    check(any(d.get("uuid") == C.RP_UUID for d in bp["manifest.json"]["dependencies"]), "BP must depend on RP")

    folder = os.path.join(BP, "scripts")
    sources = {f: open(os.path.join(folder, f), encoding="utf-8").read() for f in os.listdir(folder)}
    exports = {f: set(re.findall(r"export (?:const|let|function\*?|class) (\w+)", s)) for f, s in sources.items()}
    for f, s in sources.items():
        for names, mod in re.findall(r"import \{([^}]+)\} from \"\./([\w.]+)\"", s):
            check(mod in exports, f"{f}: missing module {mod}")
            for name in (x.strip() for x in names.split(",") if x.strip()):
                check(name in exports.get(mod, ()), f"{f}: {mod} does not export {name}")
        for mod in re.findall(r"import (?:\* as \w+ from )?\"\./([\w.]+)\"", s):
            check(mod in exports, f"{f}: missing module {mod}")
    node = shutil.which("node")
    if node:
        for f in sources:
            r = subprocess.run([node, "--check", os.path.join(folder, f)], capture_output=True, text=True)
            check(r.returncode == 0, f"JS syntax error in {f}: {r.stderr.strip()}")
    return bp, rp


# --------------------------------------------------------------------------- packaging

def zip_dir(zf, folder, prefix):
    for root, _, files in sorted(os.walk(folder)):
        for f in sorted(files):
            full = os.path.join(root, f)
            rel = os.path.relpath(full, folder)
            arc = f"{prefix}/{rel}" if prefix else rel
            zi = zipfile.ZipInfo(arc.replace(os.sep, "/"), date_time=(2026, 1, 1, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED
            with open(full, "rb") as fh:
                zf.writestr(zi, fh.read())


def package():
    os.makedirs(DIST, exist_ok=True)
    targets = {
        "MineAnything.mcaddon": [(BP, "MineAnything_BP"), (RP, "MineAnything_RP")],
        "MineAnything_BP.mcpack": [(BP, "")],
        "MineAnything_RP.mcpack": [(RP, "")],
    }
    for name, parts in targets.items():
        path = os.path.join(DIST, name)
        with zipfile.ZipFile(path, "w") as zf:
            for folder, prefix in parts:
                zip_dir(zf, folder, prefix)
        print(f"  {os.path.relpath(path, ROOT)}  ({os.path.getsize(path) // 1024} KB)")


def main():
    print("Generating packs...")
    generate()
    print("Validating...")
    bp, rp = validate()
    if errors:
        print(f"\n{len(errors)} problem(s):")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print(f"  OK: {len(C.ITEMS)} items, {len(C.RECIPES)} recipes, {sum(p.startswith('attachables/') for p in rp)} attachables")
    print("Packaging...")
    package()


if __name__ == "__main__":
    main()
