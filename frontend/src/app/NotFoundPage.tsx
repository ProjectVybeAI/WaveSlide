import { Link } from "react-router";
import { buttonClassName, EmptyState, PageHeader } from "@/components/ui";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { MapPinOff } from "lucide-react";

export function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <>
      <PageHeader title="Page not found" />
      <div style={{ paddingBlock: "var(--space-8)" }}>
        <EmptyState
          icon={MapPinOff}
          title="There is no page at this address"
          body="It may have moved. Live shows the camera and what WaveSlide recognises."
          action={
            <Link to="/" className={buttonClassName({ variant: "primary" })}>
              Go to Live
            </Link>
          }
        />
      </div>
    </>
  );
}
