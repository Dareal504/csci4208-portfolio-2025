// webtouch-examples/whiteboard/server.js
// Example server for the WebTouch multi-user whiteboard.
//
// Responsibilities:
// - Serve the kiosk/public app (app.html).
// - Serve the controller app (controller.html).
// - Attach the WebTouch hub to Socket.IO to manage rooms and relay events.
// - Expose the installed SDK (from node_modules) so the browser can load it via Import Maps.
// - Print the local IP address to the console for easy phone testing.

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Hub AND the Dev Banner tool from the SDK
import { attachWebTouchHub, printDevBanner } from 'webtouch-sdk';

// ---------------------------------------------------------------------------
// Node ESM __dirname shim
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Express + HTTP + Socket.IO setup
// ---------------------------------------------------------------------------

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow connections from any IP (needed for phones on Wi-Fi)
    methods: ['GET', 'POST'],
  },
});

// Attach the WebTouch hub to Socket.IO.
// This manages rooms, app/controller registration, and event relay.
attachWebTouchHub(io, {
  debug: true, // Enable logs for development
});

// ---------------------------------------------------------------------------
// Static assets and routes
// ---------------------------------------------------------------------------

// 1. Serve the App files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// 2. Serve node_modules so the browser can load webtouch-sdk/client.js
//    The HTML import map will point to /node_modules/webtouch-sdk/client.js
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Route: Kiosk / Public App (The Whiteboard)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Route: Controller App (The Phone Interface)
app.get('/controller', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'controller.html'));
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = 3000;

// Listen on '0.0.0.0' so the server is accessible on your local Wi-Fi network.
httpServer.listen(PORT, '0.0.0.0', () => {
  // Prints the "Magic URL" (IP Address) to the console so you don't use localhost
  printDevBanner(PORT);
});
