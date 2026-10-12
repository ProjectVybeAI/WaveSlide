# WaveSlide

*Gesture-controlled presentation remote using a standard webcam*

> Final-year project. I am building this system. This document describes the project's background, scope and intended functionality. It does not cover implementation; that will be planned separately.

> **Project goal:** a reliable, complete, demo-ready system that covers the core fundamentals of computer vision and real-time gesture recognition. Uniqueness is not the main goal; solid execution and thorough evaluation are.

---

## 1. One-line summary

WaveSlide is a desktop application that lets a presenter control slides using hand gestures in front of a normal webcam: swipe to change slides, hold up fingers to jump to a slide, open palm to blank the screen. It works with PowerPoint, Google Slides and PDF viewers, and includes a settings screen to change which gesture does what.

---

## 2. The problem

During presentations, the presenter usually has to:

- stand near the laptop to press keys or click the mouse;
- carry a physical clicker, which can be forgotten, lost or run out of battery;
- ask someone else to change slides ("next slide, please"), which breaks the flow;
- scroll through many slides to find a specific one when answering a question.

This keeps the presenter tied to the laptop and distracts from the audience.

---

## 3. My solution: WaveSlide

With WaveSlide, the webcam watches the presenter's hand. The system detects the hand, recognises the gesture and sends the matching keyboard command to the presentation software. No extra hardware is needed beyond the laptop's own webcam.

Key ideas:

1. **Hand tracking:** detect the hand and its key points (fingertips, joints) in every frame.
2. **Gesture recognition:** turn those points into gestures such as swipe, open palm or finger count.
3. **Reliability controls:** an activation gesture and a cooldown prevent accidental or repeated commands.
4. **Slide control:** send keyboard shortcuts that work across common presentation apps.
5. **Customisation:** a settings screen lets the user change gesture mappings and sensitivity.

---

## 4. Related work

Gesture-controlled presentation systems are a well-known application of computer vision, and several exist:

- **Open-source student projects** using webcam hand-landmark tracking with rule-based gesture logic and keyboard automation, often including an activation gesture and cooldown.
- **Gesture Presenter**, an open-source Chrome extension that uses a phone camera to control browser-based slides.
- **Research papers** on gesture-controlled presentations, including work that personalises gestures for individual users. One study reported a maximum reliable detection range of about 2 feet because its training data was recorded close to the camera.
- **Gesture + voice remotes**, combining swipe gestures with spoken slide navigation.

**How this project relates:** it follows the established approach, with a focus on **reliability, a complete feature set, customisation and thorough evaluation**, including the **finger-count jump to slide** feature and a **settings screen** for remapping gestures.

---

## 5. Features

### 5.1 Core gestures

| Gesture | Action |
|---|---|
| Swipe right | Next slide |
| Swipe left | Previous slide |
| Open palm (held briefly) | Blank / unblank screen |
| Activation gesture (e.g. fist then open, or thumbs-up held briefly) | Turn gesture control on/off |
| Specific gesture (configurable) | Start slideshow |
| Specific gesture (configurable) | Exit slideshow |

### 5.2 Finger count to jump to a slide

- Hold up a number of fingers and keep them steady for a short moment (e.g. about one second) to jump directly to that slide.
- **One hand:** slides 1–5.
- **Two hands (optional):** slides 6–10 by adding fingers across both hands.
- A visible countdown or progress ring shows the number being recognised before the jump happens, so the presenter can change their mind.
- Useful for answering audience questions ("let me go back to slide 3").

### 5.3 Settings screen

A simple desktop settings window where the user can:

- **remap gestures:** choose which gesture triggers which action (for example, swap swipe directions, or assign thumbs-up to start slideshow);
- **enable/disable features:** finger-count jump, blank screen, two-hand counting;
- **adjust sensitivity:** swipe distance and speed thresholds;
- **adjust timing:** hold duration for finger count and palm gestures, cooldown length;
- **select camera:** choose between built-in and external webcams;
- **select target app profile:** PowerPoint, Google Slides or PDF viewer (different keyboard shortcuts where needed);
- **toggle overlay:** show or hide the webcam preview and landmarks;
- **save and load** settings so they persist between sessions;
- **reset to defaults.**

### 5.4 Reliability controls

- **Activation gesture:** gesture control can be paused, so normal hand movements while talking don't trigger commands.
- **Cooldown:** after a command, a short delay prevents one swipe from skipping several slides.
- **Hold-to-confirm:** static gestures (palm, finger count) must be held briefly before they trigger.
- **Smoothing:** reduces jitter in hand-position tracking.

### 5.5 On-screen overlay

- Small floating window showing the webcam feed with hand landmarks drawn on it.
- Displays the recognised gesture and the action taken.
- Shows whether gesture control is active or paused.
- Shows the finger-count progress before a jump.
- Can be minimised or hidden during the presentation.

### 5.6 Supported presentation apps

- Microsoft PowerPoint
- Google Slides (in browser)
- PDF viewers (for slides exported as PDF)

---

## 6. Scope

### 6.1 In scope

- Real-time hand detection and landmark tracking from a standard webcam.
- Rule-based gesture recognition.
- Optional trained classifier on recorded gesture data, compared with rule-based recognition.
- All features listed in section 5.
- Desktop application for one operating system first.
- Evaluation of accuracy, false triggers, response time, distance and lighting.

### 6.2 Out of scope

- Mobile app versions.
- Multiple presenters or ignoring audience members' hands.
- Long-distance operation beyond typical webcam range.
- Voice commands.
- Virtual laser pointer or drawing on slides.
- Special hardware (depth cameras, wearables).

*(Some of these could be future work.)*

---

## 7. User flow

```
Launch WaveSlide → camera preview appears
        │
Open presentation (PowerPoint / Google Slides / PDF)
        │
Make activation gesture → gesture control ON
        │
        ├── Swipe right / left ──────────► next / previous slide
        ├── Hold up N fingers (~1 s) ────► jump to slide N
        ├── Open palm (hold) ────────────► blank / unblank screen
        └── Activation gesture again ────► gesture control OFF (pause)
        │
Settings screen (any time) → remap gestures, adjust sensitivity, save
```

---

## 8. Technologies and fundamentals covered

| Area | Technology (tentative) | Fundamentals learned |
|---|---|---|
| Video capture and image processing | OpenCV | Reading webcam frames, colour conversion, flipping, resizing, drawing overlays |
| Hand detection and landmarks | MediaPipe Hands | Real-time detection of hands and 21 landmark points |
| Feature engineering | Python, NumPy | Converting landmarks into features: finger up/down, distances, angles, normalisation |
| Rule-based gesture recognition | Python | Designing logic for static gestures (palm, finger count) |
| Motion tracking | Python | Tracking hand position across frames to detect swipes; direction and speed thresholds |
| Machine learning (optional) | scikit-learn or a small neural network | Recording a dataset, training a classifier, train/test split, accuracy, confusion matrix |
| Real-time systems | Python | Frame rate, latency, smoothing, debouncing, cooldowns |
| System automation | PyAutoGUI (or similar) | Sending keyboard events to other applications |
| GUI development | Tkinter or PyQt | Overlay window and settings screen |
| Configuration storage | JSON | Saving and loading user settings |
| Evaluation | Python, spreadsheets / plots | Measuring accuracy, false positives, latency; presenting results |

---

## 9. Non-functional requirements

- **Responsiveness:** a gesture should trigger its action within about half a second.
- **Reliability:** very few accidental triggers during normal talking and hand movement.
- **Low cost:** standard laptop webcam only.
- **Ease of use:** working within a minute of launching; gestures easy to learn.
- **Privacy:** video processed locally; nothing recorded or uploaded.
- **Lightweight:** runs smoothly on a normal student laptop.

---

## 10. Known challenges

| Challenge | Impact | Approach |
|---|---|---|
| Accidental triggers while talking | Unwanted slide changes | Activation gesture, hold-to-confirm, cooldown |
| One swipe registering multiple times | Skipping slides | Cooldown and debouncing |
| Lighting changes | Missed detections | Testing under different lighting; guidance to the user |
| Distance from camera | Smaller hand, lower accuracy | Test and document the reliable range; adjustable thresholds |
| Finger count misreads (e.g. thumb position) | Jumping to wrong slide | Hold-to-confirm with visible countdown |
| Different presentation apps use different shortcuts | Commands not working | App profiles in settings |
| Complex backgrounds or other people in view | False detections | Detect only the closest/largest hand; document limitation |

---

## 11. Evaluation plan

- **Gesture accuracy:** recognition rate for each gesture across multiple users.
- **Finger-count accuracy:** correct slide jumps for counts 1–5 (and 6–10 if two-hand mode is used).
- **False triggers:** number of unintended commands during a few minutes of normal talking with hand movement.
- **Response time:** delay between completing a gesture and the slide changing.
- **Distance test:** accuracy at increasing distances (e.g. 0.5 m, 1 m, 1.5 m, 2 m).
- **Lighting test:** accuracy in bright, normal and dim lighting.
- **Rule-based vs. ML (optional):** accuracy comparison with a confusion matrix.
- **User feedback:** a few classmates give a short presentation using the system and rate ease of use.

---

## 12. Possible future enhancements

- Voice commands for slide navigation.
- Virtual laser pointer by pointing at the screen.
- Drawing or highlighting on slides with a finger.
- Presenter lock (ignore other people's hands in view).
- Longer-distance operation for large classrooms.
- Fully custom gestures recorded by the user.
- Mobile phone as a wireless camera.

---

## 13. Open decisions for the build phase

These will be decided in the implementation session:

- Final gesture set and default mappings, including the activation gesture.
- Rule-based only, or rule-based plus trained classifier.
- GUI framework for the overlay and settings screen.
- Operating system to support first.
- Hold time, cooldown and swipe thresholds (initial defaults).
- Whether two-hand finger counting (slides 6–10) is included in the first version.
- Test participants and conditions for evaluation.

---

## 14. References

1. MediaPipe Hands, Google. https://developers.google.com/mediapipe/solutions/vision/hand_landmarker
2. OpenCV. https://opencv.org
3. Gesture-Controlled Presentation Tool (open-source example). https://github.com/sreelasya21/gesture_env
4. Gesture Presenter – Remote for Slides (Chrome Web Store, open source). https://chromewebstore.google.com/detail/gesture-presenter-remote/pdfpddkehgjilojkjcekjbfkoleclkkb
5. *Hand gesture recognition for PowerPoint presentation control.* Webology, 18(6), 2021. https://www.webology.org/data-cms/articles/20220301125244amwebology%2018%20(6)%20-%20162%20pdf.pdf
6. *A Proposed Method of Gesture-controlled Presentation Software Design.* https://www.researchgate.net/publication/379953967_A_Proposed_Method_of_Gesture-controlled_presentation_software_design
7. *I Built a Presentation Remote That Uses Hand Gestures and Voice.* DEV Community, 2026. https://dev.to/devidevilaldevil/i-built-a-hands-free-slide-remote-for-a-friend-who-can-never-find-the-right-page-1298
