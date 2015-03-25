"use strict";

require(['src/helper-functions']);

var selfId;
var sessionId;
var gameRunning = false;
var gameState = {
  level: '',
  sprites: {
    PLAYER: {},
    ACTOR: {},
    PLAYERELEBALL: {},
    ENEMYELEBALL: {},
    ENEMY: {}
  }
}; 
var initialPlayerProps;

// The sprites currently in the game, all indexed by id
var sprites = {
  PLAYER: {},     
  ACTOR: {},      
  PLAYERELEBALL: {},
  ENEMYELEBALL: {},
  ENEMY: {}
};

// ## Functions to create sprites for our game
var creates = {
  PLAYER: function(p) { return new Q.Player(p); },
  ACTOR: function(p) { return new Q.Actor(p); },
  PLAYERELEBALL: function(p) { return new Q.PlayerEleball(p); },
  ENEMYELEBALL: function(p) { return new Q.EnemyEleball(p); },
  ENEMY: function(p) { return new Q.Enemy(p); }
};

// ## Helper function to get the sprite stored in the game state of the 
var getSprite = function(entityType, id) {
  return gameState.sprites[entityType][id].sprite;
}
// ## Helper function to check if the <entityType, id> pair exists at all.
// This does NOT mean that the sprite has been created.
var checkSpriteExists = function(entityType, id) {
  return (typeof gameState.sprites[entityType][id] != 'undefined');
}


var sendToApp = function(eventName, eventData){
  socket.emit('player', {eventName: eventName, eventData: eventData, senderId:selfId});
}



// when session is connected to app.js
socket.on('connected', function(data) {
  console.log("Connected as PLAYER");

  selfId = data.id;

  // TODO: Player character name/outfit selection

  // update app.js regarding session info
  sendToApp('join', {playerId: selfId});
});

// when session is disconnected
socket.on('Sessiondisconnected', function(){
  console.log("Session disconnected");
});

// when app.js is disconnected
socket.on('disconnect', function(){
  console.log("App.js disconnected");

});