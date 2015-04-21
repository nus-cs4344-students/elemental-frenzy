"use strict";

require(['helper-functions']);

// console.log("connecting");

// ## Connect to the server
var HOSTNAME = "localhost";
var PORT = 4344;
var io = io();
var socket = io.connect("http://" + HOSTNAME + ":" + PORT);

// Debugging purpose
// App.js can be replying too fast that socket.on() event listener is only registered after 'connected' message arrives

//socket.on('connected',function (data) {console.log('first connected: '+JSON.stringify(data,null,4));});

var sessions = {};
var sessionToken;
var selfId;
var sessionId;
var allSprites;
var gameState;
var infoState;
var isSession = false;
var _isJoinSent = false;

var SOUND_NOTENOUGHMANA = "manaInsufficient.ogg";

// Sprites being used for players currently are a bit fatter (width is larger) than they actually look like
var PLAYERACTOR_WIDTHSCALEDOWNFACTOR = 0.55;

// Networking
var threshold_clientDistanceFromServerUpdate = 30;
var interval_updateServer_timeInterval = 100;       // time interval between authoritative updates to the server
var time_sentMouseUp;
var timestampOffset = 0;
var timestampOffsetSum = 0;           // used so as to allow multiple synchronization packets
var numSyncPacketsReceived = 0;       //
var NUM_SYNC_PACKETS_TOSEND = 10;     // send this many packets when synchronizeClocks() is called
var INTERVAL_TIME_SYNCCLOCKS = 60000; // try to sync clocks with server every 60s

// RTT-related
var avgRtt = 0;
var rttAlpha = 0.9; // weighted RTT calculation depends on this. 0 <= alpha < 1 value close to one makes the rtt respond less to new segments of delay

// Global flags for synchronization
var _isSessionConnected = false;
var _isWelcomeScreenShown = false;
var _clockSynchronized = false;
var _isGameLoaded = false;
var _isEndGame = false;
var selfCharacterId;

var STATUS_CONNECTION = "Connected to 'Session [id]' ([level])";

// Updates the average RTT with the new sample oneWayDelay using a weighted average
var updateAvgRtt = function (oneWayDelay) {
  if (!_clockSynchronized) {
    // Cannot accurately update the RTT
    return;
  }
  if (typeof oneWayDelay === 'undefined') {
    console.log("Error in updateAvgRtt(): oneWayDelay is undefined");
    return;
  }

  avgRtt = (rttAlpha * avgRtt) + ((1.0 - rttAlpha) * (2 * oneWayDelay));
  //console.log("sample onewaydelay: " + oneWayDelay + " new avgRtt " + getAvgRtt());
  return avgRtt;
};

var getAvgRtt = function () {
  if (!_clockSynchronized) { // cannot accurately get the avgRtt
    return 0;
  }
  
  return avgRtt;
};

var creates = {
  PLAYER:         function (p) { return new Q.Player(p); },
  ACTOR:          function (p) { return new Q.Actor(p); },
  PLAYERELEBALL:  function (p) { return new Q.PlayerEleball(p); },
  ENEMYELEBALL:   function (p) { return new Q.EnemyEleball(p); },
  ENEMY:          function (p) { return new Q.Enemy(p); },
  POWERUP:        function (p) { return new Q.Powerup(p); },
  LADDER:         function (p) { return new Q.Ladder(p); }
};

var getDefaultSprites = function () {  
  var defaultSprites = {  PLAYER: {},
                          ACTOR: {},
                          PLAYERELEBALL: {},
                          ENEMYELEBALL: {},
                          ENEMY: {},
                          POWERUP: {},
                          LADDER: {}
                        };
  return defaultSprites;
};

var getDefaultGameState = function () {
  var defaultGameState = {
    level: '',
    sprites: getDefaultSprites(),
    kills: {},
    deaths: {}
  };

  return defaultGameState;
};

var getJSON = function (obj) {
  return JSON.stringify(obj, null, 4);
};

var getCurrentTime = function () {
  return (new Date()).getTime();
};


var isCyclic = function (obj) {
  var seenObjects = [];

  function detect(obj) {
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
};

var cloneObject = function (obj) {
  var clone = {};
  for(var oKey in obj) {
    var item = obj[oKey];
    if(item instanceof Array) {
      clone[oKey] = cloneArray(item);
    }else if(typeof item === 'object') {
      clone[oKey] = cloneObject(item);
    }else{
      clone[oKey] = item;
    }
  }

  return clone;
};

var cloneArray = function (arr) {
  var clone = [];
  for(var i = 0; i<arr.length; i++) {
    var item = arr[i];
    if (typeof item === 'undefined') {
      continue;
    }
    if(item instanceof Array) {
      clone.push(cloneArray(item));
    }else if(typeof item === 'object') {
      clone.push(cloneObject(item));
    }else{
      clone.push(item);
    }
  }
  return clone;
};

var clone = function (item) {
  if (isCyclic(item)) {
    return;
  }
  if(item instanceof Array) {
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

// Make sure that the sprite is good, and returns true if so, false otherwise (and logs console messages)
var checkGoodSprite = function (eType, spriteId, callerName) {
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

var updateSprite = function (entityType, id, properties) {
  
  var eType = entityType;
  if(!eType) {
    console.log("Trying to update sprite without entityType");
    return;
  }

  var spriteId = id;
  switch(eType) {
    case 'PLAYER':{
      if(spriteId && spriteId != selfId) {
        eType = 'ACTOR';
      }
      break;
    }
    case 'ACTOR':{
      if(spriteId && spriteId == selfId) {
        eType = 'PLAYER';
      }
      break;
    }
    default:{
      break;
    }
  }

  if(!spriteId) {
    console.log("Trying to update sprite "+eType+" without id");
    return;
  }

  // Clone to avoid bad stuff happening due to references
  //console.log("Cloning properties of " + eType + " " + spriteId);
  var clonedProps = clone(properties);
  //console.log("Done cloning properties of " + eType + " " + spriteId);
  if(!clonedProps) {
    console.log("Trying to update sprite "+eType+" id "+spriteId+" with empty properties");
    return;
  }

  if(!isSpriteExists(eType, spriteId)) {
    console.log("Trying to update non existing sprite "+eType+" "+spriteId);
    return;
  }
  
  var spriteToUpdate = getSprite(eType, spriteId);
  clonedProps.isServerSide = false;
  // The player will be the authority for his position and movement, the server follows,
  // so don't update the player
  if (eType == 'PLAYER' && spriteId == selfId) {
    // Include here the properties of a player that should get updated by the server
    // Health/mana-related
    spriteToUpdate.p.currentHealth = clonedProps.currentHealth;
    spriteToUpdate.p.maxHealth = clonedProps.maxHealth;
    spriteToUpdate.p.currentMana = clonedProps.currentMana;
    spriteToUpdate.p.maxMana = clonedProps.maxMana;

  } else {
    spriteToUpdate.p = Q._defaults(clonedProps, spriteToUpdate.p);
  }
  
  gameState.sprites[eType][spriteId].p = cloneValueOnly(spriteToUpdate.p);

  return;
}

var getSprite = function (entityType, id) {
  var eType = entityType;
  if(!eType) {
    console.log("Trying to get sprite without entityType");
    return;
  }

  var spriteId = id;
  switch(eType) {
    case 'ACTOR':{
      if(selfId == spriteId) {
        eType = 'PLAYER';
      }
      break;
    }
    case 'PLAYER':{
      if(selfId != spriteId) {
        eType = 'ACTOR';
      }
      break;
    }
    default:{
      break;
    }
  }

  if(!spriteId) {
    console.log("Trying to get sprite "+eType+" without id");
  }

  if (allSprites) {
    return allSprites[eType][spriteId];
  } else {
    return;
  }
};

var getPlayerSprite = function (playerId) {
  return getSprite('PLAYER' , playerId);
};

var getEnemySprite  = function (enemyId) {
  return getSprite('ENEMY' , enemyId);
};

var getActorSprite = function (actorId) {
  return getSprite('ACTOR' , actorId);
};

var getSpriteProperties = function (entityType, id) {
  // console.log("Getting sprite properties of "+entityType+" id " + id);
  
  var eType = entityType;
  if(!eType) {
    console.log("Trying to get sprite properties without entityType");
    return;
  }

  var spriteId = id;
  switch(eType) {
    case 'ACTOR':{
      if(selfId == spriteId) {
        eType = 'PLAYER';
      }
      break;
    }
    default:{
      break;
    }
  }

  if(!spriteId) {
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

var getPlayerProperties = function (playerId) {
  return getSpriteProperties('PLAYER', playerId);
};

var getEnemyProperties  = function (enemyId) {
  return getSpriteProperties('ENEMY' , enemyId);
};

var getEnemyEleballProperties  = function (ballId) {
  return getSpriteProperties('ENEMYELEBALL' , enemyId);
};

var getPlayerEleballProperties  = function (ballId) {
  return getSpriteProperties('PLAYERELEBALL' , ballId);
};

var getActorProperties  = function (actorId) {
  return getSpriteProperties('ACTOR' , actorId);
};

var isSpriteExists = function (entityType, id) {
  var eType = entityType;
  if(!eType) {
    console.log("Trying to check existence of sprite without entityType");
    return;
  }

  var spriteId = id;
  switch(eType) {
    case 'PLAYER':{
      if(spriteId && spriteId != selfId) {
        eType = 'ACTOR';
      }
      break;
    }
    case 'ACTOR':{
      if(spriteId && spriteId == selfId) {
        eType = 'PLAYER';
      }
      break;
    }
    default:{
      break;
    }
  }

  if(!spriteId) {
    console.log("Trying to check existence of sprite "+eType+" without id");
    return;
  }

  return Boolean(getSprite(eType, spriteId));
}
/*
 Create and add sprite into game state and insert it into active stage
 */
var addSprite = function (entityType, id, properties) {
  var eType = entityType;
  if(!eType) {
    console.log("Trying to add sprite without entityType");
    return;
  }
  if (!allSprites[eType]) {
    console.log("Trying to add sprite of type " + eType + " that currently is not in allSprites array");
    return;
  }

  var spriteId = id;
  switch(eType) {
    case 'PLAYER':{
      if(spriteId && spriteId != selfId) {
        eType = 'ACTOR';
      }
      break;
    }
    case 'ACTOR':{
      if(spriteId && spriteId == selfId) {
        eType = 'PLAYER';
      }
      break;
    }
    default:{
      break;
    }
  }

  if(!spriteId) {
    console.log("Trying to add sprite "+eType+" without id");
    return;
  }

  //console.log("Cloning properties of " + eType + " " + spriteId);
  var clonedProps = clone(properties);
  //console.log("Done cloning properties of " + eType + " " + spriteId);
  if(!clonedProps) {
    clonedProps = {};
    console.log("Trying to add sprite with default properties");
  }  

  if(isSpriteExists(eType,spriteId)) {
    // sprite already exists
    console.log("Sprite " + eType + " id " + spriteId + " already exists");
    return;
  }
  clonedProps.isServerSide = false; 

  
  //console.log("Added sprite " + eType + " id " + spriteId);
  var sprite = creates[eType](clonedProps);
  
  // DEBUGGING PURPOSES
  if (eType == 'PLAYERELEBALL' && clonedProps.shooterId == selfId) {
    var now = getCurrentTime();
    console.log("Creating player eleball after " + (now - time_sentMouseUp) + "ms from sending mouse up event to server");
  }

  if(spriteId == selfId && eType == 'PLAYER') {
    
    // Update server about the player's position (player authority on his movement)
    var interval_updateServer = setInterval(function () {
      //console.log("interval for sprite "+sprite.p.spriteId);
      if (!sprite || sprite.p.isServerSide || 
          sprite.p.isDead || !_isSessionConnected || !_isGameLoaded) {
        // (Defensive) Remove interval because it is gone/not on the client side
        console.log("clearing interval for sprite "+sprite.p.spriteId);
        clearInterval(interval_updateServer);
      }

      Q.input.trigger('sessionCast', {
        eventName:'authoritativeSpriteUpdate', 
        eventData: {
          entityType: 'PLAYER',
          spriteId: sprite.p.spriteId,
          p: sprite.p
      }});

    }, interval_updateServer_timeInterval);


    if(!Q.stage(STAGE_LEVEL).has('viewport')) {
      Q.stage(STAGE_LEVEL).add('viewport');
    }

    Q.stage(STAGE_LEVEL).softFollow(sprite);

    if(!Q.stage(STAGE_MINIMAP).has('viewport')) {
      Q.stage(STAGE_MINIMAP).add('viewport');
    }

    Q.stage(STAGE_MINIMAP).softFollow(sprite);
  }

  // store sprite reference
  allSprites[eType][spriteId] = sprite;
  
  insertIntoStage(sprite);
  
  // store sprite properties into game state
  gameState.sprites[eType][spriteId] = {p: cloneValueOnly(sprite.p)};

  return sprite;
};

var addPlayerSprite = function (playerId, properties) {
  return addSprite('PLAYER', playerId, properties);
};

var addEnemySprite = function (enemyId, properties) {
  return addSprite('ENEMY', enemyId, properties);
};

var addEnemyEleballSprite = function (ballId, properties) {
  return addSprite('ENEMYELEBALL', ballId, properties);
};

var addPlayerEleballSprite = function (ballId, properties) {
  return addSprite('PLAYERELEBALL', ballId, properties);
};

var addActorSprite = function (actorId, properties) {
  return addSprite('ACTOR', actorId, properties);
};

var addPowerup = function (powerupId, properties) {
  return addSprite('POWERUP', powerupId, properties);
}

/*
 Delete and remove sprite from game state and remove it from active stage
 */
var removeSprite = function (entityType, id) {
  var eType = entityType;
  if(!eType) {
    console.log("Trying to remove sprite without entityType");
    return;
  }

  var spriteId = id;
  switch(eType) {
    case 'PLAYER':{
      if(spriteId && spriteId != selfId) {
        eType = 'ACTOR';
      }
      break;
    }
    case 'ACTOR':{
      if(spriteId && spriteId == selfId) {
        eType = 'PLAYER';
      }
      break;
    }
    default:{
      break;
    }
  }
  if(!spriteId) {
    console.log("Trying to remove sprite "+eType+" without id");
    return;
  }

  if(!isSpriteExists(eType, spriteId)) {
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


var removePlayerSprite = function (playerId) {
  return removeSprite('PLAYER', playerId);
};

var removeEnemySprite = function (enemyId) {
  return removeSprite('ENEMY', enemyId);
};

var removeEnemyEleballSprite = function (ballId) {
  return removeSprite('ENEMYELEBALL', ballId);
};

var removePlayerEleballSprite = function (ballId) {
  return removeSprite('PLAYERELEBALL', ballId);
};

var removeActorSprite = function (actorId) {
  return removeSprite('ACTOR', actorId);
};

var insertIntoStage = function (sprite) {
  return Q.stage(STAGE_LEVEL).insert(sprite);
};

var updateSessions = function (sessionsInfo) {
  console.log("updated sessions: "+getJSON(sessionsInfo));

  sessions = sessionsInfo;

  if(_isSessionConnected) {
    console.log("Sessions updated but player already in game, Skipping welcome screen update");
    return;
  }

  if(_isWelcomeScreenShown) {
    // refresh welcome screen
    displayWelcomeScreen();
  }
}

var setupEventListeners = function () {

  Q.input.on('join', function (data) {
    // prevent join button spamming
    if(_isJoinSent) {
      return ;
    }

    console.log("join "+getJSON(data));

    var sId = data.sessionId;
    if(!sId) {
      console.log("Trying to join a session without session id");
      return;
    }

    var cId = data.characterId;
    if(!cId) {
      console.log("Trying to join session "+sId+" without character id");
      return;
    }

    _isJoinSent = true;
    selfCharacterId = cId;
    // send request to app.js of joining a session
    Q.input.trigger('sessionCast', {
      eventName:'join', 
      eventData: {
        spriteId: selfId, 
        sessionId: sId, 
        characterId: cId
      }
    });
  });

  Q.input.on('respawn', function (data) {
    console.log("respawn "+getJSON(data));

    var sId = data.sessionId;
    sId = sId ? sId : sessionId; 
    if(!sId) {
      console.log("Trying to respawn in a session without session id");
      return;
    }

    var spriteId = data.spriteId;
    if(!spriteId) {
      console.log("Trying to respawn in session "+sId+" without sprite id");
      return;
    }

    var cId = data.characterId;
    if(!cId) {
      console.log("Trying to respawn in session "+sId+" without character id");
      return;
    }

    // send request to app.js of respawning in a session
    Q.input.trigger('sessionCast', {
      eventName:'respawn', 
      eventData: {
        spriteId: selfId, 
        sessionId: sId, 
        characterId: cId
      }
    });
  });

  Q.input.on('playAgain', function(){
    Q.input.trigger('sessionCast', {
      eventName: 'playAgain', 
      eventData: {
        spriteId: selfId, 
        sessionId: sessionId, 
        characterId: selfCharacterId
      }
    });
    
  });

  Q.input.on('switch', function(){
    console.log('switch session');

    // tell everyone in the session that currnet session is switching map
    Q.input.trigger('sessionCast', {'eventName': 'playerDisconnected', eventData: {spriteId: selfId}});

    resetGameState();

    _isSessionConnected = false;
    _isGameLoaded = false;
    _isJoinSent = false;
    _isEndGame = false;

    displayWelcomeScreen();
  });

    
  Q.input.on('sessionCast', function (data) {

    var sId = data.eventData.sessionId;
    sId = sId ? sId : sessionId; 

    if(!sId) {
      console.log("SessionCast without sessionId");
      return;
    }

    if(!data) {
      console.log("SessionCast without data");
      return;
    }

    if(!data.eventName) {
      console.log("SessionCast without eventName");
      return;
    }

    if(!_isSessionConnected && data.eventName != 'join') {
      console.log("Session disconnected, event ["+getJSON(data.eventName)+"] is not sent to session");
      return;
    }

    data.eventData['sessionId'] = sId;
    sendToApp(data.eventName, data.eventData);
  });

  Q.input.on('appCast', function (data) {
    sendToApp(data.eventName, data.eventData);
  });


  // Player inputs event listeners 
  var actionDispatch = function (actionName) {
    Q.input.on(actionName, function () {

      if(!_isSessionConnected) {
        return;
      }

      var eData = { sessionId: sessionId,
                  spriteId: selfId,
                  entityType: 'PLAYER'
      };

      Q.input.trigger('sessionCast', {eventName:actionName, eventData: eData});
    
    });
  };

  each(['left', 'leftUp', 'right', 'rightUp', 'up', 'upUp', 'down', 'downUp'], actionDispatch ,this);

  Q.input.on('displayScoreScreen', function () {
    displayScoreScreen();
  });

  Q.input.on('displayScoreScreenUp', function () {
    hideScoreScreen();
  });

  // intially no orientation detected
  // true = landscape
  // false = portrait
  var deviceOrientation = undefined;
  var prevAccX , prevAccY , prevAccZ, isUpPrev;

  var setDeviceOrientation = function () {
    // everytime device orientation changed
    // reset previously recorded x,y,z values
     prevAccX = prevAccY = prevAccZ = undefined;
     isUpPrev = false;

    switch(window.orientation) {  
      case -90:
      case 90:
        deviceOrientation = true;
        break; 
      default:
        deviceOrientation = false;
        break; 
    }
  };

  setDeviceOrientation();
  window.addEventListener('orientationchange', setDeviceOrientation);

  // activate mobile sensor to trigger toggleNextElement event
  if(window.DeviceMotionEvent) {

    // console.log('devicemotion supported');

    var accX = undefined,
        accY = undefined,
        accZ = undefined;
    var isUp = false;
    var diff;

    window.addEventListener('devicemotion', function (event) {
        accX = event.acceleration.x;
        accY = event.acceleration.y;
        accZ = event.acceleration.z;

        if(deviceOrientation) {
          // landscape

          if(typeof prevAccY !== 'undefined') {

            diff = Math.abs(prevAccY - accY);

            // ensure difference is more than 0.5 to filter off noise
            isUp = diff < 0.7 ? isUp : prevAccY < accY ; 

            if(diff > 1.9 && isUp != isUpPrev) {
              // console.log("toggle on landscape");
              Q.input.trigger('toggleNextElementUp');
            }
          }
        }else{
          // portrait

          if(typeof prevAccX !== 'undefined') {

            diff = Math.abs(prevAccX - accX);

            // ensure difference is more than 0.5 to filter off noise
            isUp = diff < 0.7 ? isUp : prevAccX < accX ; 

            if(diff > 2.9 && isUp != isUpPrev) {
              // console.log("toggle on portrait");
              Q.input.trigger('toggleNextElementUp');
            }

          }
        }

        prevAccX = accX;
        prevAccY = accY;
        prevAccZ = accZ;
        isUpPrev = isUp;

    }, false);
  }


  each(['togglePreviousElementUp','toggleNextElementUp'], function(actionName) {
    
    Q.input.on(actionName, function () {

      if(!_isGameLoaded) {
        // client side need to be connected to the server in order
        // to show score screen
        return;
      }

      var player = getPlayerSprite(selfId);
      if(!player || player.p.toggleElementCooldown > 0) {
        // player is died or cannot located current player sprite
        // player toggleElement is in cooldown
        return;
      }

      player.p.toggleElementCooldown = PLAYER_DEFAULT_TOGGLE_ELEMENT_COOLDOWN;

      
      var eleSign = actionName == 'togglePreviousElementUp' ? -1 : 1;
      var ele = (Number(player.p.element) + eleSign);
     
      if(ele < 0 ) {
        ele = ELEBALL_ELEMENTNAMES.length + ele;
      }

      var nextElement = ele % ELEBALL_ELEMENTNAMES.length;
      player.p.element = nextElement;

      var eData = { sessionId: sessionId,
                    spriteId: selfId,
                    entityType: 'PLAYER'
      };

      Q.input.trigger('sessionCast', {eventName: actionName, eventData: eData});
    });
  });

  var handleMouseOrTouchEvent = function (e) {
    
    var player = getPlayerSprite(selfId);
    
    if(!_isGameLoaded || !player) {
      // game state need to be loaded
      return;
    }
    
    if (player.p.firingCooldown <= 0) {
      if (!player.p.canFire) console.log("Setting canFire to true in client-socket");
      player.p.canFire = true;
      player.p.firingCooldown = 0;
    }
    
    if(!player.p.canFire || player.p.isDead) {
        //console.log("cannot shoot canFire? " + player.p.canFire);
      return;
    }
    if (player.p.currentMana < player.p.manaPerShot) {
      // Play not enough mana sound
      Q.audio.play(SOUND_NOTENOUGHMANA);
      return;
    }

    var stage = Q.stage(STAGE_LEVEL);
    var touch = e.changedTouches ?  e.changedTouches[0] : e;

    var touchLocation = Q.input.touchLocation(touch);
    var mouseX = Q.canvasToStageX(touchLocation.x, stage);
    var mouseY = Q.canvasToStageY(touchLocation.y, stage);
    
    // Client side player fires the event!
    var createdEvt = {
      x: mouseX,
      y: mouseY
    };

    // prevent event propagation
    // e.preventDefault();

    var eData = { sessionId: sessionId,
                  spriteId: selfId,
                  entityType: 'PLAYER',
                  e: createdEvt
    };

    time_sentMouseUp = getCurrentTime();
    //console.log("Sent mouseup event to server at time " + time_sentMouseUp);

    Q.input.trigger('sessionCast', {eventName:'mouseup', eventData: eData});
    
    // Trigger the fire animation of the player
    if(player) {
      player.trigger('fire', createdEvt);
    } else {
      console.log("Cannot locate current player to perform mouseup");
    }
  };

  // listening to touch start firing
  Q.el.addEventListener('touchstart',function (e) {

    var i, len, tch, key;
    var keypad = Q.input.keypad;

    // determine if the touch location is on one of the keys shown to the player
    function getKey(touch) {
      var pos = Q.input.touchLocation(touch),
          minY = keypad.bottom - keypad.unit;

      for(var i=0,len=keypad.controls.length;i<len;i++) {
        var minX = i * keypad.unit + keypad.gutter;
        if(pos.x >= minX && pos.x <= (minX+keypad.size) && 
          (keypad.fullHeight || (pos.y >= minY + keypad.gutter && pos.y <= (minY+keypad.unit - keypad.gutter)))) {
          return keypad.controls[i][0];
        }
      }
    }

    var touches = event.touches ? event.touches : [ event ];
    
    // go through all the touch events
    for(i=0,len=touches.length;i<len;i++) {
      tch = touches[i];
      key = getKey(tch);

      // not the key shown to the player
      // it should be a firing action
      if(!key) {
        handleMouseOrTouchEvent(e);
      }
    }

    // prevent event propagation
    // e.preventDefault();
  });

  // Event listener for mouse up firing
  Q.el.addEventListener('mouseup', function (e) {
    handleMouseOrTouchEvent(e);
  });
};

var resetDisplayScreen = function () {
  // clear all screens
  Q.clearStages();
  Q.stageScene(SCENE_BACKGROUND, STAGE_BACKGROUND);

  _isWelcomeScreenShown = false;
};

var displayNotificationScreen = function (msg, callback) {
  var stageOptions = {msg: msg,
                      buttons: [{label: 'OK', callback: callback}]};
  Q.stageScene(SCENE_NOTIFICATION, STAGE_NOTIFICATION, stageOptions);
};

var displayInfoScreen = function(msg){
  Q.stageScene(SCENE_INFO, STAGE_INFO, {msg: msg});
};

var displayStatusScreeen = function (msg) {
  if(!msg) {
    console.log("No message passed in when calling displayStatusScreeen");
    return;
  }

  Q.stageScene(SCENE_STATUS, STAGE_STATUS, {msg: msg});
};

var displayPlayerHUDScreen = function () {
  Q.stageScene(SCENE_HUD, STAGE_HUD);
};

var displayScoreScreen = function () {

  if(!_isSessionConnected || !_isGameLoaded) {
    // client side need to be connected to the server in order
    // to show score screen
    return;
  }

  hideScoreScreen();

  if(!_isEndGame){
    Q.stageScene(SCENE_SCORE, STAGE_SCORE); 
  }
};

var hideScoreScreen = function () {
  if(!_isSessionConnected || !_isGameLoaded) {
    // client side need to be connected to the server in order
    // to show score screen
    return;
  }

  Q.clearStage(STAGE_SCORE);
};

var displayEndGameScreen = function(){
  Q.clearStage(STAGE_SCORE);
  Q.stageScene(SCENE_END_GAME, STAGE_END_GAME, {endGame: _isEndGame});
};

// ## Loads welcome screen
var displayWelcomeScreen = function () {
  resetDisplayScreen();

  // character selection
  Q.stageScene(SCENE_WELCOME, STAGE_WELCOME);

  _isWelcomeScreenShown = true;
};

var displayGameScreen = function (level) {
  resetDisplayScreen();

  // Load the level
  Q.stageScene(SCENE_LEVEL, STAGE_LEVEL, {level: level});
  
  Q.stageScene(SCENE_LEVEL, STAGE_MINIMAP, {miniStage: STAGE_LEVEL, level: level});

  // Shrink the bounding box for the sprites' width to fit its real width
  // for PLAYER and ACTOR sprites only
  Q.stage(STAGE_LEVEL).on('inserted', function(item) {
    if (item && item.p && (item.p.entityType == 'PLAYER' || item.p.entityType == 'ACTOR') ) {
      var prevW = item.p.w;
      item.p.w *= PLAYERACTOR_WIDTHSCALEDOWNFACTOR;
      Q._generatePoints(item, true);
      item.p.w = prevW;
    }
  });
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

  resetState(clone(infoState));
};

// ## Loads the game state.
var loadGameSession = function (receivedGameState) {
  console.log("Loading game state...");

  // load default values
  gameState = receivedGameState || getDefaultGameState();
  allSprites = getDefaultSprites();

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

  // console.log("before adding "+isCyclic(gameState.sprites.p));
  
  for(var i =0; i< spritesToAdd.length; i++) {
    addSprite(spritesToAdd[i].entityType, 
              spritesToAdd[i].eId, 
              spritesToAdd[i].props);
  }

  // console.log("after adding "+isCyclic(gameState.sprites.p));
  
  // show connected status
  var status = STATUS_CONNECTION.replace('[id]', sessionId);
  var mapName = MAP_LEVELS[gameState.level];
  if(mapName){
    status = status.replace('[level]', mapName);
  }
  displayStatusScreeen(status);
  
  // load player HUD info
  displayPlayerHUDScreen();
  
  _isGameLoaded = true;
}

var sendToApp = function (eventName, eventData) {
  eventData.timestamp = (new Date()).getTime();
  eventData.timestamp += timestampOffset;
  eventData.sessionToken = sessionToken;
  socket.emit('player', {eventName: eventName, eventData: eventData, senderId: selfId});
}


// when client is connected to app.js
socket.on('connected', function (data) {
  var sId = data.spriteId;
  if(!sId) {
    console.log("Connected as PLAYER without id");
    return;
  }

  var s = data.sessions;
  if(!s) {
    console.log("Connected as PLAYER "+selfId + " without session info");
    return;
  }

  selfId = sId;
  console.log("Connected as PLAYER "+selfId);

  updateSessions(s);

  // setup Quintus event listeners
  setupEventListeners();

  var interval_displayWelcomeScreen = setInterval(function () {
    if (_assetsLoaded) {
      // Assets must be loaded before trying to load the welcome screen. This flag will will be set once assets have been loaded.
      
      // load welcome screen
      displayWelcomeScreen();

      // Don't load a second time
      clearInterval(interval_displayWelcomeScreen);
    }
  }, 100);
});

socket.on('updateSessions', function (data) {

  var s = data.sessions;
  if(!s) {
    console.log("updateSessions without session info");
    return;
  }

  updateSessions(s);
});

socket.on('gameStateChanged', function (data) {
  //console.log("Received event gameStateChanged");

  var sToken = data.sessionToken;
  if(sessionToken !== undefined && (!sToken || sToken != sessionToken)){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during gameStateChanged");
    return;
  }

  if (typeof data.kills === 'undefined') {
    console.log("Error in event gameStateChanged: data.kills is undefined");
    return;
  }
  if (typeof data.deaths === 'undefined') {
    console.log("Error in event gameStateChanged: data.deaths is undefined");
    return;
  }
  if (typeof data.timeLeft === 'undefined') {
    console.log("Error in event gameStateChanged: data.timeLeft is undefined");
    return;
  }
  if (typeof data.totalTime === 'undefined') {
    console.log("Error in event gameStateChanged: data.totalTime is undefined");
    return;
  }
  
  // console.log("timeleft: " + data.timeLeft + " totaltime = " + data.totalTime);
  
  if(!_isGameLoaded){
    // received game state update before game is loaded
    infoState = {kills: data.kills, deaths: data.deaths, timeLeft: data.timeLeft, totalTime: data.totalTime};
  }else{
    // recieve game state update after game is loaded
    Q.state.set({kills: data.kills, deaths: data.deaths, timeLeft: data.timeLeft, totalTime: data.totalTime});
  }
});

// player successfully joined a session and receive game state + session info 
socket.on('joinSuccessful', function (data) {
  console.log("Successfully joined session " + data.sessionId);

  sessionId = data.sessionId;
  sessionToken = data.sessionToken;
  infoState = data.infoState;

  // console.log("Joined : "+getJSON(data));

  _isSessionConnected = true;
  _isEndGame = false;
  
  // Try to synchronize clock with session (timestamp is automatically appended when sending in sendToApp())
  synchronizeClocksWithServer();
  var interval_syncClocks = setInterval(function () {
    if (!_isSessionConnected) {
      // Session disconnected, stop syncing
      clearInterval(interval_syncClocks);
      timestampOffset = 0;
      return;
    }
    synchronizeClocksWithServer();
  }, INTERVAL_TIME_SYNCCLOCKS);
  
  // Asset for the game state should be loaded ahen welcome screen is loaded
  // Load the initial game state
  var receivedGameState = data.gameState;
  var interval_loadGameSession = setInterval(function () {
    
    // Only load the game after the clock is synchronized
    if (_clockSynchronized) {

      console.log("Clock synchronized with timestampOffset = " + timestampOffset);
      resetGameState();
      loadGameSession(receivedGameState);
      clearInterval(interval_loadGameSession);
    }
  }, 100);
});

socket.on('endGame', function(data){
  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during endGame");
    return;
  }

  _isGameLoaded = false;
  _isEndGame = true;
  displayEndGameScreen();
});

var synchronizeClocksWithServer = function () {
  timestampOffsetSum = 0;     
  numSyncPacketsReceived = 0;
  for (var i = NUM_SYNC_PACKETS_TOSEND; i >= 1; i--) {
    Q.input.trigger('sessionCast', {
      eventName: 'synchronizeClocks',
      eventData: {playerId: selfId, packetNum: i, clientSendTime: new Date().getTime()}
    });
  }
}

socket.on('synchronizeClocks', function (data) {

  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during clock synchronization");
    return;
  }

  // Using http://en.wikipedia.org/wiki/Network_Time_Protocol#Clock_synchronization_algorithm
  var clientReceiveTime = getCurrentTime();         // t3
  var sessionSendTime = data.timestamp;             // t2
  var sessionReceiveTime = data.sessionReceiveTime; // t1
  var clientSendTime = data.clientSendTime;         // t0
  
  numSyncPacketsReceived++;
  
  timestampOffsetSum += ((sessionReceiveTime - clientSendTime) + (sessionSendTime - clientReceiveTime)) / 2;
  
  var packetNum = data.packetNum; // last synchronization packet is 1
  if (packetNum == 1 || numSyncPacketsReceived == NUM_SYNC_PACKETS_TOSEND) {
    timestampOffset = timestampOffsetSum / numSyncPacketsReceived;
    _clockSynchronized = true;
    console.log("timestampOffset calculated after syncing clocks with session: " + timestampOffset);
  }
});

// Failed to join a session
socket.on('joinFailed', function (data) {
  console.log("Player "+selfId+" failed to join sesssion "+data.sessionId+" due to '"+data.msg+"'");

  _isSessionConnected = false;
  _isGameLoaded = false;
  _isJoinSent = false;
  _isEndGame = false;
  
  displayNotificationScreen("Failed to join session "+data.sessionId+" due to\n["+data.msg+"]", displayWelcomeScreen);
});

// add sprite
socket.on('addSprite', function (data) {

  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during addSprite");
    return;
  }

  var props = data.p;
  if(!props) {
    console.log("addSprite without properties");
    return;
  }

  var eType = props.entityType;
  if(!eType) {
    console.log("addSprite without entityType in properties");
    return;
  }

  var spriteId = props.spriteId;
  if(!spriteId) {
    console.log("addSprite without id in properties");
    return;
  }

  if(isSpriteExists(eType, spriteId)) {
    console.log("addSprite "+eType+" id "+spriteId+" which already exists");
    return;
  }

  if (eType == 'PLAYERELEBALL') {
    if (props.shooterId != selfId) {
      // not my eleball! Use local-perception filter
      props.lpfTimeLeft = 0.5; // time left to finish the LPF (decreases to 0)
      props.lpfNeededX = props.vx * getAvgRtt() / 1000; // extra distance in the x-axis that must be covered
      props.lpfNeededY = props.vy * getAvgRtt() / 1000; // extra distance in the y-axis that must be covered
    } else {
      // my eleball! Also use local-perception filter, but slightly different; start the x and y from my position,
      // and set lpfNeededX and lpfNeededY to the difference between the eleball start pos and the eleball at my pos
      var player = getPlayerSprite(selfId);
      
      var newX, newY; // newX and newY which will be at my pos
      var angleDeg = props.angle;
      // fire ball location offset from player
      var ballToPlayerY = Math.abs((player.p.h/2 + props.h/2) * Math.sin(angleDeg*Math.PI/180.0)) * ELEBALL_PLAYER_SF;
      if(angleDeg <= 360 && angleDeg > 180) {
        // deduct ball width due to the direction of the ball is set to be default at right direction
        newY = player.p.y - ballToPlayerY;
      } else {
        newY = player.p.y + ballToPlayerY;
      }

      var ballToPlayerX = Math.abs((player.p.w/2 + props.w/2) * Math.cos(angleDeg*Math.PI/180.0)) * ELEBALL_PLAYER_SF;
      if(angleDeg <= 270 && angleDeg > 90) {
        newX = player.p.x - ballToPlayerX;
      } else {
        newX = player.p.x + ballToPlayerX;
      }
      
      props.lpfTimeLeft = 0.5;
      props.lpfNeededX = props.x - newX;
      props.lpfNeededY = props.y - newY;
      
      props.x = newX;
      props.y = newY;
    }
  }else if(eType == 'PLAYER') {
    displayInfoScreen("Player "+props.name+" has joined");
  }
  addSprite(eType, spriteId, props);
});

// update sprite
socket.on('updateSprite', function (data) {

  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during updateSprite");
    return;
  }


  if (_clockSynchronized) {
    var receivedTimeStamp = data.timestamp;
    var curTimeStamp = (new Date()).getTime() + timestampOffset;
    var oneWayDelay = curTimeStamp - receivedTimeStamp;
    
    // Update rtt
    updateAvgRtt(oneWayDelay);  
    //console.log("aurhoritativeSpriteUpdate: avgRtt to the session is " + getAvgRtt());
  }
  
  //console.log("Message: updateSprite: timeStamp: ");
  //console.log("Received time: " + receivedTimeStamp + " current time: " + curTimeStamp + " one-way delay: " + oneWayDelay);
  if (!_isSessionConnected || !_clockSynchronized || !_isGameLoaded) {
    return;
  }

  var props = data.p;
  if(!props) {
    console.log("updateSprite without properties");
    return;
  }

  var eType = props.entityType;
  if(!eType) {
    console.log("updateSprite without entityType in properties");
    return;
  }

  var spriteId = props.spriteId;
  if(!spriteId) {
    console.log("updateSprite without id in properties");
    return;
  }

  if(!isSpriteExists(eType, spriteId)) {
    console.log("updateSprite "+eType+" id "+spriteId+" which does not exists");
    addSprite(eType, spriteId, props);
    return;
  }

  updateSprite(eType, spriteId, props);
});

// remove sprite
socket.on('removeSprite', function (data) {
  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during removeSprite");
    return;
  }

  var props = data.p;
  if(!props) {
    console.log("removeSprite without properties");
    return;
  }

  var eType = props.entityType;
  if(!eType) {
    console.log("removeSprite without entityType in properties");
    return;
  }

  var spriteId = props.spriteId;
  if(!spriteId) {
    console.log("removeSprite without id in properties");
    return;
  }

  if(!isSpriteExists(eType, spriteId)) {
    console.log("removeSprite "+eType+" id "+spriteId+" which does not exists");
    return;
  }

  removeSprite(eType, spriteId, props);
});

socket.on('powerupTaken', function (data) {
  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during powerupTaken");
    return;
  }

  //console.log("Event: powerupTaken: data: " + getJSON(data));
  
  var eType = data.entityType,
      spriteId = data.spriteId,
      powerupId = data.powerupId,
      powerupName = data.powerupName,
      powerupDuration = data.powerupDuration,
      powerupFeedbackOnTaken = data.powerupFeedbackOnTaken,
      powerupSoundOnTaken = data.powerupSoundOnTaken;
      
  if (eType == 'PLAYER' && spriteId != selfId) {
    eType = 'ACTOR';
  }
  if ( !checkGoodSprite(eType, spriteId, "powerupTaken event")) {
    return;
  }
  
  var sprite = getSprite(eType, spriteId);
  sprite.addPowerup(powerupName, powerupDuration, powerupFeedbackOnTaken, powerupSoundOnTaken);
  removeSprite('POWERUP', powerupId);
});

// sprite took damage
socket.on('spriteTookDmg', function (data) {
  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during spriteTookDmg");
    return;
  }

  // console.log("Event: spriteTookDmg: data: " + getJSON(data));

  var dmg = data.dmg,
      victimEntityType = data.victim.entityType,
      victimId = data.victim.spriteId,
      shooterEntityType = data.shooter.entityType,
      shooterId = data.shooter.spriteId;

  // getSprite will convert entity type to ACTOR when PLAYER is passed it but id != selfId
  var sprite = getSprite(victimEntityType, victimId);

  if (typeof sprite === 'undefined') {
    console.log("Error in spriteTookDmg socket event: " + victimEntityType + " " + victimId + " does not exist");
    return;
  }
  
  sprite.trigger('takeDamage', {dmg: dmg, shooterEntityType: shooterEntityType, shooterSpriteId: shooterId});
});

// sprite died
socket.on('spriteDied', function (data) {

  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during spriteDied");
    return;
  }

  var victimEntityType = data.victim.entityType,
      victimId = data.victim.spriteId;
  var killerEntityType = data.killer.entityType,
      killerId = data.killer.spriteId;
  
  // getSprite will convert entity type to ACTOR when PLAYER is passed it but id != selfId
  var sprite = getSprite(victimEntityType, victimId);
  if (!sprite) {
    console.log("Error in spriteDied socket event: " + victimEntityType + " " + victimId + " does not exist");
    return;
  }
  
  sprite.die(killerEntityType, killerId);
});

// sprite went out of bounds of the game map
socket.on('spriteOutOfBounds', function(data) {
  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during spriteDied");
    return;
  }

  var victimEntityType = data.victim.entityType,
      victimId = data.victim.spriteId;
  
  // getSprite will convert entity type to ACTOR when PLAYER is passed it but id != selfId
  var sprite = getSprite(victimEntityType, victimId);
  if (!sprite) {
    console.log("Error in spriteDied socket event: " + victimEntityType + " " + victimId + " does not exist");
    return;
  }
  
  sprite.outOfBounds();
});

// when session is disconnected
socket.on('sessionDisconnected', function (data) {

  // session disconnected does not require seesion token as it is being sent by app.js

  console.log("Session disconnected");

  _isSessionConnected = false;
  _isGameLoaded = false;
  _isJoinSent = false;
  _isEndGame = false;

  var msg;
  if(data){
    msg = data.msg;
  } 

  if(msg === undefined){
    msg = "";
  }else{
    msg = "Due to ["+msg+ "]\n";
  }

  // ask player to join a session again
  displayNotificationScreen("You are disconnected\n"+msg+"Please join another session", displayWelcomeScreen);

  // create disconnected status
  displayStatusScreeen("Disconnected");
});

// when one or more players disconnected from app.js
socket.on('playerDisconnected', function (data) {

  var sToken = data.sessionToken;
  if(!sToken || sToken != sessionToken){
    console.log("Incorrect session token expected: "+sessionToken+" received: "+sToken+" during playerDisconnected");
    return;
  }

  var sId = data.p.spriteId;
  if(!sId){
    console.log("Player disconnected without sprite id");
    return;
  }

  console.log("Player " + sId + " from session " + sessionId + " disconnected!");
  
  var player = getPlayerSprite(sId);
  var msg = "Player "+ (player ? player.p.name : sId)+" has left";
  displayInfoScreen(msg);

  // Destroy player and remove him from game state
  removePlayerSprite(sId);
});

// when app.js is disconnected
socket.on('disconnect', function () {
  console.log("App.js disconnected");

  _isSessionConnected = false;
  _isGameLoaded = false;
  _isEndGame = false;
  _isJoinSent = false;

  // ask player to refresh browser again
  displayNotificationScreen("Server cannot be reached\nPlease refresh your page after a while");

  displayStatusScreeen("Unable to connect to the server");
});