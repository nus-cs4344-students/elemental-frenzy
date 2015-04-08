"use strict";

require(['helper-functions']);

// console.log("connecting");

// ## Connect to the server
var HOSTNAME = "localhost";
var PORT = 4343;
var io = io();
var socket = io.connect("http://" + HOSTNAME + ":" + PORT);

// Debugging purpose
// App.js can be replying too fast that socket.on() event listener is only registered after 'connected' message arrives

//socket.on('connected',function(data){console.log('first connected: '+JSON.stringify(data,null,4));});

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
           },
  kills: {},
  deaths: {}
};

var DEFAULT_SESSION = {
  playerCount: 0,
  playerMaxCount: 4,
  players: {},
  sessionId: 0
};

var isSession = true;
var gameState;
var session;
var allSprites;
var spriteId = 0;
var _playerToFollowId; // To be used when toggling between players to follow, for the session

// RTT-related
var avgRttOfPlayers = [];
var rttAlpha = 0.7; // weighted RTT calculation depends on this. 0 <= alpha < 1 value close to one makes the rtt respond less to new segments of delay

// Updates the average RTT with the new sample oneWayDelay using a weighted average
var updateAvgRttOfPlayer = function(oneWayDelay, playerId) {
  if (typeof oneWayDelay === 'undefined') {
    console.log("Error in updateAvgRttOfPlayer(): oneWayDelay is undefined");
    return;
  }
  if (typeof playerId === 'undefined') {
    console.log("Error in updateAvgRttOfPlayer(): playerId is undefined");
    return;
  }
  
  if (typeof avgRttOfPlayers[playerId] === 'undefined') {
    // initialize
    avgRttOfPlayers[playerId] = 0;
  }
  avgRttOfPlayers[playerId] = (rttAlpha * avgRttOfPlayers[playerId]) + ((1.0-rttAlpha) * (2*oneWayDelay));
  //console.log("For player " + playerId + ": sample onewaydelay: " + oneWayDelay + " new avgRtt " + getAvgRttOfPlayer(playerId));
  return avgRttOfPlayers[playerId];
}

var getAvgRttOfPlayer = function(playerId) {
  if (typeof playerId === 'undefined') {
    console.log("Error in getAvgRttOfPlayer(): playerId is undefined");
    return;
  }
  
  if (typeof avgRttOfPlayers[playerId] === 'undefined') {
    // initialize
    avgRttOfPlayers[playerId] = 0;
  }
  return avgRttOfPlayers[playerId];
}

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

var getNextSpriteId = function(){
  return ++spriteId;
}

// Make sure that the sprite is good, and returns true if so, false otherwise (and logs console messages)
var checkGoodSprite = function(eType, spriteId, callerName) {
  callerName = callerName || 'nameNotSpecifiedFunction';
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

// Returns the player sprite reference of the sprite with spriteId immediately larger than the given currentPId
// or that of the smallest spriteId if there is none bigger.
// Returns undefined if there are no sprites.
var getNextPlayerSprite = function(currentPId) {
  var playerToFollow = getNextSprite('PLAYER', currentPId);
  if (typeof playerToFollow === 'undefined') {
    return;
  }
  _playerToFollowId = playerToFollow.p.spriteId;
  return playerToFollow;
}

// Returns the sprite reference of the sprite with spriteId immediately larger than the given theSpriteId
// or that of the smallest spriteId if there is none bigger.
// Returns undefined if there are no sprites.
var getNextSprite = function(entityType, theSpriteId) { 
  if (typeof entityType === 'undefined') {
    console.log("Error in method getNextSprite: entityType given is undefined");
    return;
  }
  if (typeof allSprites[entityType] === 'undefined') {
    console.log("Error in method getNextSprite: " + entityType + " is not a valid entity type");
    return;
  }
  
  if (typeof theSpriteId === 'undefined') {
    // Get the first sprite if theSpriteId is not specified
    theSpriteId = -1;
  }
  
  var smallestId,   // The smallest id encountered for the given entityType (to be used if upperBoundId is undefined after the search)
      spriteCount,  // The number of sprites encountered for the given entityType (if 0 then return undefined)
      upperBoundId; // The spriteId of the sprite that has spriteId immediately larger than the given spriteId
  spriteCount = 0;
  for (var spriteId in allSprites[entityType]) {
    spriteCount++;
    if (spriteId > theSpriteId && (typeof upperBoundId === 'undefined' || spriteId < upperBoundId)) {
      upperBoundId = spriteId;
    }
    if (typeof smallestId === 'undefined' || spriteId < smallestId) {
      smallestId = spriteId;
    }
  }
  
  console.log("spriteCount: " + spriteCount + " upperBoundId: " + upperBoundId + " smallestId: " + smallestId);
  
  if (spriteCount == 0) {
    return;
  } else if (upperBoundId) {
    return getSprite(entityType, upperBoundId);
  } else {
    return getSprite(entityType, smallestId);
  }
}

var getSprite = function(entityType, id) {
    var eType = entityType;
  if(!eType){
    console.log("Trying to get sprite without entityType");
    return;
  }

  var spriteId = id;
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

var updateSprite = function(eType, spriteId, updateProps) {
  if ( !checkGoodSprite(eType, spriteId, 'updateSprite')) {
    return;
  }
  if (!updateProps) {
    // Bad properties
    console.log("Error in updateSprite(): undefined properties");
    return;
  }
  
  console.log("Updating " + eType + " " + spriteId);
  
  updateProps.isServerSide = true;
  var spriteToUpdate = getSprite(eType, spriteId);
  spriteToUpdate.p.x = updateProps.x;
  spriteToUpdate.p.y = updateProps.y;
  spriteToUpdate.p.vx = updateProps.vx;
  spriteToUpdate.p.vy = updateProps.vy;
  spriteToUpdate.p.ax = updateProps.ax;
  spriteToUpdate.p.ay = updateProps.ay;
  spriteToUpdate.p.element = updateProps.element;
}

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
var addSprite = function(entityType, id, properties, delayToInsert) {  
  delayToInsert = delayToInsert ? delayToInsert : 0;
  
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
  // console.log("Added sprite " + eType + " id " + spriteId + " which has properties p: " + getJSON(sprite.p));

  // disable keyboard controls and listen to controls' event
  if(eType == 'PLAYER' && sprite.has('platformerControls')){
    sprite.del('platformerControls');
    sprite.add('serverPlatformerControls');
  }

  if(spriteNeedUpdateInterval){
    sprite.add('serverSprite'); 
  }

  // store sprite reference
  allSprites[eType][spriteId] = sprite;

  setTimeout(function() {
    insertIntoStage(sprite);
  }, delayToInsert);
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

var addPlayerEleballSprite = function(ballId, properties, delayToInsert){
  delayToInsert = delayToInsert || 0;
  return addSprite('PLAYERELEBALL', ballId, properties, delayToInsert);
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
  
  if (eType == 'PLAYERELEBALL') {
    // Only the server chooses to destroy eleballs, so it must tell all players to remove the sprite
    Q.input.trigger('broadcastAll', {eventName:'removeSprite', eventData: {
        p: {
          entityType: eType,
          spriteId: spriteId
        }
      }
     });
  }

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
  
  // To move viewports
  var viewportSpeed = 50;
  Q.input.on("server_up", function() {
    var x = Q.stage(STAGE_LEVEL).viewport.centerX,
        y = Q.stage(STAGE_LEVEL).viewport.centerY;
    Q.stage(STAGE_LEVEL).viewport.softCenterOn(x, y-viewportSpeed);
  });
  Q.input.on("server_down", function() {
    var x = Q.stage(STAGE_LEVEL).viewport.centerX,
        y = Q.stage(STAGE_LEVEL).viewport.centerY;
    Q.stage(STAGE_LEVEL).viewport.softCenterOn(x, y+viewportSpeed);
  });
  Q.input.on("server_left", function() {
    var x = Q.stage(STAGE_LEVEL).viewport.centerX,
        y = Q.stage(STAGE_LEVEL).viewport.centerY;
    Q.stage(STAGE_LEVEL).viewport.softCenterOn(x-viewportSpeed, y);
  });
  Q.input.on("server_right", function() {
    var x = Q.stage(STAGE_LEVEL).viewport.centerX,
        y = Q.stage(STAGE_LEVEL).viewport.centerY;
    Q.stage(STAGE_LEVEL).viewport.softCenterOn(x+viewportSpeed, y);
  });
  
  // Allow the session to follow different players
  Q.input.on("toggleFollow", function() {
    console.log("Toggle follow");

    var playerToFollow = getNextPlayerSprite(_playerToFollowId);
    if (typeof playerToFollow === 'undefined') {
      console.log("Player to follow is undefined: no players?");
      return;
    } 
    
    console.log("Trying to follow player " + playerToFollow.p.spriteId + " and _playerToFollowId is " + _playerToFollowId);
    Q.stage(STAGE_LEVEL).softFollow(playerToFollow);
  });   
  
  // Allow the session to stop following players
  Q.input.on("stopFollow", function() {
    console.log("Stop follow");
    
    Q.stage(STAGE_LEVEL).unfollow();
  });

  Q.input.on('displayScoreScreen', function(){
    displayScoreScreen();
  });

  Q.input.on('displayScoreScreenUp', function(){
    hideScoreScreen();
  });
};

var resetDisplayScreen = function(){
  // clear all screens
  Q.clearStages();
  Q.stageScene(SCENE_BACKGROUND, STAGE_BACKGROUND);
}

var displayNotificationScreen = function(msg, btnDisabled, callback, duration){
  var stageOptions = {msg: msg, 
                      btnDisabled: btnDisabled,
                      duration: duration, 
                      callback: callback};
  Q.stageScene(SCENE_NOTIFICATION, STAGE_NOTIFICATION, stageOptions);
};

var displayScoreScreen = function(){
  hideScoreScreen();
  Q.stageScene(SCENE_SCORE, STAGE_SCORE); 
};

var hideScoreScreen = function(){
  Q.clearStage(STAGE_SCORE);
};

var displayStatusScreeen = function(msg) {
  if(!msg){
    console.log("No message passed in when calling displayStatusScreeen");
    return;
  }

  Q.stageScene(SCENE_STATUS, STAGE_STATUS, {msg: msg});
};

var displayGameScreen = function(level){
  resetDisplayScreen();

  // Load the level
  Q.stageScene(level, STAGE_LEVEL);

  // show connected status
  displayStatusScreeen("Connected as 'Session "+session.sessionId+"'");

  // Viewport
  Q.stage(STAGE_LEVEL).add("viewport");
};

var loadGameSession = function(sessionId) {
  if(!sessionId){
    console.log("Trying to load game session without session id");
    return;
  }

  console.log("Loading game state...");

  // initialize game state and session
  gameState = clone(DEFAULT_GAMESTATE);
  session = clone(DEFAULT_SESSION);
  session.sessionId = sessionId;
  allSprites = clone(DEFAULT_SPRITES);

  displayGameScreen(gameState.level);

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
  
  // On Q.state change, update local gameState and
  // update players
  Q.state.on('change', function() {
    gameState.kills = Q.state.get('kills');
    gameState.deaths = Q.state.get('deaths');

    Q.input.trigger('broadcastAll', {
      eventName: 'gameStateChanged', 
      eventData: {
        kills: gameState.kills,
        deaths: gameState.deaths
      }
    });
  });
};

var joinSession = function(playerId, characterId) {
  var result = {status: false, msg: ""};

  var pId = playerId;
  if(!pId){
    console.log("Trying to let a player to join session without player id");
    result.msg = "Requested to join session "+session.sessionId+" without player id";
    return result;
  }

  var cId = characterId;
  if(!cId){
    console.log("Trying to let player "+pId+" to join session without character id");
    result.msg = "Requested to join session "+session.sessionId+" without character id";
    return result;
  }

  // session full
  if(session.playerCount >= session.playerMaxCount){
    console.log("Session "+session.sessionId +" is full");
    result.msg = "Requested to join session "+session.sessionId+" which is currently full";
    return result;
  
  }

  // make sure the player is not in the session already
  if(session.players){
    // player already joins the session
    if(session.players[pId]){
      console.log("Player "+pId+" is already in session "+session.sessionId);
      result.msg = "Requested to join session "+session.sessionId+" which player "+pId+" has already joined";
      return result;
      }

    for(var p in session.players){
      if(session.players[p] == cId){
        console.log("Character "+cId+" is already used by Player "+p+" in session "+session.sessionId);
        result.msg = "Requested to join session "+session.sessionId+
                    " with character ["+PLAYER_NAMES[cId]+"] which is currently in use by other player";
        return result;
      }
    }
  }

  // player can join the session
  session.players[pId] = cId;
  session.playerCount++;

  result.status = true;
  return result;
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
  
  if(isCyclic(eventData)){
    console.log("Detected cyclic event "+eventName);
    return;
  }
  
  eventData.timestamp = (new Date()).getTime();
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
  
  if(isJoined.status){
    // console.log("gameState joined - "+getJSON(gameState));

    // add player and creates sprite for it
    addPlayerSprite(pId, {sheet: PLAYER_CHARACTERS[cId], name: PLAYER_NAMES[cId], characterId: cId});
    
    // add player kills/deaths to Q.state
    Q.state.trigger('playerJoined', pId);

    // update the new player
    var newPlayerData = {gameState: gameState, sessionId: session.sessionId};
    Q.input.trigger('singleCast', {receiverId: pId, eventName:'joinSuccessful', eventData: newPlayerData});
    
    // update other players
    var otherPlayersData = {p: getPlayerProperties(pId)};
    Q.input.trigger('broadcastOthers', {senderId:pId, eventName:'addSprite', eventData: otherPlayersData});

    // update app.js regarding session info
    Q.input.trigger('appCast', {eventName:'updateSession', eventData: session});

  }else{
    // update app.js regarding joinSession failed
    var newPlayerData = {sessionId: session.sessionId, msg: isJoined.msg};
    Q.input.trigger('singleCast', {receiverId: pId, eventName:'joinFailed', eventData: newPlayerData});
  }
});

// When a player joins, he will try to synchronize clocks
socket.on('synchronizeClocks', function(data) {
  data.sessionReceiveTime = getCurrentTime();
  data.clientSendTime = data.timestamp;
  var playerId = data.playerId;
  Q.input.trigger('singleCast', {receiverId: playerId, eventName:'synchronizeClocks', eventData: data});
});

// when a player request to respawn
socket.on('respawn', function(data) {
  
  var pId = data.spriteId;
  if(!pId){
    console.log("Player without id requests to respawn");
    return;
  }

  var cId = data.characterId;
  if(!cId){
    console.log("Player without character id requests to respawn");
    return;
  }

  // respawn player and creates sprite for it
  addPlayerSprite(pId, {sheet: PLAYER_CHARACTERS[cId], name: PLAYER_NAMES[cId], characterId: cId});
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
  
  // Update the state (remove this player from the state)
  Q.state.trigger('playerDisconnected', pId);

  // Destroy player and remove him from game state
  removePlayerSprite(pId);
});

// when app.js is disconnected
socket.on('disconnect', function(){
  console.log("App.js is disconnected");

  // ask host to refresh browser again
  displayNotificationScreen("Server cannot be reached\nPlease refresh your page after a while", false);

  displayStatusScreeen("Unable to connect to the server");
});

// Authoritative message about the movement of the sprite from a client
// Session must obey
socket.on('authoritativeSpriteUpdate', function(data) {
  if ( !checkGoodSprite(data.entityType, data.spriteId, 'authoritativeSpriteUpdate socket event')) {
    return;
  }
  
  if (data.entityType == 'PLAYER') {
    // Update average RTT for that player
    var receivedTimeStamp = data.timestamp;
    var curTimeStamp = (new Date()).getTime();
    var oneWayDelay = curTimeStamp - receivedTimeStamp;
    updateAvgRttOfPlayer(oneWayDelay, data.spriteId);
    
    //console.log("aurhoritativeSpriteUpdate: avgRtt of player " + data.spriteId + " is " + getAvgRttOfPlayer(data.spriteId));
  }
  
  console.log("authoritativeSpriteUpdate from "+data.spriteId +" characterId "+data.characterId);
  updateSprite(data.entityType, data.spriteId, data.p);
});

socket.on('mouseup', function(data) {
  var pId = data.spriteId;
  if(!pId){
    console.log("Player without id sent mouseUp");
    return;
  }

  var sessionId = data.sessionId;
  if(!sessionId){
    console.log("Player "+pId+" from unknown session sent mouseUp");
    return;
  }

  var e = data.e;
  if(!e){
    console.log("Player "+pId+" from session "+sessionId+" sent mouseUp without event data");
    return;
  }
  
  var player = getPlayerSprite(pId);
  var now = (new Date()).getTime();
  var oneWayDelay = now - data.timestamp;
  var timeBeforeShooting = (1000*PLAYER_FIRE_ANIMATION_TIME) - (2 * oneWayDelay);
  console.log("Player firing, timestamp received = " + data.timestamp + " timestamp now = " + now + 
              " one-way delay: " + oneWayDelay + " time before shooting: " + timeBeforeShooting);
  player.trigger('fire', e);
  setTimeout(function() {
    // Fire in (ANIM_TIME - RTT) so that the client will receive it once the animation is finished there
    if (player) {
      player.trigger('fired', {e: e, delayToInsert: oneWayDelay});
    }      
  }, timeBeforeShooting);
  
  // console.log("Player firing, properties are: " + getJSON(player.p));
});

each(['left','right','up', 'down'], function(actionName) {
  
  socket.on(actionName, function(data){
    var sId = data.spriteId;
    if(!sId){
      console.log("Player without id sent ["+actionName+"]");
      return;
    }

    var sessionId = data.sessionId;
    if(!sessionId){
      console.log("Player "+sId+" from unknown session sent ["+actionName+"]");
      return;
    }

    var player = getPlayerSprite(sId);

    // Simulate player releasing the key
    if(!player){
      console.log("Player without sprite pressed the key");
      return;
    }
    console.log("session received "+actionName);
    player.inputs[actionName] = true;
  });

},this);

each(['leftUp','rightUp','upUp', 'downUp'], function(actionName) {
  
  socket.on(actionName, function(data){
    var sId = data.spriteId;
    if(!sId){
      console.log("Player without id sent ["+actionName+"]");
      return;
    }

    var sessionId = data.sessionId;
    if(!sessionId){
      console.log("Player "+sId+" from unknown session sent ["+actionName+"]");
      return;
    }
 
    var player = getPlayerSprite(sId);

    // Simulate player releasing the key
    if(!player){
      console.log("Player without sprite released the key");
      return;
    }

    var action = actionName.substring(0, actionName.length - "Up".length);console.log(action);
    player.inputs[action] = false;
  });

},this);

socket.on('toggleNextElementUp', function(data){

    var sId = data.spriteId;
    var eType = data.entityType;

    if(!checkGoodSprite(eType, sId, "toggleNextElementUp")){
      return;
    }

    var player = getPlayerSprite(sId);
    if(!player || player.p.toggleElementCooldown > 0){
      // player is died or cannot located current player sprite
      // player toggleElement is in cooldown
      return;
    }

    player.p.toggleElementCooldown = PLAYER_DEFAULT_TOGGLE_ELEMENT_COOLDOWN;

    var nextElement = (Number(player.p.element) + 1) % ELEBALL_ELEMENTNAMES.length;console.log("current "+player.p.element+" received "+nextElement);
    player.p.element = nextElement;
  });