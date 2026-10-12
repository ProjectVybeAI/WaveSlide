import {
  confusionSentence,
  gestureName,
  headlineFigures,
  poseAxis,
  reliableRange,
  topConfusion,
} from "./report";
import { fullReport } from "./fixtures";

describe("reliableRange", () => {
  it("stops at the first distance where the rules fall under 90%", () => {
    const rows = [
      { condition: "0.5 m", rules_accuracy: 0.97 },
      { condition: "1 m", rules_accuracy: 0.96 },
      { condition: "1.5 m", rules_accuracy: 0.92 },
      { condition: "2 m", rules_accuracy: 0.76 },
    ];
    expect(reliableRange(rows)).toBe(1.5);
  });

  it("is null when even the closest distance is below the bar", () => {
    expect(reliableRange([{ condition: "0.5 m", rules_accuracy: 0.8 }])).toBeNull();
  });
});

describe("topConfusion", () => {
  it("finds the biggest number off the diagonal", () => {
    const labels = ["COUNT_4", "COUNT_5"];
    const matrix = [
      [364, 36],
      [9, 391],
    ];
    expect(topConfusion(labels, matrix)).toEqual({
      shown: "COUNT_4",
      read: "COUNT_5",
      count: 36,
      total: 400,
    });
    expect(confusionSentence(labels, matrix)).toBe(
      "The commonest slip: four fingers read as five fingers (36 of 400 frames, 9.0%).",
    );
  });

  it("has nothing to say about a perfect matrix", () => {
    expect(
      topConfusion(
        ["A", "B"],
        [
          [5, 0],
          [0, 5],
        ],
      ),
    ).toBeNull();
  });
});

describe("names", () => {
  it("gives poses a short axis word and a full name, and sentence-cases unknown gestures", () => {
    expect(poseAxis("OPEN_PALM")).toMatchObject({ short: "Palm", name: "Open palm", pose: "OPEN_PALM" });
    expect(poseAxis("COUNT_3").short).toBe("3");
    expect(gestureName("SWIPE_RIGHT")).toBe("Swipe right");
    expect(gestureName("PINCH_ZOOM")).toBe("Pinch zoom");
  });
});

describe("headlineFigures", () => {
  it("reads the five headline numbers from the full synthetic report", () => {
    const figures = headlineFigures(fullReport.sections);
    expect(figures.map((f) => f.value)).toEqual(["0.91", "0.94", "0.33", "38", "1.5"]);
  });

  it("shows a dash, not zero, for what was not measured", () => {
    const figures = headlineFigures({});
    expect(figures.map((f) => f.value)).toEqual(["–", "–", "–", "–", "–"]);
  });
});
