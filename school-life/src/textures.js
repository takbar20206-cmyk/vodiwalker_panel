/* ============================================================
   School Life: Open Campus — textures.js
   کتابخانه تکسچرهای procedural باکیفیت (بدون هیچ فایل خارجی)
   همه تکسچرها در زمان اجرا با Canvas 2D ساخته می‌شوند.
   ============================================================ */
import * as THREE from 'three';
import { canvasTexture } from './gfx.js';

/* ---------- ابزارهای نقاشی ---------- */
function speckle(ctx, w, h, colors, n, size = 2, alpha = 0.35) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * (0.5 + Math.random() * 0.9);
    ctx.fillStyle = colors[i % colors.length];
    const s = size * (0.6 + Math.random() * 0.9);
    ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
  ctx.globalAlpha = 1;
}

function noiseLines(ctx, w, h, color, count, alpha = 0.16) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    const y = Math.random() * h;
    ctx.moveTo(0, y);
    let x = 0;
    while (x < w) {
      const seg = 8 + Math.random() * 22;
      ctx.lineTo(x + seg, y + (Math.random() - 0.5) * 6);
      x += seg;
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ---------- تکسچرها ---------- */
function texBrick(base, mortar, rows = 8) {
  return (ctx, w, h) => {
    ctx.fillStyle = mortar; ctx.fillRect(0, 0, w, h);
    const bh = h / rows, bw = w / (rows / 2);
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (bw / 2);
      for (let c = -1; c < (rows / 2) + 1; c++) {
        const x = c * bw + off + 2, y = r * bh + 2;
        const shade = -10 + Math.random() * 22;
        ctx.fillStyle = shadeHex(base, shade);
        ctx.fillRect(x, y, bw - 4, bh - 4);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x, y, bw - 4, 2);
        ctx.globalAlpha = 1;
      }
    }
    speckle(ctx, w, h, ['#00000022', '#ffffff18'], 400, 2, 0.5);
  };
}

function shadeHex(hex, delta) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, r + delta));
  g = Math.max(0, Math.min(255, g + delta));
  b = Math.max(0, Math.min(255, b + delta));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function texPlanks(base, dark, vertical = false) {
  return (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const n = 8;
    const size = vertical ? w / n : h / n;
    for (let i = 0; i < n; i++) {
      const shade = -8 + Math.random() * 16;
      ctx.fillStyle = shadeHex(base, shade);
      if (vertical) ctx.fillRect(i * size + 1, 0, size - 2, h);
      else ctx.fillRect(0, i * size + 1, w, size - 2);
      ctx.fillStyle = dark;
      ctx.globalAlpha = 0.5;
      for (let k = 0; k < 6; k++) {
        if (vertical) ctx.fillRect(i * size + 3 + Math.random() * (size - 6), Math.random() * h, 1, 12 + Math.random() * 40);
        else ctx.fillRect(Math.random() * w, i * size + 3 + Math.random() * (size - 6), 12 + Math.random() * 40, 1);
      }
      ctx.globalAlpha = 1;
    }
    noiseLines(ctx, w, h, dark, 40, 0.12);
  };
}

function texTiles(base, grout, n = 8, glossy = true) {
  return (ctx, w, h) => {
    ctx.fillStyle = grout; ctx.fillRect(0, 0, w, h);
    const s = w / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const shade = -6 + Math.random() * 14;
        ctx.fillStyle = shadeHex(base, shade);
        ctx.fillRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
        if (glossy) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#ffffff';
          const grad = ctx.createLinearGradient ? ctx.createLinearGradient(i * s, j * s, i * s + s, j * s + s) : null;
          if (grad && grad.addColorStop) {
            grad.addColorStop(0, 'rgba(255,255,255,0.5)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
          }
          ctx.fillRect(i * s + 2, j * s + 2, s - 4, (s - 4) * 0.45);
          ctx.globalAlpha = 1;
        }
      }
    }
  };
}

function texWater(base, light) {
  return (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = light;
      ctx.globalAlpha = 0.08 + Math.random() * 0.14;
      ctx.lineWidth = 1 + Math.random() * 3;
      ctx.beginPath();
      const y = Math.random() * h;
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) {
        ctx.lineTo(x, y + Math.sin((x / w) * Math.PI * 4 + i) * 5);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 6, 1);
    }
  };
}

function texWindows(base, trim, cols = 4, rows = 4) {
  return (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw + cw * 0.18, y = r * ch + ch * 0.16;
        const ww = cw * 0.64, hh = ch * 0.6;
        ctx.fillStyle = trim; ctx.fillRect(x - 4, y - 4, ww + 8, hh + 8);
        const g = ctx.createLinearGradient ? ctx.createLinearGradient(x, y, x + ww, y + hh) : null;
        if (g && g.addColorStop) {
          g.addColorStop(0, '#cfe8f5');
          g.addColorStop(0.45, '#7fb3d0');
          g.addColorStop(1, '#5d87a8');
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = '#9fc3d8';
        }
        ctx.fillRect(x, y, ww, hh);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x, y, ww, hh * 0.3);
        ctx.strokeStyle = trim; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + ww / 2, y); ctx.lineTo(x + ww / 2, y + hh); ctx.stroke();
        // پاسیو
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#3d5a70';
        ctx.fillRect(x + 3, y + hh - hh * 0.25, ww - 6, hh * 0.18);
        ctx.globalAlpha = 1;
      }
    }
    speckle(ctx, w, h, ['#00000018'], 200, 2, 0.4);
  };
}

function texShopFront(base, stripe) {
  return (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    // راه‌راه سایه‌بان
    const sh = h * 0.28;
    for (let x = 0; x < w; x += 24) {
      ctx.fillStyle = stripe;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 12, 0); ctx.lineTo(x + 12, sh); ctx.lineTo(x + 24, sh);
      ctx.lineTo(x + 24, 0); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f7f7f2';
      ctx.beginPath();
      ctx.moveTo(x + 12, 0); ctx.lineTo(x + 24, 0); ctx.lineTo(x + 24, sh); ctx.lineTo(x + 12, sh);
      ctx.closePath(); ctx.fill();
    }
    // ویترین‌ها
    const gy = sh + 12, gh = h - gy - 14;
    for (let i = 0; i < 3; i++) {
      const x = 12 + i * ((w - 24) / 3);
      const ww = (w - 24) / 3 - 14;
      ctx.fillStyle = '#4c3a2a';
      ctx.fillRect(x - 3, gy - 3, ww + 6, gh + 6);
      const g = ctx.createLinearGradient ? ctx.createLinearGradient(x, gy, x, gy + gh) : null;
      if (g && g.addColorStop) {
        g.addColorStop(0, '#ffe9b8');
        g.addColorStop(1, '#b9d5e8');
        ctx.fillStyle = g;
      } else ctx.fillStyle = '#d8e6f0';
      ctx.fillRect(x, gy, ww, gh);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(x, gy + gh); ctx.lineTo(x + ww * 0.4, gy); ctx.lineTo(x + ww * 0.65, gy); ctx.lineTo(x + ww * 0.2, gy + gh);
      ctx.closePath(); ctx.fill();
    }
  };
}

function texCourt(base, line) {
  return (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#00000022', '#ffffff22'], 900, 2, 0.35);
    ctx.strokeStyle = line; ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.beginPath(); ctx.moveTo(w / 2, 12); ctx.lineTo(w / 2, h - 12); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.16, 0, 7); ctx.stroke();
  };
}

function texChalkboard() {
  return (ctx, w, h) => {
    ctx.fillStyle = '#2b4a38'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#ffffff14', '#00000022'], 700, 3, 0.3);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    // فرمول‌های تزئینی
    ctx.beginPath(); ctx.moveTo(30, 40); ctx.lineTo(140, 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 66); ctx.lineTo(110, 66); ctx.stroke();
    ctx.beginPath(); ctx.arc(190, 55, 22, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(230, 34); ctx.lineTo(300, 34); ctx.lineTo(265, 86); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(330, 40); ctx.lineTo(420, 40); ctx.moveTo(330, 66); ctx.lineTo(400, 66); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(24, h - 22, 180, 4);
  };
}

function texGraffiti(base, colors) {
  return (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#00000018', '#ffffff10'], 500, 3, 0.4);
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 6 + Math.random() * 12;
      ctx.beginPath();
      const x0 = Math.random() * w, y0 = Math.random() * h;
      ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(x0 + 40, y0 - 30, x0 + 70, y0 + 40, x0 + 120, y0 + 5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
}

function texTire() {
  return (ctx, w, h) => {
    ctx.fillStyle = '#1d1f24'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = i % 2 ? '#26282e' : '#15171b';
      const y = (i / 22) * h;
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y + 6); ctx.lineTo(w, y + 14); ctx.lineTo(0, y + 8);
      ctx.closePath(); ctx.fill();
    }
    speckle(ctx, w, h, ['#3a3d44'], 300, 2, 0.5);
  };
}

export function makeTextureSet() {
  const T = {};
  // زمین و فضاهای سبز
  T.grass = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6aa84f'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#5c9440', '#79b85c', '#639f47', '#86c46a'], 2600, 3, 0.5);
    for (let i = 0; i < 500; i++) {
      ctx.strokeStyle = i % 2 ? '#4f8536' : '#8ccf6f';
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      const x = Math.random() * w, y = Math.random() * h;
      ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 4, y - 4 - Math.random() * 5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, { repeat: [64, 64] });

  T.grassDry = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#a8a352'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#968f45', '#b8b464', '#8d8a3f'], 2200, 3, 0.5);
  }, { repeat: [40, 40] });

  T.snow = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f2f6fb'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#e2e9f3', '#ffffff', '#d6e0ee'], 1800, 3, 0.6);
  }, { repeat: [44, 44] });

  // سنگفرش‌ها
  T.pave = canvasTexture(256, 256, texTiles('#c3bcae', '#a79f92', 6, false), { repeat: [16, 16] });
  T.paveBig = canvasTexture(256, 256, texTiles('#b9b2a4', '#9c9487', 4, false), { repeat: [10, 10] });
  T.sidewalk = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#bdb6a8'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#9a9285'; ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(0, (i * h) / 4); ctx.lineTo(w, (i * h) / 4); ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo((i * w) / 4, 0); ctx.lineTo((i * w) / 4, h); ctx.stroke();
    }
    speckle(ctx, w, h, ['#00000012', '#ffffff20'], 700, 2, 0.4);
  }, { repeat: [24, 3] });

  // آسفالت و جاده
  T.asphalt = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#454951'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#3b3f47', '#525760', '#5d636d', '#33363d'], 2400, 3, 0.5);
    noiseLines(ctx, w, h, '#2c2f35', 14, 0.25);
  }, { repeat: [30, 3] });

  T.roadLine = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#efe9d8'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#d8d2c1'], 300, 3, 0.35);
  });

  T.crosswalk = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4a4e56'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f2efe6';
    for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = 0.85;
      ctx.fillRect(8, i * 40 + 6, w - 16, 26);
    }
    ctx.globalAlpha = 1;
    speckle(ctx, w, h, ['#3f434a', '#5a5f68'], 600, 2, 0.4);
  }, { repeat: [2, 2] });

  // ساختمان‌ها
  T.brick = canvasTexture(256, 256, texBrick('#b2643f', '#8d6b57', 9), { repeat: [4, 2] });
  T.brickCream = canvasTexture(256, 256, texBrick('#d9c8a5', '#bda98a', 9), { repeat: [4, 2] });
  T.brickRed = canvasTexture(256, 256, texBrick('#9c3f34', '#7c4a3c', 8), { repeat: [5, 2] });
  T.plaster = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e7dfcd'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#d9d0bc', '#f2ebdb', '#cfc5ae'], 1400, 3, 0.4);
  }, { repeat: [4, 2] });
  T.plasterBlue = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#cfe0ea'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#bcd2df', '#e2eef5'], 1200, 3, 0.4);
  }, { repeat: [4, 2] });
  T.concrete = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#a9a9a4'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#9c9c97', '#b8b8b3', '#8f8f8a'], 1500, 3, 0.4);
    noiseLines(ctx, w, h, '#8d8d88', 10, 0.2);
  }, { repeat: [8, 4] });
  T.roofTile = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#a4503c'; ctx.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = c * 32 + (r % 2) * 16, y = r * 32;
        ctx.fillStyle = shadeHex('#a4503c', -18 + Math.random() * 30);
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 30); ctx.lineTo(x + 2, y + 12); ctx.quadraticCurveTo(x + 16, y - 4, x + 30, y + 12);
        ctx.lineTo(x + 30, y + 30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }, { repeat: [8, 4] });
  T.woodWall = canvasTexture(256, 256, texPlanks('#9b6a3d', '#6d4728', true), { repeat: [4, 2] });
  T.woodFloor = canvasTexture(256, 256, texPlanks('#c19a63', '#8d6a3d', false), { repeat: [12, 12] });
  T.woodFloorGym = canvasTexture(256, 256, texPlanks('#d9a95f', '#a97f3c', false), { repeat: [16, 10] });
  T.marble = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#efece5'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(150,150,160,0.35)';
    for (let i = 0; i < 16; i++) {
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      let x = Math.random() * w, y = Math.random() * h;
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    speckle(ctx, w, h, ['#dcd8cf'], 400, 2, 0.3);
  }, { repeat: [12, 10] });
  T.interiorWall = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e9e2d3'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d8cfbc'; ctx.fillRect(0, h - 42, w, 42);
    ctx.fillStyle = '#c9bfa8'; ctx.fillRect(0, h - 46, w, 5);
    speckle(ctx, w, h, ['#ded6c4'], 500, 3, 0.3);
  }, { repeat: [8, 2] });
  T.dormWall = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e2d5c4'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#d9c5ab' : '#e6dccc';
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc((i * 60) % w, (i * 90) % h, 26 + Math.random() * 14, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    speckle(ctx, w, h, ['#cdbca6'], 600, 3, 0.3);
  }, { repeat: [6, 2] });
  T.labTile = canvasTexture(256, 256, texTiles('#dfe6e9', '#b7c0c4', 8, true), { repeat: [10, 4] });
  T.poolTile = canvasTexture(256, 256, texTiles('#59c6e6', '#e8f7fd', 10, true), { repeat: [12, 12] });
  T.poolDeck = canvasTexture(256, 256, texTiles('#d8cfae', '#b8ad8c', 6, false), { repeat: [14, 10] });
  T.water = canvasTexture(256, 256, texWater('#2f9fd0', '#bfeaff'), { repeat: [6, 4] });
  T.waterPool = canvasTexture(256, 256, texWater('#31b6dd', '#eaffff'), { repeat: [4, 4] });
  T.cityWall = canvasTexture(256, 256, texWindows('#c9b9a4', '#8c7f6c', 3, 3), { repeat: [4, 2] });
  T.cityWall2 = canvasTexture(256, 256, texWindows('#a8b6c4', '#7d8b99', 3, 3), { repeat: [4, 2] });
  T.shopFront = canvasTexture(256, 128, texShopFront('#f0e2c8', '#e0563f'), { repeat: [3, 1] });
  T.shopFront2 = canvasTexture(256, 128, texShopFront('#e8dff2', '#4f7fc9'), { repeat: [3, 1] });
  T.shopFront3 = canvasTexture(256, 128, texShopFront('#f7ecd0', '#4aa96c'), { repeat: [3, 1] });
  T.mallGlass = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8fb9cc'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = i % 2 ? '#a9cfe0' : '#7fa9bd';
        ctx.fillRect(i * 64 + 3, j * 64 + 3, 58, 58);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.moveTo(i * 64 + 3, j * 64 + 60); ctx.lineTo(i * 64 + 40, j * 64 + 3);
        ctx.lineTo(i * 64 + 58, j * 64 + 3); ctx.lineTo(i * 64 + 10, j * 64 + 60);
        ctx.closePath(); ctx.fill();
      }
    }
  }, { repeat: [4, 3] });
  T.graffiti = canvasTexture(256, 256, texGraffiti('#5c5f66', ['#ff4d6d', '#ffd23f', '#4dd4ff', '#7cff6b', '#c77dff']), { repeat: [4, 2] });
  T.court = canvasTexture(256, 256, texCourt('#c9553f', '#f5f0e6'), { repeat: [2, 2] });
  T.courtBlue = canvasTexture(256, 256, texCourt('#3f6ec9', '#f5f0e6'), { repeat: [2, 2] });
  T.chalkboard = canvasTexture(256, 128, texChalkboard(), { repeat: [1, 1] });
  T.tire = canvasTexture(128, 128, texTire(), { repeat: [1, 1] });
  T.poster = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fdf6e3'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2f6fed'; ctx.fillRect(0, 0, w, 40);
    ctx.fillStyle = '#fff'; ctx.fillRect(12, 12, 150, 8);
    ctx.fillStyle = '#e0563f'; ctx.beginPath(); ctx.arc(w - 56, 96, 30, 0, 7); ctx.fill();
    ctx.fillStyle = '#4aa96c'; ctx.fillRect(16, 70, 100, 10);
    ctx.fillStyle = '#c9a100'; ctx.fillRect(16, 92, 140, 10);
    ctx.fillStyle = '#8c7f6c'; ctx.fillRect(16, 120, 180, 8);
    ctx.fillStyle = '#333'; ctx.font = 'bold 26px Vazirmatn, Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('نمایشگاه علم', w / 2, 186);
    ctx.font = '20px Vazirmatn, Tahoma, sans-serif';
    ctx.fillText('پنجشنبه — سالن ورزشی', w / 2, 216);
  });
  T.notice = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#a9793f'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#8f6533', '#c08e4f'], 500, 3, 0.4);
    const cols = ['#fff8e2', '#e8f5d8', '#dceafc'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = cols[i % 3];
      const x = 12 + i * 60, y = 14 + (i % 2) * 12;
      ctx.save();
      ctx.translate(x, y); ctx.rotate((i % 2 ? 1 : -1) * 0.05);
      ctx.fillRect(0, 0, 50, 44);
      ctx.fillStyle = '#666';
      ctx.fillRect(6, 8, 38, 3); ctx.fillRect(6, 16, 30, 3); ctx.fillRect(6, 24, 34, 3);
      ctx.restore();
    }
  });
  T.carpetRed = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8c2f2f'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#7a2626', '#a03a3a', '#6b1f1f'], 1800, 3, 0.5);
  }, { repeat: [10, 8] });
  T.carpetBlue = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2f4a7a'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, ['#263d66', '#3b5c94'], 1600, 3, 0.5);
  }, { repeat: [10, 8] });
  T.gravel = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b0a898'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = shadeHex('#b0a898', -30 + Math.random() * 60);
      const s = 3 + Math.random() * 5;
      ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, s, 0, 7); ctx.fill();
    }
  }, { repeat: [14, 14] });
  T.grassCourt = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#5fa843'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) {
      if (i % 2) continue;
      ctx.fillStyle = '#55993c';
      ctx.fillRect((i * w) / 10, 0, w / 10, h);
    }
    speckle(ctx, w, h, ['#4e8c3e', '#6ab04f'], 900, 3, 0.4);
  }, { repeat: [4, 3] });
  T.metalPlate = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#9aa3ad'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        ctx.strokeStyle = (i + j) % 2 ? '#8a939d' : '#a9b2bc';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(i * 16, j * 16 + 16); ctx.lineTo(i * 16 + 16, j * 16); ctx.stroke();
      }
    }
    speckle(ctx, w, h, ['#7d858f'], 200, 2, 0.4);
  }, { repeat: [4, 4] });
  T.flag = canvasTexture(192, 128, (ctx, w, h) => {
    ctx.fillStyle = '#1f9e8e'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f7f7f2'; ctx.fillRect(0, h / 3, w, h / 3);
    ctx.fillStyle = '#e0563f'; ctx.fillRect(0, (2 * h) / 3, w, h / 3);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const x = 34 + Math.cos(a) * 16, y = h / 2 + Math.sin(a) * 16;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(34 + Math.cos(a2) * 7, h / 2 + Math.sin(a2) * 7);
    }
    ctx.closePath(); ctx.fill();
  });
  return T;
}

/* ---------- تینت آب و هوایی روی متریال‌ها ---------- */
/**
 * رنگ متریال‌های محیطی را بر اساس خیسی/برف تغییر می‌دهد.
 * (متریال‌های دارای map با رنگ سفید ضرب می‌شوند)
 */
export function applyWeatherTint(materials, wet01, snow01, list) {
  const wet = Math.max(0, Math.min(1, wet01));
  const snow = Math.max(0, Math.min(1, snow01));
  for (const key of list) {
    const m = materials[key];
    if (!m) continue;
    // سفیدی برف بیشتر از تیرگی باران است
    const k = 1 - wet * 0.28 + snow * 0.45;
    const r = Math.min(255, Math.round(255 * k));
    const g = Math.min(255, Math.round(255 * (k + snow * 0.02)));
    const b = Math.min(255, Math.round(255 * (k + snow * 0.06)));
    if (m.color && m.color.setHex) m.color.setHex((r << 16) | (g << 8) | b);
  }
}
