'use client';

import * as React from 'react';
import { useTranslations } from '@landi-flow/ui';
import { AppShell } from '@/components/app-shell';
import { CustomersView } from '@/components/customers-view';
import { CustomerRequestsPanel } from '@/components/customer-requests-panel';
import { useOpenCreateCustomerModal } from '@/components/create-story-modal';
import { useCustomerStore } from '@/hooks/use-customer-store';
import { useStoryStore } from '@/hooks/use-story-store';
import { useWorkspace } from '@/lib/workspace';
import type { CustomerRequest } from '@landi-flow/core/types';
import { loadCustomerRequests } from '@/controllers/settings-completion-controller';

function CustomersPageBody(): React.ReactElement {
  const { workspace } = useWorkspace();
  const { customers } = useCustomerStore();
  const { stories } = useStoryStore();
  const openCreateCustomer = useOpenCreateCustomerModal();
  const [requests, setRequests] = React.useState<CustomerRequest[]>([]);

  React.useEffect(() => {
    void loadCustomerRequests(workspace.id)
      .then(setRequests)
      .catch((error: unknown) => {
        console.error('Failed to load customer requests', error);
        setRequests([]);
      });
  }, [workspace.id]);

  const handleRequestLinked = React.useCallback((request: CustomerRequest) => {
    setRequests((current) =>
      current.map((row) => (row.id === request.id ? request : row)),
    );
  }, []);

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <CustomersView customers={customers} onCreateCustomer={openCreateCustomer} />
      <CustomerRequestsPanel
        workspaceId={workspace.id}
        requests={requests}
        stories={stories.map((story) => ({
          id: story.id,
          identifier: story.identifier,
          title: story.title,
        }))}
        onRequestLinked={handleRequestLinked}
      />
    </div>
  );
}

export default function WorkspaceCustomersPage(): React.ReactElement {
  const tNav = useTranslations('navigation');
  const tCustomers = useTranslations('customers');

  return (
    <AppShell
      viewTitle={tCustomers('title')}
      breadcrumbs={[tNav('views.workspace'), tCustomers('title')]}
    >
      <CustomersPageBody />
    </AppShell>
  );
}
