// UI primitives
export { Button, buttonVariants, type ButtonProps } from './components/ui/button';
export { Input, type InputProps } from './components/ui/input';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/ui/card';
export { Badge, badgeVariants, type BadgeProps } from './components/ui/badge';
export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  avatarVariants,
  type AvatarProps,
} from './components/ui/avatar';

// Layout
export {
  Sidebar,
  SidebarLayout,
  type SidebarProps,
  type SidebarNavItem,
  type SidebarSection,
  type SidebarLayoutProps,
} from './components/sidebar/sidebar';

// Command palette
export {
  CommandPalette,
  CommandPaletteTrigger,
  type CommandPaletteProps,
  type CommandPaletteAction,
  type CommandPaletteTriggerProps,
} from './components/command/command-palette';

// Domain badges (HITM: Epic / Story)
export {
  EpicBadge,
  EpicIdentifierBadge,
  type EpicBadgeProps,
  type EpicStatusCategory,
  type EpicIdentifierBadgeProps,
} from './components/badges/epic-badge';
export {
  StoryBadge,
  StoryIdentifierBadge,
  StoryPriorityBadge,
  type StoryBadgeProps,
  type StoryWorkflowStatus,
  type StoryIdentifierBadgeProps,
  type StoryPriorityBadgeProps,
} from './components/badges/story-badge';

// OBS-001 observability
export {
  ErrorFallback,
  ErrorToastContent,
  type ErrorFallbackProps,
  type ErrorToastContentProps,
  type CorrelationContext,
} from './components/observability/error-fallback';

// Theming
export {
  WorkspaceThemeProvider,
  mapWorkspaceThemeToCssVars,
  DEFAULT_THEME_TOKENS,
  OVERRIDABLE_THEME_KEYS,
  type WorkspaceThemeProviderProps,
  type WorkspaceThemePayload,
  type HslToken,
  type OverridableThemeKey,
} from './theme';

// i18n
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  messages,
  i18nConfig,
  useTranslations,
  useLocale,
  useFormatter,
  type SupportedLocale,
  type Messages,
} from './i18n';

// Utilities
export { cn } from './lib/utils';
