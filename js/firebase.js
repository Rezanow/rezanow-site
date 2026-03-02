import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";
    import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

    const firebaseConfig = {
      apiKey: "AIzaSyA5HQn8iBuIqlyJro26AwzkPygMHGA47PA",
      authDomain: "russian-reserve.firebaseapp.com",
      projectId: "russian-reserve",
      storageBucket: "russian-reserve.firebasestorage.app",
      messagingSenderId: "365246014278",
      appId: "1:365246014278:web:237c08dfca62ca3bbefb47",
      measurementId: "G-GX92WC6ZLK"
    };

    try {
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
    } catch(e) {
      console.warn("Firebase initialization failed. Global stats disabled.");
    }
