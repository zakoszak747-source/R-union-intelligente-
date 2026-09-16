
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBPZqx05Uo9TF37_RwbjziTraWueB2I6JY",
  authDomain: "r-union-intelligente.firebaseapp.com",
  projectId: "r-union-intelligente",
  storageBucket: "r-union-intelligente.firebasestorage.app",
  messagingSenderId: "618936260823",
  appId: "1:618936260823:web:349afb604c88d788357892",
  measurementId: "G-HM1L103LZ4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
