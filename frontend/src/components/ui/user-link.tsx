"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function UserProfileLink({
  userId,
  children,
  className,
}: {
  userId?: string | null;
  children: ReactNode;
  className?: string;
}) {
  if (!userId) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link
      className={className ? `${className} hover:underline` : "hover:underline"}
      href={`/users-teams/role-profiles/${userId}`}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </Link>
  );
}
