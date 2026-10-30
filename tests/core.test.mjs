import test from "node:test";
import assert from "node:assert/strict";
import { checkSize, dimensions } from "../image-engine.js";
import { viewerType } from "../viewers.js";
test("crop must stay inside the source and use whole pixels", () => {
  assert.deepEqual(
    dimensions(640, 480, { kind: "crop", x: 10, y: 20, w: 200, h: 100 }),
    { width: 200, height: 100 },
  );
  for (const op of [
    { x: -1, y: 0, w: 20, h: 20 },
    { x: 639, y: 0, w: 2, h: 20 },
    { x: 0, y: 0, w: 0, h: 20 },
    { x: 0.5, y: 0, w: 20, h: 20 },
  ])
    assert.throws(() => dimensions(640, 480, { kind: "crop", ...op }));
});
test("quarter turns swap dimensions and resize enforces limits", () => {
  assert.deepEqual(dimensions(640, 480, { kind: "rotate" }), {
    width: 480,
    height: 640,
  });
  assert.deepEqual(dimensions(640, 480, { kind: "resize", w: 320, h: 240 }), {
    width: 320,
    height: 240,
  });
  assert.throws(() => checkSize(16001, 1));
  assert.throws(() => checkSize(6000, 5000));
  assert.throws(() => checkSize(NaN, 10));
  assert.throws(() => checkSize(0, 10));
});
test("active text is read as text, unknown files never pretend to be documents", () => {
  assert.equal(viewerType({ name: "test.HTML", type: "text/html" }), "text");
  assert.equal(
    viewerType({ name: "report.pdf", type: "application/pdf" }),
    "unsupported",
  );
  assert.equal(viewerType({ name: "song.mp3", type: "" }), "audio");
  assert.equal(viewerType({ name: "clip.webm", type: "video/webm" }), "video");
});
