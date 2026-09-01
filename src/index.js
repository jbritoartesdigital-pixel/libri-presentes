const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

const ALLOWED_IMAGE_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
const EVENT_TYPES = new Set(["wedding","bridal_shower","housewarming","engagement","other"]);
const GIFT_TYPES = new Set(["quota","creative","experience","physical"]);
const COMPLETE_BEHAVIORS = new Set(["show","hide","allow_extra"]);
const EXPERIENCE_STYLES = new Set(["home","journey","classic"]);

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url);
      }

      if (url.pathname.startsWith("/media/")) {
        return await handleMedia(request, env, url);
      }

      const eventMatch = url.pathname.match(/^\/e\/([^/]+)\/?$/);
      if (eventMatch) {
        const slug = decodeURIComponent(eventMatch[1]);
        return await serveSpa(request, env, slug);
      }

      return await serveSpa(request, env, null);
    } catch (error) {
      console.error("Unhandled:", error);
      return json({
        ok:false,
        error:"internal_error",
        message:"Não foi possível concluir esta solicitação."
      }, 500);
    }
  }
};

async function handleApi(request, env, url) {
  const p = url.pathname;
  const method = request.method.toUpperCase();

  if (p === "/api/health" && method === "GET") {
    return json({ok:true, app:env.APP_NAME || "Libri Presentes", now:new Date().toISOString()});
  }

  // PUBLIC
  let m = p.match(/^\/api\/events\/([^/]+)$/);
  if (m && method === "GET") {
    return getPublicEvent(env, decodeURIComponent(m[1]));
  }

  m = p.match(/^\/api\/events\/([^/]+)\/contributions$/);
  if (m && method === "POST") {
    return createContribution(request, env, decodeURIComponent(m[1]));
  }

  m = p.match(/^\/api\/events\/([^/]+)\/reservations$/);
  if (m && method === "POST") {
    return createReservation(request, env, decodeURIComponent(m[1]));
  }

  m = p.match(/^\/api\/reservations\/([^/]+)$/);
  if (m && method === "GET") {
    return getReservation(env, decodeURIComponent(m[1]));
  }

  m = p.match(/^\/api\/reservations\/([^/]+)\/purchased$/);
  if (m && method === "POST") {
    return markReservationPurchased(env, decodeURIComponent(m[1]));
  }

  m = p.match(/^\/api\/reservations\/([^/]+)\/cancel$/);
  if (m && method === "POST") {
    return cancelReservation(env, decodeURIComponent(m[1]));
  }

  // ADMIN
  if (p === "/api/admin/events" && method === "GET") {
    const denied = requireAdmin(request, env); if (denied) return denied;
    return adminListEvents(env);
  }

  if (p === "/api/admin/events" && method === "POST") {
    const denied = requireAdmin(request, env); if (denied) return denied;
    return adminCreateEvent(request, env);
  }

  m = p.match(/^\/api\/admin\/events\/([^/]+)$/);
  if (m && method === "GET") {
    const denied = requireAdmin(request, env); if (denied) return denied;
    return adminGetEvent(env, m[1]);
  }

  if (m && method === "PATCH") {
    const denied = requireAdmin(request, env); if (denied) return denied;
    return adminUpdateEvent(request, env, m[1]);
  }

  m = p.match(/^\/api\/admin\/events\/([^/]+)\/access$/);
  if (m && method === "POST") {
    const denied = requireAdmin(request, env); if (denied) return denied;
    return adminRegenerateAccess(env, m[1]);
  }

  m = p.match(/^\/api\/admin\/events\/([^/]+)\/preview$/);
  if (m && method === "PUT") {
    const denied = requireAdmin(request, env); if (denied) return denied;
    return adminUploadPreview(request, env, m[1]);
  }

  // CLIENT
  if (p === "/api/client/dashboard" && method === "GET") {
    const client = await requireClient(request, env);
    if (client.response) return client.response;
    return clientDashboard(env, client.event);
  }

  if (p === "/api/client/event" && method === "PATCH") {
    const client = await requireClient(request, env);
    if (client.response) return client.response;
    return clientUpdateEvent(request, env, client.event);
  }

  if (p === "/api/client/event" && method === "DELETE") {
    const client = await requireClient(request, env);
    if (client.response) return client.response;
    return clientDeleteEvent(request, env, client.event);
  }

  if (p === "/api/client/gifts" && method === "POST") {
    const client = await requireClient(request, env);
    if (client.response) return client.response;
    return clientCreateGift(request, env, client.event);
  }

  m = p.match(/^\/api\/client\/gifts\/([^/]+)$/);
  if (m && method === "PATCH") {
    const client = await requireClient(request, env);
    if (client.response) return client.response;
    return clientUpdateGift(request, env, client.event, m[1]);
  }

  if (m && method === "DELETE") {
    const client = await requireClient(request, env);
    if (client.response) return client.response;
    return clientDeleteGift(env, client.event, m[1]);
  }

  m = p.match(/^\/api\/client\/gifts\/([^/]+)\/image$/);
  if (m && method === "PUT") {
    const client = await requireClient(request, env);
    if (client.response) return client.response;
    return clientUploadGiftImage(request, env, client.event, m[1]);
  }

  if (m && method === "DELETE") {
    const client = await requireClient(request, env);
    if (client.response) return client.response;
    return clientDeleteGiftImage(env, client.event, m[1]);
  }

  m = p.match(/^\/api\/client\/contributions\/([^/]+)\/confirm$/);
  if (m && method === "POST") {
    const client = await requireClient(request, env);
    if (client.response) return client.response;
    return clientSetContribution(env, client.event, m[1], "confirmed");
  }

  m = p.match(/^\/api\/client\/contributions\/([^/]+)\/reject$/);
  if (m && method === "POST") {
    const client = await requireClient(request, env);
    if (client.response) return client.response;
    return clientSetContribution(env, client.event, m[1], "rejected");
  }

  m = p.match(/^\/api\/client\/reservations\/([^/]+)\/received$/);
  if (m && method === "POST") {
    const client = await requireClient(request, env);
    if (client.response) return client.response;
    return clientSetReservation(env, client.event, m[1], "received");
  }

  m = p.match(/^\/api\/client\/reservations\/([^/]+)\/cancel$/);
  if (m && method === "POST") {
    const client = await requireClient(request, env);
    if (client.response) return client.response;
    return clientSetReservation(env, client.event, m[1], "cancelled");
  }

  return json({ok:false,error:"not_found",message:"Rota não encontrada."},404);
}

async function getPublicEvent(env, slug) {
  await cleanupExpiredReservations(env);
  const event = await env.DB.prepare(`
    SELECT id,slug,event_name,event_type,event_date,status,public_title,intro,
           pix_key,pix_key_type,pix_holder_name,pix_city,
           experience_style,primary_color,secondary_color,accent_color,
           background_color,text_color,cover_path,preview_path,
           completed_behavior,reservation_hours,share_description
    FROM events WHERE slug=? LIMIT 1
  `).bind(slug).first();

  if (!event) return json({ok:false,error:"event_not_found",message:"Evento não encontrado."},404);
  if (event.status !== "active") return json({ok:false,error:"event_inactive",message:"Esta lista não está recebendo presentes no momento."},410);

  const rows = await env.DB.prepare(`
    SELECT
      g.id,g.title,g.description,g.category,g.gift_type,g.target_cents,g.quantity,
      g.icon_name,g.preferred_color,g.image_path,g.allow_pix,g.allow_physical,g.display_order,
      COALESCE((SELECT SUM(c.amount_cents) FROM contributions c WHERE c.gift_id=g.id AND c.status='confirmed'),0) confirmed_cents,
      COALESCE((SELECT COUNT(*) FROM contributions c WHERE c.gift_id=g.id AND c.status='confirmed'),0) contributor_count,
      COALESCE((SELECT COUNT(*) FROM reservations r WHERE r.gift_id=g.id AND r.status IN ('reserved','purchased')),0) active_reservations,
      COALESCE((SELECT COUNT(*) FROM reservations r WHERE r.gift_id=g.id AND r.status='received'),0) received_reservations
    FROM gifts g
    WHERE g.event_id=? AND g.is_active=1
    ORDER BY g.display_order ASC,g.created_at ASC
  `).bind(event.id).all();

  let gifts = (rows.results || []).map(g => ({
    ...g,
    image_url: g.image_path ? mediaUrl(env,g.image_path) : null
  }));

  if (event.completed_behavior === "hide") {
    gifts = gifts.filter(g => Number(g.target_cents) <= 0 || Number(g.confirmed_cents) < Number(g.target_cents) || g.gift_type === "physical");
  }

  return json({
    ok:true,
    event:{
      ...event,
      cover_url:event.cover_path ? mediaUrl(env,event.cover_path) : null,
      preview_url:event.preview_path ? mediaUrl(env,event.preview_path) : null
    },
    gifts
  });
}

async function createContribution(request, env, slug) {
  const event = await activeEventBySlug(env,slug);
  if (!event) return json({ok:false,error:"event_not_found"},404);

  const body = await readJson(request);
  if (!body) return bad("Dados inválidos.");

  const gift = await env.DB.prepare(`SELECT * FROM gifts WHERE id=? AND event_id=? AND is_active=1 LIMIT 1`)
    .bind(clean(body.gift_id,80),event.id).first();

  if (!gift || !gift.allow_pix) return bad("Este desejo não aceita contribuição via Pix.");

  const guestName = clean(body.guest_name,100);
  const guestContact = clean(body.guest_contact,160);
  const guestMessage = clean(body.guest_message,500);
  const amount = int(body.amount_cents);

  if (!guestName || !guestContact || amount < 100) return bad("Informe seu nome, contato e um valor válido.");

  const confirmed = await confirmedForGift(env,gift.id);
  const completed = gift.target_cents > 0 && confirmed >= gift.target_cents;
  if (completed && event.completed_behavior !== "allow_extra") {
    return bad("Este desejo já foi realizado.");
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO contributions
      (id,event_id,gift_id,guest_name,guest_contact,amount_cents,status,payment_method,guest_message)
    VALUES (?,?,?,?,?,?,'pending','pix',?)
  `).bind(id,event.id,gift.id,guestName,guestContact,amount,guestMessage || null).run();

  await log(env,event.id,"guest","contribution_declared",{gift_id:gift.id,contribution_id:id,detail:`${guestName} informou Pix de ${amount}`});
  return json({ok:true,contribution_id:id,status:"pending"},201);
}

async function createReservation(request, env, slug) {
  await cleanupExpiredReservations(env);
  const event = await activeEventBySlug(env,slug);
  if (!event) return json({ok:false,error:"event_not_found"},404);

  const body = await readJson(request);
  if (!body) return bad("Dados inválidos.");

  const gift = await env.DB.prepare(`SELECT * FROM gifts WHERE id=? AND event_id=? AND is_active=1 LIMIT 1`)
    .bind(clean(body.gift_id,80),event.id).first();

  if (!gift || gift.gift_type !== "physical" || !gift.allow_physical) return bad("Este presente não aceita reserva.");

  const guestName = clean(body.guest_name,100);
  const guestContact = clean(body.guest_contact,160);
  if (!guestName || !guestContact) return bad("Informe nome e contato.");

  const countRow = await env.DB.prepare(`
    SELECT COUNT(*) n FROM reservations
    WHERE gift_id=? AND status IN ('reserved','purchased','received')
  `).bind(gift.id).first();

  if (Number(countRow?.n || 0) >= Number(gift.quantity || 1)) return bad("Este presente já está reservado.");

  const rawToken = randomToken();
  const tokenHash = await sha256(rawToken);
  const id = crypto.randomUUID();
  const hours = Math.min(168,Math.max(1,Number(event.reservation_hours || env.RESERVATION_HOURS || 48)));
  const expiresAt = new Date(Date.now()+hours*3600000).toISOString();

  await env.DB.prepare(`
    INSERT INTO reservations
      (id,event_id,gift_id,guest_name,guest_contact,status,expires_at,manage_token_hash)
    VALUES (?,?,?,?,?,'reserved',?,?)
  `).bind(id,event.id,gift.id,guestName,guestContact,expiresAt,tokenHash).run();

  await log(env,event.id,"guest","gift_reserved",{gift_id:gift.id,reservation_id:id,detail:guestName});
  return json({
    ok:true,
    reservation_id:id,
    status:"reserved",
    expires_at:expiresAt,
    manage_url:`${env.APP_URL}/r/${encodeURIComponent(rawToken)}`
  },201);
}

async function getReservation(env, rawToken) {
  await cleanupExpiredReservations(env);
  const hash = await sha256(rawToken);
  const row = await env.DB.prepare(`
    SELECT r.id,r.status,r.expires_at,r.created_at,r.purchased_at,r.received_at,
           r.guest_name,g.title gift_title,g.preferred_color,
           e.event_name,e.slug
    FROM reservations r
    JOIN gifts g ON g.id=r.gift_id
    JOIN events e ON e.id=r.event_id
    WHERE r.manage_token_hash=? LIMIT 1
  `).bind(hash).first();
  if (!row) return json({ok:false,error:"reservation_not_found"},404);
  return json({ok:true,reservation:row});
}

async function markReservationPurchased(env, rawToken) {
  const hash = await sha256(rawToken);
  const row = await env.DB.prepare(`SELECT * FROM reservations WHERE manage_token_hash=? LIMIT 1`).bind(hash).first();
  if (!row) return json({ok:false,error:"reservation_not_found"},404);
  if (!["reserved","purchased"].includes(row.status)) return bad("Esta reserva não pode ser alterada.");
  await env.DB.prepare(`UPDATE reservations SET status='purchased',purchased_at=CURRENT_TIMESTAMP WHERE id=?`).bind(row.id).run();
  await log(env,row.event_id,"guest","gift_purchased",{gift_id:row.gift_id,reservation_id:row.id});
  return json({ok:true,status:"purchased"});
}

async function cancelReservation(env, rawToken) {
  const hash = await sha256(rawToken);
  const row = await env.DB.prepare(`SELECT * FROM reservations WHERE manage_token_hash=? LIMIT 1`).bind(hash).first();
  if (!row) return json({ok:false,error:"reservation_not_found"},404);
  if (!["reserved","purchased"].includes(row.status)) return bad("Esta reserva não pode ser cancelada.");
  await env.DB.prepare(`UPDATE reservations SET status='cancelled',cancelled_at=CURRENT_TIMESTAMP WHERE id=?`).bind(row.id).run();
  await log(env,row.event_id,"guest","reservation_cancelled",{gift_id:row.gift_id,reservation_id:row.id});
  return json({ok:true,status:"cancelled"});
}

function requireAdmin(request, env) {
  const supplied = request.headers.get("x-admin-key") || "";
  if (!env.ADMIN_KEY || supplied !== env.ADMIN_KEY) {
    return json({ok:false,error:"unauthorized",message:"Acesso não autorizado."},401);
  }
  return null;
}

async function requireClient(request, env) {
  const token = request.headers.get("x-client-token") || "";
  if (!token) return {response:json({ok:false,error:"unauthorized"},401)};
  const hash = await sha256(token);
  const event = await env.DB.prepare(`SELECT * FROM events WHERE client_token_hash=? LIMIT 1`).bind(hash).first();
  if (!event) return {response:json({ok:false,error:"unauthorized"},401)};
  return {event};
}

async function adminListEvents(env) {
  const rows = await env.DB.prepare(`
    SELECT e.id,e.slug,e.event_name,e.event_type,e.event_date,e.status,e.preview_path,e.created_at,
      (SELECT COUNT(*) FROM gifts g WHERE g.event_id=e.id) gift_count,
      COALESCE((SELECT SUM(amount_cents) FROM contributions c WHERE c.event_id=e.id AND c.status='confirmed'),0) confirmed_cents,
      COALESCE((SELECT COUNT(*) FROM contributions c WHERE c.event_id=e.id AND c.status='pending'),0) pending_count
    FROM events e ORDER BY e.created_at DESC
  `).all();
  return json({ok:true,events:(rows.results||[]).map(e=>({...e,preview_url:e.preview_path?mediaUrl(env,e.preview_path):null}))});
}

async function adminCreateEvent(request, env) {
  const body = await readJson(request);
  if (!body) return bad("Dados inválidos.");

  const eventName = clean(body.event_name,120);
  const slug = slugify(body.slug || eventName);
  const eventType = EVENT_TYPES.has(body.event_type) ? body.event_type : "wedding";
  const style = EXPERIENCE_STYLES.has(body.experience_style) ? body.experience_style : "home";

  if (!eventName || !slug) return bad("Nome e slug são obrigatórios.");

  const exists = await env.DB.prepare(`SELECT id FROM events WHERE slug=? LIMIT 1`).bind(slug).first();
  if (exists) return json({ok:false,error:"slug_exists",message:"Este slug já está em uso."},409);

  const rawToken = randomToken();
  const tokenHash = await sha256(rawToken);
  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO events
      (id,slug,event_name,client_name,event_type,event_date,status,public_title,intro,
       experience_style,primary_color,secondary_color,accent_color,background_color,text_color,
       client_token_hash,client_access_created_at,completed_behavior,reservation_hours)
    VALUES (?,?,?,?,?,?, 'draft',?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,'show',48)
  `).bind(
    id,slug,eventName,clean(body.client_name,120)||null,eventType,clean(body.event_date,20)||null,
    clean(body.public_title,160)||"Nossa lista de desejos",
    clean(body.intro,800)||"Reunimos alguns desejos para essa nova fase. Escolha um deles e participe do seu jeito.",
    style,
    color(body.primary_color,"#6F6258"),
    color(body.secondary_color,"#D8CEC4"),
    color(body.accent_color,"#A8AD96"),
    color(body.background_color,"#F7F3EE"),
    color(body.text_color,"#2A2724"),
    tokenHash
  ).run();

  await log(env,id,"admin","event_created",{detail:eventName});
  return json({
    ok:true,
    event_id:id,
    slug,
    client_url:`${env.APP_URL}/c/${encodeURIComponent(rawToken)}`,
    public_url:`${env.APP_URL}/e/${encodeURIComponent(slug)}`
  },201);
}

async function adminGetEvent(env,id) {
  const event = await env.DB.prepare(`SELECT * FROM events WHERE id=? LIMIT 1`).bind(id).first();
  if (!event) return json({ok:false,error:"not_found"},404);
  return json({ok:true,event:{...event,preview_url:event.preview_path?mediaUrl(env,event.preview_path):null}});
}

async function adminUpdateEvent(request, env, id) {
  const event = await env.DB.prepare(`SELECT * FROM events WHERE id=? LIMIT 1`).bind(id).first();
  if (!event) return json({ok:false,error:"not_found"},404);
  const body = await readJson(request); if (!body) return bad("Dados inválidos.");

  const updates = {
    event_name: body.event_name !== undefined ? clean(body.event_name,120) : event.event_name,
    client_name: body.client_name !== undefined ? clean(body.client_name,120) : event.client_name,
    event_date: body.event_date !== undefined ? clean(body.event_date,20) : event.event_date,
    public_title: body.public_title !== undefined ? clean(body.public_title,160) : event.public_title,
    intro: body.intro !== undefined ? clean(body.intro,800) : event.intro,
    experience_style: EXPERIENCE_STYLES.has(body.experience_style) ? body.experience_style : event.experience_style,
    primary_color: body.primary_color ? color(body.primary_color,event.primary_color) : event.primary_color,
    secondary_color: body.secondary_color ? color(body.secondary_color,event.secondary_color) : event.secondary_color,
    accent_color: body.accent_color ? color(body.accent_color,event.accent_color) : event.accent_color,
    background_color: body.background_color ? color(body.background_color,event.background_color) : event.background_color,
    text_color: body.text_color ? color(body.text_color,event.text_color) : event.text_color
  };

  await env.DB.prepare(`
    UPDATE events SET event_name=?,client_name=?,event_date=?,public_title=?,intro=?,experience_style=?,
      primary_color=?,secondary_color=?,accent_color=?,background_color=?,text_color=?
    WHERE id=?
  `).bind(
    updates.event_name,updates.client_name||null,updates.event_date||null,updates.public_title||null,updates.intro||null,
    updates.experience_style,updates.primary_color,updates.secondary_color,updates.accent_color,updates.background_color,updates.text_color,id
  ).run();

  return json({ok:true});
}

async function adminRegenerateAccess(env,id) {
  const event = await env.DB.prepare(`SELECT id FROM events WHERE id=? LIMIT 1`).bind(id).first();
  if (!event) return json({ok:false,error:"not_found"},404);
  const rawToken = randomToken();
  const hash = await sha256(rawToken);
  await env.DB.prepare(`UPDATE events SET client_token_hash=?,client_access_created_at=CURRENT_TIMESTAMP WHERE id=?`).bind(hash,id).run();
  return json({ok:true,client_url:`${env.APP_URL}/c/${encodeURIComponent(rawToken)}`});
}

async function adminUploadPreview(request,env,id) {
  const event = await env.DB.prepare(`SELECT * FROM events WHERE id=? LIMIT 1`).bind(id).first();
  if (!event) return json({ok:false,error:"not_found"},404);
  const upload = await readImage(request,env);
  if (upload.response) return upload.response;

  const key = `events/${id}/preview-${Date.now()}.${upload.ext}`;
  await env.MEDIA.put(key,upload.bytes,{httpMetadata:{contentType:upload.type}});
  if (event.preview_path) await safeDeleteR2(env,event.preview_path);
  await env.DB.prepare(`UPDATE events SET preview_path=? WHERE id=?`).bind(key,id).run();
  return json({ok:true,preview_url:mediaUrl(env,key)});
}

async function clientDashboard(env,event) {
  await cleanupExpiredReservations(env);

  const giftsR = await env.DB.prepare(`
    SELECT g.*,
      COALESCE((SELECT SUM(amount_cents) FROM contributions c WHERE c.gift_id=g.id AND c.status='confirmed'),0) confirmed_cents,
      COALESCE((SELECT COUNT(*) FROM contributions c WHERE c.gift_id=g.id AND c.status='confirmed'),0) contributor_count
    FROM gifts g WHERE g.event_id=? ORDER BY g.display_order,g.created_at
  `).bind(event.id).all();

  const contribR = await env.DB.prepare(`
    SELECT c.*,g.title gift_title,g.icon_name
    FROM contributions c JOIN gifts g ON g.id=c.gift_id
    WHERE c.event_id=? ORDER BY c.declared_at DESC
  `).bind(event.id).all();

  const reservR = await env.DB.prepare(`
    SELECT r.*,g.title gift_title,g.icon_name,g.preferred_color
    FROM reservations r JOIN gifts g ON g.id=r.gift_id
    WHERE r.event_id=? ORDER BY r.created_at DESC
  `).bind(event.id).all();

  const gifts = (giftsR.results||[]).map(g=>({...g,image_url:g.image_path?mediaUrl(env,g.image_path):null}));

  return json({
    ok:true,
    event:{
      ...event,
      preview_url:event.preview_path?mediaUrl(env,event.preview_path):null,
      public_url:`${env.APP_URL}/e/${event.slug}`
    },
    gifts,
    contributions:contribR.results||[],
    reservations:reservR.results||[]
  });
}

async function clientUpdateEvent(request,env,event) {
  const body = await readJson(request); if (!body) return bad("Dados inválidos.");

  const status = ["draft","active","inactive"].includes(body.status) ? body.status : event.status;
  const completed = COMPLETE_BEHAVIORS.has(body.completed_behavior) ? body.completed_behavior : event.completed_behavior;
  const hours = body.reservation_hours !== undefined
    ? Math.min(168,Math.max(1,int(body.reservation_hours)))
    : Number(event.reservation_hours||48);

  await env.DB.prepare(`
    UPDATE events SET
      event_name=?,event_date=?,intro=?,pix_key=?,pix_key_type=?,pix_holder_name=?,pix_city=?,
      status=?,completed_behavior=?,reservation_hours=?,share_description=?
    WHERE id=?
  `).bind(
    body.event_name!==undefined?clean(body.event_name,120):event.event_name,
    body.event_date!==undefined?clean(body.event_date,20)||null:event.event_date,
    body.intro!==undefined?clean(body.intro,800)||null:event.intro,
    body.pix_key!==undefined?clean(body.pix_key,180)||null:event.pix_key,
    body.pix_key_type!==undefined?clean(body.pix_key_type,20)||null:event.pix_key_type,
    body.pix_holder_name!==undefined?clean(body.pix_holder_name,80)||null:event.pix_holder_name,
    body.pix_city!==undefined?clean(body.pix_city,50)||null:event.pix_city,
    status,completed,hours,
    body.share_description!==undefined?clean(body.share_description,220)||null:event.share_description,
    event.id
  ).run();

  await log(env,event.id,"client","event_updated",{detail:status});
  return json({ok:true});
}

async function clientDeleteEvent(request,env,event) {
  const body = await readJson(request);
  if (!body || clean(body.confirm,160) !== event.event_name) {
    return bad("Digite exatamente o nome do evento para excluir.");
  }
  await deleteR2Prefix(env,`events/${event.id}/`);
  await env.DB.prepare(`DELETE FROM events WHERE id=?`).bind(event.id).run();
  return json({ok:true,deleted:true});
}

async function clientCreateGift(request,env,event) {
  const body = await readJson(request); if (!body) return bad("Dados inválidos.");
  const title = clean(body.title,140);
  const type = GIFT_TYPES.has(body.gift_type) ? body.gift_type : "quota";
  const target = Math.max(0,int(body.target_cents));
  if (!title) return bad("Informe o nome do desejo.");
  if (type !== "physical" && target < 100) return bad("Informe um valor válido.");

  const id = crypto.randomUUID();
  const allowPhysical = type === "physical" ? 1 : 0;
  await env.DB.prepare(`
    INSERT INTO gifts
      (id,event_id,title,description,category,gift_type,target_cents,quantity,icon_name,preferred_color,
       allow_pix,allow_physical,is_active,display_order)
    VALUES (?,?,?,?,?,?,?,?,?,?,?, ?,1,?)
  `).bind(
    id,event.id,title,clean(body.description,600)||null,clean(body.category,60)||"Outros",type,target,
    Math.max(1,int(body.quantity)||1),clean(body.icon_name,80)||"gift",clean(body.preferred_color,80)||null,
    body.allow_pix===false?0:1,allowPhysical,Math.max(0,int(body.display_order)||0)
  ).run();
  await log(env,event.id,"client","gift_created",{gift_id:id,detail:title});
  return json({ok:true,gift_id:id},201);
}

async function clientUpdateGift(request,env,event,giftId) {
  const gift = await ownedGift(env,event.id,giftId); if (!gift) return json({ok:false,error:"not_found"},404);
  const body = await readJson(request); if (!body) return bad("Dados inválidos.");
  const type = GIFT_TYPES.has(body.gift_type) ? body.gift_type : gift.gift_type;

  await env.DB.prepare(`
    UPDATE gifts SET title=?,description=?,category=?,gift_type=?,target_cents=?,quantity=?,
      icon_name=?,preferred_color=?,allow_pix=?,allow_physical=?,is_active=?,display_order=?
    WHERE id=? AND event_id=?
  `).bind(
    body.title!==undefined?clean(body.title,140):gift.title,
    body.description!==undefined?clean(body.description,600)||null:gift.description,
    body.category!==undefined?clean(body.category,60)||"Outros":gift.category,
    type,
    body.target_cents!==undefined?Math.max(0,int(body.target_cents)):gift.target_cents,
    body.quantity!==undefined?Math.max(1,int(body.quantity)||1):gift.quantity,
    body.icon_name!==undefined?clean(body.icon_name,80)||"gift":gift.icon_name,
    body.preferred_color!==undefined?clean(body.preferred_color,80)||null:gift.preferred_color,
    body.allow_pix!==undefined?(body.allow_pix?1:0):gift.allow_pix,
    type==="physical" ? 1 : (body.allow_physical!==undefined?(body.allow_physical?1:0):gift.allow_physical),
    body.is_active!==undefined?(body.is_active?1:0):gift.is_active,
    body.display_order!==undefined?Math.max(0,int(body.display_order)):gift.display_order,
    giftId,event.id
  ).run();
  return json({ok:true});
}

async function clientDeleteGift(env,event,giftId) {
  const gift = await ownedGift(env,event.id,giftId); if (!gift) return json({ok:false,error:"not_found"},404);
  if (gift.image_path) await safeDeleteR2(env,gift.image_path);
  await env.DB.prepare(`DELETE FROM gifts WHERE id=? AND event_id=?`).bind(giftId,event.id).run();
  return json({ok:true});
}

async function clientUploadGiftImage(request,env,event,giftId) {
  const gift = await ownedGift(env,event.id,giftId); if (!gift) return json({ok:false,error:"not_found"},404);
  const upload = await readImage(request,env);
  if (upload.response) return upload.response;
  const key = `events/${event.id}/gifts/${giftId}-${Date.now()}.${upload.ext}`;
  await env.MEDIA.put(key,upload.bytes,{httpMetadata:{contentType:upload.type}});
  if (gift.image_path) await safeDeleteR2(env,gift.image_path);
  await env.DB.prepare(`UPDATE gifts SET image_path=? WHERE id=?`).bind(key,giftId).run();
  return json({ok:true,image_url:mediaUrl(env,key)});
}

async function clientDeleteGiftImage(env,event,giftId) {
  const gift = await ownedGift(env,event.id,giftId); if (!gift) return json({ok:false,error:"not_found"},404);
  if (gift.image_path) await safeDeleteR2(env,gift.image_path);
  await env.DB.prepare(`UPDATE gifts SET image_path=NULL WHERE id=?`).bind(giftId).run();
  return json({ok:true});
}

async function clientSetContribution(env,event,id,status) {
  const row = await env.DB.prepare(`SELECT * FROM contributions WHERE id=? AND event_id=? LIMIT 1`).bind(id,event.id).first();
  if (!row) return json({ok:false,error:"not_found"},404);
  if (!["pending","confirmed"].includes(row.status) && row.status !== status) return bad("Esta contribuição já foi encerrada.");

  if (status === "confirmed") {
    await env.DB.prepare(`UPDATE contributions SET status='confirmed',confirmed_at=CURRENT_TIMESTAMP,rejected_at=NULL WHERE id=?`).bind(id).run();
  } else {
    await env.DB.prepare(`UPDATE contributions SET status='rejected',rejected_at=CURRENT_TIMESTAMP,confirmed_at=NULL WHERE id=?`).bind(id).run();
  }
  await log(env,event.id,"client",`contribution_${status}`,{gift_id:row.gift_id,contribution_id:id});
  return json({ok:true,status});
}

async function clientSetReservation(env,event,id,status) {
  const row = await env.DB.prepare(`SELECT * FROM reservations WHERE id=? AND event_id=? LIMIT 1`).bind(id,event.id).first();
  if (!row) return json({ok:false,error:"not_found"},404);

  if (status === "received") {
    if (!["reserved","purchased","received"].includes(row.status)) return bad("Esta reserva não pode ser marcada como recebida.");
    await env.DB.prepare(`UPDATE reservations SET status='received',received_at=CURRENT_TIMESTAMP WHERE id=?`).bind(id).run();
  } else {
    if (!["reserved","purchased"].includes(row.status)) return bad("Esta reserva não pode ser cancelada.");
    await env.DB.prepare(`UPDATE reservations SET status='cancelled',cancelled_at=CURRENT_TIMESTAMP WHERE id=?`).bind(id).run();
  }
  return json({ok:true,status});
}

async function serveSpa(request,env,slug) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = "/index.html";
  const res = await env.ASSETS.fetch(new Request(assetUrl.toString(),request));
  let html = await res.text();

  let title = "Libri Presentes";
  let desc = "Uma forma bonita, prática e leve de presentear.";
  let image = "";
  let canonical = env.APP_URL || new URL(request.url).origin;

  if (slug) {
    const event = await env.DB.prepare(`SELECT event_name,public_title,intro,share_description,preview_path,slug FROM events WHERE slug=? LIMIT 1`).bind(slug).first();
    if (event) {
      title = `${event.event_name} | Libri Presentes`;
      desc = event.share_description || event.intro || event.public_title || desc;
      image = event.preview_path ? mediaUrl(env,event.preview_path) : "";
      canonical = `${env.APP_URL}/e/${event.slug}`;
    }
  }

  const meta = [
    `<meta property="og:title" content="${htmlAttr(title)}">`,
    `<meta property="og:description" content="${htmlAttr(desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${htmlAttr(canonical)}">`,
    image ? `<meta property="og:image" content="${htmlAttr(image)}">` : "",
    `<meta name="twitter:card" content="${image?"summary_large_image":"summary"}">`,
    `<link rel="canonical" href="${htmlAttr(canonical)}">`
  ].filter(Boolean).join("\n");

  html = html
    .replace("<!--DYNAMIC_META-->",meta)
    .replace("<title>Libri Presentes</title>",`<title>${htmlAttr(title)}</title>`);

  return new Response(html,{
    status:200,
    headers:{
      "content-type":"text/html; charset=utf-8",
      "cache-control":"no-cache",
      "x-content-type-options":"nosniff",
      "referrer-policy":"strict-origin-when-cross-origin",
      "x-frame-options":"DENY"
    }
  });
}

async function handleMedia(request,env,url) {
  if (!["GET","HEAD"].includes(request.method)) return new Response("Method Not Allowed",{status:405});
  let key;
  try {
    key = url.pathname.slice("/media/".length).split("/").map(decodeURIComponent).join("/");
  } catch {
    return new Response("Not Found",{status:404});
  }
  if (!key.startsWith("events/")) return new Response("Not Found",{status:404});
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response("Not Found",{status:404});
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag",obj.httpEtag);
  headers.set("cache-control","public,max-age=31536000,immutable");
  headers.set("x-content-type-options","nosniff");
  return new Response(request.method==="HEAD"?null:obj.body,{headers});
}

async function activeEventBySlug(env,slug) {
  return env.DB.prepare(`SELECT * FROM events WHERE slug=? AND status='active' LIMIT 1`).bind(slug).first();
}
async function ownedGift(env,eventId,giftId) {
  return env.DB.prepare(`SELECT * FROM gifts WHERE id=? AND event_id=? LIMIT 1`).bind(giftId,eventId).first();
}
async function confirmedForGift(env,giftId) {
  const row = await env.DB.prepare(`SELECT COALESCE(SUM(amount_cents),0) n FROM contributions WHERE gift_id=? AND status='confirmed'`).bind(giftId).first();
  return Number(row?.n||0);
}
async function cleanupExpiredReservations(env) {
  await env.DB.prepare(`
    UPDATE reservations SET status='expired'
    WHERE status='reserved' AND datetime(expires_at) <= datetime('now')
  `).run();
}
async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}
async function readImage(request,env) {
  const type = (request.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(type)) return {response:bad("Formato de imagem não aceito.")};
  const bytes = await request.arrayBuffer();
  const max = Number(env.MAX_UPLOAD_BYTES||307200);
  if (!bytes.byteLength || bytes.byteLength > max) return {response:bad("Imagem maior que o limite permitido.")};
  const ext = type==="image/webp"?"webp":type==="image/png"?"png":"jpg";
  return {bytes,type,ext};
}
async function deleteR2Prefix(env,prefix) {
  let cursor;
  do {
    const listed = await env.MEDIA.list({prefix,cursor});
    if (listed.objects.length) await env.MEDIA.delete(listed.objects.map(o=>o.key));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}
async function safeDeleteR2(env,key) { try { await env.MEDIA.delete(key); } catch {} }
function mediaUrl(env,key) {
  return `${env.APP_URL}/media/${String(key).split("/").map(encodeURIComponent).join("/")}`;
}
async function log(env,eventId,actor,action,{gift_id=null,contribution_id=null,reservation_id=null,detail=null}={}) {
  try {
    await env.DB.prepare(`
      INSERT INTO activity_log(id,event_id,gift_id,contribution_id,reservation_id,actor_type,action,detail)
      VALUES(?,?,?,?,?,?,?,?)
    `).bind(crypto.randomUUID(),eventId,gift_id,contribution_id,reservation_id,actor,action,detail).run();
  } catch (e) { console.error("activity_log:",e); }
}
function randomToken() {
  const bytes = new Uint8Array(32); crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
}
async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const hash = await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function clean(v,max=500) {
  return String(v??"").trim().replace(/\u0000/g,"").slice(0,max);
}
function int(v) {
  const n = Number.parseInt(v,10); return Number.isFinite(n)?n:0;
}
function color(v,fallback) {
  const s = clean(v,20);
  return /^#[0-9a-fA-F]{6}$/.test(s)?s:fallback;
}
function slugify(v) {
  return clean(v,140).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90);
}
function bad(message) { return json({ok:false,error:"validation_error",message},400); }
function json(data,status=200) {
  return new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});
}
function htmlAttr(v) {
  return String(v??"").replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
