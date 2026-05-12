const http = require('http');

const { createStaticHandler } = require('./src/server/static-server');
const { RoomStore } = require('./src/server/rooms');
const { setupWebSocket } = require('./src/server/websocket');

const PORT = process.env.PORT || 3000;

const server = http.createServer(createStaticHandler(__dirname));
const rooms = new RoomStore();

setupWebSocket(server, rooms);

server.listen(PORT, () => {
  console.log(`BRAWL OF THE ANCIENTS server running on port ${PORT}`);
});
