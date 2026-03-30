import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const { GET: authGET, POST: authPOST } = toNextJsHandler(auth);

function withCors(handler: Function) {
  return async (req: Request, ...args: any[]) => {
    const origin = req.headers.get("origin");
    const headers: Record<string, string> = {
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };
    if (origin) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // Log all auth requests for debugging
    if (req.method === "POST") {
      const url = new URL(req.url);
      const pathSegments = url.pathname.split("/");
      const action = pathSegments[pathSegments.length - 1];

      try {
        const clonedReq = req.clone();
        const body = await clonedReq.json().catch(() => ({}));

        console.log(`[BETTER_AUTH] POST ${action}`, {
          timestamp: new Date().toISOString(),
          path: url.pathname,
          email: body.email || "N/A",
          hasPwd: !!body.password,
        });
      } catch (e) {
        // ignore parsing errors
      }
    }

    const res = await handler(req, ...args);
    
    // Log response
    if (req.method === "POST") {
      const url = new URL(req.url);
      const pathSegments = url.pathname.split("/");
      const action = pathSegments[pathSegments.length - 1];
      
      console.log(`[BETTER_AUTH] Response ${action}`, {
        status: res.status,
        timestamp: new Date().toISOString(),
      });
    }

    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  };
}

export const GET = withCors(authGET);
export const POST = withCors(authPOST);
export const OPTIONS = withCors(() => new Response(null, { status: 204 }));
