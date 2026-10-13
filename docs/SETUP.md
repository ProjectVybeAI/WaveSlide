# WaveSlide: Setup

## Prerequisites
| Tool | Version | Check | Notes |
|---|---|---|---|
| Node.js | 24 (`.nvmrc` says 24; developed on 24.18) | `node -v` | npm comes with it |
| uv | recent (developed on 0.11) | `uv --version` | Installs Python 3.12 for you. https://docs.astral.sh/uv/getting-started/installation/ |
| Git | any | `git --version` | |
| macOS | Apple Silicon (M1 or later) | | Intel Macs are not supported: MediaPipe 1.1 has no Intel macOS wheel |
| Windows | 10 or 11 | | Needs the Edge WebView2 runtime (preinstalled on Windows 10/11) |
| Webcam | any | | Not needed for the replay demo |

You do not install Python yourself. `uv` reads `backend/.python-version` (3.12) and downloads it.

## macOS
```bash
git clone <your repository url> WaveSlide
cd WaveSlide
npm run setup      # installs npm and uv packages, copies .env, checks the hand model
npm run seed       # synthetic demo sessions, demo model, demo evaluation (needed for Dataset and Evaluation screens)
npm start          # builds the UI, opens the settings window and the overlay
```
Then grant permissions (first run only):
1. System Settings, Privacy and Security, **Camera**: allow the app you ran the command from (Terminal, iTerm or your editor).
2. System Settings, Privacy and Security, **Accessibility**: allow the same app. Without it, key presses are silently blocked by macOS. The Live screen's setup check shows which permission is missing.
3. Quit and restart the terminal after changing permissions, then run `npm start` again.

## Windows (PowerShell)
```powershell
git clone <your repository url> WaveSlide
cd WaveSlide
npm run setup
npm run seed
npm start
```
Install Node and uv first if `node -v` or `uv --version` fails. uv for Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"` (from the uv install page), then open a new PowerShell window. TODO(verify): this install command is quoted from memory of the uv docs and was not run on Windows. If Windows asks for camera access, allow desktop apps in Settings, Privacy and security, Camera. Keys need no extra permission.

## Run without a webcam (replay)
```bash
npm run dev:replay
```
Open http://localhost:5173/practice. The engine replays `synthetic-demo` and only records keys, so nothing is pressed on your computer. Use this to rehearse or if the webcam fails. (Open http://localhost:5173/overlay for the overlay view.)

## Other run modes
| Command | What it does |
|---|---|
| `npm start` | Build UI, native windows, real webcam, real key presses |
| `npm run dev` | Engine plus Vite dev server in a browser, webcam |
| `npm run dev:replay` | Same, replay source, keys only recorded |
| `npm run dev:desktop` | Native windows loading the Vite dev server (for UI work) |
| `npm run eval` | Re-run the evaluation and rewrite `docs/EVALUATION.md` (add `-- --sources synthetic` for demo data) |

## Environment variables
Set in `.env` (created from `.env.example` by `npm run setup`). There are no secrets.
| Variable | Default | Meaning |
|---|---|---|
| `WAVESLIDE_PORT` | `8765` | Engine port on 127.0.0.1 |
| `WAVESLIDE_UI_ORIGIN` | `http://localhost:5173` | Vite dev server origin allowed by CORS and WebSocket checks |
| `WAVESLIDE_DATA_DIR` | `./data` | Where settings, sessions, models and eval runs are stored |
| `WAVESLIDE_SOURCE` | `camera` | `camera` or `replay` |
| `WAVESLIDE_REPLAY_SESSION` | `synthetic-demo` | Session played in replay mode |
| `WAVESLIDE_KEYS` | `pyautogui` | `pyautogui` presses real keys; `record` only logs them |
| `WAVESLIDE_LOG_LEVEL` | `info` | Log level |

## Seeding
`npm run seed` writes deterministic synthetic sessions (seed 42) into `data/sessions/`, trains a demo model and runs a demo evaluation. Running it twice gives identical files. All of it is flagged synthetic. `data/` is gitignored, so seed again on a new machine.

## Checking it works
```bash
npm test
```
This runs the backend and frontend tests with no webcam. Expect all to pass.

## Troubleshooting
| Problem | Cause | Fix |
|---|---|---|
| `uv is not installed` when running setup | uv missing or not on PATH | Install uv, open a new terminal, run `npm run setup` again |
| "The hand model file is damaged" | `backend/models/hand_landmarker.task` is incomplete | Download it again from the URL printed (also in `backend/models/manifest.json`) |
| Gestures show on screen but the slides do not move (macOS) | Accessibility permission missing | Allow your terminal under Privacy and Security, Accessibility, restart it. Live shows the problem and the fix steps. Quit and start WaveSlide again after allowing it (macOS reads the permission only at launch) |
| Keys are "Not sent" in the Live log | A WaveSlide window has focus | Click the presentation window so it has focus. Keys only go to the focused window. Exception: `/practice` |
| Camera unavailable, or black preview | Another app uses the webcam, permission denied, or wrong index | Close Zoom/Teams, allow Camera permission, or choose another camera in Settings. Use `npm run dev:replay` as a fallback |
| Port 8765 already in use | Old engine still running | Close the old WaveSlide window or terminal, or change `WAVESLIDE_PORT` in `.env` |
| Overlay buttons cannot be clicked (not yet checked on hardware) | The overlay does not take focus by design | `uv run --directory backend python -m app.desktop --overlay-focus` |
