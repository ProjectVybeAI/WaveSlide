import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Table, TableEmpty, TBody, Td, Th, THead, Tr } from "./Table";

function Invoices({ sort = "ascending" as const, onSort = () => {} }) {
  return (
    <Table caption="Invoices">
      <THead>
        <Tr>
          <Th>Client</Th>
          <Th align="end" sort={sort} onSort={onSort}>
            Amount
          </Th>
        </Tr>
      </THead>
      <TBody>
        <Tr>
          <Td>Ravi Traders</Td>
          <Td align="end">₹4,200</Td>
        </Tr>
      </TBody>
    </Table>
  );
}

describe("Table", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is named by its caption and is not a tab stop while it fits", () => {
    render(<Invoices />);
    expect(screen.getByRole("table", { name: "Invoices" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Invoices" })).not.toBeInTheDocument();
  });

  it("puts aria-sort on the sorted header and sorts from a real button", async () => {
    const onSort = vi.fn();
    render(<Invoices sort="ascending" onSort={onSort} />);
    expect(screen.getByRole("columnheader", { name: "Amount" })).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByRole("columnheader", { name: "Client" })).not.toHaveAttribute("aria-sort");
    await userEvent.click(screen.getByRole("button", { name: "Amount" }));
    expect(onSort).toHaveBeenCalledOnce();
  });

  it("becomes a labelled, focusable scroll region when wider than its box", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(900);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    render(<Invoices />);
    expect(screen.getByRole("region", { name: "Invoices" })).toHaveAttribute("tabindex", "0");
  });

  it("shows an empty row across every column", () => {
    render(
      <Table caption="Invoices">
        <TBody>
          <TableEmpty colSpan={4}>No invoices yet.</TableEmpty>
        </TBody>
      </Table>,
    );
    expect(screen.getByRole("cell", { name: "No invoices yet." })).toHaveAttribute("colspan", "4");
  });
});
