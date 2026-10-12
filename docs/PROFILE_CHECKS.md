# WaveSlide: hardware and app checks (manual)

Things CI cannot test: a real webcam, real key presses into presentation apps, and native
window behaviour. Run them by hand and record the result (date, ✅ or ❌ with a note).
macOS runs on the developer's Mac; the Windows column is filled on a Windows laptop before ship.

## Phase 0
| Check | How | macOS | Windows |
|---|---|---|---|
| Camera preview and live landmarks | `npm run dev`, open `/api/preview.mjpg` and `/overlay` in the browser, hold a hand up | | |
| Engine fps ≥ 20 with a webcam | `npm run dev`, then `curl localhost:8765/api/engine` and read `fps` | | |
| One-command desktop | `npm start`: the settings window and a frameless, always-on-top overlay at the top right | | |

## Phase 1
Setup for every row: `npm start` (settings window plus overlay), open the presentation app with a
10-slide deck in slideshow mode, click the slideshow once so it has keyboard focus, then show a
thumbs-up for 1 s ("Live"). Use the matching profile in Settings. Gestures: swipe right = next,
swipe left = previous, hold 1-5 fingers still for 1 s = jump, open palm held still for 0.8 s = blank,
fist held for 1 s = start slideshow, thumbs-down held for 1 s = exit.
| Check | How | macOS | Windows |
|---|---|---|---|
| PowerPoint: activate, next, previous, jump to 4, blank, start and exit slideshow | Profile PowerPoint. Activate, swipe right then left, show four fingers (the deck goes to slide 4), palm (screen goes black), palm again (back), thumbs-down (exit), fist (start from the current slide). Look at the Live log: each row shows keys and a latency under 80 ms | | |
| Google Slides in Chrome: same gestures | Profile Google Slides, present the deck in Chrome. Same sequence. Note whether jump (`4`, `Enter`) and blank (`B`) work: Google documents them inconsistently | | |
| Adobe Acrobat Reader full screen: next, previous, jump | Profile PDF viewer, `Ctrl/Cmd+L` for full screen. Swipe right and left, show three fingers (goes to page 3 through `Home`, `Right`, `Right`). The palm shows "Not sent: PDF viewer has no shortcut for this" in the log | | |
| Overlay never takes focus from the presentation (`focus=False`) | While presenting, do a gesture and watch the slides: the overlay must not take keyboard focus and must not flash the window in front of PowerPoint or Chrome. Then click the overlay's pause button: if it cannot be clicked, restart with `uv run --directory backend python -m app.desktop --overlay-focus` (the focus guard then blocks keys while the overlay has focus) and note the fallback here | | |
| Missing Accessibility permission shows the fix on Live | System Settings, Privacy and Security, Accessibility: switch the terminal (or Python) off, reload Live. The setup check must show the problem with the fix steps and the command log must say "Accessibility permission is missing", not fail silently. Switch it back on and press Re-check | | n/a |
| Focus guard | Click into the WaveSlide settings window and do a swipe: the log row says "Not sent" with the reason and the overlay shows the warning. Open `/practice` and swipe: the deck moves | | |
| Live fps and latency | Live screen with a webcam: fps at least 20 and pipeline p95 (capture to key) under 80 ms over 30 s of gestures | | |
| Camera switch | Settings camera select with two cameras (or the replay switch on Live): the preview changes without restarting, and an unplugged camera shows "Camera unavailable" with a retry | | |
| Overlay sizes | Overlay compact button: 220 x 56 strip, full button: 340 x 280, hide: the window disappears; each stays at the top right, 16 px in | | |
| Demo replay | `npm run dev:replay` with `/practice` open: slide 2, 3, back to 2, jump to 3, blank and unblank, then "Paused", with no other command | | |

## Phase 2
| Check | How | macOS | Windows |
|---|---|---|---|
| Guided `gestures` recording appears in Dataset with luminance | `npm start` with a webcam, open Dataset, Record session (protocol gestures, one participant, 1 m, normal light), follow the prompts, Stop and save. The row must show frames and a luminance value, and no key may press during recording | | |
| Train a model from recorded sessions | With at least 2 participants recorded, Dataset, Train model. The model card shows LOPO macro-F1. With one participant it must say there is not enough data | | |
| Switch Settings to the trained model live | Settings, Recogniser: ML, Save. The overlay badge reads "ML" with a confidence; present with PowerPoint and check next, previous and jump still work. Restart the app: the badge must still read "ML" | | |
| Two-hand count in a real deck | Settings, two-hand on. Hold five fingers on one hand and two on the other, still, for 1 s: jump to slide 7. With two-hand off the same pose must not jump above 5 | | |

## Shortcuts not confirmed by official docs
- PowerPoint for Mac: blank screen `B` and start from current slide `⇧⌘↩`.
- Google Slides: jump (number + Enter) and blank (`B`) in presenter mode.
