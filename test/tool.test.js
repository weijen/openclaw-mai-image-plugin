const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { validateDimensions } = require("../lib/tool");
const { _internals } = require("../index.js");

describe("validateDimensions", () => {
  it("returns defaults for undefined inputs", () => {
    const { width, height } = validateDimensions(undefined, undefined);
    assert.equal(width, 1024);
    assert.equal(height, 1024);
  });

  it("clamps values below minimum to 768", () => {
    const { width, height } = validateDimensions(100, 200);
    assert.equal(width, 768);
    assert.equal(height, 768);
  });

  it("preserves valid dimensions", () => {
    const { width, height } = validateDimensions(1024, 1024);
    assert.equal(width, 1024);
    assert.equal(height, 1024);
  });

  it("scales down when total pixels exceed limit", () => {
    const { width, height } = validateDimensions(2048, 2048);
    assert.ok(width >= 768);
    assert.ok(height >= 768);
    assert.ok(width * height <= 1_048_576);
  });

  it("handles asymmetric dimensions within limit", () => {
    const { width, height } = validateDimensions(768, 1365);
    assert.ok(width * height <= 1_048_576);
    assert.ok(width >= 768);
    assert.ok(height >= 768);
  });
});

describe("normalizeOptionalValue", () => {
  it("treats deployment placeholders as disabled", () => {
    assert.equal(_internals.normalizeOptionalValue("__MEDIA_STORAGE_ACCOUNT__"), "");
    assert.equal(_internals.normalizeOptionalValue("<storage-account>"), "");
    assert.equal(_internals.normalizeOptionalValue("  "), "");
  });

  it("preserves real configured values", () => {
    assert.equal(_internals.normalizeOptionalValue("ocfamilymedia123"), "ocfamilymedia123");
  });
});

describe("buildResultContent", () => {
  it("includes URL when publicUrl is provided", () => {
    const content = _internals.buildResultContent({
      channel: "telegram",
      b64: "ZmFrZQ==",
      publicUrl: "https://example.com/image.png",
    });

    assert.deepEqual(content, [
      { type: "image", data: "ZmFrZQ==", mimeType: "image/png" },
      { type: "text", text: "Image URL: https://example.com/image.png" },
    ]);
  });

  it("omits URL text when publicUrl is empty", () => {
    const content = _internals.buildResultContent({
      channel: "line",
      b64: "ZmFrZQ==",
      publicUrl: "",
    });

    assert.deepEqual(content, [
      { type: "image", data: "ZmFrZQ==", mimeType: "image/png" },
    ]);
  });

  it("includes public URL text for non-telegram channels", () => {
    const content = _internals.buildResultContent({
      channel: "line",
      b64: "ZmFrZQ==",
      publicUrl: "https://example.com/image.png",
    });

    assert.equal(content[0].type, "image");
    assert.equal(content[1].type, "text");
    assert.match(content[1].text, /https:\/\/example.com\/image.png/);
  });
});
