// scripts/view.js
import Question from './components/Question.js';     // Import Question function
import HUD from './components/Hud.js';               // Import HUD function
import Skip from './components/Skip.js';             // Import Skip function
import Leaderboard from './components/Leaderboard.js';
import LeaderMenu from './components/LeaderMenu.js';

// Generic render helper
const renderDOM = (html) =>
  document.getElementById('view').innerHTML = html; // Set HTML in view

// Helper: determine if current score is top 5
const isTop5 = (score, top5) => top5.some(item => item.score < score);

// Play Scene
export const PlayScene = (props) => { // Function for HTML view
  const { trivia, timer, score } = props; // Destructure properties
  renderDOM( // Render the Scene's HTML to DOM
    `${HUD(timer, score)}
    ${Question(trivia)}
    ${Skip()}`
  );
};

// Game Over Scene
export const GameoverScene = (props) => { // Function for HTML view
  const { timer, score, topScores } = props; // Destructure properties
  renderDOM( // Render the Gameover HTML to DOM
    `${HUD(timer, score)}
    ${isTop5(score, topScores) ? LeaderMenu() : ''}
    <h1>Game Over!</h1>
    <button onclick='start()'>Start Menu</button>`
  );
};

// Start Menu Scene
export const StartMenu = (props) => {
  const { timer, score, topScores } = props;
  renderDOM(
    `${HUD(timer, score)}
    ${Leaderboard(topScores)}
    <hr>
    <button onclick='createGame()'>Play</button>`
  );
};
