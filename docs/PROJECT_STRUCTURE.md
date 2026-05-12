# Project Structure

This project is split by responsibility so the game is easier to maintain.

## Frontend

- `index.html` - Screen markup only: menu, lobby, game canvas, HUD, chat, and scoreboard.
- `public/css/styles.css` - Visual styling for screens, panels, HUD, chat, and responsive layout.
- `public/js/game.js` - Browser game code: character data, stage data, WebSocket client, lobby UI, physics, combat, rendering, and input handling.

## Server

- `server.js` - Small entry point that creates the HTTP server, room store, and WebSocket server.
- `src/server/static-server.js` - Static file handler for `index.html` and files under `public/`.
- `src/server/rooms.js` - Room/player state helpers: creating rooms, joining/leaving, starting games, scores, and respawn points.
- `src/server/websocket.js` - Realtime message protocol for room events, player input, hits, skills, chat, and disconnects.

## Deploy Config

- `railway.json` - Railway deployment settings.
- `render.yaml` - Render deployment settings.
- `package.json` - Node scripts and dependencies.
