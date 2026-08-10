import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

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
let auth;
let db;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };

