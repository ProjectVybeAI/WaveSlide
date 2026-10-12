"""Key senders: the port the engine uses to press keys.

PyAutoGuiSender presses real keys in whichever app has focus. RecordingSender only
remembers them (tests, replay demos, the practice deck), so CI never touches the keyboard.
"""

import threading
from abc import ABC, abstractmethod


class KeySender(ABC):
    dry_run: bool

    @abstractmethod
    def send(self, keys: list[str]) -> None:
        """Press each key in order. A key with '+' is a chord, e.g. 'shift+command+enter'."""


class RecordingSender(KeySender):
    dry_run = True

    def __init__(self) -> None:
        self.sent: list[list[str]] = []
        self._lock = threading.Lock()

    def send(self, keys: list[str]) -> None:
        with self._lock:
            self.sent.append(list(keys))


class PyAutoGuiSender(KeySender):
    dry_run = False

    def __init__(self) -> None:
        import pyautogui

        pyautogui.PAUSE = 0  # no built-in delay after each press: latency matters
        pyautogui.FAILSAFE = False  # the mouse corner abort makes no sense for a gesture remote
        self._gui = pyautogui

    def send(self, keys: list[str]) -> None:
        for key in keys:
            if "+" in key:
                self._gui.hotkey(*key.split("+"))
            else:
                self._gui.press(key)
