'use client';

import * as React from 'react';

export interface CreateModalsContextValue {
  openCreateStory: () => void;
  openCreateEpic: () => void;
  openCreateCustomer: () => void;
  openCreateMember: () => void;
}

const CreateModalsContext = React.createContext<CreateModalsContextValue | null>(null);

function useCreateModalsContext(): CreateModalsContextValue {
  const value = React.useContext(CreateModalsContext);
  if (!value) {
    throw new Error('Create modals hooks must be used within AppShell');
  }
  return value;
}

export interface CreateModalsProviderProps {
  value: CreateModalsContextValue;
  children: React.ReactNode;
}

/** Supplies create-modal openers to descendants without prop drilling. */
export function CreateModalsProvider({
  value,
  children,
}: CreateModalsProviderProps): React.ReactElement {
  return (
    <CreateModalsContext.Provider value={value}>{children}</CreateModalsContext.Provider>
  );
}

/** Opens the Create Story modal from nested views (e.g. empty-state CTA). */
export function useOpenCreateStoryModal(): () => void {
  return useCreateModalsContext().openCreateStory;
}

/** Opens the Create Epic modal from nested views (e.g. epic board empty state). */
export function useOpenCreateEpicModal(): () => void {
  return useCreateModalsContext().openCreateEpic;
}

/** Opens the Create Customer modal from nested views (e.g. customers index). */
export function useOpenCreateCustomerModal(): () => void {
  return useCreateModalsContext().openCreateCustomer;
}

/** Opens the Invite Member modal from workspace settings. */
export function useOpenCreateMemberModal(): () => void {
  return useCreateModalsContext().openCreateMember;
}

/** @deprecated Use CreateModalsProvider — kept for backward compatibility. */
export const CreateStoryModalProvider = CreateModalsProvider;
