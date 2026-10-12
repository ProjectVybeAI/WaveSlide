"""E3 false triggers while talking, and the ablation of the reliability controls.

A talking session has no gesture in it, so every command that fires is a false trigger.
E3 counts them with the engine active and with it paused. The ablation replays the same
sessions with one control switched off at a time (the others stay on), to show how many
false triggers each control prevents.
"""

from pathlib import Path

from app.contract.evaluation import Ablation, AblationRow, E3FalseTriggers
from app.core.reliability import Controls
from app.dataset.store import iter_frames, read_header
from app.evaluation.replay import make_settings, replay_commands

ABLATIONS = {
    "all_on": Controls(),
    "no_hold": Controls(hold=False),
    "no_cooldown": Controls(cooldown=False),
    "no_stillness": Controls(stillness=False),
    "no_rearm": Controls(rearm=False),
}


def _minutes(paths: list[Path]) -> float:
    """Total length of the sessions, from their last frame."""
    return sum(max((f.t for f in iter_frames(p)), default=0.0) for p in paths) / 60


def false_triggers(paths: list[Path]) -> tuple[E3FalseTriggers, Ablation] | tuple[None, None]:
    """E3 and the ablation for the given talking sessions (None, None when there are none)."""
    if not paths:
        return None, None
    lengths = {path: _minutes([path]) for path in paths}
    minutes = sum(lengths.values())

    per_participant: dict[str, int] = {}
    minutes_of: dict[str, float] = {}
    active_total = 0
    for path in paths:
        person = read_header(path).participant
        count = len(replay_commands(path, make_settings(start_paused=False)))
        active_total += count
        per_participant[person] = per_participant.get(person, 0) + count
        minutes_of[person] = minutes_of.get(person, 0.0) + lengths[path]
    paused_total = sum(len(replay_commands(p, make_settings(start_paused=True))) for p in paths)
    e3 = E3FalseTriggers(
        minutes=round(minutes, 2),
        active_per_min=active_total / minutes,
        paused_per_min=paused_total / minutes,
        per_participant={p: per_participant[p] / minutes_of[p] for p in per_participant},
    )

    rows = []
    for name, controls in ABLATIONS.items():
        if name == "all_on":
            count = active_total  # the same replay as E3's active run
        else:
            count = sum(len(replay_commands(p, make_settings(), controls=controls)) for p in paths)
        rows.append(AblationRow(control=name, false_triggers_per_min=count / minutes))  # type: ignore[arg-type]
    return e3, Ablation(minutes=round(minutes, 2), rows=rows)
