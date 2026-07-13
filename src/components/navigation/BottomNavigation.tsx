"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Map } from "lucide-react";

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="bottom-navigation" aria-label="メイン">
      <Link data-active={pathname === "/"} href="/">
        <Compass aria-hidden="true" size={24} strokeWidth={2.6} />
        <span>Discover</span>
      </Link>
      <Link data-active={pathname === "/map"} href="/map">
        <Map aria-hidden="true" size={24} strokeWidth={2.6} />
        <span>Map</span>
      </Link>
    </nav>
  );
}
