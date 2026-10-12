import { Presentation } from "lucide-react";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";

export function PracticePage() {
  return (
    <PlaceholderPage
      title="Practice deck"
      description="Ten slides to try every gesture before you open PowerPoint."
      icon={Presentation}
      comingIn="Phase 1"
    />
  );
}
