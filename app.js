var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);


// ## Import quintus library 
var qlib = require('./quintus-all.js');
// ## Get Quintus object
var Q = qlib.Quintus({ 
		audioSupported: [ 'ogg','mp3', 'wav' ],
		imagePath: "public/images/",
		audioPath: "public/audio/",
		dataPath: "public/data/"
	})
        .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, Audio")
        .controls().touch();

//Q.load("character_water.png, character_water.json");
// Sprites sheets can be created manually
//Q.sheet("tiles","tiles.png", { tilew: 32, tileh: 32 });
// Or from a .json asset that defines sprite locations
Q.compileSheets("character_earth.png", "character_earth.json");
Q.compileSheets("character_lightning.png", "character_lightning.json");
Q.compileSheets("character_water.png", "character_water.json");
Q.compileSheets("character_fire.png", "character_fire.json");
Q.compileSheets("npcs.png", "npcs.json");
Q.compileSheets("elemental_balls.png", "elemental_balls.json");

// ## Level1 scene
// Create a new scene called level 1
Q.scene("level1",function(stage) {

	// Add in a repeater for a little parallax action
	stage.insert(new Q.Repeater({ asset: "background-wall.png", speedX: 0.5, speedY: 0.5 }));

	// Add in a tile layer, and make it the collision layer
	stage.collisionLayer(new Q.TileLayer({
							dataAsset: 'level1.json',
							sheet:     'tiles' }));
});

// ## Level2 scene
// Create a new scene called level 2
Q.scene("level2",function(stage) {

	// Add in a repeater for a little parallax action
	stage.insert(new Q.Repeater({ asset: "background-wall.png", speedX: 0.5, speedY: 0.5 }));

	// Add in a tile layer, and make it the collision layer
	stage.collisionLayer(new Q.TileLayer({
						 dataAsset: 'level2.json',
						 sheet:     'tiles' }));
});

// ## Extend a Quintus Sprite for our server player simulation
Q.Sprite.extend("ServerPlayer", {
	init: function(p) {
		this._super(p, {
			sprite: "character_water"
		}); 
		this.add("2d, platformerControls")
	}       
});






 
app.use(express.static(__dirname + '/public'));
 
app.get('/', function(req, res){
  res.render('/index.html');
});

var MAX_PLAYERS_PER_SESSION = 5;
var DEFAULT_GAMESTATE = {
	level: 'level2',
	players: [],
	eleballs: [],
	enemies: []
};

var serverSocket;
var sockets = [];
var socketIdToPlayerMap = [];

var playerCount = 0;
var id = 0;

var sessions = [];
var idToSessionMap = [];

// ## Helper functions
var getSessionIdOfPlayer = function(playerId) {
	return idToSessionMap[playerId];
};
var getGameStateOfSession = function(sessionId) {
	return sessions[sessionId].gameState;
}
var getPlayerIdOfSocket = function(socketconnid) {
	return socketIdToPlayerMap[socketconnid];
}
/**
 * Broadcasts to all sockets except the one with the given playerId
 */
 var broadcastToAllExcept = function(dontSendId, eventName, data) {
	 for (var attrName in sockets) {
			if (dontSendId != attrName) {
				sockets[attrName].emit(eventName, data);
			}
	 }
 }
 /**
  * Broadcasts to all sockets in the given session
  */
var broadcastToAllInSession = function(sessionId, eventName, data) {
	var goodIds = sessions[sessionId].players;
	for (var key in goodIds) {
		sockets[ goodIds[key] ].emit(eventName, data);
	}
}
 /**
  * Broadcasts to all sockets in the given session except the one with the specified playerId
  */
var broadcastToAllInSessionExcept = function(sessionId, dontSendId, eventName, data) {
	var goodIds = sessions[sessionId].players.filter(function(obj) {
		return obj != dontSendId;
	});
	for (var i = 0; i < goodIds.length; i++) {
		sockets[ goodIds[i] ].emit(eventName, data);
	}
}
 /**
  * Finds the first session that does not have max players and returns its index.
  * If all ongoing sessions are full or there are no ongoing sessions, returns -1.
  */
var findGoodSession = function() {
	for (var i = 0; i < sessions.length; i++) {
		if (sessions[i].playerCount < MAX_PLAYERS_PER_SESSION) {
			return i;
		}
	}
	return -1;
}
 
io.on('connection', function (socket) {
	playerCount++;
	id++;
	
	// Store the socket
	sockets[id] = socket;
	socketIdToPlayerMap[socket.conn.id] = id;
	
	// Find a good session for the new player
	var sessionId = findGoodSession();
	
	// Start new session if could not find a good session
	if (sessionId == -1) {
		sessionId = sessions.length;
		sessions.push({
			playerCount: 0,
			players: [],
			gameState: DEFAULT_GAMESTATE,
			stage: new Q.stageScene(DEFAULT_GAMESTATE.level)
		});
		console.log("Creating new session " + sessionId);
	}
	
	// New player joining the session
	sessions[sessionId].playerCount++;
	sessions[sessionId].players.push(id);
	idToSessionMap[id] = sessionId;
	
	console.log("Put player " + id + " in session " + sessionId);
	
	// Send message to player telling the player that he is connected
	setTimeout(function () {
		console.log("Emitting connected message");
		console.log(sessions[sessionId].gameState.players);
		socket.emit('connected', {
			playerId: id,
			sessionId: sessionId,
			gameState: sessions[sessionId].gameState
		});
		console.log("Emitted connected message");
		io.emit('count', { playerCount: playerCount });
	}, 1500);
	
	// Server has joined!
	socket.on('serverJoined', function(data) {
		serverSocket = socket;
		
		var playerId = data.playerId;
		var sessionId = idToSessionMap[playerId];
		
		console.log("Player " + playerId + " from session " + sessionId + " disconnected... because he is a SERVER!");
		
		playerCount--;
		
		// Update session
		// Find index to splice players in sessionvar idx;
		var idx1, idx2;
		for (idx1 = 0; idx1 < sessions[sessionId].gameState.players.length; idx1++) {
			if (sessions[sessionId].players[idx1] == playerId) {
				break;
			}
		}
		
		sessions[sessionId].playerCount--;
		sessions[sessionId].players.splice(idx1, 1);
	});
	
	// Player has joined the game
	socket.on('joined', function(data) {
		var sessionId = getSessionIdOfPlayer(data.playerId);
		
		console.log("Player " + data.playerId + " joined session " + sessionId);
		
		// Insert the player into the game state
		var gameState = getGameStateOfSession(sessionId);
		var playerProps = {
			playerId: data.playerId,
			x: 410,
			y: 90 
		};
		gameState.players.push({
			playerId: data.playerId,
			p: playerProps
		});		
		
		// Insert the player properties into the data to be broadcasted to all players in the session,
		// and tell the other players in his session about his existence
		data.p = playerProps;
		broadcastToAllInSession(sessionId, 'playerJoined', data);
		
		// Tell the server about the new player
		serverSocket.emit('playerJoined', {
			playerId: data.playerId,
			sessionId: sessionId,
			p: playerProps
		});
	});

	// Player has disconnected from the session
	socket.on('disconnect', function (data) {
		if (socket == serverSocket) {
			// No need to do anything if it is a server!
			console.log("Server disconnected!");
			return;
		}
		
		var playerId = getPlayerIdOfSocket(socket.conn.id);
		var sessionId = getSessionIdOfPlayer(playerId);
		
		console.log("Player " + playerId + " from session " + sessionId + " disconnected...");
		
		playerCount--;
		
		// Update session
		// Find index to splice players in sessionvar idx;
		var idx1, idx2;
		for (idx1 = 0; idx1 < sessions[sessionId].players.length; idx1++) {
			if (sessions[sessionId].players[idx1] == playerId) {
				break;
			}
		}
		// Find index to splice players in gameState
		for (idx2 = 0; idx2 < sessions[sessionId].gameState.players.length; idx2++) {
			if (sessions[sessionId].gameState.players[idx2].playerId == playerId) {
				break;
			}
		}
		
		sessions[sessionId].playerCount--;
		sessions[sessionId].players.splice(idx1, 1);
		sessions[sessionId].gameState.players.splice(idx2, 1);
		
		console.log(sessions[sessionId].gameState.players);
		
		// Tell everybody in the session that the player has disconnected
		broadcastToAllInSessionExcept(sessionId, data.playerId, 'playerDisconnected', data);
	});
	
	// ## Keyboard/mouse event listeners
	socket.on('keydown', function(data) {
		var playerId = data.playerId;
		var keyCode = data.keyCode;
		console.log("Player " + playerId + " pressed key " + keyCode);
		
		var sessionId = getSessionIdOfPlayer(playerId);
		var evt = {keyCode: keyCode};
		
		serverSocket.emit('keydown', {
			playerId: playerId,
			sessionId: sessionId,
			e: evt
		});
	});
	socket.on('keyup', function(data) {
		var playerId = data.playerId;
		var keyCode = data.keyCode;
		console.log("Player " + playerId + " released key " + keyCode);
		
		var sessionId = getSessionIdOfPlayer(playerId);
		var evt = {keyCode: keyCode};
		
		serverSocket.emit('keyup', {
			playerId: playerId,
			sessionId: sessionId,
			e: evt
		});
	});
	socket.on('mouseup', function(data) {
		var playerId = data.playerId;
		var evt = data.e;
		console.log("Player " + playerId + " released mouse");
		
		var sessionId = getSessionIdOfPlayer(playerId);
		
		serverSocket.emit('mouseup', {
			playerId: playerId,
			sessionId: sessionId,
			e: evt
		});
	});
	
	// socket.on('insert_object', function(data) {
		// broadcastToAllExcept(data.playerId, 'insert_object', data);
	// });
	
	socket.on('update', function(data) {
		var playerId = data.playerId,
			sessionId = getSessionIdOfPlayer(playerId);
		
		broadcastToAllInSession(sessionId, 'updated', data);
	});
	
	// socket.on('playerTookDmg', function(data) {
		// broadcastToAllExcept(data.playerId, 'playerTookDmg', data);
	// });
	
	// socket.on('playerDied', function(data) {
		// broadcastToAllExcept(data.playerId, 'playerDied', data);
	// });
  
  console.log("Accepting connection, id " + id);
});
 
server.listen(4344);
console.log("Multiplayer app listening on port 4344");