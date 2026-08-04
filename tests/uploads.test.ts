import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateUploadBuffer, validateUploadFile } from "../src/lib/security/uploads";

function fakeFile(name: string, type: string, size = 1024): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("validateUploadFile", () => {
  it("accepts PDF with matching mime", () => {
    assert.equal(validateUploadFile(fakeFile("plan.pdf", "application/pdf")), null);
  });

  it("rejects empty files", () => {
    assert.match(validateUploadFile(fakeFile("plan.pdf", "application/pdf", 0)) || "", /Empty/);
  });

  it("rejects spoofed mime", () => {
    assert.match(validateUploadFile(fakeFile("plan.pdf", "text/html")) || "", /MIME/);
  });

  it("rejects octet-stream spoof", () => {
    assert.match(
      validateUploadFile(fakeFile("plan.pdf", "application/octet-stream")) || "",
      /MIME/
    );
  });

  it("rejects exe extension", () => {
    assert.match(validateUploadFile(fakeFile("x.exe", "application/pdf")) || "", /Unsupported/);
  });
});

describe("validateUploadBuffer", () => {
  it("accepts PDF magic", () => {
    const buf = Buffer.from("%PDF-1.7\n%EOF");
    assert.equal(validateUploadBuffer(buf, ".pdf"), null);
  });

  it("rejects non-PDF content with pdf ext", () => {
    const buf = Buffer.from("not a pdf");
    assert.match(validateUploadBuffer(buf, ".pdf") || "", /PDF/);
  });

  it("accepts PNG magic", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    assert.equal(validateUploadBuffer(buf, ".png"), null);
  });

  it("accepts JPEG magic", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
    assert.equal(validateUploadBuffer(buf, ".jpg"), null);
  });
});
