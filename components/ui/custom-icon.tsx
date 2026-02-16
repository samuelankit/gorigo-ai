"use client";

import { useEffect, useState, useRef, memo } from "react";

interface CustomIconProps {
  name: string;
  size?: number;
  className?: string;
  alt?: string;
}

const svgCache = new Map<string, string>();

export const CustomIcon = memo(function CustomIcon({ name, size = 24, className = "", alt }: CustomIconProps) {
  const [svgContent, setSvgContent] = useState<string | null>(() => svgCache.get(name) ?? null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (svgCache.has(name)) {
      setSvgContent(svgCache.get(name)!);
      return;
    }
    let cancelled = false;
    fetch(`/icons/${name}.svg`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const cleaned = text
          .replace(/<\?xml[^?]*\?>/g, "")
          .replace(/<!--[\s\S]*?-->/g, "");
        svgCache.set(name, cleaned);
        setSvgContent(cleaned);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [name]);

  useEffect(() => {
    if (!containerRef.current || !svgContent) return;
    const svg = containerRef.current.querySelector("svg");
    if (svg) {
      svg.setAttribute("width", String(size));
      svg.setAttribute("height", String(size));
      svg.removeAttribute("style");
      svg.removeAttribute("id");
      svg.setAttribute("aria-hidden", "true");
    }
  }, [svgContent, size]);

  if (error) {
    return (
      <span
        className={`inline-block shrink-0 rounded-sm bg-muted ${className}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={alt || name}
      />
    );
  }

  if (!svgContent) {
    return (
      <span
        className={`inline-block shrink-0 ${className}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={alt || name}
      />
    );
  }

  return (
    <span
      ref={containerRef}
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={alt || name}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
});
