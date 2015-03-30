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

var sessions = {};
var selfId;
var sessionId;
var allSprites;
var gameState;
var isSessionConnected = false;

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
    console.log("Trying to update sprite "+eType+" without id");
    return;
  }

  // Clone to avoid bad stuff happening due to references
  var clonedProps = clone(properties);
  if(!clonedProps){
    console.log("Trying to update sprite "+eType+" id "+spriteId+" with empty properties");
    return;
  }

  if(!isSpriteExists(eType, spriteId)){
    console.log("Trying to update non existing sprite "+eType+" "+spriteId);
    return;
  }

  console.log("Updated "+eType+" id " + spriteId);
  clonedProps.isServerSide = false;
  allSprites[eType][spriteId].p = clonedProps;
  gameState.sprites[eType][spriteId] = {p: clonedProps}; 

  return;
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
  
  var eType = entityType;
  if(!eType){
    console.log("Trying to get sprite properties without entityType");
    return;
  }

  var spriteId = id;
  switch(eType){
    case 'ACTOR':{
      if(selfId == spriteId){
        eType = 'PLAYER';
      }
      break;
    }
    default:{
      break;
    }
  }

  if(!spriteId){
    console.log("Trying to get sprite properties of "+eType+" without id");
    return;
  }

  var s = getSprite(entityType,id);

  if(s){
    // console.log("Sprite properties: "+getJSON(s.p));
  }

  return s ? s.p : undefined;
};

var getPlayerProperties = function(playerId) {
  return getSpriteProperties('PLAYER', playerId);
};

var getEnemyProperties  = function(enemyId) {
  return getSpriteProperties('ENEMY' , enemyId);
};

var getEnemyEleballProperties  = function(ballId) {
  return getSpriteProperties('ENEMYELEBALL' , enemyId);
};

var getPlayerEleballProperties  = function(ballId) {
  return getSpriteProperties('PLAYERELEBALL' , ballId);
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
    console.log("Trying to check existence of sprite "+eType+" without id");
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
    console.log("Trying to add sprite "+eType+" without id");
    return;
  }

  var clonedProps = clone(properties);
  if(!clonedProps){
    clonedProps = {};
    console.log("Trying to add sprite with default properties");
  }  

  if(isSpriteExists(eType,spriteId)){
    // sprite already exists
    console.log("Sprite " + eType + " id " + spriteId + " already exists");
    return;
  }

  clonedProps.isServerSide = false; 
  console.log("Added sprite " + eType + " id " + spriteId);
  var sprite = creates[eType](clonedProps);

  // store sprite reference
  allSprites[eType][spriteId] = sprite;

  insertIntoStage(sprite);
  // store sprite properties into game state
  gameState.sprites[eType][spriteId] = {p: sprite.p};

  return sprite;
};

var addPlayerSprite = function(playerId, properties){
  return addSprite('PLAYER', playerId, properties);
};

var addEnemySprite = function(enemyId, properties){
  return addSprite('ENEMY', enemyId, properties);
};

var addEnemyEleballSprite = function(ballId, properties){
  return addSprite('ENEMYELEBALL', ballId, properties);
};

var addPlayerEleballSprite = function(ballId, properties){
  return addSprite('PLAYERELEBALL', ballId, properties);
};
var addActorSprite = function(actorId, properties){
  return addSprite('ACTOR', actorId, properties);
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
    console.log("Trying to remove sprite "+eType+" without id");
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


var removePlayerSprite = function(playerId) {
  return removeSprite('PLAYER', playerId);
};

var removeEnemySprite = function(enemyId) {
  return removeSprite('ENEMY', enemyId);
};

var removeEnemyEleballSprite = function(ballId) {
  return removeSprite('ENEMYELEBALL', ballId);
};

var removePlayerEleballSprite = function(ballId) {
  return removeSprite('PLAYERELEBALL', ballId);
};

var removeActorSprite = function(actorId) {
  return removeSprite('ACTOR', actorId);
};

var insertIntoStage = function(sprite) {
  return Q.stage(STAGE_LEVEL).insert(sprite);
};

var updateSessions = function(sessionsInfo){
  // console.log("updated sessions: "+getJSON(sessionsInfo));

  sessions = sessionsInfo;

  if(isSessionConnected){
    console.log("Sessions updated but bypassing welcome screen session update event \
                when player is connected to one of the sessions");
    return;
  }

  // refresh welcome screen
  Q.clearStage(STAGE_WELCOME);
  Q.stageScene(SCENE_WELCOME, STAGE_WELCOME);
}

var initialization = function(){

  Q.input.on('join', function(data){
    console.log("join "+getJSON(data));

    var sId = data.sessionId;
    if(!sId){
      console.log("Tring to join a session without session id");
      return;
    }

    var cId = data.characterId;
    if(!cId){
      console.log("Tring to join session "+sId+" without character id");
      return;
    }

    // send request to app.js of joining a session
    Q.input.trigger('sessionCast', {eventName:'join', eventData: {spriteId: selfId, sessionId: sId, characterId: cId}});
  });

  Q.input.on('removeSprite', function(data){

    var eType = data.entityType;
    if(!eType){
      console.log("Tring to destroy sprite without entityType");
      return;
    }    

    var spriteId = data.spriteId;
    if(!spriteId){
      console.log("Tring to destroy sprite without sprite id");
      return;
    }

    removeSprite(eType, spriteId);
  });
    
  Q.input.on('sessionCast', function(data) {

    var sId = sessionId ? sessionId : data.eventData.sessionId;
    if(!sId){
      console.log("SessionCast without sessionId");
      return;
    }

    if(!data){
      console.log("SessionCast without data");
      return;
    }

    if(!data.eventName){
      console.log("SessionCast without eventName");
      return;
    }

    data.eventData['sessionId'] = sId;
    sendToApp(data.eventName, data.eventData);
  });

  Q.input.on('appCast', function(data) {
    sendToApp(data.eventName, data.eventData);
  });

  Q.el.addEventListener('keydown', function(e) {
    if (!isSessionConnected) {
      return;
    }

    var createdEvt = {
      keyCode: e.keyCode
    };
    
    var eData = { sessionId: sessionId,
                  spriteId: selfId,
                  e: createdEvt
    };

    Q.input.trigger('sessionCast', {eventName:'keydown', eventData: eData});
  });

  Q.el.addEventListener('keyup', function(e) {
    
    if(!isSessionConnected){
      return;
    }

    var createdEvt = {
      keyCode: e.keyCode
    };

    var eData = { sessionId: sessionId,
                  spriteId: selfId,
                  e: createdEvt
    };

    Q.input.trigger('sessionCast', {eventName:'keyup', eventData: eData});
  });  

  // Event listener for firing
  Q.el.addEventListener('mouseup', function(e){
    if(!isSessionConnected){
      return;
    }

    var stage = Q.stage(STAGE_LEVEL);
    var touch = e.changedTouches ?  e.changedTouches[0] : e;
    var mouseX = Q.canvasToStageX(touch.x, stage);
    var mouseY = Q.canvasToStageY(touch.y, stage);
    // Client side player fires the event!
    var createdEvt = {
      x: mouseX,
      y: mouseY
    };

    // prevent event redirection. 
    // e.g clicking on a hypelink with redirect the browser, 
    // however by calling prevent default, redirection will not be happening
    e.preventDefault();

    var eData = { sessionId: sessionId,
                  spriteId: selfId,
                  e: createdEvt
    };

    Q.input.trigger('sessionCast', {eventName:'mouseup', eventData: eData});

    // Trigger the fire animation of the player
    getPlayerSprite(selfId).trigger('fire', createdEvt);
    
    // console.log("Player props: " + getJSON(getPlayerSprite(selfId).p));
  });
};

// ## Loads welcome screen
var loadWelcomeScreen = function(){

  // background
  Q.stageScene(SCENE_BACKGROUND, STAGE_BACKGROUND);

  // character selection
  Q.stageScene(SCENE_WELCOME, STAGE_WELCOME);
};

// ## Loads the game state.
var loadGameSession = function() {
  console.log("Loading game state...");

  // load default values
  gameState = gameState ? gameState : clone(DEFAULT_GAMESTATE);
  allSprites = clone(DEFAULT_SPRITES);

  // clear welcome screen
  Q.clearStage(STAGE_WELCOME);

  // Load the level
  Q.stageScene(gameState.level, STAGE_LEVEL);
  
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

  // Viewport
  Q.stage(STAGE_LEVEL).add("viewport").follow(getPlayerSprite(selfId));
}

var sendToApp = function(eventName, eventData){
  socket.emit('player', {eventName: eventName, eventData: eventData, senderId: selfId});
}


// when client is connected to app.js
socket.on('connected', function(data) {

  var sId = data.spriteId;
  if(!sId){
    console.log("Connected as PLAYER without id");
    return;
  }

  var s = data.sessions;
  if(!s){
    console.log("Connected as PLAYER "+selfId + " without session info");
    return;
  }

  selfId = sId;
  console.log("Connected as PLAYER "+selfId);

  updateSessions(s);

  // setup Quintus event listeners
  initialization();

  var interval_loadWelcomeScreen = setInterval(function() {
    if (_assetsLoaded) {
      // Assets must be loaded before trying to load the welcome screen. This flag will will be set once assets have been loaded.
      
      // load welcome screen
      loadWelcomeScreen();

      // Don't load a second time
      clearInterval(interval_loadWelcomeScreen);
    }
  }, 100);
});

socket.on('updateSessions', function(data){

  var s = data.sessions;
  if(!s){
    console.log("updateSessions without session info");
    return;
  }

  updateSessions(s);
});

// player successfully joined a session and receive game state + session info 
socket.on('joinSuccessful', function(data){
  console.log("Successfully joined session " + data.sessionId);
  sessionId = data.sessionId;
  gameState = data.gameState;

  isSessionConnected = true;
  
  // Asset for the game state should be loaded ahen welcome screen is loaded
  // Load the initial game state
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

  var spriteId = props.spriteId;
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
  if (!isSessionConnected) {
    return;
  }

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

  var spriteId = props.spriteId;
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

  var spriteId = props.spriteId;
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

// sprite took damage
socket.on('spriteTookDmg', function(data) {
  console.log("Event: spriteTookDmg: data: " + getJSON(data));
  var entityType = data.entityType,
      spriteId = data.spriteId;
      
  if (entityType == 'PLAYER' && spriteId != selfId) {
    // Not myself, so this is an ACTOR
    entityType = 'ACTOR';
  }
      
  var sprite = getSprite(entityType, spriteId);
  if (typeof sprite === 'undefined') {
    console.log("Error in spriteTookDmg socket event: " + entityType + " " + spriteId + " does not exist");
    return;
  }
  
  sprite.trigger('takeDamage', {dmg: data.dmg, shooter: data.shooter});
});

// sprite died
socket.on('spriteDied', function(data) {
  console.log("Event: spriteDied: data: " + getJSON(data));
  var entityType = data.entityType,
      spriteId = data.spriteId;
      
  if (entityType == 'PLAYER' && spriteId != selfId) {
    // Not myself, so this is an ACTOR
    entityType = 'ACTOR';
  }
  
  var sprite = getSprite(entityType, spriteId);
  if (typeof sprite === 'undefined') {
    console.log("Error in spriteDied socket event: " + entityType + " " + spriteId + " does not exist");
    return;
  }
  
  sprite.die(data.killer);
});


// when session is disconnected
socket.on('sessionDisconnected', function(){
  console.log("Session disconnected");

  Q.clearStage(STAGE_LEVEL);
  isSessionConnected = false;
});

// when one or more players disconnected from app.js
socket.on('playerDisconnected', function(data) {  
  console.log("Player " + data.spriteId + " from session " + sessionId + " disconnected!");
  
  // Destroy player and remove him from game state
  removePlayer(data.spriteId);
});

// when app.js is disconnected
socket.on('disconnect', function(){
  console.log("App.js disconnected");

  Q.pause();
});