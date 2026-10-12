/* shell.js: the settings-window sidebar shared by every prototype page (Layout in the app). */
(function () {
  const NAV = [
    ["live.html", "activity", "Live"],
    ["settings.html", "sliders-horizontal", "Settings"],
    ["practice.html", "presentation", "Practice deck"],
    ["#dataset", "database", "Dataset"],
    ["evaluation.html", "flask-conical", "Evaluation lab"],
  ];
  function shell(active, { paused = false } = {}) {
    const { icon, mark } = window.WSIcons;
    const tally = paused
      ? `<div class="tally is-paused" role="status"><span class="tally-lamp" aria-hidden="true" style="background:transparent;box-shadow:inset 0 0 0 2px currentColor"></span><span class="tally-word">Paused</span><button class="btn-on-live" type="button">Go live</button><span class="tally-hint">Gestures are ignored. Hold a thumbs up for 1 s to go live.</span></div>`
      : `<div class="tally" role="status"><span class="tally-lamp" aria-hidden="true"></span><span class="tally-word">Live</span><button class="btn-on-live" type="button">Pause</button><span class="tally-hint">Gestures send keys to PowerPoint. Thumbs up for 1 s pauses.</span></div>`;
    const nav = NAV.map(([href, ic, label]) => `<li><a href="${href}"${label === active ? ' aria-current="page"' : ""}>${icon(ic, 16)}<span>${label}</span></a></li>`).join("");
    return `<div class="brand">${mark}<span>WaveSlide</span></div>${tally}<nav aria-label="Main"><ul class="nav">${nav}</ul></nav>
      <dl class="side-facts">
        <div><dt>App profile</dt><dd>PowerPoint</dd></div>
        <div><dt>Recogniser</dt><dd>Rules</dd></div>
        <div><dt>Camera</dt><dd>29.8 fps</dd></div>
        <div><dt>Pipeline p95</dt><dd>38 ms</dd></div>
      </dl>`;
  }
  window.WSShell = { shell };
})();
