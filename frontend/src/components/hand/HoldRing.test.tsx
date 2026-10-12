import { render, screen } from "@testing-library/react";
import { HoldRing } from "./HoldRing";
import { sweepPath } from "./ringGeometry";

const ticks = (container: HTMLElement) => container.querySelectorAll("line");
const passed = (container: HTMLElement) => container.querySelectorAll(".tickPassed");

describe("HoldRing", () => {
  it("draws one tick per 100 ms of the hold", () => {
    const { container, rerender } = render(<HoldRing state="idle" holdMs={1000} description="Idle" />);
    expect(ticks(container)).toHaveLength(10);
    rerender(<HoldRing state="idle" holdMs={800} description="Idle" />);
    expect(ticks(container)).toHaveLength(8);
  });

  it("lights the ticks the hold has passed and nothing more", () => {
    const { container } = render(
      <HoldRing
        state="standby"
        progress={0.7}
        holdMs={1000}
        label="3"
        caption="Slide"
        description="Standby"
      />,
    );
    expect(passed(container)).toHaveLength(7);
    expect(container.querySelector(".sweep")).not.toBeNull();
  });

  it("shows the target twice, so it stays legible under the sweep", () => {
    render(
      <HoldRing state="standby" progress={0.4} label="3" caption="Slide" description="Standby, slide 3" />,
    );
    expect(screen.getAllByText("3")).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Standby, slide 3" })).toBeInTheDocument();
  });

  it("is solid on go with every tick passed", () => {
    const { container } = render(<HoldRing state="go" holdMs={1000} label="3" description="Go" />);
    expect(container).toContainElement(container.querySelector("svg.go"));
    expect(passed(container)).toHaveLength(10);
    expect(container.querySelector(".sweep")).toBeNull();
  });

  it("drains a grey arc through the cooldown and has no sweep", () => {
    const { container } = render(
      <HoldRing state="cooldown" cooldown={0.5} holdMs={1000} label="3" description="Cooldown" />,
    );
    expect(container.querySelector(".cool")).not.toBeNull();
    expect(container.querySelector(".sweep")).toBeNull();
    expect(passed(container)).toHaveLength(0);
  });

  it("draws nothing filled when idle", () => {
    const { container } = render(<HoldRing state="idle" progress={0.9} description="Ready" />);
    expect(container.querySelector(".sweep")).toBeNull();
    expect(container.querySelector(".cool")).toBeNull();
  });

  it("clamps progress and closes the circle at 100%", () => {
    expect(sweepPath(36, 0)).toBe("");
    expect(sweepPath(36, 1.4)).toContain("A36 36 0 1 1");
    const { container } = render(
      <HoldRing state="standby" progress={2} holdMs={1000} description="Standby" />,
    );
    expect(passed(container)).toHaveLength(10);
  });
});
