/* scene.js: a stand-in for the mirrored 320 x 240 webcam frame (a presenter in a dim lecture room),
   with the counted hand drawn crisp on top. In the app the frame is /api/preview.mjpg. */
(function () {
  function cam({ pose = "COUNT_3", numbered = true, lit = true, s = 62, cx = 104, cy = 214, tilt = -7, label = "Camera, mirrored", hand = true, w = 320, h = 240 } = {}) {
    let svg = `<svg class="cam" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">`;
    svg += `<rect width="${w}" height="${h}" fill="oklch(23% 0.01 240)"/>`;
    svg += `<g class="cam-blur">`;
    svg += `<rect x="214" y="-10" width="120" height="122" fill="oklch(34% 0.012 235)"/>`;
    svg += `<rect x="214" y="112" width="120" height="6" fill="oklch(28% 0.01 235)"/>`;
    svg += `<path d="M118 250 C120 205 140 186 190 182 C240 186 262 205 266 250 Z" fill="oklch(27% 0.02 262)"/>`;
    svg += `<rect x="178" y="140" width="26" height="44" fill="oklch(36% 0.018 55)"/>`;
    svg += `<ellipse cx="191" cy="112" rx="31" ry="38" fill="oklch(39% 0.022 55)"/>`;
    svg += `<path d="M186 76 C205 70 224 86 222 110 C214 92 196 86 170 96 C168 84 176 78 186 76 Z" fill="oklch(20% 0.01 60)"/>`;
    if (hand) svg += `<path d="M140 196 C118 200 104 196 ${cx - 4} ${cy + 22}" stroke="oklch(27% 0.02 262)" stroke-width="26" fill="none" stroke-linecap="round"/>`;
    svg += `</g>`;
    if (hand) svg += window.WSHand.counted(pose, { cx, cy, s, tilt, numbered, lit, stroke: 4, tipR: 12 });
    svg += `</svg>`;
    return svg;
  }
  window.WSScene = { cam };
})();
