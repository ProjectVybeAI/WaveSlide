import { deckReducer, SLIDE_COUNT, START } from "./deck";

describe("practice deck", () => {
  it("moves one slide at a time and stops at the ends", () => {
    expect(deckReducer(START, { type: "previous" }).slide).toBe(1);
    expect(deckReducer({ ...START, slide: SLIDE_COUNT }, { type: "next" }).slide).toBe(SLIDE_COUNT);
    expect(deckReducer(START, { type: "next" }).slide).toBe(2);
  });

  it("remembers where a jump came from, and forgets it on the next move", () => {
    const jumped = deckReducer({ ...START, slide: 5 }, { type: "jump", slide: 3 });
    expect(jumped).toEqual({ slide: 3, from: 5, blank: false });
    expect(deckReducer(jumped, { type: "next" }).from).toBeNull();
  });

  it("ignores a jump outside 1 to 10", () => {
    expect(deckReducer(START, { type: "jump", slide: 11 })).toBe(START);
    expect(deckReducer(START, { type: "jump", slide: 0 })).toBe(START);
  });

  it("blanks and unblanks, and a slide change brings the screen back", () => {
    const blank = deckReducer(START, { type: "blank" });
    expect(blank.blank).toBe(true);
    expect(deckReducer(blank, { type: "blank" }).blank).toBe(false);
    expect(deckReducer(blank, { type: "next" }).blank).toBe(false);
  });
});
