"use strict";


var gameStates = []; // indexed by session id

var serverId;
var stage;

// ## Functions to create sprites for our game
var creates = {
	PLAYER: function(p) { return new Q.Player(p); },
	ACTOR: function(p) { return new Q.Actor(p); },
	PLAYERELEBALL: function(p) { return new Q.PlayerEleball(p); },
	ENEMYELEBALL: function(p) { return new Q.EnemyEleball(p); },
	ENEMY: function(p) { return new Q.Enemy(p); }
};

/**
 * Get the next id useable for the session and the data type
 */
var getNextId = function(sessionId, type) {
	console.log("Accessing sessionId " + sessionId + " and type " + type);
	var length = gameStates[sessionId].sprites[type].length;
	gameStates[sessionId].sprites[type].push(type);
	console.log("Get next Id for session " + sessionId + " and type " + type + " returns " + length + 
				" and new next id is " + gameStates[sessionId].sprites[type].length);
	return length;
}

socket.on('connected', function(data) {
	console.log("Connected as SERVER");
	console.log("Gamestate: " + data.gameState);
	
	serverId = data.playerId;
	
	// Connected. Initializing game state to the one app.js sent
	gameStates[data.sessionId] = data.gameState;
	gameStates[data.sessionId].sprites['PLAYER'] = gameStates[data.sessionId].players = []; // should not have any players
	
	// Tell app.js that we have joined!
	socket.emit('serverJoined', {playerId: data.playerId});
	
	// Load the game state
	loadGameState(gameStates[data.sessionId], data.sessionId);
});

socket.on('playerDisconnected', function(data) {	
	console.log("Player " + data.playerId + " from session " + data.sessionId + " disconnected!");
	
	// Destroy player and remove him from game state
	destroyPlayer(data.sessionId, data.playerId);
});

socket.on('playerJoined', function(data) {	
	console.log("Player " + data.p.playerId + " joined session " + data.sessionId);
	console.log("Player " + data.p.playerId + " joined session " + data.sessionId);
	console.log("Player " + data.p.playerId + " joined session " + data.sessionId);
	data.p.sessionId = data.sessionId;
	addPlayer(data.sessionId, new Q.Player(data.p));
	console.log("Number of players: " + gameStates[data.sessionId].sprites['PLAYER'].length);
});

socket.on('keydown', function(data) {
	var playerId = data.playerId,
		sessionId = data.sessionId,
		e = data.e;
	var player = getPlayer(sessionId, playerId);
	
	console.log("Player " + playerId + " pressed key of keycode " + e.keyCode);
	console.log("Player " + playerId + " OLD position " + player.p.x + "," + player.p.y);
	// Simulate player pressing the key
	pressKey(player, e.keyCode);
	console.log("Player " + playerId + " NEW position " + player.p.x + "," + player.p.y);
});
socket.on('keyup', function(data) {
	var playerId = data.playerId,
		sessionId = data.sessionId,
		e = data.e;
	var player = getPlayer(sessionId, playerId);
	
	// Simulate player releasing the key
	releaseKey(player, e.keyCode);
});
socket.on('mouseup', function(data) {
	var playerId = data.playerId,
		sessionId = data.sessionId,
		e = data.e;
	var player = getPlayer(sessionId, playerId);
	
	console.log("Player " + playerId + " released mouse!");
	
	player.trigger('fire', e);
});

// ## Helper Functions
var loadGameState = function(gameState, sessionId) {
	console.log("Loading game state...");
	
	// Get game state data
	var level = gameState.level;
	
	// Load the level, and insert the stage into the gameState
	console.log("Loading the level " + level);
	Q.stageScene(level);
	gameState.stage = Q.stage();
	
	// Load enemies, if any
	for (var i in gameState.sprites['ENEMY']) {	
		if ( !gameState.sprites['ENEMY'][i] || gameState.sprites['ENEMY'][i].sprite) {
			// Been deleted, or already has a sprite created!
			continue;
		} else if ('ENEMY' == 'PLAYER' && gameState.sprites['ENEMY'][i].p.playerId != selfId) {
			// Not a true PLAYER, don't create sprite
			continue;
		} else {	
			// Else, create sprite!
			if (gameState.sprites['ENEMY'][i]) {
				console.log("Creating sprite " + 'ENEMY' + " for id " + i);
				console.log(gameState.sprites['ENEMY'][i].p);
				gameState.sprites['ENEMY'][i].p.sessionId = sessionId;
				var sprite = creates['ENEMY'](gameState.sprites['ENEMY'][i].p);
				sprite.add("serverSide");
				gameState.sprites['ENEMY'][i] = {
					sprite: sprite
				};
				gameState.stage.insert(sprite);
			}
		}
	}
	
	// Viewport
	Q.stage().add("viewport");
	Q.input.on('keydown', function(keyCode) {
		if (Q.input.keys[keyCode]) {
			var actionName = Q.input.keys[keyCode];
			var x = Q.stage().viewport.x;
			var y = Q.stage().viewport.y;
			var speed = 20;
			if (actionName == 'server_up') {
				Q.stage().viewport.moveTo(x, y-speed);
			} else if (actionName == 'server_down') {
				Q.stage().viewport.moveTo(x, y+speed);
			} else if (actionName == 'server_left') {
				Q.stage().viewport.moveTo(x-speed, y);
			} else if (actionName == 'server_right') {
				Q.stage().viewport.moveTo(x+speed, y);
			}
		}
	});
}

// ## Helper functions
var getPlayer = function(sessionId, playerId) {
	return gameStates[sessionId].sprites['PLAYER'].filter(function(obj) {
		return obj.sprite.p.playerId == playerId;
	})[0].sprite;
}

var addSprite = function(sessionId, type, id, sprite) {
	gameStates[sessionId].sprites[type][id] = {
		sprite: sprite
	};
}

var addPlayer = function(sessionId, player) {
	player.del('platformerControls');
	player.add("serverPlatformerControls");
	player.add("serverSide");
	
	addSprite(sessionId, 'PLAYER', player.p.playerId, player);
	insertIntoStage(sessionId, player);
}

var destroyPlayer = function(sessionId, playerId) {
	if (gameStates[sessionId].sprites['PLAYER']) {
		if (gameStates[sessionId].sprites['PLAYER'][playerId]) {
			gameStates[sessionId].sprites['PLAYER'][playerId].sprite.destroy();
		}
		gameStates[sessionId].sprites['PLAYER'].splice(playerId, 1);
	}
}

var insertIntoStage = function(sessionId, sprite) {
	return gameStates[sessionId].stage.insert(sprite);
}

var pressKey = function(player, keyCode) {
	if(Q.input.keys[keyCode]) {
	  var actionName = Q.input.keys[keyCode];
	  console.log("Pressing key " + keyCode + " with action name " + actionName);
	  player.inputs[actionName] = true;
	  console.log("Inputs[" + actionName + "] is " + player.inputs[actionName]);
	  Q.input.trigger(actionName);
	  Q.input.trigger('keydown',keyCode);
	}
}

var releaseKey = function(player, keyCode) {
	if(Q.input.keys[keyCode]) {
	  var actionName = Q.input.keys[keyCode];
	  player.inputs[actionName] = false;
	  Q.input.trigger(actionName + "Up");
	  Q.input.trigger('keyup',keyCode);
	}
}