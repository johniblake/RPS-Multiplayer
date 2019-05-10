//Firebase configuration
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
    .catch(function() {
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

//display move buttons on the DOM
//wait for moves
function displayAvailableMoves(gameRef, game) {
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

  movesContainer.append(rock);
  movesContainer.append(paper);
  movesContainer.append(scissors);

  //listen for player moves
  //set state to PICKED_MOVE if both players have chosen a move
  gameRef.on("child_changed", function(snapshot) {
    gameRef.once("value").then(function(snap) {
      let game = snap.val();
      if (game.creator.move !== undefined && game.joiner.move !== undefined) {
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
  let result;

  if (creatorMove == joinerMove) result = "tie";
  else if ((creatorMove - joinerMove + 3) % 3 == 1) result = creator;
  else result = joiner;

  return result;
}

function displayResult(gameRef, game) {
  //display both moves on the screen
  //wait, then change state to COMPLETE
  let myMove = "";
  let theirMove = "";

  let moves = {
    0: "./assets/images/rock.png",
    1: "./assets/images/paper.png",
    2: "./assets/images/scissors.png"
  };

  if (firebase.auth().currentUser.uid === game.creator.uid) {
    myMove = game.creator.move;
    theirMove = game.joiner.move;
  } else {
    theirMove = game.creator.move;
    myMove = game.joiner.move;
  }
  let myDiv = $("<div>");
  let myImage = $("<img>");
  myDiv.addClass("my-move");
  myDiv.append("<h4>My Move:</h4>");
  myImage.addClass("move-image");
  myImage.attr("src", moves[myMove]);
  myDiv.append(myImage);

  let theirDiv = $("<div>");
  let theirImage = $("<img>");
  theirDiv.addClass("their-move");
  theirDiv.append("<h4>Their Move:</h4>");
  theirImage.addClass("move-image");
  theirImage.attr("src", moves[theirMove]);
  theirDiv.append(theirImage);

  $("#moves-container").append(myDiv);
  $("#moves-container").append(theirDiv);

  setTimeout(function() {
    gameRef.update({ state: STATE.COMPLETE });
  }, 2000);
}

//display the winner, then tear down game and bring user back to lobby
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
  $("#game-title").html("");
  $("#message-container").html("");
  $("#moves-container").html("");
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

//create new anonymous account for each new user session
function signInUser() {
  firebase
    .auth()
    .setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(function() {
      firebase
        .auth()
        .signInAnonymously()
        .catch(function(error) {
          console.log(error.message);
          return null;
        });
    })
    .catch(function(error) {
      console.log(error.message);
    });
}

$(document).ready(function() {
  //listen for create game button presses
  $(document).on("click", "#create-game-button", function() {
    createGame();
  });

  //listen for join game button presses
  $(document).on("click", ".game-button", function() {
    let gameKey = $(this).val();
    joinGame(gameKey);
  });

  //listen for moves, and notify the game
  $(document).on("click", ".move", function() {
    let val = $(this)
      .val()
      .split(" ");
    let gameKey = val[0];
    let move = val[1];
    let gameRef = db.ref("/games").child(gameKey);

    gameRef.once("value").then(function(snapshot) {
      let game = snapshot.val();

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
  });

  //listen for send button clicks and send the associated message
  $(document).on("click", "#send-message", function(event) {
    event.preventDefault();
    CHAT.push({
      sender: firebase.auth().currentUser.displayName,
      message: $("#draft-message").val()
    }).then(function() {
      $("#draft-message").val("");
    });
  });

  //let users set their display name upon sign in
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
          console.log("error setting disply name");
        });
    } else {
      console.log("You have been signed out.");
    }
  });

  //listen for new messages
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

  //listen for new games
  OPEN_GAMES.on("child_added", function(snapshot) {
    let gameDiv = $("<button>");

    gameDiv.attr("id", snapshot.key);
    gameDiv.val(snapshot.key);
    gameDiv.addClass("game-button");

    gameDiv.html("Join " + snapshot.val().creator.displayName + "'s game");
    $("#game-list-container").append(gameDiv);
  });

  //remove games from DOM that have been joined
  OPEN_GAMES.on("child_removed", function(snapshot) {
    let item = $("#" + snapshot.key);
    item.remove();
  });

  //create new account for user and sign them in if they dont have an active session
  if (!firebase.auth().currentUser) {
    signInUser();
  }
});
