import { SlidersHorizontal } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Which gesture does what, how sensitive it is, and which app gets the keys."
      icon={SlidersHorizontal}
      comingIn="Phase 1"
    />
  );
}
