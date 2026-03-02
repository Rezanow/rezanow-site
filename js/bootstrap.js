// Canonical runtime entrypoint lives in js/game.js.
import { initFirebaseStats } from "./firebase-init.js";
import { initGame } from "./game.js";

initGame();
void initFirebaseStats();
