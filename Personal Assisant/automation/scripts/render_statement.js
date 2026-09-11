// Renders a generic statement doc (teaching philosophy, diversity statement, etc.) from a JSON body.
// Usage: node render_statement.js <input.json> <output.docx>
//
// Input JSON shape:
// {
//   "contact": {...},
//   "location_line": "Birmingham, AL",
//   "document_title": "Teaching Statement",
//   "paragraphs": ["...", "...", ...],
//   "signature_name": "Ezekiel Ologunde"   // optional trailing signature line
// }

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, ExternalHyperlink,
} = require("docx");

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("Usage: node render_statement.js <input.json> <output.docx>");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
const NAVY = "0A3264";
const US_LETTER = { width: 12240, height: 15840 };
const MARGIN = 1440;

const contact = data.contact;
const children = [];

children.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: contact.name, bold: true, size: 22 })] }));
children.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: data.location_line || contact.location, size: 22 })] }));
children.push(new Paragraph({
  spacing: { after: 20 },
  children: [new ExternalHyperlink({
    children: [new TextRun({ text: contact.linkedin_url, style: "Hyperlink", size: 22, color: NAVY })],
    link: `https://${contact.linkedin_url}`,
  })],
}));
children.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: contact.email, size: 22, color: NAVY })] }));
children.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: contact.phone, size: 22 })] }));

children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 240 },
  children: [new TextRun({ text: data.document_title, bold: true, size: 24 })],
}));

for (const p of data.paragraphs) {
  children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: p, size: 22 })] }));
}

if (data.signature_name) {
  children.push(new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: data.signature_name, size: 22 })] }));
}

const doc = new Document({
  styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
  sections: [{
    properties: { page: { size: US_LETTER, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } },
    children,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  console.log(`Wrote ${outputPath}`);
});
