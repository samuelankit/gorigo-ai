import Image from "next/image";

interface CustomIconProps {
  name: string;
  size?: number;
  className?: string;
  alt?: string;
}

export function CustomIcon({ name, size = 24, className = "", alt }: CustomIconProps) {
  return (
    <img
      src={`/icons/${name}.svg`}
      width={size}
      height={size}
      alt={alt || name}
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
