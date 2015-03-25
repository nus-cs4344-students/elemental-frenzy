"use strict";

require(['src/helper-functions']);

var DEFAULT_LEVEL = 'level2';
var DEFAULT_ENEMIES = {"1": {p: {x: 700, y: 0, enemyId: 1, isServerSide: true}}, 
                       "2": {p: {x: 800, y: 0, enemyId: 2, isServerSide: true}}};
var DEFAULT_SPRITES = { PLAYER: {},
                        ACTOR: {},
                        PLAYERELEBALL: {},
                        ENEMYELEBALL: {},
                        ENEMY: {}};

var DEFAULT_GAMESTATE = {
  level: DEFAULT_LEVEL,
  sprites: {PLAYER: {},
            ACTOR: {},
            PLAYERELEBALL: {},
            ENEMYELEBALL: {},
            ENEMY: {}}
};

var DEFAULT_SESSION = {
  playerCount: 0,
  playerMaxCount: 5,
  playerIds: {},
  sessionId: 0
};

var gameState;
var session;
var allSprites;

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
    clone[oKey] = typeof item === 'object' ? cloneObject(item) : item; 
  }

  return clone;
};

var getSprite = function(entityType, id) {
  console.log("Getting properties of "+entityType+" id " + id);
  return allSprites[entityType][id];
};

var getPlayerSprite = function(playerId) {
  return getSprite('PLAYER' , playerId);
};

var getEnemySprite  = function(enemyId) {
  return getSprite('ENEMY' , enemyId);
};

var getSpriteProperties = function(entityType, id) {
  console.log("Getting "+entityType+" id " + id);
  var s = gameState.sprites[entityType][id];
  return s ? s.p : undefined;
};

var getPlayerProperties = function(playerId) {
  return getSpriteProperties('PLAYER' , playerId);
};

var getEnemyProperties  = function(enemyId) {
  return getSpriteProperties('ENEMY' , enemyId);
};


/*
 Create and add sprite into game state and insert it into active stage
 */
var addSprite = function(entityType, id, properties) {
  console.log("Adding sprite " + entityType + " id " + id);

  if(allSprites[entityType][id]){
    // sprite already exists
    console.log("Sprite " + entityType + " id " + id + "already exists");
    return false;
  }

  if(!properties){
    properties = {};
  }

  var sprite = creates[entityType](properties);
  sprite.p.isServerSide = true;
  
  switch(entityType){
    case 'PLAYER':{
      sprite.p.playerId = id;
      break;
    }
    case 'ENEMY':{
      sprite.p.enemyId = id;
      break;
    }
    default:{
      sprite.p.id = id;
      break;
    }
  }

  // disable keyboard controls and listen to controls' event
  if(sprite.has('platformerControls')){
    sprite.del('platformerControls');
    sprite.add('serverPlatformerControls');
    // sprite.add('serverSide');
  }

  // store sprite reference
  allSprites[entityType][id] = sprite;
  
  // store sprite properties into game state
  gameState.sprites[entityType][id] = {p: sprite.p};

  insertIntoStage(sprite);
  return true;
};

var addPlayer = function(playerId, properties){
  return addSprite('PLAYER', playerId, properties);
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


var removeEnemy = function(enemyId) {
  return removeSprite('ENEMY', enemyId);
};

var insertIntoStage = function(sprite) {
  return Q.stage().insert(sprite);
};


// ## Helper Functions
var loadGameSession = function(sessionId) {
  console.log("Loading game state...");

  // initialize game state and sesion
  gameState = cloneObject(DEFAULT_GAMESTATE);
  session = cloneObject(DEFAULT_SESSION);
  session.sessionId = sessionId;
  allSprites = cloneObject(DEFAULT_SPRITES);

  // Load gameState default level
  Q.stageScene(gameState.level);


  // Create and load all sprites
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
        addSprite(entityType, eId, gameState.sprites[entityType][eId].p);
      } else{
        console.log("Unknown sprites properties");
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

var joinSession = function(playerId) {
 
  // session full
  if(session.playerCount >= session.playerMaxCount){
    console.log("Session "+sesion.sessionId +" is full");
    return false;
  }

  // make sure the player is not in the session already
  if(session.playerIds){
    for(var p in session.playerIds){
      
      // player already joins the session
      if(session.playerIds[p] == playerId){
        console.log("Player "+playerId+" is already in session "+session.sessionId);
        return false;
      }
    }
  }

  // player can join the session
  session.playerIds[playerId] = playerId;
  session.playerCount++;

  return true;
};

var leaveSession = function(playerId) {
 
  // session empty
  if(session.playerCount <= 0){
    return false;
  }

  if(!session.playerIds[playerId]){
    console.log("Unable to remove player from session");
    return;
  }

  // player removed from session
  delete session.playerIds[playerId];
  session.playerCount--;

  return true;
};

var getOtherPlayers = function(playerId){
  var others = {};
  for(var p in session.players){
    if(p !== playerId){
      others[p] = session.players[p];
    }
  }
  return others;
};

var sendToApp = function(eventName, eventData){
  socket.emit('session', {eventName: eventName, eventData: eventData, senderId: session.sessionId});
};



// when session is connected to app.js
socket.on('connected', function(data) {
  console.log("Connected as SESSION");
  
  // Load the initial game state
  loadGameSession(data.id);

  // update app.js regarding session info
  sendToApp('updateSession', session);
});


// when a player request to join
socket.on('join', function(data) {  
  console.log("Player " + data.playerId + " requests to join");

  // try to put the player into  the session
  var isJoined = joinSession(data.playerId);
  
  if(isJoined){
    // console.log("gameState joined - "+getJSON(gameState));

    // add player and creates sprite for it
    addPlayer(data.playerId);
    
    // update app.js regarding session info
    sendToApp('updateSession', session);
    // update the new player
    sendToApp('joinSuccessful', {playerId: data.playerId, gameState: gameState, sessionId: session.sessionId});
    // update other players
    var pList = getOtherPlayers(data.playerId);
    sendToApp('addSprite', {players: pList, p: getPlayerProperties(data.playerId)});
  }else{
    // update app.js regarding joinSession failed
    sendToApp('joinFailed', {playerId: data.playerId, senderId: session.sessionId});
  }
});

// when one or more players disconnected from app.js
socket.on('playerDisconnected', function(data) {  
  console.log("Player " + data.playerId + " from session " + session.sessionId + " disconnected!");
  
  // remove player from the session
  leaveSession(data.playerId);
  // Destroy player and remove him from game state
  removePlayer(data.playerId);
  // update app.js regarding session info
  sendToApp('updateSession', session);
  // inform every other player about the player disconnection
  var pList = getOtherPlayers(data.playerId);
  sendToApp('removeSprite', {players: pList, p: getPlayerProperties(data.playerId)});
});

// when app.js is disconnected
socket.on('disconnect', function(){
  console.log("App.js is disconnected");

  Q.stage().pause();
});