
import { seedDoc } from "../model.js";

export const memoryAdapter = {
  async load() {
    if (!this._doc) {
      this._doc = seedDoc();
    }
    return JSON.parse(JSON.stringify(this._doc));
  },

  async save(next) {
    next.rev = (next.rev || 0) + 1;
    next.updatedAt = new Date().toISOString();
    this._doc = JSON.parse(JSON.stringify(next));
  }
};
