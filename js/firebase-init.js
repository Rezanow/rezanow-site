const firebaseConfig = {
  apiKey: "AIzaSyA5HQn8iBuIqlyJro26AwzkPygMHGA47PA",
  authDomain: "russian-reserve.firebaseapp.com",
  projectId: "russian-reserve",
  storageBucket: "russian-reserve.firebasestorage.app",
  messagingSenderId: "365246014278",
  appId: "1:365246014278:web:237c08dfca62ca3bbefb47",
  measurementId: "G-GX92WC6ZLK"
};

export async function initFirebaseStats() {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js");
    const { getAnalytics } = await import("https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js");
    const { getFirestore, collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js");

    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    window.db = getFirestore(app);
    window.logGlobalStat = async function(statData) {
      if (!window.db) return;
      try {
        await addDoc(collection(window.db, "game_stats"), {
          ...statData,
          timestamp: serverTimestamp()
        });
      } catch (e) {
        console.error("Error logging global stat: ", e);
      }
    };

    return { app, analytics };
  } catch (e) {
    console.warn("Firebase initialization failed. Global stats disabled.");
    window.logGlobalStat = async function(statData) {};
    return null;
  }
}
