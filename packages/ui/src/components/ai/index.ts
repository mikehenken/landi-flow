/**
 * AI / agent conversation primitives — the clone's owned-source equivalent of the
 * shadcn.io/ai component set (which repackages Vercel AI Elements). Standardizing
 * on owned source keeps the AI surface white-labelable (CSS-variable themed) and
 * free of a Pro-gated runtime dependency. See study task-04m research.
 */
export {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  type ConversationProps,
  type ConversationContentProps,
  type ConversationEmptyStateProps,
} from './conversation';
export { Message, MessageContent, type MessageProps, type MessageContentProps } from './message';
export { Response, type ResponseProps } from './response';
export { Reasoning, type ReasoningProps } from './reasoning';
export { Tool, type ToolProps } from './tool';
export { Confirmation, type ConfirmationProps } from './confirmation';
export { Sources, InlineCitation, type SourcesProps, type InlineCitationProps } from './sources';
export {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
  type PromptInputProps,
  type PromptInputTextareaProps,
  type PromptInputToolbarProps,
  type PromptInputSubmitProps,
} from './prompt-input';
export { Suggestions, Suggestion, type SuggestionsProps, type SuggestionProps } from './suggestion';
export { Loader, type LoaderProps } from './loader';
export {
  ModelSelector,
  type ModelSelectorProps,
  type ModelOption,
} from './model-selector';
export { Actions, Action, type ActionsProps, type ActionProps } from './actions';
export { Plan, Task, type PlanProps, type TaskItem, type TaskStatus } from './task';

export type {
  AgentChatStatus,
  ToolState,
  ApprovalState,
  MessageRole,
  MessageAuthor,
  TextPart,
  ReasoningPart,
  SourcePart,
  ToolPart,
  ToolFieldDiff,
  MessagePart,
  UIMessage,
} from './types';
