window.onload = function() {
  var socket = io();

  socket.on("report", function (data) {
      console.log(data);
  });
};
