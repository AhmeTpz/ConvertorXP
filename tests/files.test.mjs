import test from "node:test";
import assert from "node:assert/strict";
import {
  splitName,
  renamedName,
  copyName,
  detectImage,
} from "../file-utils.js";
import { cellsFrom } from "../desktop.js";
import { dict, t } from "../i18n.js";
test("rename keeps the extension and rejects ambiguous names", () => {
  assert.deepEqual(splitName("photo.final.png"), {
    stem: "photo.final",
    extension: ".png",
  });
  assert.equal(renamedName("photo.png", "new photo"), "new photo.png");
  for (const name of ["", "../photo", "a/b", "CON", "name."])
    assert.throws(() => renamedName("photo.png", name));
  assert.throws(() => renamedName("photo.png", "other", ["other.png"]));
  assert.equal(
    copyName("photo.png", ["photo - Kopya.png"]),
    "photo - Kopya (2).png",
  );
});
test("format detection uses signatures and preserves animated formats as preview only", () => {
  const bytes = (s) => new TextEncoder().encode(s);
  assert.equal(detectImage(bytes("BMxxxx")).type, "image/bmp");
  assert.equal(detectImage(bytes("GIF89a0000")).previewOnly, true);
  assert.equal(
    detectImage(Uint8Array.from([0, 0, 1, 0, 1, 0])).previewOnly,
    true,
  );
  const avif = Uint8Array.from([
    0,
    0,
    0,
    24,
    ...bytes("ftypavif"),
    0,
    0,
    0,
    0,
    ...bytes("avifavis"),
  ]);
  assert.equal(detectImage(avif).type, "image/avif");
  assert.equal(detectImage(avif).previewOnly, true);
  assert.equal(detectImage(bytes("not an image")), null);
});
test("PNG animation detection reads chunks rather than arbitrary payload strings", () => {
  const png = Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 4, 73, 68, 65, 84, 97, 99, 84, 76,
    0, 0, 0, 0,
  ]);
  assert.equal(detectImage(png).previewOnly, false);
  png.set([97, 99, 84, 76], 12);
  assert.equal(detectImage(png).previewOnly, true);
});
test("cellsFrom allocates consecutive free cells wrapping around cols", () => {
  const occupied = new Set(["1,1", "2,1"]);
  const allocated = cellsFrom({ x: 1, y: 1 }, 3, occupied, 3);
  assert.deepEqual(allocated, [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ]);
});
test("i18n dictionary symmetry and interpolation", () => {
  const trKeys = Object.keys(dict.tr).sort();
  const enKeys = Object.keys(dict.en).sort();
  assert.deepEqual(
    trKeys,
    enKeys,
    "tr and en dictionaries must have identical keys",
  );
  assert.equal(
    t("selection_count", { selected: 3, total: 10 }),
    "3 / 10 files selected",
  );
});
