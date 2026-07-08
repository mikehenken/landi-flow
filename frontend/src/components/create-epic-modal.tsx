'use client';

import * as React from 'react';
import {
  Button,
  Input,
  InstantMarkdownEditor,
  cn,
  useTranslations,
} from '@landi-flow/ui';
import type { EpicPriority } from '@landi-flow/core/types';
import { useWorkspace } from '@/lib/workspace';
import { EPIC_STATUS_IDS } from '@/lib/epic-status';
import { createEpic } from '@/controllers/epic-controller';
import { EpicPriorityPicker, EpicStatusPicker } from '@/components/epic-property-pickers';
import { useCap004Dialog } from '@/components/create-modal-utils';

export interface CreateEpicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Create Epic modal (CAP-004) — name, markdown description, status/priority chips.
 */
export function CreateEpicModal({
  open,
  onOpenChange,
}: CreateEpicModalProps): React.ReactElement {
  const { workspace } = useWorkspace();
  const t = useTranslations('epics');
  const panelRef = React.useRef<HTMLDivElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const [name, setName] = React.useState('');
  const [descriptionMd, setDescriptionMd] = React.useState('');
  const [statusId, setStatusId] = React.useState<string>(EPIC_STATUS_IDS.backlog);
  const [priority, setPriority] = React.useState<EpicPriority>('none');
  const [createMore, setCreateMore] = React.useState(false);
  const [editorKey, setEditorKey] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const resetPropertyFields = React.useCallback((): void => {
    setStatusId(EPIC_STATUS_IDS.backlog);
    setPriority('none');
  }, []);

  const resetFormFields = React.useCallback((): void => {
    setName('');
    setDescriptionMd('');
    resetPropertyFields();
    setEditorKey((key) => key + 1);
    setError(null);
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, [resetPropertyFields]);

  const handleClose = React.useCallback((): void => {
    onOpenChange(false);
    setCreateMore(false);
    setName('');
    setDescriptionMd('');
    resetPropertyFields();
    setEditorKey((key) => key + 1);
    setError(null);
    setSubmitting(false);
  }, [onOpenChange, resetPropertyFields]);

  const dialogRef = useCap004Dialog({
    open,
    onOpenChange: handleClose,
    panelRef,
    initialFocusRef: nameInputRef,
  });

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) {
        nameInputRef.current?.focus();
        return;
      }

      setSubmitting(true);
      setError(null);

      void createEpic({
        workspaceId: workspace.id,
        name: trimmedName,
        descriptionMd: descriptionMd.trim() || null,
        statusId,
        priority,
      })
        .then(() => {
          if (createMore) {
            resetFormFields();
            return;
          }
          handleClose();
        })
        .catch((submitError: unknown) => {
          const message =
            submitError instanceof Error ? submitError.message : 'Failed to create epic';
          setError(message);
        })
        .finally(() => {
          setSubmitting(false);
        });
    },
    [
      name,
      descriptionMd,
      statusId,
      priority,
      createMore,
      workspace.id,
      resetFormFields,
      handleClose,
    ],
  );

  return (
    <dialog
      ref={dialogRef}
      data-testid="create-epic-modal"
      aria-labelledby="create-epic-modal-title"
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
                id="create-epic-modal-title"
                className="text-lg font-semibold text-foreground"
              >
                {t('create.title')}
              </h2>
            </header>

            <div className="flex flex-col gap-2 px-6 py-4">
              <Input
                ref={nameInputRef}
                data-testid="create-epic-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('create.title_placeholder')}
                className="h-10 border-0 bg-transparent px-0 text-lg shadow-none focus-visible:ring-0"
                aria-label={t('create.title_placeholder')}
                disabled={submitting}
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
                data-testid="create-epic-property-chips"
                className="flex flex-wrap items-center gap-2 pt-1"
                aria-label={t('create.properties_label')}
              >
                <EpicStatusPicker statusId={statusId} onSelect={setStatusId} />
                <EpicPriorityPicker priority={priority} onSelect={setPriority} />
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  data-testid="create-epic-create-more"
                  checked={createMore}
                  onChange={(event) => setCreateMore(event.target.checked)}
                  className="h-4 w-4 rounded border-border bg-white/5 accent-primary"
                  disabled={submitting}
                />
                {t('create.create_more')}
              </label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
                  {t('create.cancel')}
                </Button>
                <Button type="submit" data-testid="create-epic-submit" disabled={submitting}>
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
