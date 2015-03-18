"use strict";

// ## Socket event listeners

var selfId;
var sessionId;
var gameRunning = false;
var gameState = {
	level: '',
	sprites: {
		PLAYER: [],
		ACTOR: [],
		PLAYERELEBALL: [],
		ENEMYELEBALL: [],
		ENEMY: []
	}
}; 
var actors = [];

// The sprites currently in the game, all indexed by id
var sprites = {
	PLAYER: [],			
	ACTOR: [],			
	PLAYERELEBALL: [],
	ENEMYELEBALL: [],
	ENEMY: []
};

// ## Functions to create sprites for our game
var creates = {
	PLAYER: function(p) { return new Q.Player(p); },
	ACTOR: function(p) { return new Q.Actor(p); },
	PLAYERELEBALL: function(p) { return new Q.PlayerEleball(p); },
	ENEMYELEBALL: function(p) { return new Q.EnemyEleball(p); },
	ENEMY: function(p) { return new Q.Enemy(p); }
};

// ## Loads the game state.
// To be used once when the player has joined the game.
var loadGameState = function() {
	console.log("Loading game state... selfId " + selfId);
	
	// Get game state data
	var level = gameState.level;
		
	// Load the level
	console.log("Loading the level " + level);
	gameState.stage = Q.stageScene(level);
	
	var player;
	// Create and load sprites
	console.log("There are " + gameState.sprites['PLAYER'].length + " players!!!");
	for (var attrName in gameState.sprites) {
		for (var i in gameState.sprites[attrName]) {	
			if ( !gameState.sprites[attrName][i] || !gameState.sprites[attrName][i].p) {
				// Been deleted, or already has a sprite created!
				continue;
			} else if (attrName == 'PLAYER' && gameState.sprites[attrName][i].p.playerId != selfId) {
				// Not a true PLAYER, don't create sprite (this is handled during the update step)
				continue;
			} else {	
				// Else, create sprite!
				if (gameState.sprites[attrName][i]) {
					console.log("Creating sprite " + attrName + " for id " + i);
					console.log(gameState.sprites[attrName][i].p);
					var sprite = creates[attrName](gameState.sprites[attrName][i].p);
					gameState.stage.insert(sprite);
					gameState.sprites[attrName][i] = {
						sprite: sprite
					};
					
					if (attrName == 'PLAYER' && sprite.p.playerId == selfId) {
						console.log("Player FOUND");
						player = sprite;
						console.log(player.p.sheet);
					}
				}
			}
		}
	}
	gameState.stage.insert(sprite);
	Q.stage().add("viewport").follow(player);
}

// ## Helper function to get the sprite stored in the game state of the 
var getSprite = function(entityType, id) {
	return gameState.sprites[entityType][id].sprite;
}
// ## Helper function to check if the <entityType, id> pair exists at all.
// This does NOT mean that the sprite has been created.
var checkSpriteExists = function(entityType, id) {
	return (typeof gameState.sprites[entityType][id] != 'undefined');
}

socket.on('connected', function(data1) {
	selfId = data1.playerId;
	sessionId = data1.sessionId;
	gameState = {
		level: data1.gameState.level,
		sprites: data1.gameState.sprites
	}
	
	console.log("Connected to server as player " + selfId + " in session " + sessionId);
	
	// Tell server that you have joined
	socket.emit('joined', { playerId: selfId });
	//Q.stageScene('level3');
	
	// ## Event listeners for data received from server
	socket.on('playerJoined', function(data) {
		console.log("Player " + data.playerId + " joined");
		
		if (data.playerId == selfId) {
			// It is the player himself, so it is time to load the game for the player to play!
			gameState.sprites['PLAYER'][data.playerId] = {
				p: data.p
			};
			loadGameState();
			gameRunning = true;
		}
	});
	
	socket.on('playerDisconnected', function(data) {
		console.log("Player " + data.playerId + " disconnected");
		
		if (gameState.sprites['ACTOR'][data.playerId]) {
			var sprite = getSprite('ACTOR', data.playerId);
			if (sprite) {
				sprite.destroy();
				gameState.sprites['ACTOR'].splice(data.playerId, 1);
			}
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
		console.log("Got update from id " + data.id);
		
		// No longer server side
		data.p.isServerSide = false;
		
		if (data.entityType == 'PLAYER') {
			// Check if the data.entityType is player and if the playerId is myself or not
			// If it is not then it is an ACTOR!
			if (!selfId || data.playerId != selfId) {
				data.entityType = 'ACTOR';
			}
		}
		
		if ( !gameState.sprites[data.entityType][data.id] || !gameState.sprites[data.entityType][data.id].sprite) {
			// New sprite! Create it and add into gamestate and add it to the stage (if game is running)
			if (gameRunning) {
				// Insert sprite only if running
				var sprite = creates[data.entityType](data.p);
				gameState.sprites[data.entityType][data.id] = {
					sprite: sprite
				}
				console.log("Creating sprite " + data.entityType + " for id " + data.id);
				Q.stage().insert(sprite);
			} else {
				// Otherwise just insert the properties for loadGameState to do the sprite insertion
				gameState.sprites[data.entityType][data.id] = {
					p: data.p
				}
			}
		} else {
			// Sprite exists, so just update it
			data.p.update = true;
			console.log("Updating " + data.entityType + " with id " + data.id + " with update " + data.p.update);
			var sprite = getSprite(data.entityType, data.id);
			sprite.p = data.p;
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