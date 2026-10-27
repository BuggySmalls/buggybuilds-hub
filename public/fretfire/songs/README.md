# Fretfire song library

Every song listed in `songs.json` shows up under "Song library" in Fretfire for everyone who opens the game.
The game finds the tempo itself and builds the chart in the browser. Same song + same difficulty always gives the same chart.

## Adding a song
1. Put the MP3 in this folder. Keep it to 128–192 kbps; files over ~10 MB load slowly on phones.
2. Add an entry to `songs.json`:

```json
{ "id": "mr-brightside", "title": "Mr. Brightside", "artist": "The Killers", "file": "mr-brightside.mp3", "start": "0:00", "length": 0 }
```

- `id`: short, lowercase, unique. High scores are saved against it, so don't change it later.
- `start`: where play begins ("m:ss"). `length`: seconds to play; `0` means to the end.
- Optional `bpm`: set it if the game picks the wrong tempo (e.g. double speed). Optional `offsetMs`: shift every note later (+) or earlier (-) if the whole chart feels off.

Anything in this folder is publicly downloadable from the site.
