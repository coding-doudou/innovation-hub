import { getToken } from "../auth/msalClient.js";
import { graphBaseUrl, sharePoint } from "../config.js";

async function graphFetch(path, options = {}) {
  const token = await getToken();
  const response = await fetch(`${graphBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.error?.message || JSON.stringify(body);
    } catch {
      detail = await response.text().catch(() => "");
    }
    throw new Error(`Graph ${options.method || "GET"} ${path} failed (${response.status}): ${detail}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

let siteIdPromise = null;
const listIdCache = new Map();

function resolveSiteId() {
  if (!siteIdPromise) {
    // GET /sites/{hostname}:{server-relative-path}
    const path = `/sites/${sharePoint.hostname}:${sharePoint.sitePath}`;
    siteIdPromise = graphFetch(path).then((site) => site.id);
  }
  return siteIdPromise;
}

async function resolveListId(displayName) {
  if (listIdCache.has(displayName)) return listIdCache.get(displayName);
  const siteId = await resolveSiteId();
  const data = await graphFetch(`/sites/${siteId}/lists?$top=200&$select=id,displayName,name`);
  const match = (data.value || []).find(
    (list) => list.displayName === displayName || list.name === displayName
  );
  if (!match) {
    throw new Error(`SharePoint list "${displayName}" not found on the configured site.`);
  }
  listIdCache.set(displayName, match.id);
  return match.id;
}

export async function listItems(listName) {
  const siteId = await resolveSiteId();
  const listId = await resolveListId(listName);
  const items = [];
  let path = `/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=200`;
  while (path) {
    const page = await graphFetch(path);
    for (const item of page.value || []) {
      items.push({ itemId: item.id, fields: item.fields || {} });
    }
    const next = page["@odata.nextLink"];
    path = next ? next.replace(graphBaseUrl, "") : null;
  }
  return items;
}

export async function createItem(listName, fields) {
  const siteId = await resolveSiteId();
  const listId = await resolveListId(listName);
  const created = await graphFetch(`/sites/${siteId}/lists/${listId}/items`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  return created.id;
}

export async function updateItem(listName, itemId, fields) {
  const siteId = await resolveSiteId();
  const listId = await resolveListId(listName);
  await graphFetch(`/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

export async function deleteItem(listName, itemId) {
  const siteId = await resolveSiteId();
  const listId = await resolveListId(listName);
  await graphFetch(`/sites/${siteId}/lists/${listId}/items/${itemId}`, {
    method: "DELETE",
  });
}

// --- Diagnostics ---------------------------------------------------------
// Used by the Settings "Test connection" button so a misconfigured backend
// reports exactly which step failed instead of a cryptic error on first load.

export async function getSite() {
  const path = `/sites/${sharePoint.hostname}:${sharePoint.sitePath}`;
  const site = await graphFetch(`${path}?$select=id,displayName,webUrl`);
  return { id: site.id, displayName: site.displayName, webUrl: site.webUrl };
}

// Confirms a list is reachable and carries the required plain-text Payload
// column, and returns a rough item count for a sanity check.
export async function inspectList(listName) {
  const siteId = await resolveSiteId();
  const listId = await resolveListId(listName);
  const columns = await graphFetch(`/sites/${siteId}/lists/${listId}/columns?$select=name,displayName`);
  const hasPayload = (columns.value || []).some(
    (column) => column.name === "Payload" || column.displayName === "Payload"
  );
  const page = await graphFetch(`/sites/${siteId}/lists/${listId}/items?$select=id&$top=1`);
  const sampled = (page.value || []).length;
  const hasMore = Boolean(page["@odata.nextLink"]);
  return { hasPayload, count: hasMore ? "1+" : String(sampled) };
}
