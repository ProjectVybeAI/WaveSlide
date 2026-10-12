/* slide.js: builds the FIFO / LRU tables on the lecturer's slide and scales the 1440 x 900 screen mock to the window. */
(function () {
  const REF = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3];
  const FIFO = [["7", "", ""], ["7", "0", ""], ["7", "0", "1"], ["2", "0", "1"], ["2", "0", "1"], ["2", "3", "1"], ["2", "3", "0"], ["4", "3", "0"], ["4", "2", "0"], ["4", "2", "3"]];
  const FIFO_F = [1, 1, 1, 1, 0, 1, 1, 1, 1, 1];
  const LRU = [["7", "", ""], ["7", "0", ""], ["7", "0", "1"], ["2", "0", "1"], ["2", "0", "1"], ["2", "0", "3"], ["2", "0", "3"], ["4", "0", "3"], ["4", "0", "2"], ["4", "3", "2"]];
  const LRU_F = [1, 1, 1, 1, 0, 1, 0, 1, 1, 1];
  function table(name, steps, faults) {
    let h = `<div class="pp-table"><div class="h lab">${name}</div>`;
    h += REF.map((r) => `<div class="h">${r}</div>`).join("");
    for (let f = 0; f < 3; f++) {
      h += `<div class="lab">Frame ${f + 1}</div>`;
      h += steps.map((s, i) => `<div class="${faults[i] ? "f" : ""} ${s[f] ? "" : "e"}">${s[f] || "–"}</div>`).join("");
    }
    return h + "</div>";
  }
  function tables(el) {
    el.innerHTML = table("FIFO", FIFO, FIFO_F) + table("LRU", LRU, LRU_F);
  }
  function fit() {
    const fitEl = document.getElementById("fit"), screen = document.getElementById("screen");
    const apply = () => {
      const k = Math.min(1, window.innerWidth / 1440);
      screen.style.transform = k < 1 ? `scale(${k})` : "";
      fitEl.style.height = `${900 * k}px`;
    };
    apply();
    window.addEventListener("resize", apply);
  }
  window.WSSlide = { tables, fit };
})();
