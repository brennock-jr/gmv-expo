import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBheQQp7XtA8zDWgdAnb7gmZrdmsJiB3F8",
  authDomain: "gmv-app-96403.firebaseapp.com",
  projectId: "gmv-app-96403",
  storageBucket: "gmv-app-96403.firebasestorage.app",
  messagingSenderId: "868905514129",
  appId: "1:868905514129:web:f5e3e1c7ca828b2f82bb30",
  measurementId: "G-3XLJRLCK0V"
};

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// No ambiente Web, a persistência padrão do navegador é gerenciada automaticamente pelo Firebase Auth
const auth = getAuth(app);

const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export { app, auth, db };
