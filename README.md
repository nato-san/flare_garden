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

## スマートフォン実機で確認

スマートフォンとこのMacを同じWi-Fiにつなぎ、スマートフォンのブラウザで以下を開きます。

```text
http://192.168.11.50:8091/
```

`127.0.0.1` はスマートフォン自身を指すため、実機確認では使えません。
MacのWi-Fiが変わると `192.168.11.50` の部分も変わることがあります。

ブラウザのタブバーやアドレスバーで画面が狭い場合は、ホーム画面に追加してから起動します。

iPhone Safari:

1. 共有ボタンを押す
2. 「ホーム画面に追加」を選ぶ
3. ホーム画面の `Flare Garden` アイコンから開く
4. スマートフォンを横向きにする

Android Chrome:

1. 右上メニューを開く
2. 「ホーム画面に追加」または「アプリをインストール」を選ぶ
3. ホーム画面の `Flare Garden` アイコンから開く
4. スマートフォンを横向きにする

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
