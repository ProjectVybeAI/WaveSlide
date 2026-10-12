import { render } from "@testing-library/react";
import examples from "@/mocks/fixtures/examples.json";
import type { HandLandmarks } from "@/api/types";
import { HandSkeleton } from "./HandSkeleton";

const hand = examples.engineFrame.hands[0] as HandLandmarks;

describe("HandSkeleton", () => {
  it("draws 21 joints and 21 bones per hand", () => {
    const { container } = render(<HandSkeleton hands={[hand]} />);
    expect(container.querySelectorAll("circle")).toHaveLength(21);
    expect(container.querySelectorAll("line")).toHaveLength(21);
  });

  it("numbers the counted fingers in counting order", () => {
    // index, middle and ring extended: three fingers, numbered 1 to 3
    const { container } = render(<HandSkeleton hands={[hand]} extended={[false, true, true, true, false]} />);
    const numbers = [...container.querySelectorAll("text")].map((t) => t.textContent);
    expect(numbers).toEqual(["1", "2", "3"]);
  });

  it("draws nothing without hands", () => {
    const { container } = render(<HandSkeleton hands={[]} />);
    expect(container.querySelectorAll("circle")).toHaveLength(0);
  });
});
