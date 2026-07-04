'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
} from '@landi-flow/ui';
import { Inbox, Layers, LayoutList, Sparkles } from 'lucide-react';
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
import { getEpicById, getStoriesForEpic } from '@/lib/seed-data';
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';

export interface AppShellProps {
  children: React.ReactNode;
  viewTitle: string;
  breadcrumbs?: string[];
}

/** Three-panel workspace shell with command palette and keyboard nav. */
export function AppShell({
  children,
  viewTitle,
  breadcrumbs = [],
}: AppShellProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const { epics, selectedEpicId } = useEpicStore();
  const { stories, selectedStoryId } = useStoryStore();

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
        label: 'Create Story',
        shortcut: 'C',
        group: 'Suggested Actions',
        onSelect: () => navigate('/workspace/stories'),
      },
      {
        id: 'create-epic',
        label: 'Create Epic',
        group: 'Suggested Actions',
        onSelect: () => navigate('/workspace/epics'),
      },
      {
        id: 'goto-inbox',
        label: 'Go to Inbox',
        shortcut: 'G I',
        group: 'Navigation',
        onSelect: () => navigate('/workspace/inbox'),
      },
      {
        id: 'goto-stories',
        label: 'Go to Stories',
        shortcut: 'G S',
        group: 'Navigation',
        onSelect: () => navigate('/workspace/stories'),
      },
      {
        id: 'goto-epics',
        label: 'Go to Epics',
        shortcut: 'G E',
        group: 'Navigation',
        onSelect: () => navigate('/workspace/epics'),
      },
    ],
    [navigate],
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
          label: 'Inbox',
          href: '/workspace/inbox',
          icon: <Inbox className="h-4 w-4" />,
          active: pathname === '/workspace/inbox' || pathname === '/workspace',
          shortcutHint: gKeyHintsVisible ? 'I' : undefined,
          onClick: () => navigate('/workspace/inbox'),
        },
        {
          id: 'stories',
          label: 'My Stories',
          href: '/workspace/stories',
          icon: <LayoutList className="h-4 w-4" />,
          active: pathname.startsWith('/workspace/stories'),
          shortcutHint: gKeyHintsVisible ? 'S' : undefined,
          onClick: () => navigate('/workspace/stories'),
        },
      ],
    },
    {
      id: 'epics',
      title: 'Epics',
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
      title: 'Views',
      items: [
        {
          id: 'epic-board',
          label: 'Epic Board',
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
    <WorkspaceThemeProvider>
      <SidebarLayout
        sidebar={
          <Sidebar
            workspaceName="Landi Flow"
            logoUrl={brandAssets.logoMark}
            sections={sidebarSections}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
            footer={
              <div className="flex items-center gap-2">
                <Image
                  src={brandAssets.logoWordmark}
                  alt="Landi Flow wordmark"
                  width={120}
                  height={24}
                  className="h-5 w-auto opacity-60"
                />
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
                      <li key={crumb} className="flex items-center gap-1">
                        {index > 0 ? <span aria-hidden>/</span> : null}
                        <span>{crumb}</span>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}
              <h1 className="truncate text-sm font-semibold text-foreground">{viewTitle}</h1>
            </div>
            <CommandPaletteTrigger onOpen={() => setCommandOpen(true)} />
            <Button
              size="sm"
              onClick={() => navigate('/workspace/stories')}
              title="Tip: Press 'C'"
            >
              Create Story
            </Button>
          </div>
        }
        inspector={
          inspectorOpen ? (
            <ObsErrorBoundary fallbackMessage="Unable to render the properties panel.">
              {showStoryInspector ? (
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
