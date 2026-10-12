import { QueryClient, QueryClientProvider, type UseQueryResult } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { ApiError } from "@/api/errors";
import type { AppProfile, CameraInfo, ModelCard, Settings } from "@/api/types";
import examples from "@/mocks/fixtures/examples.json";
import { ToastProvider } from "@/components/ui";
import { SettingsForm } from "./SettingsForm";
import { toValues } from "./settingsSchema";

// The engine is not under test here: Save calls this stand-in, which we can make succeed or fail.
const saveSettings = vi.fn<(settings: Settings) => Promise<Settings>>();
vi.mock("./api", () => ({
  useSaveSettings: () => ({ mutateAsync: saveSettings, isPending: false }),
}));

const result = <T,>(data: T) =>
  ({ data, isPending: false, isError: false, error: null }) as unknown as UseQueryResult<T>;
const powerpoint: AppProfile = {
  id: "powerpoint",
  name: "PowerPoint",
  description: "Microsoft PowerPoint.",
  jump_strategy: "type_number",
  unsupported: [],
  notes: "",
  keys: { next: ["right"], jump: ["{n}", "enter"] },
};
const profiles = result<AppProfile[]>([powerpoint]);
const cameras = result<CameraInfo[]>(examples.cameras);
const noModel = result<ModelCard | null>(null);

// In the app, a save updates the settings query and the page hands the form its new baseline.
// This harness does the same when Save succeeds, so "saved" can be seen.
const SAVED = "test-saved";
function Harness() {
  const [baseline, setBaseline] = useState(toValues(examples.settings as Settings));
  useEffect(() => {
    const onSaved = (event: Event) => setBaseline(toValues((event as CustomEvent<Settings>).detail));
    window.addEventListener(SAVED, onSaved);
    return () => window.removeEventListener(SAVED, onSaved);
  }, []);
  return (
    <SettingsForm
      baseline={baseline}
      profiles={profiles}
      cameras={cameras}
      model={noModel}
      health={undefined}
    />
  );
}

function renderForm() {
  const router = createMemoryRouter([{ path: "/", element: <Harness /> }]);
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

async function chooseGesture(action: string, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: `Gesture for ${action}` }));
  await user.click(await screen.findByRole("option", { name: option }));
}

beforeEach(() => {
  saveSettings.mockReset();
});

describe("SettingsForm", () => {
  it("starts with nothing to save and every fader showing its default", () => {
    renderForm();
    expect(screen.queryByRole("region", { name: "Unsaved changes" })).not.toBeInTheDocument();
    expect(screen.getByText("Default 2.0")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /^Swipe distance/ })).toHaveAttribute(
      "aria-valuetext",
      "2.0 hand lengths",
    );
  });

  it("lists a changed value in the save bar and marks the control", () => {
    renderForm();
    fireEvent.keyDown(screen.getByRole("slider", { name: /^Swipe distance/ }), { key: "ArrowRight" });
    const bar = screen.getByRole("region", { name: "Unsaved changes" });
    expect(within(bar).getByText(/1 unsaved change:/)).toBeInTheDocument();
    expect(within(bar).getByText(/Swipe distance/)).toBeInTheDocument();
    expect(screen.getByText("Changed")).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Save settings" })).toBeEnabled();
  });

  it("shows a gesture conflict inline, before saving, and turns Save off with the reason", async () => {
    renderForm();
    await chooseGesture("Exit slideshow", "Fist");
    expect(await screen.findByText(/Fist already starts the slideshow/)).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save settings" });
    expect(save).toBeDisabled();
    expect(save).toHaveAccessibleDescription("Fix the gesture conflict to save.");
    expect(screen.getByRole("combobox", { name: "Gesture for Exit slideshow" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("clears the conflict when the other action gives the gesture up", async () => {
    renderForm();
    await chooseGesture("Exit slideshow", "Fist");
    await chooseGesture("Start slideshow", "Thumbs down");
    await waitFor(() => expect(screen.queryByText(/already starts/)).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Save settings" })).toBeEnabled();
  });

  it("does not offer a swipe for pausing: it has to be held", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: "Gesture for Pause or go live" }));
    expect(await screen.findByRole("option", { name: "Swipe left" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("saves the draft and says so", async () => {
    saveSettings.mockImplementation(async (settings) => {
      window.dispatchEvent(new CustomEvent(SAVED, { detail: settings }));
      return settings;
    });
    renderForm();
    const user = userEvent.setup();
    fireEvent.keyDown(screen.getByRole("slider", { name: /^Swipe distance/ }), { key: "ArrowRight" });
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    await waitFor(() => expect(saveSettings).toHaveBeenCalledTimes(1));
    expect(saveSettings.mock.calls[0]?.[0].sensitivity?.swipe_min_travel).toBeCloseTo(2.1);
    expect(await screen.findByText(/Settings saved/)).toBeInTheDocument();
  });

  it("keeps what was typed when the engine refuses, and says why", async () => {
    saveSettings.mockImplementation(() =>
      Promise.reject(new ApiError("VALIDATION_ERROR", "Swipe distance must be between 0.5 and 5.", 422)),
    );
    renderForm();
    const user = userEvent.setup();
    fireEvent.keyDown(screen.getByRole("slider", { name: /^Swipe distance/ }), { key: "ArrowRight" });
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    expect(
      await screen.findByText(/Not saved. Swipe distance must be between 0.5 and 5./),
    ).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /^Swipe distance/ })).toHaveAttribute(
      "aria-valuetext",
      "2.1 hand lengths",
    );
    expect(screen.getByRole("button", { name: "Save settings" })).toBeEnabled();
  });

  it("discards changes without asking", async () => {
    renderForm();
    const user = userEvent.setup();
    fireEvent.keyDown(screen.getByRole("slider", { name: /^Swipe distance/ }), { key: "ArrowRight" });
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Unsaved changes" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("slider", { name: /^Swipe distance/ })).toHaveAttribute(
      "aria-valuetext",
      "2.0 hand lengths",
    );
  });

  it("explains why the trained model is unavailable and where to get one", () => {
    renderForm();
    expect(screen.getByText("No trained model yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Train a model in Dataset" })).toHaveAttribute(
      "href",
      "/dataset",
    );
    expect(screen.getByRole("tab", { name: "Trained model" })).toBeDisabled();
  });
});
