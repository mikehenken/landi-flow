-- STUDY-013 task-09e: Extension Launchpad + marketplace catalog (IDEA-008)

CREATE TABLE linear_clone.extensions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            citext NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text,
  manifest        jsonb NOT NULL,
  publisher       text,
  is_official     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE linear_clone.extension_installs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  extension_id    uuid NOT NULL REFERENCES linear_clone.extensions(id),
  oauth_app_id    uuid REFERENCES linear_clone.oauth_apps(id),
  config          jsonb NOT NULL DEFAULT '{}'::jsonb,
  installed_by    uuid NOT NULL REFERENCES auth.users(id),
  enabled         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, extension_id)
);

CREATE INDEX extension_installs_workspace_idx ON linear_clone.extension_installs (workspace_id);

CREATE TABLE linear_clone.import_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  source          text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  progress        jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id  uuid NOT NULL,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

CREATE INDEX import_jobs_workspace_status_idx ON linear_clone.import_jobs (workspace_id, status);

-- Official marketplace seed (public catalog)
INSERT INTO linear_clone.extensions (slug, name, description, manifest, publisher, is_official)
VALUES
  (
    'github-sync',
    'GitHub Sync',
    'Mirror pull requests and CI signals into Landi Flow activity and triage.',
    '{"version":"1.0.0","scopes":["signals.read","signals.write"],"webhooks":["signal.attached"],"icon":"github"}'::jsonb,
    'Landi',
    true
  ),
  (
    'slack-notifications',
    'Slack Notifications',
    'Post Story and Epic updates to Slack channels with workspace-scoped routing.',
    '{"version":"1.0.0","scopes":["entity.story.read","entity.epic.read"],"webhooks":["entity.story.updated","entity.epic.updated"],"icon":"slack"}'::jsonb,
    'Landi',
    true
  ),
  (
    'stripe-billing-bridge',
    'Stripe Billing Bridge',
    'Connect Stripe Checkout and Customer Portal to workspace entitlements.',
    '{"version":"1.0.0","scopes":["billing.read","billing.write"],"webhooks":["billing.entitlement_changed"],"icon":"stripe"}'::jsonb,
    'Landi',
    true
  );
