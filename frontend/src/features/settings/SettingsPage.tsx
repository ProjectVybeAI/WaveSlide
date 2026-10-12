// Settings: gestures, features, sensitivity, timing, camera and app, recogniser, overlay, with save,
// export, import and reset. Changes are held in a draft until Save (see SettingsForm).
import { Download, RotateCcw, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toMessage } from "@/api/errors";
import { useHealth } from "@/api/queries";
import {
  Button,
  Callout,
  ConfirmDialog,
  ErrorState,
  PageHeader,
  Skeleton,
  SkeletonGroup,
  useToast,
} from "@/components/ui";
import { useCameras, useProfiles } from "@/features/live/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { downloadSettings, useImportSettings, useModelCard, useResetSettings, useSettings } from "./api";
import { SettingsForm } from "./SettingsForm";
import { toValues } from "./settingsSchema";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  useDocumentTitle("Settings");
  const settings = useSettings();
  const profiles = useProfiles();
  const cameras = useCameras();
  const model = useModelCard();
  const health = useHealth();
  const reset = useResetSettings();
  const importFile = useImportSettings();
  const toast = useToast();

  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Bumped after a reset or an import so the form starts again from what the engine now has.
  const [generation, setGeneration] = useState(0);
  const baseline = useMemo(() => (settings.data ? toValues(settings.data) : null), [settings.data]);

  const onExport = async () => {
    setNotice(null);
    try {
      await downloadSettings();
    } catch (error) {
      setNotice(`Settings could not be exported. ${toMessage(error)}`);
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description={
          <>
            Changes take effect when you save. Stored in <code>data/settings.json</code>.
          </>
        }
        actions={
          baseline ? (
            <>
              <Button icon={Download} onClick={() => void onExport()}>
                Export
              </Button>
              <Button
                icon={Upload}
                pending={importFile.isPending}
                pendingLabel="Importing"
                onClick={() => fileInput.current?.click()}
              >
                Import
              </Button>
              <Button variant="tertiary" icon={RotateCcw} onClick={() => setConfirmReset(true)}>
                Reset to defaults
              </Button>
            </>
          ) : null
        }
      />
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="Settings file to import"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setNotice(null);
          importFile.mutate(file, {
            onSuccess: () => {
              setGeneration((n) => n + 1);
              toast.show({
                title: "Settings imported",
                description: `${file.name} is now in use.`,
                tone: "success",
              });
            },
            onError: (error) => setNotice(toMessage(error)),
          });
        }}
      />
      {notice ? (
        <Callout tone="danger" title="Nothing was changed" className={styles.notice}>
          {notice}
        </Callout>
      ) : null}

      {settings.isError ? (
        <div className={styles.state}>
          <ErrorState
            title="Settings could not be loaded"
            message={toMessage(settings.error)}
            onRetry={() => void settings.refetch()}
            retrying={settings.isFetching}
          />
        </div>
      ) : baseline ? (
        <SettingsForm
          key={generation}
          baseline={baseline}
          profiles={profiles}
          cameras={cameras}
          model={model}
          health={health.data}
        />
      ) : (
        <SettingsSkeleton />
      )}

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset all settings to their defaults?"
        confirmLabel="Reset settings"
        pendingLabel="Resetting"
        pending={reset.isPending}
        onConfirm={() =>
          reset.mutate(undefined, {
            onSuccess: () => {
              setConfirmReset(false);
              setGeneration((n) => n + 1);
              toast.show({
                title: "Settings reset",
                description: "Everything is back to the values WaveSlide ships with.",
                tone: "success",
              });
            },
            onError: (error) => {
              setConfirmReset(false);
              setNotice(toMessage(error));
            },
          })
        }
      >
        Gestures, sensitivity, timing, camera and overlay go back to the values WaveSlide ships with. Recorded
        sessions are not touched.
      </ConfirmDialog>
    </>
  );
}

/** The same shape as the loaded page: a heading column and rows of controls, three times. */
function SettingsSkeleton() {
  return (
    <SkeletonGroup label="Loading settings" className={styles.skeleton}>
      {[6, 4, 6].map((rows, index) => (
        <div key={index} className={styles.skeletonSection}>
          <div className={styles.skeletonHeading}>
            <Skeleton shape="heading" width="1/2" />
            <Skeleton shape="text" lines={3} />
          </div>
          <div className={styles.skeletonRows}>
            {Array.from({ length: rows }, (_, row) => (
              <Skeleton key={row} shape="control" />
            ))}
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}
