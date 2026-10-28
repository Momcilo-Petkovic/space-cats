# Space Cats

A 2D pixel-art platformer: cat astronauts against alien blobs, across 3 levels.
React + Vite on the frontend, Spring Boot + MariaDB for the high-score list.

![Space Cats screenshot](docs/screenshot.png)

## Play it

### Option 1: Docker (one command, nothing else to install)

Needs [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```
docker compose up --build
```

Open http://localhost:8000. Docker starts MariaDB, the backend and the game together.
Stop with `Ctrl+C`; scores are kept between runs.

### Option 2: Run it yourself

Needs Node.js 22+, Java 21 and MariaDB.

1. **Backend** (in `backend`): set your MariaDB login and start it. The database and tables are created automatically.
   ```
   set DB_USER=root
   set DB_PASSWORD=your-password
   mvnw spring-boot:run
   ```
   Or run `GameKitApplication` from IntelliJ. Instead of environment variables you can put
   `spring.datasource.username=...` and `spring.datasource.password=...` in
   `backend/src/main/resources/application-local.properties` (ignored by git).
2. **Frontend** (in `frontend`):
   ```
   npm install
   npm run dev
   ```
   Open http://localhost:5173.

The game also runs without the backend; only the high-score list needs it.
`query-install.sql` is optional, for creating a separate database user instead of using root.

## Controls

| Key | Action |
|---|---|
| Arrow keys / A D | move |
| Space / W / Up | jump (hold for higher) |
| Shift | run |
| Enter | start / pause |
| M | mute |

## How it was made

The game was built with a local, offline AI pipeline on a laptop (RTX 4070, 8 GB):

- **Engine**: the platformer engine (physics, collisions, enemies, camera) and the AI tooling were built with Claude (Anthropic), and tested with automated play-throughs.
- **Content**: a local coding model (Qwen3-Coder 30B via Ollama + OpenCode) filled in the game's config and level layouts,
  guided by an instruction file and an automatic level checker (`npm run check`) that catches unreachable platforms,
  impossible jumps and other mistakes.
- **Sprites**: generated locally with ComfyUI using FLUX.2 [klein] 4B and a pixel-art sprite-sheet LoRA,
  then cleaned up, color-locked and sliced into animation frames by a script. A local vision model
  (Qwen3-VL 8B) checks each sheet and regenerates bad ones.

## Credits

- Sprite generation: [FLUX.2 [klein] 4B](https://huggingface.co/black-forest-labs) by Black Forest Labs,
  with the [pixel spritesheet LoRA](https://huggingface.co/svntax-dev/pixel_spritesheet_4walk_small_lora_v1) by svntax-dev.

## License

MIT, see [LICENSE](LICENSE).
