"use client";

import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr", "blockquote", "pre", "code",
  "ul", "ol", "li", "dl", "dt", "dd",
  "a", "strong", "em", "b", "i", "u", "s", "mark", "small", "sub", "sup",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
  "img", "figure", "figcaption", "picture", "source",
  "div", "span", "section", "article", "aside", "header", "footer", "nav", "main",
  "details", "summary", "time", "abbr", "cite", "q", "dfn", "var", "samp", "kbd",
];

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "class", "id", "width", "height",
  "target", "rel", "loading", "decoding", "srcset", "sizes",
  "colspan", "rowspan", "scope", "headers",
  "datetime", "cite", "data-testid",
  "style",
];

export function SafeHTML({
  html,
  className,
  as: Tag = "div",
  "data-testid": testId,
}: {
  html: string;
  className?: string;
  as?: "div" | "article" | "section" | "span";
  "data-testid"?: string;
}) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "textarea", "select", "button"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  });

  return (
    <Tag
      className={className}
      data-testid={testId}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

const SVG_ALLOWED_TAGS = [
  "svg", "path", "circle", "rect", "line", "polyline", "polygon",
  "ellipse", "g", "defs", "use", "symbol", "clipPath", "mask",
  "linearGradient", "radialGradient", "stop", "text", "tspan",
  "title", "desc",
];

const SVG_ALLOWED_ATTR = [
  "viewBox", "xmlns", "fill", "stroke", "stroke-width", "stroke-linecap",
  "stroke-linejoin", "d", "cx", "cy", "r", "rx", "ry", "x", "y",
  "x1", "y1", "x2", "y2", "width", "height", "points",
  "transform", "opacity", "class", "id", "clip-path", "mask",
  "gradientUnits", "gradientTransform", "offset", "stop-color", "stop-opacity",
  "font-size", "font-family", "text-anchor", "dominant-baseline",
  "aria-hidden", "role", "focusable", "fill-rule", "clip-rule",
  "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit",
];

export function SafeSVG({ svg }: { svg: string }): string {
  return DOMPurify.sanitize(svg, {
    ALLOWED_TAGS: SVG_ALLOWED_TAGS,
    ALLOWED_ATTR: SVG_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_TAGS: SVG_ALLOWED_TAGS,
    ADD_ATTR: SVG_ALLOWED_ATTR,
  });
}
