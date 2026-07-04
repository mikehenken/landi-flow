'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SidebarNavItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
  shortcutHint?: string;
  onClick?: () => void;
}

export interface SidebarSection {
  id: string;
  title?: string;
  items: SidebarNavItem[];
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  workspaceName: string;
  logoUrl?: string;
  sections: SidebarSection[];
  footer?: React.ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Left navigation shell — 240px fixed width per shared-design-system.
 * Uses Epic (never Project) nomenclature in default i18n messages.
 */
export function Sidebar({
  workspaceName,
  logoUrl,
  sections,
  footer,
  collapsed = false,
  onToggleCollapse,
  className,
  ...props
}: SidebarProps): React.ReactElement {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-surface transition-[width] duration-150 ease-out',
        collapsed ? 'w-14' : 'w-60',
        className,
      )}
      aria-label="Main navigation"
      {...props}
    >
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${workspaceName} logo`}
            className="h-6 w-6 shrink-0 rounded object-contain"
          />
        ) : (
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-xs font-semibold text-primary-foreground"
            aria-hidden
          >
            {workspaceName.charAt(0).toUpperCase()}
          </div>
        )}
        {!collapsed ? (
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {workspaceName}
          </span>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section) => (
          <div key={section.id} className="mb-4">
            {section.title && !collapsed ? (
              <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                {section.title}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.id}>
                  <SidebarNavButton item={item} collapsed={collapsed} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {footer ? (
        <div className="border-t border-border p-3">{footer}</div>
      ) : null}

      {onToggleCollapse ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="border-t border-border px-4 py-2 text-left text-xs text-foreground-subtle hover:bg-white/5 hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '← Collapse'}
        </button>
      ) : null}
    </aside>
  );
}

interface SidebarNavButtonProps {
  item: SidebarNavItem;
  collapsed: boolean;
}

function SidebarNavButton({
  item,
  collapsed,
}: SidebarNavButtonProps): React.ReactElement {
  const content = (
    <>
      {item.icon ? (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {item.icon}
        </span>
      ) : null}
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
          {item.shortcutHint ? (
            <kbd className="ml-auto rounded-sm bg-black/20 px-1.5 py-0.5 font-mono text-xs text-foreground-subtle">
              {item.shortcutHint}
            </kbd>
          ) : null}
        </>
      ) : null}
    </>
  );

  const className = cn(
    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-100',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    item.active
      ? 'bg-white/10 font-medium text-foreground'
      : 'font-normal text-muted-foreground hover:bg-white/5 hover:text-foreground',
  );

  if (item.href) {
    return (
      <a href={item.href} className={className} aria-current={item.active ? 'page' : undefined}>
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={item.onClick}
      aria-current={item.active ? 'page' : undefined}
    >
      {content}
    </button>
  );
}

export interface SidebarLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar: React.ReactNode;
  header?: React.ReactNode;
  inspector?: React.ReactNode;
  children: React.ReactNode;
}

/** Three-panel layout foundation per shared-design-system. */
export function SidebarLayout({
  sidebar,
  header,
  inspector,
  children,
  className,
  ...props
}: SidebarLayoutProps): React.ReactElement {
  return (
    <div className={cn('flex h-screen w-full overflow-hidden', className)} {...props}>
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {header ? (
          <header className="flex h-12 shrink-0 items-center border-b border-border px-6">
            {header}
          </header>
        ) : null}
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
      {inspector ? (
        <aside className="w-[280px] shrink-0 border-l border-border bg-surface-elevated">
          {inspector}
        </aside>
      ) : null}
    </div>
  );
}
