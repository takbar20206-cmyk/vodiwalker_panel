All game assets are 100% procedural (generated in code at runtime):
- models/   -> built from Three.js primitives in world.js / npc.js / player.js / vehicles.js
- textures/ -> generated on <canvas> in gfx.js / world.js (grass, walls, windows, ball...)
- audio/    -> synthesized with WebAudio in audio.js (no audio files)

This keeps the project tiny (<200KB) and dependency-free.
