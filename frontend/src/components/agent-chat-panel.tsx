'use client';

import * as React from 'react';
import {
  Actions,
  Action,
  Confirmation,
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  Loader,
  Message,
  MessageContent,
  ModelSelector,
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  Reasoning,
  Response,
  Sources,
  Suggestion,
  Suggestions,
  Tool,
  type ModelOption,
  type SourcePart,
  type UIMessage,
} from '@landi-flow/ui';
import { Copy, RefreshCw, Sparkles } from 'lucide-react';
import { useAgentChat } from '@/hooks/use-agent-chat';
import {
  agentAsAuthor,
  agentConsoleDescription,
  type WorkspaceAgent,
} from '@/lib/agent-roster';

const MODEL_OPTIONS: ModelOption[] = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fast · default' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Deep reasoning' },
];

const SUGGESTIONS = [
  'Draft a Story for "Add dark mode toggle"',
  'Summarize the Epic board',
  'Raise the priority of LAN-2',
];

export interface AgentChatPanelProps {
  agent: WorkspaceAgent;
  workspaceId: string;
}

/**
 * The AI/agent conversation surface — agent chat, MCP tool use, streaming,
 * reasoning, and citations composed from the shared design system's AI Elements.
 * Inference routes through the Cloudflare AI Gateway (server-side); write tools
 * are gated behind the Agent Handoff Queue.
 */
export function AgentChatPanel({
  agent,
  workspaceId,
}: AgentChatPanelProps): React.ReactElement {
  const [input, setInput] = React.useState('');
  const [model, setModel] = React.useState(agent.model);
  const author = React.useMemo(() => agentAsAuthor(agent), [agent]);

  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    approveTool,
    rejectTool,
  } = useAgentChat({ agentAuthor: author, model, workspaceId });

  const submit = (): void => {
    const text = input.trim();
    if (text.length === 0) return;
    sendMessage(text);
    setInput('');
  };

  const autoScrollKey = messages.reduce((total, m) => total + m.parts.length, messages.length);
  const isBusy = status === 'submitted' || status === 'streaming';

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Sparkles className="h-4 w-4 text-primary" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>
          <p className="truncate text-xs text-muted-foreground">{agentConsoleDescription(agent)}</p>
        </div>
        <div className="ml-auto">
          <ModelSelector models={MODEL_OPTIONS} value={model} onChange={setModel} />
        </div>
      </header>

      <Conversation className="min-h-0 flex-1">
        {messages.length === 0 ? (
          <ConversationEmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title={`Chat with ${agent.name}`}
            description={
              agent.runtime === 'native'
                ? 'Draft Stories, triage the Inbox, or plan an Epic. Inference runs in Landi Flow; every write is proposed for Handoff Queue approval — nothing auto-applies.'
                : agent.connection_state !== 'connected'
                  ? 'This external agent is not connected via MCP. Connect in Settings to enable IDE sessions. In-app chat uses native inference only — we do not control your IDE remotely.'
                  : 'Ask questions and draft plans here. External agents execute in your IDE via MCP; browser chat does not remote-control Cursor or Claude Code.'
            }
          >
            <Suggestions>
              {SUGGESTIONS.map((suggestion) => (
                <Suggestion
                  key={suggestion}
                  suggestion={suggestion}
                  onSelect={(value) => {
                    setInput('');
                    sendMessage(value);
                  }}
                />
              ))}
            </Suggestions>
          </ConversationEmptyState>
        ) : (
          <ConversationContent autoScrollKey={autoScrollKey}>
            {messages.map((message) => (
              <MessageView
                key={message.id}
                message={message}
                onApprove={(toolCallId) => approveTool(message.id, toolCallId)}
                onReject={(toolCallId) => rejectTool(message.id, toolCallId)}
              />
            ))}
            {isBusy ? (
              <div className="pl-11">
                <Loader label={`${agent.name} is working…`} />
              </div>
            ) : null}
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>

      {error ? (
        <p className="border-t border-status-error/30 bg-status-error/5 px-4 py-2 text-xs text-status-error">
          {error}
        </p>
      ) : null}

      <div className="border-t border-border p-3">
        <PromptInput onSubmit={submit}>
          <PromptInputTextarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onEnterSubmit={submit}
            placeholder={`Message ${agent.name}…`}
            aria-label="Message an agent"
          />
          <PromptInputToolbar>
            <span className="text-xs text-foreground-subtle">
              {agent.runtime === 'native'
                ? 'Handoff Queue approval required for writes'
                : 'No remote IDE control from this chat'}
            </span>
            <PromptInputSubmit
              status={status}
              disabled={input.trim().length === 0}
              onStop={stop}
            />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
}

interface MessageViewProps {
  message: UIMessage;
  onApprove: (toolCallId: string) => void;
  onReject: (toolCallId: string) => void;
}

function MessageView({
  message,
  onApprove,
  onReject,
}: MessageViewProps): React.ReactElement {
  const sources = message.parts.filter(
    (part): part is SourcePart => part.type === 'source',
  );
  const textPart = message.parts.find((part) => part.type === 'text');

  return (
    <Message role={message.role} author={message.author}>
      {message.parts.map((part, index) => {
        if (part.type === 'reasoning') {
          return (
            <Reasoning
              key={`r-${index}`}
              text={part.text}
              isStreaming={part.isStreaming}
              durationMs={part.durationMs}
            />
          );
        }
        if (part.type === 'tool') {
          const showConfirmation =
            part.isWrite === true && part.requiresApproval === true;
          return (
            <Tool
              key={part.toolCallId}
              toolName={part.toolName}
              title={part.title}
              state={part.state}
              input={part.input}
              output={part.output}
              errorText={part.errorText}
              isWrite={part.isWrite}
              defaultOpen={showConfirmation}
            >
              {showConfirmation ? (
                <Confirmation
                  summary={part.summary ?? `Apply ${part.toolName}?`}
                  diff={part.diff}
                  state={part.approvalState ?? 'pending'}
                  onApprove={() => onApprove(part.toolCallId)}
                  onReject={() => onReject(part.toolCallId)}
                />
              ) : null}
            </Tool>
          );
        }
        return null;
      })}

      {textPart && textPart.type === 'text' && textPart.text.length > 0 ? (
        <MessageContent role={message.role}>
          {message.role === 'user' ? (
            <span className="whitespace-pre-wrap">{textPart.text}</span>
          ) : (
            <Response>{textPart.text}</Response>
          )}
        </MessageContent>
      ) : null}

      {sources.length > 0 ? <Sources sources={sources} /> : null}

      {message.role === 'assistant' && textPart && textPart.type === 'text' && textPart.text.length > 0 ? (
        <Actions className="pl-1">
          <Action
            label="Copy response"
            icon={<Copy className="h-3.5 w-3.5" />}
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                void navigator.clipboard.writeText(textPart.text);
              }
            }}
          />
          <Action label="Regenerate" icon={<RefreshCw className="h-3.5 w-3.5" />} />
        </Actions>
      ) : null}
    </Message>
  );
}
