"use strict";

require(['src/helper-functions']);

var DEFAULT_LEVEL = 'level2';
var DEFAULT_ENEMIES = {"1": {p: {x: 700, y: 0, enemyId: 1}}, 
                      "2": {p: {x: 800, y: 0, enemyId: 2}}};

var DEFAULT_GAMESTATE = {
  level: DEFAULT_LEVEL,
  sprites: {
    PLAYER: {},
    ACTOR: {},
    PLAYERELEBALL: {},
    ENEMYELEBALL: {},
    ENEMY: DEFAULT_ENEMIES
  },
  nextId: {
    PLAYER: 5,
    ACTOR: 1,
    PLAYERELEBALL: 1,
    ENEMYELEBALL: 1,
    ENEMY: 3
  }
};

var DEFAULT_SESSION ={
  playerCount: 0,
  playerMaxCount: 5,
  playerIds: {},
  sessionId: 0
}

var gameState;
var session;

var cloneObject = function (obj){
  var clone = {};
  for(var oKey in obj){
    clone[oKey] = obj[oKey];
  }

  return clone;
}

// ## Helper Functions
var loadGameSession = function(sessionId) {
  console.log("Loading game state...");
  
  // initialize game state and sesion
  gameState = cloneObject(DEFAULT_GAMESTATE);
  session = cloneObject(DEFAULT_SESSION);
  session.sessionId = sessionId;
  
  // Load gameState default level, and insert the stage into the gameState
  Q.stageScene(gameState.level);
  gameState.stage = Q.stage();
  
  // Load enemies, if any
  for (var i in gameState.sprites['ENEMY']) { 
    if (gameState.sprites['ENEMY'][i].sprite) {
      // Already has a sprite created!
      continue;
    } else if(gameState.sprites['ENEMY'][i] && gameState.sprites['ENEMY'][i].p) {
      // if there are valid properties
      var sprite = creates['ENEMY'](gameState.sprites['ENEMY'][i].p);
      addEnemy(sprite);
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

var creates = {
  PLAYER: function(p) { return new Q.Player(p); },
  ACTOR: function(p) { return new Q.Actor(p); },
  PLAYERELEBALL: function(p) { return new Q.PlayerEleball(p); },
  ENEMYELEBALL: function(p) { return new Q.EnemyEleball(p); },
  ENEMY: function(p) { return new Q.Enemy(p); }
};


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
}

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
}

var getPlayer = function(playerId) {
  console.log("Getting player with player id " + playerId);
  return gameState.sprites['PLAYER'][playerId].sprite;
}

var addSprite = function(entityType, id, sprite) {
  console.log("Adding sprite with id " + id + " entityType " + entityType);
  gameState.sprites[entityType][id] = {
    sprite: sprite
  };
  insertIntoStage(sprite);
}

var addPlayer = function(player) {
  player.isServerSide = true;
  addSprite('PLAYER', player.p.playerId, player);
}

var addEnemy = function(enemy) {
  enemy.isServerSide = true;
  addSprite('ENEMY', enemy.p.enemyId, enemy);
}

var destroyPlayer = function(playerId) {
  // if there exists any "PLAYER" sprite
  if (gameState.sprites['PLAYER']) {
    // if there exists a "PLAYER" sprite with playerId
    if (gameState.sprites['PLAYER'][playerId]) {
      gameState.sprites['PLAYER'][playerId].sprite.destroy();
    }
    delete gameState.sprites['PLAYER'][playerId];
    console.log("Destroyed sprite player id " + playerId);
  }
}

var insertIntoStage = function(sprite) {
  return gameState.stage.insert(sprite);
}

var sendToApp = function(eventName, eventData){
  socket.emit('session', {eventName: eventName, eventData: eventData, senderId:session.sessionId});
}



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
    // player joined and creates sprite for it
    var sprite = creates['PLAYER'](data.playerId);
    addPlayer(sprite);

    // update app.js regarding session info
    sendToApp('updateSession', session);
  }else{
    // update app.js regarding joinSession failed
    sendToApp('joinFailed', {playerId: data.playerId});
  }
});

// when one or more players disconnected from app.js
socket.on('playerDisconnected', function(data) {  
  console.log("Player " + data.playerId + " from session " + session.sessionId + " disconnected!");
  
  // remove player from the session
  leaveSession(data.playerId);
  // Destroy player and remove him from game state
  destroyPlayer(data.playerId);
  // update app.js regarding session info
  sendToApp('updateSession', session);
});

// when app.js is disconnected
socket.on('disconnect', function(){
  console.log("App.js is disconnected");

  // resetGameSession();
});