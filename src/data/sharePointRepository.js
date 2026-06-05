// SharePoint Lists backend via Microsoft Graph. Each record is stored as JSON in
// a multiline "Payload" column; the SharePoint item id is tracked in memory on
// the record as `_spItemId` (stripped before writing, never persisted).

import { sharePoint } from "../config.js";
import { listItems, createItem, updateItem, deleteItem } from "./graphClient.js";

const SP_ITEM_ID = "_spItemId";

function toPayload(record) {
  const clone = { ...record };
  delete clone[SP_ITEM_ID];
  return JSON.stringify(clone);
}

function fromItem(item) {
  const parsed = JSON.parse(item.fields.Payload || "{}");
  return { ...parsed, [SP_ITEM_ID]: item.itemId };
}

function title(record, fallbackKey) {
  const raw = String(record[fallbackKey] ?? record.name ?? record.project ?? "Untitled");
  return raw.slice(0, 255);
}

async function loadList(listName, fallbackKey) {
  const items = await listItems(listName);
  return items
    .filter((item) => item.fields && item.fields.Payload)
    .map((item) => {
      try {
        return fromItem(item);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function makeOps(listName, fallbackKey) {
  return {
    async create(record) {
      const itemId = await createItem(listName, {
        Title: title(record, fallbackKey),
        Payload: toPayload(record),
      });
      return { ...record, [SP_ITEM_ID]: itemId };
    },
    async update(record) {
      const itemId = record[SP_ITEM_ID];
      if (!itemId) return this.create(record);
      await updateItem(listName, itemId, {
        Title: title(record, fallbackKey),
        Payload: toPayload(record),
      });
      return record;
    },
    async remove(record) {
      const itemId = record[SP_ITEM_ID];
      if (itemId) await deleteItem(listName, itemId);
    },
  };
}

const projectOps = makeOps(sharePoint.projectsList, "name");
const decisionOps = makeOps(sharePoint.decisionsList, "decision");

export const sharePointRepository = {
  isRemote: true,
  requiresAuth: true,

  async load() {
    const [projects, decisions] = await Promise.all([
      loadList(sharePoint.projectsList, "name"),
      loadList(sharePoint.decisionsList, "decision"),
    ]);
    return { projects, decisions };
  },

  createProject: (p) => projectOps.create(p),
  updateProject: (p) => projectOps.update(p),
  deleteProject: (p) => projectOps.remove(p),

  createDecision: (d) => decisionOps.create(d),
  updateDecision: (d) => decisionOps.update(d),
  deleteDecision: (d) => decisionOps.remove(d),
};
