// Streams a Google Takeout .mbox file and extracts a lightweight header index
// (subject, from, to, date) without loading the whole file into memory or doing
// full MIME parsing — fast enough for large (300MB+) exports. Read-only, never
// modifies the source file.
//
// Usage: node automation/scripts/mbox_index.js <path-to.mbox> <output.json> [--label=account-name]

const fs = require("fs");
const readline = require("readline");

const [, , mboxPath, outPath] = process.argv;
const labelArg = process.argv.find((a) => a.startsWith("--label="));
const label = labelArg ? labelArg.split("=").slice(1).join("=") : mboxPath;

if (!mboxPath || !outPath) {
  console.error("Usage: node mbox_index.js <path-to.mbox> <output.json> [--label=account-name]");
  process.exit(1);
}

const FROM_LINE = /^From \S+@\S+.*\d{4}$/;
const HEADER_LINE = /^([A-Za-z-]+):\s?(.*)$/;

async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(mboxPath, { encoding: "utf-8" }), crlfDelay: Infinity });
  const messages = [];
  let current = null;
  let inHeaders = false;
  let lastHeader = null;

  for await (const line of rl) {
    if (FROM_LINE.test(line)) {
      if (current) messages.push(current);
      current = { account: label, labels: null, subject: null, from: null, to: null, date: null };
      inHeaders = true;
      lastHeader = null;
      continue;
    }
    if (!current) continue;
    if (inHeaders && line === "") { inHeaders = false; continue; }
    if (!inHeaders) continue;

    if (/^[ \t]/.test(line) && lastHeader) {
      // header continuation line
      current[lastHeader] = (current[lastHeader] || "") + " " + line.trim();
      continue;
    }
    const m = line.match(HEADER_LINE);
    if (!m) continue;
    const name = m[1].toLowerCase();
    const value = m[2];
    if (name === "subject") { current.subject = value; lastHeader = "subject"; }
    else if (name === "from") { current.from = value; lastHeader = "from"; }
    else if (name === "to") { current.to = value; lastHeader = "to"; }
    else if (name === "date") { current.date = value; lastHeader = "date"; }
    else if (name === "x-gmail-labels") { current.labels = value; lastHeader = "labels"; }
    else { lastHeader = null; }
  }
  if (current) messages.push(current);

  fs.writeFileSync(outPath, JSON.stringify(messages, null, 2));
  console.log(`Indexed ${messages.length} messages from ${mboxPath} -> ${outPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
