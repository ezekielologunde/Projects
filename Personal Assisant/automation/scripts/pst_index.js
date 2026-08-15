const { PSTFile, PSTFolder } = require("pst-extractor");
const fs = require("fs");

const pstPath = "C:/Users/WT8/Projects/Personal Assisant/profile/mail-exports/ezekiel.ologunde@lawsonstate.edu.pst";
const pstFile = new PSTFile(pstPath);

const TARGET_FOLDERS = ["Inbox", "Sent Items", "Deleted Items", "Junk Email"];
const results = [];

function walk(folder) {
  if (TARGET_FOLDERS.includes(folder.displayName) && folder.contentCount > 0) {
    let email = folder.getNextChild();
    while (email !== null) {
      results.push({
        folder: folder.displayName,
        subject: email.subject,
        sender: email.senderName + (email.senderEmailAddress ? ` <${email.senderEmailAddress}>` : ""),
        to: email.displayTo,
        date: email.messageDeliveryTime ? email.messageDeliveryTime.toISOString() : null,
        hasAttachments: email.hasAttachments,
      });
      email = folder.getNextChild();
    }
  }
  if (folder.hasSubfolders) {
    for (const child of folder.getSubFolders()) walk(child);
  }
}

walk(pstFile.getRootFolder());
results.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
fs.writeFileSync(
  "C:/Users/WT8/AppData/Local/Temp/claude/C--Users-WT8-Projects-Personal-Assisant/dc7ff995-9b11-494c-bddf-e8cbd0ff9e32/scratchpad/pst_index_lawsonstate.json",
  JSON.stringify(results, null, 2)
);
console.log(`Indexed ${results.length} messages.`);
