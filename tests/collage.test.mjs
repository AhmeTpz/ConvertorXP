import test from "node:test";
import assert from "node:assert/strict";
import {
  COLLAGE_TEMPLATES,
  autoTemplateForCount,
  getCollageLayout,
} from "../collage-engine.js";

test("Collage: Templates catalog contains valid definitions", () => {
  const ids = Object.keys(COLLAGE_TEMPLATES);
  assert.ok(ids.length >= 6, "Expected at least 6 collage templates");
  for (const id of ids) {
    const tpl = COLLAGE_TEMPLATES[id];
    assert.equal(tpl.id, id);
    assert.ok(tpl.name && tpl.name.length > 0);
    assert.ok(tpl.count >= 2);
    assert.ok(tpl.icon && tpl.icon.length > 0);
  }
});

test("Collage: autoTemplateForCount picks the most fitting layout", () => {
  assert.equal(autoTemplateForCount(2), "2-h");
  assert.equal(autoTemplateForCount(3), "3-split");
  assert.equal(autoTemplateForCount(4), "4-grid");
  assert.equal(autoTemplateForCount(5), "6-grid");
  assert.equal(autoTemplateForCount(6), "6-grid");
  assert.equal(autoTemplateForCount(1), "2-h");
});

test("Collage: getCollageLayout computes pixel-accurate bounding boxes within canvas", () => {
  const W = 800;
  const H = 600;
  const gap = 10;
  const radius = 6;

  for (const [id, tpl] of Object.entries(COLLAGE_TEMPLATES)) {
    const cells = getCollageLayout({
      template: id,
      width: W,
      height: H,
      gap,
      radius,
    });

    assert.equal(cells.length, tpl.count);

    for (const box of cells) {
      assert.ok(box.x >= gap, `Cell x=${box.x} should be >= gap=${gap}`);
      assert.ok(box.y >= gap, `Cell y=${box.y} should be >= gap=${gap}`);
      assert.ok(box.width > 0, `Cell width=${box.width} should be positive`);
      assert.ok(box.height > 0, `Cell height=${box.height} should be positive`);
      assert.ok(
        box.x + box.width <= W,
        `Cell right edge (${box.x + box.width}) must not exceed canvas width (${W})`,
      );
      assert.ok(
        box.y + box.height <= H,
        `Cell bottom edge (${box.y + box.height}) must not exceed canvas height (${H})`,
      );
    }
  }
});

test("Collage: 4-grid cells are symmetric with equal spacing", () => {
  const cells = getCollageLayout({
    template: "4-grid",
    width: 800,
    height: 800,
    gap: 20,
    radius: 0,
  });

  assert.equal(cells.length, 4);
  const [c0, c1, c2, c3] = cells;
  // All 4 cells should have equal width and height
  assert.equal(Math.round(c0.width), Math.round(c1.width));
  assert.equal(Math.round(c0.height), Math.round(c2.height));
  assert.equal(Math.round(c1.width), Math.round(c3.width));
  assert.equal(Math.round(c2.height), Math.round(c3.height));
});
