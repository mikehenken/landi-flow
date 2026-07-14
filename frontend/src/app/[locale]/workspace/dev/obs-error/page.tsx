'use client';

import * as React from 'react';
import { Button } from '@landi-flow/ui';
import { ObsErrorBoundary } from '@/components/obs-error-boundary';

function ObsErrorTrigger(): React.ReactElement {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  if (shouldThrow) {
    throw new Error('E2E ObsErrorBoundary trigger');
  }

  return (
    <Button
      type="button"
      variant="destructive"
      data-testid="obs-error-trigger"
      onClick={() => setShouldThrow(true)}
    >
      Trigger render error
    </Button>
  );
}

export default function ObsErrorDevPage(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Observability error boundary (OBS-001)</h1>
      <p className="text-sm text-muted-foreground">
        Dev/e2e surface for verifying correlation IDs and client error reporting.
      </p>
      <ObsErrorBoundary fallbackMessage="Unable to render the observability test panel.">
        <ObsErrorTrigger />
      </ObsErrorBoundary>
    </main>
  );
}
