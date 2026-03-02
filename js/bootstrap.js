import { initFirebaseStats } from "./firebase-init.js";
import { initGame } from "./game.js";

await initFirebaseStats();
initGame();
