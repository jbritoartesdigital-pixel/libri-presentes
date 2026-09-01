const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (url.pathname.startsWith("/api/")) {
        return handleApi(request, env, url);
      }

      if (url.pathname.startsWith("/media/")) {
        return handleMedia(request, env, url);
      }

      return serveApp(request, env);
    } catch (error) {
      console.error(error);
      return json(
        {
          ok: false,
          error: "internal_error",
          message: "Não foi possível concluir esta solicitação."
        },
        500
      );
    }
  }
};

async function handleApi(request, env, url) {
  const { pathname } = url;

  if (pathname === "/api/health" && request.method === "GET") {
    return json({
      ok: true,
      app: env.APP_NAME || "Libri Presentes",
      timestamp: new Date().toISOString()
    });
  }

  const publicEventMatch = pathname.match(/^\/api\/events\/([^/]+)\/?$/);

  if (publicEventMatch && request.method === "GET") {
    return getPublicEvent(
      env,
      decodeURIComponent(publicEventMatch[1])
    );
  }

  return json(
    {
      ok: false,
      error: "not_found",
      message: "Rota não encontrada."
    },
    404
  );
}

async function getPublicEvent(env, slug) {
  if (!slug || slug.length > 120) {
    return json({ ok: false, error: "event_not_found" }, 404);
  }

  const event = await env.DB.prepare(`
    SELECT
      id,
      slug,
      event_name,
      event_type,
      event_date,
      status,
      public_title,
      intro,
      experience_style,
      primary_color,
      secondary_color,
      accent_color,
      background_color,
      text_color,
      cover_path,
      preview_path
    FROM events
    WHERE slug = ?
    LIMIT 1
  `).bind(slug).first();

  if (!event) {
    return json(
      {
        ok: false,
        error: "event_not_found",
        message: "Evento não encontrado."
      },
      404
    );
  }

  if (event.status !== "active") {
    return json(
      {
        ok: false,
        error: "event_inactive",
        message: "Esta lista não está recebendo presentes no momento."
      },
      410
    );
  }

  const giftsResult = await env.DB.prepare(`
    SELECT
      g.id,
      g.title,
      g.description,
      g.category,
      g.gift_type,
      g.target_cents,
      g.quantity,
      g.icon_name,
      g.preferred_color,
      g.image_path,
      g.allow_pix,
      g.allow_physical,
      g.display_order,

      COALESCE((
        SELECT SUM(c.amount_cents)
        FROM contributions c
        WHERE c.gift_id = g.id
          AND c.status = 'confirmed'
      ), 0) AS confirmed_cents,

      COALESCE((
        SELECT COUNT(*)
        FROM contributions c
        WHERE c.gift_id = g.id
          AND c.status = 'confirmed'
      ), 0) AS contributor_count,

      COALESCE((
        SELECT COUNT(*)
        FROM reservations r
        WHERE r.gift_id = g.id
          AND r.status IN ('reserved','purchased','received')
      ), 0) AS active_reservations

    FROM gifts g
    WHERE g.event_id = ?
      AND g.is_active = 1
    ORDER BY g.display_order ASC, g.created_at ASC
  `).bind(event.id).all();

  const gifts = (giftsResult.results || []).map((gift) => ({
    ...gift,
    image_url: gift.image_path
      ? `${env.APP_URL || ""}/media/${encodeMediaPath(gift.image_path)}`
      : null
  }));

  return json({
    ok: true,
    event: {
      ...event,
      cover_url: event.cover_path
        ? `${env.APP_URL || ""}/media/${encodeMediaPath(event.cover_path)}`
        : null,
      preview_url: event.preview_path
        ? `${env.APP_URL || ""}/media/${encodeMediaPath(event.preview_path)}`
        : null
    },
    gifts
  });
}

async function handleMedia(request, env, url) {
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawPath = url.pathname.slice("/media/".length);

  if (!rawPath) {
    return new Response("Not Found", { status: 404 });
  }

  let key;

  try {
    key = rawPath
      .split("/")
      .map(decodeURIComponent)
      .join("/");
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  if (!key.startsWith("events/")) {
    return new Response("Not Found", { status: 404 });
  }

  const object = await env.MEDIA.get(key);

  if (!object) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);

  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");

  return new Response(
    request.method === "HEAD" ? null : object.body,
    {
      status: 200,
      headers
    }
  );
}

async function serveApp(request, env) {
  if (!env.ASSETS) {
    return new Response(
      "Static Assets não configurado.",
      { status: 500 }
    );
  }

  const response = await env.ASSETS.fetch(request);

  if (response.status !== 404) {
    return withSecurityHeaders(response);
  }

  const url = new URL(request.url);
  url.pathname = "/index.html";

  const fallback = await env.ASSETS.fetch(
    new Request(url.toString(), request)
  );

  return withSecurityHeaders(fallback);
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);

  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-frame-options", "DENY");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function encodeMediaPath(path) {
  return String(path)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: JSON_HEADERS
    }
  );
}
