/* overlay.js: builds the overlay window (340 x 280) and the compact strip (220 x 56) for any state. */
(function () {
  const esc = (s) => String(s);
  function keys(list) {
    return list.map((k) => `<kbd>${esc(k)}</kbd>`).join("");
  }
  function overlay(o) {
    const { icon } = window.WSIcons;
    const state = o.state || "live";
    const band = `<header class="ov-band"><span class="ov-lamp" aria-hidden="true"></span><span class="ov-state">${o.word}</span><span class="ov-sub">${o.sub || ""}</span>
      <div class="ov-tools">
        <button type="button" aria-label="${state === "paused" ? "Go live" : "Pause gestures"}">${icon(state === "paused" ? "play" : "pause")}</button>
        <button type="button" aria-label="Make the overlay compact">${icon("minimize-2")}</button>
        <button type="button" aria-label="Hide the overlay">${icon("eye-off")}</button>
      </div></header>`;
    let body;
    if (o.error) {
      body = `<div class="ov-error" role="alert">${icon("camera-off", 20)}<p class="ov-error-t">${o.error.title}</p><p class="ov-error-m">${o.error.message}</p><button class="btn btn-sm" type="button">${icon("refresh-cw")}Try again</button></div>`;
    } else {
      const cam = window.WSScene.cam(Object.assign({ label: "Camera, mirrored" }, o.cam || {}));
      const dial = window.WSDial.dial(Object.assign({ size: 104 }, o.dial));
      body = `<div class="ov-body"><figure class="ov-cam">${cam}<figcaption class="umd"><span>${o.umd[0]}</span><span class="umd-dim">${o.umd[1] || ""}</span></figcaption></figure>
        <div class="ov-cue" aria-live="polite">${dial}<p class="cue-word">${o.cueWord}</p><p class="cue-target">${o.cueTarget}</p></div></div>`;
    }
    const last = o.last
      ? `<footer class="ov-last${o.last.fresh ? " is-fresh" : ""}${o.last.blocked ? " is-blocked" : ""}"><span class="lbl">Last</span><span class="act">${o.last.act}</span><span class="keys">${keys(o.last.keys || [])}</span><span class="lat">${o.last.lat}</span></footer>`
      : `<footer class="ov-last"><span class="lbl">Nothing sent yet</span></footer>`;
    const cool = o.cool != null ? `<div class="ov-cool" aria-hidden="true"><span style="width:${o.cool * 100}%"></span></div>` : "";
    return `<section class="ov" data-state="${state}" aria-label="WaveSlide overlay, ${o.word}">${band}${body}${last}${cool}</section>`;
  }
  function compact(o) {
    const dial = window.WSDial.dial(Object.assign({ size: 44 }, o.dial));
    return `<section class="ov-compact" data-state="${o.state || "live"}" aria-label="WaveSlide overlay, compact, ${o.word}"><div class="c-band"><b>${o.word}</b><small>${o.sub || ""}</small></div><div class="c-dial">${dial}</div><div class="c-text"><b>${o.line1}</b><span class="muted">${o.line2}</span></div></section>`;
  }
  window.WSOverlay = { overlay, compact };
})();
