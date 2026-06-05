// Central runtime configuration, driven by Vite env vars (VITE_*).
// All of these values are PUBLIC by design: a browser SPA bundle cannot hold
// secrets. Access is protected by Entra ID sign-in + the app registration's
// redirect-URI allowlist + Microsoft Graph permissions, not by hiding config.

const env = import.meta.env;

const trim = (value) => (typeof value === "string" ? value.trim() : "");

export const aad = {
  clientId: trim(env.VITE_AAD_CLIENT_ID),
  tenantId: trim(env.VITE_AAD_TENANT_ID) || "organizations",
  // Defaults to the exact page URL the app is served from (works on GitHub
  // Pages project sites). This must match a redirect URI on the app registration.
  redirectUri: trim(env.VITE_AAD_REDIRECT_URI) || defaultRedirectUri(),
};

export const sharePoint = {
  hostname: trim(env.VITE_SP_HOSTNAME), // e.g. contoso.sharepoint.com
  sitePath: trim(env.VITE_SP_SITE_PATH), // e.g. /sites/InnovationHub
  projectsList: trim(env.VITE_SP_PROJECTS_LIST) || "Projects",
  decisionsList: trim(env.VITE_SP_DECISIONS_LIST) || "Decisions",
};

// Graph delegated scopes. Sites.ReadWrite.All is the simplest path and needs
// admin consent; an admin can later scope this to Sites.Selected if desired.
export const graphScopes = ["User.Read", "Sites.ReadWrite.All"];
export const graphBaseUrl = "https://graph.microsoft.com/v1.0";

// SharePoint is used only when fully configured; otherwise the app falls back
// to browser localStorage so it still builds and runs with zero Azure setup.
const explicit = trim(env.VITE_DATA_BACKEND).toLowerCase();
export const dataBackend =
  explicit === "sharepoint" || explicit === "local"
    ? explicit
    : aad.clientId && sharePoint.hostname && sharePoint.sitePath
      ? "sharepoint"
      : "local";

export const isRemoteBackend = dataBackend === "sharepoint";

function defaultRedirectUri() {
  if (typeof window === "undefined") return "";
  const { origin, pathname } = window.location;
  return origin + pathname;
}
