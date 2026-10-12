// Stand-in for a screen a later phase builds. Says what will be here and when, never a blank page.
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState, PageHeader } from "@/components/ui";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import styles from "./PlaceholderPage.module.css";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  comingIn: string;
  children?: ReactNode;
};

export function PlaceholderPage({ title, description, icon, comingIn, children }: Props) {
  useDocumentTitle(title);
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className={styles.body}>
        {children}
        <EmptyState icon={icon} title={`${title} arrives in ${comingIn}`} body={description} />
      </div>
    </>
  );
}
