import { log } from "console";
import { Socket } from "dgram";
import express from "express";
import { createServer } from "http";
import { nanoid } from "nanoid";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

let allUsers = new Map();
let allRooms = new Map();

io.on("connection", (socket) => {

  // Initialisation code.
    console.log("User connected with id" , socket.id);

    allUsers.set(socket.id ,{
      socket:socket,
      online:true,
    })
   

    /***** Main Logic *****/

    socket.on("request_to_play" , ({playerName})=>{
      const currentUser = allUsers.get(socket.id);
      currentUser.playerName = playerName;
      let opponentPlayer;

      // Search for a player in map.
      for (let [id, user] of allUsers) {
        if (!user.playing && user !== currentUser) {
          console.log("Opponent Found", user.socket.id);
          opponentPlayer = user;
          break;
        }
      }

      if(opponentPlayer){
        let roomId = nanoid(5);

        opponentPlayer.roomId = roomId;
        currentUser.roomId = roomId;


        allRooms.set(roomId , {
          player1:currentUser,
          player2:opponentPlayer,
        })

        currentUser.playing = true;
        opponentPlayer.playing = true;

        currentUser?.socket?.emit("OpponentFound" , {
          opponentName:opponentPlayer.playerName,
          playingAs:"X",
          Xturn:true
        })

        opponentPlayer?.socket?.emit("OpponentFound" , {
          opponentName:currentUser?.playerName,
          playingAs:"O",
          Xturn:true
        })




        /***** Gameplay changes Logic *****/

        currentUser.socket.on("user_made_move_client" , (data)=>{
          console.log("Recieved data" , data);
          
          opponentPlayer.socket.emit("user_made_move_server", data);
        })

        opponentPlayer.socket.on("user_made_move_client" , (data)=>{
          console.log("Opponent send data to the Current" , data);
          
          currentUser.socket.emit("user_made_move_server", data);
        })
      }

    })



    /**** Change Game State Coming From ClientSideCode   *******/

    

    // Disconnect Code
    socket.on("disconnect" , ()=>{
      console.log("User Disconnected with id" , socket.id);
      const currentUser = allUsers.get(socket.id);
      if (currentUser.playing === true) {
        let opponentPlayer;
        for (let [roomId, room] of allRooms) {
          if (room.player1 === currentUser || room.player2 === currentUser) {
            opponentPlayer = room;
            break;
          }
        }
        if (opponentPlayer) {
          const opponentSocket = opponentPlayer.player1 === currentUser ? opponentPlayer.player2.socket : opponentPlayer.player1.socket;
          opponentSocket.emit("OpponentLeftTheGame");
          console.log("Opponent Left the game");
        }
      }
      allUsers.delete(socket.id);
      console.log("Successfully updated, Map Length: ", allUsers.size);
    })


});


httpServer.listen(5000, () => {
  
  console.log("Server is running on port 5000");
});
