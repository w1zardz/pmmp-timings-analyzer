# PMMP Timings Analyzer

**Free, mobile-friendly tool to analyze PocketMine-MP server performance.**

Detects lag sources, GC spikes, plugin bottlenecks, entity overhead, and more — things the default timings viewer misses.

## Features

- **Smart Issue Detection** — automatically finds GC freezes, slow form callbacks, heavy entities, plugin bottlenecks
- **Health Score** — 0-100 server health rating at a glance
- **World Load Distribution** — see which worlds consume the most tick time
- **Plugin Impact Ranking** — find which plugins hurt your TPS
- **Interactive Tree View** — expand/collapse/search the full timings tree
- **Mobile-First** — designed for phones and tablets, touch-optimized
- **No Server Needed** — runs entirely in your browser, no data leaves your device
- **Works with timings.pmmp.io** — paste raw text or upload `.txt` files

## Usage

1. On your PocketMine-MP server, run `/timings on`, wait a few minutes, then `/timings paste`
2. Open the timings URL, add `&raw=1` to get raw text
3. Go to **[w1zardz.github.io/pmmp-timings-analyzer](https://w1zardz.github.io/pmmp-timings-analyzer/)**
4. Paste the text and click **Analyze**

Or upload a `.txt` timings file directly.

## What It Detects

| Issue | Description |
|-------|-------------|
| GC Freezes | PHP garbage collector pauses freezing the main thread |
| Slow Form Handlers | ModalFormResponse callbacks doing heavy synchronous work |
| Heavy Entities | Custom entities consuming disproportionate tick time |
| Plugin Bottlenecks | Plugins with high total time or frequent violations |
| Chunk Loading | Excessive main-thread chunk loading |
| Network Overhead | High packet processing load |
| Slow Tasks | Scheduled tasks exceeding tick budget |

## Tech Stack

Pure HTML/CSS/JS — no dependencies, no build step, no frameworks. Loads instantly.

## Contributing

PRs welcome! The codebase is intentionally simple:
- `index.html` — semantic HTML with SEO meta tags
- `style.css` — mobile-first responsive CSS
- `app.js` — parser, analyzer, and UI in one file

## License

MIT

---

**Keywords:** PocketMine, PMMP, timings, analyzer, server performance, Minecraft Bedrock Edition, Pocket Edition, MCBE, lag, TPS, plugin bottleneck, server optimization, PMP, Bedrock server tools
