var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
 
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

var sockets = [];
var socketIdToPlayerMap = [];

var playerCount = 0;
var id = 0;

var sessions = [];
var idToSessionMap = [];

// ## Helper functions
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
			gameState: DEFAULT_GAMESTATE	
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
		socket.emit('connected', {
			playerId: id,
			sessionId: sessionId,
			gameState: sessions[sessionId].gameState
		});
		io.emit('count', { playerCount: playerCount });
	}, 1500);
	
	// Player has joined the game
	socket.on('joined', function(data) {
		var sessionId = idToSessionMap[data.playerId];
		console.log("Player " + data.playerId + " joined session " + sessionId);
		// Insert the player into the game state
		var gameState = sessions[sessionId].gameState;
		var playerProps = {
			playerId: data.playerId,
			x: 300,
			y: 100,
			vx: 0,
			vy: 0 
		};
		gameState.players.push({
			p: playerProps
		});
		
		// Insert the player properties into the data to be broadcasted to all players in the session,
		data.p = playerProps;
		// Tell the other players in his session about his existence
		broadcastToAllInSession(sessionId, 'playerJoined', data);
	});

	// Player has disconnected from the session
	socket.on('disconnect', function (data) {
		var playerId = socketIdToPlayerMap[socket.conn.id];
		var sessionId = idToSessionMap[playerId];
		
		console.log("Player " + playerId + " from session " + sessionId + " disconnected...");
		
		playerCount--;
		io.emit('count', { playerCount: playerCount });
		
		// Update session
		// Find index to splice players in sessionvar idx;
		var idx1, idx2;
		for (idx = 0; idx < sessions[sessionId].gameState.players.length; idx++) {
			if (sessions[sessionId].gameState.players[idx] == playerId) {
				break;
			}
		}
		// Find index to splice players in gameState
		for (idx = 0; idx < sessions[sessionId].gameState.players.length; idx++) {
			if (sessions[sessionId].gameState.players[idx] == playerId) {
				break;
			}
		}
		
		sessions[sessionId].playerCount--;
		sessions[sessionId].players.splice(idx1, 1);
		sessions[sessionId].gameState.players.splice(idx2, 1);
		
		console.log(sessions[sessionId].gameState.players);
		
		broadcastToAllInSessionExcept(sessionId, data.playerId, 'playerDisconnected', data);
	});
	
	// ## Keyboard/mouse event listeners
	socket.on('keydown', function(data) {
		var playerId = data.playerId;
		var keyCode = data.keyCode;
		console.log("Player " + playerId + " pressed key " + keyCode);
	});
	socket.on('keyup', function(data) {
		var playerId = data.playerId;
		var keyCode = data.keyCode;
		console.log("Player " + playerId + " released key " + keyCode);
	});
	socket.on('mouseup', function(data) {
		var playerId = data.playerId;
		var e = data.e;
		console.log("Player " + playerId + " released mouse");
	});
	
	/*
	socket.on('insert_object', function(data) {
		broadcastToAllExcept(data.playerId, 'insert_object', data);
	});
	
	socket.on('update', function(data) {
		broadcastToAllExcept(data.playerId, 'updated', data);
	});
	
	socket.on('playerTookDmg', function(data) {
		broadcastToAllExcept(data.playerId, 'playerTookDmg', data);
	});
	
	socket.on('playerDied', function(data) {
		broadcastToAllExcept(data.playerId, 'playerDied', data);
	});
	*/
  
  console.log("Accepting connection, id " + id);
});
 
server.listen(4344);
console.log("Multiplayer app listening on port 4344");