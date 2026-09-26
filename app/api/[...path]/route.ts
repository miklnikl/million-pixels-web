import { NextRequest } from "next/server";

async function forward(request: NextRequest) {
  const path = request.nextUrl.pathname.slice("/api/".length);
  const method = request.method;
  const allowed =
    (path === "users" && method === "POST") ||
    (path === "auth/me" && method === "GET") ||
    (["auth/login", "auth/logout"].includes(path) && method === "POST") ||
    (path === "pixel-blocks" && method === "POST") ||
    (/^pixel-blocks\/[a-f0-9-]+$/.test(path) &&
      ["PUT", "DELETE"].includes(method));

  if (!allowed) return new Response(null, { status: 404 });

  if (method !== "GET") {
    const origin = request.headers.get("origin");
    if (
      (origin && origin !== request.nextUrl.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site" ||
      request.headers.get("content-type")?.split(";")[0].trim() !==
        "application/json"
    ) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  const session = request.cookies.get("pixel_session")?.value;
  if (session && /^[a-f0-9]{64}$/.test(session)) {
    headers.set("Cookie", `pixel_session=${session}`);
  }

  try {
    const upstream = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/${path}`, {
      method,
      headers,
      body: method === "GET" ? undefined : await request.text(),
      cache: "no-store",
      redirect: "error",
    });
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("Content-Type", contentType);
    for (const cookie of upstream.headers.getSetCookie()) {
      responseHeaders.append("Set-Cookie", cookie);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { message: "Unable to reach the server. Please try again." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export { forward as GET, forward as POST, forward as PUT, forward as DELETE };
