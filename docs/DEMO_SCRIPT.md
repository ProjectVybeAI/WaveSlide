# WaveSlide: Demo script (8-9 minutes)

Honest status for the examiner: the live-webcam parts below have not yet been run on a real presentation app (see `docs/PROFILE_CHECKS.md`). Rehearse them on your own laptop before the viva. The replay parts are the safe fallback and are covered by automated tests.

## Before you start
- [ ] `npm run seed` run on this machine (the Dataset and Evaluation screens are empty without it)
- [ ] `npm start` runs and both windows open (settings window and overlay at the top right)
- [ ] Camera and (macOS) Accessibility permission granted to your terminal
- [ ] A 10-slide deck open in PowerPoint (or a PDF in a viewer), in slideshow mode, ready to switch to
- [ ] Settings profile matches the app you will show
- [ ] Notifications off, window at least 1280 px wide, room lit from the front, you standing about 1 m from the webcam
- [ ] Backup: a second terminal where `npm run dev:replay` works, with http://localhost:5173/practice
- [ ] Gesture cheat sheet: thumbs-up 1 s = on/off, swipe right = next, swipe left = previous, 1-5 fingers still 1 s = jump, open palm (fingers together) still 0.8 s = blank, fist 1 s = start show, thumbs-down 1 s = exit

## Script
| # | Time | Do (click by click) | Say | If it fails |
|---|---|---|---|---|
| 1 | 0:00 | Show the Live screen (`/`) with the overlay at the top right. | "Presenters are tied to the laptop or a clicker. WaveSlide uses the webcam they already have to change slides by hand gestures." | "Let me show the same thing from a recording." Go to step 12. |
| 2 | 0:45 | Point to the overlay: preview, landmarks, state badge reading Paused. | "The camera finds 21 points on my hand. Everything after that uses only those points, no video is saved. It starts paused, so waving my hands while talking does nothing." | If the preview is black, Settings, Camera, pick another camera, or use the camera/replay switch on Live. |
| 3 | 1:30 | Hold thumbs-up still for 1 s. Watch the hold ring fill, then the badge change to Active. | "A thumbs-up held for a second turns control on. The ring shows it filling, so I can pull back if it was a mistake." | Hold the pose steadier, palm side facing the camera, and a little closer. As a last resort use the overlay's own pause button if it shows one (TODO(verify): not checked on hardware). |
| 4 | 2:15 | Switch to the open slideshow. Click once on it so it has focus. Swipe right, swipe left. | "A swipe is measured in hand lengths, so it works at 0.5 m and at 2 m. After a command there is an 800 ms cooldown so one swipe cannot skip two slides." | If keys do nothing, the slideshow lacks focus: click it. On macOS check Accessibility permission. |
| 4b | 3:00 | Show four fingers, still, for 1 s. | "Holding fingers jumps to that slide. The ring fills first, so I can change my mind." | Show the fingers closer and more still. Say "that is the hold-to-confirm protection working". |
| 5 | 3:30 | Show an open palm, fingers together, for 1 s: screen goes black. Again: it returns. | "Palm blanks the screen. The re-arm rule means holding it for five seconds blanks once, not repeatedly." | If the app is a PDF viewer: "PDF viewers have no blank shortcut, the log says so." |
| 6 | 4:15 | Return to the WaveSlide window, open Live, show the command log. | "Each command shows the keys sent and the time the pipeline took, from frame to key." | If the log is empty, you were paused or unfocused: repeat step 3. |
| 7 | 5:00 | Open `/settings`. Change next from swipe right to another gesture, show a conflict message if you pick one already used, save. Then press reset. | "Mappings, sensitivity, timing, camera, app profile and recogniser are all editable and saved to a JSON file. The app refuses two actions on one gesture." | If save is rejected, read the message aloud and fix it. Reset to defaults solves most problems. |
| 8 | 5:45 | Open `/practice`. Do a swipe and a jump. | "This practice deck lets anyone try gestures without a presentation app." | Use the keyboard arrows on the deck, then say "the deck is driven by the same keys". |
| 9 | 6:15 | Open `/dataset`. Show the seeded sessions list. Do not start a recording unless you have time. | "I can record landmarks only, with participant, distance and lighting. These seeded ones are synthetic." | If empty: "I forgot to seed, `npm run seed` fills it." |
| 10 | 7:00 | Open `/evaluation`. Show the synthetic-data banner, rules versus random forest, and the ablation chart. | "All of these numbers are from synthetic sessions. They show the harness works, not how well it works on people. The ablation shows that without hold-to-confirm the synthetic talking session produced 24 false triggers a minute, against 0 with everything on." | If charts do not render, open `docs/EVALUATION.md` in an editor. |
| 11 | 8:00 | Settings, Recogniser: ML, save. Show the overlay badge. | "The random forest replaces only the pose step, so the comparison is fair. Rules are the default." | If it says there is no model, run `npm run seed`. |
| 12 | 8:30 | (Backup path, or if time) In another terminal `npm run dev:replay`; open `/practice`. | "This replays a recorded landmark session through the same pipeline. It is how tests and CI run with no webcam." | Skip to the closing line. |

## Closing line
"WaveSlide shows a complete real-time vision pipeline with reliability controls and a measured evaluation harness. Next I would run the participant study from the protocol, so the results are real, and add presenter lock so only one person controls the deck."
