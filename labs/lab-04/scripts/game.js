/* Get HTML Elements as JS objects */
const button = document.getElementsById("guess-button");
const number = document.getElementById("guess-text");
const attemptsView = document.getElementById("attempts");
const cluesView = document.getElementById("clues");

/* Hi-Lo Game Data*/
const passcode = Math.floor(Math.random() * 1000);
let tries = 10;
/* Add Event Listener to button with callback function*/
button.addEventListener("click", guessNumber);

/* Callback function for event: Button click */
function guessNumber() {
    const guess = number.value;
    tries--;
    attemptsView.innerHTML = `Number of attempts left: ${tries}`;
    if(guess == passcode){
        document.body.innerHTML = `<h1>You win!</h1> <p>Got is in ${tries} attempts</p>`;
    }
    else if(tries < 0){
        document.body.innerHTML = `<h1>You lose!</h1> <p>The passcode was ${passcode}</p>`;    }
    else{
        giveClue(guess);
    }
}

/*Give Clue*/
function giveClue(guess){
    if(guess > passcode){
        cluesView.innerHTML += `<li>${guess} is too High</li>`;
    }
    else{
        cluesView.innerHTML += `<li>${guess} is too Low</li>`;
    }
}