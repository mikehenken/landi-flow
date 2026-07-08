'use client';

import * as React from 'react';
import { Button, Input, cn, useTranslations } from '@landi-flow/ui';
import { useWorkspace } from '@/lib/workspace';
import { createCustomer } from '@/controllers/customer-controller';
import { useCap004Dialog } from '@/components/create-modal-utils';

export interface CreateCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Create Customer modal (CAP-004) — organization name and domain with persistence.
 */
export function CreateCustomerModal({
  open,
  onOpenChange,
}: CreateCustomerModalProps): React.ReactElement {
  const { workspace } = useWorkspace();
  const t = useTranslations('customers');
  const panelRef = React.useRef<HTMLDivElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const [name, setName] = React.useState('');
  const [domain, setDomain] = React.useState('');
  const [createMore, setCreateMore] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const resetFormFields = React.useCallback((): void => {
    setName('');
    setDomain('');
    setError(null);
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, []);

  const handleClose = React.useCallback((): void => {
    onOpenChange(false);
    setCreateMore(false);
    setName('');
    setDomain('');
    setError(null);
    setSubmitting(false);
  }, [onOpenChange]);

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
      const trimmedDomain = domain.trim();
      if (!trimmedName) {
        nameInputRef.current?.focus();
        return;
      }
      if (!trimmedDomain) {
        return;
      }

      setSubmitting(true);
      setError(null);

      void createCustomer({
        workspaceId: workspace.id,
        name: trimmedName,
        domain: trimmedDomain,
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
            submitError instanceof Error ? submitError.message : 'Failed to create customer';
          setError(message);
        })
        .finally(() => {
          setSubmitting(false);
        });
    },
    [name, domain, createMore, workspace.id, resetFormFields, handleClose],
  );

  return (
    <dialog
      ref={dialogRef}
      data-testid="create-customer-modal"
      aria-labelledby="create-customer-modal-title"
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
                id="create-customer-modal-title"
                className="text-lg font-semibold text-foreground"
              >
                {t('create.title')}
              </h2>
            </header>

            <div className="flex flex-col gap-3 px-6 py-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="create-customer-name" className="text-sm text-muted-foreground">
                  {t('create.name_label')}
                </label>
                <Input
                  ref={nameInputRef}
                  id="create-customer-name"
                  data-testid="create-customer-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('create.name_placeholder')}
                  disabled={submitting}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="create-customer-domain" className="text-sm text-muted-foreground">
                  {t('create.domain_label')}
                </label>
                <Input
                  id="create-customer-domain"
                  data-testid="create-customer-domain"
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder={t('create.domain_placeholder')}
                  disabled={submitting}
                />
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
                  data-testid="create-customer-create-more"
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
                <Button type="submit" data-testid="create-customer-submit" disabled={submitting}>
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
