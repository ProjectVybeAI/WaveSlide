/* dial.js: the cue dial, WaveSlide's signature. A lamp disc that fills clockwise while a held gesture
   is on standby; one tick per 100 ms of the hold time; the target in the middle. States:
   idle | standby | go | cooldown | cancel. Returns an <svg> string. */
(function () {
  let uid = 0;
  const rad = (d) => (d * Math.PI) / 180;
  const pt = (r, deg) => [Math.round(Math.cos(rad(deg)) * r * 100) / 100, Math.round(Math.sin(rad(deg)) * r * 100) / 100];

  function pie(r, p) {
    if (p <= 0) return "";
    if (p >= 0.999) return `M0 ${-r} A${r} ${r} 0 1 1 -0.01 ${-r} Z`;
    const [x, y] = pt(r, -90 + 360 * p);
    return `M0 0 L0 ${-r} A${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${x} ${y} Z`;
  }
  function arc(r, p) {
    if (p <= 0) return "";
    const [x, y] = pt(r, -90 + 360 * p);
    if (p >= 0.999) return `M0 ${-r} A${r} ${r} 0 1 1 -0.01 ${-r}`;
    return `M0 ${-r} A${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${x} ${y}`;
  }

  function dial({ size = 100, progress = 0, holdMs = 1000, numeral = "", caption = "", state = "standby", cooldown = 0, label }) {
    const id = `dial-${++uid}`;
    const ticks = Math.round(holdMs / 100);
    const R = 36;
    const p = state === "go" ? 1 : progress;
    let s = `<svg class="dial is-${state}" width="${size}" height="${size}" viewBox="-50 -50 100 100" role="img" aria-label="${label || `${caption} ${numeral}`.trim() || "Ready"}">`;
    s += `<circle class="d-disc" r="${R}"/>`;
    // ticks: one per 100 ms of the hold, from 41 to 48
    for (let i = 1; i <= ticks; i++) {
      const a = -90 + (360 * i) / ticks;
      const [x1, y1] = pt(39.5, a), [x2, y2] = pt(46.5, a);
      const passed = (state === "standby" || state === "go") && i / ticks <= p + 1e-6;
      s += `<line class="d-tick${passed ? " passed" : ""}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="3"/>`;
    }
    const sweep = state === "standby" || state === "go" || state === "cancel" ? pie(R, p) : "";
    const numSize = numeral.length > 2 ? 24 : 46;
    const numY = numeral.length > 2 ? 15 : 22;
    if (sweep) s += `<path class="d-sweep" d="${sweep}"/>`;
    if (state === "cooldown") s += `<path class="d-cool" d="${arc(R - 3, cooldown)}" stroke-width="5"/>`;
    s += `<circle class="d-rim" r="${R}" stroke-width="1"/>`;
    if (caption) s += `<text class="d-cap" y="-15" font-size="9.5">${caption}</text>`;
    if (numeral) s += `<text class="d-num" y="${numY}" font-size="${numSize}">${numeral}</text>`;
    if (sweep && state !== "cancel") {
      s += `<clipPath id="${id}"><path d="${sweep}"/></clipPath><g clip-path="url(#${id})">`;
      if (caption) s += `<text class="d-cap on" y="-15" font-size="9.5">${caption}</text>`;
      if (numeral) s += `<text class="d-num on" y="${numY}" font-size="${numSize}">${numeral}</text>`;
      s += `</g>`;
    }
    s += `</svg>`;
    return s;
  }

  window.WSDial = { dial };
})();
