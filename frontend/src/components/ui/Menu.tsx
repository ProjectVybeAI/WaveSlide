// Menu: a Radix dropdown for row actions and overflow commands (arrow keys, typeahead, Esc,
// focus returns to the trigger). Compose it like Radix:
//   <Menu><MenuTrigger asChild><IconButton icon={Ellipsis} label="More actions" /></MenuTrigger>
//     <MenuContent><MenuItem onSelect={rename}>Rename</MenuItem></MenuContent></Menu>
import { clsx } from "clsx";
import { Check, type LucideIcon } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import styles from "./Menu.module.css";

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;
export const MenuRadioGroup = DropdownMenu.RadioGroup;

export function MenuContent({ className, children, ...rest }: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="end"
        sideOffset={4}
        collisionPadding={16}
        {...rest}
        className={clsx(styles.content, className)}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

type MenuItemProps = ComponentProps<typeof DropdownMenu.Item> & {
  icon?: LucideIcon;
  /** Red text for an item that deletes or removes; its confirm step happens in a ConfirmDialog. */
  danger?: boolean;
};

export function MenuItem({ icon: Icon, danger, className, children, ...rest }: MenuItemProps) {
  return (
    <DropdownMenu.Item {...rest} className={clsx(styles.item, danger && styles.danger, className)}>
      {Icon ? <Icon className={styles.icon} aria-hidden="true" /> : null}
      <span className={styles.text}>{children}</span>
    </DropdownMenu.Item>
  );
}

/** One choice from a set (sort order, density). The chosen one shows a tick and weight, not colour alone. */
export function MenuRadioItem({ className, children, ...rest }: ComponentProps<typeof DropdownMenu.RadioItem>) {
  return (
    <DropdownMenu.RadioItem {...rest} className={clsx(styles.item, className)}>
      <span className={styles.check} aria-hidden="true">
        <DropdownMenu.ItemIndicator>
          <Check className={styles.icon} />
        </DropdownMenu.ItemIndicator>
      </span>
      <span className={styles.text}>{children}</span>
    </DropdownMenu.RadioItem>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <DropdownMenu.Label className={styles.label}>{children}</DropdownMenu.Label>;
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className={styles.separator} />;
}
