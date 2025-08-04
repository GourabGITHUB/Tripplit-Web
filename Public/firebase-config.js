
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  onTokenChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app-check.js";

// 🔧 DEVELOPMENT ONLY — remove or set via env in production

// ✅ Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCAEs599MLeYPXC5pTUX1vLur8Y913Zdqc",
    authDomain: "tripplit-200.firebaseapp.com",
    projectId: "tripplit-200",
    storageBucket: "tripplit-200.firebasestorage.app",
    messagingSenderId: "953294110599",
    appId: "1:953294110599:web:16620c685ab79b88079d22"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6Lfnf5krAAAAAPW-AmICgIgfdTdlArS7z1hxZkGi'), // Replace with actual site key
  isTokenAutoRefreshEnabled: true
});

// Wait for App Check token before using Firestore

// Delay Firestore until App Check is ready
const dbPromise = getFirestore(app);

// Export for main.js to use
export { appCheck, dbPromise };