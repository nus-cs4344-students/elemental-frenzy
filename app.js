var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
 
app.use(express.static(__dirname + '/public'));
 
app.get('/', function(req, res){
  res.render('/index.html');
});

var sockets = [];

var playerCount = 0;
var id = 0;

// ## Helper functions
/**
 * Broadcasts to all sockets except the one with the given playerId
 */
 var broadcastToAllExcept = function(dontSendId, eventName, data) {
	 for (var attrName in sockets) {
			if (dontSendId != attrName) {
				sockets[attrName].emit(eventName, data);
			}
	 }
 }
 
io.on('connection', function (socket) {
	playerCount++;
	id++;
	sockets[id] = socket;
	setTimeout(function () {
		socket.emit('connected', { playerId: id });
		io.emit('count', { playerCount: playerCount });
	}, 1500);

	socket.on('disconnect', function (data) {
		playerCount--;
		io.emit('count', { playerCount: playerCount });
	});

	socket.on('insert_object', function(data) {
		broadcastToAllExcept(data.playerId, 'insert_object', data);
	});
	
	socket.on('update', function(data) {
		broadcastToAllExcept(data.playerId, 'updated', data);
	});
	
	socket.on('playerDied', function(data) {
		broadcastToAllExcept(data.playerId, 'playerDied', data);
	});
  
  console.log("Accepting connection, id " + id);
});
 
server.listen(4344);
console.log("Multiplayer app listening on port 4344");

