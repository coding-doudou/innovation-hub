// Client-side blob store for project documents. File bytes live in IndexedDB
// (large, binary-friendly) while lightweight metadata stays on the project
// record so the localStorage/SharePoint projects payload stays small.

const DB_NAME = "iph_docs";
const STORE = "files";
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function tx(mode, run) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    const request = run(store);
    transaction.oncomplete = () => resolve(request ? request.result : undefined);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

// Persist a file's bytes under a generated id. Returns the id.
export async function putDoc(id, blob) {
  await tx("readwrite", (store) => store.put(blob, id));
  return id;
}

// Retrieve a stored Blob, or null if it isn't present in this browser.
export async function getDoc(id) {
  try {
    const result = await tx("readonly", (store) => store.get(id));
    return result || null;
  } catch {
    return null;
  }
}

export async function deleteDoc(id) {
  try {
    await tx("readwrite", (store) => store.delete(id));
  } catch {
    // best-effort; metadata removal is the source of truth for the UI
  }
}
