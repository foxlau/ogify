import { initWasm, Resvg } from "@resvg/resvg-wasm";
import satori, { init } from "satori/wasm";
import initYoga from "yoga-wasm-web";
import { loadDynamicAsset } from "./emoji";
import { loadGoogleFont } from "./font";
import { parseHtml } from "./parseHtml";
import type { ImageResponseOptions, OgProps, SatoriElement } from "./types";

// @ts-expect-error
import resvgWasm from "./vendors/resvg.wasm";
// @ts-expect-error
import yogaWasm from "./vendors/yoga.wasm";

// Singleton promises to ensure WASM modules are initialized only once
let resvgInitPromise: Promise<void> | null = null;
let yogaInitPromise: Promise<void> | null = null;

const initResvgWasm = () => {
	if (!resvgInitPromise) {
		resvgInitPromise = initWasm(resvgWasm as WebAssembly.Module);
	}
	return resvgInitPromise;
};

const initYogaWasm = () => {
	if (!yogaInitPromise) {
		yogaInitPromise = (async () => {
			const yoga = await initYoga(yogaWasm);
			init(yoga);
		})();
	}
	return yogaInitPromise;
};

export const og = async ({ element, options }: OgProps) => {
	// 1. Init WASMs
	await Promise.allSettled([initResvgWasm(), initYogaWasm()]);

	// 2. Get React Element
	const reactElement =
		typeof element === "string" ? await parseHtml(element) : element;

	// 3. Convert React Element to SVG with Satori
	const width = options.width;
	const height = options.height;

	let widthHeight:
		| { width: number; height: number }
		| { width: number }
		| { height: number } = {
		width: 1200,
		height: 630,
	};

	if (width && height) {
		widthHeight = { width, height };
	} else if (width) {
		widthHeight = { width };
	} else if (height) {
		widthHeight = { height };
	}

	const svg = await satori(reactElement, {
		...widthHeight,
		fonts: options?.fonts?.length
			? options.fonts
			: [
					{
						name: "Bitter",
						data: await loadGoogleFont({ family: "Bitter", weight: 600 }),
						weight: 500,
						style: "normal",
					},
				],
		loadAdditionalAsset: options.emoji
			? loadDynamicAsset({
					emoji: options.emoji,
				})
			: undefined,
	});

	const format = options?.format || "png";

	if (format === "svg") {
		return svg;
	}

	// 4. Convert the SVG into a PNG
	const resvg = new Resvg(svg, {
		fitTo:
			"width" in widthHeight
				? {
						mode: "width" as const,
						value: widthHeight.width,
					}
				: {
						mode: "height" as const,
						value: widthHeight.height,
					},
	});

	const pngData = resvg.render();
	const pngBuffer = pngData.asPng();

	return pngBuffer;
};

/**
 * Creates an image response from a React element or HTML string.
 */
export async function createImageResponse(
	element: string | SatoriElement,
	options: ImageResponseOptions,
): Promise<Response> {
	const cacheControl = options.debug
		? "no-cache, no-store"
		: "public, immutable, no-transform, max-age=31536000";

	if (options.format === "svg") {
		const svg = await og({ element, options });
		return new Response(svg as string, {
			headers: {
				"Content-Type": "image/svg+xml",
				"Cache-Control": cacheControl,
				...options.headers,
			},
			status: options.status || 200,
			statusText: options.statusText,
		});
	}

	const buffer = (await og({ element, options })) as Uint8Array;
	return new Response(buffer.buffer as ArrayBuffer, {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": cacheControl,
			...options.headers,
		},
		status: options.status || 200,
		statusText: options.statusText,
	});
}

