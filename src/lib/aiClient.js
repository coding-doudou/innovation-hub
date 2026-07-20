// OpenAI-compatible client for local Ollama/vLLM and the MIDAS Vibe Gateway.
// Every provider is accessed through the standard /chat/completions endpoint.
//
// The app is a public client-side SPA, so it cannot ship a budget-bound key in
// the bundle. Instead each user pastes their own Vibe Gateway key in Settings;
// it is kept in this browser's localStorage and sent directly to the proxy.
// To move to a shared key later, point baseUrl at a server-side proxy that
// injects the key and leave the client key blank.

import { aiProxyUrl, aiDefaultModel } from "../config.js";

export const vibeHosts = {
  nonprod: "https://vibe-proxy.westeurope.dev.maersk.io",
  prod: "https://vibe-proxy.westeurope.prod.maersk.io",
};

export const localAiPresets = {
  ollama: {
    label: "Ollama",
    baseUrl: "http://127.0.0.1:11434/v1",
    model: "qwen3:4b",
  },
  vllm: {
    label: "vLLM",
    baseUrl: "http://127.0.0.1:8000/v1",
    model: "OctOpus3_30B_A3B",
  },
};

// When a server-side proxy is configured (deployed build), the browser calls it
// instead of the gateway directly and never holds a key.
export const proxyMode = Boolean(aiProxyUrl);

// Model to send: user override in Settings, else the deployment default.
export function resolvedModel(cfg) {
  return (cfg.model || "").trim() || aiDefaultModel || "";
}

const STORE_KEY = "iph_ai_config";
const isLocalApp =
  typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
const DEFAULTS = {
  apiKey: "",
  env: "nonprod",
  model: isLocalApp ? localAiPresets.ollama.model : "",
  baseUrl: isLocalApp ? localAiPresets.ollama.baseUrl : "",
};

export function isLocalAiUrl(baseUrl) {
  try {
    const { hostname } = new URL(baseUrl);
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
  } catch {
    return false;
  }
}

export function loadAiConfig() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAiConfig(cfg) {
  const next = { ...DEFAULTS, ...cfg };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
  return next;
}

// Resolve the base URL: explicit override, else the env host. The gateway
// serves /chat/completions at the host root (matches the Vault secret's `url`).
export function resolvedBaseUrl(cfg) {
  const explicit = (cfg.baseUrl || "").trim();
  const base = explicit || `${vibeHosts[cfg.env] || vibeHosts.nonprod}`;
  return base.replace(/\/+$/, "");
}

export function isAiConfigured(cfg) {
  // In proxy mode the server holds the key; we only need a model to call.
  if (proxyMode) return Boolean(resolvedModel(cfg));
  const baseUrl = resolvedBaseUrl(cfg);
  return Boolean(resolvedModel(cfg) && ((cfg.apiKey || "").trim() || isLocalAiUrl(baseUrl)));
}

// Low-level call. Returns the full assistant message ({ role, content, tool_calls }).
// In proxy mode, posts to the server proxy (no key in the browser); otherwise
// calls the gateway directly with the browser-held key.
export async function createCompletion({ apiKey, model, baseUrl, messages, tools, temperature = 0.2, signal }) {
  const body = { model, messages, temperature };
  if (tools && tools.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
  const url = proxyMode ? aiProxyUrl : `${baseUrl}/chat/completions`;
  const headers = { "Content-Type": "application/json" };
  if (!proxyMode && apiKey) headers.Authorization = `Bearer ${apiKey}`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    throw new Error(
      `Could not reach ${url}. ${proxyMode ? "The server proxy may be down." : "This is usually a CORS or network issue — the gateway may not allow browser requests from this site."} (${err instanceof Error ? err.message : String(err)})`
    );
  }
  if (!res.ok) {
    let detail = "";
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message || JSON.stringify(errBody);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`AI endpoint returned ${res.status}. ${String(detail).slice(0, 400)}`);
  }
  const data = await res.json();
  const message = data?.choices?.[0]?.message;
  if (!message) throw new Error("AI endpoint returned no message.");
  return message;
}

// Convenience wrapper that returns just the text (used by the Settings test).
export async function chatComplete(opts) {
  const message = await createCompletion(opts);
  const text = message?.content;
  if (!text) throw new Error("AI endpoint returned no message content.");
  return String(text).trim();
}
