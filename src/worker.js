export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ===== API: GET STATE =====
    if (url.pathname === "/api/state") {
      const apiUrl = `${env.GS_API_BASE}?route=state`;

      const res = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      const text = await res.text();

      return new Response(text, {
        status: res.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }

    // ===== API: POST ACTION =====
    if (url.pathname === "/api/action" && request.method === "POST") {
      const body = await request.text();

      const res = await fetch(env.GS_API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body
      });

      const text = await res.text();

      return new Response(text, {
        status: res.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }

    // ===== STATIC ROUTES =====
    if (url.pathname === "/" || url.pathname === "/index") {
      return env.ASSETS.fetch(new Request(new URL("/index.html", url)));
    }

    if (url.pathname === "/overlay") {
      return env.ASSETS.fetch(new Request(new URL("/overlay.html", url)));
    }

    if (url.pathname === "/apresentacao") {
      return env.ASSETS.fetch(new Request(new URL("/apresentacao.html", url)));
    }

    // ===== DEFAULT STATIC =====
    return env.ASSETS.fetch(request);
  }
};