"use strict";

// ## Game State
Q.state.reset({
  kills : {},
  deaths : {},
  totalTime : 0,  // total time for a round in seconds (should not change for each round)
  timeLeft : 0    // time left for a round in seconds
});

var addNewPlayerToState = function(playerId) {
  var playerSprite = getSprite('PLAYER', playerId);
  if (typeof playerSprite === 'undefined') {
    console.log("Error in event in addNewPlayerToState(): player " + playerId + " is undefined");
    return;
  }
  var newState = {
    kills: Q.state.get('kills'),
    deaths: Q.state.get('deaths')
  }
  newState.kills[playerSprite.p.name] = newState.deaths[playerSprite.p.name] = 0;
  Q.state.set(newState);
}

// # Set listeners for the game state
// # When a new player joins, add it to the gamestate with 0 kills 0 deaths
Q.state.on('playerJoined', function(playerId) {
  console.log("Gamestate playerJoined event triggered");
  addNewPlayerToState(playerId);
});

// # When player dies, update the kills of the killer and the deaths of the victim
Q.state.on("playerDied", function(data) {
  console.log("Gamestate playerDied event triggered");
  var victimEntityType = data.victim.entityType,
      victimId = data.victim.spriteId,
      killerEntityType = data.killer.entityType,
      killerId = data.killer.spriteId;
      
  // Might be actors on the client side
  victimEntityType = (victimEntityType == 'PLAYER' && typeof selfId != 'undefined' && victimId != selfId) ? 'ACTOR' : victimEntityType;
  killerEntityType = (killerEntityType == 'PLAYER' && typeof selfId != 'undefined' && killerId != selfId) ? 'ACTOR' : killerEntityType;
  
  var victimName = getSprite(victimEntityType, victimId).p.name,
      killerName = getSprite(killerEntityType, killerId).p.name;
  console.log("State log: victim " + victimName + " killer " + killerName);
  
  var kills = Q.state.get('kills');
  var deaths = Q.state.get('deaths');
  
  if (typeof kills[killerName] === 'undefined') {
    console.log("Error in gamestate event playerDied: kills[" + killerName + "] is undefined");
    return;
  }
  if (typeof deaths[victimName] === 'undefined') {
    console.log("Error in gamestate event playerDied: deaths[" + victimName + "] is undefined");
    return;
  }
  
  kills[killerName]++;
  deaths[victimName]++;
  Q.state.set({kills: kills, deaths: deaths});

  console.log("Kills for player " + killerName + " is " + Q.state.get('kills')[killerName]);
  console.log("Deaths for player " + victimName + " is " + Q.state.get('deaths')[victimName]);

  //update scoreboard if it is open, and if it is not on server
  if (!(typeof Q.stage(STAGE_SCORE) === 'undefined' || Q.stage(STAGE_SCORE) === null) &&
      !isSession) {
    Q.clearStage(STAGE_SCORE);
    Q.stageScene(SCENE_SCORE, STAGE_SCORE); 
  }
  
});

// # When player disconnects, remove it from the gamestate
Q.state.on('playerDisconnected', function(playerName) {
  console.log("Gamestate playerDisconnected event triggered");
  if (typeof playerName === 'undefined') {
    console.log("Error in event in gamestate: playerDisconnected: player name is undefined");
    return;
  }
  var newState = {
    kills: Q.state.get('kills'),
    deaths: Q.state.get('deaths')
  }
  delete newState.kills[playerName];
  delete newState.deaths[playerName];
  Q.state.set(newState);
});

// # When enemy dies, update the kills of the killer only
Q.state.on("enemyDied", function(killer) {
  if (typeof killer === 'undefined') {
    return;
  }
  
  var killerEntityType = data.killer.entityType,
      killerId = data.killer.spriteId;
  var killerName = getSprite(killerEntityType, killerId).p.name;
  
  if (typeof Q.state.p.kills[killerName] === 'undefined') {
    Q.state.p.kills[killerName] = 0;
  }
  Q.state.p.kills[killerName]++;
  console.log("Kills for player " + killerName + " is " + Q.state.p.kills[killerName]);

  //update scoreboard if it is open, and if it is not on server
  if (!(typeof Q.stage(STAGE_SCORE) === 'undefined' || Q.stage(STAGE_SCORE) === null) &&
      !isSession) {
    Q.clearStage(STAGE_SCORE);
    Q.stageScene(SCENE_SCORE, STAGE_SCORE); 
  }
});