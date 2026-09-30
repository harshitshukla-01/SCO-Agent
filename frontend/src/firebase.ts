import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "fake-api-key-for-emulator",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "localhost",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "soc-agent-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "soc-agent-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Connect to Firebase Auth Emulator if configured or in development
const useEmulator = import.meta.env.VITE_USE_EMULATOR !== "false";
const emulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || "http://127.0.0.1:9099";

if (useEmulator && typeof window !== "undefined") {
  try {
    // Avoid double connect in HMR
    if (!(auth as any)._emulatorConfig) {
      connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
      console.log(`[Firebase] Connected Auth to Emulator at ${emulatorUrl}`);
    }
  } catch (err) {
    console.warn("[Firebase] Auth emulator connection notice:", err);
  }
}

export { app, auth };
