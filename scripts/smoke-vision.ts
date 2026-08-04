import { createCanvas } from "@napi-rs/canvas";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { rasterizeBlueprintFile } from "../src/lib/plans/rasterize";
import { runOcrOnImage } from "../src/lib/plans/ocr";

async function main() {
  const dir = path.join(process.cwd(), "uploads");
  await mkdir(dir, { recursive: true });
  const canvas = createCanvas(400, 120);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 400, 120);
  ctx.fillStyle = "#000000";
  ctx.font = "28px sans-serif";
  ctx.fillText("12 ft LIVING ROOM", 20, 70);
  const png = Buffer.from(await canvas.encode("png"));
  const name = "test-vision-sample.png";
  await writeFile(path.join(dir, name), png);
  const result = await rasterizeBlueprintFile({
    filename: name,
    mimeType: "image/png",
    blueprintId: "bp_test",
  });
  console.log("raster", result.width, result.height, result.png.length);
  const ocr = await runOcrOnImage(result.png);
  console.log("ocr", ocr.engine, ocr.text.slice(0, 100), ocr.dimensions);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
