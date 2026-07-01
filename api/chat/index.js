// Server-side AI proxy for the Vibe Gateway.
//
// The browser posts an OpenAI-shaped body to /api/chat (no key). This function,
// running inside Azure (on the Maersk network, so it can reach the internal
// gateway host), adds the Authorization header from server config and forwards
// to <VIBE_BASE_URL>/chat/completions. The gateway key never leaves the server.
//
// Required app settings (Azure): VIBE_BASE_URL, VIBE_API_KEY.
// VIBE_API_KEY should be a Key Vault reference in production.

module.exports = async function (context, req) {
  const base = String(process.env.VIBE_BASE_URL || "").replace(/\/+$/, "");
  const key = process.env.VIBE_API_KEY || "";

  if (!base || !key) {
    context.res = { status: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "AI proxy is not configured (VIBE_BASE_URL / VIBE_API_KEY missing)." }) };
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
    context.res = { status: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: `Could not reach the gateway: ${error instanceof Error ? error.message : String(error)}` }) };
  }
};
