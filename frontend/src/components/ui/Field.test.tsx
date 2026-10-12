import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./Field";
import { Input, Textarea } from "./Input";
import { Select } from "./Select";

describe("Field", () => {
  it("labels the control and links the help text", () => {
    render(
      <Field label="Email" help="We send the receipt here.">
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAccessibleDescription("We send the receipt here.");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("marks the control invalid and describes it with the error", () => {
    render(
      <Field label="Email" help="Work address." error="Enter an address like name@example.com" required>
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription("Work address. Enter an address like name@example.com");
  });

  it("keeps a description the caller passed alongside the field's own", () => {
    render(
      <>
        <p id="extra">Shown on invoices.</p>
        <Field label="Notes" error="Too long">
          <Textarea aria-describedby="extra" />
        </Field>
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveAccessibleDescription("Shown on invoices. Too long");
  });

  it("labels a Radix Select the same way", () => {
    render(
      <Field label="Plan" error="Choose a plan">
        <Select options={[{ value: "basic", label: "Basic" }]} />
      </Field>,
    );
    const trigger = screen.getByRole("combobox", { name: "Plan" });
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAccessibleDescription("Choose a plan");
  });
});
