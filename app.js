var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
 
app.use(express.static(__dirname + '/public'));
 
app.get('/', function(req, res){
  res.render('/index.html');
});

var players = [];

var playerCount = 0;
var id = 0;
 
io.on('connection', function (socket) {
  playerCount++;
  id++;
  players[id] = socket;
  setTimeout(function () {
    socket.emit('connected', { playerId: id });
    io.emit('count', { playerCount: playerCount });
  }, 1500);
 
  socket.on('disconnect', function (data) {
    playerCount--;
    io.emit('count', { playerCount: playerCount });
  });
  
  socket.on('insert_object', function(data) {
	for (var attrName in players) {
		if (data.playerId != attrName) {
			// Send to all players except the originator
			players[attrName].emit('insert_object', data);
		}
	}
  });
  
  console.log("Accepting connection, id " + id);
});
 
server.listen(4344);
console.log("Multiplayer app listening on port 4344");
