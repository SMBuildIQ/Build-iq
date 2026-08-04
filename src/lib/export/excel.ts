import ExcelJS from "exceljs";
import type { BidPackage, Estimate, MaterialItem, Project } from "@prisma/client";
import { lineExtendedCost } from "../estimate/calculator";
import { TRADE_ORDER } from "../materials/catalog";

type ExportPayload = {
  project: Project;
  materials: MaterialItem[];
  estimate: Estimate | null;
  bidPackages: BidPackage[];
};

function money(n: number) {
  return Math.round(n * 100) / 100;
}

export async function buildEstimateWorkbook(data: ExportPayload): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Fieldline";
  wb.created = new Date();

  const summary = wb.addWorksheet("Summary", {
    properties: { defaultColWidth: 22 },
  });

  summary.mergeCells("A1:B1");
  summary.getCell("A1").value = "Fieldline Cost Estimate";
  summary.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF1C2B24" } };

  summary.getCell("A3").value = "Project";
  summary.getCell("B3").value = data.project.name;
  summary.getCell("A4").value = "Address";
  summary.getCell("B4").value = [data.project.address, data.project.city, data.project.state, data.project.zip]
    .filter(Boolean)
    .join(", ");
  summary.getCell("A5").value = "Square Feet";
  summary.getCell("B5").value = data.project.squareFeet ?? "—";
  summary.getCell("A6").value = "Stories";
  summary.getCell("B6").value = data.project.stories;
  summary.getCell("A7").value = "Status";
  summary.getCell("B7").value = data.project.status;
  summary.getCell("A8").value = "Exported";
  summary.getCell("B8").value = new Date().toLocaleString();

  if (data.estimate) {
    const rows: [string, number][] = [
      ["Material Cost", data.estimate.materialCost],
      ["Waste Allowance", data.estimate.wasteCost],
      ["Labor Cost", data.estimate.laborCost],
      [`Contingency (${(data.estimate.contingencyPct * 100).toFixed(0)}%)`, data.estimate.contingencyCost],
      [`Overhead (${(data.estimate.overheadPct * 100).toFixed(0)}%)`, data.estimate.overheadCost],
      [`Profit (${(data.estimate.profitPct * 100).toFixed(0)}%)`, data.estimate.profitAmount],
      [`Tax (${(data.estimate.taxPct * 100).toFixed(1)}%)`, data.estimate.taxAmount],
      ["Grand Total", data.estimate.grandTotal],
    ];

    summary.getCell("A10").value = "Estimate Totals";
    summary.getCell("A10").font = { bold: true, size: 13 };

    rows.forEach(([label, value], i) => {
      const row = 11 + i;
      summary.getCell(`A${row}`).value = label;
      summary.getCell(`B${row}`).value = money(value);
      summary.getCell(`B${row}`).numFmt = '"$"#,##0.00';
      if (label === "Grand Total") {
        summary.getCell(`A${row}`).font = { bold: true };
        summary.getCell(`B${row}`).font = { bold: true };
      }
    });
  }

  const takeoff = wb.addWorksheet("Material Takeoff");
  takeoff.columns = [
    { header: "Trade", key: "trade", width: 16 },
    { header: "Category", key: "category", width: 14 },
    { header: "Material", key: "name", width: 32 },
    { header: "Description", key: "description", width: 28 },
    { header: "Qty", key: "quantity", width: 10 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Unit Cost", key: "unitCost", width: 12 },
    { header: "Waste %", key: "waste", width: 10 },
    { header: "Labor Hrs", key: "laborHours", width: 12 },
    { header: "Labor Rate", key: "laborRate", width: 12 },
    { header: "Extended", key: "extended", width: 14 },
    { header: "Spruce SKU", key: "spruceSku", width: 14 },
    { header: "Confidence", key: "confidence", width: 12 },
  ];

  styleHeader(takeoff);

  const sorted = [...data.materials].sort((a, b) => {
    const ai = TRADE_ORDER.indexOf(a.trade);
    const bi = TRADE_ORDER.indexOf(b.trade);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.name.localeCompare(b.name);
  });

  for (const m of sorted) {
    takeoff.addRow({
      trade: m.trade,
      category: m.category,
      name: m.name,
      description: m.description || "",
      quantity: m.quantity,
      unit: m.unit,
      unitCost: m.unitCost,
      waste: m.wasteFactor,
      laborHours: m.laborHours,
      laborRate: m.laborRate,
      extended: lineExtendedCost(m),
      spruceSku: m.spruceSku || "",
      confidence: m.confidence ?? "",
    });
  }

  takeoff.getColumn("unitCost").numFmt = '"$"#,##0.00';
  takeoff.getColumn("laborRate").numFmt = '"$"#,##0.00';
  takeoff.getColumn("extended").numFmt = '"$"#,##0.00';
  takeoff.getColumn("waste").numFmt = "0%";
  takeoff.getColumn("confidence").numFmt = "0%";

  // Per-trade sheets for bid packages
  const byTrade = new Map<string, MaterialItem[]>();
  for (const m of data.materials) {
    const list = byTrade.get(m.trade) || [];
    list.push(m);
    byTrade.set(m.trade, list);
  }

  for (const trade of TRADE_ORDER) {
    const items = byTrade.get(trade);
    if (!items?.length) continue;
    const pkg = data.bidPackages.find((b) => b.trade === trade);
    const sheet = wb.addWorksheet(sanitizeSheetName(`Bid - ${trade}`));
    sheet.getCell("A1").value = pkg?.title || `${trade} Bid Package`;
    sheet.getCell("A1").font = { bold: true, size: 14 };
    sheet.getCell("A2").value = pkg?.description || `Subcontractor scope for ${trade}`;
    sheet.getCell("A3").value = "Due";
    sheet.getCell("B3").value = pkg?.dueDate ? new Date(pkg.dueDate).toLocaleDateString() : "TBD";
    sheet.getCell("A4").value = "Status";
    sheet.getCell("B4").value = pkg?.status || "DRAFT";

    sheet.getRow(6).values = [
      "Material",
      "Qty",
      "Unit",
      "Unit Cost",
      "Labor Hrs",
      "Extended",
      "Spruce SKU",
    ];
    styleHeaderRow(sheet, 6);

    let row = 7;
    for (const m of items) {
      sheet.getRow(row).values = [
        m.name,
        m.quantity,
        m.unit,
        m.unitCost,
        m.laborHours,
        lineExtendedCost(m),
        m.spruceSku || "",
      ];
      sheet.getCell(`D${row}`).numFmt = '"$"#,##0.00';
      sheet.getCell(`F${row}`).numFmt = '"$"#,##0.00';
      row++;
    }
    sheet.getColumn(1).width = 34;
    sheet.getColumn(7).width = 14;
  }

  const spruce = wb.addWorksheet("Spruce SKUs");
  spruce.columns = [
    { header: "SKU", key: "sku", width: 16 },
    { header: "Material", key: "name", width: 32 },
    { header: "Qty", key: "quantity", width: 10 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Unit Price", key: "unitCost", width: 12 },
    { header: "Line Total", key: "total", width: 14 },
  ];
  styleHeader(spruce);
  for (const m of sorted) {
    if (!m.spruceSku) continue;
    spruce.addRow({
      sku: m.spruceSku,
      name: m.name,
      quantity: m.quantity,
      unit: m.unit,
      unitCost: m.unitCost,
      total: money(m.quantity * m.unitCost),
    });
  }
  spruce.getColumn("unitCost").numFmt = '"$"#,##0.00';
  spruce.getColumn("total").numFmt = '"$"#,##0.00';

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1C2B24" },
  };
}

function styleHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1C2B24" },
  };
}

function sanitizeSheetName(name: string) {
  return name.replace(/[\\/*?:\[\]]/g, "").slice(0, 31);
}
