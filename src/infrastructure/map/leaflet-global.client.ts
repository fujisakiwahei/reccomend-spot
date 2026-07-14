import L from "leaflet";

// leaflet.markercluster の dist は `require("leaflet")` を持たず、実行時にグローバル変数
// `L` に新規プロパティ(MarkerClusterGroupなど)を追加する作りになっている。
// `import * as L` で得られるESモジュール名前空間オブジェクトは仕様上プロパティを追加できない
// (non-extensible)ため、ここではCommonJSエクスポートの実体を指すdefault importを使い、
// 拡張可能な同一オブジェクトをwindow.Lに渡す。
// また、ESM importの評価順(依存モジュールを先に完全評価してから次のimport文へ進む)を利用し、
// この代入を必ず leaflet.markercluster の読み込みより先に完了させる。
if (typeof window !== "undefined") {
  (window as unknown as { L: typeof L }).L = L;
}

export default L;
