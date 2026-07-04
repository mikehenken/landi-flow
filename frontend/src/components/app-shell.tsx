'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Button,
  CommandPalette,
  CommandPaletteTrigger,
  Sidebar,
  SidebarLayout,
  type CommandPaletteAction,
  type SidebarSection,
  WorkspaceThemeProvider,
  useTranslations,
} from '@landi-flow/ui';
import { Bot, Inbox, Layers, LayoutList, Sparkles } from 'lucide-react';
import { useEpicStore } from '@/hooks/use-epic-store';
import { useStoryStore } from '@/hooks/use-story-store';
import { epicStore } from '@/stores/epic-store';
import { storyStore } from '@/stores/story-store';
import { brandAssets } from '@/lib/correlation';
import {
  EpicInspector,
  StoryInspector,
} from '@/components/story-inspector';
import { ObsErrorBoundary } from '@/components/obs-error-boundary';
import { WorkspacePresenceLobby } from '@/components/collaboration';
import { getEpicById, getStoriesForEpic } from '@/lib/seed-data';
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useWorkspace, getWorkspaceLogoUrl, getWorkspaceTheme } from '@/lib/workspace';
import { LocaleSwitcher } from '@/components/locale-switcher';

export interface AppShellProps {
  children: React.ReactNode;
  viewTitle: string;
  breadcrumbs?: string[];
  /** Optional inspector override (e.g. the agent collaborators roster). */
  inspectorSlot?: React.ReactNode;
}

/** Three-panel workspace shell with command palette, i18n, and white-label theming. */
export function AppShell({
  children,
  viewTitle,
  breadcrumbs = [],
  inspectorSlot,
}: AppShellProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const { workspace } = useWorkspace();
  const tNav = useTranslations('navigation');
  const tCommon = useTranslations('common');
  const { epics, selectedEpicId } = useEpicStore();
  const { stories, selectedStoryId } = useStoryStore();

  const themeSettings = getWorkspaceTheme(workspace);
  const logoUrl = getWorkspaceLogoUrl(workspace) ?? brandAssets.logoMark;

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [inspectorOpen, setInspectorOpen] = React.useState(true);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [gKeyHintsVisible, setGKeyHintsVisible] = React.useState(false);
  const gKeyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [awaitingGSecondary, setAwaitingGSecondary] = React.useState(false);

  const selectedStory = stories.find((s) => s.id === selectedStoryId) ?? null;
  const selectedEpic = selectedEpicId ? getEpicById(selectedEpicId) ?? null : null;
  const epicStoryCount = selectedEpicId ? getStoriesForEpic(selectedEpicId).length : 0;

  const navigate = React.useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  const commandActions: CommandPaletteAction[] = React.useMemo(
    () => [
      {
        id: 'create-story',
        label: tNav('command_palette.create_story'),
        shortcut: 'C',
        group: tNav('command_palette.suggested_actions'),
        onSelect: () => navigate('/workspace/stories'),
      },
      {
        id: 'create-epic',
        label: tNav('command_palette.create_epic'),
        group: tNav('command_palette.suggested_actions'),
        onSelect: () => navigate('/workspace/epics'),
      },
      {
        id: 'goto-inbox',
        label: tNav('command_palette.goto_inbox'),
        shortcut: 'G I',
        group: tNav('command_palette.navigation_group'),
        onSelect: () => navigate('/workspace/inbox'),
      },
      {
        id: 'goto-stories',
        label: tNav('command_palette.goto_stories'),
        shortcut: 'G S',
        group: tNav('command_palette.navigation_group'),
        onSelect: () => navigate('/workspace/stories'),
      },
      {
        id: 'goto-epics',
        label: tNav('command_palette.goto_epics'),
        shortcut: 'G E',
        group: tNav('command_palette.navigation_group'),
        onSelect: () => navigate('/workspace/epics'),
      },
      {
        id: 'open-agents',
        label: tNav('command_palette.open_agents'),
        shortcut: 'G A',
        group: tNav('command_palette.navigation_group'),
        onSelect: () => navigate('/workspace/agents'),
      },
    ],
    [navigate, tNav],
  );

  const handleGKeyNavigation = React.useCallback(
    (secondary: string) => {
      setAwaitingGSecondary(false);
      setGKeyHintsVisible(false);
      switch (secondary) {
        case 'i':
          navigate('/workspace/inbox');
          break;
        case 's':
          navigate('/workspace/stories');
          break;
        case 'e':
          navigate('/workspace/epics');
          break;
        case 'a':
          navigate('/workspace/agents');
          break;
        default:
          break;
      }
    },
    [navigate],
  );

  useKeyboardNavigation({
    onCommandPalette: () => setCommandOpen(true),
    onToggleSidebar: () => setSidebarCollapsed((prev) => !prev),
    onToggleInspector: () => setInspectorOpen((prev) => !prev),
    onCreateStory: () => navigate('/workspace/stories'),
    onEscape: () => {
      setCommandOpen(false);
      setAwaitingGSecondary(false);
      setGKeyHintsVisible(false);
    },
    onGKey: () => {
      setAwaitingGSecondary(true);
      setGKeyHintsVisible(true);
      if (gKeyTimerRef.current) clearTimeout(gKeyTimerRef.current);
      gKeyTimerRef.current = setTimeout(() => setGKeyHintsVisible(false), 3000);
    },
    onGSecondary: handleGKeyNavigation,
    onCancelGSecondary: () => {
      setAwaitingGSecondary(false);
      setGKeyHintsVisible(false);
    },
    awaitingGSecondary,
  });

  React.useEffect(() => {
    return () => {
      if (gKeyTimerRef.current) clearTimeout(gKeyTimerRef.current);
    };
  }, []);

  const sidebarSections: SidebarSection[] = [
    {
      id: 'primary',
      items: [
        {
          id: 'inbox',
          label: tNav('views.inbox'),
          href: '/workspace/inbox',
          icon: <Inbox className="h-4 w-4" />,
          active: pathname === '/workspace/inbox' || pathname === '/workspace',
          shortcutHint: gKeyHintsVisible ? 'I' : undefined,
          onClick: () => navigate('/workspace/inbox'),
        },
        {
          id: 'stories',
          label: tNav('views.stories'),
          href: '/workspace/stories',
          icon: <LayoutList className="h-4 w-4" />,
          active: pathname === '/workspace/stories',
          shortcutHint: gKeyHintsVisible ? 'S' : undefined,
          onClick: () => navigate('/workspace/stories'),
        },
        {
          id: 'stories-board',
          label: tNav('views.story_board'),
          href: '/workspace/stories/board',
          icon: <LayoutList className="h-4 w-4" />,
          active: pathname.startsWith('/workspace/stories/board'),
          onClick: () => navigate('/workspace/stories/board'),
        },
        {
          id: 'agents',
          label: tNav('views.agents'),
          href: '/workspace/agents',
          icon: <Bot className="h-4 w-4" />,
          active: pathname.startsWith('/workspace/agents'),
          shortcutHint: gKeyHintsVisible ? 'A' : undefined,
          onClick: () => navigate('/workspace/agents'),
        },
      ],
    },
    {
      id: 'epics',
      title: tNav('views.epics_section'),
      items: epics.slice(0, 4).map((epic) => ({
        id: epic.id,
        label: epic.name,
        href: `/workspace/epics/${epic.id}`,
        icon: <Layers className="h-4 w-4" />,
        active: pathname === `/workspace/epics/${epic.id}`,
        onClick: () => {
          epicStore.selectEpic(epic.id);
          navigate(`/workspace/epics/${epic.id}`);
        },
      })),
    },
    {
      id: 'views',
      title: tNav('views.views_section'),
      items: [
        {
          id: 'epic-board',
          label: tNav('views.epic_board'),
          href: '/workspace/epics',
          icon: <Sparkles className="h-4 w-4" />,
          active: pathname === '/workspace/epics',
          shortcutHint: gKeyHintsVisible ? 'E' : undefined,
          onClick: () => navigate('/workspace/epics'),
        },
      ],
    },
  ];

  const showStoryInspector =
    pathname.includes('/stories') ||
    pathname.includes('/inbox') ||
    Boolean(selectedStoryId);
  const showEpicInspector = pathname.startsWith('/workspace/epics') && !showStoryInspector;

  return (
    <WorkspaceThemeProvider
      theme={themeSettings}
      logoUrl={logoUrl}
      fontGoogleFamily={themeSettings?.font_google_family}
    >
      <SidebarLayout
        sidebar={
          <Sidebar
            workspaceName={workspace.name}
            logoUrl={logoUrl}
            sections={sidebarSections}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
            footer={
              <div className="flex flex-col gap-2">
                <LocaleSwitcher />
                <div className="flex items-center gap-2">
                  <Image
                    src={brandAssets.logoWordmark}
                    alt={tCommon('sidebar.powered_by')}
                    width={120}
                    height={24}
                    className="h-5 w-auto opacity-60"
                  />
                </div>
              </div>
            }
          />
        }
        header={
          <div className="flex w-full items-center gap-4">
            <div className="min-w-0 flex-1">
              {breadcrumbs.length > 0 ? (
                <nav aria-label="Breadcrumb" className="mb-0.5">
                  <ol className="flex items-center gap-1 text-xs text-foreground-subtle">
                    {breadcrumbs.map((crumb, index) => (
                      <li key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1">
                        {index > 0 ? <span aria-hidden>/</span> : null}
                        <span className="truncate">{crumb}</span>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}
              <h1 className="truncate text-sm font-semibold text-foreground">{viewTitle}</h1>
            </div>
            <CommandPaletteTrigger onOpen={() => setCommandOpen(true)} />
            <WorkspacePresenceLobby workspaceId={workspace.id} />
            <Button
              size="sm"
              onClick={() => navigate('/workspace/stories')}
              title={tCommon('app.keyboard_shortcut_hint', { shortcut: 'C' })}
            >
              {tCommon('actions.create_story')}
            </Button>
          </div>
        }
        inspector={
          inspectorOpen ? (
            <ObsErrorBoundary fallbackMessage="Unable to render the properties panel.">
              {inspectorSlot ? (
                inspectorSlot
              ) : showStoryInspector ? (
                <StoryInspector
                  story={selectedStory}
                  onClose={() => {
                    storyStore.selectStory(null);
                    setInspectorOpen(false);
                  }}
                />
              ) : showEpicInspector ? (
                <EpicInspector
                  epic={selectedEpic}
                  storyCount={epicStoryCount}
                  onClose={() => {
                    epicStore.selectEpic(null);
                    setInspectorOpen(false);
                  }}
                />
              ) : (
                <StoryInspector story={null} />
              )}
            </ObsErrorBoundary>
          ) : null
        }
      >
        <ObsErrorBoundary fallbackMessage="Unable to render this view.">
          {children}
        </ObsErrorBoundary>
      </SidebarLayout>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        actions={commandActions}
      />
    </WorkspaceThemeProvider>
  );
}
