# Flare Garden Prototype Step1

スマートフォン横画面向けの初期プロトタイプです。

## 起動

このフォルダをローカルサーバーで配信して `index.html` を開きます。

```sh
python3 -m http.server 8091 --directory outputs/flare-garden
```

現在の確認用URL:

```text
http://127.0.0.1:8091/
```

## 操作

- 左移動: 左矢印 / A / 左ボタン
- 右移動: 右矢印 / D / 右ボタン
- 水やり: Space / 水ボタン

## 調整箇所

- ゲームバランス: `src/config.js`
- ステージ配置: `src/stage1_layout.js`
- 画像差し替え: `src/asset_manifest.js`

`asset_manifest.js` の `null` を画像パスへ変更すると、Canvas の仮描画ではなく画像を使います。

例:

```js
characters: {
  player: "./assets/images/player-bear.png",
}
```

敵はStep1では未実装ですが、将来差し替えやすいように `enemies.frog` と `enemies.bird` のキーだけ用意しています。
