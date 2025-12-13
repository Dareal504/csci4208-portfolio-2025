// scripts/components/Leaderboard.js

// Helper to build <li> elements
const ListItems = (topScores) => { // Function for HTML component
    let li = ``; // Empty string for HTML of list items
    const scores = topScores.sort((a, b) => b.score - a.score); // Sort by scores
    for (let row of scores) { // For each row in scores
      li += `<li>${row.name}: ${row.score}</li>`; // Concat row to HTML string
    }
    return li; // Return HTML-formatted text
  };
  
  const Leaderboard = (topScores) => ( // Function for HTML component
    `<h2>Top Scores:</h2>
    <section>
      <ol>
        ${ListItems(topScores)}
      </ol>
    </section>`
  );
  
  export default Leaderboard; // Export Leaderboard function
  