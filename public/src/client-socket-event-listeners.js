"use strict";

// ## Socket event listeners

var selfId;
var actors = [];

socket.on('connected', function(data1) {
	selfId = data1.playerId;
	console.log("Connected to server as player " + selfId);
	
	Q.stageScene('level3');
	
	// ## Event listeners for data received from server
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

		// REMOVED: short circuit actor damage at client side
		// if (actor) {
		// 	actor.player.takeDamage(data);
		// }
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