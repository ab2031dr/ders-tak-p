// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, enableIndexedDbPersistence, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* ——— kendi config’in (bucket appspot.com) ——— */
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCSfypLfBdl1Nx4-Bf1NATidgdJ5vFKPOA",
  authDomain: "ders-uygulamasi-e6faf.firebaseapp.com",
  projectId: "ders-uygulamasi-e6faf",
  storageBucket: "ders-uygulamasi-e6faf.firebasestorage.app",
  messagingSenderId: "314675748985",
  appId: "1:314675748985:web:17cf2013986cd7573bf4a8",
  measurementId: "G-CDVM65CF70"
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
enableIndexedDbPersistence(db).catch(()=>{});

/* doc yardımcıları */
const settingsRef = (uid)=> doc(db,"users",uid,"settings","settings");
const statsRef    = (uid)=> doc(db,"users",uid,"stats","stats");

/* ilk oluşturma */
async function ensureDocs(uid, displayName){
  const s  = await getDoc(settingsRef(uid));
  if(!s.exists()) await setDoc(settingsRef(uid), { displayName, createdAt: serverTimestamp() }, { merge:true });
  const st = await getDoc(statsRef(uid));
  if(!st.exists()) await setDoc(statsRef(uid), { studyData:{}, questionData:{} }, { merge:true });
}

/* auth API */
export async function fbRegister(email, pass){
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(cred.user, { displayName: email });
  await ensureDocs(cred.user.uid, email);
  return cred.user;
}
export async function fbLogin(email, pass){
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  await ensureDocs(cred.user.uid, cred.user.displayName||email);
  return cred.user;
}
export function fbLogout(){ return signOut(auth); }
export function onUserChanged(cb){ return onAuthStateChanged(auth, cb); }

/* veri API */
export async function cloudLoadAll(uid){
  const s = (await getDoc(settingsRef(uid))).data() || {};
  const t = (await getDoc(statsRef(uid))).data() || { studyData:{}, questionData:{} };
  return { settings:s, stats:t };
}
export async function cloudSaveSettings(uid, data){ await setDoc(settingsRef(uid), data, { merge:true }); }
export async function cloudSetStudyData(uid, map){ await setDoc(statsRef(uid), { studyData: map }, { merge:true }); }
export async function cloudSetQuestionData(uid, map){ await setDoc(statsRef(uid), { questionData: map }, { merge:true }); }