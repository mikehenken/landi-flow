import { NextResponse, type NextRequest } from 'next/server';
import { createCorrelationContext } from '@/lib/correlation';
import { createServerCustomerRequest } from '@/lib/mock/server-settings-store';

function resolveAsksSecret(request: NextRequest): boolean {
  const configured =
    process.env.ASKS_INTAKE_WEBHOOK_SECRET?.trim() ??
    process.env.NEXT_PUBLIC_MOCK_ASKS_WEBHOOK_SECRET?.trim() ??
    'e2e-asks-secret';
  const header =
    request.headers.get('X-Landi-Asks-Secret') ??
    request.headers.get('x-landi-asks-secret');
  return header === configured;
}

interface AsksIntakeBody {
  workspace_id: string;
  customer_id: string;
  quote: string;
  source?: 'web' | 'slack' | 'email' | 'api';
  requester_name?: string | null;
}

/** CAP-073 mock/dev asks intake — mirrors Workers webhook for e2e proof. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlation = createCorrelationContext();
  const correlationId = correlation.correlation_id;

  if (!resolveAsksSecret(request)) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Invalid asks intake secret', correlation_id: correlationId },
      { status: 401 },
    );
  }

  let body: AsksIntakeBody;
  try {
    body = (await request.json()) as AsksIntakeBody;
  } catch {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Request body must be JSON', correlation_id: correlationId },
      { status: 400 },
    );
  }

  if (!body.workspace_id || !body.customer_id || !body.quote?.trim()) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        message: 'workspace_id, customer_id, and quote are required',
        correlation_id: correlationId,
      },
      { status: 400 },
    );
  }

  const created = createServerCustomerRequest({
    workspaceId: body.workspace_id,
    customerId: body.customer_id,
    quote: body.quote,
    requesterName: body.requester_name ?? null,
    source: body.source ?? 'api',
    correlationId,
  });

  return NextResponse.json({ request: created, correlation_id: correlationId }, { status: 201 });
}
