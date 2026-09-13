// Cloudflare Worker — transcription audio via Whisper, hébergé gratuitement
// par Cloudflare Workers AI (aucune clé OpenAI ni carte bancaire requise).
//
// Le modele Whisper tourne directement sur l'infrastructure de Cloudflare.
// Le plan gratuit inclut 10 000 "neurons" par jour.
//
// L'app envoie l'audio en corps brut de la requête (pas de multipart).

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "Méthode non autorisée, utilise POST." }, 405);
    }

    try {
      const arrayBuffer = await request.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return jsonResponse({ error: "Aucun contenu audio reçu." }, 400);
      }
      const audioBytes = [...new Uint8Array(arrayBuffer)];

      const result = await env.AI.run("@cf/openai/whisper", { audio: audioBytes });
      return jsonResponse({ text: result.text || "" }, 200);

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
