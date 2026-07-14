/** ART-001 — agent/engineering artifact kinds attached to Story or Epic. */

export type ArtifactKind =
  | 'agent_chat_log'
  | 'terminal_log'
  | 'file_created'
  | 'file_updated'
  | 'action_log'
  | 'raw_log'
  | 'plan'
  | 'subagent_output'
  | 'orchestration_log'
  | 'engineering_signal'
  | 'user_upload';

export type ArtifactSource =
  | 'human'
  | 'agent'
  | 'native_in_app'
  | 'external_mcp'
  | 'action_bus'
  | 'ci'
  | 'qa'
  | 'deploy'
  | 'worker'
  | 'orchestrator'
  | 'mcp'
  | 'observability';

export interface StoryArtifact {
  id: string;
  workspace_id: string;
  story_id: string | null;
  epic_id: string | null;
  artifact_kind: ArtifactKind;
  source: ArtifactSource;
  title: string;
  summary: string | null;
  mime_type: string | null;
  byte_size: number | null;
  agent_id: string | null;
  session_id: string | null;
  correlation_id: string | null;
  parent_artifact_id: string | null;
  storage_provider: 'r2' | 'inline_text';
  storage_key: string | null;
  inline_body: string | null;
  content_hash: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
