import Link from "next/link";
import { cn } from "@/lib/utils";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      className={cn("brand-logo__mark", className)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      width={40}
      height={40}
    >
      <defs>
        <clipPath id="brand-compass-clip">
          <circle cx="32" cy="32" r="25" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="25" fill="#1c1e22" />
      <g
        clipPath="url(#brand-compass-clip)"
        stroke="#8aa4c2"
        strokeWidth="1.6"
        opacity=".42"
      >
        <path d="M8 23h48M8 41h48M23 8v48M41 8v48" />
      </g>
      <circle cx="32" cy="32" r="25" fill="none" stroke="#8aa4c2" strokeWidth="4.5" />
      <path d="M47 17 36.2 36.2 17 47 27.8 27.8Z" fill="#d8443d" />
      <path d="M47 17 27.8 27.8 17 47 36.2 36.2Z" fill="#ff5e56" />
      <circle cx="32" cy="32" r="3.6" fill="#131417" stroke="#8aa4c2" strokeWidth="1.6" />
    </svg>
  );
}

export function BrandLogo({
  href = "/app/forecast",
  className,
  asLink = true,
}: {
  href?: string;
  className?: string;
  asLink?: boolean;
}) {
  const inner = (
    <>
      <LogoMark />
      <span className="brand-logo__wordmark display">
        Race Goal <span>Forecaster</span>
      </span>
    </>
  );

  if (!asLink) {
    return <div className={cn("brand-logo", className)}>{inner}</div>;
  }

  return (
    <Link href={href} className={cn("brand-logo", className)}>
      {inner}
    </Link>
  );
}
