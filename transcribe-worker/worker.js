// Cloudflare Worker — sert deux usages pour Réunion IA, tous deux gratuits
// via Cloudflare Workers AI (aucune carte bancaire requise) :
//
// 1. Transcription audio (Whisper) — quand la requête envoie de l'audio brut
// 2. Génération de texte (rapports IA, mémoire, assistant) — quand la
//    requête envoie du JSON { messages: [...], system?, max_tokens? }
//
// L'app choisit automatiquement le bon format selon l'action demandée.

const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const AUDIO_MODEL = "@cf/openai/whisper";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "Méthode non autorisée, utilise POST." }, 405);
    }

    const contentType = request.headers.get("Content-Type") || "";

    try {
      if (contentType.includes("application/json")) {
        // ---------- Génération de texte ----------
        const body = await request.json();
        const messages = body.messages || [{ role: "user", content: body.prompt || "" }];
        const fullMessages = body.system
          ? [{ role: "system", content: body.system }, ...messages]
          : messages;

        const result = await env.AI.run(TEXT_MODEL, {
          messages: fullMessages,
          max_tokens: body.max_tokens || 1000
        });

        return jsonResponse({ text: result.response || "" }, 200);

      } else {
        // ---------- Transcription audio ----------
        const arrayBuffer = await request.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          return jsonResponse({ error: "Aucun contenu audio reçu." }, 400);
        }
        const audioBytes = [...new Uint8Array(arrayBuffer)];

        const result = await env.AI.run(AUDIO_MODEL, { audio: audioBytes });
        return jsonResponse({ text: result.text || "" }, 200);
      }

    } catch (err) {
      return jsonResponse({ error: "Erreur inattendue côté serveur.", details: String(err) }, 500);
    }
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}
