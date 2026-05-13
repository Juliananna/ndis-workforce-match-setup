export function buildNdisCoCPdf(): string {
  const lines = [
    "%PDF-1.4",
    "1 0 obj",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "endobj",
    "2 0 obj",
    "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
    "endobj",
    "3 0 obj",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]",
    "   /Contents 5 0 R /Resources << /Font << /F1 6 0 R >> >> >>",
    "endobj",
    "4 0 obj",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]",
    "   /Contents 7 0 R /Resources << /Font << /F1 6 0 R >> >> >>",
    "endobj",
    "6 0 obj",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "endobj",
  ];

  const page1Content = buildPage1Stream();
  const page2Content = buildPage2Stream();

  lines.push("5 0 obj");
  lines.push(`<< /Length ${page1Content.length} >>`);
  lines.push("stream");
  lines.push(page1Content);
  lines.push("endstream");
  lines.push("endobj");

  lines.push("7 0 obj");
  lines.push(`<< /Length ${page2Content.length} >>`);
  lines.push("stream");
  lines.push(page2Content);
  lines.push("endstream");
  lines.push("endobj");

  lines.push("xref");
  lines.push("0 8");
  lines.push("0000000000 65535 f ");
  for (let i = 1; i <= 7; i++) {
    lines.push(`${String(i * 100).padStart(10, "0")} 00000 n `);
  }
  lines.push("trailer");
  lines.push("<< /Size 8 /Root 1 0 R >>");
  lines.push("startxref");
  lines.push("0");
  lines.push("%%EOF");

  const pdfText = lines.join("\n");
  return Buffer.from(pdfText).toString("base64");
}

function pdfText(x: number, y: number, size: number, text: string): string {
  const safe = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  return `BT /F1 ${size} Tf ${x} ${y} Td (${safe}) Tj ET`;
}

function buildPage1Stream(): string {
  const cmds: string[] = [];

  cmds.push(pdfText(50, 790, 16, "NDIS Code of Conduct"));
  cmds.push(pdfText(50, 765, 11, "Acknowledgement and Agreement"));
  cmds.push(pdfText(50, 740, 9, "National Disability Insurance Scheme Act 2013"));

  cmds.push(pdfText(50, 710, 11, "What is the NDIS Code of Conduct?"));
  const intro = [
    "The NDIS Code of Conduct promotes safe and ethical supports and services for",
    "people with disability. The Code requires workers and providers to:",
  ];
  intro.forEach((line, i) => cmds.push(pdfText(50, 690 - i * 14, 9, line)));

  const principles = [
    "1. Act with respect for individual rights to freedom of expression, self-determination",
    "   and decision-making in accordance with applicable laws and conventions.",
    "2. Respect the privacy of people with disability.",
    "3. Provide supports and services in a safe and competent manner with care and skill.",
    "4. Act with integrity, honesty and transparency.",
    "5. Promptly take steps to raise and act on concerns about matters that might have",
    "   an impact on the quality and safety of supports provided to people with disability.",
    "6. Take all reasonable steps to prevent and respond to all forms of violence,",
    "   exploitation, neglect and abuse of people with disability.",
    "7. Take all reasonable steps to prevent and respond to sexual misconduct.",
  ];
  principles.forEach((line, i) => cmds.push(pdfText(50, 650 - i * 16, 9, line)));

  cmds.push(pdfText(50, 490, 11, "Your Obligations"));
  const obligations = [
    "As an NDIS worker you must comply with the NDIS Code of Conduct. Failure to",
    "comply may result in a finding of non-compliance by the NDIS Quality and Safeguards",
    "Commission. The Commission can take regulatory action including banning orders.",
    "",
    "You must:",
    "  - Complete the NDIS Worker Orientation Module 'Quality, Safety and You'",
    "  - Report any concerns about the safety or quality of supports",
    "  - Maintain the skills and knowledge required to provide quality supports",
    "  - Follow your organisation's policies and procedures",
  ];
  obligations.forEach((line, i) => cmds.push(pdfText(50, 465 - i * 15, 9, line)));

  cmds.push(pdfText(50, 310, 11, "Reporting Obligations"));
  const reporting = [
    "You are required to report any reasonable belief that a person with disability has",
    "experienced or is at risk of experiencing abuse or neglect. This includes:",
    "  - Physical abuse or neglect",
    "  - Sexual abuse",
    "  - Psychological or emotional abuse",
    "  - Financial exploitation",
    "  - Unlawful physical or chemical restraint",
    "",
    "Reports should be made to the NDIS Quality and Safeguards Commission:",
    "  Phone: 1800 035 544",
    "  Web: www.ndiscommission.gov.au",
  ];
  reporting.forEach((line, i) => cmds.push(pdfText(50, 285 - i * 15, 9, line)));

  cmds.push(pdfText(50, 100, 9, "Page 1 of 2 - Please read Page 2 and sign below"));

  return cmds.join("\n");
}

function buildPage2Stream(): string {
  const cmds: string[] = [];

  cmds.push(pdfText(50, 790, 14, "NDIS Code of Conduct - Acknowledgement"));

  cmds.push(pdfText(50, 760, 11, "Worker Rights and Supports"));
  const rights = [
    "Workers have the right to:",
    "  - Work in a safe environment free from violence and harassment",
    "  - Raise concerns without fear of reprisal",
    "  - Access support from their employer if they experience issues",
    "  - Receive appropriate training to fulfil their role",
    "",
    "If you are experiencing workplace issues, you can contact:",
    "  - Your direct supervisor or HR team",
    "  - The Fair Work Ombudsman: 13 13 94",
    "  - The NDIS Quality and Safeguards Commission: 1800 035 544",
  ];
  rights.forEach((line, i) => cmds.push(pdfText(50, 735 - i * 15, 9, line)));

  cmds.push(pdfText(50, 565, 11, "Confidentiality"));
  const conf = [
    "You must maintain the confidentiality of all information relating to participants",
    "and their supports. This includes not sharing personal information without consent.",
    "Breaches of confidentiality may result in disciplinary action and may also",
    "constitute a breach of the Privacy Act 1988 (Cth).",
  ];
  conf.forEach((line, i) => cmds.push(pdfText(50, 545 - i * 15, 9, line)));

  cmds.push(pdfText(50, 475, 11, "Social Media and Technology"));
  const social = [
    "Workers must not:",
    "  - Post photos or information about participants on social media",
    "  - Contact participants via personal social media accounts without consent",
    "  - Use participant information for any purpose other than delivering supports",
  ];
  social.forEach((line, i) => cmds.push(pdfText(50, 455 - i * 15, 9, line)));

  cmds.push(pdfText(50, 375, 11, "Declaration and Signature"));
  const decl = [
    "I, the undersigned, confirm that:",
    "",
    "  1. I have read and understood the NDIS Code of Conduct.",
    "  2. I agree to comply with the Code in all my work as an NDIS support worker.",
    "  3. I understand the consequences of non-compliance.",
    "  4. I will report any concerns about the safety or quality of NDIS supports.",
    "  5. I will maintain the privacy and dignity of all participants I support.",
    "",
    "By signing below I acknowledge and accept these obligations.",
  ];
  decl.forEach((line, i) => cmds.push(pdfText(50, 355 - i * 15, 9, line)));

  cmds.push(pdfText(50, 205, 9, "Worker Signature:"));
  cmds.push(pdfText(50, 185, 9, "{{signature}}"));

  cmds.push(pdfText(300, 205, 9, "Date:"));
  cmds.push(pdfText(300, 185, 9, "{{date}}"));

  cmds.push(pdfText(50, 80, 8, "NDIS Quality and Safeguards Commission | www.ndiscommission.gov.au | 1800 035 544"));
  cmds.push(pdfText(50, 65, 8, "Page 2 of 2"));

  return cmds.join("\n");
}
