# Deploying Innovation Brain to Azure (Maersk tenant)

This turns the app into a deployed, team-used tool where the Vibe Gateway key
lives **server-side** (never in the browser), sign-in is gated by Entra ID, and
the backend runs inside Azure so it can reach the internal gateway host.

## Architecture

```
Browser (SPA)  ──POST /api/chat──►  Azure Function proxy  ──Bearer key──►  Vibe Gateway
   (no key)        same origin          (holds VIBE_API_KEY)                (/chat/completions)
```

- Static SPA (Vite build) + a managed Azure Functions API (`/api/chat`).
- `staticwebapp.config.json` requires an authenticated Entra user for the whole app.
- The browser posts an OpenAI-shaped body to `/api/chat`; the function adds the
  key and forwards to `<VIBE_BASE_URL>/chat/completions`.

## Why not the browser key / GitHub Pages

- A budget-bound key in every browser is a security + rotation problem.
- The gateway is an internal `*.maersk.io` host; a public origin may be blocked
  by CORS or unreachable off-network. The server proxy solves both.

## One-time: get a gateway key (see also the Quick Start doc)

```bash
vibecli login
vibecli --app-code <APP> --environment NONPROD budget create --max-budget 50 --cycle MONTHLY
vibecli --app-code <APP> --environment NONPROD models list          # pick a model
vibecli --app-code <APP> --environment NONPROD collection create \
  --name innovation-brain --models <MODEL> --budget-ref <APP>-budget-nonprod
vibecli --app-code <APP> --environment NONPROD auth request \
  --resource-id <APP>-innovation-brain-nonprod --identity-name innovation-brain-key \
  --max-budget 50 --cycle MONTHLY --key-duration 90d
```

Retrieve the `key` and `url` from the MDP Portal → Secrets tab (or Vault).

## Deploy (Azure Static Web Apps)

1. Create a **Static Web App** in the Maersk subscription.
   - App location: `/`  ·  Api location: `api`  ·  Output location: `dist`
   - Build: `npm run build`
2. **App settings** (Configuration → these are server-only, not in the bundle):
   - `VIBE_BASE_URL` = the `url` from your Vault secret (e.g. `https://vibe-proxy.westeurope.dev.maersk.io`)
   - `VIBE_API_KEY` = the `sk-…` key (use a **Key Vault reference** in prod)
3. **Build-time variables** (so the SPA calls the proxy):
   - `VITE_AI_PROXY_URL` = `/api/chat`
   - `VITE_AI_MODEL` = your model name (e.g. `claude-3-sonnet`)
4. **Entra sign-in**: register an app (or reuse the SPA one), then set SWA app
   settings `AAD_CLIENT_ID`, `AAD_CLIENT_SECRET`, `AAD_TENANT_ID`. The included
   `staticwebapp.config.json` already gates the app and `/api/*` to authenticated
   users and redirects anonymous hits to `/.auth/login/aad`.

### Network note (important)

If `vibe-proxy` is only reachable **inside** the Maersk network, the SWA managed
(consumption) functions may not have line-of-sight. In that case use SWA's
**linked backend** (or host the `api` on an **App Service / Container App** with
**VNet integration**) so the proxy can reach the internal host. The proxy code is
identical; only where it runs changes.

## Verify

- Sign in → you should be prompted for your Maersk account.
- Settings → AI assistant shows "served by a secure server-side proxy".
- AI tab → ask something → it answers (spend shows on the LiteLLM Grafana dashboard).

## Local dev

Leave `VITE_AI_PROXY_URL` blank and paste a personal `sk-…` key in Settings; the
app calls the gateway directly from the browser (fine for local testing only).
