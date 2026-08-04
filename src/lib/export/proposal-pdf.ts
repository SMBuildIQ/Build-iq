import PDFDocument from "pdfkit";
import type {
  Company,
  Customer,
  Project,
  Proposal,
  ProposalAcceptance,
  ProposalLine,
  ProposalSection,
} from "@prisma/client";
import { LEGAL } from "@/lib/legal";
import { PROPOSAL_CATEGORIES } from "@/lib/proposals/categories";

export type ProposalPdfData = Proposal & {
  company: Pick<Company, "id" | "name" | "phone" | "city" | "state">;
  customer: Customer | null;
  project: Pick<Project, "id" | "name" | "status" | "address" | "city" | "state" | "zip"> | null;
  acceptance: ProposalAcceptance | null;
  sections: (ProposalSection & { lines: ProposalLine[] })[];
};

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.round(n * 100) / 100);
}

function pct(n: number) {
  const v = n * 100;
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}%`;
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Polished multi-category customer proposal PDF (Supply Monkey branded). */
export async function buildProposalPdf(data: ProposalPdfData): Promise<Buffer> {
  const sections = [...data.sections].sort((a, b) => {
    const ai = PROPOSAL_CATEGORIES.indexOf(a.category as (typeof PROPOSAL_CATEGORIES)[number]);
    const bi = PROPOSAL_CATEGORIES.indexOf(b.category as (typeof PROPOSAL_CATEGORIES)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.sortOrder - b.sortOrder;
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      bufferPages: true,
      margins: { top: 52, bottom: 60, left: 48, right: 48 },
      info: {
        Title: `${data.number} — ${data.title}`,
        Author: `${LEGAL.productName} by ${LEGAL.entityName}`,
        Subject: "Material proposal",
        Creator: LEGAL.productName,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const right = left + pageWidth;
    const bottomLimit = () => doc.page.height - doc.page.margins.bottom;

    function ensureSpace(needed: number) {
      if (doc.y + needed > bottomLimit()) doc.addPage();
    }

    // —— Cover band ——
    doc.rect(0, 0, doc.page.width, 110).fill("#1A1B1F");
    doc.rect(0, 110, doc.page.width, 6).fill("#FF8833");

    doc
      .fontSize(22)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text(LEGAL.productName, left, 36, { continued: false });
    doc
      .fontSize(9)
      .fillColor("#FF8833")
      .font("Helvetica")
      .text(`by ${LEGAL.entityName}`, left, 62);
    doc
      .fontSize(8)
      .fillColor("#D1D5DB")
      .text(LEGAL.addressOneLine, left, 78, { width: pageWidth * 0.62 });

    doc
      .fontSize(10)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text(data.number, left, 40, { width: pageWidth, align: "right" });
    doc
      .fontSize(8)
      .fillColor("#D1D5DB")
      .font("Helvetica")
      .text(data.status, left, 56, { width: pageWidth, align: "right" });
    doc.text(`Version ${data.version}`, left, 70, { width: pageWidth, align: "right" });

    doc.y = 132;

    doc
      .fontSize(18)
      .fillColor("#5D412D")
      .font("Helvetica-Bold")
      .text(data.title, left, doc.y, { width: pageWidth });

    doc.moveDown(0.4);
    doc
      .fontSize(9)
      .fillColor("#605E5C")
      .font("Helvetica")
      .text(`Prepared ${formatDate(data.createdAt)} · Valid through ${formatDate(data.validUntil)}`, {
        width: pageWidth,
      });

    // —— Parties ——
    doc.moveDown(1);
    ensureSpace(100);
    const colW = (pageWidth - 16) / 2;
    const partiesY = doc.y;

    doc.rect(left, partiesY, colW, 78).fill("#F5F5F5");
    doc.rect(left + colW + 16, partiesY, colW, 78).fill("#F5F5F5");

    doc
      .fontSize(8)
      .fillColor("#FF8833")
      .font("Helvetica-Bold")
      .text("PREPARED FOR", left + 10, partiesY + 10);
    doc
      .fontSize(11)
      .fillColor("#5D412D")
      .font("Helvetica-Bold")
      .text(data.customerName || data.customer?.name || data.company.name, left + 10, partiesY + 24, {
        width: colW - 20,
      });
    const forLines = [
      data.customerEmail || data.customer?.email,
      data.projectAddress,
      data.project ? `Job: ${data.project.name}` : null,
    ].filter(Boolean) as string[];
    doc.fontSize(8).fillColor("#605E5C").font("Helvetica");
    let fy = partiesY + 42;
    for (const line of forLines) {
      doc.text(line, left + 10, fy, { width: colW - 20 });
      fy += 11;
    }

    const prepX = left + colW + 16;
    doc
      .fontSize(8)
      .fillColor("#FF8833")
      .font("Helvetica-Bold")
      .text("PREPARED BY", prepX + 10, partiesY + 10);
    doc
      .fontSize(11)
      .fillColor("#5D412D")
      .font("Helvetica-Bold")
      .text(LEGAL.entityName, prepX + 10, partiesY + 24, { width: colW - 20 });
    doc
      .fontSize(8)
      .fillColor("#605E5C")
      .font("Helvetica")
      .text(LEGAL.supportEmail, prepX + 10, partiesY + 42, { width: colW - 20 });
    doc.text(LEGAL.addressOneLine, prepX + 10, partiesY + 54, { width: colW - 20 });

    doc.y = partiesY + 94;

    // —— Intro ——
    if (data.intro) {
      ensureSpace(60);
      doc.fontSize(11).fillColor("#5D412D").font("Helvetica-Bold").text("Introduction");
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("#3D2A1D").font("Helvetica").text(data.intro, { width: pageWidth, align: "left" });
      doc.moveDown(0.8);
    }

    if (data.scopeNotes) {
      ensureSpace(50);
      doc.fontSize(11).fillColor("#5D412D").font("Helvetica-Bold").text("Scope");
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("#3D2A1D").font("Helvetica").text(data.scopeNotes, { width: pageWidth });
      doc.moveDown(0.8);
    }

    // —— Category summary ——
    ensureSpace(40 + sections.length * 18);
    doc.fontSize(11).fillColor("#5D412D").font("Helvetica-Bold").text("Category summary");
    doc.moveDown(0.35);

    const sumHeader = doc.y;
    doc.rect(left, sumHeader, pageWidth, 18).fill("#5D412D");
    doc.fontSize(8).fillColor("#FFFFFF").font("Helvetica-Bold");
    doc.text("Category", left + 8, sumHeader + 5, { width: 160 });
    doc.text("Lines", left + 200, sumHeader + 5, { width: 50 });
    doc.text("Subtotal", left + 8, sumHeader + 5, { width: pageWidth - 16, align: "right" });
    doc.y = sumHeader + 22;

    let alt = false;
    for (const s of sections) {
      ensureSpace(16);
      const y = doc.y;
      if (alt) doc.rect(left, y - 2, pageWidth, 16).fill("#F0EBE6");
      alt = !alt;
      doc.fontSize(9).fillColor("#111827").font("Helvetica").text(s.category, left + 8, y, { width: 160 });
      doc.text(String(s.lines.length), left + 200, y, { width: 50 });
      doc.text(money(s.subtotal), left + 8, y, { width: pageWidth - 16, align: "right" });
      doc.y = y + 16;
    }

    // —— Investment ——
    doc.moveDown(1);
    ensureSpace(160);
    doc.fontSize(11).fillColor("#5D412D").font("Helvetica-Bold").text("Investment summary");
    doc.moveDown(0.35);

    const rows: [string, string, boolean?][] = [
      ["Materials", money(data.materialSubtotal)],
      ["Waste allowance", money(data.wasteSubtotal)],
      ["Labor (if included)", money(data.laborSubtotal)],
      ["Contingency", money(data.contingencyAmount)],
      ["Overhead", money(data.overheadAmount)],
      ["Profit", money(data.profitAmount)],
      ["Tax", money(data.taxAmount)],
      ["Proposal total", money(data.grandTotal), true],
      [`Deposit due (${pct(data.depositPct)})`, money(data.depositAmount), true],
    ];

    const boxTop = doc.y;
    doc.rect(left, boxTop, pageWidth, rows.length * 18 + 10).fill("#FAF7F2");
    doc.y = boxTop + 6;
    for (const [label, value, bold] of rows) {
      const y = doc.y;
      if (bold) {
        doc
          .moveTo(left + 10, y - 2)
          .lineTo(right - 10, y - 2)
          .strokeColor("#D1D5DB")
          .lineWidth(0.5)
          .stroke();
      }
      doc
        .fontSize(bold ? 10 : 9)
        .fillColor("#111827")
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .text(label, left + 10, y, { width: pageWidth * 0.55 });
      doc.text(value, left + 10, y, { width: pageWidth - 20, align: "right" });
      doc.y = y + 18;
    }

    // —— Detail by category ——
    for (const section of sections) {
      doc.addPage();
      doc.rect(left, doc.y, 4, 22).fill("#FF8833");
      doc
        .fontSize(14)
        .fillColor("#5D412D")
        .font("Helvetica-Bold")
        .text(section.title, left + 12, doc.y);
      doc.moveDown(0.2);
      if (section.notes) {
        doc.fontSize(8).fillColor("#605E5C").font("Helvetica").text(section.notes, { width: pageWidth });
      }
      doc.moveDown(0.5);

      const nameW = 200;
      const qtyX = left + 210;
      const unitX = left + 260;
      const priceX = left + 300;
      const extX = left + 380;

      function drawLineHeader() {
        ensureSpace(22);
        const y = doc.y;
        doc.rect(left, y, pageWidth, 16).fill("#5D412D");
        doc.fontSize(7).fillColor("#FFFFFF").font("Helvetica-Bold");
        doc.text("Item", left + 4, y + 4, { width: nameW });
        doc.text("Qty", qtyX, y + 4, { width: 45 });
        doc.text("Unit", unitX, y + 4, { width: 40 });
        doc.text("Unit $", priceX, y + 4, { width: 70, align: "right" });
        doc.text("Extended", extX, y + 4, {
          width: pageWidth - (extX - left) - 4,
          align: "right",
        });
        doc.y = y + 20;
      }

      drawLineHeader();
      for (const line of section.lines) {
        if (doc.y > bottomLimit() - 28) {
          doc.addPage();
          drawLineHeader();
        }
        const y = doc.y;
        const label = line.description ? `${line.name} — ${line.description}` : line.name;
        doc.fontSize(8).fillColor("#111827").font("Helvetica");
        doc.text(label, left + 4, y, {
          width: nameW - 4,
          ellipsis: true,
          lineBreak: false,
          height: 12,
        });
        doc.text(String(line.quantity), qtyX, y, { width: 45 });
        doc.text(line.unit, unitX, y, { width: 40 });
        doc.text(money(line.unitPrice), priceX, y, { width: 70, align: "right" });
        doc.text(money(line.lineTotal), extX, y, {
          width: pageWidth - (extX - left) - 4,
          align: "right",
        });
        doc.y = y + 14;
      }

      ensureSpace(24);
      doc.moveDown(0.4);
      doc
        .fontSize(10)
        .fillColor("#5D412D")
        .font("Helvetica-Bold")
        .text(`${section.category} subtotal  ${money(section.subtotal)}`, left, doc.y, {
          width: pageWidth,
          align: "right",
        });
    }

    // —— Exclusions & terms ——
    doc.addPage();
    doc.fontSize(14).fillColor("#5D412D").font("Helvetica-Bold").text("Exclusions");
    doc.moveDown(0.4);
    if (data.exclusions) {
      for (const line of data.exclusions.split("\n").filter(Boolean)) {
        ensureSpace(16);
        doc.fontSize(9).fillColor("#3D2A1D").font("Helvetica").text(`•  ${line}`, { width: pageWidth });
        doc.moveDown(0.15);
      }
    }

    doc.moveDown(1);
    ensureSpace(40);
    doc.fontSize(14).fillColor("#5D412D").font("Helvetica-Bold").text("Commercial terms");
    doc.moveDown(0.4);
    if (data.terms) {
      for (const line of data.terms.split("\n").filter(Boolean)) {
        ensureSpace(16);
        doc.fontSize(9).fillColor("#3D2A1D").font("Helvetica").text(`•  ${line}`, { width: pageWidth });
        doc.moveDown(0.15);
      }
    }

    if (data.acceptance) {
      doc.moveDown(1.2);
      ensureSpace(60);
      doc.fontSize(11).fillColor("#5D412D").font("Helvetica-Bold").text("Acceptance record");
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .fillColor("#3D2A1D")
        .font("Helvetica")
        .text(
          `${data.acceptance.decision} by ${data.acceptance.signerName}` +
            (data.acceptance.signerEmail ? ` <${data.acceptance.signerEmail}>` : "") +
            ` on ${formatDate(data.acceptance.createdAt)}`,
          { width: pageWidth }
        );
    } else {
      doc.moveDown(1.2);
      ensureSpace(80);
      doc.fontSize(11).fillColor("#5D412D").font("Helvetica-Bold").text("Acceptance");
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .fillColor("#3D2A1D")
        .font("Helvetica")
        .text(
          "To accept this proposal, open the secure customer link provided by Supply Monkey and confirm " +
            `the deposit of ${money(data.depositAmount)}. Electronic acceptance constitutes agreement to the terms above.`,
          { width: pageWidth }
        );
    }

    doc.moveDown(1.5);
    ensureSpace(40);
    doc
      .fontSize(8)
      .fillColor("#605E5C")
      .font("Helvetica")
      .text(
        "This document is a formal material proposal generated in BuildIQ. Field-verify takeoff quantities " +
          `before fabrication. Support: ${LEGAL.supportEmail}`,
        { width: pageWidth }
      );

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const footerY = doc.page.height - 40;
      doc.fontSize(8).fillColor("#605E5C").font("Helvetica");
      doc.text(`${data.number} · ${LEGAL.productName}`, left, footerY, {
        width: pageWidth * 0.65,
        lineBreak: false,
      });
      doc.text(`Page ${i + 1} of ${range.count}`, left, footerY, {
        width: pageWidth,
        align: "right",
        lineBreak: false,
      });
    }

    doc.end();
  });
}
