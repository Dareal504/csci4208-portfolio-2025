
import { seedDoc } from "../model.js";

export class JsonBinAdapter {
  constructor({ binId, stampOnSave = true, allowReset = false }) {
    this.binId = binId;
    this.#stampOnSave = stampOnSave;
    this.#allowReset = allowReset;
  }

  #stampOnSave = true;
  #allowReset = false;

  async #readLatest() {
    const url = `https://api.jsonbin.io/v3/b/${this.binId}/latest`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("JSONBin load failed.");
    const data = await res.json();
    return data.record;
  }

  async #write(doc) {
    const url = `https://api.jsonbin.io/v3/b/${this.binId}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc)
    });
    if (!res.ok) throw new Error("JSONBin save failed.");
  }

  #stamp(doc) {
    doc.rev = (doc.rev || 0) + 1;
    doc.updatedAt = new Date().toISOString();
  }

  async load() {
    try {
      return await this.#readLatest();
    } catch {
      const fresh = seedDoc();
      if (this.#stampOnSave) this.#stamp(fresh);
      await this.#write(fresh);
      return fresh;
    }
  }

  async save(next) {
    const remote = await this.#readLatest();
    const remoteRev = remote?.rev ?? 0;
    const nextRev = next?.rev ?? 0;

    if (remoteRev > nextRev)
      throw new Error("Remote is newer; reload/merge before saving.");

    if (this.#stampOnSave) this.#stamp(next);
    await this.#write(next);
  }

  async snapshot() {
    const doc = await this.#readLatest();
    return JSON.parse(JSON.stringify(doc));
  }

  async reset() {
    if (!this.#allowReset)
      throw new Error("JsonBinAdapter.reset(): disabled.");

    const fresh = seedDoc();
    this.#stamp(fresh);
    await this.#write(fresh);
  }
}

export function jsonBinAdapter(binId, opts = {}) {
  return new JsonBinAdapter({ binId, ...opts });
}