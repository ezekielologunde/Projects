// One-time interactive login for read-only Outlook/Microsoft Graph access.
// Run this yourself in a terminal: node automation/scripts/outlook_device_login.js
// It will print a URL and a short code — open the URL in any browser, sign in with
// your own Lawson State account, enter the code, and approve the "Mail.Read" request.
// This script never sees or asks for your password; the sign-in happens entirely on
// Microsoft's own login page. A refresh token gets cached locally afterward so future
// scheduled runs can fetch mail silently, without you signing in again.
//
// Requires profile/outlook-auth.json to exist first (copy profile/outlook-auth.example.json
// and fill in tenantId + clientId from your Entra app registration).

const fs = require("fs");
const path = require("path");
const msal = require("@azure/msal-node");

const ROOT = path.resolve(__dirname, "..", "..");
const AUTH_PATH = path.join(ROOT, "profile", "outlook-auth.json");
const CACHE_PATH = path.join(ROOT, "profile", "outlook-token-cache.json");

if (!fs.existsSync(AUTH_PATH)) {
  console.error(`Missing ${AUTH_PATH}. Copy profile/outlook-auth.example.json to profile/outlook-auth.json and fill in tenantId + clientId first.`);
  process.exit(1);
}
const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf-8"));

const cachePlugin = {
  beforeCacheAccess: async (ctx) => {
    if (fs.existsSync(CACHE_PATH)) ctx.tokenCache.deserialize(fs.readFileSync(CACHE_PATH, "utf-8"));
  },
  afterCacheAccess: async (ctx) => {
    if (ctx.cacheHasChanged) fs.writeFileSync(CACHE_PATH, ctx.tokenCache.serialize());
  },
};

const pca = new msal.PublicClientApplication({
  auth: {
    clientId: auth.clientId,
    authority: `https://login.microsoftonline.com/${auth.tenantId}`,
  },
  cache: { cachePlugin },
});

const deviceCodeRequest = {
  scopes: ["Mail.Read"],
  deviceCodeCallback: (response) => {
    console.log("\n" + response.message + "\n");
  },
};

pca.acquireTokenByDeviceCode(deviceCodeRequest)
  .then((result) => {
    console.log(`Signed in as ${result.account.username}.`);
    console.log(`Refresh token cached at ${CACHE_PATH} — future runs of fetch_outlook_mail.js won't need interactive login.`);
  })
  .catch((err) => {
    console.error("Login failed:", err.message || err);
    console.error("\nIf this says public client flows are disabled: in the Entra app registration, go to Authentication -> Advanced settings -> 'Allow public client flows' -> Yes.");
    process.exit(1);
  });
