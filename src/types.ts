import type { ImageResponse } from "@vercel/og";
import type satori from "satori/wasm";

type VercelImageResponseOptions = NonNullable<
	ConstructorParameters<typeof ImageResponse>[1]
>;

/**
 * Extract ReactNode type from satori's function signature to avoid installing React
 */
export type SatoriElement = Parameters<typeof satori>[0];

/**
 * Supported emoji styles for rendering
 */
export type EmojiType =
	| "twemoji"
	| "openmoji"
	| "blobmoji"
	| "noto"
	| "fluent"
	| "fluentFlat";

export type ImageResponseOptions = Omit<
	VercelImageResponseOptions,
	"width" | "height"
> & {
	/**
	 * The format of the image.
	 * @default "png"
	 */
	format?: "svg" | "png" | undefined;
	/**
	 * The width of the image. If neither width nor height is provided, the default is 1200.
	 */
	width?: number;
	/**
	 * The height of the image. If neither width nor height is provided, the default is 630.
	 */
	height?: number;
};

export interface OgProps {
	/**
	 * The React element or HTML string to render into an image.
	 * @example
	 * ```tsx
	 * <div
	 *  style={{
	 *    display: 'flex',
	 *  }}
	 * >
	 *  <h1>Hello World</h1>
	 * </div>
	 * ```
	 * @example
	 * ```html
	 * <div style="display:flex;"><h1>Hello World</h1></div>
	 * ```
	 */
	element: string | SatoriElement;
	/**
	 * The options for the image response.
	 */
	options: ImageResponseOptions;
}

