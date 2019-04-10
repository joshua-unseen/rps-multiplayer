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

// var amConnected = base.ref(".info/connected");

// not sure if we'll need a connections list, but I'll leave this here for now.
// amConnected.on("value", function (snap) {
//     if (snap.val()) {
//         var con = connRef.push(true);
//         con.onDisconnect().remove();
//     }
//     //    The connections object changes each time the page is reloaded.  Will have to store a UUID in cookie or localStorage.
// });

rootRef.on("value", function (snap) {
    //  This function gets the whole bloody DB 'cuz it's got to check size of 
    //  the playersRef db before it moves a record from queue to players.
    //  can possibly do the entire bloody logic in here, since this one would get called every time something changes...
    game.Main(snap);
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
    //onDeck: "",   Don't actually need this, yay.
    playerName: "", // maybe don't need to store this...
    playerRef: "",  // reference to the player's node.  Not sure it'll update when we start moving things around, so:
    playerID: "",   // store the key/uuid here
    playerObj: {
        "name": "",
        "wins": 0,
        "losses": 0,
    },
    wins: 0,
    losses: 0,
    throw: "",
    opponent: "",
    result: "",

    fightModal: $("#fight-modal").modal({ backdrop: "static", keyboard: false, show: false }),

    GetName() {
        if (this.playerName.length === 0) {
            this.playerName = prompt("Enter your name:");
        }
        this.fightModal.modal("hide");
        $("#fight-title").text("Fight!");
        // Gonna use this as a reset, too. Maybe change this to a modal if I've got time.
        this.result = "";
        this.opponent = "";
        this.throw = "";
        this.playerObj.name = this.playerName;
        this.playerObj.wins = this.wins;
        this.playerObj.losses = this.losses;
        this.playerRef = queueRef.push(this.playerObj);
        this.playerRef.update({ uuid: this.playerRef.key });  // think I've figured out how to make this unnecessary, but I'll keep it for now.
        this.playerID = this.playerRef.key;   // store the key to access the obj later!
        console.log(this.playerID);

        this.playerRef.onDisconnect().remove();
    },

    Main(dbSnap) {
        // Okay, this one's doing my head in.  This function gets called 
        // every time a change is made to the database, so it can contain
        // NO loops that alter the DB, since every alteration will kick off
        // its own version of the loop...

        var currentQueue = dbSnap.child("queue");
        // Show the queue:
        $("#queue-box").empty();
        currentQueue.forEach(function (childSnap) {
            var p = $("<p>").text(childSnap.val().name);
            $("#queue-box").append(p);
        });

        var currentChat = dbSnap.child("chat");
        // show chat messages:
        $("#chat-box").empty();
        currentChat.forEach(function (childSnap) {
            // console.log(childSnap.val().name);
            var name = $("<b>").text(childSnap.val().name + "::  ");
            var message = childSnap.val().message;
            var p = $("<p>").append(name);
            p.append(message);
            $("#chat-box").prepend(p);
        });
        // console.log(dbSnap.val());

        var currentPlayers = dbSnap.child("players");
        //  Move players from /queue to /players
        if (currentPlayers.numChildren() < 2 && currentQueue.hasChildren()) {
            // Let's try:
            currentQueue.forEach(function (childSnap) {
                //  I know I said no loops up there, but "return true;" ends the forEach() at one iteration, so it's not really a loop, is it?
                playersRef.update({ [childSnap.key]: childSnap.val() });
                console.log(game.playerRef);
                queueRef.child(childSnap.key).remove();
                game.playerRef.path.pieces_[0] = "players";
                game.playerRef.onDisconnect().remove();
                console.log(game.playerRef);
                return true;
            });
        }
        //  Prompt the players for their choice of weapons, but wait until there are 2.
        else if (currentPlayers.numChildren() === 2) {
            currentPlayers.forEach(function (childSnap) {
                // console.log(childSnap.val());
                if (childSnap.key === game.playerID && childSnap.child("throw").exists() === false) {
                    game.ThrowHand();
                }
                else if (childSnap.key !== game.playerID) {
                    game.opponent = childSnap.key;  // store the opponent so we can access their throw value
                }
                if (currentPlayers.child(game.playerID + "/throw").exists()
                    && currentPlayers.child(game.opponent + "/throw").exists()) {
                    var result = game.throw + currentPlayers.child(game.opponent + "/throw").val();
                    console.log(result);
                    switch (result) {
                        case "rp":
                        case "ps":
                        case "sr":
                            // lose!  Go to the back of the line.
                            $("#fight-title").text("Lose!");
                            game.losses++;
                            console.log(game.losses);
                            game.playerRef.remove();    // this'll trigger an update
                            game.GetName();     // as will this, but I don't think it will trigger processing.
                            return true;
                        case "rr":
                        case "pp":
                        case "ss":
                            // tie, do it again...
                            $("#fight-title").text("Tie.  Throw again.");
                            game.playerRef.update({throw: null});
                            return true;
                        case "pr":
                        case "sp":
                        case "rs":
                            //win! Stay and play the next opponent.
                            // game.fightModal.modal("hide");
                            // game.throw = "";
                            $("#fight-title").text("Win!");
                            game.wins++;
                            console.log(game.wins);
                            game.playerRef.update({ wins: game.wins, throw: null });  // update triggered.
                            return true;
                    }
                }
            });
        }
        // Show the players:
        var i = 1;
        currentPlayers.forEach(function (childSnap) {
            var prefix = "#p" + i + "-";
            $(prefix + "name").text(childSnap.val().name);
            $(prefix + "wins").text(childSnap.val().wins);
            $(prefix + "losses").text(childSnap.val().losses);
            i++;
        });
        //  Handle the 'combat'.  (going to try to do most of it in a method...)
        //  On a win, increment wins.
        //  Win conditions:
        //      this.playerID.rock && this.opponent.scissors,
        //      this.pID.paper && this.opponent.rock,
        //      this.pID.scissors && this.opponent.paper
        //  So...  Gonna need to store 'opponent' locally...
        //  On a loss, increment losses, and bump the player-- easiest: alter GetName() to not prompt for a name if it already exits...
        //  On a tie, throw again..
    },
    ThrowHand() {
        // do the interface thing
        // Dangit.  Need to make fightModal a property, or redo something else.
        // var fightModal = $("#fight-modal").modal({ backdrop: "static", keyboard: false });
        this.fightModal.modal("show");

        // playersRef.child(childSnap.key).update({ throw: choiceVar });
    },
    DoChoice(choice) {
        this.throw = choice;
        this.playerRef.update({ throw: choice });
    },
    TalkSmack() {
        var message = $("#chat-input").val();
        if (this.playerName && message) {
            var newMessage = {
                "name": this.playerName,
                "message": $("#chat-input").val()
            };
            $("#chat-input").val("");
            chatRef.push(newMessage);
        }
    }
}