# Production setup — shared SharePoint backend

The app reads and writes a shared team workspace stored in **SharePoint Lists**, accessed from the browser via **Microsoft Graph**, with sign-in through **Entra ID (Azure AD)** using MSAL. No server is required — it still deploys as a static site to GitHub Pages.

```
GitHub Pages (static SPA) → MSAL sign-in (Entra ID) → Microsoft Graph → SharePoint Lists
```

If none of the values below are configured, the app automatically falls back to **browser localStorage** (single-user, per-browser) so it always builds and runs. Configure all of part A–C to switch the whole team onto the shared backend.

> The client ID, tenant ID, site, and list names are **not secrets** — a browser SPA exposes them in its bundle. Access is protected by sign-in + the redirect-URI allowlist + Graph permissions, not by hiding these values.

---

## A. SharePoint site + lists

1. Create (or pick) a SharePoint site, e.g. `https://<tenant>.sharepoint.com/sites/InnovationHub`.
   - `VITE_SP_HOSTNAME` = `<tenant>.sharepoint.com`
   - `VITE_SP_SITE_PATH` = `/sites/InnovationHub`
2. Create **two lists** on that site:
   - **Projects**
   - **Decisions**
3. On **each** list, add one column:
   - Name: **`Payload`** (exactly)
   - Type: **Multiple lines of text** → **Plain text** (not rich text)
   - This column holds the full record as JSON. The built-in `Title` column is used only as a human-readable label in the SharePoint UI.

That is the entire schema. All record fields (including nested vendor tables and activity logs) live inside `Payload`.

## B. Entra ID app registration

1. Entra admin center → **App registrations** → **New registration**.
   - Name: `Innovation Portfolio Hub`
   - Supported account types: **Single tenant** (this organization only).
   - Platform → **Single-page application (SPA)**.
   - Redirect URI: the exact URL the app is served from, including the trailing slash, e.g.
     `https://<owner>.github.io/<repo>/`
     (add `http://localhost:5173/` too if you want local dev with the real backend).
2. Copy **Application (client) ID** → `VITE_AAD_CLIENT_ID`.
   Copy **Directory (tenant) ID** → `VITE_AAD_TENANT_ID`.
3. **API permissions** → Add → Microsoft Graph → **Delegated**:
   - `User.Read`
   - `Sites.ReadWrite.All`
   - Click **Grant admin consent** (requires a tenant admin).

> Tighter alternative: an admin can use **`Sites.Selected`** and grant write access to only the one site. That needs an extra admin step (granting the app permission on the specific site) and is recommended if `Sites.ReadWrite.All` is too broad for your security review.

## C. GitHub repository variables

Repo → **Settings → Secrets and variables → Actions → Variables** → add each as a **Variable** (not a Secret):

| Variable | Example |
| --- | --- |
| `VITE_AAD_CLIENT_ID` | `00000000-0000-0000-0000-000000000000` |
| `VITE_AAD_TENANT_ID` | `11111111-1111-1111-1111-111111111111` |
| `VITE_AAD_REDIRECT_URI` | `https://<owner>.github.io/<repo>/` (optional; auto-detected if omitted) |
| `VITE_SP_HOSTNAME` | `<tenant>.sharepoint.com` |
| `VITE_SP_SITE_PATH` | `/sites/InnovationHub` |
| `VITE_SP_PROJECTS_LIST` | `Projects` (default) |
| `VITE_SP_DECISIONS_LIST` | `Decisions` (default) |

The deploy workflow (`.github/workflows/deploy-pages.yml`) already passes these into the build. Push to `main` (or re-run the workflow) to rebuild with the values baked in.

## D. First run

1. Open the deployed site. You'll be prompted to **Sign in with Microsoft**.
2. Go to **Settings → Backend connection → Test connection**. This verifies, step by step, that the app can resolve the site and that both lists exist with the required `Payload` column — so a misconfiguration surfaces a clear message instead of a cryptic load error. Green across the board means the wiring is correct.
3. On the first sign-in with empty lists, the app seeds the sample portfolio into SharePoint so the workspace isn't blank.
4. Everyone with access to the SharePoint site now sees and edits the same data.

---

## Local development

- Default (no setup): `npm install && npm run dev` → runs on localStorage.
- Against the real backend: copy `.env.example` to `.env`, fill in the same values as the GitHub Variables, add `http://localhost:5173/` as a redirect URI on the app registration, then `npm run dev`.
- Force a backend regardless of detection with `VITE_DATA_BACKEND=local` or `VITE_DATA_BACKEND=sharepoint`.

## Notes & limits

- **Concurrency:** edits are saved per record (last-write-wins at the record level). The "Reload from server" button on the sync banner refetches the latest. There is no live push; refresh to see others' changes.
- **Import / Reset:** disabled in the UI on the shared backend to avoid wiping team data. Export (JSON/CSV) stays available. Manage bulk changes directly in SharePoint.
- **Requires Node 20.19+ / 22.12+** to build (Vite 8). CI uses Node 22.
