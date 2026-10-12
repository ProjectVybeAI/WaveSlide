"""Report charts as PNG (matplotlib), in the colours of docs/DESIGN.md so they match the app.

Rules are always blue and the trained model always orange. Confusion matrices use the blue
ramp by row share, with the count printed in every non-empty cell. Charts are written only by
the command line (`npm run eval`); the Evaluation screen draws its own from the report JSON.
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # no window: charts are only written to files
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from app.contract.evaluation import ConfusionMatrix, EvaluationReport  # noqa: E402

SURFACE, GRID = "#1d2125", "#363b41"
TEXT, MUTED = "#eef0f3", "#b0b5bb"
RULES, MODEL, NEUTRAL = "#3987e5", "#d95926", "#7e848a"
RAMP = ["#0d366b", "#104281", "#1c5cab", "#5598e7", "#86b6ef", "#b7d3f6", "#cde2fb"]
RAMP_LIMITS = [0.02, 0.05, 0.10, 0.25, 0.60, 0.85, 1.0]
DPI = 130


def _style(ax, title: str) -> None:
    ax.set_facecolor(SURFACE)
    ax.set_title(title, color=TEXT, fontsize=11, loc="left", pad=10)
    ax.tick_params(colors=MUTED, labelsize=8)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(GRID)
    ax.yaxis.grid(True, color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)


def _save(fig, path: Path, synthetic: bool) -> str:
    if synthetic:
        fig.text(0.99, 0.01, "SYNTHETIC DATA", color=MUTED, fontsize=7, ha="right", va="bottom")
    fig.patch.set_facecolor(SURFACE)
    fig.savefig(path, dpi=DPI, facecolor=SURFACE, bbox_inches="tight")
    plt.close(fig)
    return path.name


def _bars(ax, labels, series: dict[str, list[float]], colours: list[str], percent: bool = True) -> None:
    """Grouped vertical bars, 2 px gap between neighbours."""
    width = 0.8 / len(series)
    x = np.arange(len(labels))
    for i, (name, values) in enumerate(series.items()):
        shown = [0 if v is None else v for v in values]
        bars = ax.bar(
            x + (i - (len(series) - 1) / 2) * width, shown, width * 0.92, label=name, color=colours[i]
        )
        for bar, value in zip(bars, values, strict=True):
            if value is not None:
                text = f"{value:.0%}" if percent else f"{value:.1f}"
                ax.annotate(
                    text,
                    (bar.get_x() + bar.get_width() / 2, bar.get_height()),
                    ha="center",
                    va="bottom",
                    fontsize=7,
                    color=TEXT,
                    xytext=(0, 2),
                    textcoords="offset points",
                )
    ax.set_xticks(x, labels)
    if len(series) > 1:
        # Below the axis, so it never covers a bar.
        ax.legend(
            frameon=False,
            labelcolor=MUTED,
            fontsize=8,
            loc="upper center",
            bbox_to_anchor=(0.5, -0.12),
            ncol=len(series),
        )


def _heat(ax, cm: ConfusionMatrix, title: str) -> None:
    n = len(cm.labels)
    matrix = np.array(cm.matrix)
    ax.set_facecolor(SURFACE)
    for i in range(n):
        row_total = matrix[i].sum()
        for j in range(n):
            count = matrix[i, j]
            share = count / row_total if row_total else 0.0
            colour = (
                SURFACE if count == 0 else RAMP[next(k for k, lim in enumerate(RAMP_LIMITS) if share <= lim)]
            )
            ax.add_patch(plt.Rectangle((j, i), 0.96, 0.96, color=colour))
            if count:
                dark = share > 0.25
                ax.text(
                    j + 0.48,
                    i + 0.48,
                    str(count),
                    ha="center",
                    va="center",
                    fontsize=7,
                    color="#0e1114" if dark else TEXT,
                )
    ax.set_xlim(0, n)
    ax.set_ylim(n, 0)
    ax.set_xticks(np.arange(n) + 0.48, cm.labels, rotation=60, ha="right")
    ax.set_yticks(np.arange(n) + 0.48, cm.labels)
    ax.tick_params(colors=MUTED, labelsize=7, length=0)
    ax.set_xlabel("recognised", color=MUTED, fontsize=8)
    ax.set_ylabel("hand showed", color=MUTED, fontsize=8)
    ax.set_title(title, color=TEXT, fontsize=10, loc="left", pad=8)
    for spine in ax.spines.values():
        spine.set_visible(False)


def write_charts(report: EvaluationReport, folder: Path) -> list[str]:
    """Write one PNG per section that has data; returns the file names, in report order."""
    folder.mkdir(parents=True, exist_ok=True)
    s, syn = report.sections, report.synthetic
    names: list[str] = []

    if s.e1_gestures:
        fig, ax = plt.subplots(figsize=(7, 3.6))
        rows = s.e1_gestures.rows
        _style(ax, "E1  Accuracy per gesture (rules)")
        _bars(
            ax, [r.gesture.replace("_", "\n") for r in rows], {"rules": [r.accuracy for r in rows]}, [RULES]
        )
        ax.set_ylim(0, 1.12)
        ax.tick_params(axis="x", labelsize=6)
        names.append(_save(fig, folder / "e1_gestures.png", syn))

    if s.e2_finger_count:
        two = s.e2_finger_count.two_hand
        fig, axes = plt.subplots(1, 2 if two else 1, figsize=(8 if two else 4.2, 3.8))
        axes = np.atleast_1d(axes)
        _heat(axes[0], s.e2_finger_count.one_hand, "E2  Fingers shown on one hand")
        if two:
            _heat(axes[1], two, "E2  Two hands: slides 6-10")
        fig.tight_layout()
        names.append(_save(fig, folder / "e2_finger_count.png", syn))

    if s.e3_false_triggers:
        e3 = s.e3_false_triggers
        fig, ax = plt.subplots(figsize=(6, 3.4))
        _style(ax, "E3  False triggers per minute while talking")
        labels = ["active", "paused", *e3.per_participant]
        values = [e3.active_per_min, e3.paused_per_min, *e3.per_participant.values()]
        _bars(ax, labels, {"per minute": values}, [RULES], percent=False)
        ax.set_ylim(0, max(max(values) * 1.3, 1.0))
        names.append(_save(fig, folder / "e3_false_triggers.png", syn))

    if s.e4_response_time:
        e4 = s.e4_response_time
        fig, ax = plt.subplots(figsize=(6.5, 3.4))
        _style(ax, f"E4  Pipeline time per command (n = {e4.n_commands})")
        starts = [b.start_ms for b in e4.histogram]
        widths = [b.end_ms - b.start_ms for b in e4.histogram]
        ax.bar(starts, [b.count for b in e4.histogram], widths, align="edge", color=RULES, edgecolor=SURFACE)
        for value, name in ((e4.pipeline_p50_ms, "p50"), (e4.pipeline_p95_ms, "p95")):
            ax.axvline(value, color=MODEL, linewidth=1.2)
            ax.annotate(
                f"{name} {value:.2f} ms",
                (value, ax.get_ylim()[1]),
                color=TEXT,
                fontsize=8,
                xytext=(4, -12),
                textcoords="offset points",
            )
        ax.set_xlabel("milliseconds from frame to key", color=MUTED, fontsize=8)
        names.append(_save(fig, folder / "e4_latency.png", syn))

    for chart, section, title in (
        ("e5_distance.png", s.e5_distance, "E5  By distance from the camera"),
        ("e6_lighting.png", s.e6_lighting, "E6  By lighting"),
    ):
        if section:
            rows = section.rows
            fig, ax = plt.subplots(figsize=(6.5, 3.6))
            _style(ax, title)
            series = {"rules": [r.rules_accuracy for r in rows]}
            colours = [RULES]
            if any(r.ml_accuracy is not None for r in rows):
                series["model"] = [r.ml_accuracy for r in rows]
                colours.append(MODEL)
            series["hand detected"] = [r.detection_rate for r in rows]
            colours.append(NEUTRAL)
            _bars(ax, [r.condition for r in rows], series, colours)
            ax.set_ylim(0, 1.15)
            names.append(_save(fig, folder / chart, syn))

    if s.e7_rules_vs_model:
        e7 = s.e7_rules_vs_model
        fig, axes = plt.subplots(1, 2 if e7.ml else 1, figsize=(10.5 if e7.ml else 5.2, 4.8))
        axes = np.atleast_1d(axes)
        _heat(axes[0], e7.rules.confusion, f"E7  Rules, macro-F1 {e7.rules.macro_f1:.3f}")
        if e7.ml:
            _heat(axes[1], e7.ml.confusion, f"E7  Random forest, macro-F1 {e7.ml.macro_f1:.3f}")
        fig.tight_layout()
        names.append(_save(fig, folder / "e7_rules_vs_model.png", syn))

    if s.ablation:
        fig, ax = plt.subplots(figsize=(6.5, 3.4))
        _style(ax, "Ablation  False triggers per minute, one control off")
        rows = s.ablation.rows
        _bars(
            ax,
            [r.control.replace("_", " ") for r in rows],
            {"per minute": [r.false_triggers_per_min for r in rows]},
            [RULES],
            percent=False,
        )
        ax.set_ylim(0, max(max(r.false_triggers_per_min for r in rows) * 1.3, 1.0))
        names.append(_save(fig, folder / "ablation.png", syn))
    return names
