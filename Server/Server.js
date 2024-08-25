const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware setup
app.use(cors()); // Allow cross-origin requests
app.use(bodyParser.json()); // Parse JSON bodies

// Serve static files for frontend (if any)
app.use(express.static(path.join(__dirname, 'public'))); // Serve public static files

// Serve your frontend build (adjust path if needed)
app.use(express.static(path.join(__dirname, 'build'))); // Serve frontend build

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('A user connected');

  // Event handling for drawing
  socket.on('draw', (data) => {
    // Broadcast drawing data to all other clients
    socket.broadcast.emit('draw', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
