import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigin = "https://caposistema.pages.dev";
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, private",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
};
function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return respond({ error: "Método não permitido." }, 405);
  const origin = request.headers.get("origin");
  if (origin !== allowedOrigin) return respond({ error: "Origem inválida." }, 403);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 4096) return respond({ error: "Requisição muito grande." }, 413);
  let payload: { token?: unknown; pin?: unknown };
  try { payload = await request.json(); } catch { return respond({ error: "Dados inválidos." }, 400); }
  const token = typeof payload.token === "string" ? payload.token : "";
  const pin = typeof payload.pin === "string" ? payload.pin : "";
  if (!/^[a-f0-9]{64}$/.test(token) || !/^[0-9]{8}$/.test(pin)) {
    return respond({ error: "Link ou código inválido." }, 403);
  }
  if (!SUPABASE_URL || !SERVICE_KEY) return respond({ error: "Serviço indisponível." }, 503);
  try {
    const db = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await db.rpc("open_transport_share_for_edge", {
      p_token: token, p_pin: pin,
    });
    if (error || !data || !Array.isArray(data.documents)) {
      return respond({ error: "Link expirado, revogado ou código inválido." }, 403);
    }
    const documents: { name: string; url: string; downloadUrl: string }[] = [];
    for (const entry of data.documents) {
      const name = typeof entry.name === "string" ? entry.name : "Documento.pdf";
      const path = typeof entry.path === "string" ? entry.path : "";
      if (!/^transport\/[0-9a-f-]{36}\//.test(path) || !path.endsWith(".pdf")) {
        return respond({ error: "Documento indisponível." }, 503);
      }
      const result = await db.storage.from("capo-documents").createSignedUrl(path, 120);
      if (result.error || !result.data?.signedUrl) {
        return respond({ error: "Não foi possível liberar o documento." }, 503);
      }
      const downloadResult = await db.storage.from("capo-documents").createSignedUrl(path, 120, {download: name});
      if (downloadResult.error || !downloadResult.data?.signedUrl) {
        return respond({ error: "Não foi possível liberar o download." }, 503);
      }
      documents.push({ name, url: result.data.signedUrl, downloadUrl: downloadResult.data.signedUrl });
    }
    return respond({ documents, access_expires_at: data.expires_at, url_expires_seconds: 120 });
  } catch {
    return respond({ error: "Não foi possível acessar os documentos." }, 503);
  }
});
