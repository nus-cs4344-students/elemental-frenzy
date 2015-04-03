"use strict";

// ## Game State
Q.state.reset({
  kills : {},
  deaths : {}
});
// # Set listeners for the game state
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
    kills[killerName] = 0;
    Q.state.set('kills', kills);
    
    deaths[killerName] = 0;
    Q.state.set('deaths', deaths);
  }
  if (typeof deaths[victimName] === 'undefined') {
    kills[victimName] = 0;
    Q.state.set('kills', kills);
    
    deaths[victimName] = 0;
    Q.state.set('deaths', deaths);
  }
  kills[killerName]++;
  deaths[victimName]++;
  Q.state.set({kills: kills, deaths: deaths});
  //Q.state.p.kills[killerName]++;
  //Q.state.p.deaths[victimName]++;
  console.log("Kills for player " + killerName + " is " + Q.state.get('kills')[killerName]);
  console.log("Deaths for player " + victimName + " is " + Q.state.get('deaths')[victimName]);

  //update scoreboard if it is open, and if it is not on server
  if (!(typeof Q.stage(STAGE_SCORE) === 'undefined' || Q.stage(STAGE_SCORE) === null) &&
      !isSession) {
    Q.clearStage(STAGE_SCORE);
    Q.stageScene(SCENE_SCORE, STAGE_SCORE); 
  }
  
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