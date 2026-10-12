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
| Check | How | macOS | Windows |
|---|---|---|---|
| PowerPoint: activate, next, previous, jump to 4, blank, start and exit slideshow | | | |
| Google Slides in Chrome: same gestures | | | |
| Adobe Acrobat Reader full screen: next, previous, jump | | | |
| Overlay never takes focus from the presentation (`focus=False`) | | | |
| Missing Accessibility permission shows the fix on Live | | | n/a |

## Phase 2
| Check | How | macOS | Windows |
|---|---|---|---|
| Guided recording appears in Dataset with luminance | | | |
| Train, then switch Settings to the trained model live | | | |

## Shortcuts not confirmed by official docs
- PowerPoint for Mac: blank screen `B` and start from current slide `⇧⌘↩`.
- Google Slides: jump (number + Enter) and blank (`B`) in presenter mode.
