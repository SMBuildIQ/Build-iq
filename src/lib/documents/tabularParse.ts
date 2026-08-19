import ExcelJS from "exceljs";
import * as XLSX from "@e965/xlsx";

// Shared, business-logic-free grid parsing used by both quote and invoice
// document extraction (src/lib/ai/*DocumentExtraction.ts) — turning CSV text
// or an .xlsx workbook into rows of string cells is identical work in both
// domains; only the column semantics that follow differ per document type.

export function parseCsvRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((line) => line.split(",").map((c) => c.trim()));
}

function excelCellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text; // hyperlink
    if ("result" in value) return excelCellText((value as { result: ExcelJS.CellValue }).result); // formula
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("");
    }
    if (value instanceof Date) return value.toISOString();
  }
  return String(value).trim();
}

/** Uses the first worksheet only. Returns an empty grid for a malformed/non-workbook buffer rather than throwing. */
export async function parseXlsxRows(bytes: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  } catch {
    return [];
  }
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: string[][] = [];
  worksheet.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(excelCellText(cell.value));
    });
    rows.push(cells);
  });
  return rows;
}

/**
 * Legacy binary .xls (pre-2007 BIFF format) — exceljs above only reads the
 * OOXML .xlsx format, a completely different binary layout, so a dedicated
 * parser is needed. @e965/xlsx is a maintained, security-patched continuation
 * of the SheetJS project published to npm under this scoped name (upstream
 * SheetJS stopped publishing new versions to the bare `xlsx` package on npm,
 * which is stuck on 0.18.5 and carries unpatched prototype-pollution/ReDoS
 * advisories — deliberately not used here for that reason). First worksheet
 * only, same as parseXlsxRows; returns an empty grid rather than throwing for
 * a malformed/non-workbook buffer.
 */
export function parseXlsRows(bytes: Buffer): string[][] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { type: "buffer" });
  } catch {
    return [];
  }
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const worksheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false });
  return rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : String(cell).trim())));
}
