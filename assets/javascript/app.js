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

var base = firebase.database();
var rootRef = base.ref();
var connRef = base.ref("/connections");
var queueRef = base.ref("/queue");
var playersRef = base.ref("/players");
var chatRef = base.ref("/chat");

var amConnected = base.ref(".info/connected");

amConnected.on("value", function(snap) {
  if (snap.val()) {
    var con = connRef.push(true);
    con.onDisconnect().remove();
  }
  //    The connections object changes each time the page is reloaded.  Will have to store a UUID in cookie or localStorage.
});

rootRef.on("child_added", function(snap){
    var queueVal = snap.child("queue").val();
    console.log(snap);
    if (snap.child("players").numChildren() < 2) {
        playersRef.push(queueVal[0]);
    }
});
/* App flow:
We'll need a few database nodes, say:
    /players (capped at 2 members), 
    /waiting, to hold the people connected, say { user: "", timestamp: "", wins: "", losses: "", }
    /chat, to hold { user: "", message: "" } records

    as users load the page, get a name and add them to the queue.
    If the queue fills by order of connection, we may not need a timestamp.
    That will simplify things: less math before we get to it.
    while /players length is less than 2, push /waiting[0] to /players and remove /waiting[0]
    When a user submits a message, store their name and message in /messages, then display it in the chat box
    Show waiting users in the queue div.

    Store stuff and display stuff are two diffent methods/functions.

    Gameplay:
    Wait for one player to choose an option, give the other player 5 (?) seconds to choose theirs.
    Store both choices, compare them, boot the loser to the end of /waiting, fill /players again.
    Modals-- name prompt, R/P/S choice.
    On load, prompt for name.
*/

var game = {
    playerName: "",
    player: "",
    playerObj: {"name": "",
        "wins": 0,
        "losses": 0,
    },

    GetName() {
        this.playerName = prompt("Enter your name:");
        console.log(this.playerName);
        this.playerObj.name = this.playerName;
        this.player = queueRef.push(this.playerObj);
        console.log(this.player.key);   // store the key to access the obj later!
        this.player.onDisconnect().remove();
    }
}
