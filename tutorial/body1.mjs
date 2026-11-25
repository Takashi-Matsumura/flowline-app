// ── 本編 ──
// 題材の図だけを残す（seed.mjs を何度か走らせた場合の重複を消す）
const list = await (await fetch(`${BASE}/api/diagrams`)).json();
for (const d of list.diagrams) if (d.slug !== slug) await fetch(`${BASE}/api/diagrams/${d.slug}`, { method: "DELETE" });
await app.goto(`${BASE}/`);
await app.getByText("保存済みの図").waitFor();
await stage("chapter", "はじめに", "この動画について", 0);
await stage("card", `<div class="eyebrow">アプリをご利用のみなさまへ</div><h1>Flowline はじめてガイド</h1><p>アプリの概要 ─ 「請求書受領業務（改）」を例に</p>`);
await new Promise((f) => setTimeout(f, 900));

if (session) {
  await session.send("Page.startScreencast", { format: "jpeg", quality: 95, everyNthFrame: 1, maxWidth: STAGE_W, maxHeight: STAGE_H });
  await new Promise((f) => setTimeout(f, 300));
}
t0 = clock();
const t0Wall = Date.now() / 1000;

await say("Flowline（フローライン）は、**業務フロー図**を描くためのアプリです。この動画で、全体の使い方をつかみましょう。");
await say("この動画に音声はありません。字幕を読みながら進めてください。**途中で止めたり、戻したり**して、自分のペースでご覧いただけます。");

await stage("card", `<div class="eyebrow">この動画でわかること</div><h2>全体を一度ながめてみましょう</h2><ol>
<li><span>1</span>Flowline でできること</li><li><span>2</span>画面の見かたと、図の読み方</li><li><span>3</span>図の直し方（間違えても大丈夫な理由）</li><li><span>4</span>再生・点検・業務分掌・書き出し</li></ol>`);
await say("今回の目的は、操作を覚えることではなく、**どこに何があるかを知ること**です。細かい操作は、使いながら少しずつ慣れていきましょう。");

// 第1章
await chapter("Flowline でできること");
await say("Flowline では、仕事の流れを「**誰が・誰に・何をするか**」の順に書いていきます。");
await stage("card", `<div class="eyebrow">第1章　Flowline でできること</div><h2>書いた内容が、そのまま図になります</h2>
<div class="flow"><div><b>描く</b><small>人・部署と、手順を<br>順に書く</small></div><i>→</i><div><b>再生</b><small>流れを字幕で<br>追って確かめる</small></div><i>→</i><div><b>点検</b><small>抜けや気になる点を<br>見つける</small></div><i>→</i><div><b>文書にする</b><small>業務分掌を作り、<br>ファイルに書き出す</small></div></div>`);
await say("線や箱を自分で引く必要はありません。入力した内容から、図は**自動で**描かれます。絵を描く技術はいりません。");
await say("できあがった図は、流れの再生、点検、業務分掌の作成へとつなげられます。この順番で紹介していきます。");
await say("題材は、サンプルの「**請求書受領業務（改）**」です。お客様から届いた請求書を確認し、会計システムへ登録するまでの業務です。");

// 第2章
await chapter("最初の画面");
await sleep(1500);
await hideCard();
await say("アプリを開くと、最初にこの**一覧画面**が表示されます。上から順に見ていきましょう。", { hold: 4600 });
await say("いちばん上は「**使い方の動画**」です。今ご覧いただいている、この動画もここから再生できます。", {
  spots: [await spot(app.locator("section").filter({ has: app.getByRole("heading", { name: "使い方の動画" }) }).getByRole("list"), { tag: "使い方の動画", tagAt: "below" })],
});
await say("新しい図を作るときは、ここに**業務名**を入れて「作成して開く」を押します。", {
  spots: [await spot([app.getByPlaceholder("例: 月次請求書発行業務"), btn("作成して開く")], { tag: "新しい図を作る" })],
});
await say("右の「**ファイルから読み込む**」は、ほかの PC で書き出した図のファイル（.json）を取り込むときに使います。", {
  spots: [await spot(btn("ファイルから読み込む"), { tag: "ファイルから読み込む", tagAt: "below" })],
});
const row = app.locator("tr").filter({ hasText: "請求書受領業務（改）" });
await say("作った図は、この「**保存済みの図**」の表に並びます。業務名を押すと、図が開きます。", {
  spots: [await spot(row, { tag: "保存済みの図" })],
});
await say("表の見出しを押すと並べ替え、右上の欄に入力すると業務名で**絞り込み**ができます。図が増えてきたら便利です。", {
  spots: [await spot(app.locator("thead")), await spot(app.getByPlaceholder("業務名で絞り込む"))],
});
await say("右端のボタンは、左から「名前を変更」「コピー」「エクスポート」「削除」です。", {
  spots: [await spot([row.getByRole("button", { name: "名前を変更" }), row.getByRole("button", { name: "削除" })], { tag: "図の操作", tagAt: "above" })],
});
await say("練習するときは「**コピー**」がおすすめです。元の図はそのまま残るので、コピーした図で安心して試せます。", {
  spots: [await spot(row.getByRole("button", { name: /コピー/ }), { pad: 10, tag: "練習のときはコピーがおすすめ", tagAt: "below" })],
});
await say("「**エクスポート**」は、図をファイル（.json）に保存します。別の PC へ移すときや、控えを残すときに使います。", {
  spots: [await spot(row.getByRole("button", { name: /エクスポート/ }), { pad: 10, tag: "エクスポート", tagAt: "below" })],
});
const dict = app.locator("summary").filter({ hasText: "読みの辞書" });
await say("いちばん下の「**読みの辞書**」には、社内のシステム名など、読み上げで読み違える言葉の読み方を登録できます。", {
  spots: [await spot(dict, { tag: "読みの辞書", tagAt: "above" })],
});
await clear();
await say("それでは、サンプルの図を開いてみましょう。", { hold: 3000 });
await click(row.locator("a"));
await app.locator("svg .messageText").first().waitFor();
await sleep(1200);

// 第3章
await chapter("編集画面の見かた");
await sleep(1800);
await hideCard();
await stage("cursorHide");
await say("図を開くと、この**編集画面**になります。大きく 4 つの部分に分かれています。", { hold: 5200 });
await say("いちばん上は図の名前です。左の丸いボタンを押すと、最初の一覧に戻ります。", {
  spots: [await spot([app.getByRole("link", { name: "一覧に戻る" }), app.locator("h1").first()], { tag: "図の名前と、一覧へ戻るボタン" })],
});
await say("右上の「**保存済み**」にも注目してください。図は自動で保存されるので、**保存ボタンはありません**。", {
  spots: [await spot(app.getByRole("status").filter({ hasText: "保存" }), { tag: "自動で保存されます", tagAt: "below", pad: 12 })],
});
await say("2 段目の左側は、図を作る・確かめるためのボタンです。登場人物やステップの追加、再生、点検はここから行います。", {
  spots: [await spot([app.getByRole("button", { name: /登場人物/ }), btn("フローを点検")], { tag: "操作のボタン", tagAt: "below" })],
});
await say("2 段目の右側は、**図の見え方**を変えるボタンです。付箋や枠をまとめて開け閉めしたり、図の大きさを変えたりできます。", {
  spots: [await spot([btn(/付箋をすべて開く/), btn(/全体を表示/)], { tag: "図の見え方", tagAt: "below" })],
});
await say("中央の大きな部分が**図**です。ここを見ながら作業を進めます。長い図は、この中をスクロールして見ます。", {
  spots: [{ x: 20, y: 183, w: 1880, h: 662, pad: 0 }],
});
await say("いちばん下には、削除したステップの一覧、業務分掌の作成、書き出しのボタンがあります。", {
  spots: [await spot([btn("業務分掌を作る"), app.locator("summary").first(), app.locator("summary").filter({ hasText: "書き出し" })], { tag: "仕上げのボタン", tagAt: "above" })],
});
await clear();

// 第4章
await chapter("図の読み方");
await sleep(1800);
await hideCard();
const firstActor = app.locator('rect.actor-top').first();
const topRow = [app.locator("svg rect.actor-top").first(), app.locator('svg rect.actor-top').last(), app.locator("svg .actor-man.actor-top").first()];
await say("ここからは図の読み方です。まず、いちばん上に並んでいるのが、この業務に関わる「**登場人物**」です。", {
  spots: [await spot(topRow, { tag: "登場人物" })],
});
await say("人の形は、**社内の人や部署**を表します。営業担当、総務部、経理部の 3 つです。", {
  spots: await Promise.all(["A2", "A5", "A3"].map((id) => spot(app.locator(`svg g.actor-man.actor-top[name="${id}"]`), { pad: 14 }))),
});
await say("四角は、**社外の相手やシステム**を表します。ここでは顧客、会計システム、ファイルサーバです。", {
  spots: [
    await spot(app.locator('svg rect.actor-top[name="A1"]')),
    await spot(app.locator('svg rect.actor-top[name="A4"]')),
    await spot(app.locator('svg rect.actor-top[name="A6"]')),
  ],
});
const actorName = (t) => app.locator("svg text").filter({ hasText: t }).first();
await say("名前の「**起点**」は業務が始まるところ、「**終点**」は業務が終わるところです。この業務は顧客から始まり、経理部で終わります。", {
  spots: [await spot(app.locator('svg rect.actor-top[name="A1"]')), await spot(actorName("経理部"), { pad: 14 })],
});
await say("オレンジ色で太字の経理部は、この図の**中心となる部署**です。", {
  spots: [await spot(actorName("経理部"), { pad: 14 })],
});
await clear();
await say("図は、**上から下へ**時間が流れます。番号の順に読んでいくと、仕事の流れがわかります。", { hold: 6000 });
const n1 = num(1);
const step1 = [n1, msg(0), app.locator("svg text.noteText").filter({ hasText: "請求書PDF" }).first()];
await say("黒い丸の番号が、1 つの手順です。Flowline ではこれを「**ステップ**」と呼びます。", {
  spots: [await spot(n1, { pad: 12, tag: "ステップの番号", tagAt: "above" })],
});
await say("矢印は、仕事がどこからどこへ渡るかを示します。ステップ 1 は「顧客が営業担当へ、請求書PDFをメールで送信する」と読みます。", {
  spots: [await spot([n1, msg(0), app.locator("svg [class*=messageLine]").first()], { pad: 12 })],
});
await say("黄色い帯は「**渡すもの**」です。書類やデータなど、やり取りされるものを表します。", {
  spots: [await spot(app.locator("svg rect.note").first(), { pad: 6, tag: "渡すもの", tagAt: "below" })],
});
await clear();
await scrollToStep(4, 260);
await say("ステップ 4 のように、自分に戻ってくる矢印は、**その部署の中で行う作業**です。総務部が紙の請求書をスキャンしています。", {
  spots: [await spot([num(4), msg(3)], { pad: 18 })],
});
await say("図を下へスクロールすると、登場人物の名前が**上の端に残ります**。どの縦線が誰なのか、迷わずに読めます。", {
  spots: [await spot([app.locator("div.sticky.pointer-events-none span.truncate").first(), app.locator("div.sticky.pointer-events-none span.truncate").last()], { pad: 8, tag: "登場人物の名前", tagAt: "below" })],
});
await clear();
await scrollDiagram(0);
const loopLabels = app.locator("svg .labelText");
await say("左上の「**alt**」と書かれた点線の枠は、**場合分け**です。条件によって、どちらか一方の流れになります。", {
  spots: [await spot(app.locator("svg .labelBox").first(), { pad: 8, tag: "alt：場合分け", tagAt: "below" })],
});
const conds = app.locator("svg .loopText");
await say("この図では「メールで届いた場合」はステップ 1・2、「郵送で届いた場合」はステップ 3・4 に進みます。", {
  spots: [await spot(conds.nth(0), { pad: 8 }), await spot(conds.nth(1), { pad: 8 })],
});
await clear();
await scrollToStep(5, 220);
await say("「**loop**」の枠は、**くり返し**です。「請求書の不備がなくなるまで」、枠の中のステップ 5〜9 をくり返します。", {
  spots: [await spot(app.locator("svg .labelBox").nth(1), { pad: 8, tag: "loop：くり返し", tagAt: "above" })],
});
await clear();
const noteMark = app.locator('button[title*="の付箋（"]').first();
await say("ステップの横の黄色い「**?**」は**付箋**です。図の流れとは別に、チームで決めることをメモしています。", {
  spots: [await spot(noteMark, { pad: 10, tag: "付箋" })],
});
await clear();
await click(noteMark);
await sleep(700);
await say("押すと中身が開きます。ここには「不備と判断する基準」という、まだ決まっていない論点が書かれています。", { extra: 800 });
await click(noteMark);
await sleep(400);
await stage("cursorHide");
await scrollToStep(13, 200);
const lastSteps = await spot([num(14), msg(13)], { pad: 16, tag: "仮の手順（点線）" });
await say("ステップ 14 のように**点線**で描かれた手順は「**仮**」です。まだ確かでなく、チームで確かめる必要があるという印です。", {
  spots: [lastSteps],
});
await clear();
await scrollDiagram(0);

// 第5章
await chapter("図の直し方");
await sleep(1800);
await hideCard();
await say("図の番号を押すと、右側に「**ステップの編集**」が開きます。ステップ 1 を押してみましょう。", { hold: 4800 });
await click(num(1));
await sleep(900);
const panel = app.getByRole("complementary", { name: "ステップの編集" });
const nameInput = app.getByLabel("ステップの名前");
await say("ステップの名前、誰が、誰に、渡すものなどを、ここで確認して直せます。", {
  spots: [await spot(panel.locator("section").first(), { pad: 4 })],
});
await clear();
await say("試しに、ステップの名前を変えてみます。", { hold: 3000 });
await click(nameInput, { pause: 200 });
await nameInput.selectText();
await sleep(500);
await page.keyboard.type("請求書PDFをメールで送る", { delay: FAST ? 0 : 90 });
await sleep(800);
await page.keyboard.press("Enter");
await sleep(300);
await say("入力すると、左の図にも**すぐ反映**されます。右上の表示も「保存中」から「保存済み」に変わり、自動で保存されました。", {
  spots: [await spot(msg(0), { pad: 10 }), await spot(app.getByRole("status").filter({ hasText: "保存" }), { pad: 12 })],
});
await clear();
const undoBtn = btn(/^元に戻す（/);
await say("間違えたときは「**元に戻す**」を押します。ひとつ前の状態に戻るので、失敗を心配せずに試せます。", {
  spots: [await spot(undoBtn, { tag: "元に戻す", tagAt: "below" })],
});
await clear();
await click(undoBtn);
await sleep(1200);
await say("元の名前に戻りました。", {
  spots: [await spot(msg(0), { pad: 10 })],
  hold: 3200,
});
await clear();
await click(app.getByRole("complementary", { name: "ステップの編集" }).getByRole("button", { name: "閉じる" }));
await sleep(600);
await stage("cursorHide");
await say("手順を足すときは「**ステップを追加**」、場合分けやくり返しを足すときは「**分岐を追加**」を使います。今回は場所だけ覚えておきましょう。", {
  spots: [await spot([btn("ステップを追加", { exact: true }), btn("分岐を追加", { exact: true })], { tag: "手順や枠を足す", tagAt: "below" })],
});
await say("人や部署を増やしたいときは、左端の丸いボタン「**登場人物を編集**」から行います。", {
  spots: [await spot(app.getByRole("button", { name: /登場人物/ }), { pad: 6, tag: "登場人物を編集", tagAt: "below" })],
});
await clear();
const foldBtn = btn(/枠.*をすべて畳む/);
await say("図が長くなってきたら、「**枠をすべて畳む**」が便利です。枠の中身を隠して、全体の流れを見渡せます。", {
  spots: [await spot(foldBtn, { tag: "枠をすべて畳む", tagAt: "below" })],
});
await clear();
await click(foldBtn);
await sleep(1500);
await stage("cursorHide");
await say("畳むのは見え方だけで、図の内容は変わりません。もう一度押すと、元どおり開きます。", { extra: 800 });
await click(btn("枠をすべて開く"));
await sleep(1200);
await stage("cursorHide");

// 第6章
await chapter("フローの再生");
await sleep(1800);
await hideCard();
await say("図ができたら、まず「**フローの再生**」で流れを確かめます。", {
  spots: [await spot(btn("フローの再生"), { tag: "フローの再生", tagAt: "below" })],
});
await clear();
await click(btn("フローの再生"));
await sleep(400);
const dlg = app.getByRole("dialog", { name: /流れのプレビュー/ });
await stage("cursorHide");
await showCap("図の上で、今の手順を強調しながら、画面下の字幕で流れを説明してくれます。");
await sleep(6500);
await showCap("「この流れで合っているかな」と、**チームで一緒に見ながら確かめる**ための機能です。");
await sleep(7500);
await showCap("丸い印が矢印の上を走り、**どこからどこへ渡るのか**が目で追えます。");
await sleep(FAST ? 100 : 8000);
const pauseBtn = dlg.getByRole("button", { name: /一時停止/ });
await click(pauseBtn, { pause: 150 });
await sleep(500);
await say("下のボタンで、一時停止、前へ、次へと操作できます。わかりにくいところは、止めてじっくり確かめましょう。", {
  spots: [await spot([dlg.getByRole("button", { name: /最初から/ }), dlg.getByRole("button", { name: /次へ/ })], { tag: "再生の操作", tagAt: "above" })],
});
await say("再生中に気づいたことは「**＋ この手順に付箋**」で、その場で付箋に残せます。チームで見ながら、論点をメモしておきましょう。", {
  spots: [await spot(dlg.getByRole("button", { name: /この手順に付箋/ }), { pad: 8, tag: "この手順に付箋", tagAt: "above" })],
});
await say("右側では、字幕の大きさと再生の速さを変えられます。会議室の大きな画面で見せるときは、字幕を大きくすると読みやすくなります。", {
  spots: [await spot([dlg.locator("label").filter({ hasText: /^字幕/ }).first(), dlg.locator("label").filter({ hasText: /^速さ/ }).first()], { pad: 8, tag: "字幕の大きさ・速さ", tagAt: "above" })],
});
await say("「読み上げ」に印を付けると、字幕を声で読み上げます（VOICEVOX が使える環境の場合）。", {
  spots: [await spot(dlg.locator("label").filter({ hasText: /^読み上げ/ }).first(), { pad: 8, tag: "読み上げ", tagAt: "above" })],
});
await clear();
await click(dlg.getByRole("button", { name: "閉じる" }));
await sleep(700);
await stage("cursorHide");

// 第7章
await chapter("フローを点検");
await sleep(1800);
await hideCard();
await say("次は「**フローを点検**」です。自分たちでは気づきにくい、図の抜けや気になる点を教えてくれます。", {
  spots: [await spot(btn("フローを点検"), { tag: "フローを点検", tagAt: "below" })],
});
await clear();
await click(btn("フローを点検"));
await sleep(900);
await stage("cursorHide");
const review = app.getByRole("complementary", { name: "フローの点検" });
await say("右側に点検の結果が出ます。上の「業務の前提」には、この業務の目的・きっかけ・頻度を書いておきます。", {
  spots: [await spot([review.getByRole("heading", { name: "業務の前提" }), review.getByLabel("頻度")], { pad: 6 })],
});
const ruleHead = review.getByText(/図の点検（/);
const firstCard = review.locator("article").first();
await say("「**図の点検**」は、決まったルールで確実に指摘できるものです。ここでは「差し戻しの判断に、承認者が決まっていない」と教えてくれました。", {
  spots: [await spot(firstCard, { pad: 4 })],
});
const five = firstCard.getByRole("button", { name: "5", exact: true });
await say("指摘の中の番号を押すと、図のどの手順のことかを示してくれます。", {
  spots: [await spot(five, { pad: 10 })],
});
await clear();
await click(five);
await sleep(1000);
await stage("cursorHide");
await scrollToStep(5, 220);
await say("図の中で、該当するステップ 5 が**オレンジ色**で強調されました。", { spots: [await spot([num(5), msg(4)], { pad: 12 })], hold: 5000 });
await clear();
await click(five, { ms: 500 });
await stage("cursorHide");
const aiHead = review.getByText(/AI の指摘/).first();
await aiHead.waitFor();
await review.getByText(/AI の指摘（/).waitFor({ timeout: 30000 });
await review.locator("h3", { hasText: "AI の指摘" }).scrollIntoViewIfNeeded();
await sleep(700);
await say("「**AI の指摘**」は、AI が図を読んで、抜けていそうな点を挙げたものです。実際には 30〜60 秒ほどかかることがあります。", {
  spots: [await spot(review.locator("h3", { hasText: "AI の指摘" }), { pad: 8 })],
});
const aiCard = review.locator("article").filter({ hasText: "請求書の保管場所の定義" });
await aiCard.scrollIntoViewIfNeeded();
await sleep(600);
await say("たとえば「請求書PDFや明細の保管場所は決まっていますか？」のように、確認すべき点を問いかけてくれます。", {
  spots: [await spot(aiCard, { pad: 4 })],
});
await say("ただし、**AI の指摘は推測を含みます**。そのまま信じずに、必ずチームで確かめてから図に反映してください。", {
  spots: [],
});
await say("直す案が出た場合も、勝手に図は変わりません。「図で見る」で確かめてから、「この案で直す」を選びます。", { extra: 400 });
await click(review.getByRole("button", { name: "閉じる" }));
await sleep(600);
await stage("cursorHide");
await scrollDiagram(0);

// 第8章
await chapter("業務分掌を作る");
await sleep(1800);
await hideCard();
await say("図がある程度できたら、「**業務分掌を作る**」を押します。図の内容から、文書を自動で作ります。", {
  spots: [await spot(btn("業務分掌を作る"), { tag: "業務分掌を作る", tagAt: "above" })],
});
await clear();
await click(btn("業務分掌を作る"));
await sleep(300);
await stage("cursorHide");
await say("AI が文章を書くので、数十秒かかることがあります。（動画では待ち時間を短くしています）", { hold: 3400 });
const tab = app.getByRole("tab", { name: "プレビュー" });
await tab.waitFor({ timeout: 30000 });
await sleep(600);
const sumDlg = app.locator("dialog[open]");
/** 文書の見出しまでスクロール */
async function toHeading(text) {
  const y = await app.evaluate((t) => {
    const scroller = document.querySelector("dialog[open] .overflow-auto");
    const h = [...scroller.querySelectorAll("h1,h2,h3")].find((e) => e.textContent.includes(t));
    return { y: scroller.scrollTop + h.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 12 };
  }, text);
  await app.evaluate(
    ([to, ms]) =>
      new Promise((done) => {
        const el = document.querySelector("dialog[open] .overflow-auto");
        const from = el.scrollTop, t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / ms);
          el.scrollTop = from + (to - from) * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
          k < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      }),
    [y.y, FAST ? 1 : 1300],
  );
  await sleep(200);
}
await say("業務分掌ドキュメントができました。付箋や「仮」の手順が残っていると、このように「**下書き**」と表示されます。");
await toHeading("部署別の分掌");
await say("「部署別の分掌」には、部署ごとの責任や、受け取るもの・引き渡すものが、図の内容からまとめられています。");
await toHeading("責任分担表");
await say("「責任分担表」では、業務のまとまりごとに、誰が行い、誰が承認するかを一覧で確認できます。");
await toHeading("統制上の確認点");
await say("「統制上の確認点」では、作る人と承認する人が分かれているかなど、確認すべき点が挙げられます。");
await toHeading("未決事項");
await say("付箋に書いた、まだ決まっていないことは「未決事項」に載ります。チームで話し合うときの資料になります。");
await say("文書は AI が作った**たたき台**です。内容は必ずチームで確認してください。画面の下から .md ファイルに保存したり、コピーしたりできます。", {
  spots: [await spot([sumDlg.getByRole("button", { name: /\.md を保存/ }), sumDlg.getByRole("button", { name: "コピー" })], { pad: 8, tag: "保存・コピー", tagAt: "above" })],
});
await clear();
await click(sumDlg.getByRole("button", { name: "閉じる" }));
await sleep(600);
await stage("cursorHide");

// 第9章
await chapter("書き出しとその他の機能");
await sleep(1800);
await hideCard();
const exp = app.locator("summary").filter({ hasText: "書き出し" });
await say("「**書き出し**」を押すと、図をファイルとして保存できます。ほかのアプリで使いたいときに利用します。", {
  spots: [await spot(exp, { tag: "書き出し", tagAt: "above" })],
});
await clear();
await click(exp);
await sleep(700);
await stage("cursorHide");
await say("「.drawio」は draw.io で編集できる形式、「.mmd」は Mermaid のコード、「.svg」は画像として使える形式です。Canva などに取り込むときは「SVG 1.1」を選びます。", {
  spots: [await spot([app.getByRole("button", { name: ".drawio" }), app.getByRole("button", { name: /SVG 1\.1/ })], { pad: 4 })],
});
await clear();
await exp.evaluate((el) => (el.parentElement.open = false));
await sleep(500);
const retr = app.locator("summary").filter({ hasText: "削除したステップ" });
await say("「**削除したステップ**」には、消したステップが残っています。ここから、あとで元に戻すこともできます。", {
  spots: [await spot(retr, { tag: "削除したステップ", tagAt: "above" })],
});
await clear();
await click(retr);
await sleep(900);
await stage("cursorHide");
await say("このように一覧で表示され、「元に戻す」を押すと図に復活します。消してしまっても慌てなくて大丈夫です。", { extra: 300 });
await retr.evaluate((el) => (el.parentElement.open = false));
await sleep(500);
await say("画面の右下では、明るい画面と暗い画面を切り替えられます。見やすいほうをお使いください。", {
  spots: [await spot(app.getByRole("switch", { name: "ダークモード" }), { tag: "ライト／ダーク", tagAt: "above" })],
});
await clear();

// まとめ
await stage("chapter", "まとめ", "おつかれさまでした", 100);
await stage("card", `<div class="eyebrow">まとめ</div><h2>Flowline の使い方の流れ</h2>
<div class="flow"><div><b>描く</b><small>登場人物と<br>ステップを並べる</small></div><i>→</i><div><b>再生</b><small>流れが合っているか<br>チームで確かめる</small></div><i>→</i><div><b>点検</b><small>抜けを見つけて<br>図を直す</small></div><i>→</i><div><b>文書にする</b><small>業務分掌を作り、<br>書き出す</small></div></div>`);
await sleep(600);
await say("Flowline の流れは「**描く → 再生 → 点検 → 文書にする**」です。一度で完成させず、この順番を何度かくり返して図を育てていきましょう。");
await say("図は**自動で保存**され、間違えても「**元に戻す**」で戻せます。消したステップも、あとから戻せます。");
await say("まずはサンプルの図を「**コピー**」して、番号を押したり、名前を変えたりしてみてください。おつかれさまでした。", { extra: 1200 });
await showCap("");
captions.pop();
const endT = clock() - t0;
if (session) {
  await new Promise((f) => setTimeout(f, 500));
  await session.send("Page.stopScreencast");
}
await browser.close();
writeFileSync(`captions-${VIDEO}.json`, JSON.stringify({ captions, end: endT, t0Wall, frames: frames.map((f) => ({ ...f, ts: f.ts })) }, null, 1));
console.log(`captions=${captions.length} end=${(endT / 1000).toFixed(1)}s frames=${frames.length} shots=${shot}`);
