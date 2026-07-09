'use client';

import * as React from 'react';
import type { WorkspaceMemberRole } from '@landi-flow/core/types';
import { Badge, Button, Input, cn, useTranslations } from '@landi-flow/ui';
import { Check } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { inviteMember } from '@/controllers/member-controller';
import { useCap004Dialog } from '@/components/create-modal-utils';

const INVITE_ROLES: WorkspaceMemberRole[] = ['member', 'admin', 'team_owner', 'guest'];

export interface CreateMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useDismissOnOutside(
  open: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  React.useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, containerRef, onClose]);
}

/**
 * Invite Member modal (CAP-004) — email invite with optional name and role picker.
 */
export function CreateMemberModal({
  open,
  onOpenChange,
}: CreateMemberModalProps): React.ReactElement {
  const { workspace } = useWorkspace();
  const t = useTranslations('members');
  const panelRef = React.useRef<HTMLDivElement>(null);
  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const [email, setEmail] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [role, setRole] = React.useState<WorkspaceMemberRole>('member');
  const [rolePickerOpen, setRolePickerOpen] = React.useState(false);
  const rolePickerRef = React.useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClose = React.useCallback((): void => {
    onOpenChange(false);
    setEmail('');
    setDisplayName('');
    setRole('member');
    setRolePickerOpen(false);
    setError(null);
    setSubmitting(false);
  }, [onOpenChange]);

  const dialogRef = useCap004Dialog({
    open,
    onOpenChange: handleClose,
    panelRef,
    initialFocusRef: emailInputRef,
  });

  useDismissOnOutside(rolePickerOpen, rolePickerRef, () => setRolePickerOpen(false));

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        emailInputRef.current?.focus();
        return;
      }

      setSubmitting(true);
      setError(null);

      void inviteMember({
        workspaceId: workspace.id,
        email: trimmedEmail,
        displayName: displayName.trim() || undefined,
        role,
        status: 'pending',
      })
        .then(() => {
          handleClose();
        })
        .catch((submitError: unknown) => {
          const message =
            submitError instanceof Error ? submitError.message : 'Failed to invite member';
          setError(message);
        })
        .finally(() => {
          setSubmitting(false);
        });
    },
    [email, displayName, role, workspace.id, handleClose],
  );

  return (
    <dialog
      ref={dialogRef}
      data-testid="create-member-modal"
      aria-labelledby="create-member-modal-title"
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
                id="create-member-modal-title"
                className="text-lg font-semibold text-foreground"
              >
                {t('create.title')}
              </h2>
            </header>

            <div className="flex flex-col gap-3 px-6 py-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="create-member-email" className="text-sm text-muted-foreground">
                  {t('create.email_label')}
                </label>
                <Input
                  ref={emailInputRef}
                  id="create-member-email"
                  type="email"
                  autoComplete="email"
                  data-testid="create-member-email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t('create.email_placeholder')}
                  disabled={submitting}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="create-member-display-name" className="text-sm text-muted-foreground">
                  {t('create.display_name_label')}
                </label>
                <Input
                  id="create-member-display-name"
                  data-testid="create-member-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder={t('create.display_name_placeholder')}
                  disabled={submitting}
                />
              </div>
              <div
                data-testid="create-member-property-chips"
                className="flex flex-wrap items-center gap-2"
                aria-label={t('create.properties_label')}
              >
                <div ref={rolePickerRef} className="relative inline-flex">
                  <button
                    type="button"
                    data-testid="create-member-role-picker"
                    onClick={() => setRolePickerOpen((value) => !value)}
                    aria-haspopup="listbox"
                    aria-expanded={rolePickerOpen ? 'true' : 'false'}
                    className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Badge variant="outline" className="cursor-pointer capitalize">
                      {t(`create.roles.${role}`)}
                    </Badge>
                  </button>
                  {rolePickerOpen ? (
                    <div
                      role="listbox"
                      className="absolute left-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-border bg-surface-overlay p-1 shadow-xl"
                    >
                      {INVITE_ROLES.map((option) => (
                        <button
                          key={option}
                          type="button"
                          role="option"
                          aria-selected={option === role ? 'true' : 'false'}
                          onClick={() => {
                            setRole(option);
                            setRolePickerOpen(false);
                          }}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm capitalize',
                            'hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none',
                            option === role ? 'bg-primary/10' : undefined,
                          )}
                        >
                          <span className="flex-1">{t(`create.roles.${option}`)}</span>
                          {option === role ? (
                            <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
                {t('create.cancel')}
              </Button>
              <Button type="submit" data-testid="create-member-submit" disabled={submitting}>
                {t('create.submit')}
              </Button>
            </footer>
          </form>
        </div>
      </div>
    </dialog>
  );
}
