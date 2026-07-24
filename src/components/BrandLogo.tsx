import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
      <Image
        src="/logo-mark.png"
        alt=""
        width={40}
        height={41}
        className="brand-logo__mark"
        priority
      />
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
