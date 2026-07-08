import { NextResponse, type NextRequest } from 'next/server';
import { createCorrelationContext } from '@/lib/correlation';
import {
  buildObsLogEvent,
  serializeObsLogEvent,
} from '@landi-flow/core/observability/structured-log';

interface ObsReportBody {
  message: string;
  correlation_id?: string;
  level?: 'error' | 'warn';
  context?: Record<string, unknown>;
}

/** OBS-001 local dev sink — forwards structured client errors to server logs / optional remote sink. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const headerCorrelation = request.headers.get('x-landi-correlation-id');
  const fallback = createCorrelationContext().correlation_id;

  let body: ObsReportBody;
  try {
    body = (await request.json()) as ObsReportBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const correlationId = body.correlation_id ?? headerCorrelation ?? fallback;
  const event = buildObsLogEvent(
    'landi-flow-frontend',
    body.level ?? 'error',
    body.message,
    { correlation_id: correlationId },
    body.context,
  );

  console.error(serializeObsLogEvent(event));

  const sinkUrl = process.env.OBS_ERROR_SINK_URL?.trim();
  if (sinkUrl) {
    try {
      await fetch(sinkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Landi-Correlation-Id': correlationId,
        },
        body: serializeObsLogEvent(event),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'obs_sink_failed';
      console.error('[OBS-001] sink_forward_failed', message);
    }
  }

  return NextResponse.json({ ok: true, correlation_id: correlationId });
}
