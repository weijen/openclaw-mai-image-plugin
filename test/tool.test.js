const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { validateDimensions } = require("../lib/tool");

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
