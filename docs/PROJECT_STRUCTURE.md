# Project Structure

This project is split by responsibility so the game is easier to maintain.

## Frontend

- `index.html` - Screen markup only: menu, lobby, game canvas, HUD, chat, and scoreboard.
- `public/css/styles.css` - Visual styling for screens, panels, HUD, chat, and responsive layout.
- `public/js/game.js` - Legacy note only; the browser client is now split under `public/js/game/`.
- `public/js/game/data/` - Static character and stage definitions.
- `public/js/game/core/` - Shared runtime state, asset preload, game startup, and frame loop.
- `public/js/game/ui/` - Menu, HUD, skills, scoreboard, and chat UI.
- `public/js/game/network/` - WebSocket, room list, join/create room, and lobby flows.
- `public/js/game/gameplay/` - Movement, physics, combat, hit reactions, projectiles, and effects.
- `public/js/game/render/` - Camera, world drawing, sprite sheet drawing, vector-part character rendering, and fallback renderers.
- `public/js/game/input/` - Keyboard, pointer, touch, and resize listeners.

## Server

- `server.js` - Small entry point that creates the HTTP server, room store, and WebSocket server.
- `src/server/static-server.js` - Static file handler for `index.html` and files under `public/`.
- `src/server/rooms.js` - Room/player state helpers: creating rooms, joining/leaving, starting games, scores, and respawn points.
- `src/server/websocket.js` - Realtime message protocol for room events, player input, hits, skills, chat, and disconnects.

## Deploy Config

- `railway.json` - Railway deployment settings.
- `render.yaml` - Render deployment settings.
- `package.json` - Node scripts and dependencies.
