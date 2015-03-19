var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
 
app.use(express.static(__dirname + '/public'));
 
app.get('/', function(req, res){
  res.render('/index.html');
});

var MAX_PLAYERS_PER_SESSION = 5;
var DEFAULT_LEVEL = 'level2';
var DEFAULT_ENEMIES = {nextId: 3, "1": {p: {x: 700, y: 0, id: 1}}, "2": {p: {x: 800, y: 0, id: 2}}};
var DEFAULT_GAMESTATE = {
	level: DEFAULT_LEVEL,
	sprites: {
		PLAYER: {nextId: 1},
		ACTOR: {nextId: 1},
		PLAYERELEBALL: {nextId: 1},
		ENEMYELEBALL: {nextId: 1},
		ENEMY: DEFAULT_ENEMIES
	}
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
		if (sockets[ goodIds[key] ]) { sockets[ goodIds[key] ].emit(eventName, data); }
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
		if (sockets[ goodIds[i] ]) { sockets[ goodIds[i] ].emit(eventName, data); }
	}
}
/**
 * Sends to the server socket (Server-cum-client)
 */
var sendToServer = function(eventName, data) {
	if (!serverSocket) {
		console.log("Server has not yet connected...");
		return;
	}
	
	console.log("Sending to server data with playerId " + data.playerId);
	serverSocket.emit(eventName, data);
};

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

/**
 * Finds the size of an object
 */
var sizeOfObject = function(obj) {
	var size = 0;
	for (var key in obj) {
		size++;
	}
	return size;
}
 
io.on('connection', function (socket) {
	console.log(socket.handshake.headers.referer);
	console.log(socket.handshake.headers.referer.indexOf('server.html'));
	console.log("length = " + socket.handshake.headers.referer.length);
	if ( !serverSocket && 
		(socket.handshake.headers.referer.length < 11 || 
		socket.handshake.headers.referer.indexOf('server.html') != socket.handshake.headers.referer.length-11) ) {
			console.log("Reject connection");
			return;
	}
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
		
		sessions[sessionId].players.splice(playerId, 1);
		sockets.splice(playerId, 1);
		idToSessionMap.splice(id, 1);
		sessions[sessionId].playerCount--;
	});
	
	// Player has joined the game
	socket.on('joined', function(data) {
		var sessId = getSessionIdOfPlayer(data.playerId);
		
		console.log("Player " + data.playerId + " joined session " + sessId);
		
		// Insert the player into the game state
		var gameState = getGameStateOfSession(sessId);
		var playerProps = {
			playerId: data.playerId,
			entityType: 'PLAYER',
			x: 410,
			y: 90 
		};
		gameState.sprites['PLAYER'][data.playerId] = {
			playerId: data.playerId,
			p: playerProps
		};		
		
		// Insert the player properties into the data to be broadcasted to all players in the session,
		// and tell the other players in his session about his existence
		data.p = playerProps;
		broadcastToAllInSession(sessId, 'playerJoined', data);
		
		// Tell the server about the new player
		console.log("Telling server player " + data.playerId + " joined session " + sessId);
		sendToServer('playerJoined', {
			playerId: data.playerId,
			sessionId: sessId,
			p: playerProps
		});
	});

	// Player has disconnected from the session
	socket.on('disconnect', function (data) {
		if (socket == serverSocket) {
			console.log("Server disconnected!");
			serverSocket = null;
			return;
		}
		
		var playerId = getPlayerIdOfSocket(socket.conn.id);
		var sessionId = getSessionIdOfPlayer(playerId);
		
		console.log("Player " + playerId + " from session " + sessionId + " disconnected...");
		
		playerCount--;
		
		// Update session
		// Find index to splice players in sessionvar idx;
		for (var idx in sessions[sessionId].players) {
			if (sessions[sessionId].players[idx] == playerId) {
				sessions[sessionId].players.splice(idx, 1);
				break;
			}
		}
		// Find index to splice players in gameState
		/*
		for (var idx in sessions[sessionId].gameState.sprites['PLAYER']) {
			if (sessions[sessionId].gameState.sprites['PLAYER'][idx].playerId == playerId) {
				sessions[sessionId].gameState.sprites['PLAYER'].splice(idx, 1);
				break;
			}
		}
		*/
		delete sessions[sessionId].gameState.sprites['PLAYER'][playerId];
		
		sessions[sessionId].playerCount--;
		
		// Tell everybody in the session that the player has disconnected
		broadcastToAllInSessionExcept(sessionId, playerId, 'playerDisconnected', {
			playerId: playerId,
			sessionId: sessionId
		});
		
		// Tell the server that the player has disconnected
		sendToServer('playerDisconnected', {
			playerId: playerId,
			sessionId: sessionId
		});
	});
	
	// ## Keyboard/mouse event listeners
	socket.on('keydown', function(data) {
		var playerId = data.playerId;
		var keyCode = data.keyCode;
		console.log("Player " + playerId + " pressed key " + keyCode);
		
		var sessionId = getSessionIdOfPlayer(playerId);
		var evt = {keyCode: keyCode};
		
		sendToServer('keydown', {
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
		
		sendToServer('keyup', {
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
		
		sendToServer('mouseup', {
			playerId: playerId,
			sessionId: sessionId,
			e: evt
		});
	});
	
	// socket.on('insert_object', function(data) {
		// broadcastToAllExcept(data.playerId, 'insert_object', data);
	// });
	
	socket.on('update', function(data) {
		var playerId = data.playerId;
		var sessionId;
		if (playerId) {
			sessionId = getSessionIdOfPlayer(playerId);
		} else {
			sessionId = data.sessionId;
		}
		
		if (data.entityType) {
			console.log("Trying to access entity type " + data.entityType + " data id " + data.id);
			sessions[sessionId].gameState.sprites[data.entityType][data.id] = {p: data.p};
		}
		
		broadcastToAllInSession(sessionId, 'updated', data);
	});
	
	socket.on('destroyed', function(data) {
		if (sessions[data.sessionId].gameState.sprites[data.entityType][data.id]) {
			console.log("Old length " + sizeOfObject(sessions[data.sessionId].gameState.sprites[data.entityType]));
			delete sessions[data.sessionId].gameState.sprites[data.entityType][data.id];
			console.log("After deleting from session " + data.sessionId + " entity " + data.entityType + " id " + data.id + ", " + sessions[data.sessionId].gameState.sprites[data.entityType][data.id]);
			console.log("New length " + sizeOfObject(sessions[data.sessionId].gameState.sprites[data.entityType]));
		}
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