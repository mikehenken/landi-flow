'use client';

import * as React from 'react';
import {
  Button,
  Input,
  InstantMarkdownEditor,
  cn,
  useTranslations,
} from '@landi-flow/ui';
import type { StoryPriority } from '@landi-flow/core/types';
import {
  BarChart3,
  Calendar,
  CircleDot,
  Flag,
  Link2,
  Star,
  User,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { MetadataPropertyRow } from '@/components/story-metadata-sidebar';
import { DEMO_TEAM_ID } from '@/lib/seed-data';
import { useWorkspace } from '@/lib/workspace';
import { WORKFLOW_STATES } from '@/lib/workflow-states';
import {
  getDefaultTeamId,
  getDefaultWorkflowStateId,
} from '@/lib/api/workspace-context';
import { isMockAuthEnabled } from '@/lib/api/config';
import { createStory as persistCreateStory } from '@/controllers/story-controller';
import { getTaxonomySettings, getStoryTemplateById } from '@/lib/taxonomy/taxonomy-store';
import {
  StoryEpicPicker,
  StoryPriorityPicker,
  StoryStatusPicker,
} from '@/components/story-property-pickers';
import { useCap004Dialog } from '@/components/create-modal-utils';

export type {
  CreateModalsProviderProps,
} from '@/components/create-modals-context';
export {
  CreateModalsProvider,
  CreateStoryModalProvider,
  useOpenCreateStoryModal,
  useOpenCreateEpicModal,
  useOpenCreateCustomerModal,
  useOpenCreateMemberModal,
} from '@/components/create-modals-context';

export interface CreateStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Create Story modal (CAP-004) — Shortcut-style split layout with metadata sidebar.
 */
export function CreateStoryModal({
  open,
  onOpenChange,
}: CreateStoryModalProps): React.ReactElement {
  const { workspace } = useWorkspace();
  const t = useTranslations('stories');
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const [title, setTitle] = React.useState('');
  const [descriptionMd, setDescriptionMd] = React.useState('');
  const [workflowStateId, setWorkflowStateId] = React.useState<string>(WORKFLOW_STATES.todo);
  const [priority, setPriority] = React.useState<StoryPriority>('none');
  const [epicId, setEpicId] = React.useState<string | null>(null);
  const [createMore, setCreateMore] = React.useState(false);
  const [editorKey, setEditorKey] = React.useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const storyTemplates = React.useMemo(() => getTaxonomySettings().story_templates, []);

  const applyTemplate = React.useCallback((templateId: string): void => {
    if (!templateId) {
      return;
    }
    const template = getStoryTemplateById(templateId);
    if (!template) {
      return;
    }
    setTitle(template.title_template);
    setDescriptionMd(template.description_md);
    setPriority(template.default_priority);
    setWorkflowStateId(template.default_workflow_state_id);
    setEditorKey((key) => key + 1);
  }, []);

  const resetPropertyFields = React.useCallback((): void => {
    setWorkflowStateId(WORKFLOW_STATES.todo);
    setPriority('none');
    setEpicId(null);
  }, []);

  const resetFormFields = React.useCallback((): void => {
    setTitle('');
    setDescriptionMd('');
    resetPropertyFields();
    setEditorKey((key) => key + 1);
    requestAnimationFrame(() => titleInputRef.current?.focus());
  }, [resetPropertyFields]);

  const handleClose = React.useCallback((): void => {
    onOpenChange(false);
    setCreateMore(false);
    setTitle('');
    setDescriptionMd('');
    resetPropertyFields();
    setEditorKey((key) => key + 1);
  }, [onOpenChange, resetPropertyFields]);

  const dialogRef = useCap004Dialog({
    open,
    onOpenChange: handleClose,
    panelRef,
    initialFocusRef: titleInputRef,
  });

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        titleInputRef.current?.focus();
        return;
      }

      const teamId = isMockAuthEnabled() ? DEMO_TEAM_ID : getDefaultTeamId();
      if (!teamId) {
        return;
      }

      const resolvedWorkflowStateId = isMockAuthEnabled()
        ? workflowStateId
        : getDefaultWorkflowStateId() ?? workflowStateId;

      void persistCreateStory({
        title: trimmedTitle,
        descriptionMd: descriptionMd.trim() || null,
        workspaceId: workspace.id,
        teamId,
        workflowStateId: resolvedWorkflowStateId,
        priority,
        epicId,
      }).then(() => {
        if (createMore) {
          resetFormFields();
          return;
        }
        handleClose();
      });
    },
    [
      title,
      descriptionMd,
      workflowStateId,
      priority,
      epicId,
      createMore,
      workspace.id,
      resetFormFields,
      handleClose,
    ],
  );

  return (
    <dialog
      ref={dialogRef}
      data-testid="create-story-modal"
      aria-labelledby="create-story-modal-title"
      className={cn(
        'fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0',
        'backdrop:bg-black/50 backdrop:backdrop-blur-sm',
      )}
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      onClose={handleClose}
    >
      <div
        className="flex min-h-full items-center justify-center p-[5vh_5vw]"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            handleClose();
          }
        }}
      >
        <div
          ref={panelRef}
          role="document"
          className={cn(
            'flex h-[min(90vh,960px)] max-h-[90vh] w-[min(90vw,1400px)] max-w-[90vw] flex-col overflow-hidden',
            'rounded-[10px] border border-border/80 bg-[#0b0e14] shadow-2xl',
          )}
        >
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <header className="flex shrink-0 items-center justify-between border-b border-border/60 px-6 py-3">
              <h2
                id="create-story-modal-title"
                className="text-base font-semibold text-foreground"
              >
                {t('create.title')}
              </h2>
              <Button type="button" variant="ghost" size="sm" aria-label="Close" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
              <div className="min-w-0 overflow-y-auto px-6 py-5">
                <div className="space-y-5">
                  {storyTemplates.length > 0 ? (
                    <label className="flex flex-col gap-1 text-sm" data-testid="create-story-template">
                      <span className="text-muted-foreground">Template (CAP-009)</span>
                      <select
                        className="rounded-md border border-border bg-transparent px-2 py-1.5"
                        value={selectedTemplateId}
                        onChange={(event) => {
                          const value = event.target.value;
                          setSelectedTemplateId(value);
                          applyTemplate(value);
                        }}
                      >
                        <option value="">None</option>
                        {storyTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm text-muted-foreground">Story Title</span>
                    <Input
                      ref={titleInputRef}
                      data-testid="create-story-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder={t('create.title_placeholder')}
                      className="h-10 border-border/60 bg-white/[0.03]"
                      aria-label={t('create.title_placeholder')}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm text-muted-foreground">
                      Description <span className="italic">Optional</span>
                    </span>
                    <InstantMarkdownEditor
                      key={editorKey}
                      value={descriptionMd}
                      onChange={setDescriptionMd}
                      placeholder={t('create.description_placeholder')}
                      variant="default"
                      aria-label={t('create.description_placeholder')}
                      className="min-h-[160px] rounded-md border border-border/60 bg-white/[0.03] px-3 py-2"
                    />
                  </label>
                </div>
              </div>

              <aside className="min-w-0 overflow-y-auto border-l border-border/60 bg-surface/30 px-4 py-5">
                <div
                  data-testid="create-story-property-chips"
                  className="space-y-0.5"
                  aria-label={t('create.properties_label')}
                >
                  <MetadataPropertyRow icon={<Users className="h-4 w-4" />} label="Team">
                    <span>Team 1</span>
                  </MetadataPropertyRow>
                  <MetadataPropertyRow icon={<Workflow className="h-4 w-4" />} label="Workflow">
                    <span className="text-muted-foreground">Product Development</span>
                  </MetadataPropertyRow>
                  <MetadataPropertyRow icon={<CircleDot className="h-4 w-4" />} label="State">
                    <StoryStatusPicker
                      workflowStateId={workflowStateId}
                      onSelect={setWorkflowStateId}
                    />
                  </MetadataPropertyRow>
                  <MetadataPropertyRow icon={<Link2 className="h-4 w-4" />} label="Project">
                    <span className="text-muted-foreground">None</span>
                  </MetadataPropertyRow>
                  <MetadataPropertyRow icon={<Flag className="h-4 w-4" />} label="Epic">
                    <StoryEpicPicker epicId={epicId} onSelect={setEpicId} />
                  </MetadataPropertyRow>
                  <MetadataPropertyRow icon={<Calendar className="h-4 w-4" />} label="Iteration">
                    <span className="text-muted-foreground">None</span>
                  </MetadataPropertyRow>
                  <MetadataPropertyRow icon={<Star className="h-4 w-4" />} label="Type">
                    <span>Feature</span>
                  </MetadataPropertyRow>
                  <MetadataPropertyRow icon={<User className="h-4 w-4" />} label="Requester">
                    <span className="text-muted-foreground">You</span>
                  </MetadataPropertyRow>
                  <MetadataPropertyRow icon={<User className="h-4 w-4" />} label="Owner">
                    <span className="text-muted-foreground">Nobody</span>
                  </MetadataPropertyRow>
                  <MetadataPropertyRow icon={<BarChart3 className="h-4 w-4" />} label="Estimate">
                    <span className="text-muted-foreground">Unestimated</span>
                  </MetadataPropertyRow>
                  <MetadataPropertyRow icon={<Calendar className="h-4 w-4" />} label="Due">
                    <span className="text-muted-foreground">No date</span>
                  </MetadataPropertyRow>
                </div>

                <div className="mt-4 border-t border-border/60 pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">Custom Fields</h4>
                    <span className="text-xs text-primary">Edit</span>
                  </div>
                  <MetadataPropertyRow icon={<Star className="h-4 w-4" />} label="Priority">
                    <StoryPriorityPicker priority={priority} onSelect={setPriority} />
                  </MetadataPropertyRow>
                </div>
              </aside>
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-border/60 px-6 py-4">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Discard Draft
              </Button>
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    data-testid="create-story-create-more"
                    checked={createMore}
                    onChange={(event) => setCreateMore(event.target.checked)}
                    className="h-4 w-4 rounded border-border bg-white/5 accent-primary"
                  />
                  {t('create.create_more')}
                </label>
                <Button type="submit" data-testid="create-story-submit">
                  {t('create.submit')}
                </Button>
              </div>
            </footer>
          </form>
        </div>
      </div>
    </dialog>
  );
}
