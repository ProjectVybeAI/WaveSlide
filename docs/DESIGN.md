# WaveSlide: Interface design

<!-- fingerprint (read by vybe design-direction; keep in sync with the registry)
direction: Cue (stage-management cue light and the broadcast tally: Standby, then Go; graphite console, cobalt running light)
display_font: Sofia Sans Extra Condensed
text_font: Sofia Sans
mono_font: Red Hat Mono (key caps and file names only)
accent_hue: 260 (cobalt oklch(56% 0.19 260) #276ee1; light step oklch(78% 0.11 255) #87bafd for strokes, focus and passed ticks)
theme: dark (one theme; the overlay is dark by necessity, the settings window matches it)
layout_archetype: broadcast console (camera monitor with a tally edge, a cue panel and a running session log) plus a fixed-size always-on-top overlay HUD; settings as label-column sections
signature_element: the cue dial, a lamp disc that fills clockwise while a held gesture is on standby, one tick per 100 ms of the hold, the target numeral inside, solid on Go, draining through the cooldown
peak_moment: Standby to Go, the held count fills the dial, the disc turns solid, the last-command line takes the keys and latency, and the cooldown drains (practice deck: the deck strip's marker slides to the new slide)
density: compact (36 px controls); the overlay is sized for a glance from 2 m
radius_family: sharp (1 / 2 / 3 px); circles only for things that are round (dial, lamp, dots)
kit_looks: tabs=segmented button=ink pill=dot table=ruled input=filled header=banded
-->

Prototypes (the visual spec, build to match): `design/prototype/`. Serve them with
`python3 -m http.server 4191 --directory design/prototype` and open `http://127.0.0.1:4191/hero-a.html`.
Screenshots: `design/prototype/screenshots/` (1440, 768 and 390 wide, contact sheets, and 2x crops of both overlays).
App screenshots once built: `npm --prefix frontend run shots` writes to `frontend/screenshots/`; curated ones live in `docs/screenshots/`.

| Prototype | Route or surface | Shows |
|---|---|---|
| `hero-a.html` | `/overlay` over PowerPoint (demo opens here) | Lecturer's slide 5 in slideshow; the overlay top right: Live band, camera with the counted hand (three fingers numbered 1-3), the cue dial at 70% on "Slide 3", last command and latency |
| `overlay.html` | `/overlay?state=` | Every overlay state at real size: paused, going live, live ready, standby, go, cooldown and re-arm, cancelled, swipe, blank, no hand, not sent (focus guard), camera unavailable, over a dark slide, and three compact strips |
| `live.html` | `/` Live | Setup check, camera monitor with tally edge and UMD caption, the dial at 168 px, what the recogniser sees, engine figures, the session log |
| `settings.html` | `/settings` (dirty, mapping conflict) | Gesture mapping with pose glyphs and an inline conflict, feature switches, sensitivity faders with defaults marked, timing with dial previews, camera and app profile with its keys, recogniser, overlay, sticky save bar |
| `practice.html` | `/practice` after a jump to 3 | The slide, the deck strip ("Here now", "Jumped from"), latency to the slide on screen, gestures to try |
| `evaluation.html` | `/evaluation` (synthetic data) | Synthetic banner, section tabs, headline strip, E7 confusion matrices side by side, E5 distance, E6 lighting, ablation, E4 latency, E1 table |
| `evaluation-empty.html` | `/evaluation`, no runs | Empty state with what a real run needs; sidebar in the Paused state |
| `hero-b.html` | none | Rejected direction B ("Rig"), kept for the record |

## Fingerprint check
Last three projects in the registry: TARA, ClaimSafe, RoadBond.

| Dimension | WaveSlide | TARA | ClaimSafe | RoadBond |
|---|---|---|---|---|
| Display typeface | Sofia Sans Extra Condensed | Atkinson Hyperlegible Next | Zilla Slab | Archivo |
| Text typeface | Sofia Sans | Atkinson Hyperlegible Next (+ Noto) | Instrument Sans | Public Sans |
| Accent hue | 260 cobalt | 199 lagoon (61° apart) | 340 mulberry (80° apart) | about 259 signal blue (same) |
| Surface | dark graphite, one theme | light cool paper (+ Dim) | light pink-tinted paper | light |
| Layout archetype | broadcast console + overlay HUD | instrument dashboard + service flow + overlay layer (same family) | queue triage + service form | map-first + record panel |
| Shape (radius + density) | sharp 1-3 px, compact 36 px | 4/8/12 px, comfortable 48 px | 4/6/8 px, mixed | 4 px, neutral |
| **Differs on (of 6)** | | **5** | **6** | **5** |

Notes: the hue repeats RoadBond (three projects back, allowed; the rule binds the last two). It was not picked for variety: blue is the only hue that stays apart from the amber "Not sent" warning for red-green colour-blind presenters (see Colour). The layout family is shared with TARA because both put a camera-driven HUD over other apps; WaveSlide's Live screen is a monitor with a tally edge and a running log, not TARA's ranked candidates and lens figure.

## Who it is for, and what that means for the UI
- **The presenter** is a final-year student or a lecturer giving a 10-20 minute talk from their own laptop in a classroom or seminar room, standing 0.5-2 m from the webcam, often with the lights dimmed for the projector. During the talk they see WaveSlide only as the **overlay**: a 340 × 280 window in the corner of the laptop screen, glanced at from a distance, sometimes also visible to the audience when the screen is mirrored. They are anxious about three things: a slide changing while they gesture as they talk, a gesture being missed in front of the room, and setup eating the first minutes of their slot.
- **The same person, at the desk**, opens the settings window before the talk: checks the camera, permissions and profile, tunes sensitivity, tries the practice deck. Mouse and keyboard, a few minutes, sometimes in the room itself.
- **Classmates in the user study** use it once, for a short talk, with no setup of their own.
- **The examiner** watches a projector: the live pipeline (landmarks, pose, the hold, the key), the reliability controls doing their job, and measured numbers with a confusion matrix.

Consequences:
1. **The overlay is read from 2 m, so only two things are big: the state and the target.** A 40 px tally band in a full field of colour (cobalt means gestures act, grey means paused) and the dial's numeral. Everything else in the overlay is for a close look or for the examiner.
2. **Nothing fires without warning.** Every held gesture shows "Standby" and its target before it acts, with time left and how to cancel; swipes show what they did straight after. Words carry every state; colour only reinforces.
3. **Dark, because of where it lives.** The overlay floats over white slides and must read as a separate object; the rooms are dimmed; presentation and broadcast tools are dark for the same reasons. Contrast is set for a projector: hairline borders do the separating, not faint surface steps.
4. **Compact at the desk, specific everywhere.** The settings window is a tool used for minutes: 36 px controls, 15 px text, units on every number ("hand lengths", "ms"), defaults marked on every fader.
5. **The examiner reads numbers.** Tabular figures, the confusion matrices as real tables, a synthetic-data banner whenever numbers are not from people.

## References (the bar we are held to)
| Product | What we take from it |
|---|---|
| [QLab](https://qlab.app) (Figure 53), the theatre cue workspace | The stage-management sequence: a cue is put on **standby** and shows what it will do before **GO** fires it. Our overlay and Live screen say "Standby, jump to slide 3", then "Go"; the session log is numbered like a cue list. |
| [Keynote presenter display](https://support.apple.com/guide/keynote/play-a-presentation-on-a-separate-display-tana4da2681/mac), "Ready to Advance" indicator | One coloured bar across the top of the presenter's view that answers "will my next action go through?" at a glance. Our tally band is exactly that, sized to read from 2 m. |
| Broadcast multiviewers (Ross Acuity, Vizrt Mosart tally, Blackmagic ATEM) | The tile border lit in the tally colour when a source is live, and the under-monitor display (UMD): a black strip in condensed type naming the source. Our camera monitor's 2 px tally edge and the UMD caption ("Three fingers", "Camera 0, mirrored"). |
| macOS System Settings › Trackpad › More Gestures | Each gesture is a row with a pop-up for what it does and a picture of the gesture. Our mapping table: action, a gesture select led by the pose glyph, and when it fires. |
| Xbox 360 Kinect dashboard, hover to select | Hold still and a progress circle fills; move away and it cancels. We keep the dwell and the cancel, and add what Kinect lacked: one tick per 100 ms and the target inside the circle. |

Rubric criterion 10 is judged against these.

## Direction
**Cue.** A presenter is already inside a cueing system: theatre calls "Standby" before "Go" so nothing fires early, and a studio camera's tally light tells the person in front of it whether it is live. WaveSlide's reliability controls are that system for one person and a webcam, so the interface borrows its structure: a tally band that is either lit (Live) or not (Paused), a cue dial that puts a gesture on standby and shows its target before it goes, and a running log of what was sent. A graphite console with condensed signage type (Sofia Sans Extra Condensed, like a UMD) makes the state words and numerals large inside a small window; Sofia Sans carries everything read. Cobalt is the only colour that is not a status: it means "gestures act" (the band) and "about to act" (the sweep).

Rejected alternative: **Rig** (`hero-b.html`): the motion-capture bench. Warm graphite, rig orange, Martian Mono readouts with Hanken Grotesk, a 2 px orange "Armed" frame, measurement overlays on the camera (a 1-hand-length ruler, joint bend angles, crop marks), a linear hold track and readouts for palm speed, spread and pipeline time. It is honest about the engineering and would suit an examiner, but (1) nothing in it is readable from 2 m, so the presenter cannot use it mid-talk; (2) orange "Armed" and the amber warning collapse into one colour for red-green colour-blind presenters, exactly the pair that must differ; (3) on a mirrored projector it reads as a debug HUD in front of the audience. Its best idea survives in the Live screen's "What the recogniser sees" panel and the Settings unit diagram.

What is deliberately not here: no neon glow, no gradients (the only gradient is the hazard hatch on "Not sent", which is a pattern that carries meaning), no glass, no MediaPipe rainbow fingers, no hand or wave emoji, no ALL CAPS labels, no stat cards, no stock photos.

## Type
| Role | Family | Size / line height | Weight | Use |
|---|---|---|---|---|
| Dial numeral | Sofia Sans Extra Condensed | 46% of the dial's size (48 px in the 104 px overlay dial, 77 px on Live; `--text-3xl` 56 px is the CSS step for headline numerals) | 800 | The target inside the cue dial; the practice slide number |
| State word | Sofia Sans Extra Condensed | 24 px `--text-xl` (overlay band, compact), 32 px `--text-2xl` (Live "Standby") / 1 | 760 | Live, Paused, Standby, Go, Cooldown, Not sent |
| Page title | Sofia Sans Extra Condensed | 32 px `--text-2xl` / 1.1 | 760 | h1 in the banded header |
| Section | Sofia Sans Extra Condensed | 24 px `--text-xl` (h2), 19 px `--text-lg` (h3, panel titles) / 1.1 | 760 | Section headings, UMD captions (15-19 px, 650) |
| Body | Sofia Sans | 15 px `--text-md` / 1.5 | 420; 540-650 for labels and buttons | Everything read |
| Small | Sofia Sans | 13 px `--text-sm` / 1.5 | 420-650 | Help text, dense tables, the session log |
| Label | Sofia Sans | 12 px `--text-xs` / 1.3 | 650 | Table heads, axis ticks, units after a figure |
| Mono | Red Hat Mono | 12-13 px | 540 | Key caps (`→`, `Enter`, `⇧`), file names. Never figures, never labels. |

- Scale: 12 / 13 / 15 / 19 / 24 / 32 / 56 px (about 1.27 between 15, 19, 24 and 32). No other sizes in CSS; SVG text inside the dial and hand scales with the drawing.
- Figures: `font-variant-numeric: tabular-nums` on every number that changes or aligns (latency, fps, the log, tables, faders). Sofia Sans and its Extra Condensed cut both ship `tnum`.
- Never letter-space, never ALL CAPS. Sentence case everywhere, including state words.
- Packages: `@fontsource-variable/sofia-sans`, `@fontsource-variable/sofia-sans-extra-condensed`, `@fontsource-variable/red-hat-mono` (self-hosted, offline). The prototype's `fonts.css` uses the same files.

## Colour
One dark theme. OKLCH in `tokens.css`, hex for reference. Neutrals are graphite tinted toward the accent hue (h 255).

| Token | OKLCH | Hex | Means |
|---|---|---|---|
| --color-bg | oklch(21% 0.009 255) | #16191c | page |
| --color-surface | oklch(24.5% 0.01 255) | #1d2125 | overlay body, banded header, panels |
| --color-surface-raised | oklch(28.5% 0.011 255) | #262a30 | current nav item, active segment, save bar |
| --color-surface-sunken | oklch(17.5% 0.008 255) | #0e1114 | sidebar, dial disc, filled inputs, UMD strip |
| --color-border | oklch(35% 0.012 255) | #363b41 | rules (visible on a projector) |
| --color-border-strong | oklch(58% 0.014 255) | #757b83 | input edges, overlay keyline, unpassed ticks |
| --color-text | oklch(95.5% 0.004 255) | #eef0f3 | text; also the fill of primary (ink) buttons |
| --color-text-muted | oklch(77% 0.01 255) | #b0b5bb | secondary text |
| --color-text-subtle | oklch(61% 0.012 255) | #7e848a | placeholders, default markers, disabled |
| --color-accent | oklch(56% 0.19 260) | #276ee1 | **the running light**: the Live band, the dial sweep, the current nav bar, switch on, fader fill, selection |
| --color-accent-hover | oklch(50% 0.185 262) | #215aca | hover on accent fills |
| --color-accent-subtle | oklch(31% 0.07 258) | #183053 | the fresh "Last" line after Go, current deck slot, selected rows |
| --color-on-accent | oklch(99% 0.003 255) | #fafcfe | text and icons on cobalt (4.64:1) |
| --color-focus / --color-signal | oklch(78% 0.11 255) | #87bafd | focus ring; what the recogniser counts (extended fingers, passed ticks) |
| --color-paused | oklch(38% 0.012 255) | #3e4349 | the band when Paused or no hand |
| --color-video | oklch(14% 0.008 255) | #07090c | behind the camera image; bone casings |
| --color-success | oklch(76% 0.14 155) | #5ccb89 | allowed, ready, sent |
| --color-warning | oklch(82% 0.14 80) | #f3b94c | not sent, synthetic data, needs attention |
| --color-danger | oklch(69% 0.18 27) | #f7665b | camera lost, permission missing, conflict |
| --color-info | oklch(76% 0.05 230) | #91b8cb | neutral facts (profile) |
| --color-ink-on-light | oklch(19% 0.025 255) | #0c141f | text on warning, danger and light heat-map fills |
| --color-slide-paper / -ink / -muted | 98.5% / 22% / 46% L | #f9fafb / #171b20 / #54585f | the practice deck's slides |
| --color-chart-1 / -2 | dataviz dark slots 1-2 | #3987e5 / #d95926 | rules / trained model, everywhere |
| --color-seq-1 … -7 | dataviz blue ramp | #0d366b … #cde2fb | confusion-matrix heat (0 shows the surface) |

Rules:
- **Colour only ever means something.** Cobalt means "gestures act" or "about to act". Grey means paused. Green, amber and red are status and always come with a word (and an icon where there is room). The slide is someone else's colour; WaveSlide never tints it.
- **Why blue.** Tested with a deuteranopia simulation (Machado 2009): a green or chartreuse Live band and the amber "Not sent" band became the same yellow; amber "Live" was the same as the warning even without simulation. Cobalt stays blue for red-green colour-blind presenters, about one in twelve men in the room. "Not sent" also carries a hazard hatch, so it differs in pattern, not only hue.
- **Primary buttons are ink** (paper-white on graphite), so cobalt is never spent on Save or Export.
- Charts take the dataviz reference palette's dark slots (validator: CVD ΔE 26.8, normal-vision ΔE 31.8 on `#1d2125`); rules are always slot 1 and the trained model slot 2. Heat cells under 25% use light text, from 25% up `--color-ink-on-light` (all pairs 5.8:1 or more).
- Contrast: `contrast.mjs design/prototype/tokens.css` passes all 20 pairs (text 15.5:1, muted 8.6:1, on-accent 4.65:1, accent on bg 3.7:1). Extra pairs checked by hand: on-live on the band 4.64, ink on danger 6.17, ink on warning 10.4, slide-muted on paper 6.84, text on paused band 8.74.

## Space, shape, depth
- Spacing: 4 px base; 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 (`--space-1` to `--space-16`). Related items 8-12, groups 24, sections 32-48.
- Density: compact. `--control-height` 36 px; small buttons and segments 32 px; overlay tool buttons 30 px; switch rows and faders 46 px tall to fit the default marker. The overlay is a fixed 340 × 280 (compact 220 × 56).
- Radius: sharp, `--radius-sm` 1 px, `--radius-md` 2 px, `--radius-lg` 3 px (overlay window, dialogs). Round only where the object is round: the dial, the lamp, status dots, switch thumbs. Chart bars use 3 px data ends.
- Depth: borders and surface steps. One shadow, `--shadow-overlay`, for things that float: the overlay window over other apps, menus, dialogs.

## Layout
- **Overlay (hero).** Fixed grid: 40 px tally band (lamp, state word, profile or hint, pause/compact/hide), body (184 × 138 camera with a 24 px UMD caption; the dial column with the state word and target), 44 px "Last" line (action, key caps, latency), and a 3 px cooldown bar along the bottom edge when cooling down. Top right of the screen, 16 px in. Compact strip: band, 44 px dial, one line of text.
- **Settings window shell.** 232 px sidebar: wordmark, the **tally block** (Live/Paused with Pause or Go live, always visible), navigation (Live, Settings, Practice deck, Dataset, Evaluation lab), engine facts at the foot. Banded page header with actions on the right. Under 960 px the sidebar becomes a top bar with scrolling nav and the tally block stays first.
- **Live.** Setup check strip (four ruled cells), then camera monitor (7) beside the cue panel (4): dial at 168 px, what the recogniser sees, engine figures; then "Sent this session" full width. One column under 1180 px.
- **Settings.** Sections with a 264 px explanation column and controls on the right, ruled between; sticky save bar naming what changed. Under 560 px the mapping table becomes one block per action.
- **Practice deck.** The slide at 16:9 with the deck strip under it; a 300 px rail with the last jump's latency and gestures to try. One column under 1180 px; the strip wraps to 5 per row on phones.
- **Evaluation lab.** Synthetic banner, section tabs, a ruled headline strip of five figures (not cards), then the report sections. The build keeps **report order** (E1 to E8, then the ablation) under the headline strip, as PLAN.md says; the prototype leads with E7 only to show the densest part.
- Widths: content is fluid to 1440 px; breakpoints 360 / 768 / 1024 / 1440 with layout switches at 560, 960 and 1180 px. Nothing scrolls sideways except a confusion matrix inside its own wrapper.

## Signature element: the cue dial
A lamp disc that shows a held gesture on standby. Its parts all carry information:
- **Ticks:** one per 100 ms of that gesture's hold time (10 for a finger count at 1.0 s, 8 for the palm at 0.8 s), so the hold setting is visible in the object. Ticks the hold has passed turn `--color-signal`.
- **Sweep:** cobalt, clockwise from 12 o'clock, driven by `frame.hold.progress` (data, not animation). The numeral is drawn twice and clipped, so it stays legible as the sweep passes under it (paper outside, white inside).
- **Centre:** the target: a slide number, "Blank", "Next", "Live"; a small caption above ("Slide", "Screen", "Go").
- **States:** idle (an unlit lamp), standby (filling), go (solid cobalt), cooldown (a grey arc draining anticlockwise over `cooldown_ms`), cancelled (the sweep turns grey and the text says why).
- **Where:** overlay (104 px), compact overlay (44 px), Live (168 px), Settings timing (64 px previews that redraw their ticks with the hold slider), the dataset recorder's countdown, and the wordmark (a lamp with a three-quarter sweep).
It earns its place because hold-to-confirm, cancel, cooldown and re-arm are the brief's reliability controls, and the dial makes all four visible in one object that the presenter can read from across the room.

Supporting pattern, **the counted hand**: the 21 landmarks drawn over the camera with the fingers the recogniser counts as extended in `--color-signal`, numbered at their tips in counting order (index, middle, ring, little, thumb), and the curled ones in bone grey. It shows *why* the count is 3. Reduced to a pictogram (palm outline, straight strokes for extended fingers, stubs for curled ones), the same geometry labels every gesture in selects, the log, the practice rail and the confusion-matrix axes (`components/hand/PoseGlyph`).

## Kit looks
Set on `<html>` in `frontend/index.html`: `<html lang="en" data-tabs="segmented" data-button="ink" data-pill="dot" data-table="ruled" data-input="filled" data-header="banded">`.

| Component | Look | Why, for these users |
|---|---|---|
| Tabs (`data-tabs`) | segmented | A tool: camera or replay, rules or trained model, full or compact overlay, report sections. Segments read like hardware switches on a console. |
| Buttons (`data-button`) | ink | Primary actions in paper-white keep cobalt for "gestures act". Save must never look like the Live band. |
| Status pills (`data-pill`) | dot | A coloured dot and the word in text colour: a tally lamp. Dense setup checks and the session log need no chips. |
| Tables (`data-table`) | ruled | The session log is a cue list and reads in rows; zebra stripes wash out on projectors. |
| Inputs (`data-input`) | filled | Sunken wells read as controls on graphite without boxes everywhere in a dense settings screen. |
| Page header (`data-header`) | banded | A plain graphite page needs a clear top; the band carries the page's actions. |

The last three projects are `pre-kit`, so the 3-of-6 rule has nothing to compare against. For the record, TARA also used ink primary buttons and a dot status chip; WaveSlide differs from it on tabs (segmented vs underline), inputs (filled vs boxed) and header (banded vs inline).

## Peak moment
**Standby to Go**, in the main demo flow ("hold up three fingers and let go halfway to show the ring cancel, then hold again to jump to slide 3").
1. **Trigger:** a stable `COUNT_3` with a still palm. The three fingertips light and take their numbers 1, 2, 3 (instant; it is the data). The dial switches from idle to standby in 120 ms (colour fade only).
2. **Hold, 0-1000 ms:** the sweep follows `frame.hold.progress` at frame rate, ticks light as they are passed; the state word reads "Standby" and the line under it counts down "0.3 s left, keep still". This part is driven by data, not by `motion`.
3. **Go, at fire time (designed, `motion`):** the remaining sector fills to a solid disc in 90 ms (`--duration-go`, ease-out); the numeral's colour flips to `--color-on-accent`; the state word changes to "Go" and the target line to "Slide 3 sent".
4. **+90 ms:** the "Last" line takes the new action, key caps (`3` `Enter`) and latency, background `--color-accent-subtle`, sliding up 6 px and fading in over 160 ms. On the practice deck, the deck strip's current marker slides from slot 5 to slot 3 over 240 ms while the slide swaps.
5. **+250 ms to +1050 ms:** the disc drains anticlockwise into the cooldown arc over the real `cooldown_ms` (800 ms), the 3 px bar along the overlay's foot empties with it, and the state word reads "Cooldown" until the pose is released (re-arm).
Total designed motion: 90 + 160 + 800 ms, under 1.5 s from fire. **Reduced motion:** no tweening anywhere; the dial jumps to solid on Go, the "Last" line and deck marker appear in place, and the cooldown shows as a static arc with "Cooldown 0.8 s" in words. Built with the `motion` library in `components/hand/HoldDial` and the practice deck strip; nothing else uses it.

## Components and patterns
- **Navigation:** sidebar links with a 3 px cobalt bar on the current item; becomes a scrolling top bar under 960 px. The tally block (Live/Paused, Pause or Go live) is on every settings-window page.
- **Lists and tables:** ruled rows on graphite with a 1 px strong rule on top, sticky header, numbers right-aligned and tabular; the session log is newest first, with pose glyphs, key caps and a dot result. Blocked commands stay in the log with the reason in words.
- **Forms:** labels above or in the left column, help under the label, units after every value, the default marked under each fader (a tick and "Default 2.0"). Changed rows get a cobalt edge and a "Changed" tag; conflicts show inline under the row with the fix in words before saving; the sticky save bar lists what changed and disables Save with a reason while a conflict stands. Reset to defaults asks for confirmation; Discard does not.
- **Faders:** a project `Slider` on Radix Slider: 6 px sunken rail, cobalt fill, a 14 × 24 px paper fader cap with a centre line, `aria-valuetext` with the unit. (The kit has no slider.)
- **Feedback:** inline at the place of the action; the overlay itself is the feedback for gestures. Toasts only for background events (settings imported, model trained, camera back).
- **Empty, loading and error states:** say what will appear, why it is empty, and one action, plus what is missing (`evaluation-empty.html`). Loading uses skeletons shaped like the monitor, the dial and table rows; the live view keeps the last frame instead of blanking. Errors say what happened and what to do; the overlay shows "Camera unavailable" in its own band with a retry.
- **Icons:** Lucide, stroke 2, 16 px (20 px in empty and error states). Pose glyphs are WaveSlide's own and are never replaced by hand icons or emoji.
- **Motion:** 120 ms colour and border changes, 200 ms dialogs; route changes use View Transitions with a 120 ms cross-fade of the page body only (the sidebar and tally block do not move). The peak moment above is the only designed animation. `prefers-reduced-motion` sets all durations to 0.
- **Kit adaptations beyond the looks:** `Button.module.css` `.danger` uses `--color-ink-on-light` text on `--color-danger` (white on this red is 2.9:1); `Switch` keeps its On/Off words and uses cobalt when on. Project components live next to the kit: `TallyBand`, `HoldDial`, `HandSkeleton`, `PoseGlyph`, `Umd`, `Slider`, `DeckStrip`, `ConfusionMatrix`.

## Copy
Sentence case. Verbs on buttons ("Show overlay", "Save settings", "Run evaluation", "Record participants", "Try again"). Numbers with units: "23 ms", "29.8 fps", "2.2 hand lengths", "0.3 s left".

| Use | Avoid |
|---|---|
| Live, Paused, go live, pause | Active/inactive, armed, enabled |
| Standby, Go, Cooldown, Cancelled | Detecting…, gesture recognised! |
| jump to slide 3, next slide, blank the screen | navigate, trigger action |
| hand lengths (wrist to the middle knuckle) | normalised units, s-units |
| Sent, Not sent: WaveSlide had focus | blocked_reason, focus guard (in UI) |
| capture to key, key to slide on screen | pipeline_ms, ack latency |
| trained model, rules | ML classifier, RF, heuristic engine |
| false triggers (Evaluation only) | accidental activations |

Times are 24-hour ("10:42:31"); percentages are whole numbers in matrices and one decimal in tables.

## Quality floor
- WCAG 2.2 AA contrast (contrast script: 20 of 20 pairs pass; extra pairs above); a visible 2 px `--color-focus` ring on every control; full keyboard use (the practice deck also takes ← → number Enter B).
- axe: 0 serious/critical violations on every prototype (browser-check: 0 blockers across 8 pages at 1440, 768 and 390).
- 360 px to 1440 px+ with no horizontal page scroll; the overlay is fixed-size by design.
- `prefers-reduced-motion` respected; nothing pulses or flashes, including on the projector.

## Notes for the build
- browser-check flags intentional things in the prototypes: off-token colours and fonts in the lecturer's slide (it is someone else's PowerPoint), container-relative sizes on the practice slide, SVG text inside the dial and hand (viewBox units), and small tap targets in the scaled-down screen mocks at 768 and 390 (the real overlay buttons are 30 px).
- The camera image in the prototypes is a drawn stand-in; the app shows `/api/preview.mjpg` under the same skeleton, or the skeleton alone on `--color-video` in replay mode.
- The overlay window is frameless: give the `/overlay` route `background: var(--color-surface)` on `html` so no white flashes at load, and size presets in `backend/app/desktop.py` must match 340 × 280 and 220 × 56.
- The sticky save bar shows mid-page in full-page screenshots; in the window it sits at the bottom.

## Known limits
- One dark theme only. On a very washed-out projector the graphite steps merge; borders and the tally band still separate everything.
- The overlay can be seen by the audience on a mirrored screen; the band is calm (no flashing) and the window can be compacted or hidden from the band itself.
- The engine cannot know PowerPoint's current slide, so the overlay never shows "slide 5 of 12"; only the practice deck has a deck strip.
- The thumbs-down glyph is the weakest pictogram at 20 px; the word always sits next to it.
