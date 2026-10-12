// Tabs: views inside one page (Radix: arrow keys move between tabs, one tab stop for the list).
// Keep the chosen tab in the URL when it matters (value + onValueChange on <Tabs>).
// TabsList `overflow`: "scroll" keeps one row and scrolls sideways (the selected tab starts in
// view); "wrap" lets tabs flow onto more rows. Either way focus rings are drawn so nothing clips them.
import { clsx } from "clsx";
import { Tabs as RadixTabs } from "radix-ui";
import { useEffect, useRef, type ComponentProps } from "react";
import styles from "./Tabs.module.css";

export const Tabs = RadixTabs.Root;

type TabsListProps = ComponentProps<typeof RadixTabs.List> & {
  overflow?: "scroll" | "wrap";
};

export function TabsList({ overflow = "scroll", className, ...rest }: TabsListProps) {
  const list = useRef<HTMLDivElement>(null);
  // Scroll only the strip (scrollIntoView would also move the page) to centre the active tab.
  useEffect(() => {
    const strip = list.current;
    const tab = strip?.querySelector<HTMLElement>('[data-state="active"]');
    if (!strip || !tab || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollLeft = tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2;
  }, []);
  return <RadixTabs.List {...rest} ref={list} className={clsx(styles.list, styles[overflow], className)} />;
}

export function TabsTrigger({ className, ...rest }: ComponentProps<typeof RadixTabs.Trigger>) {
  return <RadixTabs.Trigger {...rest} className={clsx(styles.trigger, className)} />;
}

export function TabsContent({ className, ...rest }: ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content {...rest} className={clsx(styles.content, className)} />;
}
