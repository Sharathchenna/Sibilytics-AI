import { NextRequest, NextResponse } from 'next/server';

// Type definition for Cloudflare environment with KV
declare global {
  var VISITOR_COUNT: KVNamespace | undefined;
}

// Helper function to create a hash from IP address
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  try {
    // Try multiple ways to access the KV binding
    let kv: KVNamespace | undefined;

    // Method 1: Check if available on process.env (OpenNext Cloudflare approach)
    if ((process.env as any).VISITOR_COUNT) {
      kv = (process.env as any).VISITOR_COUNT;
      console.log('KV found on process.env');
    }
    // Method 2: Check globalThis
    else if (globalThis.VISITOR_COUNT) {
      kv = globalThis.VISITOR_COUNT;
      console.log('KV found on globalThis');
    }

    console.log('KV binding:', {
      available: !!kv,
      hasGet: kv && typeof (kv as any).get === 'function',
      hasPut: kv && typeof (kv as any).put === 'function',
      type: kv ? typeof kv : 'undefined'
    });

    if (!kv || typeof (kv as any).get !== 'function') {
      // If KV is not available or doesn't have the right methods
      console.error('KV namespace not properly configured');
      return NextResponse.json(
        { count: 0, message: 'KV namespace not configured', counted: false },
        { status: 200 }
      );
    }

    // Get visitor's IP address from Cloudflare headers
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-forwarded-for') ||
               'unknown';

    // Get session ID from request body (sent from frontend localStorage)
    const body = await request.json() as { sessionId?: string };
    const sessionId = body.sessionId || 'no-session';

    // Create a unique identifier combining IP hash and session
    const ipHash = await hashIP(ip);
    const visitorKey = `visitor:${ipHash}:${sessionId}`;

    // Check if this visitor has been counted in the last 24 hours
    const existingVisitor = await kv.get(visitorKey);
    console.log('Existing visitor check:', visitorKey, 'exists:', !!existingVisitor);

    // Get current count
    const countStr = await kv.get('total_visitors');
    const currentCount = countStr ? parseInt(countStr, 10) : 0;
    console.log('Current count from KV:', currentCount);

    let newCount = currentCount;
    let wasCounted = false;

    // Only increment if this is a new unique visitor (within 24 hours)
    if (!existingVisitor) {
      newCount = currentCount + 1;
      console.log('Incrementing count to:', newCount);

      await kv.put('total_visitors', newCount.toString());
      console.log('Saved new count to KV');

      // Mark this visitor as counted for 24 hours (86400 seconds)
      await kv.put(visitorKey, 'counted', { expirationTtl: 86400 });
      console.log('Marked visitor as counted');
      wasCounted = true;
    } else {
      console.log('Visitor already counted, not incrementing');
    }

    return NextResponse.json(
      {
        count: newCount,
        success: true,
        counted: wasCounted,
        message: wasCounted ? 'New unique visitor counted' : 'Already counted in last 24h',
        debug: {
          kvFound: kv ? 'yes' : 'no',
          kvSource: (process.env as any).VISITOR_COUNT ? 'process.env' : globalThis.VISITOR_COUNT ? 'globalThis' : 'not found',
          hasGetMethod: kv && typeof (kv as any).get === 'function',
          hasPutMethod: kv && typeof (kv as any).put === 'function',
          currentCountFromKV: currentCount,
          visitorKeyChecked: visitorKey.substring(0, 30) + '...',
          existingVisitorFound: !!existingVisitor
        }
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
        }
      }
    );

  } catch (error) {
    console.error('Error tracking visitor:', error);
    return NextResponse.json(
      {
        count: 0,
        error: 'Failed to track visitor',
        details: error instanceof Error ? error.message : 'Unknown error',
        counted: false
      },
      { status: 500 }
    );
  }
}
