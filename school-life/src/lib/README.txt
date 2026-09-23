Optional offline copy of Three.js.

To play fully offline, download:
  https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js
and place it here as:
  school-life/src/lib/three.module.js

The boot loader in index.html tries the local copy first,
then falls back to jsDelivr / unpkg CDNs.
