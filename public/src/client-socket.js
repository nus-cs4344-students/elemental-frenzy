"use strict";

require(['src/helper-functions']);

var DEFAULT_GAMESTATE = {
  level: '',
  sprites: {PLAYER: {},
            ACTOR: {},
            PLAYERELEBALL: {},
            ENEMYELEBALL: {},
            ENEMY: {}}
};

var DEFAULT_SPRITES = { PLAYER: {},
                        ACTOR: {},
                        PLAYERELEBALL: {},
                        ENEMYELEBALL: {},
                        ENEMY: {}};

var selfId;
var sessionId;
var allSprites;
var gameState;

var creates = {
  PLAYER: function(p) { return new Q.Player(p); },
  ACTOR: function(p) { return new Q.Actor(p); },
  PLAYERELEBALL: function(p) { return new Q.PlayerEleball(p); },
  ENEMYELEBALL: function(p) { return new Q.EnemyEleball(p); },
  ENEMY: function(p) { return new Q.Enemy(p); }
};

var getJSON = function(obj){
  return JSON.stringify(obj, null, 4);
}


var cloneObject = function (obj){
  var clone = {};
  for(var oKey in obj){
    var item = obj[oKey];
    if(item instanceof Array){
      clone[oKey] = cloneArray(item);
    }else if(typeof item === 'object') {
      clone[oKey] = cloneObject(item);
    }else{
      clone[oKey] = item;
    }
  }

  return clone;
};

var cloneArray = function (arr){
  var clone = [];
  for(var i = 0; i<arr.length; i++){
    var item = arr[i];
    if(item instanceof Array){
      clone.push(cloneArray(item));
    }else if(typeof item === 'object') {
      clone.push(cloneObject(item));
    }else{
      clone.push(item);
    }
  }
  return clone;
};

var clone = function(item){
  if(item instanceof Array){
    return cloneArray(item);
  }else if(typeof item === 'object') {
    return cloneObject(item);
  }else{
    return item;
  }
};

var updateSprite = function(entityType, id, properties){
  console.log("Updating "+entityType+" id " + id);

  if(!getSprite(entityType, id)){
    console.log("Updating non existent sprite");
    return false;
  }

  if(!properties){
    console.log("Updating sprite with empty properties");
    return false;
  }

  allSprites[entityType][id].p = properties;
  return true;
}

var getSprite = function(entityType, id) {
  console.log("Getting "+entityType+" id " + id);
  return allSprites[entityType][id];
};

var getPlayerSprite = function(playerId) {
  return getSprite('PLAYER' , playerId);
};

var getEnemySprite  = function(enemyId) {
  return getSprite('ENEMY' , enemyId);
};

var getActor = function(actorId) {
  return getSprite('ACTOR' , actorId);
};

var getSpriteProperties = function(entityType, id) {
  console.log("Getting properties of "+entityType+" id " + id);
  var s = gameState[entityType][id];
  return s ? s.p : undefined;
};

var getPlayerProperties = function(playerId) {
  return getSpriteProperties('PLAYER' , playerId);
};

var getEnemyProperties  = function(enemyId) {
  return getSpriteProperties('ENEMY' , enemyId);
};

var getActorProperties  = function(actorId) {
  return getSpriteProperties('ACTOR' , actorId);
};

/*
 Create and add sprite into game state and insert it into active stage
 */
var addSprite = function(entityType, id, properties) {

  if(!properties){
    properties = {};
  }

  properties.isServerSide = false;  
  switch(entityType){
    case 'PLAYER':{
      if(id != selfId){
        entityType = 'ACTOR';
      }
    }
    // fall through
    case 'ACTOR':{
      properties.playerId = id;
      break;
    }
    case 'ENEMY':{
      properties.enemyId = id;
      break;
    }
    default:{
      properties.id = id;
      break;
    }
  }

  if(getSprite(entityType,id)){
    // sprite already exists
    console.log("Sprite " + entityType + " id " + id + "already exists");
    return false;
  }

  console.log("Adding sprite " + entityType + " id " + id);
  var sprite = creates[entityType](properties);

  // store sprite reference
  allSprites[entityType][id] = sprite;

  insertIntoStage(sprite);
  // store sprite properties into game state
  gameState.sprites[entityType][id] = {p: sprite.p}; 

  return true;
};

var addPlayer = function(playerId, properties){
  return addSprite('PLAYER', playerId, properties);
};

var addActor = function(actorId, properties){
  return addSprite('ACTOR', actorId, properties);
};

var addEnemy = function(enemyId, properties){
  return addSprite('ENEMY', enemyId, properties);
};

/*
 Delete and remove sprite from game state and remove it from active stage
 */
var removeSprite = function(entityType, id){
  console.log("Removing sprite " + entityType + " id " + id);

  if(!allSprites[entityType][id]){
    // sprite does not exists
    console.log("Sprite " + entityType + " id " + id + "does not exists");
    return false;
  }

  var sDel = allSprites[entityType][id];
  !sDel.p.serverUpdateInterval || clearInterval(sDel.p.serverUpdateInterval);
  sDel.destroy();
  delete allSprites[entityType][id];

  return true;
};

var removePlayer = function(playerId) {
  return removeSprite('PLAYER', playerId);
};

var removeActor = function(actorId) {
  return removeSprite('ACTOR', actorId);
};

var removeEnemy = function(enemyId) {
  return removeSprite('ENEMY', enemyId);
};

var insertIntoStage = function(sprite) {
  return Q.stage().insert(sprite);
};

// ## Loads the game state.
// To be used once when the player has joined the game.
var loadGameSession = function() {
  console.log("Loading game state...");

  // load default values
  gameState = gameState ? gameState : clone(DEFAULT_GAMESTATE);
  allSprites = clone(DEFAULT_SPRITES);

  // Load the level
  Q.stageScene(gameState.level);
  

  // Create and load all sprites
  var spritesToAdd = [];
  for (var entityType in gameState.sprites) {
    for (var eId in gameState.sprites[entityType]) {
      if (!gameState.sprites[entityType][eId]){
        // Invalid sprite entry
        continue;
      } else if(allSprites[entityType][eId]) {
        // Already has a sprite created!
        console.log("Sprites "+entityType+" "+eId+" already exists");
        continue;
      } else if(gameState.sprites[entityType][eId].p) {
        // if there are valid properties
        spritesToAdd.push({entityType: entityType, eId: eId, props: gameState.sprites[entityType][eId].p});
      } else{
        console.log("Unknown sprites properties");
      }
    }
  }

  for(var i =0; i< spritesToAdd.length; i++){
    addSprite(spritesToAdd[i].entityType, 
              spritesToAdd[i].eId, 
              spritesToAdd[i].props);
  }
}

var sendToApp = function(eventName, eventData){
  socket.emit('player', {eventName: eventName, eventData: eventData, senderId: selfId});
}


// when client is connected to app.js
socket.on('connected', function(data) {
  console.log("Connected as PLAYER");

  selfId = data.id;

  // TODO: Player character name/outfit selection

  // update app.js regarding session info
  sendToApp('join', {playerId: selfId});
});

// player successfully joined a session and receive game state + session info 
socket.on('joinSuccessful', function(data){
  console.log("Successfully joined session " + data.sessionId);
  sessionId = data.sessionId;
  gameState = data.gameState;

  loadGameSession();
});

// Failed to join a session
socket.on('joinFailed', function(data){
  console.log("Player "+data.playerId+" failed to join sesssion "+data.sessionId);
});

// add sprite
socket.on('addSprite', function(data){
  if(getSprite(data.p.entityType, data.p.id)){
    console.log("Sprite already exists "+getJSON(data));
    return;
  }
  console.log("data received: ");
  addSprite(data.p.entityType, data.p.id, data.p);
  console.log("game State "+getJSON(gameState));
});

// update sprite
socket.on('updateSprite', function(data){
  if(!getSprite(data.p.entityType, data.p.id)){
    
    console.log("Sprite does not exists with receiving update"+getJSON(data));
    return;
  }

  updateSprite(data.p.entityType, data.p.id, data.p);
});

// remove sprite
socket.on('removeSprite', function(data){
  if(!getSprite(data.p.entityType, data.p.id)){
    console.log("Sprite does not exists "+getJSON(data));
    return;
  }

  removeSprite(data.p.entityType, data.p.id);
});


// when session is disconnected
socket.on('Sessiondisconnected', function(){
  console.log("Session disconnected");
});

// when one or more players disconnected from app.js
socket.on('playerDisconnected', function(data) {  
  console.log("Player " + data.playerId + " from session " + sessionId + " disconnected!");
  
  // Destroy player and remove him from game state
  removePlayer(data.playerId);
});

// when app.js is disconnected
socket.on('disconnect', function(){
  console.log("App.js disconnected");

  Q.stage().pause();
});