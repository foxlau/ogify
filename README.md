# Ogify

A Cloudflare Worker that generates Open Graph (OG) images using Service Bindings. This worker converts HTML/React elements into PNG or SVG images using [Satori](https://github.com/vercel/satori) and [Resvg-wasm](https://github.com/nicholascarroll/resvg-wasm).

## Features

- 🖼️ Generate OG images from HTML strings or React elements
- 🔗 Uses [Service Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/) for Worker-to-Worker communication
- ⚡ Zero-latency RPC calls between Workers
- 🎨 Supports PNG and SVG output formats
- 📝 Customizable fonts and emoji styles
- 🚀 Runs on Cloudflare's global edge network
- 💾 Built-in font caching via Cloudflare Cache API

## How It Works

This worker uses Cloudflare's [Service Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/) to expose RPC methods that other Workers can call directly. By extending the `WorkerEntrypoint` class, it provides:

- **Zero overhead**: No added latency between Worker calls
- **Type-safe RPC**: Direct method calls instead of HTTP requests
- **Microservice architecture**: Clean separation of concerns

## API

### `image(html: string, options: ImageResponseOptions): Promise<Response>`

Creates an image response from an HTML string.

**Parameters:**

- `html` - The HTML string to render (must use inline styles, flexbox layout)
- `options` - Image generation options:
  - `format` - Output format: `"png"` (default) or `"svg"`
  - `width` - Image width (default: 1200)
  - `height` - Image height (default: 630)
  - `fonts` - Custom fonts array
  - `emoji` - Emoji style: `"twemoji"`, `"openmoji"`, `"blobmoji"`, `"noto"`, `"fluent"`, `"fluentFlat"`
  - `debug` - Disable caching for debugging
  - `headers` - Additional response headers
  - `status` - HTTP status code
  - `statusText` - HTTP status text

**Returns:** A `Response` object containing the generated image.

## Usage

### 1. Deploy the Ogify Worker

```bash
npm run deploy
```

### 2. Configure Service Binding in Your Worker

Add a service binding to your worker's `wrangler.jsonc`:

```jsonc
{
  "services": [
    {
      "binding": "OGIFY",
      "service": "ogify"
    }
  ]
}
```

### 3. Call the Worker via RPC

```typescript
export default {
  async fetch(request, env) {
    const html = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <h1 style="color: white; font-size: 60px;">Hello World!</h1>
      </div>
    `;

    const response = await env.OGIFY.image(html, {
      width: 1200,
      height: 630,
      format: "png",
    });

    return response;
  },
};
```

## Caching Strategy

### Built-in Caching

- **Fonts**: Google Fonts CSS and font data are cached via Cloudflare Cache API (1 year TTL)
- **WASM modules**: Initialized once per Worker instance (singleton pattern)

### Recommended: Caller-side Caching

For generated images, implement caching in the **calling Worker** using Cloudflare Cache API:

```typescript
export default {
  async fetch(request, env, ctx) {
    const cache = caches.default;
    const cacheKey = new Request(request.url, { method: "GET" });

    // Check cache first
    let response = await cache.match(cacheKey);
    if (response) {
      return response;
    }

    // Generate image
    const html = `<div style="display:flex;">...</div>`;
    response = await env.OGIFY.image(html, { width: 1200, height: 630 });

    // Clone response and cache it
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  },
};
```

**Why cache at the caller?**
- The caller knows the full request context (URL, parameters)
- Custom cache keys based on business logic
- Flexible cache invalidation strategies

## Local Development

```bash
npm run dev
```

### Multi-Worker Development

When developing with Service Bindings locally, you need to run both workers:

```bash
# Terminal 1: Run the ogify worker
cd ogify && npm run dev

# Terminal 2: Run your consumer worker
cd your-worker && npm run dev
```

Or use Wrangler's multi-config mode:

```bash
wrangler dev -c wrangler.jsonc -c ../your-worker/wrangler.jsonc
```

## Project Structure

```
ogify/
├── src/
│   ├── index.ts          # Worker entrypoint with RPC methods
│   ├── og.ts             # Core image generation logic
│   ├── parseHtml.ts      # HTML to React element parser
│   ├── font.ts           # Google Fonts loader (with caching)
│   ├── emoji.ts          # Emoji asset loader
│   ├── types.ts          # TypeScript type definitions
│   └── vendors/          # WASM binaries
│       ├── resvg.wasm
│       └── yoga.wasm
├── wrangler.jsonc        # Wrangler configuration
└── package.json
```

## Dependencies

- [satori](https://github.com/vercel/satori) - Convert HTML/React to SVG
- [@resvg/resvg-wasm](https://github.com/nicholascarroll/resvg-wasm) - Convert SVG to PNG
- [yoga-wasm-web](https://github.com/nicholascarroll/yoga-wasm-web) - Flexbox layout engine
- [just-camel-case](https://github.com/angus-c/just) - CSS property conversion

## References

- [Cloudflare Service Bindings Documentation](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
- [WorkerEntrypoint Class](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/#the-workerentrypoint-class)
- [Satori Documentation](https://github.com/vercel/satori)

## Acknowledgments

This project is inspired by and built upon the work of:

- [workers-og](https://github.com/kvnang/workers-og) by Kevin Ang - The foundation for running OG image generation on Cloudflare Workers
- [@vercel/og](https://vercel.com/docs/functions/og-image-generation) - Vercel's OG image generation library and its elegant API design

Special thanks to these projects for making edge-based OG image generation possible! 🙏

## License

MIT
