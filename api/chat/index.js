// Server-side proxy for OpenAI-compatible AI providers such as RunPod vLLM
// and the MIDAS Vibe Gateway.
//
// The browser posts an OpenAI-shaped body to /api/chat (no key). This function,
// running inside Azure (on the Maersk network, so it can reach the internal
// provider), adds the Authorization header from server config and forwards to
// <AI_BASE_URL>/chat/completions. The provider key never leaves the server.
//
// Required app settings (Azure): AI_BASE_URL, AI_API_KEY. The legacy
// VIBE_BASE_URL/VIBE_API_KEY names remain supported for existing deployments.
// AI_API_KEY should be a Key Vault reference in production.

module.exports = async function (context, req) {
  const base = String(process.env.AI_BASE_URL || process.env.VIBE_BASE_URL || "").replace(/\/+$/, "");
  const key = process.env.AI_API_KEY || process.env.VIBE_API_KEY || "";

  if (!base || !key) {
    context.res = { status: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "AI proxy is not configured (AI_BASE_URL / AI_API_KEY missing)." }) };
    return;
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    context.res = { status: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Request must include a non-empty 'messages' array." }) };
    return;
  }

  try {
    const upstream = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    context.res = { status: upstream.status, headers: { "Content-Type": "application/json" }, body: text };
  } catch (error) {
    context.res = { status: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: `Could not reach the AI provider: ${error instanceof Error ? error.message : String(error)}` }) };
  }
};
