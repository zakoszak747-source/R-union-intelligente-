// services/firestoreService.js
// Toutes les lectures/écritures Firestore passent par ici. Rien ailleurs
// dans l'app n'importe Firestore directement — ça garde un seul endroit
// à modifier si la structure de la base change.

import { db } from "./firebase.js";
import {
  doc, getDoc, setDoc, updateDoc, collection, addDoc,
  query, where, orderBy, getDocs, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ---------- Abonnement ----------
// Structure du document : users/{uid}/subscription/current
//   { plan: "free" | "monthly" | "yearly",
//     amount: 0 | 2000 | 20000,
//     status: "active" | "expired" | "pending",
//     startedAt, expiresAt,
//     paymentProvider: "cinetpay" | "kkiapay",
//     lastTransactionId }

export const PLANS = {
  monthly: { id: "monthly", label: "Mensuel", amount: 2000, durationDays: 30 },
  yearly:  { id: "yearly",  label: "Annuel",  amount: 20000, durationDays: 365 }
};

export async function getSubscription(uid){
  const ref = doc(db, "users", uid, "subscription", "current");
  const snap = await getDoc(ref);
  if(!snap.exists()){
    return { plan: "free", amount: 0, status: "active", expiresAt: null };
  }
  return snap.data();
}

export async function isSubscriptionActive(uid){
  const sub = await getSubscription(uid);
  if(sub.plan === "free") return true; // le plan gratuit est toujours "actif"
  if(sub.status !== "active") return false;
  if(sub.expiresAt && sub.expiresAt.toDate() < new Date()) return false;
  return true;
}

// Crée une demande d'abonnement "en attente" avant redirection vers le
// paiement. Le statut passe à "active" uniquement via confirmPayment(),
// appelée par le backend (jamais directement par le client) après
// vérification réelle du paiement auprès de CinetPay/Kkiapay.
export async function createPendingSubscription(uid, planId, transactionId){
  const plan = PLANS[planId];
  if(!plan) throw new Error("Plan inconnu : " + planId);
  const ref = doc(db, "users", uid, "subscription", "current");
  await setDoc(ref, {
    plan: planId,
    amount: plan.amount,
    status: "pending",
    lastTransactionId: transactionId,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

// ---------- Réunions (si un jour on migre du localStorage vers le cloud) ----------
export async function saveMeeting(uid, meeting){
  const ref = doc(db, "users", uid, "meetings", String(meeting.id));
  await setDoc(ref, meeting, { merge: true });
}

export async function getMeetings(uid){
  const q = query(collection(db, "users", uid, "meetings"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function deleteMeetingDoc(uid, meetingId){
  await deleteDoc(doc(db, "users", uid, "meetings", String(meetingId)));
}

// ---------- Organisation ----------
export async function saveOrganization(uid, organization){
  const ref = doc(db, "users", uid, "organization", "current");
  await setDoc(ref, organization, { merge: true });
}

export async function getOrganization(uid){
  const ref = doc(db, "users", uid, "organization", "current");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

