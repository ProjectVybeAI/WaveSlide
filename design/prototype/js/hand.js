/* hand.js: the 21 MediaPipe hand landmarks for each WaveSlide pose, in hand-length units (s = wrist to
   middle knuckle), and SVG renderers for the counted hand (camera views) and pose glyphs (tables, selects).
   The app builds the same drawings from live landmarks; these synthetic poses only stand in for them. */
(function () {
  const CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
  ];
  const FINGER_IDS = { thumb: [1, 2, 3, 4], index: [5, 6, 7, 8], middle: [9, 10, 11, 12], ring: [13, 14, 15, 16], pinky: [17, 18, 19, 20] };
  const COUNT_ORDER = ["index", "middle", "ring", "pinky", "thumb"];
  const MCP = { index: [-0.36, -0.93], middle: [-0.04, -1.0], ring: [0.25, -0.93], pinky: [0.5, -0.79] };
  const LEN = { index: [0.4, 0.24, 0.2], middle: [0.45, 0.28, 0.21], ring: [0.42, 0.26, 0.2], pinky: [0.33, 0.2, 0.18] };
  const FAN = {
    normal: { index: -99, middle: -91, ring: -83, pinky: -74 },
    together: { index: -94, middle: -90, ring: -86, pinky: -82 },
    spread: { index: -112, middle: -93, ring: -75, pinky: -58 },
  };
  const THUMB = {
    out: { dirs: [-128, -134, -140], scale: [1, 1, 1] },
    side: { dirs: [-118, -112, -106], scale: [1, 1, 1] },
    folded: { dirs: [-112, -38, -8], scale: [1, 0.8, 0.72] },
    left: { dirs: [-162, -176, -180], scale: [1, 1, 1] },
  };
  const rad = (d) => (d * Math.PI) / 180;

  function chain(start, dirs, lens, scale) {
    const pts = [start];
    let [x, y] = start;
    for (let i = 0; i < 3; i++) {
      x += Math.cos(rad(dirs[i])) * lens[i] * scale[i];
      y += Math.sin(rad(dirs[i])) * lens[i] * scale[i];
      pts.push([x, y]);
    }
    return pts;
  }
  function finger(name, extended, fan) {
    const base = FAN[fan][name];
    return extended
      ? chain(MCP[name], [base, base + 2, base + 4], LEN[name], [1, 1, 1])
      : chain(MCP[name], [base, base + 152, base + 205], LEN[name], [0.55, 0.5, 0.42]);
  }

  /** Build 21 points. ext: set of extended fingers; fan: normal|together|spread; thumb: out|side|folded|left; rot: degrees. */
  function build({ ext = [], fan = "normal", thumb = "folded", rot = 0 }) {
    const p = new Array(21);
    p[0] = [0, 0];
    const t = chain([-0.27, -0.2], THUMB[thumb].dirs, [0.33, 0.28, 0.24], THUMB[thumb].scale);
    t.forEach((pt, i) => (p[1 + i] = pt));
    for (const name of ["index", "middle", "ring", "pinky"]) {
      const f = finger(name, ext.includes(name), fan);
      f.forEach((pt, i) => (p[FINGER_IDS[name][i]] = pt));
    }
    if (rot) {
      const c = Math.cos(rad(rot)), s = Math.sin(rad(rot));
      for (let i = 0; i < 21; i++) {
        const [x, y] = p[i];
        p[i] = [x * c - y * s, x * s + y * c];
      }
    }
    return p;
  }

  const POSES = {
    NONE: { ext: ["index", "middle"], fan: "normal", thumb: "side", label: "No pose" },
    FIST: { ext: [], thumb: "folded", label: "Fist" },
    OPEN_PALM: { ext: ["index", "middle", "ring", "pinky", "thumb"], fan: "together", thumb: "side", label: "Open palm" },
    THUMBS_UP: { ext: ["thumb"], thumb: "left", rot: 90, label: "Thumbs up" },
    THUMBS_DOWN: { ext: ["thumb"], thumb: "left", rot: -90, label: "Thumbs down" },
    COUNT_1: { ext: ["index"], label: "One finger" },
    COUNT_2: { ext: ["index", "middle"], label: "Two fingers" },
    COUNT_3: { ext: ["index", "middle", "ring"], label: "Three fingers" },
    COUNT_4: { ext: ["index", "middle", "ring", "pinky"], label: "Four fingers" },
    COUNT_5: { ext: ["index", "middle", "ring", "pinky", "thumb"], fan: "spread", thumb: "out", label: "Five fingers" },
    SWIPE_RIGHT: { ext: ["index", "middle", "ring", "pinky", "thumb"], fan: "together", thumb: "side", rot: 8, swipe: 1, label: "Swipe right" },
    SWIPE_LEFT: { ext: ["index", "middle", "ring", "pinky", "thumb"], fan: "together", thumb: "side", rot: -8, swipe: -1, label: "Swipe left" },
  };

  function pose(name) {
    const def = POSES[name];
    const ext = def.ext.slice();
    const points = build({ ext, fan: def.fan || "normal", thumb: ext.includes("thumb") ? def.thumb : def.thumb || "folded", rot: def.rot || 0 });
    return { name, points, ext, def };
  }

  function litIndexes(ext) {
    const lit = new Set();
    for (const f of ext) FINGER_IDS[f].forEach((i) => lit.add(i));
    return lit;
  }
  const fmt = (n) => Math.round(n * 10) / 10;

  /**
   * Counted hand for camera views. opts: cx, cy (wrist position in px), s (px per hand length),
   * tilt (deg), numbered (bool), stroke (px), tipR (px), blob (draw a blurred hand under it, for the fake video).
   */
  function counted(name, opts) {
    const { cx, cy, s, tilt = 0, numbered = true, stroke = 3, tipR = 8, blob = true, lit = true } = opts;
    const { points, ext } = pose(name);
    const c = Math.cos(rad(tilt)), sn = Math.sin(rad(tilt));
    const P = points.map(([x, y]) => [fmt(cx + (x * c - y * sn) * s), fmt(cy + (x * sn + y * c) * s)]);
    const litSet = lit ? litIndexes(ext) : new Set();
    let out = "";
    if (blob) {
      out += `<g class="cam-blur" stroke="oklch(48% 0.012 60)" stroke-linecap="round" fill="none">`;
      out += `<path d="M${P[0]} L${P[5]} L${P[9]} L${P[13]} L${P[17]} Z" fill="oklch(48% 0.012 60)" stroke-width="${fmt(s * 0.34)}"/>`;
      for (const [a, b] of CONNECTIONS) out += `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke-width="${fmt(s * 0.2)}"/>`;
      out += `</g>`;
    }
    for (const [a, b] of CONNECTIONS) out += `<line class="hand-casing" x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke-width="${stroke + 2.5}"/>`;
    for (const [a, b] of CONNECTIONS) {
      const isLit = litSet.has(a) && litSet.has(b) || (litSet.has(b) && [5, 9, 13, 17, 1].includes(b) && false);
      out += `<line class="hand-bone${isLit ? " lit" : ""}" x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke-width="${stroke}"/>`;
    }
    for (let i = 0; i < 21; i++) {
      const isTip = [4, 8, 12, 16, 20].includes(i);
      if (isTip && litSet.has(i) && numbered) continue;
      out += `<circle class="hand-joint${litSet.has(i) ? " lit" : ""}" cx="${P[i][0]}" cy="${P[i][1]}" r="${fmt(stroke * (isTip ? 0.95 : 0.8))}"/>`;
    }
    if (numbered && lit) {
      let n = 0;
      for (const f of COUNT_ORDER) {
        if (!ext.includes(f)) continue;
        n += 1;
        const [x, y] = P[FINGER_IDS[f][3]];
        out += `<circle class="hand-tip" cx="${x}" cy="${y}" r="${tipR}" stroke-width="1.5"/>`;
        out += `<text class="hand-tip-n" x="${x}" y="${fmt(y + 0.5)}" font-size="${fmt(tipR * 1.45)}">${n}</text>`;
      }
    }
    return out;
  }

  /** Small pose glyph as a complete <svg>: the same landmarks reduced to a pictogram. Palm outline,
      extended fingers as straight strokes with a tip dot, curled fingers as knuckle stubs. size in px. */
  function glyph(name, size = 28, title) {
    const { points: p, ext, def } = pose(name);
    const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
    const pad = 0.2;
    let minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
    if (def.swipe) {
      if (def.swipe > 0) minX -= 0.75; else maxX += 0.75;
    }
    const w = maxX - minX, h = maxY - minY, side = Math.max(w, h);
    const ox = minX - (side - w) / 2, oy = minY - (side - h) / 2;
    const sw = fmt2(side * 0.07);
    const L = (a, b, cls) => `<line class="${cls}" x1="${fmt2(a[0])}" y1="${fmt2(a[1])}" x2="${fmt2(b[0])}" y2="${fmt2(b[1])}" stroke-width="${sw}"/>`;
    let g = "";
    if (def.swipe) {
      const x0 = def.swipe > 0 ? Math.min(...xs) - 0.1 : Math.max(...xs) + 0.1;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      for (const [dy, len] of [[-0.35, 0.45], [0, 0.62], [0.35, 0.45]]) g += L([x0, cy + dy], [x0 - def.swipe * len, cy + dy], "g-motion");
    }
    // palm: the wrist landmark widened sideways so the outline reads as a palm, not a cone
    const lx = p[17][0] - p[5][0], ly = p[17][1] - p[5][1], ll = Math.hypot(lx, ly);
    const wa = [p[0][0] - (lx / ll) * 0.2, p[0][1] - (ly / ll) * 0.2], wb = [p[0][0] + (lx / ll) * 0.24, p[0][1] + (ly / ll) * 0.24];
    g += `<path class="g-bone" d="M${[wa, p[5], p[9], p[13], p[17], wb].map((q) => `${fmt2(q[0])} ${fmt2(q[1])}`).join(" L")} Z" stroke-width="${sw}" stroke-linejoin="round"/>`;
    for (const f of ["index", "middle", "ring", "pinky"]) {
      const [m, pip, , tip] = FINGER_IDS[f].map((i) => p[i]);
      g += ext.includes(f) ? L(m, tip, "g-bone lit") : L(m, pip, "g-bone");
    }
    const t = FINGER_IDS.thumb.map((i) => p[i]);
    const tpath = (pts) => `M${pts.map((q) => `${fmt2(q[0])} ${fmt2(q[1])}`).join(" L")}`;
    g += ext.includes("thumb")
      ? `<path class="g-bone lit" d="${tpath([wa, t[1], t[2], t[3]])}" stroke-width="${sw}" stroke-linejoin="round"/>`
      : `<path class="g-bone" d="${tpath([wa, t[1], t[3]])}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    for (const f of ext) {
      const [x, y] = p[FINGER_IDS[f][3]];
      g += `<circle class="g-tip" cx="${fmt2(x)}" cy="${fmt2(y)}" r="${fmt2(side * 0.065)}"/>`;
    }
    const label = title || def.label;
    return `<svg class="glyph" width="${size}" height="${size}" viewBox="${fmt2(ox)} ${fmt2(oy)} ${fmt2(side)} ${fmt2(side)}" role="img" aria-label="${label}"><title>${label}</title>${g}</svg>`;
  }
  function fmt2(n) {
    return Math.round(n * 1000) / 1000;
  }

  window.WSHand = { counted, glyph, pose, POSES };
})();
