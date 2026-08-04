import PDFDocument from "pdfkit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { extractPdfText, rasterizeBlueprintFile } from "../src/lib/plans/rasterize";

async function main() {
  const dir = path.join(process.cwd(), "uploads");
  await mkdir(dir, { recursive: true });
  const doc = new PDFDocument({ size: "LETTER" });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((r) => doc.on("end", () => r()));
  doc.fontSize(18).text("FLOOR PLAN — 24 ft living");
  doc.text("Bedroom 12'-0\"");
  doc.end();
  await done;
  const buf = Buffer.concat(chunks);
  const name = "test-plan.pdf";
  await writeFile(path.join(dir, name), buf);
  const text = await extractPdfText(buf);
  console.log("pdf text", text.text.slice(0, 120), "pages", text.pageCount);
  const raster = await rasterizeBlueprintFile({
    filename: name,
    mimeType: "application/pdf",
    blueprintId: "bp_pdf",
  });
  console.log("pdf raster", raster.width, raster.height, raster.png.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
