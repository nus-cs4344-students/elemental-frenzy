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

var totalPlayerCount = 0;
var playerId = 0;
var sessionId = 0;

// ## Helper functions
var getSocketOfPlayerId = function(playerId) {
  return playerIdToSocketMap[playerId];
}
var getPlayerIdOfSocketId = function(socketconnid) {
  return socketIdToPlayerIdMap[socketconnid];
}
var getSocketOfSessionId = function(sessionId) {
  return sessionIdToSocketMap[sessionId];
}
var getSessionIdOfSocketId = function(socketconnid) {
  return socketIdToSessionIdMap[socketconnid];
}
var getSessionIdOfPlayerId = function(playerId) {
  return playerIdToSessionIdMap[playerId];
}
var getPlayerIdsOfSessionId = function(sessionId) {
  return sessionIdToPlayerIdMap[sessionId];
}
/**
 * Sends to the player socket
 */
var sendToPlayer = function(playerId, eventName, eventData) {
  if (!getSocketOfPlayerId(playerId)) {
    console.log("Player " + playerId + " has not yet connected...");
    return false;
  }
  
  console.log("Sending "+getJSON(eventData)+" of event[ "+eventName+" ] to player " + playerId);
  getSocketOfPlayerId(playerId).emit(eventName, eventData);
  return true;
};
/**
 * Sends to the session socket (session-cum-client)
 */
var sendToSession = function(sessionId, eventName, eventData) {
  if (!getSocketOfSessionId(sessionId)) {
    console.log("Session " + sessionId + " has not yet connected...");
    return false;
  }
  
  console.log("Sending "+getJSON(eventData)+" of event["+eventName+"] to session " + sessionId);
  getSocketOfSessionId(sessionId).emit(eventName, eventData);
  return true;
};


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
}

var addPlayerSession = function(sessionId, playerId){
  if(!sessionIdToPlayerIdMap[sessionId]){
    sessionIdToPlayerIdMap[sessionId] = {};
  }

  sessionIdToPlayerIdMap[sessionId][playerId] = playerId;
  playerIdToSessionIdMap[playerId] = sessionId;
}

var addPlayerSocket = function(socket, playerId){
  playerIdToSocketMap[playerId] = socket;
  socketIdToPlayerIdMap[socket.conn.id] = playerId;
}

var addSessionSocket = function(socket, sessionId){
  sessionIdToSocketMap[sessionId] = socket;
  socketIdToSessionIdMap[socket.conn.id] = sessionId;
}

var removeSession = function(sessionId){
  removePlayersFromSession(sessionId);

  // take note of the order of deletion
  var s = getSocketOfSessionId(sessionId);
  delete sessionIdToSocketMap[sessionId];
  delete sessionIdToPlayerIdMap[sessionId];
  delete socketIdToSessionIdMap[s.conn.id];
}

var removePlayersFromSession = function(sessionId){
  var pList = getPlayerIdsOfSessionId(sessionId);
  for(var p in pList){
    removePlayer(pList[p]);
  }
}

// remove player from socket and session map
var removePlayer = function(playerId){
  // take note of the order of deletion
  var s = getSocketOfPlayerId(playerId);
  var sId = getSessionIdOfPlayerId(playerId);
  var pList = getPlayerIdsOfSessionId(sId);
  
  delete playerIdToSocketMap[playerId];
  delete socketIdToPlayerIdMap[s.conn.id];

  !sId || delete playerIdToSessionIdMap[playerId];
  !sId || delete pList[playerId];
}

var getJSON = function(obj){
  return JSON.stringify(obj, null, 4);
}
 
io.on('connection', function (socket) {
  console.log(socket.handshake.headers.referer);
  
  var isClient = socket.handshake.headers.referer.indexOf('index.html') != -1;
  var isSession = socket.handshake.headers.referer.indexOf('session.html') != -1;;

  if(isSession && sessions.length >= SESSION_MAX_COUNT){

    console.log("There is/are already " + sessions.length + " sessions(s) running");
    return;

  } else if(isClient && (!sessions || sessions.length <= 0)){

    console.log("There is no session running");
    return;

  }
  
  if(isClient && !getPlayerIdOfSocketId(socket.conn.id)) {
    totalPlayerCount++;
    playerId++;

    // Store the socket of each player
    addPlayerSocket(socket, playerId);

    setTimeout(function () {
      sendToPlayer(getPlayerIdOfSocketId(socket.conn.id), 'connected', {id: getPlayerIdOfSocketId(socket.conn.id)});
    }, 500);

  }else if(isSession && !getSessionIdOfSocketId(socket.conn.id)){
    sessionId++;

    // Store the socket of each session
    addSessionSocket(socket, sessionId);

    setTimeout(function () {
      sendToSession(getSessionIdOfSocketId(socket.conn.id), 'connected', {id: getSessionIdOfSocketId(socket.conn.id)});
    }, 500);    
  } else{

    console.log("Neither Client nor Session request");
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

    }else if(!sId && pId){
      console.log("Player " + pId + " disconnected!");

      var pSessionId = getSessionIdOfPlayerId(pId);
      // inform respective session about the player disconnection
      !pSessionId || sendToSession(pSessionId, 'playerDisconnected', {playerId: pId});

      totalPlayerCount--;
      removePlayer(pId);
    }else{
      console.log("Unknown/Conflicted socket disconnected")
    }
  });

  // receive player's packet
  socket.on('player', function(data){
    switch(data.eventName){
      case 'join':{
        var sId = findAvailableSession();

        if(sId != -1){
          sendToSession(sId, 'join', data.eventData);
          console.log("Found session "+sId+" for player "+ data.eventData.playerId);
        }else{
          // bounce back join operation failed to the player
          sendToPlayer(getPlayerIdOfSocketId(socket.conn.id), 'joinFailed', data.eventData);
          console.log("Failed to find a session for player "+ data.eventData.playerId);
        }
        break;
      }
      default:{
        sendToSession(data.sessionId, data.eventName, data.eventData);
        break;
      }
    }    
  });

  // receive session's packet
  socket.on('session', function(data){
    console.log("session event: "+data.eventName);
    switch (data.eventName){
      case 'joinFailed':{
        sendToPlayer(data.eventData.playerId, 'joinFailed');
        break;
      }
      case 'updateSession':{
        // update for the session
        var sId = getSessionIdOfSocketId(socket.conn.id);
        if(sId){
          sessions[sId] = data.eventData;

          // update player id to session id map
          var pList = data.eventData.playerIds;
          for(var p in pList){
            if(pList){
              addPlayerSession(sId, pList[p]);
            }
          }
          console.log("Update session : " + getJSON(data.eventData));
        }else{
          console.log("Failed to update session");
        }
        break;
      }
      case 'updatePlayer':{
        // update for the players
        break;
      }
      default:{
        console.log("Unknown session event " + data.eventName);
        break;
      }
    }
  });
});
 
server.listen(4344);
console.log("Multiplayer app listening on port 4344");