// Fichier qui initialise Firebase

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAA4Mg_ipfQmZH7BH6aNW7vin7q_GduYjc",
  authDomain: "hackathonprojet.firebaseapp.com",
  projectId: "hackathonprojet",
  storageBucket: "hackathonprojet.firebasestorage.app",
  messagingSenderId: "124381869657",
  appId: "1:124381869657:web:430b6a66888aedc6faa348",
  measurementId: "G-XQ5CTN4SFE"
};


 const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
