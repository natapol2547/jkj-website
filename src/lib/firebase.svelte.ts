// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { browser } from "$app/environment";
import { userStore } from "./stores/auth.svelte.ts";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB8rlmocx63Wr-8i9zznYBvuESUPXwKUVE",
  authDomain: "jsj-website-sas.firebaseapp.com",
  projectId: "jsj-website-sas",
  storageBucket: "jsj-website-sas.firebasestorage.app",
  messagingSenderId: "708553650489",
  appId: "1:708553650489:web:3599e3bd5d190e532038e8",
  measurementId: "G-719RQVYV6M"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Analytics is browser-only (requires window)
export const analytics: Analytics | undefined = browser ? getAnalytics(app) : undefined;

export const user = userStore(auth);