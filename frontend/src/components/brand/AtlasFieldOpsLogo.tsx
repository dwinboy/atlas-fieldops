import Image from "next/image";

import { cn } from "@/lib/utils";

export function AtlasFieldOpsLogo({
  alt = "Atlas FieldOps",
  className,
  size = 40,
}: {
  alt?: string;
  className?: string;
  size?: number;
}) {
  return (
    <Image
      alt={alt}
      className={cn("shrink-0 object-contain", className)}
      height={size}
      priority={size >= 40}
      src="/brand/atlas-fieldops-logo.png"
      width={size}
    />
  );
}
