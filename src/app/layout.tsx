import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Bricolage_Grotesque, Noto_Sans_JP } from "next/font/google";
import { AppHeader } from "@/components/navigation/AppHeader";
import { getSpotIds } from "@/domain/spots/repository";
import { WanderStateProvider } from "@/providers/WanderStateProvider";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
});

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: {
    default: "WanderMatch | 世界の観光地と偶然出会う",
    template: "%s | WanderMatch",
  },
  description: "世界の観光地をカードで眺め、お気に入りを地図に保存できる個人向けWebアプリです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const spotIds = getSpotIds();

  return (
    <html
      lang="ja"
      className={`${bricolageGrotesque.variable} ${notoSansJp.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <a className="skip-link" href="#main-content">
          メインコンテンツへ移動
        </a>
        <WanderStateProvider spotIds={spotIds}>
          <div className="app-shell">
            <AppHeader />
            <main id="main-content" className="app-main" tabIndex={-1}>
              <ViewTransition update="page-fade">{children}</ViewTransition>
            </main>
          </div>
        </WanderStateProvider>
      </body>
    </html>
  );
}
