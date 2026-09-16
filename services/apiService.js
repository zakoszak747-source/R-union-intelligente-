// services/apiService.js
// Point d'entrée unique pour tous les appels réseau vers nos propres
// backends (le Worker Cloudflare déjà utilisé pour l'IA, étendu ici pour
// gérer aussi l'initiation des paiements CinetPay/Kkiapay). Rien dans le
// reste de l'app ne fait de fetch() direct vers ces services — tout passe
// par ici, pour garder un seul endroit à modifier si une URL change.

// Configure ces deux URLs une fois tes backends déployés.
const AI_ENDPOINT = "https://ton-worker.workers.dev";
const PAYMENT_ENDPOINT = "https://ton-worker.workers.dev/payment";

// ---------- IA (texte + transcription) ----------
// Reprend exactement la logique déjà utilisée dans l'app (voir
// callAiService côté index.html) — regroupée ici si l'app est un jour
// découpée en modules.
export async function generateText({ system, messages, max_tokens }){
  const response = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, max_tokens: max_tokens || 1000 })
  });
  const data = await response.json();
  if(!response.ok || data.error) throw new Error(data.error || "Le service IA a renvoyé une erreur.");
  return data.text || "";
}

export async function transcribeAudio(blob){
  const response = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": blob.type || "application/octet-stream" },
    body: blob
  });
  const data = await response.json();
  if(!response.ok || data.error) throw new Error(data.error || "La transcription a échoué.");
  return data.text || "";
}

// ---------- Paiement (abonnement) ----------
// Initie un paiement CinetPay/Kkiapay. Le backend crée la transaction
// auprès du prestataire et renvoie une URL de paiement (widget Mobile
// Money) vers laquelle rediriger l'utilisateur. La confirmation réelle du
// paiement se fait plus tard côté backend, via le webhook du prestataire —
// jamais en se fiant à une réponse côté client.
export async function initiateSubscriptionPayment({ uid, planId, phone }){
  const response = await fetch(PAYMENT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "initiate", uid, planId, phone })
  });
  const data = await response.json();
  if(!response.ok || data.error) throw new Error(data.error || "Impossible de démarrer le paiement.");
  return data; // { paymentUrl, transactionId }
}

// Permet à l'app de vérifier ponctuellement si un paiement en attente a
// été confirmé (utile pendant que l'utilisateur revient de l'écran de
// paiement Mobile Money).
export async function checkPaymentStatus(transactionId){
  const response = await fetch(PAYMENT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "status", transactionId })
  });
  const data = await response.json();
  if(!response.ok || data.error) throw new Error(data.error || "Impossible de vérifier le paiement.");
  return data; // { status: "pending" | "confirmed" | "failed" }
}

