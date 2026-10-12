import { cellText, heatLevel, rowAccuracy, rowTotal, usesDarkInk } from "./heat";

describe("heatLevel", () => {
  it("leaves empty cells on the surface and steps up with the share of the row", () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(0.01)).toBe(1);
    expect(heatLevel(0.05)).toBe(2);
    expect(heatLevel(0.08)).toBe(3);
    expect(heatLevel(0.25)).toBe(4);
    expect(heatLevel(0.5)).toBe(5);
    expect(heatLevel(0.85)).toBe(6);
    expect(heatLevel(0.93)).toBe(7);
  });

  it("switches to dark ink once a cell is light enough", () => {
    expect(usesDarkInk(3)).toBe(false);
    expect(usesDarkInk(4)).toBe(true);
  });
});

describe("cellText", () => {
  it("shows whole percentages, <1 for a few frames and nothing for none", () => {
    expect(cellText(0, 400)).toBe("");
    expect(cellText(1, 400)).toBe("<1");
    expect(cellText(360, 400)).toBe("90");
  });
});

describe("row helpers", () => {
  it("totals a row and reads its share on the diagonal", () => {
    expect(rowTotal([3, 1])).toBe(4);
    expect(rowAccuracy([3, 1], 0)).toBe(0.75);
    expect(rowAccuracy([0, 0], 0)).toBe(0);
  });
});
