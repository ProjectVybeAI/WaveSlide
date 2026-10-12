import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfusionMatrix } from "./ConfusionMatrix";

const labels = ["FIST", "OPEN_PALM", "COUNT_5"];
const names: Record<string, { short: string; name: string }> = {
  FIST: { short: "Fist", name: "Fist" },
  OPEN_PALM: { short: "Palm", name: "Open palm" },
  COUNT_5: { short: "5", name: "Five fingers" },
};
// Rows: what the hand did. Row 2 (five fingers) is often taken for an open palm.
const matrix = [
  [38, 2, 0],
  [0, 36, 4],
  [0, 10, 30],
];

function setup() {
  return render(
    <ConfusionMatrix
      title="Rules, 3 poses"
      labels={labels}
      matrix={matrix}
      axis={(label) => names[label]!}
    />,
  );
}

describe("ConfusionMatrix", () => {
  it("is a named table with one row per pose and one header per column", () => {
    setup();
    const table = screen.getByRole("table", { name: "Rules, 3 poses" });
    expect(within(table).getAllByRole("row")).toHaveLength(4); // header row + 3 poses
    expect(within(table).getAllByRole("columnheader", { name: /Open palm|Fist|Five fingers/ })).toHaveLength(
      3,
    );
    expect(within(table).getByRole("rowheader", { name: "Five fingers" })).toBeInTheDocument();
  });

  it("describes every cell in words and shows the share of its row", () => {
    setup();
    const confusion = screen.getByRole("cell", {
      name: "Five fingers recognised as Open palm: 10 of 40 frames",
    });
    expect(confusion).toHaveTextContent("25");
    const right = screen.getByRole("cell", { name: "Fist recognised as Fist: 38 of 40 frames" });
    expect(right).toHaveTextContent("95");
    // An empty cell says 0 to a screen reader and shows nothing.
    const empty = screen.getByRole("cell", { name: "Fist recognised as Five fingers: 0 of 40 frames" });
    expect(empty).toBeEmptyDOMElement();
  });

  it("shades by share of the row: light cells take dark ink", () => {
    setup();
    const right = screen.getByRole("cell", { name: /Fist recognised as Fist/ });
    const slip = screen.getByRole("cell", { name: /Fist recognised as Open palm/ });
    expect(right).toHaveAttribute("data-level", "7");
    expect(right).toHaveAttribute("data-ink", "dark");
    expect(slip).toHaveAttribute("data-level", "2"); // 5% of the row
    expect(slip).toHaveAttribute("data-ink", "light");
  });

  it("offers the exact counts as a real table, and back", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Show counts as a table" }));

    expect(screen.queryByRole("cell", { name: /recognised as/ })).not.toBeInTheDocument();
    const counts = screen.getByRole("table", { name: "Rules, 3 poses" });
    const palmRow = within(counts).getByRole("rowheader", { name: "Open palm" }).closest("tr")!;
    expect(
      within(palmRow)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["0", "36", "4", "40", "90%"]);

    await user.click(screen.getByRole("button", { name: "Show heat map" }));
    expect(screen.getAllByRole("cell", { name: /recognised as/ })).toHaveLength(9);
  });
});
