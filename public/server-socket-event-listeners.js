"use strict";

var gameStates = []; // indexed by session id

var serverId;

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
	loadGameState(gameStates[data.sessionId]);
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
	data.p.isServerSide = true;
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
var loadGameState = function(gameState) {
	console.log("Loading game state...");
	
	// Get game state data
	var level = gameState.level,
		players = gameState.players,
		eleballs = gameState.eleballs,
		enemies = gameState.enemies;
	
	// Load the level, and insert the stage into the gameState
	console.log("Loading the level " + level);
	Q.stageScene(level);
	gameState.stage = Q.stage();
	
	// Viewport
	Q.stage().add("viewport");
	Q.input.on('keydown', function(keyCode) {
		if (Q.input.keys[keyCode]) {
			var actionName = Q.input.keys[keyCode];
			var x = Q.stage().viewport.x;
			var y = Q.stage().viewport.y;
			var speed = 20;
			if (actionName == 'up') {
				Q.stage().viewport.moveTo(x, y-speed);
			} else if (actionName == 'down') {
				Q.stage().viewport.moveTo(x, y+speed);
			} else if (actionName == 'left') {
				Q.stage().viewport.moveTo(x-speed, y);
			} else if (actionName == 'right') {
				Q.stage().viewport.moveTo(x+speed, y);
			}
		}
	});
}

Q.component("serverPlatformerControls", {
    defaults: {
      speed: 200,
      jumpSpeed: -300,
      collisions: []
    },

    added: function() {
      var p = this.entity.p;
	  
	  this.entity.inputs = [];

      Q._defaults(p,this.defaults);

      this.entity.on("step",this,"step");
      this.entity.on("bump.bottom",this,"landed");

      p.landed = 0;
      p.direction ='right';
    },

    landed: function(col) {
      var p = this.entity.p;
      p.landed = 1/5;
    },

    step: function(dt) {
      var p = this.entity.p;
	  
	  console.log("Step, inputs[right] is " + this.entity.inputs['right']);
	  if (this.entity.inputs['right']) {
		  console.log("Should be moving right");
	  }

      if(p.ignoreControls === undefined || !p.ignoreControls) {
        var collision = null;

        // Follow along the current slope, if possible.
        if(p.collisions !== undefined && p.collisions.length > 0 && (this.entity.inputs['left'] || this.entity.inputs['right'] || p.landed > 0)) {
          if(p.collisions.length === 1) {
            collision = p.collisions[0];
          } else {
            // If there's more than one possible slope, follow slope with negative Y normal
            collision = null;

            for(var i = 0; i < p.collisions.length; i++) {
              if(p.collisions[i].normalY < 0) {
                collision = p.collisions[i];
              }
            }
          }

          // Don't climb up walls.
          if(collision !== null && collision.normalY > -0.3 && collision.normalY < 0.3) {
            collision = null;
          }
        }

        if(this.entity.inputs['left']) {
          p.direction = 'left';
          if(collision && p.landed > 0) {
            p.vx = p.speed * collision.normalY;
            p.vy = -p.speed * collision.normalX;
          } else {
            p.vx = -p.speed;
          }
        } else if(this.entity.inputs['right']) {
          p.direction = 'right';
          if(collision && p.landed > 0) {
            p.vx = -p.speed * collision.normalY;
            p.vy = p.speed * collision.normalX;
          } else {
            p.vx = p.speed;
          }
        } else {
          p.vx = 0;
          if(collision && p.landed > 0) {
            p.vy = 0;
          }
        }

        if(p.landed > 0 && (this.entity.inputs['up'] || this.entity.inputs['action']) && !p.jumping) {
          p.vy = p.jumpSpeed;
          p.landed = -dt;
          p.jumping = true;
        } else if(this.entity.inputs['up'] || this.entity.inputs['action']) {
          this.entity.trigger('jump', this.entity);
          p.jumping = true;
        }

        if(p.jumping && !(this.entity.inputs['up'] || this.entity.inputs['action'])) {
          p.jumping = false;
          this.entity.trigger('jumped', this.entity);
          if(p.vy < p.jumpSpeed / 3) {
            p.vy = p.jumpSpeed / 3;
          }
        }
      }
      p.landed -= dt;
    }
  });

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