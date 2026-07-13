import Link from "next/link";

export default function NotFound() {
  return (
    <div className="not-found-page">
      <section className="not-found-card">
        <p className="eyebrow">404 · LOST, BUT CURIOUS</p>
        <h1>その観光地は見つかりませんでした。</h1>
        <p>URLが変わったか、まだWanderMatchへ登録されていない場所です。</p>
        <Link className="button button--primary" href="/">
          Discoverへ戻る
        </Link>
      </section>
    </div>
  );
}
