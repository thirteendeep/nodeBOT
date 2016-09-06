var http = require("http");
var os = require("os");
var path = require("path");

var five = require("johnny-five");
var Tessel = require("tessel-io");
var board = new five.Board({
    io: new Tessel()
});

var Express = require("express");
var SocketIO = require("socket.io");

var application = new Express();
var server = new http.Server(application);
var io = new SocketIO(server);

application.use(Express.static(path.join(__dirname, "/app")));

board.on("ready", () => {

    //var motor1 = new five.Motor([ "a5", "a4", "a3" ]);
    //var motor2 = new five.Motor([ "b5", "b4", "b3" ]);

    var led = new five.Led.RGB({
        pins: {
            red: "a5",
            green: "a6",
            blue: "b5",
        }
    });

    var index = 0;
    var rainbow = ["white", "black", "red", "orange", "yellow", "green", "blue", "indigo", "violet"];

    board.loop(1000, () => {
        led.color(rainbow[index]);
        index = index + 1;
        if (index === rainbow.length) {
            index = 0;
        }
    });

    var clients = new Set();
    var monitor = new five.Multi({
        controller: "BME280",
        elevation: 2,
    });
    var updated = Date.now() - 5000;
    var data = {};

    monitor.on("change", () => {
        var now = Date.now();
        if (now - updated >= 5000) {
            updated = now;

            data = {
                thermometer: monitor.thermometer.celsius,
                barometer: monitor.barometer.pressure,
                hygrometer: monitor.hygrometer.relativeHumidity,
                altimeter: monitor.altimeter.meters,
            };

            clients.forEach(recipient => {
                recipient.emit("report", {
                    thermometer: monitor.thermometer.celsius,
                    barometer: monitor.barometer.pressure,
                    hygrometer: monitor.hygrometer.relativeHumidity,
                    altimeter: monitor.altimeter.meters,
                });
            });
        }
    });

    io.on("connection", socket => {
        // Allow up to 5 monitor sockets to
        // connect to this enviro-monitor server
        if (clients.size < 5) {
            clients.add(socket);
            // When the socket disconnects, remove
            // it from the recipient set.
            socket.on("disconnect", () => clients.delete(socket));
        }

        socket.on('ledColor', function(color){
            led.on();
            led.color(color);
            io.emit('code', "LED color: " +  color);
        });

        socket.on('code', function(codeId){
            switch(codeId) {
                case 'get-status':
                io.emit('code', "Temperature: " + data.thermometer.toFixed(1) + "°C");
                io.emit('code', "Humidity: " + data.hygrometer.toFixed(2) + "%");
                // motor1.forward(255);
                //
                // setTimeout(function() {
                //     motor1.stop();
                //     motor2.forward(255);
                //
                //     setTimeout(function() {
                //         motor2.stop();
                //     }, 2000);
                // }, 2000);
                break;

                case 'ledColor':
                led.color(codeId);
                io.emit('code', "close application");
                process.exit(1);

                break;
                default:
                io.emit('code', 'Unknow code: ' +  codeId);
            }
        });

    });



    var port = 3000;
    server.listen(port, () => {
        console.log(`http://${os.networkInterfaces().wlan0[0].address}:${port}`);
    });

    process.on("SIGINT", () => {
        server.close();
    });
});



//
//
// var Tessel = require("tessel-io");
// var five = require("johnny-five");
// var board = new five.Board({
//   io: new Tessel()
// });
//
// board.on("ready", () => {
//   var monitor = new five.Multi({
//     controller: "BME280"
//   });
//
//   var temp = 0;
//   var humidity = 0;
//
//   monitor.on("change", function() {
//       var monitorTemp = parseFloat(this.thermometer.celsius.toFixed(1));
//       var monitorHumidity = parseInt(this.hygrometer.relativeHumidity);
//       var timestamp = Date.now();
//
//       if (temp != monitorTemp) {
//           console.log("[" + timestamp + "]", "Temperature      : ", monitorTemp + "°C");
//           temp = monitorTemp;
//       }
//
//       if (humidity != monitorHumidity) {
//           console.log("[" + timestamp + "]", "Humidity         : ", monitorHumidity + "%");
//           humidity = monitorHumidity;
//       }
//   });
// });
