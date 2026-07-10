# Set Cloudflare Worker secrets from repo-root .env.local (names echoed only).
# Usage: .\scripts\set-staging-secrets.ps1 [-Target frontend|api|mcp|all]
param(
    [ValidateSet('frontend', 'api', 'mcp', 'all')]
    [string]$Target = 'frontend'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $RepoRoot '.env.local'

if (-not (Test-Path $EnvFile)) {
    Write-Error ".env.local not found at $EnvFile"
}

function Read-EnvValue {
    param([string]$Key)
    foreach ($line in Get-Content $EnvFile) {
        if ($line -match "^\s*#") { continue }
        if ($line -match "^\s*$Key\s*=\s*(.*)$") {
            return $Matches[1].Trim()
        }
    }
    return $null
}

function Set-WorkerSecrets {
    param(
        [string]$Config,
        [string[]]$Keys,
        [hashtable]$Overrides = @{}
    )
    Push-Location $RepoRoot
    try {
        foreach ($key in $Keys) {
            $value = if ($Overrides.ContainsKey($key)) { $Overrides[$key] } else { Read-EnvValue $key }
            if ([string]::IsNullOrWhiteSpace($value)) {
                Write-Host "SKIP $key (empty in .env.local)"
                continue
            }
            Write-Host "SET $key -> $(Split-Path $Config -Leaf)"
            $value | pnpm exec wrangler secret put $key --config $Config 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                throw "wrangler secret put failed for $key"
            }
        }
    }
    finally {
        Pop-Location
    }
}

$canvasOverrides = @{
    'NEXT_PUBLIC_SITE_URL' = 'https://canvas.landi.build'
    'NEXT_PUBLIC_ROOT_DOMAIN' = 'canvas.landi.build'
}

$frontendKeys = @(
    'LIVEBLOCKS_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_ROOT_DOMAIN',
    'MCP_WORKER_TOKEN',
    'CLOUDFLARE_AI_GATEWAY_TOKEN',
    'CLOUDFLARE_AI_GATEWAY_ENDPOINT',
    'CLOUDFLARE_AI_GATEWAY_ID',
    'CLOUDFLARE_ACCOUNT_ID',
    'GEMINI_API_KEY'
)

$apiKeys = @(
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CLOUDFLARE_AI_GATEWAY_TOKEN',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_PRO_MONTHLY',
    'NEXT_PUBLIC_SITE_URL'
)

$mcpKeys = @(
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'MCP_OAUTH_ISSUER',
    'MCP_RESOURCE_URI',
    'MCP_CREDENTIAL_PEPPER',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_AI_GATEWAY_ENDPOINT',
    'CLOUDFLARE_AI_GATEWAY_TOKEN',
    'CLOUDFLARE_AI_GATEWAY_ID',
    'GEMINI_API_KEY',
    'VERTEX_API_KEY',
    'DEFAULT_GEMINI_MODEL',
    'LIVEBLOCKS_SECRET_KEY'
)

switch ($Target) {
    'frontend' {
        Set-WorkerSecrets -Config 'frontend/wrangler.toml' -Keys $frontendKeys -Overrides $canvasOverrides
    }
    'api' {
        Set-WorkerSecrets -Config 'workers/api/wrangler.toml' -Keys $apiKeys -Overrides $canvasOverrides
    }
    'mcp' {
        Set-WorkerSecrets -Config 'workers/mcp/wrangler.toml' -Keys $mcpKeys
    }
    'all' {
        Set-WorkerSecrets -Config 'frontend/wrangler.toml' -Keys $frontendKeys -Overrides $canvasOverrides
        Set-WorkerSecrets -Config 'workers/api/wrangler.toml' -Keys $apiKeys -Overrides $canvasOverrides
        Set-WorkerSecrets -Config 'workers/mcp/wrangler.toml' -Keys $mcpKeys
    }
}

Write-Host "Done. Secret names configured for target: $Target"
