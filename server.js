var express = require("express");
var app = express();
var http = require("http").Server(app);
var fs = require("fs");
var bodyParser = require("body-parser");
var multer = require("multer");
var port = 8081;

//set folder public conent images, css, js
app.use(express.static("public"));

//Set UI for server
app.get("/index.html", function(req, res) {
  res.sendFile(__dirname + "/" + "index.html");
});

var server = app.listen(port, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log("Server Listening at : http://%s:%s", host, port);
});

//create socket io
const io = require("socket.io")(server);

//storage client's current id
var current_id = "";
var history_connected = [];
var the_first_time = true;
var number_in_room = 0;
var client_dup = "";
var default_room = "living_room";
var duplication_c = false;
var id_duplication = "";
var can_create_single = true;
var can_create_double = true;
var can_create_tripple = true;
var client_in_room = {
  admin: {
    id: "",
    socket: ""
  },
  second: {
    id: "",
    socket: ""
  },
  third: {
    id: "",
    socket: ""
  }
};
var admin_id = "",
  admin_socket = "";
var second_id = "",
  second_socket = "";
var third_id = "",
  third_socket = "";
var max_client = 0;
var current_client = 0;
var admin_reconnect = false;
var rest_client = 0;
var exist_room = false;
//Client connection
io.on("connection", client => {
  console.log("Client connected");
  //receive Client's Session ID
  client.on("ClientSendSessionId", data => {
    console.log("Received Client's Id: " + data);

    current_id = data;
    //when client connect to server
    // server auto make client join room with id
    for (var i = 0; i < history_connected.length; i++) {
      if (history_connected[i] == current_id) {
        duplication_c = true;
        id_duplication = history_connected[i];
        console.log("For true");
      } else {
        duplication_c = false;
        console.log("For False: " + duplication_c);
      }
    }
    console.log("Data history " + history_connected);
    console.log("For done - Next Step");
    if (duplication_c) {
      console.log("check duplication true");
      client.emit("client_reconnected", {
        need_receive: id_duplication
      });
    } else {
      console.log("check duplication false");
      history_connected.push(current_id);
    }

    console.log("Listening event create new room");
  });
  client.on("create", data => {
    console.log(
      "Received request create new room from client\nData: " +
        JSON.stringify(data)
    );

    if (!exist_room) {
      console.log("No room exist");
      default_room = data.mode;
      exist_room = true;
    } else {
      console.log("Exist room , move client join room " + default_room);
    }
    switch (default_room) {
      case "single": {
        console.log("client join to single room");
        if (can_create_single) {
          console.log(
            "Client can join room single " + JSON.stringify(client_in_room)
          );
          // default_room = data.mode;
          // client.join(default_room)
          console.log("Data id: %s", data.id);

          client_in_room.admin.id = data.id;
          client_in_room.admin.socket = client.id;

          console.log(
            "SINGLE: After assign admin id " + JSON.stringify(client_in_room)
          );

          can_create_single = false;
          can_create_double = false;
          can_create_tripple = false;
          io.emit("ready", {
            mode: data.mode,
            admin_id: client_in_room.admin.id,
            second_id: client_in_room.second.id,
            third_id: client_in_room.third.id
          });
          exist_room = true;
          console.log("push client in room");
          // client_in_room.push(data.id);
          console.log("Client can ready game");
          console.log("Handle end game");
        } else {
          console.log("Client can not join room single full");
          --current_client;
          client.emit("full", {
            mode: data.mode,
            admin_id: client_in_room.admin.id,
            second_id: client_in_room.second.id,
            third_id: client_in_room.third.id
          });
        }
        break;
      }
      case "double": {
        console.log(
          "client join to double room \n Current client: " + current_client
        );
        max_client = 2;
        if (can_create_double) {
          console.log("Client can join room double");
          if (current_client <= 0) {
            //check client of room
            ++current_client;
            rest_client = max_client - current_client;
            console.log("Assign admin id: " + data.id);
            admin_id = data.id;
            admin_socket = client.id;

            console.log("Current Data: " + JSON.stringify(client_in_room));

            client_in_room.admin.id = data.id;
            client_in_room.admin.socket = client.id;

            exist_room = true;
            can_create_single = false;
            can_create_double = true;
            can_create_tripple = false;
          } else if (current_client > 0) {
            console.log("Room exist admin");
            ++current_client;
            console.log("Current client in server: " + current_client);
            if (current_client < max_client) {
              rest_client = max_client - current_client;
              console.log("Wait to full client");
              io.emit("wait", {
                mode: data.mode,
                rest_client: rest_client,
                admin_id: client_in_room.admin.id
              });
            } else if (current_client == max_client) {
              console.log("Ready to start client");
              second_id = data.id;
              second_socket = client.id;

              client_in_room.second.id = data.id;
              client_in_room.second.socket = client.id;
              io.emit("ready", {
                mode: data.mode,
                admin_id: client_in_room.admin.id,
                second_id: client_in_room.second.id
              });
              can_create_double = false;
            } else if (current_client > max_client) {
              console.log("Client can not join room double full");
              // --current_client;
              client.emit("full", {
                mode: data.mode,
                admin_id: client_in_room.admin.id,
                second_id: client_in_room.second.id
              });
            } else {
              console.log("Else of check client single ");
            }
          } else {
          }
          client.emit("wait", {
            mode: data.mode,
            rest_client: rest_client,
            admin_id: client_in_room.admin.id,
            second_id: client_in_room.second.id
          });
          console.log(
            "Send admin wait to server\nMode: %s\nRest Client: %s\nAdmin id: %s",
            data.mode,
            rest_client,
            admin_id
          );
        } else {
          console.log("Client can not join room double full");
          // --current_client;
          client.emit("full", {
            mode: data.mode,
            admin_id: data.id
          });
        }
        break;
      }

      case "tripple": {
        console.log(
          "client join to tripple room \n Current client: " + current_client
        );
        max_client = 3;
        if (can_create_tripple) {
          console.log("Client can join room tripple");
          if (current_client <= 0) {
            //check client of room
            ++current_client;
            rest_client = max_client - current_client;
            console.log("Assign admin id: " + data.id);
            admin_id = data.id;
            if (client_in_room.admin.id == "") {
              client_in_room.admin.id = data.id;
              client_in_room.admin.socket = client.id;
            } else {
            }
            exist_room = true;
            can_create_single = false;
            can_create_double = false;
            can_create_tripple = true;
          } else if (current_client > 0) {
            console.log("Room exist admin");
            ++current_client;
            console.log("Current client in server: " + current_client);
            if (current_client < max_client) {
              var rest_client = max_client - current_client;
              console.log("Wait to full client");
              second_id = data.id;
              client_in_room.second.id = data.id;
              client_in_room.second.socket = client.id;
              io.emit("wait", {
                mode: data.mode,
                rest_client: rest_client,
                admin_id: client_in_room.admin.id,
                second_id: client_in_room.second.id,
                third_id: client_in_room.third.id
              });
              console.log(
                "Send wait to server\nMode: %s\nRest Client: %s\nAdmin id: %s",
                data.mode,
                rest_client,
                admin_id
              );
            } else if (current_client == max_client) {
              console.log("TRIPPLE MODE: Ready to start client");
              third_id = data.id;
              client_in_room.third.id = data.id;
              client_in_room.third.socket = client.id;
              io.emit("ready", {
                mode: data.mode,
                admin_id: client_in_room.admin.id,
                second_id: client_in_room.second.id,
                third_id: client_in_room.third.id
              });
              can_create_tripple = false;
              console.log(
                "Admin: %s\nSecond: %s\nThird: %s",
                admin_id,
                second_id,
                third_id
              );
            } else if (current_client > max_client) {
              console.log("Client can not join room tripple full");
              // --current_client;
              client.emit("full", {
                mode: data.mode,
                admin_id: data.id
              });
            } else {
              console.log("Else of check client single ");
            }
          } else {
          }
          client.emit("wait", {
            mode: data.mode,
            rest_client: rest_client,
            admin_id: admin_id
          });
          console.log(
            "Send admin wait to server\nMode: %s\nRest Client: %s\nAdmin id: %s",
            data.mode,
            rest_client,
            admin_id
          );
        } else {
          console.log("Client can not join room tripple full");
          // --current_client;
          client.emit("full", {
            mode: data.mode,
            admin_id: data.id
          });
        }
        break;
      }
    }
  });
  client.on("played", data => {
    io.emit("playing", {
      mode: data.mode,
      admin_id: data.admin_id,
      second_id: second_id,
      third_id: third_id
    });
    //Set time to server handle end game

    setTimeout(() => {
      io.emit("finishgame", {
        admin_id: admin_id
      });

      //reset all values
      default_room = "";
      can_create_single = true;
      can_create_double = true;
      can_create_tripple = true;
      admin_id = "";
      second_id = "";
      third_id = "";
      client_in_room = {
        admin: {
          id: "",
          socket: ""
        },
        second: {
          id: "",
          socket: ""
        },
        third: {
          id: "",
          socket: ""
        }
      };
      current_client = 0;
      max_client = 0;
      rest_client = 0;
      exist_room = false;
    }, 10000);
  });

  var ado = true,
    sdo = true,
    rdo = true;
  client.on("itisme", data => {
    console.log("client Ask who is");

    //Check user online
    if (data == admin_id) {
      console.log("Admin is online");
      second_id = "";
      io.emit("wait", {
        mode: default_room,
        rest_client: rest_client,
        admin_id: admin_id,
        second_id: second_id
      });
    } else if (data == second_id) {
      console.log("Second is online");
      admin_id = second_id;
      second_id = "";
      io.emit("wait", {
        mode: default_room,
        rest_client: rest_client,
        admin_id: client_in_room.admin.id,
        second_id: client_in_room.second.id,
        third_id: client_in_room.third.id
      });
    } else {
      console.log("Handle else of 3 client in room " + data);
      console.log("+++ADMIN: %s\n", admin_id);
      console.log("+++SECOND: %s\n", second_id);
      console.log("+++THIRD: %s\n", third_id);
    }
  });

  client.on("disconnect", () => {
    console.log("Client disconnect: " + client.id);
    var client_disconnected = current_id;
    // check client with admin id

    switch (default_room) {
      case "": {
        console.log("client stay in living room");
        break;
      }
      case "single": {
        console.log("Client stay in single room");
        // Wait client in time , if client not back , remove room
        console.log(
          "Array curren in single disconnect:\n" +
            JSON.stringify(client_in_room)
        );
        if (client.id == client_in_room.admin.socket) {
          default_room = "";
          can_create_single = true;
          can_create_double = true;
          can_create_tripple = true;
          admin_id = "";
          second_id = "";
          third_id = "";

          client_in_room.admin.id = "";
          client_in_room.admin.socket = "";

          current_client = 0;
          max_client = 0;
          rest_client = 0;
          exist_room = false;
          console.log("SINGLE: admin disconnected");
        } else {
          console.log("SINGLE: Don't care");
        }

        break;
      }
      case "double": {
        console.log("Client stay in double room ");
        // Check client is admin
        //if clients in room = 1 that client is admin, handle same single mode

        switch (current_client) {
          case 1: {
            console.log("Client disconnect in double have 1 client");

            if (client.id == client_in_room.admin.socket) {
              default_room = "";
              can_create_single = true;
              can_create_double = true;
              can_create_tripple = true;
              admin_id = "";
              second_id = "";
              third_id = "";

              client_in_room.admin.id = "";
              client_in_room.admin.socket = "";

              current_client = 0;
              max_client = 0;
              rest_client = 0;
              exist_room = false;
              console.log("DOUBLE 1: admin disconnected");
            } else {
              console.log("DOUBLE 1: Don't care");
              //Handle somethign
            }
            break;
          }
          case 2: {
            console.log("Client disconnect in double have 2 client: ");
            //down current client
            //In this time, state of room is full or ready, change to wait
            if (client.id == client_in_room.admin.socket) {
              console.log("DOUBLE 2:Admin Disconnected");
              console.log("DOUBLE DATA: " + JSON.stringify(client_in_room));
              can_create_double = true;

              client_in_room.admin.id = client_in_room.second.id;
              client_in_room.admin.socket = client_in_room.second.socket;

              client_in_room.second.id = "";
              client_in_room.second.socket = "";
              --current_client;

              console.log(
                "DOUBLE 2: array afer reassign: %s\nDOUBLE 2: client: %s",
                JSON.stringify(client_in_room),
                current_client
              );
              io.emit("wait", {
                mode: default_room,
                rest_client: 1,
                admin_id: client_in_room.admin.id
              });
              console.log("Send event full to client form DOULE2");
            } else if (client.id == client_in_room.second.socket) {
              console.log("DOUBLE 2:Second Disconnected");
              client_in_room.second.id = "";
              client_in_room.second.socket = "";
              --current_client;

              can_create_double = true;

              io.emit("wait", {
                mode: default_room,
                rest_client: 1,
                admin_id: client_in_room.admin.id
              });
            } else {
              console.log("DOUBLE 2: Don't care");
            }

            console.log("Was send request who is");

            break;
          }
        }

        break;
      }

      case "tripple": {
        // --current_client
        console.log("Client stay in tripple room " + current_client);
        // Check client is admin
        //if clients in room = 1 that client is admin, handle same single mode

        switch (current_client) {
          case 1: {
            console.log("Client disconnect in tripple have 1 client");
            if (client.id == client_in_room.admin.socket) {
              default_room = "";
              can_create_single = true;
              can_create_double = true;
              can_create_tripple = true;
              admin_id = "";
              second_id = "";
              third_id = "";

              client_in_room.admin.id = "";
              client_in_room.admin.socket = "";

              current_client = 0;
              max_client = 0;
              rest_client = 0;
              exist_room = false;
              console.log("TRIPPLE 1: admin disconnected");
            } else {
              console.log("TRIPPLE 1: Don't care");
            }
            break;
          }
          case 2: {
            console.log("Client disconnect in tripple have 2 client");
            if (client.id == client_in_room.admin.socket) {
              console.log("TRIPPLE 2:Admin Disconnected");
              console.log("TRIPPLE DATA: " + JSON.stringify(client_in_room));
              can_create_double = true;

              client_in_room.admin.id = client_in_room.second.id;
              client_in_room.admin.socket = client_in_room.second.socket;

              client_in_room.second.id = "";
              client_in_room.second.socket = "";

              client_in_room.third.id = "";
              client_in_room.third.socket = "";
              --current_client;

              console.log(
                "TRIPPLE 2: array afer reassign: %s\nDOUBLE 2: client: %s",
                JSON.stringify(client_in_room),
                current_client
              );
              io.emit("wait", {
                mode: default_room,
                rest_client: 1,
                admin_id: client_in_room.admin.id
              });
              console.log("Send event full to client form DOULE2");
            } else if (client.id == client_in_room.second.socket) {
              console.log("TRIPPLE 2:Second Disconnected");
              client_in_room.second.id = "";
              client_in_room.second.socket = "";
              --current_client;

              can_create_double = true;

              io.emit("wait", {
                mode: default_room,
                rest_client: 1,
                admin_id: client_in_room.admin.id
              });
            } else {
              console.log("TRIPPLE 2: Don't care");
            }
            break;
          }
          case 3: {
            console.log(
              "Client disconnect in tripple have 3 client " + current_client
            );
            if (client.id == client_in_room.admin.socket) {
              console.log("TRIPPLE 3:Admin Disconnected");
              console.log("TRIPPLE DATA: " + JSON.stringify(client_in_room));
              can_create_tripple = true;
              client_in_room.admin.id = "";
              client_in_room.admin.socket = "";
              client_in_room.admin.id = client_in_room.second.id;
              client_in_room.admin.socket = client_in_room.second.socket;

              client_in_room.second.id = client_in_room.third.id;
              client_in_room.second.socket = client_in_room.third.socket;

              client_in_room.third.id = "";
              client_in_room.third.socket = "";
              --current_client;
              rest_client = max_client - current_client;
              console.log(
                "TRIPPLE 3: array afer reassign: %s\nDOUBLE 3: client: %s",
                JSON.stringify(client_in_room),
                current_client
              );
              io.emit("wait", {
                mode: default_room,
                rest_client: rest_client,
                admin_id: client_in_room.admin.id,
                second_id: client_in_room.second.id,
                third_id: client_in_room.third.id
              });
              console.log("Send event full to client from TRIPPLE 3");
            } else if (client.id == client_in_room.second.socket) {
              console.log("TRIPPLE 3:Second Disconnected");
              client_in_room.second.id = client_in_room.third.id;
              client_in_room.second.socket = client_in_room.third.socket;

              client_in_room.third.id = "";
              client_in_room.third.socket = "";
              --current_client;
              rest_client = max_client - current_client;
              can_create_tripple = true;

              io.emit("wait", {
                mode: default_room,
                rest_client: rest_client,
                admin_id: client_in_room.admin.id,
                second_id: client_in_room.second.id,
                third_id: client_in_room.third.id
              });
            } else if (client.id == client_in_room.third.socket) {
              console.log("TRIPPLE 3:Third Disconnected");
              client_in_room.third.id = "";
              client_in_room.third.socket = "";
              --current_client;

              can_create_tripple = true;

              io.emit("wait", {
                mode: default_room,
                rest_client: 2,
                admin_id: client_in_room.admin.id
              });
            } else {
              console.log("TRIPPLE 3: Don't care");
            }

            break;
          }
        }
      }
    }
  });
});
