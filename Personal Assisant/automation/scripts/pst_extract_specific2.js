const { PSTFile } = require("pst-extractor");
const fs = require("fs");

const pstPath = "C:/Users/WT8/Projects/Personal Assisant/profile/mail-exports/ezekiel.ologunde@lawsonstate.edu.pst";
const pstFile = new PSTFile(pstPath);

const TARGETS = [
  "urgent: time sensitive: session speaker signed contract needed",
  "cengage support case 21409933",
  "update on your cengage support request 21409933",
];

function htmlToText(html) {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

const results = [];
function walk(folder) {
  if (folder.contentCount > 0) {
    let email = folder.getNextChild();
    while (email !== null) {
      const subj = (email.subject || "").toLowerCase();
      for (const t of TARGETS) {
        if (subj.includes(t)) {
          let text = email.body || "";
          if (!text || text.trim().length < 5) text = htmlToText(email.bodyHTML || "");
          results.push({
            folder: folder.displayName, subject: email.subject,
            sender: email.senderName + (email.senderEmailAddress ? ` <${email.senderEmailAddress}>` : ""),
            to: email.displayTo,
            date: email.messageDeliveryTime ? email.messageDeliveryTime.toISOString() : null,
            body: text.slice(0, 4000),
          });
          break;
        }
      }
      email = folder.getNextChild();
    }
  }
  if (folder.hasSubfolders) for (const child of folder.getSubFolders()) walk(child);
}
walk(pstFile.getRootFolder());
results.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
fs.writeFileSync(
  "C:/Users/WT8/AppData/Local/Temp/claude/C--Users-WT8-Projects-Personal-Assisant/dc7ff995-9b11-494c-bddf-e8cbd0ff9e32/scratchpad/pst_cengage_urgent.json",
  JSON.stringify(results, null, 2)
);
console.log(`Extracted ${results.length} messages.`);
