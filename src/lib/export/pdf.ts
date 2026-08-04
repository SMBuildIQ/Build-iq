import PDFDocument from "pdfkit";
import type { BidPackage, Estimate, MaterialItem, Project, Company } from "@prisma/client";
import { lineExtendedCost } from "../estimate/calculator";
import { TRADE_ORDER } from "../materials/catalog";
import { LEGAL } from "../legal";

export type PdfExportPayload = {
  project: Project & { company?: Pick<Company, "name"> | null };
  materials: MaterialItem[];
  estimate: Estimate | null;
  bidPackages: BidPackage[];
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

/** Build a multi-page plan estimate / subtotal PDF. */
export async function buildEstimatePdf(data: PdfExportPayload): Promise<Buffer> {
  const sorted = [...data.materials].sort((a, b) => {
    const ai = TRADE_ORDER.indexOf(a.trade);
    const bi = TRADE_ORDER.indexOf(b.trade);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.name.localeCompare(b.name);
  });

  const tradeSubtotals = new Map<string, { extended: number; count: number }>();
  for (const m of sorted) {
    const prev = tradeSubtotals.get(m.trade) || { extended: 0, count: 0 };
    prev.extended += lineExtendedCost(m);
    prev.count += 1;
    tradeSubtotals.set(m.trade, prev);
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      bufferPages: true,
      margins: { top: 48, bottom: 56, left: 48, right: 48 },
      info: {
        Title: `${data.project.name} — Estimate Subtotals`,
        Author: `${LEGAL.productName} by ${LEGAL.entityName}`,
        Subject: "Residential construction estimate and material takeoff subtotals",
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
      if (doc.y + needed > bottomLimit()) {
        doc.addPage();
      }
    }

    // —— Header ——
    doc.rect(left, 36, pageWidth, 4).fill("#FF8833");

    doc
      .fontSize(20)
      .fillColor("#5D412D")
      .font("Helvetica-Bold")
      .text(LEGAL.productName, left, 52);

    doc
      .fontSize(9)
      .fillColor("#6B7280")
      .font("Helvetica")
      .text(`by ${LEGAL.entityName}`, left, doc.y + 2);

    doc
      .fontSize(14)
      .fillColor("#111827")
      .font("Helvetica-Bold")
      .text("Plan Estimate & Subtotals", left, 88);

    doc
      .fontSize(9)
      .fillColor("#6B7280")
      .font("Helvetica")
      .text(`Exported ${new Date().toLocaleString()}`, left, doc.y + 2);

    // —— Project block ——
    doc.moveDown(1.2);
    const companyName = data.project.company?.name;
    const address = [data.project.address, data.project.city, data.project.state, data.project.zip]
      .filter(Boolean)
      .join(", ");

    const meta: [string, string][] = [
      ["Project", data.project.name],
      ...(companyName ? ([["Builder", companyName]] as [string, string][]) : []),
      ["Address", address || "TBD"],
      ["Square feet", data.project.squareFeet != null ? data.project.squareFeet.toLocaleString() : "—"],
      ["Stories", String(data.project.stories)],
      ["Status", data.project.status],
      ["Materials", String(data.materials.length)],
    ];

    ensureSpace(meta.length * 16 + 24);
    doc.fontSize(11).fillColor("#111827").font("Helvetica-Bold").text("Project");
    doc.moveDown(0.3);

    for (const [label, value] of meta) {
      const y = doc.y;
      doc.fontSize(9).fillColor("#6B7280").font("Helvetica").text(label, left, y, { width: 110 });
      doc.fillColor("#111827").font("Helvetica").text(value, left + 120, y, { width: pageWidth - 120 });
      doc.y = Math.max(doc.y, y + 14);
    }

    // —— Estimate subtotals ——
    doc.moveDown(1);
    ensureSpace(200);
    doc.fontSize(11).fillColor("#111827").font("Helvetica-Bold").text("Estimate subtotals");
    doc.moveDown(0.4);

    if (!data.estimate) {
      doc
        .fontSize(9)
        .fillColor("#6B7280")
        .font("Helvetica")
        .text("No estimate yet. Upload plans and run AI bots to generate cost rollups.");
    } else {
      const e = data.estimate;
      const rows: [string, string, boolean?][] = [
        ["Material cost", money(e.materialCost)],
        ["Waste allowance", money(e.wasteCost)],
        ["Labor cost", money(e.laborCost)],
        [`Contingency (${pct(e.contingencyPct)})`, money(e.contingencyCost)],
        [`Overhead (${pct(e.overheadPct)})`, money(e.overheadCost)],
        [`Profit (${pct(e.profitPct)})`, money(e.profitAmount)],
        [`Tax (${pct(e.taxPct)})`, money(e.taxAmount)],
        ["Grand total", money(e.grandTotal), true],
      ];

      const tableTop = doc.y;
      doc.rect(left, tableTop, pageWidth, rows.length * 18 + 8).fill("#FAF7F2");
      doc.y = tableTop + 6;

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
      doc.y += 6;
    }

    // —— Trade subtotals ——
    if (tradeSubtotals.size > 0) {
      doc.moveDown(1);
      ensureSpace(80);
      doc.fontSize(11).fillColor("#111827").font("Helvetica-Bold").text("Subtotals by trade");
      doc.moveDown(0.35);

      const headerY = doc.y;
      doc.rect(left, headerY, pageWidth, 18).fill("#5D412D");
      doc
        .fontSize(8)
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text("Trade", left + 8, headerY + 5, { width: 160 });
      doc.text("Lines", left + 180, headerY + 5, { width: 60 });
      doc.text("Extended", left + 8, headerY + 5, {
        width: pageWidth - 16,
        align: "right",
      });
      doc.y = headerY + 22;

      const tradeOrder = [
        ...TRADE_ORDER.filter((t) => tradeSubtotals.has(t)),
        ...[...tradeSubtotals.keys()].filter((t) => !TRADE_ORDER.includes(t)),
      ];

      let alt = false;
      for (const trade of tradeOrder) {
        ensureSpace(18);
        const row = tradeSubtotals.get(trade)!;
        const y = doc.y;
        if (alt) {
          doc.rect(left, y - 2, pageWidth, 16).fill("#F3F4F6");
        }
        alt = !alt;
        doc
          .fontSize(9)
          .fillColor("#111827")
          .font("Helvetica")
          .text(trade, left + 8, y, { width: 160 });
        doc.text(String(row.count), left + 180, y, { width: 60 });
        doc.text(money(row.extended), left + 8, y, {
          width: pageWidth - 16,
          align: "right",
        });
        doc.y = y + 16;
      }
    }

    // —— Material takeoff lines ——
    if (sorted.length > 0) {
      doc.addPage();
      doc.fontSize(11).fillColor("#111827").font("Helvetica-Bold").text("Material takeoff");
      doc
        .fontSize(8)
        .fillColor("#6B7280")
        .font("Helvetica")
        .text("Quantities are draft AI takeoff — field-verify before ordering or awarding bids.");
      doc.moveDown(0.6);

      const nameW = 190;
      const qtyX = left + 195;
      const unitX = left + 245;
      const costX = left + 285;
      const extX = left + 355;

      function drawTakeoffHeader() {
        ensureSpace(24);
        const y = doc.y;
        doc.rect(left, y, pageWidth, 16).fill("#5D412D");
        doc.fontSize(7).fillColor("#FFFFFF").font("Helvetica-Bold");
        doc.text("Material", left + 4, y + 4, { width: nameW });
        doc.text("Qty", qtyX, y + 4, { width: 50 });
        doc.text("Unit", unitX, y + 4, { width: 40 });
        doc.text("Unit $", costX, y + 4, { width: 70, align: "right" });
        doc.text("Extended", extX, y + 4, {
          width: pageWidth - (extX - left) - 4,
          align: "right",
        });
        doc.y = y + 20;
      }

      let currentTrade = "";
      drawTakeoffHeader();

      for (const m of sorted) {
        if (m.trade !== currentTrade) {
          currentTrade = m.trade;
          ensureSpace(36);
          doc.fontSize(9).fillColor("#5D412D").font("Helvetica-Bold").text(currentTrade, left, doc.y);
          doc.moveDown(0.25);
        }

        if (doc.y > bottomLimit() - 28) {
          doc.addPage();
          drawTakeoffHeader();
        }

        const y = doc.y;
        const name = m.description ? `${m.name} — ${m.description}` : m.name;
        doc.fontSize(8).fillColor("#111827").font("Helvetica");
        doc.text(name, left + 4, y, {
          width: nameW - 4,
          ellipsis: true,
          lineBreak: false,
          height: 12,
        });
        doc.text(String(m.quantity), qtyX, y, { width: 50 });
        doc.text(m.unit, unitX, y, { width: 40 });
        doc.text(money(m.unitCost), costX, y, { width: 70, align: "right" });
        doc.text(money(lineExtendedCost(m)), extX, y, {
          width: pageWidth - (extX - left) - 4,
          align: "right",
        });
        doc.y = y + 14;
      }
    }

    // —— Bid packages summary ——
    if (data.bidPackages.length > 0) {
      ensureSpace(80);
      doc.moveDown(1);
      doc.fontSize(11).fillColor("#111827").font("Helvetica-Bold").text("Bid packages");
      doc.moveDown(0.3);
      for (const pkg of data.bidPackages) {
        ensureSpace(20);
        doc
          .fontSize(9)
          .fillColor("#111827")
          .font("Helvetica")
          .text(`${pkg.trade}: ${pkg.title} (${pkg.status})`, left, doc.y, { width: pageWidth });
        doc.moveDown(0.2);
      }
    }

    // —— Disclaimer ——
    ensureSpace(60);
    doc.moveDown(1.2);
    doc
      .fontSize(8)
      .fillColor("#6B7280")
      .font("Helvetica")
      .text(
        "Disclaimer: This PDF is a draft estimate generated from uploaded plans and AI/local takeoff. " +
          "It is not a formal bid, contract, or invoice. Always field-verify quantities and pricing before " +
          "ordering materials or awarding work. Questions: " +
          LEGAL.supportEmail,
        left,
        doc.y,
        { width: pageWidth, align: "left" }
      );

    // Footers / page numbers
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const footerY = doc.page.height - 36;
      doc.fontSize(8).fillColor("#6B7280").font("Helvetica");
      doc.text(
        `${LEGAL.productName} by ${LEGAL.entityName}`,
        left,
        footerY,
        { width: pageWidth * 0.65, lineBreak: false }
      );
      doc.text(`Page ${i + 1} of ${range.count}`, left, footerY, {
        width: pageWidth,
        align: "right",
        lineBreak: false,
      });
    }

    doc.end();
  });
}
