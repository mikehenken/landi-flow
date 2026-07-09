import { test, expect } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09ax-artifact-system-backend/iteration-0/artifacts';

test.describe('Artifact system backend (ART-001)', () => {
  test.setTimeout(60_000);

  test('GET /api/artifacts returns story artifacts', async ({ request }) => {
    const response = await request.get('/api/artifacts?story_id=story-001');
    expect(response.ok()).toBeTruthy();
    const json = (await response.json()) as {
      ok: boolean;
      artifacts: Array<{ id: string; artifact_kind: string }>;
      live: boolean;
    };
    expect(json.ok).toBe(true);
    expect(json.live).toBe(false);
    expect(json.artifacts.length).toBeGreaterThan(0);
    expect(json.artifacts[0]?.artifact_kind).toBeDefined();
  });

  test('POST /api/artifacts creates artifact row', async ({ request }) => {
    const response = await request.post('/api/artifacts', {
      data: {
        workspace_id: 'ws-acme-agency',
        story_id: 'story-001',
        artifact_kind: 'user_upload',
        source: 'human',
        title: 'e2e-proof.txt',
        summary: 'E2E artifact upload proof',
        inline_body: 'proof content',
      },
    });
    expect(response.status()).toBe(201);
    const json = (await response.json()) as {
      ok: boolean;
      artifact: { id: string; correlation_id: string | null };
    };
    expect(json.ok).toBe(true);
    expect(json.artifact.id).toBeTruthy();
  });
});
