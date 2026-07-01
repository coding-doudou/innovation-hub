// Vibe Gateway (MIDAS AI) client. The gateway is OpenAI-compatible (LiteLLM
// proxy), so we talk to it with a standard /chat/completions call.
//
// The app is a public client-side SPA, so it cannot ship a budget-bound key in
// the bundle. Instead each user pastes their own Vibe Gateway key in Settings;
// it is kept in this browser's localStorage and sent directly to the proxy.
// To move to a shared key later, point baseUrl at a server-side proxy that
// injects the key and leave the client key blank.

export const vibeHosts = {
  nonprod: "https://vibe-proxy.westeurope.dev.maersk.io",
  prod: "https://vibe-proxy.westeurope.prod.maersk.io",
};

const STORE_KEY = "iph_ai_config";
const DEFAULTS = { apiKey: "", env: "nonprod", model: "", baseUrl: "" };

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
  return Boolean((cfg.apiKey || "").trim() && (cfg.model || "").trim());
}

// Low-level call. Returns the full assistant message ({ role, content, tool_calls }).
export async function createCompletion({ apiKey, model, baseUrl, messages, tools, temperature = 0.2, signal }) {
  const url = `${baseUrl}/chat/completions`;
  const body = { model, messages, temperature };
  if (tools && tools.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    throw new Error(
      `Could not reach ${url}. This is usually a CORS or network issue — the proxy may not allow browser requests from this site. (${err instanceof Error ? err.message : String(err)})`
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
    throw new Error(`Gateway returned ${res.status}. ${String(detail).slice(0, 400)}`);
  }
  const data = await res.json();
  const message = data?.choices?.[0]?.message;
  if (!message) throw new Error("Gateway returned no message.");
  return message;
}

// Convenience wrapper that returns just the text (used by the Settings test).
export async function chatComplete(opts) {
  const message = await createCompletion(opts);
  const text = message?.content;
  if (!text) throw new Error("Gateway returned no message content.");
  return String(text).trim();
}
