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

var onDeck = "";

amConnected.on("value", function (snap) {
    if (snap.val()) {
        var con = connRef.push(true);
        con.onDisconnect().remove();
    }
    //    The connections object changes each time the page is reloaded.  Will have to store a UUID in cookie or localStorage.
});

queueRef.on("child_added", function (theChild, prevChild) {
    //  This is ... ugly.  This function runs every time a child gets added to 
    //  queueRef.  It's .on, not .once, 'cuz for some reason the prevChild
    //  parameter is null when the new child is added, so the bloody thing's 
    //  got to run through 'em all to set onDeck properly.
    game.BuildQueue(theChild, prevChild);
});

rootRef.on("value", function (snap) {
    //  This function gets the whole bloody DB 'cuz it's got to check size of 
    //  the playersRef db before it moves a record from queue to players.
    //  can possibly do the entire bloody logic in here, since this one would get called every time something changes...
    game.PushPlayers(snap);
});

playersRef.once("child_added", function (theChild) {
    game.ThrowHand(theChild);
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
    onDeck: "",
    playerName: "", // maybe don't need to store this...
    playerRef: "",  // reference to the player's node.  Not sure it'll update when we start moving things around, so:
    playerID: "",   // store the key/uuid here
    playerObj: {
        "name": "",
        "wins": 0,
        "losses": 0,
    },

    GetName() {
        this.playerName = prompt("Enter your name:");
        // console.log(this.playerName);
        this.playerObj.name = this.playerName;
        this.playerRef = queueRef.push(this.playerObj);
        this.playerRef.update({ uuid: this.playerRef.key });  // think I've figured out how to make this unnecessary, but I'll keep it for now.
        this.playerID = this.playerRef.key;   // store the key to access the obj later!
        // this.player.onDisconnect().remove();
    },

    BuildQueue(childSnap, prevSnap) {
        // console.log(childSnap.key);
        // console.log(childSnap.val());
        // var p = $("<p>").text(childSnap.val().name);
        // $("#queue-card").append(p);
        if (prevSnap) {
            return;
        }
        else {
            // console.log("next up: " + childSnap.val().name);
            this.onDeck = childSnap.key;
            // console.log(this.onDeck);
        }
    },
    PushPlayers(dbSnap) {
        var currentQueue = dbSnap.child("queue");
        var targetRecord = currentQueue.child(this.onDeck);
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
            console.log(childSnap.val().name);
            var name = $("<b>").text(childSnap.val().name + "::  ");
            var message = childSnap.val().message;
            var p = $("<p>").append(name);
            p.append(message);
            $("#chat-box").prepend(p);
        });
        // console.log(dbSnap.val());
        // console.log(currentQueue);
        // console.log(targetRecord);
        var currentPlayers = dbSnap.child("players");
        if (currentPlayers.numChildren() < 2) {
            playersRef.update({ [this.onDeck]: targetRecord.val() });
            queueRef.child(this.onDeck).remove();
        }
        // Handle the players display:
        var i = 1;
        currentPlayers.forEach(function (childSnap) {
            var prefix = "#p" + i + "-";
            $(prefix + "name").text(childSnap.val().name);
            $(prefix + "wins").text(childSnap.val().wins);
            $(prefix + "losses").text(childSnap.val().losses);
            i++;
        });
    },
    ThrowHand(childSnap) {
        // if we're in the players list, get our r/p/s choice and update our firebase record
        // console.log(childSnap.key);
        if (this.playerID === childSnap.key) {
            // do the interface thing, then
            playersRef.child(childSnap.key).update({ throw: choiceVar });
        }
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