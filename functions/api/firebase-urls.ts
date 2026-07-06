interface Env {
  FIREBASE_SA_JSON: string;
  ADMIN_PIN?: string;
}

const K1 = "X9F3MR2026ADMINVAULTKEY123456789";
const K2 = "SKYROBOT2026XORKEY7890123456789A";
const K3 = "MRROB0T2026CRYPT3DKEY78901234567";
const RTDB = "https://bosso-bb5e7-default-rtdb.firebaseio.com";

let _cache: { token: string; exp: number } | null = null;

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getToken(saJson: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (_cache && _cache.exp > now + 60) return _cache.token;
  const sa = JSON.parse(saJson);
  const enc = new TextEncoder();
  const header  = b64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = b64url(enc.encode(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600, iat: now,
  })));
  const msg = `${header}.${payload}`;
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(msg));
  const jwt = `${msg}.${b64url(sig)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json() as { access_token: string };
  _cache = { token: data.access_token, exp: now + 3600 };
  return data.access_token;
}

async function tripleEncrypt(url: string): Promise<string> {
  const enc = new TextEncoder();
  const k2b = enc.encode(K2);
  const iv2 = crypto.getRandomValues(new Uint8Array(16));
  const k1 = await crypto.subtle.importKey("raw", enc.encode(K1.slice(0,32)), "AES-CBC", false, ["encrypt"]);
  const ct1 = new Uint8Array(await crypto.subtle.encrypt({ name:"AES-CBC", iv:iv2 }, k1, enc.encode(url)));
  const xored = ct1.map((b, i) => b ^ k2b[i % k2b.length]);
  const iv1 = crypto.getRandomValues(new Uint8Array(16));
  const k3 = await crypto.subtle.importKey("raw", enc.encode(K3.slice(0,32)), "AES-CBC", false, ["encrypt"]);
  const ct2 = new Uint8Array(await crypto.subtle.encrypt({ name:"AES-CBC", iv:iv1 }, k3, xored));
  const out = new Uint8Array(32 + ct2.length);
  out.set(iv1,0); out.set(iv2,16); out.set(ct2,32);
  return btoa(String.fromCharCode(...out));
}

function cors(r: Response): Response {
  r.headers.set("Access-Control-Allow-Origin", "*");
  r.headers.set("Access-Control-Allow-Methods", "GET,PUT,DELETE,OPTIONS");
  r.headers.set("Access-Control-Allow-Headers", "Content-Type,x-admin-pin");
  return r;
}

export const onRequest = async (ctx: { request: Request; env: Env }) => {
  const { request, env } = ctx;
  if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  const pin = request.headers.get("x-admin-pin") ?? "";
  const correctPin = env.ADMIN_PIN ?? "master1234";
  if (pin !== correctPin) return cors(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }));
  if (!env.FIREBASE_SA_JSON) return cors(new Response(JSON.stringify({ error: "FIREBASE_SA_JSON not set" }), { status: 500, headers: { "Content-Type": "application/json" } }));

  const token = await getToken(env.FIREBASE_SA_JSON);
  const hdrs = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const json = (d: unknown, s = 200) => cors(new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } }));

  if (request.method === "GET") {
    const r = await fetch(`${RTDB}/urls.json`, { headers: hdrs });
    return cors(new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } }));
  }

  if (request.method === "PUT") {
    const body = await request.json() as { url?: string };
    if (!body.url) return json({ error: "url required" }, 400);
    const encUrl = await tripleEncrypt(body.url);
    const entry = { active_url: { encUrl, url: body.url, savedAt: Date.now() } };
    await fetch(`${RTDB}/urls.json`, { method: "PUT", headers: hdrs, body: JSON.stringify(entry) });
    return json({ ok: true, url: body.url, encUrl });
  }

  if (request.method === "DELETE") {
    await fetch(`${RTDB}/urls.json`, { method: "PUT", headers: hdrs, body: "null" });
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};
