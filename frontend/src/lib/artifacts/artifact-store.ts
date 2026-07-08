import type { StoryArtifact } from '@landi-flow/core/types';
import { DEMO_WORKSPACE_ID } from '@/lib/seed-data';

export const ARTIFACTS_STORAGE_KEY = 'landi-flow:story-artifacts';

export const SEED_ARTIFACTS: StoryArtifact[] = [
  {
    id: 'artifact-plan-001',
    workspace_id: DEMO_WORKSPACE_ID,
    story_id: 'story-001',
    epic_id: null,
    artifact_kind: 'plan',
    source: 'orchestrator',
    title: 'Shell layout plan',
    summary: 'Three-panel SidebarLayout with progressive disclosure defaults.',
    mime_type: 'text/markdown',
    byte_size: 2048,
    agent_id: 'agent-landi-flow-builtin',
    session_id: 'sess-09al-001',
    correlation_id: 'corr-artifact-demo-001',
    parent_artifact_id: null,
    storage_provider: 'inline_text',
    storage_key: null,
    inline_body:
      '# Shell layout plan\n\n1. Default List + Status grouping\n2. View options drawer\n3. Advanced panel collapsed',
    content_hash: null,
    metadata: {},
    created_by: null,
    created_at: '2026-07-06T10:00:00.000Z',
    updated_at: '2026-07-06T10:00:00.000Z',
  },
  {
    id: 'artifact-signal-001',
    workspace_id: DEMO_WORKSPACE_ID,
    story_id: 'story-001',
    epic_id: null,
    artifact_kind: 'engineering_signal',
    source: 'ci',
    title: 'E2E proof — shell sidebar',
    summary: 'Playwright 4/4 passed on chromium-mock.',
    mime_type: 'application/json',
    byte_size: 512,
    agent_id: null,
    session_id: null,
    correlation_id: 'corr-artifact-demo-001',
    parent_artifact_id: 'artifact-plan-001',
    storage_provider: 'inline_text',
    storage_key: null,
    inline_body: JSON.stringify({ status: 'passed', suite: 'shell-sidebar-preference-skeletons' }),
    content_hash: null,
    metadata: { signal_type: 'qa' },
    created_by: null,
    created_at: '2026-07-06T11:00:00.000Z',
    updated_at: '2026-07-06T11:00:00.000Z',
  },
  {
    id: 'artifact-epic-001',
    workspace_id: DEMO_WORKSPACE_ID,
    story_id: null,
    epic_id: 'epic-001',
    artifact_kind: 'orchestration_log',
    source: 'mcp',
    title: 'Coordinator journal — IDEA-001',
    summary: 'Progressive disclosure shell scoped for v1.7.0 functional completion.',
    mime_type: 'text/markdown',
    byte_size: 1024,
    agent_id: 'agent-cursor-external',
    session_id: 'sess-mcp-001',
    correlation_id: 'corr-artifact-epic-001',
    parent_artifact_id: null,
    storage_provider: 'inline_text',
    storage_key: null,
    inline_body: 'Coordinator approved IDEA-001 shell simplification.',
    content_hash: null,
    metadata: {},
    created_by: null,
    created_at: '2026-07-06T12:00:00.000Z',
    updated_at: '2026-07-06T12:00:00.000Z',
  },
];

function readArtifacts(): StoryArtifact[] {
  if (typeof window === 'undefined') {
    return SEED_ARTIFACTS;
  }
  try {
    const raw = window.localStorage.getItem(ARTIFACTS_STORAGE_KEY);
    if (!raw) {
      return SEED_ARTIFACTS;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoryArtifact[]) : SEED_ARTIFACTS;
  } catch {
    return SEED_ARTIFACTS;
  }
}

function writeArtifacts(artifacts: StoryArtifact[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(ARTIFACTS_STORAGE_KEY, JSON.stringify(artifacts));
  } catch {
    // ignore
  }
}

export function listArtifactsForStory(storyId: string): StoryArtifact[] {
  return readArtifacts()
    .filter((row) => row.story_id === storyId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function listArtifactsForEpic(epicId: string): StoryArtifact[] {
  return readArtifacts()
    .filter((row) => row.epic_id === epicId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getArtifactById(artifactId: string): StoryArtifact | undefined {
  return readArtifacts().find((row) => row.id === artifactId);
}

export function createArtifact(
  input: Pick<
    StoryArtifact,
    | 'workspace_id'
    | 'story_id'
    | 'epic_id'
    | 'artifact_kind'
    | 'source'
    | 'title'
    | 'summary'
    | 'mime_type'
    | 'byte_size'
    | 'inline_body'
    | 'parent_artifact_id'
    | 'agent_id'
    | 'session_id'
    | 'correlation_id'
  >,
): StoryArtifact {
  const now = new Date().toISOString();
  const artifact: StoryArtifact = {
    id: `artifact-${crypto.randomUUID()}`,
    storage_provider: input.inline_body ? 'inline_text' : 'r2',
    storage_key: null,
    content_hash: null,
    metadata: {},
    created_by: null,
    created_at: now,
    updated_at: now,
    ...input,
  };
  writeArtifacts([artifact, ...readArtifacts()]);
  return artifact;
}

export async function uploadUserArtifact(
  target: { storyId?: string; epicId?: string },
  file: File,
  workspaceId: string = DEMO_WORKSPACE_ID,
): Promise<StoryArtifact> {
  const isText = file.type.startsWith('text/') || file.name.endsWith('.md');
  let inlineBody: string | null = null;
  if (isText && file.size <= 256_000) {
    inlineBody = await file.text();
  }

  return createArtifact({
    workspace_id: workspaceId,
    story_id: target.storyId ?? null,
    epic_id: target.epicId ?? null,
    artifact_kind: 'user_upload',
    source: 'human',
    title: file.name,
    summary: `Uploaded ${file.name} (${file.size} bytes)`,
    mime_type: file.type || 'application/octet-stream',
    byte_size: file.size,
    inline_body: inlineBody,
    parent_artifact_id: null,
    agent_id: null,
    session_id: null,
    correlation_id: null,
  });
}

export function buildArtifactTree(
  artifacts: StoryArtifact[],
): Array<StoryArtifact & { children: StoryArtifact[] }> {
  const roots = artifacts.filter((row) => !row.parent_artifact_id);
  return roots.map((root) => ({
    ...root,
    children: artifacts.filter((row) => row.parent_artifact_id === root.id),
  }));
}
