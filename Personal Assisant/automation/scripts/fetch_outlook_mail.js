// Read-only Outlook mail fetch via Microsoft Graph. Never writes, moves, marks-read,
// replies, or deletes anything — GET requests only, mirrors the Gmail MCP's read-only
// search_threads pattern used elsewhere in this system.
//
// Usage: node automation/scripts/fetch_outlook_mail.js [--since=2026-08-01] [--top=25] [--folder=inbox]
// Requires a prior run of outlook_device_login.js to have cached a refresh token.
// Prints a JSON array of {subject, from, receivedDateTime, bodyPreview, webLink} to stdout.

const fs = require("fs");
const path = require("path");
const msal = require("@azure/msal-node");

const ROOT = path.resolve(__dirname, "..", "..");
const AUTH_PATH = path.join(ROOT, "profile", "outlook-auth.json");
const CACHE_PATH = path.join(ROOT, "profile", "outlook-token-cache.json");

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
}

async function main() {
  if (!fs.existsSync(AUTH_PATH)) throw new Error(`Missing ${AUTH_PATH} — see profile/outlook-auth.example.json`);
  if (!fs.existsSync(CACHE_PATH)) throw new Error(`No cached login found at ${CACHE_PATH} — run outlook_device_login.js interactively first.`);
  const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf-8"));

  const cachePlugin = {
    beforeCacheAccess: async (ctx) => ctx.tokenCache.deserialize(fs.readFileSync(CACHE_PATH, "utf-8")),
    afterCacheAccess: async (ctx) => { if (ctx.cacheHasChanged) fs.writeFileSync(CACHE_PATH, ctx.tokenCache.serialize()); },
  };
  const pca = new msal.PublicClientApplication({
    auth: { clientId: auth.clientId, authority: `https://login.microsoftonline.com/${auth.tenantId}` },
    cache: { cachePlugin },
  });

  const cache = pca.getTokenCache();
  const accounts = await cache.getAllAccounts();
  if (!accounts.length) throw new Error("No cached account — run outlook_device_login.js again.");

  const result = await pca.acquireTokenSilent({ scopes: ["Mail.Read"], account: accounts[0] });

  const folder = arg("folder", "inbox");
  const top = arg("top", "25");
  const since = arg("since", null);
  let url = `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?$top=${top}&$orderby=receivedDateTime desc&$select=subject,from,receivedDateTime,bodyPreview,webLink,isRead`;
  if (since) url += `&$filter=receivedDateTime ge ${since}T00:00:00Z`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${result.accessToken}` } });
  if (!res.ok) throw new Error(`Graph API error ${res.status}: ${await res.text()}`);
  const data = await res.json();

  const messages = (data.value || []).map((m) => ({
    subject: m.subject,
    from: m.from ? m.from.emailAddress.address : null,
    fromName: m.from ? m.from.emailAddress.name : null,
    receivedDateTime: m.receivedDateTime,
    bodyPreview: m.bodyPreview,
    webLink: m.webLink,
    isRead: m.isRead,
  }));
  console.log(JSON.stringify(messages, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
