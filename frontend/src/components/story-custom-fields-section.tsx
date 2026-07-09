'use client';

import * as React from 'react';
import type { StoryPriority } from '@landi-flow/core/types';
import { Star } from 'lucide-react';
import { MetadataPropertyRow } from '@/components/story-metadata-sidebar';
import {
  CustomFieldPicker,
  StoryPriorityPicker,
} from '@/components/story-property-pickers';

export interface StoryCustomFieldValues {
  technicalArea: string | null;
  skillSet: string | null;
  productArea: string | null;
}

export const EMPTY_CUSTOM_FIELDS: StoryCustomFieldValues = {
  technicalArea: null,
  skillSet: null,
  productArea: null,
};

const TECHNICAL_AREA_OPTIONS = ['Frontend', 'Backend', 'Infrastructure', 'Design'];
const SKILL_SET_OPTIONS = ['Engineering', 'Design', 'Product', 'Research'];
const PRODUCT_AREA_OPTIONS = ['Platform', 'Growth', 'Enterprise', 'Internal'];

export interface StoryCustomFieldsSectionProps {
  priority: StoryPriority;
  onPriorityChange: (priority: StoryPriority) => void;
  customFields: StoryCustomFieldValues;
  onCustomFieldsChange: (fields: StoryCustomFieldValues) => void;
}

/** Custom fields block with Edit toggle — Linear-style sidebar section. */
export function StoryCustomFieldsSection({
  priority,
  onPriorityChange,
  customFields,
  onCustomFieldsChange,
}: StoryCustomFieldsSectionProps): React.ReactElement {
  const [editMode, setEditMode] = React.useState(false);

  const patchField = React.useCallback(
    (key: keyof StoryCustomFieldValues, value: string | null): void => {
      onCustomFieldsChange({ ...customFields, [key]: value });
    },
    [customFields, onCustomFieldsChange],
  );

  return (
    <div className="mt-4 border-t border-border/60 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Custom Fields</h4>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setEditMode((value) => !value)}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>
      <div className="space-y-0.5">
        <MetadataPropertyRow icon={<Star className="h-4 w-4" />} label="Priority">
          <StoryPriorityPicker priority={priority} onSelect={onPriorityChange} />
        </MetadataPropertyRow>
        <MetadataPropertyRow icon={<Star className="h-4 w-4" />} label="Technical Area">
          {editMode ? (
            <CustomFieldPicker
              label="Technical Area"
              value={customFields.technicalArea}
              options={TECHNICAL_AREA_OPTIONS}
              testId="custom-field-technical-area"
              onSelect={(value) => patchField('technicalArea', value)}
            />
          ) : (
            <span className={customFields.technicalArea ? undefined : 'italic text-muted-foreground'}>
              {customFields.technicalArea ?? 'None'}
            </span>
          )}
        </MetadataPropertyRow>
        <MetadataPropertyRow icon={<Star className="h-4 w-4" />} label="Skill Set">
          {editMode ? (
            <CustomFieldPicker
              label="Skill Set"
              value={customFields.skillSet}
              options={SKILL_SET_OPTIONS}
              testId="custom-field-skill-set"
              onSelect={(value) => patchField('skillSet', value)}
            />
          ) : (
            <span className={customFields.skillSet ? undefined : 'italic text-muted-foreground'}>
              {customFields.skillSet ?? 'None'}
            </span>
          )}
        </MetadataPropertyRow>
        <MetadataPropertyRow icon={<Star className="h-4 w-4" />} label="Product Area">
          {editMode ? (
            <CustomFieldPicker
              label="Product Area"
              value={customFields.productArea}
              options={PRODUCT_AREA_OPTIONS}
              testId="custom-field-product-area"
              onSelect={(value) => patchField('productArea', value)}
            />
          ) : (
            <span className={customFields.productArea ? undefined : 'italic text-muted-foreground'}>
              {customFields.productArea ?? 'None'}
            </span>
          )}
        </MetadataPropertyRow>
      </div>
    </div>
  );
}
