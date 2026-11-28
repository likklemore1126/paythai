# Thai Pocket Cards — プロジェクト引き継ぎ (for Claude Code)

## 概要
- アプリ名: Thai Pocket Cards（タイ語学習PWA）
- 開発者(TAKA): 非技術者。REIWA SOBA（バンコクのそば店）経営者。Claudeが実装全般を担当。
- リポジトリ: `likklemore1126/paythai`
- 公開URL: https://poca.takatobi.jp/app.html
- 現バージョン: `2026-11-28a`（`APP_VERSION` / `SW_VERSION`、YYYY-MM-DDa形式で必ず一致させる）

## ファイル構成
- `app.html` — アプリ本体。単語・会話・文法データもすべてJS配列としてこの中に埋め込み（約780KB超の単一ファイル）
- `sw.js` — Service Worker（オフラインキャッシュ）
- `manifest.json` — PWAマニフェスト（アイコンファイル名は固定、差し替えのみで運用）
- `icon-192.png` / `icon-512.png` / `icon-192-maskable.png` / `icon-512-maskable.png` — アプリアイコン（ポケットから顔を出すゾウのマスコット、生成り色 #FBF7EF 背景 + 紺色 #17242A シルエット）

## データ構造（app.html内）
- `DATA` — 単語データ。`noun` / `verb` / `adj` / `adv` / `classifier` / `question` / `greeting` に分かれる。各要素は `{id, th, ro, jp, level}`
- `FIXED_EX` — 単語ごとの固定例文（`{th, ro, jp}`）。ここが無い単語は自動生成テンプレートにフォールバックする
- `JP_READINGS` — かな検索用の読み仮名インデックス
- `CONV` — 会話フレーズ配列。`{id, scene, th, ro, jp, level}`。`th`/`ro`には`{PT}`/`{PR}`（男性ครับ/女性ค่ะの可変部分）を使う
- `CONV_BREAKDOWN` — 会話フレーズの単語ごとの解説（タップで開く「単語解説」に対応）
- `GRAM` — 文法データ。`{id, cat, title, explain, ex_th, ex_ro, ex_jp, pattern}`
- `SCENES` — 会話シーンタブの並び順（現在: `ALL, 日常会話, レストラン, 観光, ホテル, 交通, 緊急`）

## 読み(ローマ字)の表記ルール（2026-11-18〜、TAKAの教本と同じ方式）
- 母音: ʉ(ウに近い)・ə・ɛ・ɔ・a i u e o。長母音は2つ重ねる（aa, ʉʉ, əə…）。二重母音は ia / ʉa / ua
- 子音: จ=c、有気音 kh/th/ph/ch、ง=ŋ（語頭も語末も）。**ɯ・ɤ・ng・j は使わない**
- 語末の半母音は y / w（ไป=pay、ข้าว=khâaw、อร่อย=arɔ̀y）
- 声調記号 à á â ǎ（平声は記号なし）。語中の弱い短い「a」の音節は記号を付けない（sawàt dii、krapǎw）
- ครับ=khráp / ค่ะ=khâ（`PT`）。数字は `NUMS`（nʉ̀ŋ, sɔ̌ɔŋ, rɔ́ɔy…）
- 表示フォント: 発音記号と声調の印(ɔ ɛ ə ʉ ŋ + 結合文字)は自前の小さなフォント `poca-ipa-400/500.woff2`（Noto Sans Monoから抜き出し）で表示する。Google Fontsは文字を分割配信するので、ɔ と声調の印が別ファイルになり、iPhoneで ɔ̌ などだけ別フォントになっていたため（2026-11-18）。CSSの読み用フォント指定は `'PocaIPA','IBM Plex Mono','Noto Sans Mono',monospace`
- 音声: iPhoneの標準のタイ語の声(Kanya)は เจ็ด(7) を「ジェッ」と詰まって読むので、`speak()` の中の `ttsFix()` で読み上げにだけ「เจ้ด」を渡す。「7」単独のときは `ttsPitch()` で声の高さを0.7に下げる（Appleの標準の声のときだけ。2026-11-20 実機で聞き比べて決定）。7の部分だけ録音を差し込む方法・数字を全部録音してつなぐ方法も試したが、つなぎ目の間や長さが数字ごとにそろわず不採用（2026-11-20）。今の直し方で確定
- 検索は `_roLoose()` で ʉ→u・ŋ→ng・長音・語末y/w を吸収するので、普通の英字入力（mai, khao, mue）でも当たる
- 新しく読みを書くときもこのルールで書く。会話の `CONV` と `CONV_BREAKDOWN` は読みの文字列を完全一致させる（行そろえ `convChunks` が一致を前提にしている。現在35文は語順の違い等で一致しておらず、行そろえ無しで表示）

## ⚠️ 重要な罠：ID番号の非連続性
`adv`（副詞）は `d001〜d074` の後に `d137〜d161` という飛び番号が存在する（`adj`にも同様の `a137〜a172` 番の重複範囲がある）。**新規追加時は必ず既存の最大IDを実際にスキャンして確認すること**。末尾の要素だけを見て「次はこの番号」と決め打ちすると、既存の別の単語とID重複を起こす（過去に実際に発生済み）。

```js
// 安全な次ID確認の例
const nums = DATA.adv.map(x=>parseInt(x.id.slice(1))).filter(n=>!isNaN(n));
console.log(Math.max(...nums), [...new Set(nums)].sort((a,b)=>a-b));
```

## 作業フロー・必須ルール
1. 単語・会話文を追加/編集したら、**必ず以下をチェックしてから納品**（TAKAは逐一チェックしない前提）:
   - ① 訳語がタイ語の意味を正確に反映しているか
   - ② 例文の日本語訳が訳語（または同義語）を実際に使っているか（ズレていないか）
   - ③ 時刻・日付・専門ジャンル等で汎用テンプレートに頼らず意味の通る例文になっているか
   - ④ 似た意味の単語の重複がないか（th値の完全一致チェック）
   - ⑤ タイ文字とローマ字の併記漏れがないか
   - ⑥ 既存単語を優先して例文を組み立てているか（grep確認）
2. 編集後は必ず `node --check` でJS構文検証（`<script>`〜`</script>`の中身を抜き出してチェックする。app.htmlは複数の`<script>`タグがあるので、最初の大きいブロックの範囲に注意）
3. `APP_VERSION`と`SW_VERSION`を必ず同じ値に更新（YYYY-MM-DDa形式、同日複数回はa,b,c…と増やす）
4. 例文は既存の言い回しの繰り返しを避け、バリエーションを持たせる
5. 会話フレーズ追加時は`CONV`と`CONV_BREAKDOWN`の両方を必ずセットで追加する
6. コピペではなく独自の例文にする（教材からの丸パクリはNG、と過去に指摘あり）

## 現在のコンテンツ量（2026-11-16b時点）
- 単語: 1,799語（名詞994・動詞427・形容詞182・副詞144・類別詞25・疑問14・挨拶13）。初心者(level 5)は928語
- 会話: 360文 / 文法: 62項目
- タブ構成: 単語・会話・文法・リスト・数字・テスト（**タイ文字タブは2026-11-11に完全削除**。発音記号ガイドも削除済み）
- テスト: 4択（タイ語→日本語 / 日本語→タイ語 / 聞いて選ぶ）。区分に「数字」あり（`thaiNumber()`で1〜9,999,999の読みを生成。101は หนึ่งร้อยหนึ่ง、เอ็ดは十の位があるときだけ）
- テストから単語カードへ(2026-11-28): 回答後の「📖 この単語のカードを見る(例文つき)」と結果画面の間違えた問題の📖で `quizOpenCard(id)` → カードを裏返した状態で開く(`st.fromListTab='quiz'`)。戻るボタンは「← テストに戻る」で、テストの同じ画面(回答後/結果)に戻る。GAイベント quiz_open_card
- 数字タブ: 電卓型（`renderNumbers` / `numUI`）。ルール解説はアプリ内カード
- 苦手な単語: テストで間違えた単語を `st.weak`（{単語ID:連続正解数}、保存キー `s:weak`）に記録。2回続けて正解で外れる（`weakRecord`）。リストタブの「苦手」とテスト区分「苦手」で使う。数字問題は記録しない。エクスポート/自動バックアップにも含む

## 重複整理とID（2026-11-12）
- 同じタイ語の重複39語を統合済み（2026-11-16に เมื่อคืนวาน・เคยๆ・ก้อย を削除、ง่วงนอน/หิว/ชื้น/แล้ง を名詞→形容詞へ移動し a215〜a218 に振り直し。いずれも ID_MERGE で記録を引き継ぐ）。消したIDは `ID_MERGE`（{消したID:[残したID,元の品詞,残した品詞]}）に記録し、`migrateMergedIds()` が学習記録・お気に入りを引き継ぐ
- **`ID_MERGE` に載っている消したIDは再利用しない**。新規IDは「DATA内とID_MERGE内を含めた最大番号+1」から振る（名詞は n1005 まで使用＝4桁あり）
- 残っている同つづり9組（คน/เงิน/จาน/ชุด/ฟ้า/เส้น/วัด/พิเศษ/ชาม）は品詞・意味が違う正当なもの

## マネタイズ方針（2026-11-16時点）
- **無料版**: 単語は**基本の300語のみ**（挨拶11・疑問13・類別詞25＋名詞110・動詞75・形容詞35・副詞31。IDは `free_words.json`。初心者928語を全部無料にすると買う理由が無くなるため2026-11-16に絞った）／会話は日常会話・レストランのみ（**緊急は無料に含めない**）／4択テストは無料300語の「タイ語⇔日本語」のみ（**「聞いて選ぶ」は有料**）／苦手な単語は記録だけされ、**苦手リストの表示・苦手テストは有料**／お気に入り・リストは無料範囲のみ対象
- **有料版**: 単語すべて(初心者の残り・中級者+)／会話の全シーン（観光・ホテル・交通・緊急）／文法すべて／数字タブ／テストの中級者+と数字／お気に入り・リストが全対象
- **価格**: 月額300円／年間3,000円／買い切り4,000円（すべて税込表記）
- 無料範囲はそのまま開放し、有料部分をタップしたら案内を出す方針
- **アプリ側の出し分けは実装済み（2026-11-19）だが、まだ止めてある**: `PAYWALL_LIVE=false` の間は全機能が誰でも使える。確認用に `app.html?paywall=1` で開いたときだけ有効（`?paywall=0` で解除、sessionStorage `poca:pw`）。ホーム画面のアプリでは、タイトルの下のバージョン表示を3秒以内に7回押すとオン/オフ（localStorage `poca:pw`、2026-11-21e）
  - 中心の関数: `isPaid()` / `canWord(w)` / `canScene(sc)` / `canMode(m)` / `vocabArr(pos)`（リストからカードを開くときも同じ並びを使う）。無料の単語IDは `FREE_WORDS`（free_words.json と同じ300語）、無料シーンは `FREE_SCENES`
  - 🔒の付く所: 文法・数字タブ（説明ページ `lockPageHtml`）、会話シーン4つ、単語のレベル切替、テストの「聞いて選ぶ」「数字」「苦手」「中級者+」、リストの文法・苦手。学習済み・お気に入りは無料範囲だけ表示し、隠れた件数を案内
  - 有料版の案内で料金カードをタップしてプランを選ぶ（最初は年間）→「決済画面へ進む(〇〇)」で中継ページ `buy.html?plan=プラン` を開き、すぐ Stripe の決済画面へ移動（2026-11-20g。LPを経由すると一瞬LPが見えるため専用の中継ページにした）
  - 案内画面: `openPaywall(理由)`、購入コード入力 `openCodeSheet()`、契約状態 `openPlanSheet()`。シートは閉じたら画面から取り除く（WebKitの残像対策）。シートの高さは `88dvh`（iPhoneのSafariは `vh` がアドレスバーを含まない高さになり、見出しが隠れたため。2026-11-21a）
  - **iPhoneは Safari とホーム画面のアプリで保存場所が別々**（Safariで入れたコードはホーム画面のアプリに引き継がれず、端末も2台分になる）。さらにSafariは7日間開かないと保存した記録を消すことがある。そのため **iPhoneのSafari(ホーム画面に追加していない状態)では購入コードを入力できない**ようにし、代わりにホーム画面に追加する手順を出す（`iosSafariOnly()` / `iosInstallSteps()`、2026-11-21c、TAKA決定）。無料版はSafariでも使える。有料版の案内と購入完了画面 `thankyou.html` にも iPhone 向けの案内を出す。Androidは同じ保存場所なので制限しない。iPad(UAがMac)は対象外
  - **端末の数(2026-11-21d)**: 60日(Worker の `INACTIVE_DAYS`)確認のない端末は台数に数えず、次に別の端末で登録するときに外す。外れた端末は次の確認で `error:'device'` になり無料版に戻る(コードを入れ直せば使える)。買い切りも1日1回 `/status` を呼ぶ(使っている端末だと伝えるため)。`/activate`・`/status` は `devicesUsed`/`devicesMax` も返し、「✓ 有料版」の画面に「使っている端末 2台 / 3台まで(あと1台)」を表示
  - 購入状態は localStorage `s:ent`（{code,plan,active,checkedAt}）、端末IDは `s:dev`
  - `PAY_API` が空の間は確認用テストコードだけ使える: TEST-MONTHLY / TEST-YEARLY / TEST-LIFETIME / TEST-CANCELED（次の確認で解約扱い）/ TEST-LIMIT（3台超え）
  - **決済Workerに必要な窓口**（すべてPOST・JSON、`{code, device}` を送る）: `/activate` → `{ok,plan:'monthly'|'yearly'|'lifetime',active}` または `{ok:false,error:'invalid'|'limit'}`／`/status` → `{ok,plan,active}`（2026-11-20d〜 月額・年間は `periodEnd`(次の更新日)・`cancelAt`(解約の手続き済みのときの利用期限、無ければ null)も返す。アプリは「✓ 有料版」の画面に「次の更新日」か「利用期限 〜まで」を表示。お支払い・解約の画面から戻ったときはすぐ `/status` で確認する）／`/deactivate` → `{ok}`／`/portal` → `{ok,url}`（Stripeのお客様用管理画面）
  - `PAY_API` は設定済み（2026-11-20c、`https://thai-poca-payment.takatobi.workers.dev/api`）。そのため確認用のテストコード(TEST-…)はもう使えない
  - LP の購入ボタン: `lp.html` の `SALE_LIVE=false` の間は「準備中」のまま。`lp.html?paytest=1` で開いたときだけ押せる（`?paytest=0` で解除）。押すと `/api/checkout {plan}` → Stripe の購入画面へ
  - 購入完了画面 `thankyou.html`: `/api/session-status?session_id=` を2秒ごと最大60秒たずねてコードを表示。`SALE_LIVE=false` の間は「テスト環境」の表示を出し、アプリへのボタンは `app.html?paywall=1`
  - **販売開始時にやること**: ① Stripe を本番に切り替え（2026-11-21 済み）② `app.html` の `PAYWALL_LIVE=true` ③ `lp.html`・`thankyou.html`・`buy.html` の `SALE_LIVE=true` ④ `tokushoho.html` の内容（価格・条件）が実際と合っているか最終確認 ⑤ サンドボックスのテスト用コードの削除（2026-11-21 済み）
- **購入者の確認方法（2026-11-18決定）**: 指さしタイと同じ「購入コード方式」（Stripe決済→コードをメールで送付→アプリで1回入力）。メールログインはiPhoneのホーム画面アプリでメールのリンクがSafariに開いてしまうため不採用
  - 1つのコードで使えるのは**3台まで**
  - 月額・年間は解約チェックあり：起動時にネットにつながっていれば1日1回まで状態を確認。**オフラインでも最後の確認から14日間**は有料部分を使える。それを過ぎたら次に確認できるまで無料範囲に戻る（学習記録は消さない）
  - 解約はStripeのお客様用管理画面（カスタマーポータル）へのリンクをアプリとLPに置く
  - 月額・年間の手数料はカード3.6%＋Stripe Billing 0.7%（買い切りは3.6%のみ）
- **2026-11-21 Stripe を本番(ライブ)に切り替え済み**: 本番の商品 prod_VfSGL9Y9HBl7NL／価格 月額 price_1Ue7LuHNqCNFxpUGpygGcLzF・年間 price_1Ue7PzHNqCNFxpUGRDX7qT8D・買い切り price_1Ue7TFHNqCNFxpUGXM3VUB7g／Webhook we_1Ue7fTHNqCNFxpUGQtcJhIp7／キーは Thai Poca 専用の制限付きキー thai-poca-payment（Checkout Sessions 書き込み・Subscriptions 読み取り・Customer portal 書き込み）。サンドボックスのテスト用コードは削除済み。`?paywall=1`・`?paytest=1` の確認用の入口でも本物の決済になる
- 決済の裏側（2026-11-20 サンドボックスで構築済み）: Cloudflare Worker `thai-poca-payment`（コードは `likklemore1126/yubisashi-thai-payment` の `thai-poca-payment/` フォルダ。**このリポジトリの main に push すると指さしタイの Worker も自動で公開されるので、push 前に必ずTAKAに伝える**）／Supabase「TakaTobi」組織の yubisashi-thai プロジェクトの `poca_codes`・`poca_devices`・`poca_stripe_events`／Stripe サンドボックスの商品「Thai Poca」／メールは Resend の `noreply@poca.takatobi.jp`
  - サンドボックスの価格ID: 月額 price_1UdVGdHNgdYA3siwIe2DbMLZ／年間 price_1UdVGdHNgdYA3siwQbfSMKix／買い切り price_1UdVGdHNgdYA3siwaevEGGgv

## LP（lp.html）
- 配色はアプリと同じ墨×砂＋テラコッタ（`--gold` という変数名のまま値はテラコッタ `#d49a78`）。マリーゴールドの黄色は使わない
- 一番上のボタンは「無料で試す」→ `app.html`。`lp_assets/card_hero.png` は実アプリのカードを撮ったもの（アプリの見た目を変えたら撮り直す）
- 2026-11-20: FAQに支払い方法・解約・機種変更を追加、ローマ字の説明を教本方式に直した。特定商取引法の表記 `tokushoho.html` を追加（内容は指さしタイと同じ販売者情報。料金・自動更新・解約の条件を記載）し、LPのフッターと料金の下にリンク
- 2026-11-21 手入れ: FAQにiPhoneはホーム画面追加が必要・何台まで(3台・60日)を追加、はじめかたにiPhoneの注意、6つの学び方の後に「アプリの画面」(lp_assets/shot_*.webp、実アプリを撮ったもの。アプリの見た目を変えたら撮り直す)、便利機能は最初の5つだけ見せて「ほかの便利機能を見る」、ページの最後に「無料で試す」、料金の比較表を短く、card_hero.png を撮り直し(背景を透明に)
- 料金カードの「準備中」→購入ボタン、冒頭の「有料プランは現在準備中です」を消すのは `SALE_LIVE=true` で自動（`initBuy()`）
- 2026-11-21 販売前の追加: 利用規約 `terms.html`・プライバシーポリシー `privacy.html` を新設（指さしタイのものをThai Poca向けに書き換え。自動更新・3台/60日・iPhoneはホーム画面追加・14日オフライン・学習記録は端末内のみ・委託先Stripe/Supabase/Cloudflare/Resend・Googleアナリティクス）。LPのフッター・料金の下、アプリの有料版の案内(`.pw-legal`)、特商法ページからリンク。特商法の動作環境と特別な販売条件にiPhoneのホーム画面追加と60日を追記。SNS共有用の画像 `lp_assets/ogp.jpg`(1200×630)とOGPタグを lp.html・app.html に追加
- 目次メニュー(右上の≡、指さしタイと同じ形)、開発者については「詳しく見る」で折りたたみ、ホーム画面追加の手順は実機スクショ(lp_assets/howto_ios_*.webp・howto_and_*.webp)つき
- 「開発者自身が実際に使う言い回し」のような言い切りはTAKAの判断で削除済み（2026-11-21）。今後も書かない

## アクセス解析（Googleアナリティクス、測定ID G-DE7T1Q55VC。app.html・thankyou.html・lp.html 共通）
- app.html のイベント: mode_view(タブ) / category_view / card_flip / audio_play / search / favorite_add / mark_learned / help_view / quiz_start / quiz_finish / paywall_view(reason) / checkout_click(plan, source:'app') / paid_activate。ユーザープロパティ display_mode = home_app(ホーム画面のアプリ) / browser
- lp.html(2026-11-25〜): try_free_click(position:top|bottom) / checkout_click(plan, source:'lp')
- thankyou.html: purchase(SALE_LIVE のときだけ)
- display_mode・plan・source・position・reason をレポートで見るには、GA4の管理 →「カスタム定義」に登録が必要（登録前のデータはさかのぼって集計されない）

## 姉妹プロジェクト
- 指差し単語帳（yubisashi-thai）: 観光客向け。リポジトリ `likklemore1126/yubisashi-thai`。PWA化（manifest.json/Service Worker）が別チャットで進行中の可能性あり
- REIWA SOBA VIP: 店舗の会員証アプリ。Supabase + Cloudflare Workers構成の元ネタ

## TAKAのスタイル
- カジュアルな日本語、スクリーンショットで不具合報告することが多い
- モバイル画面前提、簡潔な返信を好む
- 実際にタイで生活している視点からのフィードバックが的確（例: 「辛くしないでください」より「唐辛子を入れないでください」の方が実用的、等）
