"use strict";

require(['helper-functions']);

// console.log("connecting");
var socket = io.connect("http://" + HOSTNAME + ":" + PORT);

// Debugging purpose
// App.js can be replying too fast that socket.on() event listener is only registered after 'connected' message arrives

//socket.on('connected',function(data){console.log('first connected: '+JSON.stringify(data,null,4));});

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
var isSession = false;

// Networking
var threshold_clientDistanceFromServerUpdate = 30;
var interval_updateServer_timeInterval = 100;       // time interval between authoritative updates to the server
var time_sentMouseUp;
var timestampOffset;
var _isSessionConnected = false;
var _clockSynchronized = false;
var _gameLoaded = false;

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

var getCurrentTime = function() {
  return (new Date()).getTime();
}


function isCyclic (obj) {
  var seenObjects = [];

  function detect (obj) {
    if (obj && typeof obj === 'object') {
      if (seenObjects.indexOf(obj) !== -1) {
        return true;
      }
      seenObjects.push(obj);
      for (var key in obj) {
        if (obj.hasOwnProperty(key) && detect(obj[key])) {
          console.log(obj, 'cycle at ' + key);
          return true;
        }
      }
    }
    return false;
  }

  return detect(obj);
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
    if (typeof item === 'undefined') {
      continue;
    }
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
  if (isCyclic(item)) {
    return;
  }
  if(item instanceof Array){
    return cloneArray(item);
  }else if(typeof item === 'object') {
    return cloneObject(item);
  }else{
    return item;
  }
};

// Make sure that the sprite is good, and returns true if so, false otherwise (and logs console messages)
var checkGoodSprite = function(eType, spriteId, callerName) {
  callername = callername || 'nameNotSpecifiedFunction';
  if (typeof eType == 'undefined') {
    console.log("Error in " + callerName + "(): checkGoodSprite(): undefined eType");
    return false;
  }
  if (typeof spriteId == 'undefined') {
    console.log("Error in " + callerName + "(): checkGoodSprite(): undefined spriteId");
    return false;
  }
  if (typeof getSprite(eType, spriteId) == 'undefined') {
    console.log("Error in " + callerName + "(): checkGoodSprite(): " + eType + " " + spriteId + " is undefined");
    return false;
  }
  
  return true;
}

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
  //console.log("Cloning properties of " + eType + " " + spriteId);
  var clonedProps = clone(properties);
  //console.log("Done cloning properties of " + eType + " " + spriteId);
  if(!clonedProps){
    console.log("Trying to update sprite "+eType+" id "+spriteId+" with empty properties");
    return;
  }

  if(!isSpriteExists(eType, spriteId)){
    console.log("Trying to update non existing sprite "+eType+" "+spriteId);
    return;
  }
  
  var spriteToUpdate = getSprite(eType, spriteId);
  clonedProps.isServerSide = false;
  // The player will be the authority for his position and movement, the server follows,
  // so don't update the player
  if (eType == 'PLAYER' && spriteId == selfId) {
    // Include here the properties of a player that should get updated by the server
    spriteToUpdate.p.currentHealth = clonedProps.currentHealth;
    spriteToUpdate.p.maxHealth = clonedProps.maxHealth;
    spriteToUpdate.p.currentMana = clonedProps.currentMana;
    spriteToUpdate.p.maxMana = clonedProps.maxMana;
    spriteToUpdate.p.dmg = clonedProps.dmg;
  } else {
    spriteToUpdate.p = clonedProps;
  }
  
  gameState.sprites[eType][spriteId] = {p: spriteToUpdate.p}; 
  console.log("Updated "+eType+" id " + spriteId);

  return;
}

var getSprite = function(entityType, id) {
  var eType = entityType;
  if(!eType){
    console.log("Trying to get sprite without entityType");
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
    case 'PLAYER':{
      if(selfId != spriteId){
        eType = 'ACTOR';
      }
      break;
    }
    default:{
      break;
    }
  }

  if(!spriteId){
    console.log("Trying to get sprite "+eType+" without id");
  }

  return allSprites[eType][spriteId];
};

var getPlayerSprite = function(playerId) {
  return getSprite('PLAYER' , playerId);
};

var getEnemySprite  = function(enemyId) {
  return getSprite('ENEMY' , enemyId);
};

var getActorSprite = function(actorId) {
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

  //console.log("Cloning properties of " + eType + " " + spriteId);
  var clonedProps = clone(properties);
  //console.log("Done cloning properties of " + eType + " " + spriteId);
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
  
  // DEBUGGING PURPOSES
  if (eType == 'PLAYERELEBALL') {
    var now = getCurrentTime();
    console.log("Creating player eleball after " + (now - time_sentMouseUp) + "ms from sending mouse up event to server");
  }

  if (eType == 'PLAYER') {
    // Update server about the player's position (player authority on his movement)
    var interval_updateServer = setInterval(function() {
      if (!sprite || sprite.p.isServerSide || 
          sprite.p.isDead || !_isSessionConnected) {
        // (Defensive) Remove interval because it is gone/not on the client side
        clearInterval(interval_updateServer);
      }
      Q.input.trigger('sessionCast', {eventName:'authoritativeSpriteUpdate', eventData: {
        entityType: 'PLAYER',
        spriteId: sprite.p.spriteId,
        p: sprite.p
      }});
    }, interval_updateServer_timeInterval);
  }
  // store sprite reference
  allSprites[eType][spriteId] = sprite;

  insertIntoStage(sprite);
  // store sprite properties into game state
  gameState.sprites[eType][spriteId] = {p: sprite.p};

  if(sprite.p.spriteId == selfId && eType == 'PLAYER'){
    
    if(!Q.stage(STAGE_LEVEL).has('viewport')){
      Q.stage(STAGE_LEVEL).add('viewport');
    }

    Q.stage(STAGE_LEVEL).softFollow(sprite);
  }

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

  if(_isSessionConnected){
    console.log("Sessions updated but bypassing welcome screen session update event"+
                "when player is connected to one of the sessions");
    return;
  }

  if(_assetsLoaded){
    // refresh welcome screen
    Q.clearStage(STAGE_WELCOME);
    Q.stageScene(SCENE_WELCOME, STAGE_WELCOME);
  }
}

var initialization = function(){

  Q.input.on('join', function(data){
    console.log("join "+getJSON(data));

    var sId = data.sessionId;
    if(!sId){
      console.log("Trying to join a session without session id");
      return;
    }

    var cId = data.characterId;
    if(!cId){
      console.log("Trying to join session "+sId+" without character id");
      return;
    }

    // send request to app.js of joining a session
    Q.input.trigger('sessionCast', {eventName:'join', eventData: {spriteId: selfId, sessionId: sId, characterId: cId}});
  });

   Q.input.on('respawn', function(data){
    console.log("respawn "+getJSON(data));

    var sId = data.sessionId;
    sId = sId ? sId : sessionId; 
    if(!sId){
      console.log("Trying to respawn in a session without session id");
      return;
    }

    var spriteId = data.spriteId;
    if(!spriteId){
      console.log("Trying to respawn in session "+sId+" without sprite id");
      return;
    }

    var cId = data.characterId;
    if(!cId){
      console.log("Trying to respawn in session "+sId+" without character id");
      return;
    }

    // send request to app.js of respawning in a session
    Q.input.trigger('sessionCast', {eventName:'respawn', eventData: {spriteId: selfId, sessionId: sId, characterId: cId}});
  });

    
  Q.input.on('sessionCast', function(data) {

    var sId = data.eventData.sessionId;
    sId = sId ? sId : sessionId; 
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

  Q.input.on('keydown', function(keyCode){
    var e = {keyCode: keyCode};
    var actionName;
    if(!Q.input.keys[keyCode]) {
      // unrecognized keyboard input
      // refer to KEYBOARD_CONTROLS_PLAYER
      console.log("Unrecognized keydown: keycode is " + keyCode);
      return;
    }

    actionName = Q.input.keys[keyCode];

    var player = getPlayerSprite(selfId);
    if(player){
      player.inputs[actionName] = true;
      player.trigger(actionName, e);
    } else {
      console.log("Cannot locate current player to perform keydown");
    }

  });

  Q.input.on('keyup', function(keyCode){
    var e = {keyCode: keyCode};
    var actionName;
    if(!Q.input.keys[keyCode]) {
      // unrecognized keyboard input
      // refer to KEYBOARD_CONTROLS_PLAYER
      console.log("Unrecognized keyup: keycode is " + keyCode);
      return;
    }

    actionName = Q.input.keys[keyCode];

    var player = getPlayerSprite(selfId);
    if(player){
      player.inputs[actionName] = false;
      player.trigger(actionName+"Up", e);
    } else {
      console.log("Cannot locate current player to perform keyup");
    }

  }); 

  // Event listener for firing
  Q.el.addEventListener('mouseup', function(e){
    var player = getPlayerSprite(selfId);
    if(!_isSessionConnected || !player.p.canFire || player.p.isDead
        || player.p.currentMana < PLAYER_DEFAULT_MANA_PER_SHOT){
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
                  entityType: 'PLAYER',
                  e: createdEvt
    };
    
    time_sentMouseUp = getCurrentTime();
    console.log("Sent mouseup event to server at time " + time_sentMouseUp);

    Q.input.trigger('sessionCast', {eventName:'mouseup', eventData: eData});

    // Trigger the fire animation of the player
    if(player){
      player.trigger('fire', createdEvt);
    } else {
      console.log("Cannot locate current player to perform mouseup");
    }

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
  //console.log("Cloning gamestate");
  gameState = gameState ? gameState : clone(DEFAULT_GAMESTATE);
  //console.log("Done cloning gamestate");

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

  // load element selector
  Q.stageScene(SCENE_HUD, STAGE_HUD);

  // Viewport
  Q.stage(STAGE_LEVEL).add("viewport");
  
  _gameLoaded = true;
}

var sendToApp = function(eventName, eventData){
  eventData.timestamp = (new Date()).getTime();
  eventData.timestamp += timestampOffset || 0;
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
  //console.log("Cloning defaultsprites");
  allSprites = clone(DEFAULT_SPRITES);
  //console.log("Done cloning defaultsprites");

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

  _isSessionConnected = true;
  
  // Try to synchronize clock with session (timestamp is automatically appended when sending in sendToApp())
  Q.input.trigger('sessionCast', {
    eventName: 'synchronizeClocks',
    eventData: {playerId: selfId}
  });
  
  // Asset for the game state should be loaded ahen welcome screen is loaded
  // Load the initial game state
  var interval_loadGameSession = setInterval(function() {
    // Only load the game after the clock is synchronized
    if (_clockSynchronized) {
      console.log("Clock synchronized with timestampOffset = " + timestampOffset);
      loadGameSession();
      clearInterval(interval_loadGameSession);
    }
  }, 100);
});

socket.on('synchronizeClocks', function(data) {
  // Using http://en.wikipedia.org/wiki/Network_Time_Protocol#Clock_synchronization_algorithm
  var clientReceiveTime = getCurrentTime();         // t3
  var sessionSendTime = data.timestamp;             // t2
  var sessionReceiveTime = data.sessionReceiveTime; // t1
  var clientSendTime = data.clientSendTime;         // t0
  
  timestampOffset = ((sessionReceiveTime - clientSendTime) + (sessionSendTime - clientReceiveTime)) / 2;
  _clockSynchronized = true;
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
  var receivedTimeStamp = data.timestamp;
  var curTimeStamp = (new Date()).getTime();
  //console.log("Message: updateSprite: timeStamp: ");
  //console.log("Received time: " + receivedTimeStamp + " current time: " + curTimeStamp + " difference: " + (curTimeStamp - receivedTimeStamp));
  if (!_isSessionConnected || !_clockSynchronized || !_gameLoaded) {
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
  var victimEntityType = data.victim.entityType,
      victimId = data.victim.spriteId,
      shooterEntityType = data.shooter.entityType,
      shooterId = data.shooter.spriteId;
      
  if (victimEntityType == 'PLAYER' && victimId != selfId) {
    // Not myself, so this is an ACTOR
    victimEntityType = 'ACTOR';
  }
      
  var sprite = getSprite(victimEntityType, victimId);
  if (typeof sprite === 'undefined') {
    console.log("Error in spriteTookDmg socket event: " + victimEntityType + " " + victimId + " does not exist");
    return;
  }
  
  sprite.trigger('takeDamage', {dmg: data.dmg, shooter: {entityType: shooterEntityType, spriteId: shooterId} });
});

// sprite died
socket.on('spriteDied', function(data) {
  console.log("Event: spriteDied: data: " + getJSON(data));
  var victimEntityType = data.victim.entityType,
      victimId = data.victim.spriteId,
      killerEntityType = data.killer.entityType,
      killerId = data.killer.spriteId;
  
  // getSprite will convert it
  // if (victimEntityType == 'PLAYER' && victimId != selfId) {
  //   // Not myself, so this is an ACTOR
  //   victimEntityType = 'ACTOR';
  // }
  
  var sprite = getSprite(victimEntityType, victimId);
  if (!sprite) {
    console.log("Error in spriteDied socket event: " + victimEntityType + " " + victimId + " does not exist");
    return;
  }
  
  sprite.die(killerEntityType, killerId);
});


// when session is disconnected
socket.on('sessionDisconnected', function(){
  console.log("Session disconnected");

    // clear other screens
  Q.clearStage(STAGE_LEVEL);
  Q.clearStage(STAGE_HUD);

  _isSessionConnected = false;
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
  _isSessionConnected = false;
  Q.pauseGame();
});