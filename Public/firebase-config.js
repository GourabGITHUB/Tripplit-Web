 // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
  import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app-check.js";


  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
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
  const appCheck = initializeAppCheck(app, {
  // reCAPTCHA v3 SITE KEY 
  provider: new ReCaptchaV3Provider('6Lfnf5krAAAAAPW-AmICgIgfdTdlArS7z1hxZkGi'),
  isTokenAutoRefreshEnabled: true // Set to true for automatic token refresh
});
  getToken(appCheck, /* forceRefresh= */ false).then(() => {
  const db = getFirestore(app);
  // Export db or start Firestore usage only here

  // e.g., window.db = db;
}).catch((error) => {
  console.error("App Check token error:", error);
});

  export { db, appCheck };
