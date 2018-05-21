var express = require('express');

var app = express();
var http = require('http');
var serv = http.Server(app);

var port = process.env.PORT || 3000;
serv.listen(port);
console.log("Server started, listening on the port: "+port+" ...");

app.use('/',express.static('client'));

var io = require("socket.io")(serv,{});

//constructor for room entity to grup grups of players
var Room = function(){
  var self = {
    id:Math.random(),
    maxPlayer: 2,
    currentlyPlayers: 0,
    socketlist:{},
    players:{},
    spectatorsId:{},
    initPack: {},
    removePack:{}
  }
  //call this function for room object to add new player to room group
  self.addPlayer = function(socket){
    self.currentlyPlayers +=1;
    self.socketlist[socket.id] = socket;
    var player = self.createPlayer(socket);
    self.players[socket.id] = player;
    self.initPack[self.id] = Room.initPack(self.id);


//when player close window so, disconnect  , player that joined to specific room will disconnect
    socket.on("disconnect",function(){

      if(self.players[socket.id]!==undefined){
        self.removePlayer(self.id,socket.id);
      }
      if(self.spectatorsId[self.id]!==undefined){
        delete self.spectatorsId[socket.id];
      }

      delete self.socketlist[socket.id];
      self.currentlyPlayers -=1;
      console.log(Room.list);
    });
  }


  //add spectator socket to room
  self.addSpectator = function(){
    self.socketlist[socket.id] = self.socket;
    self.spectatorsId[socket.id] = self.socket.id;
  }
  //function to call Player constructor
  self.createPlayer = function(socket){
   return Player.onConnection(socket);
  }

//remove Player from players array room
  self.removePlayer =function(roomid,playerid){
    self.removePack[self.id] = Room.removePack(self.id,playerid);
    delete self.players[playerid];
  }

  return self;
}
Room.list = {};

//call this function to create new room entity
Room.createRoom = function(){
var self = Room();
Room.list[self.id]=self;
return self;
}

//call this function to search for rooms, return array , with all rooms.
Room.lookUpForRooms = function(){
  var rooms = [];
for(var i in Room.list){
  var room = Room.list[i];
  rooms.push(room);
}
return rooms;
}
Room.destroyRoom = function(id){
  delete Room.list[id];
}
Room.update = function(){
var pack = [];
for(var i in Room.list){
  var room = Room.list[i];
  for(var i in room.players){
    room.players[i].update();
  }
  if(room.currentlyPlayers == 0){
    Room.destroyRoom(room.id);
  }
  pack.push({
    roomid: room.id,
    players: room.players
  });
}
return pack;
}

Room.initPack = function(room_id){
  var pack = [];

  var room = Room.list[room_id];
    pack.push({
      players: room.players,

    });

  return pack;
}
Room.removePack = function(room_id,player_id){
  var pack = [];

  var room = Room.list[room_id];
    pack.push({
      players: room.players[player_id],

    });

  return pack;

}
Room.witchRoomIsPlayer = function(socketId){
  //check witch room is players
  var room_id = "";
  for(var i in Room.list){
    var room = Room.list[i];
    for(var i in room.socketlist)
    {
      var socket_room = room.socketlist[i].id;
      if(socket_room == socketId){
        room_id = room.id;
      }
    }
  }
  return room_id;
}



var Entity = function(param){
var self = {
x: 250,
y:250,
spdX:0,
spdY:0,
};
if(param !== undefined){
  if(param.map !== undefined)
    self.map = param.map;
  if(param.id !== undefined)
    self.id = param.id;
}

self.update = function(){
  self.updatePosition();
}
self.updatePosition = function(){
  self.x += self.spdX;
  self.y += self.spdY;
}

self.getDistanceBeetwenPoint = function(point){
  return Math.sqrt((Math.pow((point.x-self.x),2))+(Math.pow((point.y-self.y),2)));
}

return self;
}

var Player = function(socket){
var self = Entity(socket.id);
self.id = socket.id;
self.pressingRight = false;
self.pressingLeft = false;
self.pressingUp = false;
self.pressingDown = false;
self.maxSpd = 10;

var super_update = self.update;
self.update = function(){

  if(self.pressingRight)
    self.spdX = self.maxSpd;
  else if(self.pressingLeft)
    self.spdX = -self.maxSpd;
    else
    self.spdX = 0;

    if(self.pressingUp)
      self.spdY = -self.maxSpd;
    else if(self.pressingDown)
      self.spdY = self.maxSpd;
    else
      self.spdY = 0;

      if(self.x<=0)
        self.x=0;
      if(self.x>=500)
        self.x=500;
      if(self.y<=0)
        self.y = 0;
      if(self.y>=500)
        self.y = 500;
  super_update();
}


return self;
}
Player.onConnection = function(socket){
  var player = Player(socket);

  socket.on('keyPress',function(data){
    if(data.inputId === 'right'){
      player.pressingRight = data.state;
    }
    if(data.inputId === 'left'){
      player.pressingLeft = data.state;
    }
    if(data.inputId === 'down'){
      player.pressingDown = data.state;
    }
    if(data.inputId === 'up'){
      player.pressingUp = data.state;
    }

  });

return player;
}
Player.onDisconnect = function(socket){

}
Player.update = function(){
  var pack = [];
  for(var i in Player.list){
    var player = Player.list[i];
    player.update();
    pack.push({
      id:player.id,
      x: player.x,
      y: player.y
    });

  }
return pack;
}

var SOCKET_LIST = [];

io.sockets.on("connection",function(socket){

var connected = false;
SOCKET_LIST[socket.id] = socket;
console.log("new socket connected, socket id= "+socket.id);

socket.on('findNewRoom', function(data){
  var rooms = Room.lookUpForRooms();

  if(rooms.length>0){
    var connected = false;
    for(var i in Room.list)
    {
      var current_room = Room.list[i];
      if(current_room.maxPlayer>current_room.currentlyPlayers){
        current_room.addPlayer(socket);
        socket.emit('joinRoomSuccess',{state:true});
        connected = true;
        if(connected == true)
          break;
      }

    }
    if(connected==false){
      var room = Room.createRoom();
      room.addPlayer(socket);
      socket.emit('joinRoomSuccess',{state:true});
    }
  }
  else{
    var room = Room.createRoom();
    room.addPlayer(socket);
    socket.emit('joinRoomSuccess',{state:true});
  }
console.log(Room.list);
});

socket.on("leftRoom", function(data){
  console.log(data);
  var player_socket = data;
var room_id = Room.witchRoomIsPlayer(player_socket);
    if(Room.list[room_id].players[player_socket.id]!==undefined){
      Room.list[room_id].removePlayer(Room.list[room_id].id,player_socket.id);
    }
    if(Room.list[room_id].spectatorsId[Room.list[room_id].id]!==undefined){
      delete Room.list[room_id].spectatorsId[player_socket.id];
    }

    delete Room.list[room_id].socketlist[player_socket.id];
    Room.list[room_id].currentlyPlayers -=1;
    socket.emit('leftSuccess',{state:true});
    console.log(Room.list);

});


});

setInterval(function(){
//var pack = Player.update();
//Player.update();
var pack = Room.update();


//console.log(Room.list);

  for(var i in SOCKET_LIST){
    var socket = SOCKET_LIST[i];
    var room_id = Room.witchRoomIsPlayer(socket.id);

      if(Room.list[room_id] !== undefined){
    //  socket.emit("initPack", Room.list[room_id].initPack);
      socket.emit("initPack",Room.list[room_id].initPack);
      for(var i=0;i<pack.length;i++){
        //console.log(pack[i]);
        if(pack[i].roomid==room_id){
          socket.emit("updatePack",pack[i]);
          socket.emit("selfId",socket.id);
        }
      }
      socket.emit("removePack",Room.list[room_id].removePack);
      //console.log(Room.list[room_id].removePack);
    }
  }
  for(var i in Room.list){
    Room.list[i].initPack = {};
    Room.list[i].removePack = {};
  }

},1000/40);
