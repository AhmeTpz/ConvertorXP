// ConvertorXP — Multi-Photo Collage Engine (v0.8.0)
// Calculates grid layouts, cell bounding boxes, rounded clipping paths, and renders photo collages.

export const COLLAGE_TEMPLATES = {
  "2-h": { id: "2-h", name: "2 Yan Yana (1×2)", count: 2, icon: "▥" },
  "2-v": { id: "2-v", name: "2 Alt Alta (2×1)", count: 2, icon: "日" },
  "3-split": {
    id: "3-split",
    name: "3 Fotoğraf (1 Büyük + 2 Küçük)",
    count: 3,
    icon: "◫",
  },
  "3-h": { id: "3-h", name: "3 Sütun (1×3)", count: 3, icon: "川" },
  "4-grid": { id: "4-grid", name: "4 Eşit Izgara (2×2)", count: 4, icon: "田" },
  "4-feature": {
    id: "4-feature",
    name: "4 Fotoğraf (1 Üst + 3 Alt)",
    count: 4,
    icon: "☲",
  },
  "6-grid": { id: "6-grid", name: "6 Fotoğraf (2×3)", count: 6, icon: "⚏" },
};

export function autoTemplateForCount(count) {
  if (count <= 2) return "2-h";
  if (count === 3) return "3-split";
  if (count === 4) return "4-grid";
  return "6-grid";
}

export function getCollageLayout({
  template = "4-grid",
  width = 1200,
  height = 1200,
  gap = 12,
  radius = 0,
}) {
  const outerPad = gap;
  const innerW = width - outerPad * 2;
  const innerH = height - outerPad * 2;
  const cells = [];

  switch (template) {
    case "2-h": {
      const cellW = (innerW - gap) / 2;
      cells.push(
        { x: outerPad, y: outerPad, width: cellW, height: innerH, radius },
        {
          x: outerPad + cellW + gap,
          y: outerPad,
          width: cellW,
          height: innerH,
          radius,
        },
      );
      break;
    }
    case "2-v": {
      const cellH = (innerH - gap) / 2;
      cells.push(
        { x: outerPad, y: outerPad, width: innerW, height: cellH, radius },
        {
          x: outerPad,
          y: outerPad + cellH + gap,
          width: innerW,
          height: cellH,
          radius,
        },
      );
      break;
    }
    case "3-split": {
      const leftW = (innerW - gap) * 0.55;
      const rightW = innerW - gap - leftW;
      const rightH = (innerH - gap) / 2;
      cells.push(
        { x: outerPad, y: outerPad, width: leftW, height: innerH, radius },
        {
          x: outerPad + leftW + gap,
          y: outerPad,
          width: rightW,
          height: rightH,
          radius,
        },
        {
          x: outerPad + leftW + gap,
          y: outerPad + rightH + gap,
          width: rightW,
          height: rightH,
          radius,
        },
      );
      break;
    }
    case "3-h": {
      const cellW = (innerW - gap * 2) / 3;
      for (let i = 0; i < 3; i++) {
        cells.push({
          x: outerPad + i * (cellW + gap),
          y: outerPad,
          width: cellW,
          height: innerH,
          radius,
        });
      }
      break;
    }
    case "4-grid": {
      const cellW = (innerW - gap) / 2;
      const cellH = (innerH - gap) / 2;
      cells.push(
        { x: outerPad, y: outerPad, width: cellW, height: cellH, radius },
        {
          x: outerPad + cellW + gap,
          y: outerPad,
          width: cellW,
          height: cellH,
          radius,
        },
        {
          x: outerPad,
          y: outerPad + cellH + gap,
          width: cellW,
          height: cellH,
          radius,
        },
        {
          x: outerPad + cellW + gap,
          y: outerPad + cellH + gap,
          width: cellW,
          height: cellH,
          radius,
        },
      );
      break;
    }
    case "4-feature": {
      const topH = (innerH - gap) * 0.6;
      const bottomH = innerH - gap - topH;
      const bottomW = (innerW - gap * 2) / 3;
      cells.push({
        x: outerPad,
        y: outerPad,
        width: innerW,
        height: topH,
        radius,
      });
      for (let i = 0; i < 3; i++) {
        cells.push({
          x: outerPad + i * (bottomW + gap),
          y: outerPad + topH + gap,
          width: bottomW,
          height: bottomH,
          radius,
        });
      }
      break;
    }
    case "6-grid":
    default: {
      const cols = 3;
      const rows = 2;
      const cellW = (innerW - gap * (cols - 1)) / cols;
      const cellH = (innerH - gap * (rows - 1)) / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          cells.push({
            x: outerPad + c * (cellW + gap),
            y: outerPad + r * (cellH + gap),
            width: cellW,
            height: cellH,
            radius,
          });
        }
      }
      break;
    }
  }

  return cells;
}

export function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (radius <= 0) {
    ctx.rect(x, y, width, height);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function drawCoverImage(ctx, img, x, y, width, height) {
  const imgRatio = img.width / img.height;
  const targetRatio = width / height;
  let sx, sy, sw, sh;

  if (imgRatio > targetRatio) {
    sh = img.height;
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = img.width / targetRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
}

export function renderCollageToCanvas({
  canvas,
  cells,
  images = [],
  background = "#ffffff",
}) {
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  cells.forEach((cell, i) => {
    const img = images[i % images.length];
    ctx.save();
    drawRoundedRect(ctx, cell.x, cell.y, cell.width, cell.height, cell.radius);
    ctx.clip();

    if (img && img.width && img.height) {
      drawCoverImage(ctx, img, cell.x, cell.y, cell.width, cell.height);
    } else {
      ctx.fillStyle = "#e0e0e0";
      ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
      ctx.fillStyle = "#999999";
      ctx.font = "bold 20px Tahoma, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `Fotoğraf ${i + 1}`,
        cell.x + cell.width / 2,
        cell.y + cell.height / 2,
      );
    }
    ctx.restore();
  });

  ctx.restore();
}
