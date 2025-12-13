// scripts/app.js
import * as http from './http.js';   // Import http functions
import * as view from './view.js';   // Import view functions

// ---------- Constants ----------
const GET_TRIVIA =
  `https://opentdb.com/api.php?amount=1&difficulty=easy`;

// TODO: replace this with YOUR bin id from JsonBin
const BIN_ID = 'REPLACE_WITH_YOUR_BIN_ID';

const GET_LEADERBOARD = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`;
const PUT_LEADERBOARD = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// ---------- Game State ----------
const state = {
  score: 0,
  timer: 20,
  intervalId: null,
  trivia: null,
  topScores: []
};

// ---------- Core Game Logic ----------

// Countdown tick function
const countdown = () => { // COUNTDOWN function
  if (state.timer > 0) {          // When time remains
    state.timer--;                // Decrement timer
    view.PlayScene(state);        // View render play scene
  } else {                        // When timer is 0
    clearInterval(state.intervalId);  // Stop countdown interval
    view.GameoverScene(state);       // Show gameover view
  }
};

// Create a new game (reset timer and start interval)
const createGameInternal = () => { // CREATE function
  state.timer = 20;                         // Set timer
  state.intervalId = setInterval(countdown, 1000); // Set interval id
  playGameInternal();                       // Call PLAY function
};

// Fetch new trivia and render play scene
const playGameInternal = async () => { // PLAY function
  const json = await http.sendGETRequest(GET_TRIVIA); // GET Request for trivia data
  [state.trivia] = json.results;                       // Destructure trivia data from array
  view.PlayScene(state);                               // Pass trivia data to view
};

// Check answer event handler
const checkAnswerInternal = (attempt) => { // CHECK_ANSWER function
  const answer = state.trivia.correct_answer; // Dereference answer
  if (attempt == answer) {                    // When Attempt is correct
    state.score += state.timer;              // Add to Score based on time
    state.timer += 10;                       // Add 10 bonus seconds
    playGameInternal();                      // Play Next Round of Trivia
  } else {                                   // When Attempt is incorrect
    clearInterval(state.intervalId);         // Stop countdown interval
    view.GameoverScene(state);              // Show gameover view
  }
};

// ---------- Leaderboard Helpers ----------

// Compute new top 5 array including current score
const getTop5 = async (newScore) => {
  const leaderboardJSON = await http.sendGETRequest(GET_LEADERBOARD);
  const top5 = leaderboardJSON.record;
  top5.push(newScore);
  top5.sort((a, b) => b.score - a.score);
  top5.pop(); // remove lowest
  return top5;
};

// Called when user submits their name for a high score
const updateLeaderboardInternal = async () => {
  const name = document.getElementById('name').value;
  const currentScore = { name: name, score: state.score };
  const top5 = await getTop5(currentScore);
  await http.sendPUTRequest(PUT_LEADERBOARD, top5);
  startInternal(); // restart game / reload leaderboard
};

// ---------- Start / Bootstrap ----------

const startInternal = async () => { // START function
  // Fetch leaderboard
  const leaderboardJSON = await http.sendGETRequest(GET_LEADERBOARD);
  state.topScores = leaderboardJSON.record;   // Data in record prop

  // Reset game stats
  state.score = 0;
  state.timer = 20;

  // Render start menu
  view.StartMenu(state);
};

// ---------- Expose Globals for onclick handlers ----------

window.start = startInternal;
window.createGame = createGameInternal;
window.playGame = playGameInternal;
window.checkAnswer = checkAnswerInternal;
window.updateLeaderboard = updateLeaderboardInternal;

// ---------- Launch App ----------
window.addEventListener('load', startInternal);
