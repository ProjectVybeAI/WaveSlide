# WaveSlide: Implementation plan

Companion to docs/ARCHITECTURE.md. `/vybe:build-phase` and `/vybe:build-all`
parse this file, so keep the headings and field names exactly as they are.

## Status
| Phase | Title | State | Commit |
|---|---|---|---|
| 0 | Contract and scaffold | done | chore: scaffold WaveSlide (phase 0) |
| 1 | Live gesture control: pipeline, overlay, practice deck and settings | done | feat(phase-1): live gesture control |
| 2 | Two-hand counting, dataset, classifier and evaluation lab | todo | |
| 3 | Polish, evaluation and ship | todo | |

States: `todo`, `in-progress`, `done`, `blocked: <reason>`.

## Platforms and verification
- **macOS (Apple Silicon) and Windows 10/11 are both first-class.** CI (`.github/workflows/ci.yml`, matrix `macos-14` + `windows-latest`) runs `npm run ci` on every push: lint, typecheck, pytest and vitest, all on replay sources and the recording key sender, so no webcam or keyboard access is needed.
- Hardware checks (real camera, real key injection into PowerPoint / Google Slides / Adobe Acrobat Reader, window behaviour) are listed per phase in `docs/PROFILE_CHECKS.md` and run by hand on the developer's Mac; the Windows column is run on a lab or borrowed Windows laptop before ship. No acceptance item needs a Windows machine except where marked "(Windows, manual)".
- Pytest markers: `camera` (needs a webcam), `keys` (sends real key presses). Both are excluded from `npm test` and CI.

## Repository layout and commands (fixed in Phase 0)
```
package.json          # root orchestration only (concurrently); .nvmrc = 24
.env.example          # every variable below; `npm run setup` copies it to .env if missing
scripts/              # setup.mjs (env copy, model sha256 check), run-backend.mjs (sets env vars cross-platform)
backend/              # FastAPI + uv, CPython 3.12 (uv-managed)
  app/main.py, config.py, errors.py, desktop.py, jobs.py
  app/contract/       # pydantic models for REST + WebSocket + files, examples.py (fixtures shared with MSW)
  app/core/           # framework-free pipeline: selection, smoothing, features, poses, swipe, counting, intents, reliability, pipeline
  app/engine/         # runner thread, sources (camera, replay), detector (MediaPipe), hub, preview, router, ws
  app/keys/           # profiles/*.json, profiles.py, sender.py, focus.py, router
  app/platform/       # permissions (macOS), cameras
  app/settings/, app/dataset/, app/ml/, app/evaluation/   # feature folders: router.py, service.py (+ store.py)
  models/hand_landmarker.task + manifest.json   # committed (7.8 MB, Apache-2.0)
  scripts/export_openapi.py, seed.py
  tests/<feature>/, tests/fixtures/sessions/*.jsonl
frontend/             # React + Vite + TS: src/app, src/api, src/components/ui, src/components/hand, src/features/<f>, src/mocks, e2e/
eval/                 # run.py (CLI), feedback.csv (user-study ratings), PROTOCOL.md (Phase 2)
data/                 # gitignored runtime data: settings.json, sessions/, models/, eval/, logs/
docs/eval/            # committed charts (PNG) referenced by EVALUATION.md
```
| Command | What it does |
|---|---|
| `npm run setup` | installs root + frontend (npm), backend (`uv sync`), Playwright Chromium; writes `.env`; verifies the model's sha256 |
| `npm start` | builds the frontend, then `uv run python -m app.desktop`: engine + settings window + overlay window. **The one demo-day command** |
| `npm run dev` | API on 127.0.0.1:8765 (camera source) + Vite on :5173; open screens in a browser |
| `npm run dev:replay` | same with `WAVESLIDE_SOURCE=replay`, `WAVESLIDE_KEYS=record`: no webcam, no real key presses |
| `npm run dev:desktop` | dev servers + the two pywebview windows pointing at Vite |
| `npm run seed` | deterministic synthetic sessions (seed 42) into `data/sessions/`; from Phase 2 also trains the demo model and runs a demo evaluation, all flagged synthetic |
| `npm test` | `test:api` (`uv run pytest -q --no-header -rf -m "not camera and not keys"`) + `test:web` (vitest dot reporter) |
| `npm run e2e` / `npm run shots` / `npm run visual` | Playwright against `dev:replay` |
| `npm run lint` / `npm run typecheck` | ruff check + ruff format --check + eslint / `tsc -b --noEmit` |
| `npm run contract` | `export_openapi.py` (openapi.json + MSW fixtures) then `gen:api` |
| `npm run ci` | lint + typecheck + test (what CI runs on both OSes) |
| `npm run eval` | Phase 2: `eval/run.py` over recorded sessions (`-- --sources synthetic` for the demo set): `docs/EVALUATION.md` + `docs/eval/*.png` |

`.env.example`: `WAVESLIDE_PORT=8765`, `WAVESLIDE_UI_ORIGIN=http://localhost:5173`, `WAVESLIDE_DATA_DIR=./data`,
`WAVESLIDE_SOURCE=camera|replay`, `WAVESLIDE_REPLAY_SESSION=synthetic-demo`, `WAVESLIDE_KEYS=pyautogui|record`,
`WAVESLIDE_CAMERA_INDEX=0`, `WAVESLIDE_LOG_LEVEL=info`. No secrets exist in this project.

## Demo screens
The routes the demo script shows (at most 6). UI critique, visual baselines
and the ship bar are scoped to these. The overlay is captured at its window size (340x280 and compact 220x56) instead of 1440/390.
| Route | Screen | States |
|---|---|---|
| `/overlay` | Overlay window: preview + landmarks, pose, hold ring, active/paused, last command | paused, active, holding (`?state=holding`), cooldown, no-hand, camera-error, compact |
| `/` | Live: setup check, large preview, engine stats, command log with latency | default, replay, permissions-missing, camera-unavailable |
| `/settings` | Settings: mappings, features, sensitivity, timing, camera, profile, recogniser, overlay, save/export/import/reset | default, dirty, mapping-conflict, ml-unavailable |
| `/practice` | Practice deck (10 slides) driven by gestures | slide 1, after jump to 3, blanked |
| `/dataset` | Dataset: session list + guided recorder | default, empty, recording |
| `/evaluation` | Evaluation lab: §11 results, rules vs ML confusion matrices, distance/lighting/latency charts, ablation | default, empty, running, synthetic-data |

## Approved dependencies
| Package | Side | Why |
|---|---|---|
| concurrently ^10.0 | root (dev) | One cross-platform `npm run dev` for engine and UI |
| fastapi[standard] ^0.143 | backend | REST + WebSocket + OpenAPI contract; uvicorn server |
| pydantic-settings ^2.15 | backend | Validated `.env`, fails naming the bad variable |
| numpy ^2.5 | backend | Landmark arrays, angles, filters, metrics |
| opencv-contrib-python ^5.0 | backend | Camera capture, mirroring, colour conversion, JPEG preview, luminance; the same build MediaPipe requires (never add `opencv-python` too: two `cv2` packages conflict) |
| mediapipe ^1.1 | backend | HandLandmarker (Tasks API, VIDEO mode): 21 landmarks + handedness. Apple Silicon and Windows wheels only |
| pyautogui ^0.9.54 | backend | Sends key presses to the focused presentation app on macOS and Windows (`PAUSE = 0`, `FAILSAFE = False`, documented) |
| scikit-learn ^1.9 | backend | Random forest pose classifier, leave-one-participant-out, confusion matrix, metrics (brings joblib for the model file) |
| matplotlib ^3.11 | backend (eval) | Report charts as PNG (already pulled in by MediaPipe) |
| pywebview ^6.2 | backend | Native settings + always-on-top overlay windows hosting the React UI (WebKit on macOS, Edge WebView2 via pythonnet on Windows) |
| cv2-enumerate-cameras ^1.4 | backend | Camera names for the camera picker (OpenCV only knows indexes) |
| pyobjc-framework-Quartz ^12.2, pyobjc-framework-AVFoundation ^12.2 (`sys_platform == 'darwin'`) | backend | macOS Accessibility (`CGPreflightPostEventAccess`) and Camera permission status for the setup check (already pulled in by pyautogui/pywebview) |
| pytest ^9.1, httpx ^0.28, ruff ^0.17 | backend (dev) | Tests, TestClient (REST + WebSocket), lint/format |
| hand_landmarker.task (float16, version 1) | backend asset | MediaPipe model, Apache-2.0, 7.8 MB, committed with sha256 in `models/manifest.json` so the demo works offline |
| react ^19, react-dom ^19, react-router ^8, @tanstack/react-query ^5 | frontend | UI, routes, server state |
| radix-ui ^1.8, lucide-react, clsx ^2 | frontend | vybe-kit primitives, icons, class variants |
| zod ^4, react-hook-form ^7, @hookform/resolvers ^5 | frontend | Settings form validation mirroring the contract |
| openapi-fetch ^0.17; openapi-typescript ^7 (dev) | frontend | Typed client generated from `backend/openapi.json` (includes WS message types) |
| recharts ^3 | frontend | Evaluation charts (accuracy by distance/lighting, latency, ablation), styled per the `dataviz` skill; confusion matrices are a CSS grid, not a chart |
| @fontsource-variable/* (per DESIGN.md) | frontend | Self-hosted fonts, works offline |
| vite ^8, @vitejs/plugin-react, typescript (template version), vitest ^5, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, @playwright/test ^1.64, @axe-core/playwright, msw ^3, eslint ^10, eslint-plugin-jsx-a11y, prettier | frontend (dev) | Build, unit, e2e, accessibility, mocks (MSW also mocks the WebSocket), lint |

## Phases

### Phase 0: Contract and scaffold
- **Goal:** the project runs end to end with an empty shell (a synthetic hand moves on the overlay with no webcam, a real hand with one), and the contract that parallel tracks build against exists: REST + WebSocket schemas, file schemas, the landmark-source and key-sender ports, and seed sessions.
- **Parallel:** no
- **Tracks:**
  - `all`: owns everything
- **Deliverables:**
  - Precondition: `docs/DESIGN.md` exists (run `/vybe:design-direction` first if not). It must cover two surfaces: the settings window and the small overlay that sits over someone else's slides.
  - Scaffold per stack profiles and the layout above; root `package.json` with every command; `.nvmrc` 24, `backend/.python-version` 3.12; `.gitignore` per profile plus `data/`; `scripts/setup.mjs`, `scripts/run-backend.mjs` (env vars without `cross-env`).
  - `backend/app/contract/`: every pydantic model in ARCHITECTURE.md "Data model" and "API surface" (Settings with the §13 defaults, AppProfile, EngineSnapshot, `EngineFrame`, `EngineEvent` union, `ClientMessage` union, Session header/frame, RecordingStatus, ModelCard, `EvaluationReport` with typed sections E1-E8 + ablation, Job, error codes as an enum). `examples.py` holds one valid example per model.
  - Every router registered with its final path, `operation_id` and `response_model`. Real in Phase 0: `/api/health`, `/api/engine` (GET), `/api/settings` GET/PUT (schema validation only) and reset, `/ws/engine`, `/api/preview.mjpg`. All others return their `examples.py` example until their phase replaces them.
  - `export_openapi.py` writes `backend/openapi.json` (with the WS models added to `components.schemas`) and `frontend/src/mocks/fixtures/examples.json`.
  - Engine skeleton: `LandmarkSource` port with `CameraLandmarkSource` (OpenCV capture, mirror, MediaPipe HandLandmarker VIDEO mode, `num_hands=2`) and `ReplayLandmarkSource` (real-time pacing, loop, or as-fast-as-possible for evaluation); runner thread; hub that keeps the latest frame per client and never drops events; WS `Origin` check; MJPEG preview. `core/pipeline.py` is a pass-through (pose `NONE`) in this phase.
  - `KeySender` port with `RecordingSender` and a thin `PyAutoGuiSender`; `app/desktop.py` launcher (uvicorn thread, settings window at `/`, overlay at `/overlay`: frameless, `on_top`, `focus=False`, 340x280, top-right).
  - Seed shape: `dataset/synthetic.py` builds 21-point hands from per-pose finger-bend templates, applies scale, roll, translation, noise and per-"participant" variation, and generates swipe trajectories and 3 minutes of "talking" motion. `scripts/seed.py` writes `synthetic-<gesture>-p<1..3>`, `synthetic-talking-p<1..3>`, `synthetic-two-hand` and `synthetic-demo` (activate, next, next, previous, jump 3, blank, unblank, pause). Small copies are committed under `backend/tests/fixtures/sessions/`.
  - Frontend: tokens from DESIGN.md, vybe-kit, fonts; `Layout` (settings window: sidebar Live, Settings, Practice, Dataset, Evaluation) and `OverlayLayout` (no chrome, transparent-friendly); all six routes registered with placeholder pages and `document.title`; 404; `api/client.ts`; `api/engineSocket.ts` (`useEngineFrame`, `useEngineEvents`, reconnect with backoff, sends `hello` and `focus`); MSW REST + WebSocket handlers with `?state=` switching; a placeholder overlay drawing the raw landmarks as SVG.
  - Tests: pytest (health, settings round-trip and 422, replay source yields frames in order, WebSocket sends an `EngineFrame` within 1 s via TestClient, seed is deterministic), vitest smoke, Playwright smoke; `shots.spec.ts` and `visual.spec.ts` with the Demo screens; CI workflow; CLAUDE.md.
- **Acceptance:**
  - [ ] `npm run setup` then `npm run dev:replay` starts both sides; `/overlay` in the browser shows the synthetic demo hand moving; `/` renders the shell with the DESIGN.md typefaces and colours
  - [ ] With a webcam, `npm run dev` shows the mirrored camera at `/api/preview.mjpg` with live landmarks on `/overlay`, and `GET /api/engine` reports `fps` ≥ 20 (manual, recorded in PROFILE_CHECKS.md)
  - [ ] `npm start` opens the settings window and an always-on-top frameless overlay from one command (macOS, manual)
  - [ ] `npm run ci` passes with no webcam; the CI matrix is green on macOS and Windows
  - [ ] `backend/openapi.json` contains `EngineFrame`, `EngineEvent` and `ClientMessage`; `npm run contract` leaves `git diff` empty
  - [ ] Running `npm run seed` twice produces byte-identical session files
  - [ ] A WebSocket connection with `Origin: https://example.com` is closed with code 1008 (test)

### Phase 1: Live gesture control: pipeline, overlay, practice deck and settings
- **Goal:** a presenter launches WaveSlide, shows a thumbs-up to activate, swipes and holds up fingers to drive PowerPoint, Google Slides, a PDF viewer or the practice deck while the overlay's ring shows what is about to happen, and remaps or tunes every gesture in Settings.
- **Parallel:** yes
- **UI checkpoint:** yes
- **Tracks:**
  - `backend`: owns `backend/app/core/**`, `backend/app/engine/**`, `backend/app/keys/**`, `backend/app/settings/**`, `backend/app/platform/**`, `backend/app/desktop.py`, `backend/tests/core/**`, `backend/tests/engine/**`, `backend/tests/keys/**`, `backend/tests/settings/**`, `backend/tests/platform/**`, `docs/PROFILE_CHECKS.md`. Implements ARCHITECTURE.md "The interesting core" steps 2-6 exactly: largest-hand selection; One Euro filter; features (scale `s`, roll normalisation, left-hand mirroring, joint angles, spread, thumb direction); rule poses with the 4-of-5 stabiliser; swipe detector in units of `s`; intent mapping from Settings; the reliability state machine (paused, hold with stillness and 150 ms grace, cooldown, activation cooldown, re-arm); focus guard fed by WS `focus` messages (practice deck exempt); command log with `pipeline_ms` and `deck_ack` latency. Profiles `powerpoint`, `google_slides`, `pdf_viewer` (Adobe Acrobat Reader keys; jump = `Home` + `Right` x (N-1); blank unsupported) and `practice`, each with `darwin` and `win32` keys. Settings rules: `MAPPING_CONFLICT`, `ACTIVATION_MUST_BE_HELD_POSE`, `COUNT_*` reserved for jump, numeric ranges, `NO_MODEL` when `recogniser=ml` without a model. `/api/engine/active`, `/api/engine/source`, `/api/overlay` (desktop shell resizes or hides the window; no-op in a browser), `/api/profiles`, `/api/cameras` (switching camera restarts the source), settings export/import, macOS permission checks in `/api/health`. Camera backend per OS (AVFoundation on macOS, DirectShow on Windows). Tests: every pose on synthetic fixtures for 3 "participants"; swipe at 1.9 `s` rejected and 2.1 `s` accepted; diagonal swipe rejected; hold cancelled by a pose change and by movement; second swipe inside 800 ms ignored; palm held 5 s blanks once; paused engine emits only activation; each profile's key sequence per OS through `RecordingSender`; focus guard blocks; full `synthetic-demo` replay produces exactly the scripted command list.
  - `frontend`: owns `frontend/src/features/overlay/**`, `frontend/src/features/live/**`, `frontend/src/features/practice/**`, `frontend/src/features/settings/**`, `frontend/src/components/hand/**`. `components/hand/`: `HandSkeleton` (SVG landmarks and bones over the preview, mirrored coordinates, landmarks-only mode for replay), `HoldRing` (progress from `frame.hold`, the target label inside: "Slide 3", "Blank"), `PoseChip`. Overlay: preview + skeleton, pose and recogniser badge, hold ring, active/paused state in words and colour, last command with its latency, cooldown bar, pause button, compact and hide controls, no-hand and camera-error states. Live: setup check (camera, Accessibility with step-by-step fix, profile, focus hint), large preview, fps and pipeline p50, source switch (camera / replay session), command log table (gesture, action, keys, latency, blocked reason). Settings: mapping table (one select per action, conflicts shown inline before save), feature switches, sensitivity and timing sliders with units and the §13 defaults marked, camera and profile selects (unsupported actions explained), recogniser choice (ML disabled with "Train a model in Dataset" when `GET /api/model` is 404), overlay options, save, export, import, reset with confirm, dirty-state guard. Practice deck: 10 slides, arrows/number+Enter/B keyboard handling, blank screen, follows `command` events when `dry_run` is true, sends `deck_ack`. Component tests for HoldRing, mapping conflicts and the settings form.
- **Integration:** swap placeholder pages for the real ones in `frontend/src/app/router.tsx`; overlay window size presets in `backend/app/desktop.py` agreed with the overlay design; contract changes (if any) via `npm run contract`; MSW fixtures for every Demo screen state of `/overlay`, `/`, `/settings`, `/practice`; add routes to `shots.spec.ts`; fill the Phase 1 column of `docs/PROFILE_CHECKS.md`.
- **Acceptance:**
  - [x] `npm run dev:replay` with `synthetic-demo` and `/practice` open: the deck goes to slide 2, 3, back to 2, jumps to 3, blanks and unblanks, then the overlay shows "Paused", with no other command
  - [x] `npm test` includes and passes the boundary tests named above (swipe 1.9/2.1 `s`, diagonal, hold cancel, cooldown, re-arm, paused, focus guard, per-profile key sequences)
  - [x] `PUT /api/settings` assigning `FIST` to two actions returns 409 `MAPPING_CONFLICT`; a swipe as activation returns 422 `ACTIVATION_MUST_BE_HELD_POSE`; `recogniser: ml` without a model returns 409 `NO_MODEL`
  - [x] Settings survive a restart (`data/settings.json`); reset restores the §13 defaults; export then import round-trips
  - [ ] Replay pipeline time (after landmarks) p95 < 5 ms per frame; live camera mode shows fps ≥ 20 and pipeline p95 (capture to key) < 80 ms on the dev Mac (Live screen, manual) (replay p95 ≈ 0.1 ms verified in tests; live fps and latency still manual)
  - [ ] Live on macOS with PowerPoint and with Google Slides in Chrome: activate, next, previous, jump to 4, blank, start and exit slideshow all work, and the overlay never takes focus from the presentation (PROFILE_CHECKS.md, manual). If `focus=False` makes the overlay unclickable, the fallback (`focus=True` plus the focus guard) is used and noted here (manual, not yet run)
  - [ ] With Accessibility permission missing, the Live setup check shows the problem and the fix steps instead of failing silently (macOS, manual) (manual, not yet run; the permissions-missing state is covered by e2e)
  - [x] Screens have loading, empty and error states
- **Demo:** start paused, hold a thumbs-up and watch the ring fill to "Active"; swipe right twice in PowerPoint; hold up three fingers and let go halfway to show the ring cancel, then hold again to jump to slide 3; open Settings, swap the swipe directions and show it take effect.

### Phase 2: Two-hand counting, dataset, classifier and evaluation lab
- **Goal:** record labelled landmark sessions per participant, distance and lighting, train the random forest and switch between rules and ML live, use two hands for slides 6-10, and run one evaluation that produces every §11 number with charts and confusion matrices.
- **Parallel:** yes
- **Tracks:**
  - `backend`: owns `backend/app/dataset/**`, `backend/app/ml/**`, `backend/app/evaluation/**`, `backend/app/jobs.py`, `backend/app/core/**`, `backend/scripts/seed.py`, `backend/tests/dataset/**`, `backend/tests/ml/**`, `backend/tests/evaluation/**`, `backend/tests/core/**`, `eval/**`. Two-hand counting in `core/counting.py` (one hand `COUNT_5`, the other 1-5, both still and stable gives 6-10; anything else gives no jump; off means the largest hand only). Guided recorder: protocols `gestures` (each pose 4 s x 3 rounds with rest, swipes x 10 each way), `talking` (3 min), `two_hand`; prompts as `recording_prompt` events; mean frame luminance stored; landmarks only. Session store list/detail/delete. `ml/`: `feature_version`ed vectors (42 normalised coordinates + joint angles + spread + thumb direction), frames trimmed 0.3 s at each label edge, `RandomForestClassifier(n_estimators=200, random_state=42)`, leave-one-participant-out, model card, `MLPoseClassifier` with the same interface as the rules so only step 4 changes. `evaluation/`: replays sessions through the real pipeline (as-fast-as-possible, `RecordingSender`) and computes E1-E8 and the ablation as in ARCHITECTURE.md step 7; event scoring rule: a labelled segment is correct when exactly the mapped command fires between its start and 0.5 s after its end; charts with matplotlib; `docs/EVALUATION.md` writer; `eval/run.py` CLI; `eval/PROTOCOL.md` (participants, distances 0.5/1/1.5/2 m, bright/normal/dim with lux guidance, talking script, consent line, feedback form) and `eval/feedback.csv` header. In-process jobs with progress events. `npm run seed` extended to train the demo model and run a demo evaluation (both flagged synthetic). Tests: counting truth table; recorder refuses replay mode; session files contain no image keys; LOPO never puts one participant in both train and test; the ablation on synthetic talking shows more false triggers with controls off than on; report has every section; `NOT_ENOUGH_DATA` under 2 participants.
  - `frontend`: owns `frontend/src/features/dataset/**`, `frontend/src/features/evaluation/**`, `frontend/src/components/charts/**`. Dataset: sessions table (kind, participant, distance, lighting, luminance, frames, source badge), delete with confirm, "Record session" dialog (protocol, participant, distance, lighting) then a full recorder view: large prompt ("Hold up 3 fingers"), countdown, live skeleton (reusing `components/hand`), progress through the protocol, stop. "Train model" with job progress and the resulting model card (LOPO macro-F1, classes, participants). Evaluation: run button with job progress; run picker; synthetic-data banner; sections E1-E8 + ablation in report order: per-gesture accuracy table by participant, finger-count jump confusion, false triggers/min (active vs paused), latency distribution and p50/p95, accuracy and detection rate by distance and by lighting, rules vs ML confusion matrices side by side (CSS grid heat map with numbers, accessible table fallback) with macro-F1 and inference time, ablation bars, user ratings. Component tests for the confusion matrix and the recorder prompt flow.
- **Integration:** swap placeholders for `/dataset` and `/evaluation` in `router.tsx`; `npm run contract` if report shapes changed; MSW fixtures for every Demo screen state of both routes (a full synthetic report as the default fixture); add both to `shots.spec.ts`; `docs/PROFILE_CHECKS.md` Phase 2 column (record, train, switch to ML live).
- **Acceptance:**
  - [ ] `npm run seed && npm run eval -- --sources synthetic` writes `docs/EVALUATION.md` with sections E1-E8 and the ablation, each marked synthetic, plus the PNGs it links
  - [ ] `POST /api/model/train` on seed data returns a job; `GET /api/model` then shows LOPO macro-F1 and 3 participants; with one participant it returns 422 `NOT_ENOUGH_DATA`
  - [ ] After training, `PUT /api/settings` with `recogniser: ml` succeeds and the overlay badge reads "ML" with a confidence; replaying `synthetic-demo` in ML mode produces the same command list
  - [ ] Two-hand on: replaying `synthetic-two-hand` jumps to slide 7; two-hand off: the same replay produces no jump above 5
  - [ ] `POST /api/recordings` in replay mode returns 409 `CAMERA_REQUIRED`; with a webcam a guided `gestures` session records and appears in the list with its luminance (manual)
  - [ ] Evaluation screen shows rules and ML confusion matrices side by side and every section, with empty, running and synthetic-data states
  - [ ] Screens have loading, empty and error states
- **Demo:** record 30 seconds of the guided protocol, train the model and read its macro-F1, flip Settings to ML and keep presenting, then open the Evaluation lab and compare the two confusion matrices and the ablation chart.

### Phase 3: Polish, evaluation and ship
- **Goal:** ready to sell. UI review is clean, evaluation numbers are measured on real recordings, and docs and the viva pack are written.
- **Parallel:** no
- **Tracks:**
  - `all`: owns everything
- **Deliverables:** UI critique and fixes on the Demo screens; code review; visual baselines; real evaluation run following `eval/PROTOCOL.md` (at least 3 participants at 1 m in normal light, one participant at all four distances and three lighting levels, 3 minutes of talking each, feedback ratings) and `npm run eval`; one phone slow-motion check of camera-to-slide delay; `docs/PROFILE_CHECKS.md` complete for macOS, Windows column filled on a Windows laptop; README, `docs/SETUP.md` (macOS Camera + Accessibility permission, Windows WebView2, `npm start`), `docs/DEMO_SCRIPT.md` (with the replay fallback if the room's camera or lighting fails), `docs/VIVA.md`, `docs/REPORT_NOTES.md`.
- **Acceptance:**
  - [ ] ui-critic verdict on the demo screens is "ship": every screen 4+ on every rubric criterion, average 4.5+ (or the user accepted the open items)
  - [ ] axe reports 0 serious/critical violations on every screen
  - [ ] Evaluation results recorded in docs/EVALUATION.md from recorded (not synthetic) sessions, covering every BRIEF §11 test; if recordings are not yet available this item is `blocked: needs participant recordings`
  - [ ] `npm start` on a clean clone after `npm run setup` reaches an active, working overlay within one minute (macOS manual; Windows manual)
  - [ ] `/vybe:ship` deliverables complete

## Polish backlog
| Screen | Item | Rubric score | From |
|---|---|---|---|
| Live | Cue panel lacks agreement, palm speed, spread rows and a third engine figure (key to slide p50) | Live 4.3 | Phase 1 critique |
| Settings | Timing dial previews: "hold other poses" has no target; cooldown previews are bare circles | Settings 4.7 | Phase 1 critique |
| Live, Settings, Practice | At 390 px the tally block is a ~70 px card; make it one row under 960 px | 4.3 / 4.7 / 4.1 | Phase 1 critique |
| Overlay compact | Only the standby state is baselined; add compact-paused and compact-cooldown | 4.5 | Phase 1 critique |
