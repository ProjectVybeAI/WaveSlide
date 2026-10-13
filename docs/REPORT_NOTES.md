# WaveSlide: Report notes

Material for the written report. Status first: the system is built and tested without hardware, but all evaluation numbers in `docs/EVALUATION.md` are synthetic, and the manual hardware checks (`docs/PROFILE_CHECKS.md`) and the participant study (`eval/PROTOCOL.md`) are not yet run. The report must either include the real results once they exist, or state plainly that the evaluation is of the harness on synthetic data. Never present synthetic numbers as measured accuracy.

## 1. Problem statement
Presenters are tied to the laptop to press keys, or carry a clicker that can be lost or flat, or ask someone else to change slides, or scroll to find a slide when asked a question (BRIEF §2). The problem is to let a presenter control slides from a distance with no extra hardware, without accidental slide changes while talking.

## 2. Objectives
From BRIEF §5, §9 and §11:
1. Detect hands and 21 landmarks in real time from a standard webcam.
2. Recognise swipe left/right, open palm, finger counts 1 to 5 (6 to 10 with two hands), and an activation gesture.
3. Prevent accidental and repeated commands (activation pause, hold-to-confirm, stillness, cooldown, re-arm).
4. Send the right keys for PowerPoint, Google Slides and PDF viewers.
5. Provide an overlay and a settings screen.
6. Compare rule-based recognition with a trained classifier.
7. Evaluate accuracy, false triggers, response time, distance, lighting and user feedback.
8. Target: a command within about 0.5 s of gesture completion; privacy by processing locally.

## 3. Literature and existing systems
Taken from BRIEF §4 and §14. Each entry is **verify before citing**: open the link, check the title, authors, year and claims, and cite from the source itself.
| System / source | What it is | Link | Status |
|---|---|---|---|
| MediaPipe Hands / HandLandmarker, Google | The hand tracking model used here | https://developers.google.com/mediapipe/solutions/vision/hand_landmarker | verify before citing |
| OpenCV | Image and video library | https://opencv.org | verify before citing |
| Gesture-Controlled Presentation Tool (open-source example) | Webcam landmarks, rule-based gestures, keyboard automation | https://github.com/sreelasya21/gesture_env | verify before citing |
| Gesture Presenter, Remote for Slides (Chrome extension, open source) | Uses a phone camera to control browser-based slides | https://chromewebstore.google.com/detail/gesture-presenter-remote/pdfpddkehgjilojkjcekjbfkoleclkkb | verify before citing |
| *Hand gesture recognition for PowerPoint presentation control*, Webology 18(6), 2021 | Research paper on the same task | https://www.webology.org/data-cms/articles/20220301125244amwebology%2018%20(6)%20-%20162%20pdf.pdf | verify before citing |
| *A Proposed Method of Gesture-controlled Presentation Software Design* | Paper; the brief says it reports a reliable range of about 2 feet because training data was recorded close to the camera | https://www.researchgate.net/publication/379953967_A_Proposed_Method_of_Gesture-controlled_presentation_software_design | verify before citing, especially the 2 ft claim |
| *I Built a Presentation Remote That Uses Hand Gestures and Voice*, DEV Community, 2026 | Blog post: gesture plus voice remote | https://dev.to/devidevilaldevil/i-built-a-hands-free-slide-remote-for-a-friend-who-can-never-find-the-right-page-1298 | verify before citing |
| One Euro filter (Casiez, Roussel, Vogel, CHI 2012) | The smoothing method used in `core/one_euro.py` | TODO(verify): citation not in the repo; look it up | verify before citing |

How WaveSlide relates: it follows the established approach (landmarks, rules, keyboard automation) and adds finger-count jump, a settings screen, a state-machine reliability design, replay-based testing, and an evaluation harness with an ablation.

## 4. Methodology
- Build in phases (docs/PLAN.md): 0 contract and scaffold, 1 live gesture control, 2 two-hand counting, dataset, classifier and evaluation lab, 3 polish and ship (not yet complete: evaluation on recorded sessions is blocked on participant recordings).
- Contract first: pydantic models generate the OpenAPI file and TypeScript types.
- Landmarks as the boundary: everything after MediaPipe takes landmarks and timestamps, so it is testable offline.
- Evaluation protocol: `eval/PROTOCOL.md`: at least 3 participants at 1 m in normal light; one participant at 0.5, 1, 1.5 and 2 m and at bright, normal and dim light; a 3-minute talking session for false triggers; a feedback form (ease and reliability, 1 to 5). Only landmarks are stored.
- Rules vs classifier: leave-one-participant-out validation, macro-F1 and confusion matrices.
- Ablation: turn off hold, stillness, cooldown and re-arm one at a time on the talking sessions.

## 5. System design
Use `docs/ARCHITECTURE.md`: component diagram (mermaid), data model, API table and the 12 key decisions. Suggested figures: the component diagram; the state machine (PAUSED, ACTIVE, HOLDING, COOLDOWN); the landmark-to-feature normalisation (wrist-centred, divided by hand length, rotated); a screenshot of the overlay (`docs/screenshots/overlay.png`) and of each screen.

Defaults (backend/app/contract/settings.py): activation THUMBS_UP; next SWIPE_RIGHT; previous SWIPE_LEFT; blank OPEN_PALM; start show FIST; exit show THUMBS_DOWN; jump COUNT_1 to COUNT_5; swipe min travel 2.0 hand lengths in at most 500 ms at 4.0 hand lengths per second or more; hold 1000 ms for counts, 800 ms for palm, 1000 ms for other poses; cooldown 800 ms (1500 ms after activation toggles); two-hand off; starts paused; camera 640x480; profile PowerPoint.

## 6. Implementation highlights
- One Euro filter on each landmark coordinate (`core/one_euro.py`).
- Scale- and rotation-invariant features; finger-extended test by joint angle (`core/features.py`).
- Palm versus five fingers separated by spread (`core/poses.py`).
- Swipe measured in hand lengths (`core/swipe.py`).
- State machine with explicit timestamps (`core/reliability.py`).
- Replay source and recording key sender, so CI needs no hardware (`engine/sources.py`, `keys/sender.py`).
- Per-OS app profiles as JSON (`keys/profiles/`).
- Focus guard: keys are not sent while a WaveSlide window has focus (except the practice deck).
- Random forest on the same features, with a model card and a feature-version check (`ml/`).
- Evaluation harness that replays labelled sessions and writes `docs/EVALUATION.md` and charts (`evaluation/`, `eval/run.py`).
- Local-only server: 127.0.0.1, WebSocket Origin check.
- Test size at last check: 315 backend tests (pytest), 104 frontend tests in 22 files (vitest), 22 Playwright tests across 5 spec files (counted from `test(` lines in `frontend/e2e`; not re-run for these notes), CI on macOS and Windows runners.

## 7. Testing and results
What is real: automated tests pass (above). What is synthetic: everything in `docs/EVALUATION.md` (run `run-20261013-001122`, 12 synthetic sessions, participants p1 to p3).

Synthetic results, for describing the harness only (EVALUATION.md):
| Item | Synthetic result |
|---|---|
| E1 per-gesture accuracy | 100% on every gesture |
| E2 finger-count jumps | 100% (one hand); one two-hand sample (7) correct |
| E3 false triggers while talking | 0.00 per minute (active and paused), 9.03 minutes |
| E4 pipeline time | p50 0.09 ms, p95 0.11 ms (excludes camera and MediaPipe) |
| E5 distance | 100% at 0.5 and 1 m, 94.7% at 1.5 and 2 m |
| E6 lighting | 100% in all three; hand detected 97.0% in dim |
| E7 rules vs forest (LOPO) | macro-F1 0.978 vs 1.000; 0.001 vs 3.519 ms per frame |
| E8 user ratings | not recorded |
| Ablation | all on 0.00; no hold 24.15; no stillness 1.66; no cooldown and no re-arm 0.00 per minute |

State in the report that these show the harness works. The synthetic generator is written by the same author as the recogniser, so high scores are expected. The report needs a section with real E1 to E8 numbers from `eval/PROTOCOL.md`, or an explicit statement that this was not done. Also still to do: the hardware checks in `docs/PROFILE_CHECKS.md` (macOS and Windows) and an estimate of camera latency using phone slow-motion video (ARCHITECTURE.md limitations).

## 8. Limitations
See ARCHITECTURE.md "Known limitations": one presenter, range depends on webcam, thumb confusions, focus needed, shortcuts differ by app version, Apple Silicon-only macOS, response time measured from frame capture, hold adds 0.8 to 1.0 s by design.

## 9. Future work
From BRIEF §12 and ARCHITECTURE.md: presenter lock, voice commands, virtual laser pointer, drawing on slides, user-recorded custom gestures, longer range, phone as camera, a direct engine frame feed for the dataset recorder (PLAN.md polish backlog).
