// Fonction Netlify — transcription audio via Whisper (Cloudflare Workers AI,
// appelé ici via son API REST, gratuit dans la limite du quota journalier).
//
// Variables d'environnement à configurer dans Netlify
// (Site settings > Environment variables) :
//   CF_ACCOUNT_ID  — l'identifiant de compte Cloudflare
//   CF_API_TOKEN   — un token API Cloudflare avec le droit "Workers AI"
//
// L'app envoie l'audio en corps brut de la requête (pas de multipart).

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

  try {
    if (!event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Aucun contenu audio reçu." }) };
    }

    const audioBuffer = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body, "binary");
    const audioBytes = Array.from(audioBuffer);

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/openai/whisper`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ audio: audioBytes })
      }
    );

    const data = await cfResponse.json();
    if (!cfResponse.ok || !data.success) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Le service Whisper a renvoyé une erreur.", details: data.errors || data })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: (data.result && data.result.text) || "" })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erreur inattendue côté serveur.", details: String(err) })
    };
  }
};
