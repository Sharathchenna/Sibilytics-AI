// Simple Cloudflare Worker for visitor counting
export interface Env {
  VISITOR_COUNT: KVNamespace;
}

// Helper function to create a hash from IP address
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    try {
      const kv = env.VISITOR_COUNT;

      // Get session ID from request
      const body = await request.json() as { sessionId?: string };
      const sessionId = body.sessionId || 'no-session';

      // Get IP address
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';

      // Create unique visitor key
      const ipHash = await hashIP(ip);
      const visitorKey = `visitor:${ipHash}:${sessionId}`;

      // Check if visitor exists
      const existingVisitor = await kv.get(visitorKey);

      // Get current count
      const countStr = await kv.get('total_visitors');
      const currentCount = countStr ? parseInt(countStr, 10) : 0;

      let newCount = currentCount;
      let wasCounted = false;

      // Increment if new visitor
      if (!existingVisitor) {
        newCount = currentCount + 1;
        await kv.put('total_visitors', newCount.toString());
        // 1 week = 7 days = 604800 seconds
        await kv.put(visitorKey, 'counted', { expirationTtl: 604800 });
        wasCounted = true;
      }

      return new Response(
        JSON.stringify({
          count: newCount,
          success: true,
          counted: wasCounted,
          message: wasCounted ? 'New unique visitor counted' : 'Already counted in last week',
        }),
        { status: 200, headers: corsHeaders }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to track visitor',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
