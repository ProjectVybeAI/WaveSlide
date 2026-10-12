import { FlaskConical } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export function EvaluationPage() {
  return (
    <PlaceholderPage
      title="Evaluation lab"
      description="Every test from the brief, replayed through the same pipeline that drives your slides."
      icon={FlaskConical}
      comingIn="Phase 2"
    />
  );
}
