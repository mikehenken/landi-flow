import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor } from '@storybook/test';
import * as React from 'react';
import { InstantMarkdownEditor } from './instant-markdown-editor';
import './editor-styles.css';

const SAMPLE_MARKDOWN = `# Epic scope

Build an **instant markdown editor** that:

- Converts \`**bold**\` and _italic_ on type
- Supports \`- [ ]\` task lists
- Pastes markdown blocks instantly

> Easier than Linear — keyboard-first, zero mode switching.`;

const meta: Meta<typeof InstantMarkdownEditor> = {
  title: 'Editor/InstantMarkdownEditor',
  component: InstantMarkdownEditor,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="dark max-w-xl rounded-lg border border-border bg-background p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof InstantMarkdownEditor>;

export const WithSeedContent: Story = {
  render: () => {
    const [value, setValue] = React.useState(SAMPLE_MARKDOWN);
    return (
      <InstantMarkdownEditor
        value={value}
        onChange={setValue}
        placeholder="Describe the Epic…"
      />
    );
  },
};

export const EmptyEditable: Story = {
  args: {
    value: '',
    placeholder: 'Type **markdown** or paste a block…',
  },
};

export const ReadOnly: Story = {
  args: {
    value: SAMPLE_MARKDOWN,
    readOnly: true,
  },
};

export const CompactInspector: Story = {
  args: {
    value: 'Update acceptance criteria in place.',
    variant: 'compact',
  },
};

async function getProseMirrorRoot(canvasElement: HTMLElement): Promise<HTMLElement> {
  return waitFor(() => {
    const editor = canvasElement.querySelector('.ProseMirror');
    if (!editor || !(editor instanceof HTMLElement)) {
      throw new Error('ProseMirror editor not mounted');
    }
    return editor;
  });
}

/** Behavioral proof: typing `**bold**` renders as rich text via StarterKit input rules. */
export const TypeMarkdownConversion: Story = {
  render: () => (
    <InstantMarkdownEditor value="" placeholder="Type **markdown**…" />
  ),
  play: async ({ canvasElement }) => {
    const editor = await getProseMirrorRoot(canvasElement);
    await userEvent.click(editor);
    await userEvent.type(editor, '**bold**');
    await waitFor(() => {
      const strong = editor.querySelector('strong');
      expect(strong).toBeTruthy();
      expect(strong?.textContent).toBe('bold');
    });
  },
};

/** Behavioral proof: pasting plain markdown renders as rich text via handlePaste → insertContent. */
export const PasteMarkdownConversion: Story = {
  render: () => (
    <InstantMarkdownEditor value="" placeholder="Paste markdown…" />
  ),
  play: async ({ canvasElement }) => {
    const editor = await getProseMirrorRoot(canvasElement);
    await userEvent.click(editor);
    await userEvent.paste('# Heading\n\n- item');
    await waitFor(() => {
      const heading = editor.querySelector('h1');
      const listItem = editor.querySelector('ul li');
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Heading');
      expect(listItem).toBeTruthy();
      expect(listItem?.textContent).toBe('item');
    });
  },
};
