'use client';

import * as React from 'react';
import {
  Button,
  Input,
  InstantMarkdownEditor,
  MemberChip,
  cn,
  useTranslations,
} from '@landi-flow/ui';
import type { StoryPriority } from '@landi-flow/core/types';
import {
  BarChart3,
  Calendar,
  CircleDot,
  FileText,
  Flag,
  Link2,
  Star,
  Tag,
  User,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { MetadataPropertyRow } from '@/components/story-metadata-sidebar';
import {
  EMPTY_CUSTOM_FIELDS,
  StoryCustomFieldsSection,
} from '@/components/story-custom-fields-section';
import type { StoryCustomFieldValues } from '@/components/story-custom-fields-section';
import { DEMO_TEAM_ID } from '@/lib/seed-data';
import { useWorkspace } from '@/lib/workspace';
import { WORKFLOW_STATES } from '@/lib/workflow-states';
import {
  getDefaultTeamId,
} from '@/lib/api/workspace-context';
import { isMockAuthEnabled } from '@/lib/api/config';
import { createStory as persistCreateStory } from '@/controllers/story-controller';
import { buildCreateStoryInput } from '@/lib/story/build-create-story-input';
import { getTaxonomySettings, getStoryTemplateById } from '@/lib/taxonomy/taxonomy-store';
import { useTeamCycles } from '@/hooks/use-team-cycles';
import { useTeamWorkflowStates } from '@/hooks/use-team-workflow-states';
import { useWorkspaceStoryLabels } from '@/hooks/use-workspace-story-labels';
import { useWorkspaceTeams } from '@/hooks/use-workspace-teams';
import { CURRENT_USER } from '@/lib/agent-roster';
import { useAssignableMembers } from '@/hooks/use-assignable-members';
import {
  CyclePicker,
  DueDatePicker,
  EstimatePicker,
  FollowersPicker,
  OwnerPicker,
  PropertyEmptyValue,
  StoryEpicPicker,
  StoryLabelsPicker,
  StoryStatusPicker,
  StoryTemplatePicker,
  StoryTypePicker,
  TeamPicker,
} from '@/components/story-property-pickers';
import { useCap004Dialog } from '@/components/create-modal-utils';

export type {
  CreateModalsProviderProps,
  OpenCreateStoryOptions,
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
  /** Pre-associate the new story with this epic (e.g. Create from Epic Stories tab). */
  defaultEpicId?: string | null;
}

/**
 * Create Story modal — Linear-style split layout with unified scroll and metadata sidebar.
 */
export function CreateStoryModal({
  open,
  onOpenChange,
  defaultEpicId = null,
}: CreateStoryModalProps): React.ReactElement {
  const { workspace } = useWorkspace();
  const { pickerMembers } = useAssignableMembers();
  const t = useTranslations('stories');
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const [title, setTitle] = React.useState('');
  const [descriptionMd, setDescriptionMd] = React.useState('');
  const [teamId, setTeamId] = React.useState<string>(() =>
    isMockAuthEnabled() ? DEMO_TEAM_ID : getDefaultTeamId() ?? '',
  );
  const [workflowStateId, setWorkflowStateId] = React.useState<string>(WORKFLOW_STATES.todo);
  const [priority, setPriority] = React.useState<StoryPriority>('none');
  const [epicId, setEpicId] = React.useState<string | null>(defaultEpicId);
  const [cycleId, setCycleId] = React.useState<string | null>(null);
  const [storyTypeId, setStoryTypeId] = React.useState<string | null>(null);
  const [ownerId, setOwnerId] = React.useState<string | null>(null);
  const [followerIds, setFollowerIds] = React.useState<string[]>([]);
  const [labelIds, setLabelIds] = React.useState<string[]>([]);
  const [estimate, setEstimate] = React.useState<number | null>(null);
  const [dueDate, setDueDate] = React.useState<string | null>(null);
  const [customFields, setCustomFields] = React.useState<StoryCustomFieldValues>(
    EMPTY_CUSTOM_FIELDS,
  );
  const [createMore, setCreateMore] = React.useState(false);
  const [editorKey, setEditorKey] = React.useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');

  const storyTemplates = React.useMemo(() => getTaxonomySettings().story_templates, []);
  const {
    labels: workspaceLabels,
    refresh: refreshWorkspaceLabels,
  } = useWorkspaceStoryLabels(workspace.id);
  const storyTypes = workspaceLabels;
  const { teams, defaultTeamId } = useWorkspaceTeams(workspace.id);
  const { cycles } = useTeamCycles(workspace.id, teamId);
  const { workflowStates } = useTeamWorkflowStates(workspace.id, teamId);

  React.useEffect(() => {
    if (!teamId && defaultTeamId) {
      setTeamId(defaultTeamId);
    }
  }, [teamId, defaultTeamId]);

  React.useEffect(() => {
    if (workflowStates.length === 0) {
      return;
    }
    const stillValid = workflowStates.some((state) => state.id === workflowStateId);
    if (!stillValid) {
      const fallback =
        workflowStates.find((state) => state.is_default) ??
        workflowStates.find((state) => state.category === 'unstarted') ??
        workflowStates[0];
      if (fallback) {
        setWorkflowStateId(fallback.id);
      }
    }
  }, [workflowStates, workflowStateId]);
  const requester = React.useMemo(
    () => pickerMembers.find((member) => member.id === CURRENT_USER.id) ?? null,
    [pickerMembers],
  );

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
    setTeamId(isMockAuthEnabled() ? DEMO_TEAM_ID : getDefaultTeamId() ?? '');
    setWorkflowStateId(WORKFLOW_STATES.todo);
    setPriority('none');
    setEpicId(defaultEpicId);
    setCycleId(null);
    setStoryTypeId(null);
    setOwnerId(null);
    setFollowerIds([]);
    setLabelIds([]);
    setEstimate(null);
    setDueDate(null);
    setCustomFields(EMPTY_CUSTOM_FIELDS);
    setSelectedTemplateId('');
  }, [defaultEpicId]);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    setEpicId(defaultEpicId);
  }, [open, defaultEpicId]);

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

      const resolvedTeamId = teamId;
      if (!resolvedTeamId) {
        return;
      }

      const resolvedWorkflowStateId = workflowStateId;

      void persistCreateStory(
        buildCreateStoryInput({
          title: trimmedTitle,
          descriptionMd: descriptionMd.trim() || null,
          workspaceId: workspace.id,
          teamId: resolvedTeamId,
          workflowStateId: resolvedWorkflowStateId,
          priority,
          epicId,
          assigneeId: ownerId,
          cycleId,
          estimate,
          dueDate,
          followerIds,
          labelIds,
        }),
      ).then(() => {
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
      teamId,
      workflowStateId,
      priority,
      epicId,
      ownerId,
      cycleId,
      estimate,
      dueDate,
      followerIds,
      labelIds,
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

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
                <div className="min-w-0 px-6 py-5">
                  <div className="space-y-5">
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

                <aside className="min-w-0 border-l border-border/60 bg-surface/30 px-4 py-5">
                  <div
                    data-testid="create-story-property-chips"
                    className="space-y-0.5"
                    aria-label={t('create.properties_label')}
                  >
                    {storyTemplates.length > 0 ? (
                      <MetadataPropertyRow icon={<FileText className="h-4 w-4" />} label="Template">
                        <StoryTemplatePicker
                          templates={storyTemplates}
                          templateId={selectedTemplateId}
                          onSelect={(value) => {
                            setSelectedTemplateId(value);
                            applyTemplate(value);
                          }}
                        />
                      </MetadataPropertyRow>
                    ) : null}

                    <MetadataPropertyRow icon={<Users className="h-4 w-4" />} label="Team">
                      <TeamPicker teams={teams} teamId={teamId} onSelect={setTeamId} />
                    </MetadataPropertyRow>

                    <MetadataPropertyRow icon={<Workflow className="h-4 w-4" />} label="Workflow">
                      <PropertyEmptyValue>Product Development</PropertyEmptyValue>
                    </MetadataPropertyRow>

                    <MetadataPropertyRow icon={<CircleDot className="h-4 w-4" />} label="State">
                      <StoryStatusPicker
                        workflowStateId={workflowStateId}
                        workflowStates={workflowStates}
                        onSelect={setWorkflowStateId}
                      />
                    </MetadataPropertyRow>

                    <MetadataPropertyRow icon={<Link2 className="h-4 w-4" />} label="Project">
                      <PropertyEmptyValue />
                    </MetadataPropertyRow>

                    <MetadataPropertyRow icon={<Flag className="h-4 w-4" />} label="Epic">
                      <StoryEpicPicker epicId={epicId} onSelect={setEpicId} />
                    </MetadataPropertyRow>

                    <MetadataPropertyRow icon={<Calendar className="h-4 w-4" />} label="Iteration">
                      <CyclePicker cycles={cycles} cycleId={cycleId} onSelect={setCycleId} />
                    </MetadataPropertyRow>

                    <MetadataPropertyRow icon={<Star className="h-4 w-4" />} label="Type">
                      <StoryTypePicker
                        types={storyTypes}
                        typeId={storyTypeId}
                        onSelect={setStoryTypeId}
                      />
                    </MetadataPropertyRow>

                    <MetadataPropertyRow icon={<User className="h-4 w-4" />} label="Requester">
                      {requester ? (
                        <MemberChip member={requester} />
                      ) : (
                        <PropertyEmptyValue>You</PropertyEmptyValue>
                      )}
                    </MetadataPropertyRow>

                    <MetadataPropertyRow icon={<User className="h-4 w-4" />} label="Owner">
                      <OwnerPicker
                        members={pickerMembers}
                        ownerId={ownerId}
                        onSelect={setOwnerId}
                      />
                    </MetadataPropertyRow>

                    <MetadataPropertyRow icon={<BarChart3 className="h-4 w-4" />} label="Estimate">
                      <EstimatePicker estimate={estimate} onChange={setEstimate} />
                    </MetadataPropertyRow>

                    <MetadataPropertyRow icon={<Calendar className="h-4 w-4" />} label="Due">
                      <DueDatePicker dueDate={dueDate} onChange={setDueDate} />
                    </MetadataPropertyRow>

                    <MetadataPropertyRow icon={<Users className="h-4 w-4" />} label="Followers">
                      <FollowersPicker
                        members={pickerMembers}
                        followerIds={followerIds}
                        onChange={setFollowerIds}
                      />
                    </MetadataPropertyRow>
                  </div>

                  <StoryCustomFieldsSection
                    priority={priority}
                    onPriorityChange={setPriority}
                    customFields={customFields}
                    onCustomFieldsChange={setCustomFields}
                  />

                  <div className="mt-4 border-t border-border/60 pt-4">
                    <MetadataPropertyRow icon={<Tag className="h-4 w-4" />} label="Labels">
                      <StoryLabelsPicker
                        workspaceId={workspace.id}
                        labels={workspaceLabels}
                        labelIds={labelIds}
                        onChange={setLabelIds}
                        onLabelsCatalogChange={refreshWorkspaceLabels}
                      />
                    </MetadataPropertyRow>
                  </div>
                </aside>
              </div>
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
