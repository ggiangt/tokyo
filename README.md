# Tokyo Interactive Diorama

A small interactive web scene that presents a stylized Tokyo diorama with pan and zoom controls, clickable landmarks, draggable photo-polaroids, and ambient sakura petals.

## Features

- Full-screen artwork viewer built with `three.js`
- Mouse drag panning and scroll zoom
- Arrow key navigation for moving around the artwork
- Clickable landmarks that open themed photo polaroids
- Draggable polaroids on a free-form overlay canvas
- Subtle paper sound effect when polaroids appear
- Falling sakura petals layered over the scene

## Landmarks

The current build includes interactive photo sets for:

- Meiji Jingu
- Scramble / crossing area
- Senso-ji
- Cat billboard area

## Project Structure

- [index.html](/Users/giangtran/tokyo/index.html): main app, styles, scene setup, interactions
- [assets](/Users/giangtran/tokyo/assets): artwork and landmark photo assets

## Run Locally

Serve the folder with any static file server. One simple option:

```bash
python3 -m http.server 4173
```

Then open:

`http://localhost:4173`

## Notes

- Landmark hit areas are manually tuned against the current artwork.
- If the main artwork changes, those landmark positions may need to be updated.
- The polaroid pop sound is generated in-browser with the Web Audio API, so no audio asset file is required.
