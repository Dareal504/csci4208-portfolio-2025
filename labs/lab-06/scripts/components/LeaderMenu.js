// scripts/components/LeaderMenu.js

const LeaderMenu = () => ( // Function for HTML component
    `<div>
      <h2>High Score!</h2>
      <section>
        <input id='name' type='text' placeholder='Your Name'>
        <input onclick='updateLeaderboard()' type='button' value='Submit'>
      </section>
      <hr>
    </div>`
  );
  
  export default LeaderMenu; // Export LeaderMenu function
  