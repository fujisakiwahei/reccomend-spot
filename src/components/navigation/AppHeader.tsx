"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Map, MoreHorizontal } from "lucide-react";
import { useRef } from "react";
import { useWanderState } from "@/providers/WanderStateProvider";
import { ConfirmationDialog } from "./ConfirmationDialog";

export function AppHeader() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const { isHydrated, isPersistent, resetHistory, clearFavorites } = useWanderState();

  function closeMenu() {
    menuRef.current?.removeAttribute("open");
  }

  return (
    <header className="app-header">
      <Link className="brand" href="/" aria-label="WanderMatch Discoverへ">
        <span className="brand__mark" aria-hidden="true">
          W
        </span>
        <span className="brand__name">WanderMatch</span>
      </Link>

      <nav className="desktop-navigation" aria-label="メイン">
        <Link
          className="desktop-navigation__link"
          data-active={pathname === "/"}
          href="/"
        >
          <Compass aria-hidden="true" size={20} strokeWidth={2.5} />
          Discover
        </Link>
        <Link
          className="desktop-navigation__link"
          data-active={pathname === "/map"}
          href="/map"
        >
          <Map aria-hidden="true" size={20} strokeWidth={2.5} />
          Map
        </Link>
      </nav>

      <div className="header-actions">
        {isHydrated && !isPersistent ? (
          <span className="storage-badge">このタブ内のみ保存</span>
        ) : null}
        <details ref={menuRef} className="app-menu">
          <summary aria-label="設定メニューを開く">
            <MoreHorizontal aria-hidden="true" size={24} strokeWidth={2.5} />
          </summary>
          <div className="app-menu__panel">
            <p className="app-menu__title">端末内データ</p>
            <ConfirmationDialog
              dialogId="reset-history-dialog"
              triggerLabel="閲覧履歴をリセット"
              title="閲覧履歴をリセットしますか？"
              description="お気に入りは残したまま、観光地の表示順を新しく作り直します。"
              confirmLabel="リセットする"
              onOpen={closeMenu}
              onConfirm={resetHistory}
            />
            <ConfirmationDialog
              dialogId="clear-favorites-dialog"
              triggerLabel="お気に入りをすべて削除"
              title="お気に入りをすべて削除しますか？"
              description="保存した観光地をすべてお気に入りから外します。この操作は取り消せません。"
              confirmLabel="すべて削除"
              tone="danger"
              onOpen={closeMenu}
              onConfirm={clearFavorites}
            />
          </div>
        </details>
      </div>
    </header>
  );
}
