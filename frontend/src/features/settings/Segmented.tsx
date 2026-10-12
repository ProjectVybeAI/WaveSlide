// A segmented choice (camera or replay, rules or trained model, full or compact): the kit's Tabs in
// its segmented look, with the empty panels Tabs needs so every tab's aria-controls points at something.
import type { LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import styles from "./Segmented.module.css";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
};

type Props<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentOption<T>[];
  /** Names the group for screen readers: "Recogniser". */
  label: string;
};

export function Segmented<T extends string>({ value, onValueChange, options, label }: Props<T>) {
  return (
    <Tabs value={value} onValueChange={(next) => onValueChange(next as T)}>
      <TabsList aria-label={label} overflow="wrap">
        {options.map(({ value: optionValue, label: text, icon: Icon, disabled }) => (
          <TabsTrigger key={optionValue} value={optionValue} disabled={disabled}>
            {Icon ? <Icon size={16} aria-hidden="true" /> : null}
            {text}
          </TabsTrigger>
        ))}
      </TabsList>
      {options.map(({ value: optionValue }) => (
        <TabsContent key={optionValue} value={optionValue} forceMount className={styles.panel} />
      ))}
    </Tabs>
  );
}
