# WaveSlide: Viva preparation

Be clear from the first minute about one thing: all evaluation numbers in `docs/EVALUATION.md` are from synthetic landmark sessions. The real participant study and the hardware checks in `docs/PROFILE_CHECKS.md` are not yet done. Say so before the examiner finds it.

## The two-minute explanation
"Presenters are tied to their laptop or a clicker. WaveSlide lets them control slides with hand gestures in front of the normal webcam. The camera frames go to MediaPipe, which gives 21 landmark points per hand. I turn those points into features that do not depend on distance or hand tilt, decide the pose with rules, and detect swipes from palm motion. The risky part of gesture control is accidental triggers, so every command passes a state machine: it starts paused, a pose must be held still with a visible ring filling, there is an 800 ms cooldown, and a held pose must be released before it can fire again. Then PyAutoGUI sends the keys for the chosen profile: PowerPoint, Google Slides or a PDF viewer. The UI is React inside two pywebview windows, an overlay and a settings window, connected to the Python engine by a WebSocket. Because everything after MediaPipe only sees landmarks, I can replay recorded sessions with no webcam, which is how I test it and how my evaluation harness works. I also train a random forest on the same features and compare it with the rules. I built the harness and ran it on synthetic data; the study with real participants is the next step, so I do not claim real accuracy yet."

## Architecture walkthrough
Follow one swipe from hand to slide.
1. `backend/app/engine/sources.py` captures a frame (camera) or reads a recorded frame (replay). The camera source mirrors it, converts BGR to RGB and calls MediaPipe through `engine/detector.py`. Output: landmarks per hand with timestamps.
2. `backend/app/core/pipeline.py` runs the pure pipeline, which has no FastAPI or OpenCV. `tracking.py` picks the largest hand, `one_euro.py` smooths each coordinate, `features.py` normalises by hand length and rotation and works out which fingers are extended.
3. `core/poses.py` gives a pose by rules (or the random forest from `backend/app/ml/` replaces only this step). It is stable only when 4 of the last 5 frames agree. `core/swipe.py` watches palm travel over the last 0.5 s.
4. `core/intents.py` maps a pose or swipe to an action using the user's mappings. `core/reliability.py` is the state machine: paused, holding, cooldown, re-arm. It fires a command or holds back.
5. `engine/dispatcher.py` and `keys/` check the focus guard, find the key sequence in the profile JSON for this operating system, and send it through `PyAutoGuiSender` (or `RecordingSender` in tests).
6. `engine/hub.py` and `engine/ws.py` broadcast frames and events over `/ws/engine`. `frontend/src/api/engineSocket.ts` receives them, and the overlay at `/overlay` draws the landmarks and hold ring.
7. `engine/command_log.py` stores the command with `pipeline_ms`, which the Live screen shows.
Settings are plain JSON (`settings/store.py`). `contract/` holds the pydantic models, and `npm run contract` generates `openapi.json` and the TypeScript types from them.

## Key decisions
### Why a Python engine and not MediaPipe in the browser?
**Answer:** A browser cannot send key presses to PowerPoint. The engine has to be a native process. Keeping recognition and keys in one process also makes timing measurable.
**If they push further:** The UI is only a view over a WebSocket. It could be replaced without touching the recogniser.

### Why rules by default and not a trained classifier?
**Answer:** Rules need no data, and I can explain each one line by line. A random forest needs recorded examples and I only have synthetic ones so far. The classifier is built and switchable in Settings, and compared in the evaluation.
**If they push further:** The forest replaces only the pose step and uses the same normalised features, so the comparison tests the classifier and nothing else. On the synthetic data the forest scored macro-F1 1.000 against 0.978 for rules, but those sessions are generated, so this says nothing about real hands (EVALUATION.md E7).

### Why leave-one-participant-out validation and not a random split?
**Answer:** Neighbouring video frames are almost identical. A random split puts near-copies of test frames into training and inflates accuracy. Leaving out one whole person tests whether it works for someone new.
**If they push further:** With three synthetic participants this is still not a real result. The code path is right, the data is not real yet.

### Why measure distances in hand lengths and not pixels?
**Answer:** A hand at 2 m looks half the size of one at 1 m. If the swipe threshold were in pixels, it would need retuning with distance. In hand lengths (wrist to middle knuckle) the same threshold works at any distance.
**If they push further:** Far away the hand has fewer pixels, so landmark noise grows. That is what the distance test (E5) is for.

### Why hold-to-confirm, stillness, cooldown and re-arm?
**Answer:** Each blocks one failure. Hold stops false starts from a passing pose. Stillness separates a swipe from a hold. Cooldown stops one swipe skipping slides. Re-arm stops a held palm blanking repeatedly. The ablation turns each off to show this.
**If they push further:** In the synthetic talking session, turning hold off gave 24.15 false triggers per minute and stillness off gave 1.66. Cooldown and re-arm show 0.00 because talking has no deliberate gestures to repeat (EVALUATION.md, Ablation). Synthetic, so only the pattern is meaningful.

### Why pywebview and not Electron or Tkinter?
**Answer:** I wanted a React UI and one command to start, without a second runtime like Node-in-Electron. pywebview uses the system web view and lets me open an always-on-top frameless overlay.
**If they push further:** The brief suggested Tkinter or PyQt. React gave me typed, testable screens and the design system. The cost is that Windows needs the WebView2 runtime.

### Why WebSocket and not Server-Sent Events?
**Answer:** It is two-way. The windows send their focus state, so the engine does not press keys into a WaveSlide window, and acknowledgements for latency. The server also pushes up to about 30 frames a second.
**If they push further:** Slow data (settings, sessions) still uses plain REST.

### Why JSON files and not a database?
**Answer:** There is one settings object and append-only session files. Files are easy to inspect, export and hand in. A database would add migrations for no benefit.
**If they push further:** Settings carry a `schema_version` and a `migrate()` step, so the format can still change safely.

## Likely questions
### Problem and scope
1. **Q:** What problem does this solve? **A:** A presenter tied to the laptop or a clicker can control slides from a distance using only the built-in webcam.
2. **Q:** What is new compared with existing gesture presenters? **A:** Little is new, and the brief says so. The focus is execution: reliability controls, finger-count jump, a settings screen, replayable testing and a full evaluation harness. Existing systems should be cited from the report notes, each marked verify before citing.
3. **Q:** Which apps does it support? **A:** PowerPoint, Google Slides in a browser and PDF viewers, through profile JSON files in `backend/app/keys/profiles/`. A "practice" profile drives the in-app deck. Real tests in those apps have not been run yet (PROFILE_CHECKS.md).
4. **Q:** What is out of scope? **A:** Mobile, multiple presenters, long range, voice, laser pointer, drawing, special hardware, Linux.
5. **Q:** Does it send video anywhere? **A:** No. It binds to 127.0.0.1, uses no network service, and sessions store landmarks only, never pixels.

### Design and architecture
6. **Q:** Why is `core/` free of FastAPI and OpenCV? **A:** So it takes landmarks and timestamps only. It then runs on recorded sessions and in CI with no webcam.
7. **Q:** How does replay work? **A:** `ReplayLandmarkSource` reads a JSONL session of landmark frames and feeds them to the same pipeline as the camera does.
8. **Q:** How does the UI stay in sync with the engine? **A:** One WebSocket client with reconnect. Frames update the screen, and events such as settings changes refresh TanStack Query caches.
9. **Q:** What stops a web page in my browser controlling the app? **A:** The server binds to 127.0.0.1, the WebSocket closes on a foreign `Origin`, and CORS allows only the Vite origin.
10. **Q:** What is the contract and why? **A:** Pydantic models in `backend/app/contract/` are the source. `npm run contract` generates `openapi.json` and `schema.d.ts`, so frontend and backend types cannot drift.
11. **Q:** How do app profiles work? **A:** A JSON file per app lists key sequences per action for each operating system. Jump is either typing the number and Enter (PowerPoint) or `Home` then stepping right (PDF). A shortcut fix is a data edit.

### The interesting core
12. **Q:** How do you decide a finger is extended? **A:** The joint angle at its middle joint is nearly straight (under 35 degrees of bend) and the tip is farther from the wrist than that joint. The thumb uses its own joint angle and distance from the index knuckle.
13. **Q:** How do you tell an open palm from five fingers? **A:** Spread, the mean gap between neighbouring fingertips divided by hand length. At 0.45 or less it is OPEN_PALM (fingers together); above it, COUNT_5. This is a threshold in Settings (`palm_spread_max`).
14. **Q:** What does the One Euro filter do? **A:** It is a moving average whose cut-off rises with speed. A still hand is smooth, and a fast swipe is not delayed.
15. **Q:** How is a swipe detected? **A:** Palm centre travel of at least 2.0 hand lengths within 500 ms, vertical drift at most half of the horizontal travel, and peak speed at least 4 hand lengths per second.
16. **Q:** How do you stop a swipe's return motion firing the opposite command? **A:** There is no special return-stroke rule in `core/swipe.py`. The 800 ms cooldown in `core/reliability.py` ignores every intent after a command, which covers a quick return. A slow return after the cooldown could fire the opposite swipe, if it also meets the travel and speed thresholds. This has not been tested on a real hand (TODO(verify) on hardware).
17. **Q:** How is the hold ring drawn? **A:** The engine sends `hold {action, label, progress}` in each frame; progress is elapsed time divided by hold time.
18. **Q:** Which hand is the presenter? **A:** The one with the largest landmark bounding box, assumed closest. A nearer person takes over; that is a stated limitation.
19. **Q:** What is the time complexity per frame? **A:** Constant. There are 21 points per hand and a 0.5 s buffer. The cost is dominated by MediaPipe.
20. **Q:** Why does the app start paused? **A:** So it cannot do anything until the presenter deliberately activates it with a held thumbs-up. This is the `start_paused` setting.

### Data and security
21. **Q:** What is stored? **A:** `data/settings.json`, landmark sessions, a model file with a model card, evaluation runs and command logs. All local and gitignored.
22. **Q:** Are there secrets? **A:** None. `.env` only holds the port, source and key-mode settings.
23. **Q:** What if the model file was trained with a different feature version? **A:** It is loaded only if `feature_version` matches, otherwise it is not loaded (`ml/store.py`) and the app reports that no model is available.

### Testing and evaluation
24. **Q:** How did you test without a webcam? **A:** Replay sources and `RecordingSender`. At the last check, 315 backend tests and 104 frontend tests passed, and CI runs lint, typecheck and tests on macOS and Windows runners. Playwright journeys cover the screens.
25. **Q:** What accuracy does it have? **A:** I do not have a real figure yet. The synthetic evaluation shows 100% on most gestures and 94.7% at 1.5 and 2 m, but that data is generated by my own code so it only proves the harness works. The real study protocol is in `eval/PROTOCOL.md`.
26. **Q:** Why include synthetic data at all? **A:** It makes the demo, tests and evaluation runnable on any machine, and it is clearly labelled on every number and in the UI.
27. **Q:** How do you measure response time? **A:** Every command logs `pipeline_ms` from frame hand-over to key sent. Synthetic median is 0.09 ms (E4). That excludes camera exposure and MediaPipe time. Real end-to-end latency has not been measured yet.
28. **Q:** What does the confusion matrix tell you? **A:** Which gestures are mixed up. In the synthetic rules matrix the main errors are NONE read as COUNT_1 (366 frames) and COUNT_4/COUNT_5 neighbours. Synthetic noise, so it will differ on real data.
29. **Q:** How would you test lighting and distance? **A:** Record `gestures` sessions at 0.5, 1, 1.5, 2 m and bright, normal and dim light with Dataset, then `npm run eval`. The recorder stores measured luminance with each session.
30. **Q:** What did the hardware checks show? **A:** They are not run yet. I would say that directly and run the checks before the viva.

### Limitations and future work
31. **Q:** What happens with two people in view? **A:** The largest hand wins. Presenter lock is future work.
32. **Q:** What is the 0.5 s response target worth? **A:** Swipes fire mid-motion, so they meet it. Held poses add a deliberate 0.8 to 1.0 s hold, which is the safety against misreads. I would explain that is a trade, not a bug.
33. **Q:** What would you do with more time? **A:** Run the real study, check the hardware on both operating systems, add presenter lock, and let users record custom gestures.
34. **Q:** Why no Intel Mac or Linux? **A:** MediaPipe 1.1 ships macOS wheels for Apple Silicon only, and I scoped to macOS and Windows.

## Limitations, said honestly
| Limitation | How to say it | What you would do next |
|---|---|---|
| Evaluation is synthetic | "The numbers prove the harness works end to end. They are not measurements of people." | Run `eval/PROTOCOL.md` with at least 3 participants, then `npm run eval` |
| Hardware checks not run | "The key injection into PowerPoint, Slides and Acrobat is covered by profile data and tests with a recording sender, but I have not yet recorded the manual results." | Fill the table in `docs/PROFILE_CHECKS.md` on a Mac and a Windows laptop |
| Some shortcuts unconfirmed | "PowerPoint for Mac blank `B` and start-from-current, and Google Slides jump and blank, are not confirmed in official docs." | Test them, edit the profile JSON if needed |
| One presenter only | "The largest hand wins." | Presenter lock |
| Thumb confusions (4 vs 5, 5 vs palm) | "The hold ring is the safety net." | Look at real confusion matrices and tune the spread threshold |
| Apple Silicon only on Mac | "A MediaPipe wheel limit." | Document it and use a supported machine |

## Live demo recovery lines
| If this happens | Say / do |
|---|---|
| Camera black or unavailable | "The webcam is busy. I will switch to a recorded session, which goes through the same pipeline." Use the Live camera/replay switch or `npm run dev:replay` |
| Gestures recognised but slides do not move | "The slideshow needs keyboard focus." Click the slideshow. On macOS, check Accessibility permission |
| It will not activate | "Control starts paused by design." Hold thumbs-up still for a full second |
| A jump goes to the wrong slide | "That is why the ring exists: I should hold still for it to confirm the count." Redo it |
| Dataset or Evaluation empty | "I need to seed the demo data." Run `npm run seed` in a second terminal |
| App will not start | Show `docs/screenshots/` and `docs/EVALUATION.md`, and walk the architecture instead |
