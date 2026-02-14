import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="max-w-6xl mx-auto px-6 pt-4 pb-0"
      data-testid="nav-breadcrumbs"
    >
      <ol className="flex items-center flex-wrap gap-1 text-sm text-muted-foreground">
        <li className="flex items-center gap-1">
          <Link
            href="/"
            className="hover:text-foreground transition-colors flex items-center gap-1"
            data-testid="breadcrumb-home"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
            {item.href && i < items.length - 1 ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
                data-testid={`breadcrumb-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="text-foreground font-medium"
                aria-current="page"
                data-testid={`breadcrumb-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
