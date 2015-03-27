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
  // Clone to avoid bad stuff happening due to references
  var clonedProps = clone(properties);
  var eType = entityType;
  if(!eType){
    console.log("Trying to update sprite without entityType");
    return;
  }

  var spriteId = id;
  switch(eType){
    case 'PLAYER':{
      if(spriteId && spriteId != selfId){
        eType = 'ACTOR';
      }
      break;
    }
    case 'ACTOR':{
      if(spriteId && spriteId == selfId){
        eType = 'PLAYER';
      }
      break;
    }
    default:{
      break;
    }
  }

  if(!spriteId){
    console.log("Trying to update sprite "+eType+"without id");
    return;
  }

  if(!clonedProps){
    console.log("Trying to update sprite "+eType+" id "+spriteId+" with empty properties");
    return;
  }

  if(!isSpriteExists(eType, spriteId)){
    console.log("Trying to update non existing sprite "+eType+" "+spriteId);
    return false;
  }

  console.log("Updated "+eType+" id " + spriteId);
  clonedProps.isServerSide = false;
  allSprites[eType][spriteId].p = clonedProps;
  gameState.sprites[eType][spriteId] = {p: clonedProps}; 

  return true;
}

var getSprite = function(entityType, id) {
  // console.log("Getting "+entityType+" id " + id);
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
  // console.log("Getting sprite properties of "+entityType+" id " + id);
  var s = getSprite(entityType,id);

  if(s){
    // console.log("Sprite properties: "+getJSON(s.p));
  }

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

var isSpriteExists = function(entityType, id){
  var eType = entityType;
  if(!eType){
    console.log("Trying to check existence of sprite without entityType");
    return;
  }

  var spriteId = id;
  switch(eType){
    case 'PLAYER':{
      if(spriteId && spriteId != selfId){
        eType = 'ACTOR';
      }
      break;
    }
    case 'ACTOR':{
      if(spriteId && spriteId == selfId){
        eType = 'PLAYER';
      }
      break;
    }
    default:{
      break;
    }
  }

  if(!spriteId){
    console.log("Trying to check existence of sprite "+eType+"without id");
    return;
  }

  return Boolean(getSprite(eType, spriteId));
}
/*
 Create and add sprite into game state and insert it into active stage
 */
var addSprite = function(entityType, id, properties) {
  var eType = entityType;
  if(!eType){
    console.log("Trying to add sprite without entityType");
    return;
  }

  var spriteId = id;
  switch(eType){
    case 'PLAYER':{
      if(spriteId && spriteId != selfId){
        eType = 'ACTOR';
      }
      break;
    }
    case 'ACTOR':{
      if(spriteId && spriteId == selfId){
        eType = 'PLAYER';
      }
      break;
    }
    default:{
      break;
    }
  }
  if(!spriteId){
    console.log("Trying to add sprite "+eType+"without id");
    return;
  }

  if(!properties){
    properties = {};
    console.log("Trying to add sprite with default properties");
  }

  properties.isServerSide = false; 

  if(isSpriteExists(eType,spriteId)){
    // sprite already exists
    console.log("Sprite " + eType + " id " + spriteId + " already exists");
    return false;
  }

  console.log("Added sprite " + eType + " id " + spriteId);
  var sprite = creates[eType](properties);

  // store sprite reference
  allSprites[eType][spriteId] = sprite;

  insertIntoStage(sprite);
  // store sprite properties into game state
  gameState.sprites[eType][spriteId] = {p: sprite.p};

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
  var eType = entityType;
  if(!eType){
    console.log("Trying to remove sprite without entityType");
    return;
  }

  var spriteId = id;
  switch(eType){
    case 'PLAYER':{
      if(spriteId && spriteId != selfId){
        eType = 'ACTOR';
      }
      break;
    }
    case 'ACTOR':{
      if(spriteId && spriteId == selfId){
        eType = 'PLAYER';
      }
      break;
    }
    default:{
      break;
    }
  }
  if(!spriteId){
    console.log("Trying to remove sprite "+eType+"without id");
    return;
  }

  if(!getSprite(eType, spriteId)){
    // sprite does not exists
    console.log("Trying to remove non existing sprite "+eType+" "+spriteId);
    return false;
  }

  console.log("Removed sprite " + eType + " id " + spriteId);

  var sDel = allSprites[eType][spriteId];
  sDel.destroy();

  delete allSprites[eType][spriteId];
  delete gameState.sprites[eType][spriteId];

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
      } else if(getSprite(entityType,eId)) {
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

  Q.el.addEventListener('keydown', function(e) {
    var createdEvt = {
      keyCode: e.keyCode
    };
    sendToApp('keydown', {sessionId: sessionId,
                          id: selfId,
                          e: createdEvt
    });
  });

  Q.el.addEventListener('keyup', function(e) {
    var createdEvt = {
      keyCode: e.keyCode
    };
    sendToApp('keyup', {sessionId: sessionId,
                          id: selfId,
                          e: createdEvt
    });
  });  

  // Event listener for firing
  Q.el.addEventListener('mouseup', function(e){
    // Client side player fires the event!
      var createdEvt = {
        changedTouches: e.changedTouches,
        x: e.x,
        y: e.y
      };
      sendToApp('mouseup', {sessionId: sessionId,
                              id: selfId,
                              e: createdEvt
      });
 
      // Trigger the fire animation of the player
      getSprite('PLAYER', selfId).trigger('fire', e);
      
      console.log("Player props: " + getJSON(getSprite('PLAYER', selfId).p));
  });

  // Viewport
  Q.stage().add("viewport").follow(getPlayerSprite(selfId));
}

var sendToApp = function(eventName, eventData){
  socket.emit('player', {eventName: eventName, eventData: eventData, senderId: selfId});
}


// when client is connected to app.js
socket.on('connected', function(data) {
  selfId = data.id;
    console.log("Connected as PLAYER "+selfId);

  // TODO: Player character name/outfit selection

  // update app.js regarding session info
  sendToApp('join', {id: selfId});
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
  console.log("Player "+selfId+" failed to join sesssion "+data.sessionId);
});

// add sprite
socket.on('addSprite', function(data){
  var props = data.p;
  if(!props){
    console.log("addSprite without properties");
    return;
  }

  var eType = props.entityType;
  if(!eType){
    console.log("addSprite without entityType in properties");
    return;
  }

  var spriteId = props.id;
  if(!spriteId){
    console.log("addSprite without id in properties");
    return;
  }

  if(isSpriteExists(eType, spriteId)){
    console.log("addSprite "+eType+" id "+spriteId+" which already exists");
    return;
  }

  addSprite(eType, spriteId, props);
});

// update sprite
socket.on('updateSprite', function(data){

  var props = data.p;
  if(!props){
    console.log("updateSprite without properties");
    return;
  }

  var eType = props.entityType;
  if(!eType){
    console.log("updateSprite without entityType in properties");
    return;
  }

  var spriteId = props.id;
  if(!spriteId){
    console.log("updateSprite without id in properties");
    return;
  }

  if(!isSpriteExists(eType, spriteId)){
    console.log("updateSprite "+eType+" id "+spriteId+" which does not exists");
    addSprite(eType, spriteId, props);
    return;
  }

  updateSprite(eType, spriteId, props);
});

// remove sprite
socket.on('removeSprite', function(data){
  var props = data.p;
  if(!props){
    console.log("removeSprite without properties");
    return;
  }

  var eType = props.entityType;
  if(!eType){
    console.log("removeSprite without entityType in properties");
    return;
  }

  var spriteId = props.id;
  if(!spriteId){
    console.log("removeSprite without id in properties");
    return;
  }

  if(!isSpriteExists(eType, spriteId)){
    console.log("removeSprite "+eType+" id "+spriteId+" which does not exists");
    return;
  }

  removeSprite(eType, spriteId, props);
});


// when session is disconnected
socket.on('Sessiondisconnected', function(){
  console.log("Session disconnected");

});

// when one or more players disconnected from app.js
socket.on('playerDisconnected', function(data) {  
  console.log("Player " + data.id + " from session " + sessionId + " disconnected!");
  
  // Destroy player and remove him from game state
  removePlayer(data.id);
});

// when app.js is disconnected
socket.on('disconnect', function(){
  console.log("App.js disconnected");

  Q.pause();
});