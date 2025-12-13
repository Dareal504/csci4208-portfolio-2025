
import { seedDoc } from "./model.js";

let _adapter = null;
let _doc = null;

// Utility: deep clone
const clone = (x) => JSON.parse(JSON.stringify(x));

// Generate random id (works for all collections)
const makeId = () => "id-" + Math.random().toString(36).slice(2, 11);

// ---------------- ADAPTER SELECTION ----------------
export function useAdapter(a) {
  _adapter = a;
}

export async function boot() {
  if (!_adapter) throw new Error("No adapter selected.");
  _doc = await _adapter.load();
  return clone(_doc);
}

// ------------------- READ --------------------------
export function getDoc() {
  return clone(_doc);
}

export function findMany(col, pred = () => true) {
  return getDoc()[col].filter(pred);
}

export function findOne(col, pred) {
  return getDoc()[col].find(pred) || null;
}

// ------------------- CREATE -------------------------
export async function insertOne(col, data) {
  const rec = { id: makeId(), ...data };
  _doc[col].push(rec);
  await _adapter.save(_doc);
  return clone(rec);
}

// ------------------- UPDATE (shallow) ----------------
export async function updateOne(col, id, patch) {
  const arr = _doc[col];
  const idx = arr.findIndex((x) => x.id === id);
  if (idx === -1) return 0;
  arr[idx] = { ...arr[idx], ...patch };
  await _adapter.save(_doc);
  return 1;
}

// ------------------- DELETE --------------------------
export async function deleteOne(col, id) {
  const arr = _doc[col];
  const idx = arr.findIndex((x) => x.id === id);
  if (idx === -1) return 0;
  arr.splice(idx, 1);
  await _adapter.save(_doc);
  return 1;
}

// =====================================================
//            ADVANCED CRUD IMPLEMENTATION
// =====================================================

// ----------- Predicates via filter object -------------
// Example: { done:false, assignedTo:"u-alice" }
export function findManyBy(col, filter = {}) {
  const rows = getDoc()[col];
  return rows.filter((row) => {
    for (const [k, v] of Object.entries(filter)) {
      if (row[k] !== v) return false;
    }
    return true;
  });
}

export function findOneBy(col, filter = {}) {
  return findManyBy(col, filter)[0] || null;
}

// ----------- Projection helper ------------------------
function project(row, fields) {
  const out = {};
  for (const k of Object.keys(fields)) {
    if (k in row) out[k] = row[k];
  }
  return out;
}

// ----------- FIND (filter + sort + skip + limit + fields) --------
export function find(
  col,
  { filter = {}, sort = null, skip = 0, limit = null, fields = null } = {}
) {
  let rows = findManyBy(col, filter);

  if (sort) {
    const [[k, dir]] = Object.entries(sort);
    rows = rows
      .slice()
      .sort(
        (a, b) =>
          (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) *
          (dir === -1 ? -1 : 1)
      );
  }

  if (skip) rows = rows.slice(skip);
  if (limit) rows = rows.slice(0, limit);
  if (fields) rows = rows.map((r) => project(r, fields));

  return rows;
}

// ----------- UPDATE OPERATORS ($set, $addToSet, $pull) ----------
export async function updateOneOps(col, id, ops = {}) {
  const row = findOne(col, (r) => r.id === id);
  if (!row) return 0;

  const patch = {};

  // $set
  if (ops.$set) {
    for (const [k, v] of Object.entries(ops.$set)) {
      patch[k] = v;
    }
  }

  // $addToSet
  if (ops.$addToSet) {
    for (const [k, v] of Object.entries(ops.$addToSet)) {
      const arr = Array.isArray(row[k]) ? row[k] : [];
      const set = new Set(arr);
      if (Array.isArray(v)) {
        v.forEach((x) => set.add(x));
      } else {
        set.add(v);
      }
      patch[k] = [...set];
    }
  }

  // $pull
  if (ops.$pull) {
    for (const [k, v] of Object.entries(ops.$pull)) {
      const arr = Array.isArray(row[k]) ? row[k] : [];
      patch[k] = arr.filter((x) => x !== v);
    }
  }

  return await updateOne(col, id, patch);
}

// ------------------ UPSERT --------------------------
export async function upsertOne(col, filter = {}, data = {}) {
  const found = findOneBy(col, filter);
  if (found) {
    await updateOne(col, found.id, data);
    return findOne(col, (r) => r.id === found.id);
  }
  return await insertOne(col, data);
}

// ------------------ TRANSACT -------------------------
export async function transact(fn) {
  const working = clone(_doc);
  fn(working);
  _doc = working;
  await _adapter.save(_doc);
}
//implement this file