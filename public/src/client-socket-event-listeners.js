"use strict";

// ## Socket event listeners

var selfId;
var sessionId;
var gameRunning = false;
var gameState;
var actors = [];

var loadGameState = function() {
	console.log("Loading game state...");
	
	// Get game state data
	var level = gameState.level,
		players = gameState.players,
		eleballs = gameState.eleballs,
		enemies = gameState.enemies;
		
	// Get the player and the actors
	console.log("Getting the player and actors");
	var player = players[selfId];
	for (var id in players) {
		if (id != selfId) {
			// Not myself, its an actor
			var temp = new Q.Actor({
				x: players[id].p.x,
				y: players[id].p.y,
				vx: players[id].p.vx,
				vy: players[id].p.vy,
				playerId: id
			});
			actors[id] = {
				playerId: id,
				player: temp
			};
		}
	}
		
	// Load the level
	console.log("Loading the level " + level);
	Q.stageScene(level);
	
	// Load the player
	console.log("Loading the player");
	player = Q.stage().insert(new Q.Player(player.p));
	// Give the stage a moveable viewport and tell it
	// to follow the player.
	Q.stage().add("viewport").follow(player);
	
	// Load the actors
	console.log("Loading the actors");
	for (var key in actors) {
		Q.stage().insert(new Q.Actor(actors[key].p));
	}
	
	// Load the eleballs
	
	
	// Load the enemies
	
}

socket.on('connected', function(data1) {
	selfId = data1.playerId;
	sessionId = data1.sessionId;
	gameState = data1.gameState;
	console.log("Connected to server as player " + selfId + " in session " + sessionId);
	
	// Tell server that you have joined
	socket.emit('joined', { playerId: selfId });
	Q.stageScene('level3');
	
	// ## Event listeners for data received from server
	socket.on('playerJoined', function(data) {
		var playerId = data.playerId,
			props = data.p;
		console.log("Player " + playerId + " joined");
		// Insert player into game state
		gameState.players[playerId] = {p: props};
		if (playerId == selfId) {
			// It is the player himself, so it is time to load the game for the player to play!
			loadGameState();
			gameRunning = true;
		} else if (gameRunning) {
			// Game is already running, and new player joined, so insert actor
			console.log("Inserting actor with props: " + gameState.players[playerId].p);
			for (var key in gameState.players[playerId].p) {
				console.log(key + ": " + gameState.players[playerId].p[key]);
			}
			var actor = Q.stage().insert(new Q.Actor(gameState.players[playerId].p));
			console.log(actor);
		}
	});
	
	socket.on('insert_object', function(data) {
		console.log(selfId + ": Message from server: insert_object");
		if (data.object_type == 'PlayerEleball') {
			var props = data.object_properties;
			Q.stage().insert(new Q.PlayerEleball(props));
			console.log(selfId + ": PlayerEleball created at " + props.x + "," + props.y + " where player is at " + player.p.x + "," + player.p.y);
			console.log(selfId + ": PlayerEleball has velocities " + props.vx + "," + props.vy);
			console.log(selfId + ": PlayerEleball has collisionMask " + props.collisionMask);
		}
	});
	
	socket.on('updated', function(data) {
		// Data contains the delta (new) game state	
		
		var actor = actors.filter(function(obj) {
			return obj.playerId == data.p['playerId'];
		})[0];
		if (actor) {
			actor.player.p.x = data.p.x;
			actor.player.p.y = data.p.y;
			actor.player.p.vx = data.p.vx;
			actor.player.p.vy = data.p.vy;
			actor.player.p.fireAnimation = data.p.fireAnimation;
			actor.player.p.sheet = data.p.sheet;
			actor.player.p.maxHealth = data.p.maxHealth;
			actor.player.p.update = true;
		} else {
			var temp = new Q.Actor({
				type: data.p.type,
				x: data.p.x,
				y: data.p.y,
				sheet: data.p.sheet,
				name: data.p.name,
				currentHealth: data.p.currentHealth,
				maxHealth: data.p.maxHealth,
				playerId: data.p.playerId
			});
			actors.push({
				player: temp,
				playerId: data.p.playerId
			});
			Q.stage().insert(temp);
		}
	});
	
	socket.on('playerTookDmg', function(data) {
		console.log(data.playerId + ": playerTookDmg " + data.dmg);
		var actor = actors.filter(function(obj) {
			return obj.playerId == data.playerId;
		})[0];
		if (actor) {
			actor.player.trigger('takeDamage', {dmg: data.dmg, shooter: data.shooter});
		}
	});
	
	socket.on('playerDied', function(data) {
		console.log(data.playerId + ": playerDied");
		var deadPlayerId = data.playerId;
		console.log("deadPlayerId: " + deadPlayerId);
		for (var attrName in actors) {
			console.log("looking at actorId: " + actorId);
			var actorId = actors[attrName].playerId;
			if (actorId == deadPlayerId) {
				console.log("Destroying player " + actorId);
				actors[attrName].player.destroy();
				actors.splice(attrName, 1);
			}
		}
	});
});