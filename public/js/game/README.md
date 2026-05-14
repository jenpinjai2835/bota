# Game Client Modules

The browser game client is split by responsibility and loaded in order from `index.html`.

- `data/` contains static character and stage definitions.
- `core/` contains shared runtime state, game startup, and the frame loop.
- `ui/` contains menu, HUD, skills, scoreboard, and chat rendering.
- `network/` contains WebSocket and lobby/room flows.
- `gameplay/` contains movement, physics, combat, projectiles, and hit reactions.
- `render/` contains camera, stage rendering, character rendering, sprite sheets, and vector-part drawing.
- `input/` contains keyboard, pointer, touch, and resize listeners.

Keep load-order dependencies explicit in `index.html` unless the project moves to an ES module bundler.
