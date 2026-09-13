// Fonction Netlify — sert deux usages pour Réunion IA, gratuits via l'API
// REST de Cloudflare Workers AI :
//
// 1. Transcription audio (Whisper) — quand la requête envoie de l'audio brut
// 2. Génération de texte (rapports IA, mémoire, assistant) — quand la
//    requête envoie du JSON { messages: [...], system?, max_tokens? }
//
// Variables d'environnement à configurer dans Netlify
// (Site settings > Environment variables) :
//   CF_ACCOUNT_ID  — l'identifiant de compte Cloudflare
//   CF_API_TOKEN   — un token API Cloudflare avec le droit "Workers AI"

const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const AUDIO_MODEL = "@cf/openai/whisper";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Méthode non autorisée." }) };
  }

  const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
  const CF_API_TOKEN = process.env.CF_API_TOKEN;
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Configuration serveur manquante (CF_ACCOUNT_ID / CF_API_TOKEN)." })
    };
  }

  const contentTypeHeader = event.headers["content-type"] || event.headers["Content-Type"] || "";

  try {
    if (!event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Aucun contenu reçu." }) };
    }

    let cfUrl, cfBody;

    if (contentTypeHeader.includes("application/json")) {
      // ---------- Génération de texte ----------
      const parsed = JSON.parse(event.body);
      const messages = parsed.messages || [{ role: "user", content: parsed.prompt || "" }];
      const fullMessages = parsed.system
        ? [{ role: "system", content: parsed.system }, ...messages]
        : messages;

      cfUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${TEXT_MODEL}`;
      cfBody = JSON.stringify({ messages: fullMessages, max_tokens: parsed.max_tokens || 1000 });

    } else {
      // ---------- Transcription audio ----------
      const audioBuffer = event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : Buffer.from(event.body, "binary");
      const audioBytes = Array.from(audioBuffer);

      cfUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${AUDIO_MODEL}`;
      cfBody = JSON.stringify({ audio: audioBytes });
    }

    const cfResponse = await fetch(cfUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: cfBody
    });

    const data = await cfResponse.json();
    if (!cfResponse.ok || !data.success) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Le service IA a renvoyé une erreur.", details: data.errors || data })
      };
    }

    const text = (data.result && (data.result.response || data.result.text)) || "";
    return { statusCode: 200, headers, body: JSON.stringify({ text }) };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erreur inattendue côté serveur.", details: String(err) })
    };
  }
};
