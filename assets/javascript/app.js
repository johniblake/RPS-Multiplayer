// Your web app's Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyC2PR24dgaRR0DcZaQZlDxzIKeprjdIHng",
  authDomain: "rps-multiplayer-152da.firebaseapp.com",
  databaseURL: "https://rps-multiplayer-152da.firebaseio.com/",
  projectId: "rps-multiplayer-152da",
  storageBucket: "rps-multiplayer-152da.appspot.com",
  messagingSenderId: "112204239773",
  appId: "1:112204239773:web:9f0681569dbfbfe5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var db = firebase.database();

//Set up game consts

const STATE = {
  OPEN: 1,
  JOINED: 2,
  DISPLAY_MOVES: 3,
  PICKED_MOVE: 4,
  COMPLETE: 5
};
const MOVES = { ROCK: 0, PAPER: 1, SCISSORS: 2 };
const GAMES = db.ref("/games");
const CHAT = db.ref("/chat");
const OPEN_GAMES = GAMES.orderByChild("state").equalTo(STATE.OPEN);

//Create a new game
function createGame() {
  let user = firebase.auth().currentUser;
  let game = {
    creator: {
      uid: user.uid,
      displayName: user.displayName
    },
    state: STATE.OPEN
  };
  $("#instance-container").css("display", "none");
  $("#game-container").css("display", "flex");
  $("#game-title").html("My Game");
  $("#message-container").html("Waiting for an opponent...");
  let gameRef = GAMES.push();
  gameRef
    .set(game, function(error) {
      if (error) {
        console.log("Could not create game.");
      } else {
        gameRef.onDisconnect().remove();
        gameListener(gameRef.key);
      }
    })
    .error(function() {
      console.log("Created Game.");
      $("#instance-container").css("display", "flex");
      $("#game-container").css("display", "none");
      $("#message-container").html("");
    });
}

//Join a game
function joinGame(key) {
  let user = firebase.auth().currentUser;
  let gameRef = db.ref("/games").child(key);

  gameRef.transaction(function(game) {
    if (user.uid === game.creator.uid) {
      return;
    }
    if (!game.joiner) {
      game.state = STATE.JOINED;
      game.joiner = {
        uid: user.uid,
        displayName: user.displayName
      };
      gameListener(key);
      return game;
    }
  });
}
//Game state changed to JOINED, display message, then display the possible moves
function joinedGame(gameRef, game) {
  $("#instance-container").css("display", "none");
  $("#game-container").css("display", "flex");
  if (firebase.auth().currentUser.uid !== game.joiner.uid) {
    $("#message-container").html(
      game.joiner.displayName + " joined your game!"
    );
    setTimeout(function() {
      gameRef.update({ state: STATE.DISPLAY_MOVES });
    }, 1000);
  } else {
    $("#game-title").html(game.creator.displayName + "'s Game");
    $("#message-container").html(
      "You joined " + game.creator.displayName + "'s game!"
    );
  }
  setTimeout(function() {
    $("#message-container").html("Pick a move:");
  }, 1200);
}

function displayAvailableMoves(gameRef, game) {
  //display move buttons on the DOM
  let movesContainer = $("#moves-container");
  let rock = $("<div>");
  let paper = $("<div>");
  let scissors = $("<div>");
  rock.addClass("move");
  rock.val(gameRef.key + " " + MOVES.ROCK);
  rock.html("<img class='move-image' src='./assets/images/rock.png'></img>");
  paper.addClass("move");
  paper.val(gameRef.key + " " + MOVES.PAPER);
  paper.html("<img class='move-image' src='./assets/images/paper.png'></img>");
  scissors.addClass("move");
  scissors.val(gameRef.key + " " + MOVES.SCISSORS);
  scissors.html(
    "<img class='move-image' src='./assets/images/scissors.png'></img>"
  );

  //gameContainer.html("");
  movesContainer.append(rock);
  movesContainer.append(paper);
  movesContainer.append(scissors);
  // add listeners to buttons that add a selected move to each player if one is clicked
  // add listener to both children to determine if both players have selected a move
  //if they have set state to PICKED_MOVE
  //listen for user moves
  console.log("Adding child listener on Game.");
  gameRef.on("child_changed", function(snapshot) {
    gameRef.once("value").then(function(snap) {
      let game = snap.val();
      console.log(snap.val());
      console.log(game.creator.move);
      console.log(game.joiner.move);
      if (game.creator.move !== undefined && game.joiner.move !== undefined) {
        console.log("both players have moved");
        $("#message-container").html("");
        $(".move").remove();
        let winner = getWinner(game.creator, game.joiner);
        //moves have been made, remove listener
        gameRef.off("child_changed");
        gameRef.update({ state: STATE.PICKED_MOVE, winner: winner });
      } else if (game.creator.move !== undefined) {
        if (firebase.auth().currentUser.uid == game.creator.uid) {
          $("#message-container").html("waiting for other player to choose...");
        } else {
          $("#message-container").html("other player has chosen.");
        }
      } else if (game.joiner.move !== undefined) {
        if (firebase.auth().currentUser.uid == game.joiner.uid) {
          $("#message-container").html("waiting for other player to choose...");
        } else {
          $("#message-container").html("other player has chosen.");
        }
      }
    });
  });
}

function getWinner(creator, joiner) {
  let creatorMove = creator.move;
  let joinerMove = joiner.move;
  //Rock > Scissors > Paper > Rock
  let result;
  if (creatorMove == joinerMove) result = "tie";
  else if ((creatorMove - joinerMove + 3) % 3 == 1) result = creator;
  else result = joiner;
  console.log("winner:");
  console.log(result);
  return result;
}

function displayResult(gameRef, game) {
  //display both moves on the screen
  //wait, then change state to COMPLETE
  let myMove = "";
  let theirMove = "";
  let moves = { 0: "Rock", 1: "Paper", 2: "Scissors" };
  if (firebase.auth().currentUser.uid === game.creator.uid) {
    myMove = game.creator.move;
    theirMove = game.joiner.move;
  } else {
    theirMove = game.creator.move;
    myMove = game.joiner.move;
  }
  $("#message-container").append("<div>My Move: " + moves[myMove] + "</div>");
  $("#message-container").append(
    "<div>Opponent's Move: " + moves[theirMove] + "</div>"
  );
  setTimeout(function() {
    gameRef.update({ state: STATE.COMPLETE });
  }, 2000);
}

function showWinner(gameRef, game) {
  if (game.winner !== "tie") {
    $("#message-container").html("Winner: " + game.winner.displayName);
  } else {
    $("#message-container").html("Tie!");
  }
  setTimeout(function() {
    tearDownGame(gameRef);
  }, 3000);
}

function tearDownGame(gameRef) {
  gameRef.remove();
  $("#message-container").html("");
  $("#game-container").css("display", "none");
  $("#instance-container").css("display", "flex");
}

function gameListener(key) {
  let stateRef = GAMES.child(key).child("state");
  let gameRef = GAMES.child(key);
  //let userGameRef = gameRef.child();

  //listen for state changes
  stateRef.on("value", function(snapshot) {
    let state = snapshot.val();
    //get game object
    gameRef.once("value").then(function(gamesnap) {
      let game = gamesnap.val();
      switch (state) {
        case STATE.JOINED:
          //joiner joined game -> display message + wait + set state to DISPLAY_MOVES
          joinedGame(gameRef, game);
          break;
        case STATE.DISPLAY_MOVES:
          //display possible moves on the screen and wait for both users to click on a move, then set state to PICKED_MOVE
          displayAvailableMoves(gameRef, game);
          break;
        case STATE.PICKED_MOVE:
          //display both users' moves, wait a little, then set state to COMPLETE
          displayResult(gameRef, game);
          break;
        case STATE.COMPLETE:
          //declare winnner, tear down game
          showWinner(gameRef, game);
          break;
      }
    });
  });
}

function signInUser() {
  firebase
    .auth()
    .setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(function() {
      firebase
        .auth()
        .signInAnonymously()
        .catch(function(error) {
          // Handle Errors here.
          console.log("Error:");
          var errorCode = error.code;
          var errorMessage = error.message;
          console.log(errorCode);
          console.log(errorMessage);
          // ...
          return null;
        });
    })
    .catch(function(error) {
      console.log(error.message);
    });
}

$(document).ready(function() {
  $(document).on("click", "#create-game-button", function() {
    createGame();
  });

  $(document).on("click", ".game-button", function() {
    let gameKey = $(this).val();
    console.log(gameKey);
    joinGame(gameKey);
  });

  $(document).on("click", ".move", function() {
    let val = $(this)
      .val()
      .split(" ");
    let gameKey = val[0];
    let move = val[1];
    console.log("gamekey: " + gameKey);
    let gameRef = db.ref("/games").child(gameKey);
    gameRef.once("value").then(function(snapshot) {
      let game = snapshot.val();
      console.log(game);
      if (firebase.auth().currentUser.uid === game.creator.uid) {
        gameRef.child("creator").update({
          move: move
        });
      } else {
        gameRef.child("joiner").update({
          move: move
        });
      }
    });

    //console.log(game);
  });

  $(document).on("click", "#send-message", function(event) {
    event.preventDefault();
    CHAT.push({
      sender: firebase.auth().currentUser.displayName,
      message: $("#draft-message").val()
    }).then(function() {
      $("#draft-message").val("");
    });
  });

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      user
        .updateProfile({
          displayName: prompt("Display Name:")
        })
        .then(function() {
          $("#display-name").html("Display Name: " + user.displayName);
        })
        .catch(function(error) {
          console.log("error setting disply nme");
        });
      // ...
    } else {
      console.log("You have been signed out.");
    }
  });

  CHAT.on("child_added", function(snapshot) {
    let packet = snapshot.val();
    let sender = $("<p>");
    sender.css("font-weight", "bold");
    let message = $("<p>");
    message.css("margin-left", "5px");
    let messageDiv = $("<div>");
    messageDiv.addClass("message");
    sender.html(packet.sender + ": ");
    message.html(packet.message);
    messageDiv.append(sender);
    messageDiv.append(message);
    $("#messages-container").append(messageDiv);
    $("#messages-container").scrollTop(
      $("#messages-container").prop("scrollHeight")
    );
  });

  OPEN_GAMES.on("child_added", function(snapshot) {
    //populate Dom with open games
    //console.log(snapshot.key);
    //console.log(snapshot.val());
    let gameDiv = $("<button>");
    gameDiv.attr("id", snapshot.key);
    gameDiv.val(snapshot.key);
    gameDiv.addClass("game-button");
    gameDiv.html("Join " + snapshot.val().creator.displayName + "'s game");
    $("#game-list-container").append(gameDiv);
  });

  OPEN_GAMES.on("child_removed", function(snapshot) {
    //remove game from the DOM
    console.log("removing game: " + snapshot.key);
    let item = $("#" + snapshot.key);
    item.remove();
  });

  if (!firebase.auth().currentUser) {
    signInUser();
  }
});
