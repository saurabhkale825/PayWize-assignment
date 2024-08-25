const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files if needed

// Serve your frontend build
app.use(express.static(path.join(__dirname, 'build'))); // Adjust if your frontend is in a different directory

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('A user connected');

  // Event handling for drawing
  socket.on('draw', (data) => {
    // Broadcast drawing data to all clients
    socket.broadcast.emit('draw', data);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
