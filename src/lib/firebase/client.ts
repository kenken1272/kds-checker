import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDom7ahiKhOhP8V1t6pvfrWH5TqnJs4wGA",
  authDomain: "kds-checker.firebaseapp.com",
  projectId: "kds-checker",
  storageBucket: "kds-checker.firebasestorage.app",
  messagingSenderId: "170719981241",
  appId: "1:170719981241:web:3cfc1e18a8830dbe1af568",
  measurementId: "G-96HVMLRW7R",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

if (typeof window !== "undefined") {
  void isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export type { FirebaseApp } from "firebase/app";
