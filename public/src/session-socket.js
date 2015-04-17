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

var TIME_PER_ROUND = 30; // 5 minutes per round, timeLeft stored in Q.state

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
var sessionToken = 0;
var sessionId;
var mapLevelLoaded;
var _playerToFollowId; // To be used when toggling between players to follow, for the session
var _isMapSelectionScreenShown = false;
var _isMapCreated = false;

var STATUS_CONNECTTION = "Connected as 'Session [id]'";

// Sprites being used for players currently are a bit fatter (width is larger) than they actually look like
var PLAYERACTOR_WIDTHSCALEDOWNFACTOR = 0.55;

// Debugging helper variables
var numSpriteUpdatesToPlayer = {};

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
  PLAYER:         function(p) { return new Q.Player(p); },
  ACTOR:          function(p) { return new Q.Actor(p); },
  PLAYERELEBALL:  function(p) { return new Q.PlayerEleball(p); },
  ENEMYELEBALL:   function(p) { return new Q.EnemyEleball(p); },
  ENEMY:          function(p) { return new Q.Enemy(p); },
  POWERUP:        function(p) { return new Q.Powerup(p); },
  LADDER:         function(p) { return new Q.Ladder(p); }
};

var getDefaultSprites = function() {  
  var defaultSprites = {  PLAYER: {},
                          ACTOR: {},
                          PLAYERELEBALL: {},
                          ENEMYELEBALL: {},
                          ENEMY: {},
                          POWERUP: {},
                          LADDER: {}
                        };
  return defaultSprites;
}

var getDefaultGameState = function() {
  var defaultSprites = getDefaultSprites();

  var defaultGameState = {
    level: 'level3',
    sprites: defaultSprites,
    info: {}
  };
  
  return defaultGameState;
}

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

var cloneValueOnly = function(obj){
  var clone = {};
  for(var key in obj){
    var item = obj[key];
    if(typeof item === 'array' || typeof item === 'object' || typeof item === 'function') {
      // skip array / object / function
      continue;
    }else{
      clone[key] = item;
    }
  }
  return clone;
};

var isCyclic =function (obj) {
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
  
  //console.log("spriteCount: " + spriteCount + " upperBoundId: " + upperBoundId + " smallestId: " + smallestId);
  
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
  var properties;

  if(s){
    properties = cloneValueOnly(allSprites[eType][spriteId].p);
  }

  return properties;
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
  
  // To avoid flooding the console
  numSpriteUpdatesToPlayer[spriteId] = (numSpriteUpdatesToPlayer[spriteId]) ? (numSpriteUpdatesToPlayer[spriteId] + 1) % 1000000000 : 1;
  if (numSpriteUpdatesToPlayer[spriteId] % 10 == 0) {
    console.log("Updating " + eType + " " + spriteId);
  }
  
  updateProps.isServerSide = true;
  var spriteToUpdate = getSprite(eType, spriteId);
  spriteToUpdate.p.vx = updateProps.vx;
  spriteToUpdate.p.vy = updateProps.vy;
  spriteToUpdate.p.ax = updateProps.ax;
  spriteToUpdate.p.ay = updateProps.ay;
  spriteToUpdate.p.element = updateProps.element;
  
  // Special cases to apply to players only
  if (eType == 'PLAYER') {
    // Linear convergence using LPF component to reduce jerkiness
    if (!spriteToUpdate.has('localPerceptionFilter')) {
      spriteToUpdate.add('localPerceptionFilter');
    }
    spriteToUpdate.p.lpfTimeLeft = spriteToUpdate.p.lpfTotalTime = 0.1;
    spriteToUpdate.p.lpfNeededX = updateProps.x - spriteToUpdate.p.x;
    spriteToUpdate.p.lpfNeededY = updateProps.y - spriteToUpdate.p.y;
    // Don't LPF if the difference is too minute, and don't LPF if it is too large!
    var THRESHOLD_BELOWTHISNONEEDLPF = 5; // below this no need to lpf, because teleportation is not obvious
    var THRESHOLD_ABOVETHISNONEEDLPF = 40; // above this there is high chance of going out of sync and never coming back again (if tiles block)
    var euclidDist = Math.sqrt(spriteToUpdate.p.lpfNeededX*spriteToUpdate.p.lpfNeededX + spriteToUpdate.p.lpfNeededY*spriteToUpdate.p.lpfNeededY);
    if (euclidDist < THRESHOLD_BELOWTHISNONEEDLPF || euclidDist > THRESHOLD_ABOVETHISNONEEDLPF) {
      spriteToUpdate.p.lpfTimeLeft = spriteToUpdate.p.lpfTotalTime = 0;
      spriteToUpdate.p.x = updateProps.x;
      spriteToUpdate.p.y = updateProps.y;
    } 
    // Release the player's appropriate keys to avoid player-twitching-bug
    if (updateProps.vx == 0 && updateProps.ax == 0) {
      spriteToUpdate.inputs['left'] = spriteToUpdate.inputs['right'] = 0;
    }
    if (updateProps.vy == 0 && updateProps.ay == 0) {
      spriteToUpdate.inputs['up'] = spriteToUpdate.inputs['down'] = 0;
    }
  } else {
    // If not a player just update the position
    spriteToUpdate.p.x = updateProps.x;
    spriteToUpdate.p.y = updateProps.y;
  }

  gameState.sprites[eType][spriteId].p = cloneValueOnly(spriteToUpdate.p);
  return;
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

  var clonedProps = clone(properties);
  if(!clonedProps){
    clonedProps = {};
    console.log("Trying to add sprite with default properties");
  }

  if(isSpriteExists(eType,spriteId)){
    // sprite already exists
    console.log("Sprite " + eType + " id " + spriteId + " already exists");
    return false;
  }

  clonedProps.spriteId = spriteId;
  clonedProps.isServerSide = true;  
  clonedProps.sessionId = session.sessionId;

  var sprite = creates[eType](clonedProps);

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

  // store sprite properties into game state
  gameState.sprites[eType][spriteId] = {p: cloneValueOnly(sprite.p)}; 
  
  // Insert into the stage
  insertIntoStage(sprite);

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

  if(!isSpriteExists(eType, spriteId)){
    // sprite does not exists
    console.log("Trying to remove non existing sprite "+eType+" "+spriteId);
    return false;
  }

  //console.log("Removed sprite " + eType + " id " + spriteId);
  
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

var setupListener = function(){

  Q.input.on('create', function (data) {
    // prevent create button spamming
    if(_isMapCreated) {
      return ;
    }

    console.log("create "+getJSON(data));

    var mLevel = data.level;
    if(!mLevel) {
      console.log("Trying to create a session without map level");
      return;
    }

    _isMapCreated = true;
    
    createGameSession(mLevel);
  });

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
    var sLevel = Q.stage(STAGE_LEVEL);
    var x = sLevel.viewport.centerX,
        y = sLevel.viewport.centerY,
        scale = sLevel.viewport.scale;

    sLevel.viewport.softCenterOn(x, y-(viewportSpeed*scale));

    var sMini = Q.stage(STAGE_MINIMAP);
    var xMini = sMini.viewport.centerX,
        yMini = sMini.viewport.centerY,
        scaleMini = sMini.viewport.scale;
    sMini.viewport.softCenterOn(xMini, yMini-(viewportSpeed*scaleMini));
  });

  Q.input.on("server_down", function() {
    var sLevel = Q.stage(STAGE_LEVEL);
    var x = sLevel.viewport.centerX,
        y = sLevel.viewport.centerY,
        scale = sLevel.viewport.scale;
  
    sLevel.viewport.softCenterOn(x, y+(viewportSpeed*scale));

    var sMini = Q.stage(STAGE_MINIMAP);
    var xMini = sMini.viewport.centerX,
        yMini = sMini.viewport.centerY,
        scaleMini = sMini.viewport.scale;
    sMini.viewport.softCenterOn(xMini, yMini+(viewportSpeed*scaleMini));
  });

  Q.input.on("server_left", function() {
    var sLevel = Q.stage(STAGE_LEVEL);
    var x = sLevel.viewport.centerX,
        y = sLevel.viewport.centerY,
        scale = sLevel.viewport.scale;
  
    sLevel.viewport.softCenterOn(x-(viewportSpeed*scale), y);

    var sMini = Q.stage(STAGE_MINIMAP);
    var xMini = sMini.viewport.centerX,
        yMini = sMini.viewport.centerY,
        scaleMini = sMini.viewport.scale;
    sMini.viewport.softCenterOn(xMini-(viewportSpeed*scaleMini), yMini);
  });
  
  Q.input.on("server_right", function() {
    var sLevel = Q.stage(STAGE_LEVEL);
    var x = sLevel.viewport.centerX,
        y = sLevel.viewport.centerY,
        scale = sLevel.viewport.scale;
  
    sLevel.viewport.softCenterOn(x+(viewportSpeed*scale), y);

    var sMini = Q.stage(STAGE_MINIMAP);
    var xMini = sMini.viewport.centerX,
        yMini = sMini.viewport.centerY,
        scaleMini = sMini.viewport.scale;
    sMini.viewport.softCenterOn(xMini+(viewportSpeed*scaleMini), yMini);
  });
  
  // Allow the session to follow different players
  Q.input.on("toggleFollow", function() {
    console.log("Toggle follow");

    var playerToFollow = getNextPlayerSprite(_playerToFollowId);
    if (typeof playerToFollow === 'undefined') {
      console.log("Player to follow is undefined: no players?");
      return;
    } 
    
    //console.log("Trying to follow player " + playerToFollow.p.spriteId + " and _playerToFollowId is " + _playerToFollowId);
    Q.stage(STAGE_LEVEL).softFollow(playerToFollow);
    Q.stage(STAGE_MINIMAP).softFollow(playerToFollow);
  });   
  
  // Allow the session to stop following players
  Q.input.on("stopFollow", function() {
    console.log("Stop follow");
    
    Q.stage(STAGE_LEVEL).unfollow();
    Q.stage(STAGE_MINIMAP).unfollow();
  });

  Q.input.on('displayScoreScreen', function(){
    displayScoreScreen();
  });

  Q.input.on('displayScoreScreenUp', function(){
    hideScoreScreen();
  });

  // On state change, update local gameState and
  // update players
  Q.input.on('stateChanged', function(){
    gameState.info.kills = Q.state.get('kills');
    gameState.info.deaths = Q.state.get('deaths');
    gameState.info.timeLeft = Q.state.get('timeLeft');
    gameState.info.totalTime = Q.state.get('totalTime');

    // console.log("timeleft: " + gameState.info.timeLeft + " totaltime = " + gameState.info.totalTime);
    
    Q.input.trigger('broadcastAll', {
      eventName: 'gameStateChanged', 
      eventData: gameState.info
    });

    var tLeft = gameState.info.timeLeft;
    if(tLeft !== undefined && tLeft <=0){
      Q.input.trigger('endGame');
    }

  });

  Q.input.on('endGame', function(){
    
    Q.input.trigger('broadcastAll', {
      eventName: 'endGame', 
      eventData: {}
    });


    // reload game session
    createGameSession(mapLevelLoaded);
  });

  Q.input.on('switch', function(){
    console.log('switch');

    // tell everyone in the session that currnet session is switching map
    Q.input.trigger('broadcastAll', {'eventName': 'sessionDisconnected', eventData: {msg: "Switching Map"}});

    resetGameState();

    // update app.js regarding session info
    Q.input.trigger('appCast', {eventName:'removeSession', eventData: {}});

    displayMapSelectionScreen();
  });
};

var resetDisplayScreen = function(){
  _isMapSelectionScreenShown = false;

  // clear all screens
  Q.clearStages();
  Q.stageScene(SCENE_BACKGROUND, STAGE_BACKGROUND);
}

var displayNotificationScreen = function(msg, callback){
  var stageOptions = {msg: msg,
                      buttons: [{label: 'OK', callback: callback}]};
  Q.stageScene(SCENE_NOTIFICATION, STAGE_NOTIFICATION, stageOptions);
};

var displayMapSelectionScreen = function () {
  resetDisplayScreen();

  // character selection
  Q.stageScene(SCENE_MAP_SELECT, STAGE_MAP_SELECT);

  _isMapSelectionScreenShown = true;
  _isMapCreated = false;
};

var displaySessionHUDScreen = function () {
  Q.stageScene(SCENE_HUD, STAGE_HUD);
};

var displayInfoScreen = function(msg){
  Q.stageScene(SCENE_INFO, STAGE_INFO, {msg: msg});
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
  Q.stageScene(SCENE_LEVEL, STAGE_LEVEL, {level: level});

  Q.stageScene(SCENE_LEVEL, STAGE_MINIMAP, {level: level, miniStage: STAGE_LEVEL});  

  // show connected status
  var status = STATUS_CONNECTTION.replace('[id]', session.sessionId);
  displayStatusScreeen(status);

  // Viewport
  Q.stage(STAGE_LEVEL).add("viewport");

  // minimap
  Q.stage(STAGE_MINIMAP).add("viewport");
  
  // Shrink the bounding box for the sprites' width to fit its real width
  // for PLAYER and ACTOR sprites only
  Q.stage(STAGE_LEVEL).on('inserted', function(item) {
    if (item && item.p && (item.p.entityType == 'PLAYER' || item.p.entityType == 'ACTOR') ) {
      item.p.w *= PLAYERACTOR_WIDTHSCALEDOWNFACTOR;
      Q._generatePoints(item, true);
    }
  });
  
};

var createGameSession = function(level){

    resetGameState();

    loadGameState(level || mapLevelLoaded);

    // update app.js regarding session info
    Q.input.trigger('appCast', {eventName:'updateSession', eventData: session});
};

var resetGameState = function(){
  // there is old game state,
  // remove all of them
  if(gameState){
    for (var entityType in gameState.sprites) {
      for (var eId in gameState.sprites[entityType]) {
        removeSprite(entityType, eId);
      }
    }
  } 
  // remove previous round timer if any
  var prevTimer = Q.state.get('roundTimer');
  if(prevTimer !== undefined){
    clearInterval(prevTimer);
  }

  resetState();

  // initialize session
  session = clone(DEFAULT_SESSION);
  session.sessionId = sessionId;
  sessionToken++;

  // initialize game state
  gameState = getDefaultGameState();
  allSprites = getDefaultSprites();
};

var loadGameState = function(level) {

  console.log("Loading game state...");

  gameState.level = level;
  mapLevelLoaded = level;
  

  var setRoundTimer = function() {
    Q.state.p.totalTime = TIME_PER_ROUND;
    Q.state.p.timeLeft = TIME_PER_ROUND;
    
    var roundTimer = setInterval(function() {
      var timeLeft = Q.state.get('timeLeft');
      var totalTime = Q.state.get('totalTime');

      if (session.playerCount > 0 && timeLeft && timeLeft > 0 || 
          (totalTime && timeLeft < totalTime)) {
        Q.state.dec("timeLeft", 1);
      }
    }, 1000);

    Q.state.p.roundTimer = roundTimer;
  };

  setRoundTimer();

  displayGameScreen(gameState.level);  

  displayInfoScreen('New round started');

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
  
  // Listen to the inserted event to add sprites into the state
  Q.stage(STAGE_LEVEL).on('inserted', function(item) {
    var eType = item.p.entityType;
    var spriteId = item.p.spriteId;
    if (!eType || typeof spriteId === 'undefined') {
      console.log("Error in inserted event listener: entityType of spriteId is undefined");
      return;
    }
    if( !isSpriteExists(eType,spriteId)){
      // sprite doesn't exist, add it into the game state

      // console.log("Storing item " + eType + " spriteId " + spriteId + " into state");
      
      // store sprite reference
      allSprites[eType][spriteId] = item;
      // store sprite properties into game state
      gameState.sprites[eType][spriteId] = {p: clone(item.p)}; 
      // Tell the clients about this
      Q.input.trigger('broadcastAll', {'eventName': 'updateSprite', eventData: {p: item.p}});
    }
  });

  // Listen to the removed event
  Q.stage(STAGE_LEVEL).on('removed', function(item) {
    var eType = item.p.entityType;
    var spriteId = item.p.spriteId;
    if (!eType || typeof spriteId === 'undefined') {
      return;
    }
    
    //console.log("Removing item " + eType + " spriteId " + spriteId + " from state");
    removeSprite(eType, spriteId);
  });
  
  Q.stage(STAGE_LEVEL).add("ladderSystem");
  Q.stage(STAGE_LEVEL).add("powerupSystem");

  for(var i =0; i< spritesToAdd.length; i++){
    addSprite(spritesToAdd[i].entityType, 
              spritesToAdd[i].eId, 
              spritesToAdd[i].props);
  }

  // load session HUD info
  displaySessionHUDScreen();
};

var joinSession = function(playerId, characterId) {
  var result = {status: false, msg: ""};

  if(!_isMapCreated){
    console.log("Trying to let a player to join session when map is not created");
    result.msg = "Session is unavailable";
    return result;
  } 

  if(_isMapSelectionScreenShown){
    console.log("Trying to let a player to join session when map selection screen is shown");
    result.msg = "Session is switching map";
    return result;
  }

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
    result.msg = "Session "+session.sessionId+" is currently full";
    return result;
  
  }

  // make sure the player is not in the session already
  if(session.players){
    // player already joins the session
    if(session.players[pId]){
      console.log("Player "+pId+" is already in session "+session.sessionId);
      result.msg = "Player "+pId+" has already joined Session "+session.sessionId;
      return result;
      }

    for(var p in session.players){
      if(session.players[p] == cId){
        console.log("Character "+cId+" is already used by Player "+p+" in session "+session.sessionId);
        result.msg = "Character ["+PLAYER_NAMES[cId]+"] in session "+session.sessionId+
                    " is currently in use by other player";
        return result;
      }
    }
  }

  // Reject player join request is time left is less than 15 seconds
  var tLeft = Q.state.get('timeLeft');
  if(tLeft === undefined || tLeft <= 15){
    console.log("Reject join request because session "+session.sessionId+" time left: "+getTimeFormat(tLeft));
    result.msg = "Requested to join session "+session.sessionId+" which is ending it's round soon.";
    return result;
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
  eventData.sessionToken = sessionToken;
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

  sessionId = sId;

  // setup Quintus event listeners
  setupListener();

  var interval_loadGameState = setInterval(function() {
    if (_assetsLoaded) {
      // Assets must be loaded before trying to load the game session. This flag will will be set once assets have been loaded.
      
      // display map selection screen
      displayMapSelectionScreen();
      
      // Don't load a second time
      clearInterval(interval_loadGameState);
    }
  }, 100);
});


// when a player request to join
each(['join', 'playAgain'], function(event) {

  socket.on(event, function(data) {
  
    var pId = data.spriteId;
    if(!pId){
      console.log("Player without sprite id requests to "+event);
      return;
    }

    var cId = data.characterId;
    if(!cId){
      console.log("Player without character id requests to "+event);
      return;
    }

    console.log("Player " + pId + " requests to "+event+" as character "+cId);

    // try to put the player into  the session
    var isJoined = joinSession(pId, cId);
    
    if(isJoined.status){
      // console.log("gameState joined - "+getJSON(gameState));

      // add player and creates sprite for it
      var spawnPoint = getRandomSpawnPoint();

      addPlayerSprite(pId, {
        sheet: PLAYER_CHARACTERS[cId], 
        name: PLAYER_NAMES[cId], 
        characterId: cId,
        x: spawnPoint.x,
        y: spawnPoint.y
      });

      displayInfoScreen("Player "+pId+" has joined");

      // add player kills/deaths to Q.state
      Q.state.trigger('playerJoined', pId);

      // update the new player
      var newPlayerData = {
        gameState: gameState,
        sessionId: session.sessionId, 
        sessionToken: sessionToken
      };

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
});

// When a player joins, he will try to synchronize clocks
socket.on('synchronizeClocks', function(data) {
  data.sessionReceiveTime = getCurrentTime();
  data.clientSendTime = data.timestamp;

  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during clock synchronization");
    return;
  }

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

  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during respawn for player "+pId+" characterId "+cId);
    return;
  }

  var spawnPoint = getRandomSpawnPoint();

  addPlayerSprite(pId, {
    sheet: PLAYER_CHARACTERS[cId], 
    name: PLAYER_NAMES[cId], 
    characterId: cId,
    x: spawnPoint.x,
    y: spawnPoint.y
  });
});

var getRandomSpawnPoint = function(){
    // respawn player and creates sprite for it
  // Get random spawn position
  var tileLayer = Q.stage(STAGE_LEVEL)._collisionLayers[0];
  var randomCoord = tileLayer.getRandomTileCoordInGameWorldCoord(2);
  var MARGIN = 0.1 * tileLayer.p.w; // 10% away from the left/right gameworld edges
  while (randomCoord.x <= MARGIN || randomCoord.x >= (tileLayer.p.w - MARGIN)) {
    randomCoord = tileLayer.getRandomTileCoordInGameWorldCoord(2);
  }
  return {x: randomCoord.x,
          y: randomCoord.y - tileLayer.p.tileH
        };
}

// when one or more players disconnected from app.js
socket.on('playerDisconnected', function(data) {  
  
  // player disconnected does not require session token as it is being sent by app.js

  var pId = data.spriteId
  if(!pId){
    console.log("Player without id is disconnected from session " + session.sessionId);
  }

  console.log("Player " + pId + " is disconnected from session " + session.sessionId);
  displayInfoScreen("Player "+pId+" has left");

  var playerProps = getPlayerProperties(pId);
  // remove player from the session
  leaveSession(pId);
  
  // update app.js regarding session info
  Q.input.trigger('appCast', {eventName:'updateSession', eventData: session});

  // inform every other player about the player disconnection
  var otherPlayersData = {p: playerProps || {} };
  Q.input.trigger('broadcastOthers', {senderId:pId, eventName:'playerDisconnected', eventData: otherPlayersData});
  
  // Update the state (remove this player from the state)
  Q.state.trigger('playerDisconnected', playerProps ? playerProps.name : "" );
  
  // If the viewport is following this player, toggle it
  if (Q.stage(STAGE_LEVEL).viewport.following && Q.stage(STAGE_LEVEL).viewport.following.p.spriteId == pId) {
    Q.input.trigger('toggleFollow');
  }

  // Destroy player and remove him from game state
  removePlayerSprite(pId);
});

// when app.js is disconnected
socket.on('disconnect', function(){
  console.log("App.js is disconnected");

  // ask host to refresh browser again
  displayNotificationScreen("Server cannot be reached\nPlease refresh your page after a while");

  displayStatusScreeen("Unable to connect to the server");
});

// Authoritative message about the movement of the sprite from a client
// Session must obey
socket.on('authoritativeSpriteUpdate', function(data) {
  
  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during authoritativeSpriteUpdate");
    return;
  }

  if (!checkGoodSprite(data.entityType, data.spriteId, 'authoritativeSpriteUpdate socket event')) {
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
  
  //console.log("authoritativeSpriteUpdate from "+data.spriteId +" characterId "+data.characterId);
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

  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during mouseup from player "+pId);
    return;
  }
  
  var player = getPlayerSprite(pId);
  var now = (new Date()).getTime();
  var oneWayDelay = now - data.timestamp;
  var timeBeforeShooting = (1000*PLAYER_FIRE_ANIMATION_TIME) - (2 * oneWayDelay);
  
  console.log("Player firing, timestamp received = " + data.timestamp + " timestamp now = " + now + 
              " one-way delay: " + oneWayDelay + " time before shooting: " + timeBeforeShooting);
  if(player){
    player.trigger('fire', e);
  }

  setTimeout(function() {
    // Fire in (ANIM_TIME - RTT) so that the client will receive it once the animation is finished there
    if (player) {
      player.trigger('fired', {e: e});
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

    var sToken = data.sessionToken;
    if(!sToken || sToken != sessionToken){
      console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during ["+actionName+"] from player "+sId);
      return;
    }

    var player = getPlayerSprite(sId);

    // Simulate player releasing the key
    if(!player){
      console.log("Player without sprite pressed the key");
      return;
    }

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
  
    var sToken = data.sessionToken;
    if(!sToken || sToken != sessionToken){
      console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during ["+actionName+"] from player "+sId);
      return;
    }
    
    var player = getPlayerSprite(sId);

    // Simulate player releasing the key
    if(!player){
      console.log("Player without sprite released the key");
      return;
    }

    var action = actionName.substring(0, actionName.length - "Up".length);//console.log(action);
    player.inputs[action] = false;
  });

},this);

socket.on('toggleNextElementUp', function(data){

    var sId = data.spriteId;
    var eType = data.entityType;


    var sToken = data.sessionToken;
    if(!sToken || sToken != sessionToken){
      console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during toggleNextElementUp");
      return;
    }

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

    var nextElement = (Number(player.p.element) + 1) % ELEBALL_ELEMENTNAMES.length;
    console.log("current "+player.p.element+" received "+nextElement);
    player.p.element = nextElement;
  });