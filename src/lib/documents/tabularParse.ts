import ExcelJS from "exceljs";

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
