# WaveSlide

A desktop app that turns hand gestures in front of an ordinary webcam into slide-control key presses for PowerPoint, Google Slides and PDF viewers. A final-year computer-vision project: a real-time MediaPipe pipeline with reliability controls, a rules-vs-classifier comparison and a full evaluation.

Brief: docs/BRIEF.md · Architecture: docs/ARCHITECTURE.md · Plan and status: docs/PLAN.md · Design: docs/DESIGN.md · Manual checks: docs/PROFILE_CHECKS.md
(read each only when the task needs it).

## Working rules
- Final-year project: code must be simple, readable and explainable in a viva.
- Build with `/vybe:build-all` (or one phase with `/vybe:build-phase`), then `/vybe:ship`; commit after each working step (Conventional Commits).
- Commit messages and PR descriptions carry no AI attribution: never add a `Co-Authored-By: Claude` trailer or a "Generated with Claude Code" line.
- Only dependencies listed in docs/PLAN.md "Approved dependencies"; ask before adding any other.
- Never commit secrets. Configuration goes through `.env` (documented in `.env.example`); there are no secrets in this project.
- UI: every visual value comes from `frontend/src/styles/tokens.css`; follow docs/DESIGN.md. Compose screens from the kit primitives in `frontend/src/components/ui/`; extend them rather than writing one-offs.
- `backend/app/core/` stays framework-free (no FastAPI, no OpenCV); it gets landmarks and explicit timestamps only, so it runs on replay sessions and in CI.
- Contract changes go: `backend/app/contract/*.py` → `npm run contract` (openapi.json, MSW fixtures, `frontend/src/api/schema.d.ts`). Never edit generated files.
- Tests never need a webcam or press real keys: use replay sources and `RecordingSender`; mark hardware tests `camera` / `keys`.
- Keep tool output short: use the quiet test commands below and read only failures.

## Stack
- Frontend: React + Vite + TypeScript (strict), React Router, TanStack Query, CSS Modules + tokens, vybe-kit, MSW (`?state=` switches mocked states).
- Backend: FastAPI + uv (Python 3.12), OpenCV, MediaPipe HandLandmarker, NumPy, PyAutoGUI, scikit-learn, matplotlib. No database: JSON/JSONL files in `data/`.
- Desktop: pywebview hosts the UI in a settings window and an always-on-top overlay (`backend/app/desktop.py`).

## Commands
- Setup: `npm run setup`
- Demo (one command): `npm start` · Dev: `npm run dev` (webcam) or `npm run dev:replay` (no webcam, keys only recorded)
- Seed demo data: `npm run seed`
- Test (quiet): `npm test` · Lint: `npm run lint` · Typecheck: `npm run typecheck` · All of CI: `npm run ci`
- E2E (quiet): `npm run e2e` · Visual baselines: `npm --prefix frontend run visual` · Screenshots: `npm --prefix frontend run shots`
- Contract: `npm run contract`

## Layout
- `backend/app/contract/` pydantic models for REST, WebSocket and files; `examples.py` feeds placeholders and MSW.
- `backend/app/core/` the gesture pipeline (pure); `engine/` thread, sources (camera, replay), hub, WS; `keys/` profiles + senders.
- `backend/app/{settings,dataset,ml,evaluation,platform}/` feature folders; `desktop.py` the launcher.
- `backend/models/` MediaPipe hand model (committed); `backend/tests/fixtures/sessions/` small synthetic sessions.
- `frontend/src/app/` shell and routes; `api/` client + `engineSocket.ts`; `components/{ui,hand,shell}`; `features/<screen>/`; `mocks/`.
- `frontend/e2e/` Playwright (smoke, shots, visual); `design/prototype/` the approved visual spec; `scripts/` setup and launcher.
- `data/` runtime files (gitignored): settings.json, sessions/, models/, eval/, logs/.

## Current phase
Phase 0 done. Next: Phase 1 (Live gesture control: pipeline, overlay, practice deck and settings). See docs/PLAN.md "Status".
