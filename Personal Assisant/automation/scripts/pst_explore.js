const { PSTFile } = require("pst-extractor");

const pstPath = "C:/Users/WT8/Projects/Personal Assisant/profile/mail-exports/Ezekiel.Ologunde@faculty.uagc.edu.pst";
const pstFile = new PSTFile(pstPath);

function walk(folder, depth) {
  const indent = "  ".repeat(depth);
  console.log(`${indent}${folder.displayName} (emails: ${folder.emailCount}, subfolders: ${folder.hasSubfolders})`);
  if (folder.hasSubfolders) {
    const children = folder.getSubFolders();
    for (const child of children) walk(child, depth + 1);
  }
}

console.log("Root:", pstFile.getMessageStore().displayName);
walk(pstFile.getRootFolder(), 0);
