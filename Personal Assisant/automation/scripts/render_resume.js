// Renders a tailored résumé docx from a JSON selection (subset/reorder of profile/master-profile.json).
// Usage: node render_resume.js <input.json> <output.docx>
//
// Input JSON shape:
// {
//   "contact": {...},                 // from master-profile.json contact block
//   "professional_summary": "...",     // may be lightly reworded, never fabricated
//   "education": [...],                // full or filtered list of education entries
//   "experience": [                    // selected/reordered entries, each with a SELECTED subset of bullets
//     {"title","company","location","start","end","bullets":[{"text":...}, ...]}
//   ],
//   "skills": { "Category Name": ["skill", ...], ... },   // selected/reordered subset
//   "certifications": ["...", ...],
//   "professional_affiliations": ["...", ...]
// }

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat,
  ExternalHyperlink, TabStopType, TabStopPosition, BorderStyle, HeadingLevel,
} = require("docx");

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("Usage: node render_resume.js <input.json> <output.docx>");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

const NAVY = "0A3264";
const US_LETTER = { width: 12240, height: 15840 };
const MARGIN = 1080; // 0.75"

function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: 220, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 2 } },
    children: [new TextRun({ text, bold: true, size: 24, color: NAVY })],
  });
}

function bulletList(reference) {
  return {
    reference,
    levels: [{
      level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 450, hanging: 270 } } },
    }],
  };
}

function headerBlock(contact) {
  const contactParts = [contact.phone, contact.location, contact.email].filter(Boolean).join(" | ");
  const linkRun = new ExternalHyperlink({
    children: [new TextRun({ text: contact.linkedin_url, style: "Hyperlink", size: 20, color: NAVY })],
    link: `https://${contact.linkedin_url}`,
  });
  const portfolioRun = contact.portfolio_url
    ? new ExternalHyperlink({
        children: [new TextRun({ text: contact.portfolio_url, style: "Hyperlink", size: 20, color: NAVY })],
        link: `https://${contact.portfolio_url}`,
      })
    : null;

  const lineChildren = [new TextRun({ text: contactParts + " | ", size: 20 }), linkRun];
  if (portfolioRun) lineChildren.push(new TextRun({ text: " | ", size: 20 }), portfolioRun);

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: (contact.name || "").toUpperCase(), bold: true, size: 40 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: lineChildren,
    }),
  ];
}

function experienceEntry(job) {
  const paras = [
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      spacing: { before: 160, after: 20 },
      children: [
        new TextRun({ text: job.title, bold: true, size: 21 }),
        new TextRun({ text: `\t${job.start} – ${job.end}`, italics: true, size: 21 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: `${job.company}, ${job.location}`, italics: true, size: 21 })],
    }),
  ];
  for (const b of job.bullets) {
    paras.push(new Paragraph({
      numbering: { reference: "resume-bullets", level: 0 },
      spacing: { after: 40 },
      children: [new TextRun({ text: b.text, size: 21 })],
    }));
  }
  return paras;
}

const children = [];
children.push(...headerBlock(data.contact));

if (data.professional_summary) {
  children.push(sectionHeading("Professional Summary"));
  children.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: data.professional_summary, size: 21 })] }));
}

if (data.education && data.education.length) {
  children.push(sectionHeading("Education"));
  for (const ed of data.education) {
    children.push(new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      spacing: { before: 100, after: 20 },
      children: [
        new TextRun({ text: ed.degree, bold: true, size: 21 }),
        new TextRun({ text: `\t${ed.date || ed.status || ""}`, italics: true, size: 21 }),
      ],
    }));
    children.push(new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: `${ed.institution}${ed.location ? " | " + ed.location : ""}`, italics: true, size: 21 })],
    }));
    for (const d of ed.details || []) {
      children.push(new Paragraph({
        numbering: { reference: "resume-bullets", level: 0 },
        spacing: { after: 30 },
        children: [new TextRun({ text: d, size: 21 })],
      }));
    }
  }
}

if (data.experience && data.experience.length) {
  children.push(sectionHeading("Professional Experience"));
  for (const job of data.experience) children.push(...experienceEntry(job));
}

if (data.skills && Object.keys(data.skills).length) {
  children.push(sectionHeading("Technical Competencies"));
  for (const [cat, items] of Object.entries(data.skills)) {
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: `${cat}: `, bold: true, size: 21 }),
        new TextRun({ text: items.join(", "), size: 21 }),
      ],
    }));
  }
}

if (data.certifications && data.certifications.length) {
  children.push(sectionHeading("Certifications & Professional Development"));
  for (const c of data.certifications) {
    children.push(new Paragraph({
      numbering: { reference: "resume-bullets", level: 0 },
      spacing: { after: 30 },
      children: [new TextRun({ text: c, size: 21 })],
    }));
  }
}

if (data.professional_affiliations && data.professional_affiliations.length) {
  children.push(sectionHeading("Professional Affiliations"));
  for (const a of data.professional_affiliations) {
    children.push(new Paragraph({
      numbering: { reference: "resume-bullets", level: 0 },
      spacing: { after: 30 },
      children: [new TextRun({ text: a, size: 21 })],
    }));
  }
}

const doc = new Document({
  styles: { default: { document: { run: { font: "Arial", size: 21 } } } },
  numbering: { config: [bulletList("resume-bullets")] },
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
