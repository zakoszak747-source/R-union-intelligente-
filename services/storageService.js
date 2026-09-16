// services/storageService.js
// Gère l'upload et la récupération des fichiers volumineux (audio, logo,
// bannière) sur Firebase Storage. Le stockage local (IndexedDB) déjà en
// place dans l'app reste le premier niveau (rapide, fonctionne hors-ligne) ;
// Storage sert de sauvegarde cloud, utile si l'utilisateur change
// d'appareil ou réinstalle l'app.

import { storage } from "./firebase.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

export async function uploadAudio(uid, meetingId, blob){
  const fileRef = ref(storage, `users/${uid}/audio/${meetingId}.webm`);
  await uploadBytes(fileRef, blob);
  return await getDownloadURL(fileRef);
}

export async function deleteAudio(uid, meetingId){
  const fileRef = ref(storage, `users/${uid}/audio/${meetingId}.webm`);
  try{ await deleteObject(fileRef); }catch(e){ /* déjà absent, rien à faire */ }
}

export async function uploadOrgImage(uid, kind, dataUrlOrBlob){
  // kind: "logo" ou "banner"
  const fileRef = ref(storage, `users/${uid}/organization/${kind}.png`);
  const blob = typeof dataUrlOrBlob === "string"
    ? await (await fetch(dataUrlOrBlob)).blob()
    : dataUrlOrBlob;
  await uploadBytes(fileRef, blob);
  return await getDownloadURL(fileRef);
}

