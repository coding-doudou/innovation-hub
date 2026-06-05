// Browser localStorage backend. Used for dev/offline and whenever Azure config
// is absent, so the app always builds and runs with zero setup.

const KEYS = {
  projects: "iph_projects",
  decisions: "iph_decisions",
};

const cache = { projects: [], decisions: [] };

function read(key) {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(kind) {
  localStorage.setItem(KEYS[kind], JSON.stringify(cache[kind]));
}

function upsert(kind, record) {
  const list = cache[kind];
  const index = list.findIndex((item) => item.id === record.id);
  if (index >= 0) list[index] = record;
  else list.unshift(record);
  write(kind);
  return record;
}

function remove(kind, id) {
  cache[kind] = cache[kind].filter((item) => item.id !== id);
  write(kind);
}

export const localRepository = {
  isRemote: false,
  requiresAuth: false,

  async load() {
    cache.projects = read(KEYS.projects);
    cache.decisions = read(KEYS.decisions);
    return { projects: [...cache.projects], decisions: [...cache.decisions] };
  },

  async replaceAll({ projects, decisions }) {
    cache.projects = [...projects];
    cache.decisions = [...decisions];
    write("projects");
    write("decisions");
  },

  async createProject(project) {
    return upsert("projects", project);
  },
  async updateProject(project) {
    return upsert("projects", project);
  },
  async deleteProject(project) {
    remove("projects", project.id);
  },

  async createDecision(decision) {
    return upsert("decisions", decision);
  },
  async updateDecision(decision) {
    return upsert("decisions", decision);
  },
  async deleteDecision(decision) {
    remove("decisions", decision.id);
  },
};
