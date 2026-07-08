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
 * Create Story modal (CAP-004) — title, instant markdown description, Create more toggle.
 * Opened from header button, `C` shortcut, or command palette.
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
        className="flex min-h-full items-start justify-center px-4 py-[12vh]"
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
            'w-full max-w-[640px] overflow-hidden rounded-xl border border-border bg-surface-overlay shadow-xl',
          )}
        >
          <form onSubmit={handleSubmit} className="flex flex-col">
            <header className="border-b border-border px-6 py-4">
              <h2
                id="create-story-modal-title"
                className="text-lg font-semibold text-foreground"
              >
                {t('create.title')}
              </h2>
            </header>

            <div className="flex flex-col gap-2 px-6 py-4">
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
              <Input
                ref={titleInputRef}
                data-testid="create-story-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('create.title_placeholder')}
                className="h-10 border-0 bg-transparent px-0 text-lg shadow-none focus-visible:ring-0"
                aria-label={t('create.title_placeholder')}
              />
              <InstantMarkdownEditor
                key={editorKey}
                value={descriptionMd}
                onChange={setDescriptionMd}
                placeholder={t('create.description_placeholder')}
                variant="default"
                aria-label={t('create.description_placeholder')}
                className="min-h-[120px] rounded-md border border-border bg-white/5 px-3 py-2"
              />
              <div
                data-testid="create-story-property-chips"
                className="flex flex-wrap items-center gap-2 pt-1"
                aria-label={t('create.properties_label')}
              >
                <StoryStatusPicker
                  workflowStateId={workflowStateId}
                  onSelect={setWorkflowStateId}
                />
                <StoryPriorityPicker priority={priority} onSelect={setPriority} />
                <StoryEpicPicker epicId={epicId} onSelect={setEpicId} />
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4">
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
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" onClick={handleClose}>
                  {t('create.cancel')}
                </Button>
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
