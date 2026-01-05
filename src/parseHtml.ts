import camelCase from "just-camel-case";
import type { SatoriElement } from "./types";

// ============================================
// Utility functions for HTML parsing
// ============================================

const sanitizeJSON = (unsanitized: string) => {
  return unsanitized
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\f/g, "\\f")
    .replace(/"/g, '\\"');
};

const getAttributes = (element: Element) => {
  let attrs = "";

  const style = element.getAttribute("style");

  if (style) {
    const cleanStyle = style.replace(/\n/g, "").replace(/\s\s+/g, " ");

    // Split by semicolon, but not semicolon inside ()
    let styleStr = cleanStyle
      .split(/;(?![^(]*\))/)
      .reduce<string>((acc, cur) => {
        // Split only the first colon
        const [k, v] = cur.split(/:(.+)/);
        if (k && v) {
          acc += `"${camelCase(k.trim())}": "${sanitizeJSON(v.trim())}",`;
        }
        return acc;
      }, "");

    if (styleStr.endsWith(",")) {
      styleStr = styleStr.slice(0, -1);
    }

    if (styleStr) {
      attrs += `"style":{${styleStr}},`;
    }
  }

  const src = element.getAttribute("src");

  if (src) {
    const width = element.getAttribute("width");
    const height = element.getAttribute("height");

    if (width && height) {
      attrs += `"src":"${sanitizeJSON(
        src
      )}", "width":"${width}", "height":"${height}",`;
    } else {
      console.warn(
        "Image missing width or height attribute as required by Satori"
      );
      attrs += `"src":"${sanitizeJSON(src)}",`;
    }
  }

  return attrs;
};

const maybeRemoveTrailingComma = (str: string) => {
  if (str.endsWith(",")) {
    return str.slice(0, -1);
  }
  return str;
};

// ============================================
// Main HTML parser
// ============================================

/**
 * Parse HTML string to Satori element
 * @param html - HTML string to parse
 * @returns Satori element or null if parsing fails
 */
export async function parseHtml(html: string): Promise<SatoriElement | null> {
  let vdomStr = ``;

  const rewriter = new HTMLRewriter()
    .on("*", {
      element(element: Element) {
        const attrs = getAttributes(element);
        vdomStr += `{"type":"${element.tagName}", "props":{${attrs}"children": [`;
        try {
          element.onEndTag(() => {
            vdomStr = maybeRemoveTrailingComma(vdomStr);
            vdomStr += `]}},`;
          });
        } catch (e) {
          vdomStr = maybeRemoveTrailingComma(vdomStr);
          vdomStr += `]}},`;
        }
      },
      text(text: Text) {
        if (text.text) {
          const sanitized = sanitizeJSON(text.text);
          if (sanitized) {
            vdomStr += `"${sanitized}",`;
          }
        }
      },
    })
    .transform(
      new Response(
        // Add a parent to ensure that we're only dealing
        // with a single root element
        `<div style="display: flex; flex-direction: column;">${html}</div>`
      )
    );

  await rewriter.text();

  vdomStr = maybeRemoveTrailingComma(vdomStr);

  try {
    return JSON.parse(vdomStr);
  } catch (e) {
    console.error(e);
    return null;
  }
}

