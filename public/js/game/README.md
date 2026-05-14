# Game Client Modules

The browser game client is split by responsibility and loaded in order from `index.html`.

- `data/` contains static character and stage definitions.
- `data/character-systems.js` contains archetype identity, base stat profiles, match item definitions, and team definitions.
- `core/` contains shared runtime state, stat/progression helpers, game startup, and the frame loop.
- `ui/` contains menu, HUD, skills, scoreboard, and chat rendering.
- `network/` contains WebSocket and lobby/room flows.
- `gameplay/` contains movement, physics, combat, projectiles, hit reactions, and in-match items.
- `render/` contains camera, stage rendering, character rendering, sprite sheets, and vector-part drawing.
- `input/` contains keyboard, pointer, touch, and resize listeners.

Keep load-order dependencies explicit in `index.html` unless the project moves to an ES module bundler.
