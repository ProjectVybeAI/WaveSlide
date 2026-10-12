// Route-level error boundary: a crash in one screen shows ErrorState instead of a white window.
import { isRouteErrorResponse, useRouteError } from "react-router";
import { toMessage } from "@/api/errors";
import { ErrorState } from "@/components/ui";

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? error.statusText : toMessage(error);
  return (
    <div style={{ padding: "var(--space-8)" }}>
      <ErrorState
        title="This screen stopped working"
        message={message}
        onRetry={() => window.location.reload()}
      />
    </div>
  );
}
