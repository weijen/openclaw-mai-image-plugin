const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildSharedKeyAuthHeader, buildBlobUrl } = require("../lib/blob");

describe("buildBlobUrl", () => {
  it("returns correct public URL", () => {
    const url = buildBlobUrl("myaccount", "images", "test.png");
    assert.equal(url, "https://myaccount.blob.core.windows.net/images/test.png");
  });

  it("handles special characters in blob name", () => {
    const url = buildBlobUrl("acct", "imgs", "2024-01-01-abc123.png");
    assert.equal(url, "https://acct.blob.core.windows.net/imgs/2024-01-01-abc123.png");
  });
});

describe("buildSharedKeyAuthHeader", () => {
  // Use a known test key (base64-encoded 32 bytes)
  const testKey = Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");

  it("returns SharedKey format", () => {
    const header = buildSharedKeyAuthHeader({
      accountName: "testaccount",
      accountKey: testKey,
      method: "PUT",
      contentLength: 1024,
      contentType: "image/png",
      blobType: "BlockBlob",
      date: "Sun, 01 Jan 2026 00:00:00 GMT",
      urlPath: "/images/test.png",
    });
    assert.ok(header.startsWith("SharedKey testaccount:"));
    // Signature should be base64
    const sig = header.split(":").slice(1).join(":");
    assert.ok(sig.length > 10);
  });

  it("produces different signatures for different blobs", () => {
    const common = {
      accountName: "testaccount",
      accountKey: testKey,
      method: "PUT",
      contentLength: 512,
      contentType: "image/png",
      blobType: "BlockBlob",
      date: "Sun, 01 Jan 2026 00:00:00 GMT",
    };
    const h1 = buildSharedKeyAuthHeader({ ...common, urlPath: "/images/a.png" });
    const h2 = buildSharedKeyAuthHeader({ ...common, urlPath: "/images/b.png" });
    assert.notEqual(h1, h2);
  });

  it("produces different signatures for different content lengths", () => {
    const common = {
      accountName: "testaccount",
      accountKey: testKey,
      method: "PUT",
      contentType: "image/png",
      blobType: "BlockBlob",
      date: "Sun, 01 Jan 2026 00:00:00 GMT",
      urlPath: "/images/test.png",
    };
    const h1 = buildSharedKeyAuthHeader({ ...common, contentLength: 100 });
    const h2 = buildSharedKeyAuthHeader({ ...common, contentLength: 200 });
    assert.notEqual(h1, h2);
  });
});
