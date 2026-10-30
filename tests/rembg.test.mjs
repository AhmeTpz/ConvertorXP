import test from "node:test";
import assert from "node:assert/strict";
import { removeColorBackground } from "../bg-remover.js";

test("Background Removal: Solid background turns transparent while center object stays opaque", () => {
  const W = 20;
  const H = 20;
  // Create 20x20 RGBA image (white background with black 6x6 square in center)
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = 255; // R
    data[i * 4 + 1] = 255; // G
    data[i * 4 + 2] = 255; // B
    data[i * 4 + 3] = 255; // A
  }

  // Draw 6x6 black square in center (7..12, 7..12)
  for (let y = 7; y <= 12; y++) {
    for (let x = 7; x <= 12; x++) {
      const idx = (y * W + x) * 4;
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = 255;
    }
  }

  const imgData = { width: W, height: H, data };
  removeColorBackground(imgData, { tolerance: 30, feather: 0 });

  // 1. Top-left corner must be completely transparent (alpha = 0)
  assert.equal(data[0 * 4 + 3], 0, "Corner pixel should have alpha = 0");
  assert.equal(data[(W - 1) * 4 + 3], 0, "Top-right pixel should have alpha = 0");
  assert.equal(
    data[((H - 1) * W + (W - 1)) * 4 + 3],
    0,
    "Bottom-right pixel should have alpha = 0",
  );

  // 2. Center square must remain completely opaque (alpha = 255)
  const centerIdx = (9 * W + 9) * 4;
  assert.equal(data[centerIdx], 0, "Center red channel is 0");
  assert.equal(data[centerIdx + 1], 0, "Center green channel is 0");
  assert.equal(data[centerIdx + 2], 0, "Center blue channel is 0");
  assert.equal(data[centerIdx + 3], 255, "Center square must remain opaque (alpha = 255)");
});

test("Background Removal: Enclosed inner holes are protected by flood-fill reachability", () => {
  const W = 30;
  const H = 30;
  // White background
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = 255;
    data[i * 4 + 1] = 255;
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }

  // Draw a solid black donut/ring: outer box 8..22, inner box 13..17 is white
  for (let y = 8; y <= 22; y++) {
    for (let x = 8; x <= 22; x++) {
      const idx = (y * W + x) * 4;
      // If outside the inner hole, make it black ring
      if (x < 13 || x > 17 || y < 13 || y > 17) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
      }
    }
  }

  const imgData = { width: W, height: H, data };
  removeColorBackground(imgData, { tolerance: 30, feather: 0 });

  // Outer corners: transparent
  assert.equal(data[0 * 4 + 3], 0, "Outer background is transparent");

  // Black ring: opaque
  assert.equal(data[(10 * W + 10) * 4 + 3], 255, "Ring pixel is opaque");

  // Enclosed inner white hole: MUST STAY OPAQUE because flood fill cannot cross the ring!
  const innerIdx = (15 * W + 15) * 4;
  assert.equal(data[innerIdx], 255, "Inner hole R=255");
  assert.equal(
    data[innerIdx + 3],
    255,
    "Enclosed inner hole must NOT be cleared by edge flood fill",
  );
});

test("Background Removal: Edge feathering produces smooth anti-aliased alpha falloff", () => {
  const W = 20;
  const H = 20;
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = 255;
    data[i * 4 + 1] = 255;
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }
  for (let y = 6; y <= 14; y++) {
    for (let x = 6; x <= 14; x++) {
      const idx = (y * W + x) * 4;
      data[idx] = 20;
      data[idx + 1] = 20;
      data[idx + 2] = 20;
    }
  }

  const imgData = { width: W, height: H, data };
  removeColorBackground(imgData, { tolerance: 35, feather: 2 });

  // Deep background: alpha = 0
  assert.equal(data[0 * 4 + 3], 0);

  // Deep center: alpha = 255
  assert.equal(data[(10 * W + 10) * 4 + 3], 255);

  // Near the boundary (x=5 or x=6), alpha should have intermediate values between 0 and 255
  const edgeAlpha = data[(10 * W + 6) * 4 + 3];
  assert.ok(
    edgeAlpha > 0 && edgeAlpha <= 255,
    `Edge alpha should be feathered, got: ${edgeAlpha}`,
  );
});
