'use client';



import * as React from 'react';

import Image from 'next/image';

import {

  CommandPalette,

  Sidebar,

  SidebarLayout,

  type CommandPaletteAction,

  type SidebarSection,

  WorkspaceThemeProvider,

  cn,

  useTranslations,

  useTerminology,

} from '@landi-flow/ui';

import {
  Bot,
  Inbox,
  Layers,
  LayoutList,
  Map,
  Radio,
  Search,
  Settings,
  Sparkles,
  Target,
  User,
  Users,
} from 'lucide-react';

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

import {
  CreateStoryModal,
  CreateModalsProvider,
} from '@/components/create-story-modal';
import { CreateEpicModal } from '@/components/create-epic-modal';
import { CreateCustomerModal } from '@/components/create-customer-modal';
import { CreateMemberModal } from '@/components/create-member-modal';
import { CreateResourceDropdown } from '@/components/create-resource-dropdown';

import { WorkspacePresenceLobby } from '@/components/collaboration';

import { getEpicById, getStoriesForEpic } from '@/lib/seed-data';

import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';

import { useIsMobile } from '@/hooks/use-media-query';

import { useShellSidebarPreference } from '@/hooks/use-shell-sidebar-preference';

import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useWorkspace, getWorkspaceLogoUrl, getWorkspaceTheme } from '@/lib/workspace';
import { isEpicDetailRoute } from '@/lib/route-matchers';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { StoryDetailLayoutRoot } from '@/components/story-detail-panel';
import { WorkspaceSwitcher } from '@/components/navigation/workspace-switcher';
import { KeyboardShortcutsOverlay } from '@/components/navigation/keyboard-shortcuts-overlay';
import { DEMO_TEAM_ID } from '@/lib/seed-data';
import type { ResolvedWorkspace } from '@/lib/workspace/registry';



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

  const { t: tEntity } = useTerminology();

  const { epics, selectedEpicId } = useEpicStore();

  const { stories, selectedStoryId } = useStoryStore();



  const themeSettings = getWorkspaceTheme(workspace);

  const logoUrl = getWorkspaceLogoUrl(workspace) ?? brandAssets.logoMark;



  const { collapsed: sidebarCollapsed, toggleCollapsed: toggleSidebarCollapsed } =
    useShellSidebarPreference();

  const isMobile = useIsMobile();

  const effectiveSidebarCollapsed = isMobile ? true : sidebarCollapsed;

  const [inspectorOpen, setInspectorOpen] = React.useState(true);

  const [commandOpen, setCommandOpen] = React.useState(false);

  const [createStoryOpen, setCreateStoryOpen] = React.useState(false);
  const [createEpicOpen, setCreateEpicOpen] = React.useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = React.useState(false);
  const [createMemberOpen, setCreateMemberOpen] = React.useState(false);

  const [gKeyHintsVisible, setGKeyHintsVisible] = React.useState(false);
  const [shortcutsOverlayOpen, setShortcutsOverlayOpen] = React.useState(false);

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



  const openCreateStory = React.useCallback(() => {
    setCreateStoryOpen(true);
  }, []);

  const openCreateEpic = React.useCallback(() => {
    setCreateEpicOpen(true);
  }, []);

  const openCreateCustomer = React.useCallback(() => {
    setCreateCustomerOpen(true);
  }, []);

  const openCreateMember = React.useCallback(() => {
    setCreateMemberOpen(true);
  }, []);

  const closeAllCreateModals = React.useCallback(() => {
    setCreateStoryOpen(false);
    setCreateEpicOpen(false);
    setCreateCustomerOpen(false);
    setCreateMemberOpen(false);
  }, []);

  const createModalsValue = React.useMemo(
    () => ({
      openCreateStory,
      openCreateEpic,
      openCreateCustomer,
      openCreateMember,
    }),
    [openCreateStory, openCreateEpic, openCreateCustomer, openCreateMember],
  );



  const handleCommandStorySelect = React.useCallback(

    (storyId: string) => {

      storyStore.selectStory(storyId);

      navigate('/workspace/stories');

    },

    [navigate],

  );



  const handleCommandEpicSelect = React.useCallback(

    (epicId: string) => {

      epicStore.selectEpic(epicId);

      navigate(`/workspace/epics/${epicId}`);

    },

    [navigate],

  );



  const commandStories = React.useMemo(

    () =>

      stories.map((story) => ({

        id: story.id,

        identifier: story.identifier,

        title: story.title,

        onSelect: () => handleCommandStorySelect(story.id),

      })),

    [stories, handleCommandStorySelect],

  );



  const commandEpics = React.useMemo(

    () =>

      epics.map((epic) => ({

        id: epic.id,

        name: epic.name,

        onSelect: () => handleCommandEpicSelect(epic.id),

      })),

    [epics, handleCommandEpicSelect],

  );



  const commandActions: CommandPaletteAction[] = React.useMemo(

    () => [

      {

        id: 'create-story',

        label: `${tCommon('actions.create')} ${tEntity('entity.story')}`,

        shortcut: 'C',

        group: tNav('command_palette.suggested_actions'),

        onSelect: openCreateStory,

      },

      {

        id: 'create-epic',

        label: `${tCommon('actions.create')} ${tEntity('entity.epic')}`,

        group: tNav('command_palette.suggested_actions'),

        onSelect: openCreateEpic,

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

        label: `${tNav('command_palette.goto_prefix')} ${tEntity('entity.stories')}`,

        shortcut: 'G S',

        group: tNav('command_palette.navigation_group'),

        onSelect: () => navigate('/workspace/stories'),

      },

      {

        id: 'goto-epics',

        label: `${tNav('command_palette.goto_prefix')} ${tEntity('entity.epics')}`,

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

      {

        id: 'goto-my-issues',

        label: tNav('views.my_issues'),

        group: tNav('command_palette.navigation_group'),

        onSelect: () => navigate('/workspace/my-issues'),

      },

      {

        id: 'goto-views',

        label: 'Saved views',

        group: tNav('command_palette.navigation_group'),

        onSelect: () => navigate('/workspace/views'),

      },

      {

        id: 'goto-triage',

        label: 'Team triage',

        group: tNav('command_palette.navigation_group'),

        onSelect: () => navigate(`/workspace/team/${DEMO_TEAM_ID}/triage`),

      },

      {

        id: 'goto-initiatives',

        label: 'Initiatives',

        group: tNav('command_palette.navigation_group'),

        onSelect: () => navigate('/workspace/initiatives'),

      },

      {

        id: 'goto-pulse',

        label: 'Pulse',

        group: tNav('command_palette.navigation_group'),

        onSelect: () => navigate('/workspace/pulse'),

      },

      {

        id: 'goto-roadmap',

        label: 'Roadmap',

        group: tNav('command_palette.navigation_group'),

        onSelect: () => navigate('/workspace/roadmap'),

      },

      {

        id: 'goto-settings-taxonomy',

        label: 'Settings: taxonomy',

        group: tNav('command_palette.suggested_actions'),

        onSelect: () => navigate('/workspace/settings/taxonomy'),

      },

    ],

    [navigate, openCreateStory, openCreateEpic, tCommon, tEntity, tNav],

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

    onToggleSidebar: () => {
      if (!isMobile) {
        toggleSidebarCollapsed();
      }
    },

    onToggleInspector: () => setInspectorOpen((prev) => !prev),

    onCreateStory: openCreateStory,

    onEscape: () => {
      setCommandOpen(false);
      closeAllCreateModals();
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

  React.useEffect(() => {
    const handleQuestionMark = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable === true;
      if (isEditable || event.metaKey || event.ctrlKey) {
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        setShortcutsOverlayOpen(true);
      }
    };
    window.addEventListener('keydown', handleQuestionMark);
    return () => window.removeEventListener('keydown', handleQuestionMark);
  }, []);

  const handleWorkspaceSwitch = React.useCallback((next: ResolvedWorkspace): void => {
    if (typeof document !== 'undefined') {
      document.cookie = `workspace-id=${encodeURIComponent(next.id)}; path=/; samesite=lax`;
      window.location.reload();
    }
  }, []);



  React.useEffect(() => {
    if (isMobile) {
      setInspectorOpen(false);
    }
  }, [isMobile]);



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

          label: tNav('views.stories_nav', { stories: tEntity('entity.stories') }),

          href: '/workspace/stories',

          icon: <LayoutList className="h-4 w-4" />,

          active: pathname === '/workspace/stories',

          shortcutHint: gKeyHintsVisible ? 'S' : undefined,

          onClick: () => navigate('/workspace/stories'),

        },

        {

          id: 'my-issues',

          label: tNav('views.my_issues'),

          href: '/workspace/my-issues',

          icon: <User className="h-4 w-4" />,

          active: pathname === '/workspace/my-issues',

          onClick: () => navigate('/workspace/my-issues'),

        },

        {

          id: 'triage',

          label: 'Triage',

          href: `/workspace/team/${DEMO_TEAM_ID}/triage`,

          icon: <Inbox className="h-4 w-4" />,

          active: pathname.includes('/triage'),

          onClick: () => navigate(`/workspace/team/${DEMO_TEAM_ID}/triage`),

        },

        {

          id: 'stories-board',

          label: tNav('views.entity_board', { entity: tEntity('entity.story') }),

          href: '/workspace/stories/board',

          icon: <LayoutList className="h-4 w-4" />,

          active: pathname.startsWith('/workspace/stories/board'),

          onClick: () => navigate('/workspace/stories/board'),

        },

        {

          id: 'stories-drafts',

          label: 'Drafts',

          href: '/workspace/stories/drafts',

          icon: <LayoutList className="h-4 w-4" />,

          active: pathname.startsWith('/workspace/stories/drafts'),

          onClick: () => navigate('/workspace/stories/drafts'),

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

      title: tEntity('entity.epics'),

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

          id: 'saved-views',

          label: 'Saved views',

          href: '/workspace/views',

          icon: <LayoutList className="h-4 w-4" />,

          active: pathname === '/workspace/views',

          onClick: () => navigate('/workspace/views'),

        },

        {

          id: 'epic-board',

          label: tNav('views.entity_board', { entity: tEntity('entity.epic') }),

          href: '/workspace/epics',

          icon: <Sparkles className="h-4 w-4" />,

          active: pathname === '/workspace/epics',

          shortcutHint: gKeyHintsVisible ? 'E' : undefined,

          onClick: () => navigate('/workspace/epics'),

        },

        {

          id: 'initiatives',

          label: 'Initiatives',

          href: '/workspace/initiatives',

          icon: <Target className="h-4 w-4" />,

          active: pathname.startsWith('/workspace/initiatives'),

          onClick: () => navigate('/workspace/initiatives'),

        },

        {

          id: 'pulse',

          label: 'Pulse',

          href: '/workspace/pulse',

          icon: <Radio className="h-4 w-4" />,

          active: pathname === '/workspace/pulse',

          onClick: () => navigate('/workspace/pulse'),

        },

        {

          id: 'roadmap',

          label: 'Roadmap',

          href: '/workspace/roadmap',

          icon: <Map className="h-4 w-4" />,

          active: pathname === '/workspace/roadmap',

          onClick: () => navigate('/workspace/roadmap'),

        },

        {

          id: 'customers',

          label: tNav('views.customers'),

          href: '/workspace/customers',

          icon: <Users className="h-4 w-4" />,

          active: pathname === '/workspace/customers',

          onClick: () => navigate('/workspace/customers'),

        },

      ],

    },

  ];



  const onStoriesRoute = pathname.includes('/stories');

  /** Story detail (modal or page aside) owns properties — avoid double sidebar (task-09p). */
  const showStoryInspector =
    pathname.includes('/inbox') ||
    (onStoriesRoute && !selectedStoryId) ||
    (Boolean(selectedStoryId) && !onStoriesRoute);

  const showEpicInspector =
    pathname.startsWith('/workspace/epics') &&
    !isEpicDetailRoute(pathname) &&
    !showStoryInspector;



  return (

    <StoryDetailLayoutRoot>

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

            collapsed={effectiveSidebarCollapsed}

            onToggleCollapse={() => {
              if (!isMobile) {
                toggleSidebarCollapsed();
              }
            }}

            footer={

              <div className="flex flex-col gap-2">

                {!effectiveSidebarCollapsed ? (
                  <nav
                    aria-label={tNav('settings.section')}
                    className="flex flex-col gap-1 border-b border-border pb-2"
                  >
                    <Link
                      href="/workspace/account"
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground',
                        'hover:bg-white/5 hover:text-foreground',
                        pathname === '/workspace/account' && 'bg-white/5 text-foreground',
                      )}
                    >
                      <User className="h-4 w-4 shrink-0" />
                      <span>{tNav('account.title')}</span>
                    </Link>
                    <Link
                      href="/workspace/settings/general"
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground',
                        'hover:bg-white/5 hover:text-foreground',
                        pathname.startsWith('/workspace/settings') &&
                          'bg-white/5 text-foreground',
                      )}
                    >
                      <Settings className="h-4 w-4 shrink-0" />
                      <span>{tNav('settings.title')}</span>
                    </Link>
                  </nav>
                ) : null}

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

          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">

            <WorkspaceSwitcher
              activeWorkspace={workspace}
              onSwitch={handleWorkspaceSwitch}
              className="hidden shrink-0 sm:block"
            />

            <div className="hidden h-6 w-px shrink-0 bg-border sm:block" aria-hidden />

            <div className="flex min-w-0 flex-1 flex-col justify-center">

              {breadcrumbs.length > 0 ? (

                <nav aria-label="Breadcrumb" className="hidden leading-none sm:block">

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

              <h1 className="truncate text-sm font-semibold leading-tight text-foreground">{viewTitle}</h1>

            </div>

            <div className="flex min-w-0 items-center gap-2">

            <button
              type="button"
              data-testid="command-palette-trigger"
              onClick={() => setCommandOpen(true)}
              className={cn(
                'inline-flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-sm text-muted-foreground sm:flex-initial sm:shrink-0',
                'hover:bg-white/5 hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden truncate sm:inline">Search…</span>
              <kbd className="ms-auto hidden rounded-sm bg-black/20 px-1.5 py-0.5 font-mono text-xs sm:inline">⌘K</kbd>
            </button>

            <div className="hidden shrink-0 sm:block">

              <WorkspacePresenceLobby workspaceId={workspace.id} />

            </div>

            <CreateResourceDropdown
              onCreateStory={openCreateStory}
              onCreateEpic={openCreateEpic}
              onCreateCustomer={openCreateCustomer}
              onCreateMember={openCreateMember}
              storyShortcutHint="C"
            />

            </div>

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

        <CreateModalsProvider value={createModalsValue}>

          <ObsErrorBoundary fallbackMessage="Unable to render this view.">

            {children}

          </ObsErrorBoundary>

        </CreateModalsProvider>

      </SidebarLayout>

      <CreateStoryModal open={createStoryOpen} onOpenChange={setCreateStoryOpen} />
      <CreateEpicModal open={createEpicOpen} onOpenChange={setCreateEpicOpen} />
      <CreateCustomerModal open={createCustomerOpen} onOpenChange={setCreateCustomerOpen} />
      <CreateMemberModal open={createMemberOpen} onOpenChange={setCreateMemberOpen} />

      <CommandPalette

        open={commandOpen}

        onOpenChange={setCommandOpen}

        actions={commandActions}

        stories={commandStories}

        epics={commandEpics}

        groupLabels={{

          stories: tEntity('entity.stories'),

          epics: tEntity('entity.epics'),

        }}

        placeholder={tNav('command_palette.search_placeholder', {
          stories: tEntity('entity.stories').toLowerCase(),
          epics: tEntity('entity.epics').toLowerCase(),
        })}

        emptyMessage={tNav('command_palette.no_results')}

      />

      <KeyboardShortcutsOverlay
        open={shortcutsOverlayOpen}
        onClose={() => setShortcutsOverlayOpen(false)}
      />

    </WorkspaceThemeProvider>

    </StoryDetailLayoutRoot>

  );

}

