import { Database } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export function DatasetPage() {
  return (
    <PlaceholderPage
      title="Dataset"
      description="Recorded landmark sessions for training and evaluation. Landmarks only, never video."
      icon={Database}
      comingIn="Phase 2"
    />
  );
}
