import { keyCaps } from "./keys";

describe("keyCaps", () => {
  it("shows arrows, Enter and Esc as the caps people know", () => {
    expect(keyCaps("right")).toEqual(["→"]);
    expect(keyCaps("left")).toEqual(["←"]);
    expect(keyCaps("enter")).toEqual(["Enter"]);
    expect(keyCaps("esc")).toEqual(["Esc"]);
  });

  it("splits a chord into one cap per key", () => {
    expect(keyCaps("shift+command+enter")).toEqual(["⇧", "⌘", "Enter"]);
    expect(keyCaps("ctrl+l")).toEqual(["Ctrl", "L"]);
  });

  it("puts the slide number into a jump", () => {
    expect(keyCaps("{n}", 3)).toEqual(["3"]);
    expect(keyCaps("b")).toEqual(["B"]);
    expect(keyCaps("f5")).toEqual(["F5"]);
  });
});
