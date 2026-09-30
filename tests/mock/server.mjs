// A small fake of @minecraft/server, enough to drive Mine Anything's scripts in Node.
// Like the real engine, world writes throw during early execution and inside before-events.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const vanilla = JSON.parse(fs.readFileSync(path.join(here, "../../data/vanilla_items.json"), "utf8")).items.map((x) => x[0]);
const custom = fs.readdirSync(path.join(here, "../../build/MineAnything_BP/items")).map((f) => `mineany:${f.replace(".json", "")}`);

export const S = (globalThis.__mc = {
  tick: 0, timers: [], intervals: [], queue: [], dims: {}, players: [], log: [], forms: [], formQueue: [],
  itemIds: new Set([...vanilla, ...custom, "minecraft:water_bucket", "minecraft:lava_bucket"]),
  nextId: 1, early: false, readOnly: false,
});

function guardRead(what) {
  if (S.early) throw new Error(`${what} called during early execution`);
}
function guardWrite(what) {
  guardRead(what);
  if (S.readOnly) throw new Error(`${what} called in read-only mode`);
}
function checkLoc(loc, what) {
  if (!loc || [loc.x, loc.y, loc.z].some((v) => typeof v !== "number" || Number.isNaN(v))) {
    throw new Error(`${what}: bad location ${JSON.stringify(loc)}`);
  }
}

class Signal {
  constructor() {
    this.subs = [];
  }
  subscribe(cb) {
    this.subs.push(cb);
    return cb;
  }
  fire(ev) {
    this.subs.forEach((cb) => cb(ev));
    return ev;
  }
}

const NON_STACK = /pickaxe|sword|_axe|shovel|_hoe|helmet|chestplate|leggings|boots|blade|shield|wand|guide|bucket/;

export class ItemStack {
  constructor(typeId, amount = 1) {
    if (!S.itemIds.has(typeId)) throw new Error(`Invalid item identifier '${typeId}'`);
    this.typeId = typeId;
    this.maxAmount = NON_STACK.test(typeId) ? 1 : 64;
    this._amount = 1;
    this.amount = amount;
  }
  get amount() {
    return this._amount;
  }
  set amount(v) {
    if (!Number.isInteger(v) || v < 1 || v > this.maxAmount) throw new Error(`bad amount ${v} for ${this.typeId}`);
    this._amount = v;
  }
}

export class Entity {
  constructor(typeId, dim, loc) {
    checkLoc(loc, `spawn ${typeId}`);
    this.id = String(S.nextId++);
    this.typeId = typeId;
    this.dimension = dim;
    this.location = { ...loc };
    this._valid = true;
    this.effects = [];
    this.onFire = 0;
    this.knocked = 0;
    dim.entities.add(this);
  }
  get isValid() {
    return this._valid;
  }
  getComponent(id) {
    if (id === "minecraft:item") return this.itemStack ? { itemStack: this.itemStack } : undefined;
    return undefined;
  }
  addEffect(id, duration, opts) {
    guardWrite("addEffect");
    if (!Number.isInteger(duration) || duration <= 0 || typeof opts?.amplifier !== "number") throw new Error(`addEffect(${id}, ${duration})`);
    this.effects.push(id);
  }
  applyKnockback(h, v) {
    guardWrite("applyKnockback");
    if (typeof h !== "object" || typeof v !== "number" || Number.isNaN(h.x) || Number.isNaN(h.z)) throw new Error("applyKnockback(VectorXZ, number)");
    this.knocked++;
  }
  setOnFire(seconds) {
    guardWrite("setOnFire");
    this.onFire = seconds;
    return true;
  }
  extinguishFire() {
    this.onFire = 0;
    return true;
  }
  teleport(loc) {
    guardWrite("teleport");
    checkLoc(loc, "teleport");
    this.location = { ...loc };
  }
  remove() {
    this._valid = false;
    this.dimension.entities.delete(this);
  }
}

const SLOTS = ["Mainhand", "Offhand", "Head", "Chest", "Legs", "Feet"];

export class Player extends Entity {
  constructor(name, dim, loc) {
    super("minecraft:player", dim, loc);
    this.name = name;
    this.gameMode = "Survival";
    this.inventory = [];
    this.messages = [];
    this.titles = [];
    this.actionbars = [];
    this.tags = new Set();
    this.equipment = {};
    this.velocity = { x: 0, y: 0, z: 0 };
    this.isSneaking = false;
    this.look = undefined; // what getBlockFromViewDirection returns
    this.onScreenDisplay = {
      setTitle: (t, o) => this.titles.push(`${t} | ${o?.subtitle ?? ""}`),
      setActionBar: (t) => this.actionbars.push(t),
    };
    S.players.push(this);
  }
  getGameMode() {
    return this.gameMode;
  }
  sendMessage(m) {
    this.messages.push(m);
  }
  hasTag(t) {
    return this.tags.has(t);
  }
  addTag(t) {
    guardWrite("addTag");
    this.tags.add(t);
  }
  runCommand(cmd) {
    guardWrite("runCommand");
    if (this.failCommands) throw new Error("command failed");
    S.log.push(`cmd ${cmd}`);
    return { successCount: 1 };
  }
  getHeadLocation() {
    return { ...this.location, y: this.location.y + 1.6 };
  }
  getViewDirection() {
    return { x: 0, y: 0, z: 1 };
  }
  getVelocity() {
    return this.velocity;
  }
  getBlockFromViewDirection(opts = {}) {
    guardRead("getBlockFromViewDirection");
    const hit = typeof this.look === "function" ? this.look(opts) : this.look;
    return hit;
  }
  getComponent(id) {
    if (id === "minecraft:inventory") {
      return { container: { addItem: (s) => { guardWrite("addItem"); this.inventory.push(s.typeId); } } };
    }
    if (id === "minecraft:equippable") {
      return {
        getEquipment: (slot) => {
          if (!SLOTS.includes(slot)) throw new Error(`slot ${slot}`);
          return this.equipment[slot];
        },
        setEquipment: (slot, stack) => {
          guardWrite("setEquipment");
          if (!SLOTS.includes(slot)) throw new Error(`slot ${slot}`);
          this.equipment[slot] = stack;
          return true;
        },
      };
    }
    return super.getComponent(id);
  }
}

class Block {
  constructor(dim, loc) {
    this.dimension = dim;
    this.location = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
    Object.assign(this, this.location);
  }
  get typeId() {
    return this.dimension.blockAt(this.location);
  }
  get isAir() {
    return this.typeId === "minecraft:air";
  }
  get isLiquid() {
    return /water|lava/.test(this.typeId);
  }
  get permutation() {
    return { getState: (s) => (s === "end_portal_eye_bit" ? this.dimension.eyes.has(this.dimension.key(this.location)) : undefined) };
  }
  setType(t) {
    guardWrite("setType");
    if (typeof t !== "string") throw new Error("setType");
    this.dimension.setBlockAt(this.location, t);
  }
  getComponent(id) {
    if (id === "minecraft:inventory" && ["minecraft:chest", "minecraft:barrel"].includes(this.typeId)) return { container: {} };
    return undefined;
  }
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export class Dimension {
  constructor(id) {
    this.id = id;
    this.entities = new Set();
    this.blocks = new Map();
    this.eyes = new Set();
    S.dims[id] = this;
  }
  key(l) {
    return `${Math.floor(l.x)},${Math.floor(l.y)},${Math.floor(l.z)}`;
  }
  blockAt(l) {
    const k = this.key(l);
    if (this.blocks.has(k)) return this.blocks.get(k);
    return Math.floor(l.y) < 64 ? "minecraft:stone" : "minecraft:air";
  }
  setBlockAt(l, t) {
    this.blocks.set(this.key(l), t);
  }
  getBlock(l) {
    guardRead("getBlock");
    checkLoc(l, "getBlock");
    return new Block(this, l);
  }
  getEntities(o = {}) {
    guardRead("getEntities");
    return [...this.entities].filter((e) =>
      (!o.type || e.typeId === o.type) &&
      (!o.excludeTypes || !o.excludeTypes.includes(e.typeId)) &&
      (!o.location || dist(e.location, o.location) <= (o.maxDistance ?? Infinity)));
  }
  spawnItem(stack, loc) {
    guardWrite("spawnItem");
    if (!(stack instanceof ItemStack)) throw new Error("spawnItem needs ItemStack");
    const e = new Entity("minecraft:item", this, loc);
    e.itemStack = stack;
    return e;
  }
  spawnParticle(id, loc) {
    guardWrite("spawnParticle");
    checkLoc(loc, `particle ${id}`);
  }
  playSound(id, loc) {
    checkLoc(loc, `sound ${id}`);
  }
}

export const world = {
  afterEvents: Object.fromEntries(["playerSpawn", "playerBreakBlock", "entityHitBlock", "entityHitEntity",
    "entityHurt", "itemUse"].map((n) => [n, new Signal()])),
  beforeEvents: { playerBreakBlock: new Signal(), playerInteractWithBlock: new Signal() },
  getAllPlayers() {
    guardRead("getAllPlayers");
    return S.players;
  },
  getDimension(id) {
    guardRead("getDimension");
    return S.dims[id];
  },
};

function schedule(cb, delay) {
  S.timers.push({ cb, at: S.tick + Math.max(1, delay) });
}

export const system = {
  get currentTick() {
    return S.tick;
  },
  run: (cb) => schedule(cb, 1),
  runTimeout: (cb, d = 1) => schedule(cb, d),
  runInterval: (cb, every = 1) => S.intervals.push({ cb, every }),
  afterEvents: { scriptEventReceive: new Signal() },
};

export function advance(ticks = 1) {
  for (let i = 0; i < ticks; i++) {
    S.tick++;
    const due = S.timers.filter((t) => t.at <= S.tick);
    S.timers = S.timers.filter((t) => t.at > S.tick);
    due.forEach((t) => t.cb());
    S.intervals.forEach((iv) => {
      if (S.tick % iv.every === 0) iv.cb();
    });
  }
}

// Fire a before-event the way the engine does: handlers run in read-only mode.
export function fireBefore(signal, ev) {
  S.readOnly = true;
  try {
    signal.fire(ev);
  } finally {
    S.readOnly = false;
  }
  return ev;
}
