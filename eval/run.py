"""The full evaluation from the command line: `npm run eval`.

    npm run eval                          # recorded sessions (the real study)
    npm run eval -- --sources synthetic   # the demo set made by `npm run seed`
    npm run eval -- --sources recorded synthetic --no-ml

Replays every chosen session through the real pipeline, computes BRIEF §11 E1-E8 and the
ablation, writes docs/EVALUATION.md and the charts in docs/eval/, and keeps the report in
data/eval/<run id>/report.json (the Evaluation screen reads it from there).
"""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from app.config import get_config  # noqa: E402
from app.dataset.store import sessions_dirs  # noqa: E402
from app.errors import AppError  # noqa: E402
from app.evaluation.charts import write_charts  # noqa: E402
from app.evaluation.markdown import render  # noqa: E402
from app.evaluation.runner import run_evaluation, save_report  # noqa: E402

DOC = ROOT / "docs" / "EVALUATION.md"
CHARTS = ROOT / "docs" / "eval"
FEEDBACK = ROOT / "eval" / "feedback.csv"


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the WaveSlide evaluation (BRIEF section 11).")
    parser.add_argument(
        "--sources", nargs="+", choices=["recorded", "synthetic"], default=["recorded"], help="which sessions"
    )
    parser.add_argument("--no-ml", action="store_true", help="skip the random forest comparison")
    args = parser.parse_args()

    data_dir = get_config().resolved_data_dir
    try:
        report = run_evaluation(
            sessions_dirs(data_dir),
            args.sources,
            include_ml=not args.no_ml,
            feedback_csv=FEEDBACK,
            logs_dir=data_dir / "logs",
            progress=lambda fraction, message: print(f"  {fraction:4.0%}  {message}", flush=True),
        )
    except AppError as error:
        print(f"Cannot evaluate: {error.message}", file=sys.stderr)
        return 1
    report.charts = write_charts(report, CHARTS)
    save_report(data_dir, report)
    DOC.write_text(render(report), encoding="utf-8", newline="\n")
    print(f"Wrote {DOC.relative_to(ROOT)}, {len(report.charts)} charts in {CHARTS.relative_to(ROOT)}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
