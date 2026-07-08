import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from './conversation';
import { Message, MessageContent } from './message';
import { Response } from './response';
import { Reasoning } from './reasoning';
import { Tool } from './tool';
import { Confirmation } from './confirmation';
import { Sources } from './sources';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
} from './prompt-input';
import { Suggestions, Suggestion } from './suggestion';
import { Loader } from './loader';
import { ModelSelector } from './model-selector';
import { Plan } from './task';
import type { ApprovalState, SourcePart } from './types';

const meta: Meta = {
  title: 'AI/Agent Elements',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

const SOURCES: SourcePart[] = [
  {
    type: 'source',
    id: 's1',
    url: 'https://linear.app/method',
    title: 'The Linear Method',
    snippet: 'Principles for building product with momentum.',
  },
  {
    type: 'source',
    id: 's2',
    url: 'https://modelcontextprotocol.io',
    title: 'Model Context Protocol',
    snippet: 'An open protocol for connecting AI agents to tools and data.',
  },
];

export const FullConversation: Story = {
  render: () => (
    <div className="mx-auto h-[560px] w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-background">
      <Conversation>
        <ConversationContent autoScrollKey="static">
          <Message role="user" author={{ id: 'u', name: 'Jane', actorType: 'human', initials: 'JD' }}>
            <MessageContent role="user">
              Draft a Story to add keyboard shortcuts to the Epic board.
            </MessageContent>
          </Message>

          <Message
            role="assistant"
            author={{ id: 'a', name: 'Cursor Agent', actorType: 'agent', initials: 'CU' }}
          >
            <Reasoning
              text={'Scope this against the **Epic** board view. Keep it a single Story with clear acceptance criteria.'}
              durationMs={4000}
            />
            <MessageContent role="assistant">
              <Response>
                {'## Add keyboard shortcuts to the Epic board\n\nEnable power-user navigation on the Epic board.\n\n**Acceptance Criteria**\n- `J`/`K` move focus between Epic cards\n- `Enter` opens the focused Epic\n- Shortcuts are discoverable via the `?` overlay'}
              </Response>
            </MessageContent>
            <Sources sources={SOURCES} />
          </Message>
        </ConversationContent>
      </Conversation>
    </div>
  ),
};

export const EmptyStateWithComposer: Story = {
  render: function Render() {
    const [value, setValue] = useState('');
    const models = [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fast · default' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Deep reasoning' },
    ];
    const [model, setModel] = useState(models[0]!.id);
    return (
      <div className="mx-auto flex h-[420px] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background">
        <Conversation>
          <ConversationEmptyState
            title="Ask an agent"
            description="Draft Stories, triage the Inbox, or plan an Epic. Every write is proposed for your approval."
          >
            <Suggestions>
              <Suggestion suggestion="Draft a Story for dark mode" onSelect={setValue} />
              <Suggestion suggestion="Summarize the Epic board" onSelect={setValue} />
            </Suggestions>
          </ConversationEmptyState>
        </Conversation>
        <div className="p-3">
          <PromptInput onSubmit={() => setValue('')}>
            <PromptInputTextarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Message an agent…"
            />
            <PromptInputToolbar>
              <ModelSelector models={models} value={model} onChange={setModel} />
              <PromptInputSubmit status="ready" disabled={value.trim().length === 0} />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    );
  },
};

export const ToolStates: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-lg space-y-3">
      <Tool toolName="flow.search" state="input-streaming" input={{ query: 'dark mo' }} />
      <Tool toolName="epic.get" state="output-available" input={{ epic_id: 'epic-002' }} output={{ name: 'Agent Collaboration Plane' }} defaultOpen />
      <Tool toolName="story.update" state="output-error" isWrite errorText="Missing required scope: stories:write" defaultOpen />
    </div>
  ),
};

export const AgentHandoffQueue: Story = {
  render: function Render() {
    const [state, setState] = useState<ApprovalState>('pending');
    return (
      <div className="mx-auto w-full max-w-lg">
        <Tool toolName="story.create" state="input-available" isWrite defaultOpen input={{ team_id: 'team-design', title: 'Add dark mode toggle' }}>
          <Confirmation
            summary="Create Story “Add dark mode toggle” on Team Design and attach to the Epic “Progressive Disclosure Shell”."
            diff={[
              { field: 'title', before: null, after: 'Add dark mode toggle' },
              { field: 'epic', before: null, after: 'Progressive Disclosure Shell' },
              { field: 'state', before: null, after: 'Todo' },
            ]}
            state={state}
            onApprove={() => setState('approved')}
            onReject={() => setState('rejected')}
          />
        </Tool>
      </div>
    );
  },
};

export const PlanAndLoader: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-lg space-y-3">
      <Plan
        tasks={[
          { id: '1', label: 'Read the Epic board', status: 'done' },
          { id: '2', label: 'Draft 3 candidate Stories', status: 'active' },
          { id: '3', label: 'Propose assignments', status: 'pending' },
        ]}
      />
      <Loader label="Cursor Agent is working…" />
    </div>
  ),
};
