/**
 * Ogify - OG Image Generation Worker
 *
 * A Cloudflare Worker that generates Open Graph images via Service Bindings.
 * Uses Satori to render HTML/React to SVG, then Resvg-wasm to convert to PNG.
 *
 * Usage via Service Binding:
 *   const response = await env.OGIFY.image(html, options);
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { WorkerEntrypoint } from "cloudflare:workers";
import { createImageResponse } from "./og";
import type { ImageResponseOptions } from "./types";

export default class Ogify extends WorkerEntrypoint {
	// Currently, entrypoints without a named handler are not supported
	async fetch() {
		return new Response(null, { status: 404 });
	}

	/**
	 * Generate an OG image from HTML string
	 * @param html - HTML string to render (must use inline styles, flexbox layout)
	 * @param options - Image generation options (width, height, format, fonts, emoji)
	 * @returns Response with generated image (PNG or SVG)
	 */
	async image(html: string, options: ImageResponseOptions): Promise<Response> {
		console.log("image called", html, options);
		return createImageResponse(html, options);
	}
}
