
import { seedDoc } from "../model.js";

export class LocalStorageAdapter {
  constructor({ key = "mockdb:doc" } = {}) {
    this.key = key;
  }

  async load() {
    const raw = localStorage.getItem(this.key);
    if (!raw) {
      const fresh = seedDoc();
      localStorage.setItem(this.key, JSON.stringify(fresh));
      return fresh;
    }
    return JSON.parse(raw);
  }

  async save(next) {
    next.rev = (next.rev || 0) + 1;
    next.updatedAt = new Date().toISOString();
    localStorage.setItem(this.key, JSON.stringify(next));
  }
}

export const localStorageAdapter = new LocalStorageAdapter();
