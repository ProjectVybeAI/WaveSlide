// Table: a semantic <table> with ruled rows, a sticky header and a name (caption).
// Wider than its box, it becomes a labelled, keyboard-focusable scroll region (WCAG 2.1.1),
// with a fade on the edge that still has columns to show. Pieces:
//   Th sort/onSort  -> the header is a real button and the <th> carries aria-sort
//   Th/Td align="end" -> right-aligned tabular figures for numbers
//   RowLink         -> a real <a> whose hit area covers the whole row
//   TableEmpty      -> one full-width row for "no results"
import { clsx } from "clsx";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import styles from "./Table.module.css";

export type TableProps = {
  /** Every table is named. Hide it visually when a heading right above already says it. */
  caption: string;
  captionHidden?: boolean;
  /** Rows per screen: "compact" for dense tools, "comfortable" for apps. */
  density?: "compact" | "comfortable";
  children: ReactNode;
  /** Applied to the scroll box: give it a max-height to keep the header sticky inside the table. */
  className?: string;
};

export function Table({ caption, captionHidden = false, density = "compact", children, className }: TableProps) {
  const box = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false); // wider than its box
  const [more, setMore] = useState(false); // columns still hidden to the right

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => {
      setScrolls(element.scrollWidth > element.clientWidth + 1);
      setMore(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
    };
    measure();
    element.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => {
      element.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, []);

  // Only a table that scrolls is a tab stop; one that fits would be a pointless extra stop.
  const regionProps = scrolls ? { tabIndex: 0, role: "region", "aria-label": caption } : {};
  return (
    <div className={styles.outer}>
      <div ref={box} className={clsx(styles.box, className)} {...regionProps}>
        <table className={clsx(styles.table, styles[density])}>
          <caption className={captionHidden ? styles.hiddenCaption : styles.caption}>{caption}</caption>
          {children}
        </table>
      </div>
      {more ? <span className={styles.fade} aria-hidden="true" /> : null}
    </div>
  );
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} className={clsx(styles.head, props.className)} />;
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} className={clsx(styles.body, props.className)} />;
}

/** `selected` only tints the row; say "selected" with a checkbox in the row, not with colour. */
export function Tr({ selected, className, ...rest }: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return <tr {...rest} className={clsx(styles.row, selected && styles.selected, className)} />;
}

type Align = "start" | "end" | "center";
export type SortDirection = "ascending" | "descending" | "none";

type ThProps = Omit<ThHTMLAttributes<HTMLTableCellElement>, "align"> & {
  align?: Align;
  /** Makes the header a sort button. "none" = sortable but not the current sort column. */
  sort?: SortDirection;
  onSort?: () => void;
};

const SORT_ICONS = { ascending: ArrowUp, descending: ArrowDown, none: ArrowUpDown };

export function Th({ align = "start", sort, onSort, scope = "col", className, children, ...rest }: ThProps) {
  const sortable = sort !== undefined && onSort !== undefined;
  const SortIcon = sort ? SORT_ICONS[sort] : null;
  return (
    <th
      {...rest}
      scope={scope}
      // aria-sort only on the column that is actually sorted; "none" would be noise on every header.
      aria-sort={sort && sort !== "none" ? sort : undefined}
      className={clsx(styles.th, styles[align], className)}
    >
      {sortable && SortIcon ? (
        <button type="button" className={styles.sort} onClick={onSort}>
          <span>{children}</span>
          <SortIcon className={clsx(styles.sortIcon, sort === "none" && styles.sortIdle)} aria-hidden="true" />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

type TdProps = Omit<TdHTMLAttributes<HTMLTableCellElement>, "align"> & {
  align?: Align;
  /** Cut long text to one line with an ellipsis; a string child also becomes the hover title. */
  truncate?: boolean;
};

export function Td({ align = "start", truncate, className, children, title, ...rest }: TdProps) {
  return (
    <td
      {...rest}
      title={title ?? (truncate && typeof children === "string" ? children : undefined)}
      className={clsx(styles.td, styles[align], truncate && styles.truncate, className)}
    >
      {children}
    </td>
  );
}

/** The record's link, usually in the first cell. Its ::after stretches over the row, so a click
    anywhere opens the record while the keyboard and screen readers still meet a real link. */
export function RowLink({
  className,
  ref,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { ref?: Ref<HTMLAnchorElement> }) {
  // Children arrive through `rest`, so the link always has content.
  // eslint-disable-next-line jsx-a11y/anchor-has-content
  return <a ref={ref} {...rest} className={clsx(styles.rowLink, className)} />;
}

/** For a router link in a row: <Link to="/leases/42" className={rowLinkClassName}>Flat 4B</Link>. */
export const rowLinkClassName = styles.rowLink;

/** Shown in place of rows when there are none: say why, and offer the one action that helps. */
export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className={styles.empty}>
        {children}
      </td>
    </tr>
  );
}
