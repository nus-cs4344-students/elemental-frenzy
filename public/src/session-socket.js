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
            ENEMY: {}
           } 
};

var DEFAULT_SESSION = {
  playerCount: 0,
  playerMaxCount: 4,
  players: {},
  sessionId: 0
};

var gameState;
var session;
var allSprites;
var spriteId=0;

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

var getNextSpriteId = function(){
  return ++spriteId;
}

var getSprite = function(entityType, id) {
  // console.log("Getting sprite of "+entityType+" id " + id);
  return allSprites[entityType][id];
};

var getPlayerSprite = function(playerId) {
  return getSprite('PLAYER' , playerId);
};

var getEnemySprite  = function(enemyId) {
  return getSprite('ENEMY' , enemyId);
};

var getPlayerEleballSprite = function(ballId) {
  return getSprite('PLAYERELEBALL' , ballId);
};

var getEnemyEleballSprite  = function(ballId) {
  return getSprite('ENEMYELEBALL' , ballId);
};


var getSpriteProperties = function(entityType, id) {
  // console.log("Getting sprite properties of "+entityType+" id " + id);

  var eType = entityType;
  if(!eType){
    console.log("Trying to get sprite properties without entityType");
    return;
  }

  switch(eType){
    case 'ACTOR':{
      eType = 'PLAYER';
      break;
    }
    default:{
      break;
    }
  }

  var spriteId = id;
  if(!spriteId){
    console.log("Trying to get sprite properties of "+eType+" without id");
    return;
  }

  var s = getSprite(eType,spriteId);

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

var isSpriteExists = function(entityType, id){
  var eType = entityType;
  if(!eType){
    console.log("Trying to check existence of sprite without entityType");
    return;
  }

  switch(eType){
    case 'ACTOR':{
      eType = 'PLAYER';
      break;
    }
    default:{
      break;
    }
  }

  var spriteId = id;
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

  var spriteNeedUpdateInterval = false;
  switch(eType){
    case 'ACTOR':{
      eType = 'PLAYER';
    } // fall through
    case 'PLAYER':
    case 'ENEMY':{
      spriteNeedUpdateInterval = true;
      break;
    }
    default:{
      spriteNeedUpdateInterval = false;
      break;
    }
  }

  var spriteId = id;
  if(!spriteId){
    console.log("Trying to add sprite "+eType+" without id");
    return;
  }

  // console.log("Cloning properties for sprite " + eType + " id " + spriteId + " before creating it: " + getJSON(properties));
  var clonedProps = clone(properties);
  if(!clonedProps){
    clonedProps = {};
    console.log("Trying to add sprite with default properties");
  }

  if(getSprite(eType,spriteId)){
    // sprite already exists
    console.log("Sprite " + eType + " id " + spriteId + " already exists");
    return false;
  }

  clonedProps.spriteId = spriteId;
  clonedProps.isServerSide = true;  
  clonedProps.sessionId = session.sessionId;

  var sprite = creates[eType](clonedProps);
  console.log("Added sprite " + eType + " id " + spriteId + " which has properties p: " + getJSON(sprite.p));

  // disable keyboard controls and listen to controls' event
  if(sprite.has('platformerControls')){
    sprite.del('platformerControls');
    sprite.add('serverPlatformerControls');
  }

  if(spriteNeedUpdateInterval){
    sprite.add('serverSprite'); 
  }

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


/*
 Delete and remove sprite from game state and remove it from active stage
 */
var removeSprite = function(entityType, id){
  var eType = entityType;
  if(!eType){
    console.log("Trying to remove sprite without entityType");
    return;
  }

  switch(eType){
    case 'ACTOR':{
      eType = 'PLAYER';
      break;
    }
    default:{
      break;
    }
  }

  var spriteId = id;
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

var insertIntoStage = function(sprite) {
  return Q.stage(STAGE_LEVEL).insert(sprite);
};

var initialization = function(){

  Q.input.on('broadcastAll', function(data) {

    if(!session.players){
      console.log("Session has no players");
      return;
    }

    data.eventData['players'] = session.players;
    sendToApp(data.eventName, data.eventData);
  });

   Q.input.on('broadcastOthers', function(data) {
    
    var sId = data.senderId;
    if(!sId){
      console.log("BroadcastOthers without senderId");
      return;
    }

    data.eventData['players'] = getOtherPlayers(sId);
    sendToApp(data.eventName, data.eventData);
  });

  Q.input.on('singleCast', function(data) {
    
    var pId = data.receiverId;
    if(!pId){
      console.log("SingleCast without receiverId");
      return;
    }

    data.eventData['players'] = {};
    data.eventData.players[pId] = pId;
    sendToApp(data.eventName, data.eventData);
  });

  Q.input.on('appCast', function(data) {
    sendToApp(data.eventName, data.eventData);
  });

  Q.el.addEventListener('keydown', function(e) {

    var keyCode = e.keyCode;

    if (Q.input.keys[keyCode] && Q.stage(STAGE_LEVEL).has('viewport')) {
      var actionName = Q.input.keys[keyCode];
      var x = Q.stage(STAGE_LEVEL).viewport.x;
      var y = Q.stage(STAGE_LEVEL).viewport.y;
      var speed = 10;
      if (actionName == 'server_up') {
        Q.stage(STAGE_LEVEL).viewport.moveTo(x, y-speed);
      } else if (actionName == 'server_down') {
        Q.stage(STAGE_LEVEL).viewport.moveTo(x, y+speed);
      } else if (actionName == 'server_left') {
        Q.stage(STAGE_LEVEL).viewport.moveTo(x-speed, y);
      } else if (actionName == 'server_right') {
        Q.stage(STAGE_LEVEL).viewport.moveTo(x+speed, y);
      }
    }
  });
};

var loadGameSession = function(sessionId) {
  if(!sessionId){
    console.log("Trying to load game session without seesion id");
    return;
  }

  console.log("Loading game state...");

  // initialize game state and sesion
  gameState = clone(DEFAULT_GAMESTATE);
  session = clone(DEFAULT_SESSION);
  session.sessionId = sessionId;
  allSprites = clone(DEFAULT_SPRITES);

  // Load background
  Q.stageScene(SCENE_BACKGROUND, STAGE_BACKGROUND);
  
  // Load gameState default level
  Q.stageScene(gameState.level, STAGE_LEVEL);

  // Viewport
  Q.stage(STAGE_LEVEL).add("viewport");

  // Create and load all sprites
  var spritesToAdd = [];
  for (var entityType in gameState.sprites) {
    for (var eId in gameState.sprites[entityType]) {
      if (!gameState.sprites[entityType][eId]) {
        // Invalid sprite entry
        continue;
      } else if(isSpriteExists(entityType,eId)) {
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
};

var pressKey = function(player, keyCode) {
  if(!player){
    console.log("Player without sprite released the key");
    return;
  }

  if(!keyCode){
    console.log("Player released unknown key");
    return;
  }

  
  if(Q.input.keys[keyCode]) {
    var actionName = Q.input.keys[keyCode];
    player.inputs[actionName] = true;
    Q.input.trigger(actionName);
    Q.input.trigger('keydown',keyCode);
  }
};

var releaseKey = function(player, keyCode) {
  if(!player){
    console.log("Player without sprite released the key");
    return;
  }

  if(!keyCode){
    console.log("Player released unknown key");
    return;
  }


  if(Q.input.keys[keyCode]) {
    var actionName = Q.input.keys[keyCode];
    player.inputs[actionName] = false;
    Q.input.trigger(actionName + "Up");
    Q.input.trigger('keyup',keyCode);
  }
};

var joinSession = function(playerId, characterId) {

  var pId = playerId;
  if(!pId){
    console.log("Trying to let a player to join session without player id");
    return;
  }

  var cId = characterId;
  if(!cId){
    console.log("Trying to let player "+pId+" to join session without character id");
    return;
  }

  // session full
  if(session.playerCount >= session.playerMaxCount){
    console.log("Session "+sesion.sessionId +" is full");
    return false;
  }

  // make sure the player is not in the session already
  if(session.players){
    // player already joins the session
    if(session.players[pId]){
      console.log("Player "+pId+" is already in session "+session.sessionId);
      return false;
    }

    for(var p in session.players){
      if(session.players[p] == cId){
        console.log("Character "+cId+" is already used by Player "+p+" in session "+session.sessionId);
        return false;
      }
    }
  }

  // player can join the session
  session.players[pId] = cId;
  session.playerCount++;

  return true;
};

var leaveSession = function(playerId) {
  if(!playerId){
    console.log("Trying to make a player leave it session without player id");
    return;
  }

  // session empty
  if(session.playerCount <= 0){
    return false;
  }

  if(!session.players[playerId]){
    console.log("Unable to remove player from session");
    return;
  }

  // player removed from session
  delete session.players[playerId];
  session.playerCount--;

  return true;
};

var getOtherPlayers = function(playerId){
  if(!playerId){
    console.log("Trying to get other players without current player id");
    return;
  }

  var others = {};
  for(var p in session.players){
    if(p != playerId){
      others[p] = session.players[p];
    }
  }
  return others;
};

var sendToApp = function(eventName, eventData){
  if(!eventName){
    console.log("Session trying to send to App without event name");
    return;
  }

  if(!eventData){
    console.log("Session trying to send to App without event data");
    return;
  }

  socket.emit('session', {eventName: eventName, eventData: eventData, senderId: session.sessionId});
};



// when session is connected to app.js
socket.on('connected', function(data) {
  
  var sId = data.sessionId;
  if(!sId){
    console.log("Connected as SESSION without id");
    return;
  }

  console.log("Connected as SESSION "+sId);
  
  // setup Quintus event listeners
  initialization();

  var interval_loadGameSession = setInterval(function() {
    if (_assetsLoaded) {
      // Assets must be loaded before trying to load the game session. This flag will will be set once assets have been loaded.
      
      // Load the initial game state
      loadGameSession(sId);
      
      // update app.js regarding session info
      Q.input.trigger('appCast', {eventName:'updateSession', eventData: session});
      
      // Don't load a second time
      clearInterval(interval_loadGameSession);
    }
  }, 100);
});


// when a player request to join
socket.on('join', function(data) {
  
  var pId = data.spriteId;
  if(!pId){
    console.log("Player without sprite id requests to join");
    return;
  }

  var cId = data.characterId;
  if(!cId){
    console.log("Player without character id requests to join");
    return;
  }

  console.log("Player " + pId + " requests to join as character "+cId);

  // try to put the player into  the session
  var isJoined = joinSession(pId, cId);
  
  if(isJoined){
    // console.log("gameState joined - "+getJSON(gameState));

    // add player and creates sprite for it
    addPlayerSprite(pId, {sheet: PLAYER_CHARACTERS[cId], name: PLAYER_NAMES[cId]});
    
    // update app.js regarding session info
    Q.input.trigger('appCast', {eventName:'updateSession', eventData: session});
    
    // update the new player
    var newPlayerData = {gameState: gameState, sessionId: session.sessionId};
    Q.input.trigger('singleCast', {receiverId: pId, eventName:'joinSuccessful', eventData: newPlayerData});
    
    // update other players
    var otherPlayersData = {p: getPlayerProperties(pId)};
    Q.input.trigger('broadcastOthers', {senderId:pId, eventName:'addSprite', eventData: otherPlayersData});

  }else{
    // update app.js regarding joinSession failed
    var newPlayerData = {sessionId: session.sessionId};
    Q.input.trigger('singleCast', {receiverId: pId, eventName:'joinFailed', eventData: newPlayerData});
  }
});

// when one or more players disconnected from app.js
socket.on('playerDisconnected', function(data) {  
  
  var pId = data.spriteId
  if(!pId){
    console.log("Player without id is disconnected from session " + session.sessionId);
  }

  console.log("Player " + pId + " is disconnected from session " + session.sessionId);
  
  // remove player from the session
  leaveSession(pId);
  
  // update app.js regarding session info
  Q.input.trigger('appCast', {eventName:'updateSession', eventData: session});

  // inform every other player about the player disconnection
  var otherPlayersData = {p: getPlayerProperties(pId)};
  Q.input.trigger('broadcastOthers', {senderId:pId, eventName:'removeSprite', eventData: otherPlayersData});

  // Destroy player and remove him from game state
  removePlayerSprite(pId);
});

// when app.js is disconnected
socket.on('disconnect', function(){
  console.log("App.js is disconnected");

  Q.pause();
});


socket.on('keydown', function(data) {
  var pId = data.spriteId;
  if(!pId){
    console.log("Player without id sent keyDown");
    return;
  }

  var sessionId = data.sessionId;
  if(!sessionId){
    console.log("Player "+pId+" from unknown session sent keyDown");
    return;
  }

  var e = data.e;
  if(!e){
    console.log("Player "+pId+" from session "+sessionId+" sent keyDown without event data");
    return;
  }

  var kCode = e.keyCode;
  if(!kCode){
    console.log("Player "+pId+" from session "+sessionId+" sent keyDown without keyCode in event data");
    return;
  }

  var player = getPlayerSprite(pId);
  
  // Simulate player pressing the key
  pressKey(player, kCode);
});

socket.on('keyup', function(data) {
  var pId = data.spriteId;
  if(!pId){
    console.log("Player without id sent keyUp");
    return;
  }

  var sessionId = data.sessionId;
  if(!sessionId){
    console.log("Player "+pId+" from unknown session sent keyUp");
    return;
  }

  var e = data.e;
  if(!e){
    console.log("Player "+pId+" from session "+sessionId+" sent keyUp without event data");
    return;
  }

  var kCode = e.keyCode;
  if(!kCode){
    console.log("Player "+pId+" from session "+sessionId+" sent keyUp without keyCode in event data");
    return;
  }
  
  var player = getPlayerSprite(pId);

  // Simulate player releasing the key
  releaseKey(player, e.keyCode);
});

socket.on('mouseup', function(data) {
  var pId = data.spriteId;
  if(!pId){
    console.log("Player without id sent moseUp");
    return;
  }

  var sessionId = data.sessionId;
  if(!sessionId){
    console.log("Player "+pId+" from unknown session sent moseUp");
    return;
  }

  var e = data.e;
  if(!e){
    console.log("Player "+pId+" from session "+sessionId+" sent moseUp without event data");
    return;
  }
  
  var player = getPlayerSprite(pId);
  player.trigger('fire', e);
  
  // console.log("Player firing, properties are: " + getJSON(player.p));
});