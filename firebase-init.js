// firebase-init.js  (compat sürüm; import yok)
(function () {
  const auth = firebase.auth();
  const db   = firebase.firestore();

  async function ensureUserDocs(uid, email) {
    const uref = db.collection("users").doc(uid);
    await uref.set({ email: email || null }, { merge: true });

    const statsRef = uref.collection("stats").doc("stats");
    const snap = await statsRef.get();
    if (!snap.exists) {
      await statsRef.set({ studyData: {}, questionData: {} });
    }
  }

  async function register(email, password) {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await ensureUserDocs(cred.user.uid, email);
    return cred.user;
  }
  async function login(email, password) {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    await ensureUserDocs(cred.user.uid, cred.user.email);
    return cred.user;
  }
  async function logout() { await auth.signOut(); }

  async function loadAll(uid) {
    const uref = db.collection("users").doc(uid);
    const settings = (await uref.collection("settings").doc("settings").get()).data() || {};
    const stats    = (await uref.collection("stats").doc("stats").get()).data() || { studyData:{}, questionData:{} };
    return { settings, stats };
  }
  async function saveSettings(uid, data) {
    await db.collection("users").doc(uid).collection("settings").doc("settings").set(data, { merge:true });
  }
  async function setStudyData(uid, map) {
    await db.collection("users").doc(uid).collection("stats").doc("stats").set({ studyData: map }, { merge:true });
  }
  async function setQuestionData(uid, map) {
    await db.collection("users").doc(uid).collection("stats").doc("stats").set({ questionData: map }, { merge:true });
  }

  auth.onAuthStateChanged((user)=>{ if(window.onCloudAuth) window.onCloudAuth(user); });

  window.cloud = {
    auth: { register, login, logout },
    db:   { loadAll, saveSettings, setStudyData, setQuestionData }
  };
})();
