var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
 
app.use(express.static(__dirname + '/public'));
 
app.get('/', function(req, res){
  res.render('/index.html');
});

var SESSION_MAX_COUNT = 5;

var sessionIdToSocketMap = {};
var socketIdToSessionIdMap = {};

var playerIdToSocketMap = {};
var socketIdToPlayerIdMap = {};

var playerIdToSessionIdMap = {};
var sessionIdToPlayerIdMap = {};

var sessions = {}; // indexed by session id

var playerId = 0;
var sessionId = 0;

// Artificial delay
var delay_s2p = 200;    // delay in ms
var delay_p2s = 200;    //
var delayVar_s2p = 0.2; // delay variance, in the range [0, 1] (percentage)
var delayVar_p2s = 0.2; //

// ## Helper functions
var getSocketOfPlayerId = function(playerId) {
  return playerIdToSocketMap[playerId];
};

var getPlayerIdOfSocketId = function(socketconnid) {
  return socketIdToPlayerIdMap[socketconnid];
};

var getSocketOfSessionId = function(sessionId) {
  return sessionIdToSocketMap[sessionId];
};

var getSessionIdOfSocketId = function(socketconnid) {
  return socketIdToSessionIdMap[socketconnid];
};

var getSessionIdOfPlayerId = function(playerId) {
  return playerIdToSessionIdMap[playerId];
};

var getPlayerIdsOfSessionId = function(sessionId) {
  return sessionIdToPlayerIdMap[sessionId];
};

/**
 * Finds the size of an object
 */
var sizeOfObject = function(obj) {
  var size = 0;
  for (var key in obj) {
    size++;
  }
  return size;
}
 
 /**
  * Finds the first session that does not have max players and returns its index.
  * If all ongoing sessions are full or there are no ongoing sessions, returns -1.
  */
var findAvailableSession = function() {
  for(var i in sessions){
    if (sessions[i] && sessions[i].playerCount < sessions[i].playerMaxCount) {
      return i;
    }
  }
  return -1;
};

var updatePlayerSession = function(sessionId, session){
  // get previous player list map by sessionId
  var pList = getPlayerIdsOfSessionId(sessionId);

  for(var p in pList){    
    delete playerIdToSessionIdMap[playerId];
  }
  
  // get current player list in updated session
  var cpList = session.players;
  for(var p in cpList){    
    playerIdToSessionIdMap[p] = sessionId;
  }
  sessions[sessionId] = session;

  // create new session
  if(!sessionIdToPlayerIdMap[sessionId]){
    sessionIdToPlayerIdMap[sessionId] = {};
  }
  sessionIdToPlayerIdMap[sessionId] = cpList;
};

var addPlayerSocket = function(socket, playerId){
  playerIdToSocketMap[playerId] = socket;
  socketIdToPlayerIdMap[socket.conn.id] = playerId;
};

var addSessionSocket = function(socket, sessionId){
  sessionIdToSocketMap[sessionId] = socket;
  socketIdToSessionIdMap[socket.conn.id] = sessionId;
};

var removeSessionFromPlayer = function(sessionId){
  // take note of the order of deletion
  removePlayersFromSession(sessionId);
  delete sessionIdToPlayerIdMap[sessionId];
};

var removeSessionFromSocket = function(sessionId){
  // take note of the order of deletion
  var s = getSocketOfSessionId(sessionId);
  delete sessionIdToSocketMap[sessionId];
  delete socketIdToSessionIdMap[s.conn.id];
}

var removeSession = function(sessionId){
  setTimeout(function() {
    removeSessionFromPlayer(sessionId);
    removeSessionFromSocket(sessionId);
    delete sessions[sessionId];
  }, delay_s2p * 5);
};

var removePlayersFromSession = function(sessionId){
  var pList = getPlayerIdsOfSessionId(sessionId);
  for(var p in pList){
    removePlayerFromSession(p);
  }
};

// remove player from session map
var removePlayerFromSession = function(playerId){
  // take note of the order of deletion
  var sId = getSessionIdOfPlayerId(playerId);
  var pList = getPlayerIdsOfSessionId(sId);

  !sId || delete playerIdToSessionIdMap[playerId];
  !sId || !pList || delete pList[playerId];
};

// remove player from socket map
var removePlayerFromSocket = function(playerId){
  // take note of the order of deletion
  var s = getSocketOfPlayerId(playerId);
  
  delete playerIdToSocketMap[playerId];
  delete socketIdToPlayerIdMap[s.conn.id];
};

// remove player from socket and session map
var removePlayer = function(playerId){
  setTimeout(function() {
    removePlayerFromSocket(playerId);
    removePlayerFromSession(playerId);
  }, delay_p2s * 5);
};

var getJSON = function(obj){
  return JSON.stringify(obj, null, 4);
};

/**
 * Sends to the player socket
 */
var sendToPlayer = function(playerId, eventName, eventData) {
  if (!getSocketOfPlayerId(playerId)) {
    console.log("Player " + playerId + " has not yet connected...");
    return false;
  }
  
  // console.log("Sending "+getJSON(eventData)+" of event[ "+eventName+" ] to player " + playerId);
  var artificialDelayVariance = (delay_s2p * (delayVar_s2p * Math.random()));
  artificialDelayVariance = (Math.random() < 0.5 ? -artificialDelayVariance : artificialDelayVariance);
  var artificialS2pDelay = delay_s2p + artificialDelayVariance;
  setTimeout(function() {
    if (getSocketOfPlayerId(playerId)) {
      getSocketOfPlayerId(playerId).emit(eventName, eventData);
    }
  }, artificialS2pDelay);
  return true;
};

var sendToPlayers = function(players, eventName, eventData) {
  for(var p in players){
    sendToPlayer(p, eventName, eventData);
  }
};

var getAllPlayers = function(){
  var pList = {};
  for(var p in playerIdToSocketMap){
    pList[p] = playerId[p];
  }

  return pList;
}

/**
  * Broadcasts to all sockets in the given session
  */
var broadcastFromSession = function(sessionId, eventName, eventData) {
  console.log("Broadcast from session "+sessionId+" with event[ "+eventName+"]");
  var pList = getPlayerIdsOfSessionId(sessionId);
  for(var p in pList){
    sendToPlayer(p, eventName, eventData);
  }
};


/**
 * Sends to the session socket (session-cum-client)
 */
var sendToSession = function(sessionId, eventName, eventData) {
  if (!getSocketOfSessionId(sessionId)) {
    console.log("Error in sendToSession(): Session " + sessionId + " has not yet connected... so event [ " + eventName + " ] cannot be sent");
    return false;
  }
  
  // console.log("Sending "+getJSON(eventData)+" of event["+eventName+"] to session " + sessionId);
  var artificialDelayVariance = (delay_p2s * (delayVar_p2s * Math.random()));
  artificialDelayVariance = (Math.random() < 0.5 ? -artificialDelayVariance : artificialDelayVariance);
  var artificialP2sDelay = delay_p2s + artificialDelayVariance;
  setTimeout(function() {
    if (getSocketOfSessionId(sessionId)) {
      getSocketOfSessionId(sessionId).emit(eventName, eventData);
    }
  }, artificialP2sDelay);
  return true;
};


io.on('connection', function (socket) {
  console.log(socket.handshake.headers.referer);
  
  var isClient = socket.handshake.headers.referer.indexOf('index.html') != -1;
  var isSession = socket.handshake.headers.referer.indexOf('session.html') != -1;;

  var sessionSize = sizeOfObject(sessions);
  if(isSession && sessionSize >= SESSION_MAX_COUNT){

    console.log("There is/are already " + sessionSize + " sessions(s) running");
    return;

  } else if(isClient && (!sessions || sessionSize <= 0)){

    // no session avaiable but player can wait for new session
    console.log("There is no session running");

  }
  
  if(isClient && !getPlayerIdOfSocketId(socket.conn.id)) {
    playerId++;
    console.log("Player "+playerId+" has connected");

    // Store the socket of each player
    addPlayerSocket(socket, playerId);

    var newPlayerData = {spriteId: getPlayerIdOfSocketId(socket.conn.id), sessions: sessions};
    setTimeout(function () {
      sendToPlayer(getPlayerIdOfSocketId(socket.conn.id), 'connected', newPlayerData);
    }, 500);

  }else if(isSession && !getSessionIdOfSocketId(socket.conn.id)){
    sessionId++;
    console.log("Session "+sessionId+" has connected");

    // Store the socket of each session
    addSessionSocket(socket, sessionId);

    setTimeout(function () {
      sendToSession(getSessionIdOfSocketId(socket.conn.id), 'connected', {sessionId: getSessionIdOfSocketId(socket.conn.id)});
    }, 500);    
  } else{

    console.log("Neither Client nor Session request or incorrect socket mapping");
    return;

  }

  socket.on('disconnect', function (data) {
    var sId = getSessionIdOfSocketId(socket.conn.id);
    var pId = getPlayerIdOfSocketId(socket.conn.id);

    if(sId && !pId) {
      console.log("Session " +  sId + " disconnected!");

      // inform all players that the session is disconnected
      var pList = getPlayerIdsOfSessionId(sId);
      
      for(var p in pList){
        sendToPlayer(p, 'sessionDisconnected');
      }

      removeSession(sId);

      sendToPlayers(getAllPlayers(), 'updateSessions', {sessions: sessions});

    }else if(!sId && pId){
      console.log("Player " + pId + " disconnected!");

      var pSessionId = getSessionIdOfPlayerId(pId);
      // inform respective session about the player disconnection
      !pSessionId || sendToSession(pSessionId, 'playerDisconnected', {spriteId: pId});

      removePlayer(pId);

    }else if(sId && pId){
      console.log("Conflicted socket disconnected");
    } else{
      console.log("Unknown socket disconnected");
    }
  });

  // receive player's packet
  socket.on('player', function(data){
    switch(data.eventName){
      case 'join':{
        // var sId = findAvailableSession();

        // if(sId != -1){
        //   sendToSession(sId, 'join', data.eventData);
        //   console.log("Found session "+sId+" for player "+ data.eventData.spriteId);
        // }else{
        //   // bounce back join operation failed to the player
        //   sendToPlayer(getPlayerIdOfSocketId(socket.conn.id), 'joinFailed', {sessionId: sId});
        //   console.log("Failed to find a session for player "+ data.eventData.spriteId);
        // }
        // break;
      }
      default:{
        sendToSession(data.eventData.sessionId, data.eventName, data.eventData);
        break;
      }
    }    
  });

  // receive session's packet
  socket.on('session', function(data){
    // console.log("session event: "+data.eventName);

    var sId = getSessionIdOfSocketId(socket.conn.id);

    switch (data.eventName){
      case 'updateSession':{
        // update for the session
        if(sId){
          updatePlayerSession(sId,  data.eventData);
          sendToPlayers(getAllPlayers(), 'updateSessions', {sessions: sessions});
          console.log("Update session : " + getJSON(data.eventData));
        }else{
          console.log("Failed to update session");
        }
        break;
      }
      case 'removeSprite': //console.log("REMOVESPRITE: " + getJSON(data));
      case 'joinSuccessful':
      case 'joinFailed':
      case 'synchronizeClocks':
      
      case 'addSprite':
      case 'updateSprite':
      

      case 'updateEnemy':
      
      case 'spriteTookDmg':
      case 'spriteDied':
      case 'gameStateChanged':{
        sendToPlayers(data.eventData.players, data.eventName, data.eventData);
        // console.log("Sending to multiple players from session "+sId+" -> "+getJSON(data));
        break;
      }
      default:{
        console.log("Unknown session event [" + data.eventName +"]");
        break;
      }
    }
  });
});
 
server.listen(4344);
console.log("Multiplayer app listening on port 4344");