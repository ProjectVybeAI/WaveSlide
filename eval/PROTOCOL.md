# WaveSlide: User-study protocol

How to collect the recordings behind `docs/EVALUATION.md` (BRIEF §11). Follow it exactly so the
numbers from different people and days can be compared. Only hand landmarks are saved: no video,
no images, no names.

## Before you start
- Run the app with a webcam: `npm start` (or `npm run dev`, source = camera). The recorder refuses to run on a replay session.
- Close other apps that use the camera. Use the same webcam and the same room for the whole study.
- Mount the camera at chest height, looking at the presenter, and mark the floor at **0.5 m, 1 m, 1.5 m and 2 m** from the camera (measure to where the hand will be, about arm's length in front of the body).
- Pick a participant id that is not a real name (`P1`, `P2`, ...). Keep the sheet that maps ids to people on paper, not in the repository.

## Consent line (read aloud, tick on the sheet)
"I am recording the positions of the points on my hands while I make gestures at a webcam. No pictures or video are saved, my name is not stored, and I can stop at any time and ask for my recording to be deleted."

## Participants
- At least **3 participants** at 1 m in normal light, with different hand sizes if you can. Right-handed gestures, one hand unless the protocol says two.
- **One participant** also records at all four distances (0.5, 1, 1.5, 2 m) and all three lighting levels. Their id stays the same across these sessions, which is why leave-one-participant-out treats them as one person.

## Lighting levels (Dataset > Record session > Lighting)
Measure with a lux meter app on a phone held at the hand position, facing the lamp. The recorder also stores the measured mean picture brightness; this table is only guidance for choosing the label.

| Label | Guidance | Roughly |
|---|---|---|
| bright | window light plus the room lights on | 500 lux or more |
| normal | the room lights on, curtains as usual | 150 to 300 lux |
| dim | one lamp or the lights half off, like a darkened lecture room | 20 to 50 lux |

## Sessions to record
Use Dataset > Record session. Read the prompts on screen; do not talk unless the protocol says so.

1. **gestures** (about 4 minutes): each pose held 4 s, three rounds (fist, open palm with fingers together, thumbs up, thumbs down, 1 to 5 fingers, with 5 spread wide), then 10 swipes right and 10 swipes left. A 2.5 s "get ready" precedes every pose. Record this once per participant at 1 m, normal light. For the distance and lighting study, record it again at every distance (normal light) and at each lighting level (1 m).
2. **talking** (3 minutes): the participant explains their last project to the camera using their hands naturally, as they would to an audience, with WaveSlide running. Nobody tries to trigger anything. Every command that fires is a false trigger (E3 and the ablation). Record one per participant.
3. **two_hand** (about 1 minute): five fingers on one hand and 1 to 5 on the other, held 4 s each, twice. Record one per participant if two-hand counting is part of the study.

If a recording goes wrong (phone call, hand left the frame), stop it and delete the session in Dataset, then record it again.

## Talking script
Say, in your own words, for three minutes: "Introduce your final-year project: what problem it solves, how it works, what you built, what went wrong, and what you would do next." Use your hands as you normally do. Do not make any of the WaveSlide gestures on purpose.

## Feedback form (after the sessions)
Ask each participant to rate, from 1 (worst) to 5 (best):
1. **Ease**: "How easy was it to control the slides with gestures?"
2. **Reliability**: "How often did it do what you meant?"
and to add one comment if they like. Add one row per participant to `eval/feedback.csv` (columns `participant,ease,reliability,comment`; use the same id as the recordings; leave out commas in the comment or wrap it in quotes).

## Running the evaluation
1. Train the model on the recordings: Dataset > Train model (needs at least 2 participants).
2. `npm run eval` writes `docs/EVALUATION.md` and the charts in `docs/eval/`. Add `-- --sources synthetic` for the demo set made by `npm run seed`; those results are marked synthetic on every section.
3. Commit `eval/feedback.csv`, `docs/EVALUATION.md` and `docs/eval/`. Never commit `data/` (it holds the recordings).
