import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";
import { aad, graphScopes } from "../config.js";

// Single MSAL instance for the SPA. Created lazily so the local-storage backend
// (no Azure config) never touches MSAL.
let msal = null;
let initialized = false;

function getInstance() {
  if (!msal) {
    msal = new PublicClientApplication({
      auth: {
        clientId: aad.clientId,
        authority: `https://login.microsoftonline.com/${aad.tenantId}`,
        redirectUri: aad.redirectUri,
        navigateToLoginRequestUrl: false,
      },
      cache: {
        cacheLocation: "localStorage", // survive full-page redirect on GitHub Pages
        storeAuthStateInCookie: false,
      },
    });
  }
  return msal;
}

// Must run once before any other MSAL call. Also completes a redirect sign-in
// when the app reloads on the redirect URI with an auth response in the URL.
export async function initAuth() {
  if (initialized) return getActiveAccount();
  const instance = getInstance();
  await instance.initialize();
  const result = await instance.handleRedirectPromise();
  if (result?.account) {
    instance.setActiveAccount(result.account);
  } else {
    const existing = instance.getActiveAccount() || instance.getAllAccounts()[0];
    if (existing) instance.setActiveAccount(existing);
  }
  initialized = true;
  return getActiveAccount();
}

export function getActiveAccount() {
  if (!msal) return null;
  return msal.getActiveAccount();
}

export async function login() {
  await initAuth();
  // Redirect (not popup) is the most reliable flow on GitHub Pages.
  await getInstance().loginRedirect({ scopes: graphScopes });
}

export async function logout() {
  if (!msal) return;
  await msal.logoutRedirect({ account: getActiveAccount() ?? undefined });
}

// Returns a Graph access token, refreshing silently and falling back to an
// interactive redirect only when the cache can't satisfy the request.
export async function getToken(scopes = graphScopes) {
  await initAuth();
  const instance = getInstance();
  const account = getActiveAccount();
  if (!account) {
    await instance.acquireTokenRedirect({ scopes });
    throw new Error("Redirecting for sign-in");
  }
  try {
    const result = await instance.acquireTokenSilent({ account, scopes });
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await instance.acquireTokenRedirect({ account, scopes });
      throw new Error("Redirecting for consent");
    }
    throw error;
  }
}
