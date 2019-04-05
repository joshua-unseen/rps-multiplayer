// Initialize Firebase
var config = {
  apiKey: "AIzaSyCQzT-mGnK0zzffuepw_fWKwhpvr0IAbt8",
  authDomain: "unseen1.firebaseapp.com",
  databaseURL: "https://unseen1.firebaseio.com",
  projectId: "unseen1",
  storageBucket: "unseen1.appspot.com",
  messagingSenderId: "712966785851"
};
firebase.initializeApp(config);

/* App flow:
    We'll need a few database nodes, say:
    /players (capped at 2 members), 
    /waiting, to hold the people connected, say { user: "", timestamp: "" }
    /chat, to hold { user: "", message: "" } records

    as users load the page, get a name and add them to the queue.
    If the queue fills by order of connection, we may not need a timestamp.
    That will simplify things.
    while /players length is less than 2, push /waiting[0] to /players and remove /waiting[0]
    When a user submits a message, store their name and message in /messages, then display it in the chat box
    Show waiting users in the queue div.

    Store stuff and display stuff are two diffent methods/functions.

    Gameplay:
    Wait for one player to choose an option, give the other player 5 (?) seconds to choose theirs.
    Store both choices, compare them, boot the loser, fill /players again.
*/


var game = {

}