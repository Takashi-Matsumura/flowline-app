// ── 本編（第2回）──
const list = await (await fetch(`${BASE}/api/diagrams`)).json();
for (const d of list.diagrams) if (d.slug !== slug) await fetch(`${BASE}/api/diagrams/${d.slug}`, { method: "DELETE" });

await app.goto(`${BASE}/`);
await app.getByText("保存済みの図").waitFor();
await stage("chapter", "はじめに", "この動画について", 0);
await stage("card", `<div class="eyebrow">アプリをご利用のみなさまへ</div><h1>Flowline はじめてガイド</h1><p>業務フロー図を描いてみよう ─ 新規作成の手順と、シーケンス図の基本</p>`);
await new Promise((f) => setTimeout(f, 900));
if (session) {
  await session.send("Page.startScreencast", { format: "jpeg", quality: 95, everyNthFrame: 1, maxWidth: STAGE_W, maxHeight: STAGE_H });
  await new Promise((f) => setTimeout(f, 300));
}
t0 = clock();
const t0Wall = Date.now() / 1000;

/** 字幕を出して操作を行い、読む時間に足りなければ残りを待つ */
async function act(text, fn, { spots } = {}) {
  if (spots !== undefined) await stage("spots", spots);
  await showCap(text);
  const s = clock();
  await fn();
  await sleep(Math.max(0, holdFor(text) - (clock() - s)));
  if (FAST) await snap();
}
const typeIn = async (loc, text, delay = 95) => {
  await click(loc, { pause: 200, ms: 650 });
  await sleep(250);
  await page.keyboard.type(text, { delay: FAST ? 0 : delay });
  await sleep(350);
};
/** セレクトを選ぶ（カーソルを動かしてから値を変える） */
const choose = async (sel, label) => {
  const c = await moveTo(sel, 600);
  await sleep(200);
  await stage("ripple", c.x, c.y);
  await sel.selectOption({ label });
  await sleep(600);
};
const label = (t) => app.locator("svg .messageText").filter({ hasText: t }).first();
const addPanel = app.getByRole("complementary", { name: "ステップの追加" });
const editPanel = app.getByRole("complementary", { name: "ステップの編集" });
const branchPanel = app.getByRole("complementary", { name: "分岐の追加" });
const stepName = addPanel.getByLabel("ステップの名前");
const fromSel = addPanel.locator("select").nth(0);
const toSel = addPanel.locator("select").nth(1);
const artifact = addPanel.getByPlaceholder("なし（書類・データ）");
const arrowBtn = (t) => editPanel.getByRole("radio", { name: t });
const closeEdit = async () => { await click(editPanel.getByRole("button", { name: "閉じる" }), { ms: 500 }); await sleep(500); await stage("cursorHide"); };

await say("Flowline で、**新しい業務フロー図**を描く手順を説明します。今回は、白紙の状態から 1 枚の図を完成させます。");
await say("Flowline の図は、**UML のシーケンス図**という世界共通の書き方がもとになっています。その考え方も、途中で少しずつ紹介します。");
await stage("card", `<div class="eyebrow">この動画でわかること</div><h2>白紙から 1 枚の図を完成させます</h2><ol>
<li><span>1</span>シーケンス図の考え方</li><li><span>2</span>描く前の整理と、登場人物の登録</li><li><span>3</span>ステップの書き方と、矢印の使い分け</li><li><span>4</span>くり返しと場合分けの枠、仕上げ</li></ol>`);
await say("この動画に音声はありません。実際にアプリを開いて、**動画を止めながら一緒に操作**するのもおすすめです。");
await say("今回の題材は、**経費精算業務**です。説明のために作った架空の例なので、みなさんの実際の手順とは異なります。");

// 第1章
await chapter("シーケンス図とは");
await sleep(1500);
await stage("card", `<div class="eyebrow">第1章　シーケンス図とは</div><h2>UML のシーケンス図</h2>
<p>UML は、仕事やシステムの仕組みを図で表すための、世界共通の書き方です。<br>その中のシーケンス図は、<b>誰と誰が、どの順番でやり取りするか</b>を表します。</p>`);
await say("**UML** は、仕事やシステムの仕組みを図で表すための、世界共通の書き方です。もともとはソフトウェアの設計で広まりました。");
await say("その中の**シーケンス図**は、「誰と誰が、どの順番でやり取りするか」を表す図です。シーケンスは「順序」という意味です。");
await stage("card", `<div class="eyebrow">第1章　シーケンス図とは</div><h2>読み方は 2 つだけ</h2>
<div class="uml"><svg viewBox="0 0 900 400" width="900" height="400" font-family="Hiragino Sans" font-size="24">
<g fill="#ede9fe" stroke="#7c3aed" stroke-width="2"><rect x="60" y="10" width="170" height="60" rx="6"/><rect x="365" y="10" width="170" height="60" rx="6"/><rect x="670" y="10" width="170" height="60" rx="6"/></g>
<g text-anchor="middle" fill="#0f172a"><text x="145" y="50">社員</text><text x="450" y="50">上長</text><text x="755" y="50">経理部</text></g>
<g stroke="#7c3aed" stroke-width="2"><line x1="145" y1="70" x2="145" y2="390"/><line x1="450" y1="70" x2="450" y2="390"/><line x1="755" y1="70" x2="755" y2="390"/></g>
<g stroke="#0f172a" stroke-width="2.5" fill="#0f172a"><line x1="145" y1="150" x2="436" y2="150"/><path d="M450 150l-18-9v18z"/><line x1="450" y1="270" x2="741" y2="270"/><path d="M755 270l-18-9v18z"/></g>
<g text-anchor="middle" fill="#0f172a"><text x="297" y="134">① 提出する</text><text x="602" y="254">② 回す</text></g></svg>
<div class="uml-notes"><p><b>横：登場人物</b><br>上に人や部署を並べ、下へ線を伸ばします</p><p><b>縦：時間</b><br>上から下へ、時間が流れます</p></div></div>`);
await say("読み方は 2 つだけです。**横に登場人物**を並べ、**縦に時間**が流れます。上にあるやり取りほど、先に起きたことです。");
await stage("card", `<div class="eyebrow">第1章　シーケンス図とは</div><h2>UML の言葉と、Flowline の言葉</h2>
<table class="map"><tr><th>UML の言葉</th><th>Flowline の言葉</th><th>意味</th></tr>
<tr><td>ライフライン</td><td>登場人物</td><td>業務に関わる人・部署・システムと、下へ伸びる線</td></tr>
<tr><td>メッセージ</td><td>ステップ（矢印）</td><td>誰かから誰かへの、仕事の受け渡し</td></tr>
<tr><td>組み合わせフラグメント</td><td>分岐の枠</td><td>場合分けやくり返しを囲む枠</td></tr></table>`);
await say("UML の専門用語を覚える必要はありません。「**ライフライン**」は登場人物、「**メッセージ**」はステップ、と読み替えられることだけ知っておきましょう。", { extra: 800 });

// 第2章
await chapter("描く前に整理する");
await sleep(1500);
await stage("card", `<div class="eyebrow">第2章　描く前に整理する</div><h2>まず 4 つを書き出します</h2><ol>
<li><span>1</span>業務の名前 … 経費精算業務</li><li><span>2</span>始まりと終わり … 社員が提出して、経理部で完了</li><li><span>3</span>関わる人・部署・システム … 社員、上長、経理部、会計システム</li><li><span>4</span>順番 … 誰が、誰に、何をするか</li></ol>`);
await say("いきなりアプリを開く前に、メモでよいので **4 つのこと**を書き出すと、迷わず描けます。");
await say("特に大切なのは「**始まりと終わり**」です。どこから始まり、どこで完了する業務なのかを決めると、図に描く範囲がはっきりします。");
await say("今回は、社員が精算書を提出するところから、経理部が会計システムへの登録を終えるところまでを描きます。");
await say("すべてを正確に思い出せなくても大丈夫です。わからないところは、あとから「仮」として印を付けられます。");

// 第3章
await chapter("図の作成と登場人物");
await sleep(1500);
await hideCard();
const titleInput = app.getByPlaceholder("例: 月次請求書発行業務");
await act("一覧画面の「業務名」に、図の名前を入れます。ここでは「**経費精算業務**」と入力します。", async () => {
  await typeIn(titleInput, "経費精算業務");
}, { spots: [await spot([titleInput, btn("作成して開く")], { tag: "業務名" })] });
await clear();
await act("「作成して開く」を押すと、白紙の図が開きます。", async () => {
  await click(btn("作成して開く"));
  await app.getByText("まだ図がありません").waitFor();
  await sleep(800);
  await stage("cursorHide");
});
const actorBtn = app.getByRole("button", { name: /登場人物/ }).first();
await say("最初にやることは、**登場人物の登録**です。左上の青く光る丸いボタンを押します。", {
  spots: [await spot(actorBtn, { pad: 6, tag: "登場人物を登録", tagAt: "below" })],
});
await clear();
await click(actorBtn);
await sleep(800);
await stage("cursorHide");
const dlgA = app.getByRole("dialog", { name: "登場人物の編集" });
const addInput = dlgA.getByLabel(/登場人物を追加/);
await say("登場人物を登録する画面です。シーケンス図の**ライフライン**にあたるものを、ここで並べていきます。");
await say("ポイントは、**業務が流れる順に、左から並べる**ことです。矢印が左から右へ流れて、読みやすい図になります。");
await act("名前は「、」で区切ると、まとめて入力できます。社員、上長、経理部、会計システムの順に入力します。", async () => {
  await typeIn(addInput, "社員、上長、経理部、会計システム、", 110);
  await sleep(500);
});
await say("入力した順にカードが並びました。順番はドラッグで入れ替えられます。カードを押すと、詳しい設定が開きます。", {
  spots: [await spot(dlgA.locator("ol").first(), { pad: 2 })],
});
await clear();
await click(dlgA.getByRole("button", { name: /人目: 会計システム/ }));
await sleep(700);
await say("登場人物には**種別**があります。部署、個人、システム、社外の 4 つです。新しいカードは「部署」になっています。", {
  spots: [await spot(dlgA.getByRole("button", { name: "社外", exact: true }).locator(".."), { pad: 6, tag: "種別", tagAt: "below" })],
});
await clear();
await act("会計システムは、種別を「**システム**」に変えます。図では、部署や個人は人の形、システムや社外は四角で描かれます。", async () => {
  await click(dlgA.getByRole("button", { name: "システム", exact: true }), { ms: 600 });
});
await act("製品名がある場合は、ここに書くと図の名前の下に添えられます。今回は「TOMAS」と入れておきます。", async () => {
  await typeIn(dlgA.getByLabel(/製品・サービス名/), "TOMAS");
});
await say("個人の名前は、列にせず**部署のメンバー**として書くのがおすすめです。人が替わっても、図を直さずに済みます。");
await click(dlgA.getByRole("group", { name: /の設定/ }).getByRole("button", { name: "閉じる" }), { ms: 600 });
await sleep(600);
const roleSel = (r) => dlgA.locator("label").filter({ hasText: new RegExp(`^${r}`) }).locator("select");
await say("次に、「**起点**」と「**終点**」を決めます。起点は業務を始める人、終点は最終的な成果を受け取る人です。", {
  spots: [await spot([roleSel("起点"), roleSel("終点")], { pad: 10, tag: "起点と終点", tagAt: "above" })],
});
await clear();
await act("起点は「社員」を選びます。", () => choose(roleSel("起点"), "社員"));
await act("終点は「経理部」を選びます。ここで選んだ終点の部署が、図の中心として強調されます。", () => choose(roleSel("終点"), "経理部"));
await act("「保存」を押すと、図に反映されます。", async () => {
  await click(dlgA.getByRole("button", { name: "保存" }));
  await app.locator("svg rect.actor-top").first().waitFor();
  await sleep(1000);
  await stage("cursorHide");
});
await say("登場人物が並びました。社員、上長、経理部は人の形、会計システムは四角です。上下をつなぐ線が**ライフライン**です。");
await say("上と下に同じ名前が出ていますが、下は線の終わりの印で、登場人物が 2 人いるわけではありません。ステップが増えると、線が伸びていきます。");

// 第4章
await chapter("ステップを書く");
await sleep(1500);
await stage("card", `<div class="eyebrow">第4章　ステップを書く</div><h2>1 つのステップは「誰が・誰に・何を」</h2><ol>
<li><span>1</span>名前は「何をどうする」まで書く … ×「提出」 ○「経費精算書を提出する」</li><li><span>2</span>1 ステップに 1 つの動作 … 「確認して登録する」は 2 つに分ける</li><li><span>3</span>書類やデータは「渡すもの」に書く</li></ol>`);
await say("ステップは、シーケンス図の**メッセージ**にあたります。「誰が、誰に、何をするか」を 1 つずつ書きます。");
await say("コツは 3 つです。名前は「何をどうする」まで書く、1 ステップに 1 つの動作、書類やデータは「渡すもの」に書く、です。", { extra: 800 });
await hideCard();
await act("では、最初のステップです。「**ステップを追加**」を押すと、右側に入力欄が開きます。", async () => {
  await click(btn("ステップを追加", { exact: true }));
  await sleep(900);
  await stage("cursorHide");
});
await act("名前を入力します。「経費精算書を提出する」と書きます。", () => typeIn(stepName, "経費精算書を提出する"));
await say("「誰が（送り手）」と「誰に（受け手）」を確認します。今回は最初から、社員から上長へ、となっています。", {
  spots: [await spot([fromSel, toSel], { pad: 8 })],
});
await say("その下の小さな帯は、図の中での向きを示す見本です。**青い塗りが送り手**で、枠で囲まれたほうが受け手です。", {
  spots: [await spot(addPanel.getByRole("img"), { pad: 6 })],
});
await clear();
await act("「渡すもの」には、受け渡す書類やデータを書きます。ここに書くと、図に黄色い帯で表示されます。", () => typeIn(artifact, "経費精算書"));
const again = addPanel.getByRole("button", { name: "続けて追加" });
await say("追加ボタンは 2 つあります。「**続けて追加**」は、受け手を次の送り手にして、すぐ次のステップを書ける便利なボタンです。", {
  spots: [await spot(again, { pad: 8, tag: "続けて追加", tagAt: "above" })],
});
await clear();
await act("流れは人から人へ渡っていくので、「続けて追加」を使うと入力が楽になります。押してみましょう。", async () => {
  await click(again);
  await label("経費精算書を提出する").waitFor();
  await sleep(900);
  await stage("cursorHide");
});
await say("図に**ステップ 1** が現れました。黒丸の番号は自動で付きます。送り手も「上長」に切り替わっています。", {
  spots: [await spot([num(1), label("経費精算書を提出する")], { pad: 12 }), await spot(fromSel, { pad: 6 })],
});
await clear();
await act("次は、上長が内容を確認します。これは誰かに渡す仕事ではなく、**上長の中で完結する作業**です。", () => typeIn(stepName, "内容を確認する"));
await act("このような作業は、「誰に」でも**自分と同じ人**を選びます。UML では「自己メッセージ」と呼びます。", () => choose(toSel, "上長（自分）"));
await act("「続けて追加」を押すと、自分に戻ってくる矢印が描かれます。", async () => {
  await click(again);
  await label("内容を確認する").waitFor();
  await sleep(900);
  await stage("cursorHide");
});
await act("次は上長から経理部へ回します。「承認して経理部へ回す」と書き、受け手を経理部にします。", async () => {
  await typeIn(stepName, "承認して経理部へ回す", 80);
  await choose(toSel, "経理部");
  await typeIn(artifact, "経費精算書", 80);
});
await act("同じように「続けて追加」を押します。", async () => {
  await click(again);
  await label("承認して経理部へ回す").waitFor();
  await sleep(800);
  await stage("cursorHide");
});
await act("経理部が支払方法を確認する作業です。受け手は経理部（自分）にします。", async () => {
  await typeIn(stepName, "支払方法を確認する", 80);
  await choose(toSel, "経理部（自分）");
  await click(again);
  await label("支払方法を確認する").waitFor();
  await sleep(800);
  await stage("cursorHide");
});
await act("次は、会計システムへの登録です。受け手を会計システムにし、渡すものに「仕訳データ」と書きます。", async () => {
  await typeIn(stepName, "仕訳データを登録する", 80);
  await choose(toSel, "会計システム");
  await typeIn(artifact, "仕訳データ", 80);
  await click(again);
  await label("仕訳データを登録する").waitFor();
  await sleep(800);
  await stage("cursorHide");
});
await act("最後は、会計システムから経理部へ、登録が終わったことを返します。送り手はもう会計システムになっています。", async () => {
  await typeIn(stepName, "登録の完了を返す", 80);
  await choose(toSel, "経理部");
  await sleep(300);
});
const addBtn = addPanel.getByRole("button", { name: "追加", exact: true });
await act("今回はこれで最後なので、青い「**追加**」を押します。", async () => {
  await click(addBtn);
  await label("登録の完了を返す").waitFor();
  await sleep(1000);
  await stage("cursorHide");
});
await say("6 つのステップが並びました。「追加」で閉じると、今足したステップの編集画面が開きます。", {});

// 第5章
await chapter("矢印の種類");
await sleep(1500);
const arrowRow = (x, y, kind) => {
  const tip = x + 320;
  const line = `<line x1="${x}" y1="${y}" x2="${kind === "async" ? tip : tip - 26}" y2="${y}" stroke="#0f172a" stroke-width="3" ${kind === "reply" ? 'stroke-dasharray="11 8"' : ""}/>`;
  const head = kind === "async"
    ? `<path d="M${tip - 30} ${y - 18}L${tip} ${y}L${tip - 30} ${y + 18}" fill="none" stroke="#0f172a" stroke-width="3.5"/>`
    : `<path d="M${tip} ${y}l-32-17v34z" fill="#0f172a"/>`;
  return line + head;
};
await stage("card", `<div class="eyebrow">第5章　矢印の種類</div><h2>矢印の形で「やり取りの性質」を表します</h2>
<table class="map arrows"><tr><th>Flowline</th><th>矢印の形</th><th>UML の言葉</th><th>意味</th></tr>
<tr><td>依頼</td><td><svg width="360" height="44">${arrowRow(10, 22, "sync")}</svg></td><td>同期メッセージ</td><td>頼んで、返事や結果を待つ</td></tr>
<tr><td>通知</td><td><svg width="360" height="44">${arrowRow(10, 22, "async")}</svg></td><td>非同期メッセージ</td><td>送るだけで、返事は待たない</td></tr>
<tr><td>返答</td><td><svg width="360" height="44">${arrowRow(10, 22, "reply")}</svg></td><td>応答メッセージ</td><td>頼まれたことへの返事を返す</td></tr></table>`);
await say("シーケンス図では、矢印の形で**やり取りの性質**を表します。Flowline には「依頼」「通知」「返答」の 3 種類があります。");
await say("「**依頼**」は、頼んで返事を待つやり取りです。電話で問い合わせて、答えを待っている様子をイメージしてください。");
await say("「**通知**」は、送るだけのやり取りです。メールで送って、自分は次の仕事へ進む様子です。矢じりが開いた形をしています。");
await say("「**返答**」は、依頼への返事です。**点線**で描きます。「依頼」と「返答」は、ふつう組になります。");
await say("正確さより、**実際の仕事に近いもの**を選ぶことが大切です。迷ったら「相手の返事を待つかどうか」で考えましょう。");
await hideCard();
await say("新しいステップは「依頼」になっています。今のステップ 6 は依頼への返事なので、矢印の欄で「返答」に変えます。", {
  spots: [await spot(arrowBtn("返答").locator(".."), { pad: 8, tag: "矢印の種類", tagAt: "below" })],
});
await clear();
await act("「返答」を押すと、図の矢印が**点線**に変わりました。", async () => {
  await click(arrowBtn("返答"));
  await sleep(1200);
  await stage("cursorHide");
});
await act("次に、ステップ 1 の番号を押します。精算書は提出したら終わりで、返事を待たないので「通知」に変えます。", async () => {
  await scrollToStep(1, 200);
  await click(num(1));
  await sleep(800);
  await click(arrowBtn("通知"));
  await sleep(1000);
  await stage("cursorHide");
});
await act("ステップ 3 も、回して終わりなので同じように「通知」にします。", async () => {
  await click(num(3));
  await sleep(800);
  await click(arrowBtn("通知"));
  await sleep(1000);
  await stage("cursorHide");
});
await closeEdit();

// 第6章
await chapter("途中にステップを入れる");
await sleep(1500);
await hideCard();
await say("描いている途中で、「手順が抜けていた」と気づくことはよくあります。経理部が領収書を照合する手順を、途中に入れてみましょう。");
await act("ステップを入れたい位置の**1 つ前の番号**を押します。ここではステップ 3 を選びます。", async () => {
  await click(num(3));
  await sleep(900);
  await stage("cursorHide");
});
await act("その状態で「ステップを追加」を押すと、「**3 番の後に入れます**」と表示されます。", async () => {
  await click(btn("ステップを追加", { exact: true }));
  await sleep(900);
  await stage("cursorHide");
});
await act("名前を書き、誰が・誰にを、どちらも経理部にします。", async () => {
  await typeIn(stepName, "領収書と金額を照合する", 80);
  await choose(fromSel, "経理部");
  await choose(toSel, "経理部（自分）");
});
await act("「追加」を押すと、ステップ 4 として入り、後ろの番号は**自動で振り直されます**。", async () => {
  await click(addBtn);
  await label("領収書と金額を照合する").waitFor();
  await sleep(1000);
  await stage("cursorHide");
});
const upBtn = editPanel.getByRole("button", { name: "前へ" });
await say("順番を変えたいときは、図の番号やステップ名をドラッグするか、下の ↑ ↓ のボタンを使います。", {
  spots: [await spot([upBtn, editPanel.getByRole("button", { name: "後へ" })], { pad: 8, tag: "順番", tagAt: "above" })],
});
await clear();
await closeEdit();

// 第7章
await chapter("くり返しの枠（loop）");
await sleep(1500);
await stage("card", `<div class="eyebrow">第7章・第8章　枠の使い方</div><h2>枠で「条件」を表します</h2>
<table class="map"><tr><th>図の札</th><th>Flowline のボタン</th><th>意味</th></tr>
<tr><td>loop</td><td>〜の間くり返す</td><td>条件を満たすまで、中をくり返す</td></tr>
<tr><td>alt</td><td>もし〜なら（場合分け）</td><td>条件によって、どれか 1 つの流れに進む</td></tr>
<tr><td>opt</td><td>〜のときだけやる</td><td>条件に合うときだけ、中を行う</td></tr></table>`);
await say("業務は一本道とは限りません。UML では、条件のある流れを**枠**で囲みます。「組み合わせフラグメント」と呼ばれるものです。");
await say("Flowline の枠は 3 種類です。枠の左上の **loop、alt、opt** という札が種類を、[ ] の中の文が条件を表します。", { extra: 800 });
await hideCard();
await say("経費精算では、内容に不備があれば差し戻されて、直して出し直す、というくり返しがあります。これを **loop** で描きます。");
await act("くり返しは、確認のあとに起きます。枠を作りたい位置の 1 つ前、ステップ 2 の番号を押します。", async () => {
  await click(num(2));
  await sleep(900);
  await stage("cursorHide");
});
await act("「**分岐を追加**」を押すと、「2 番の後に作ります」と表示されます。", async () => {
  await click(btn("分岐を追加", { exact: true }));
  await sleep(900);
  await stage("cursorHide");
});
const kindRadio = (t) => branchPanel.locator("label").filter({ hasText: t });
await act("「どんな分岐ですか？」で「**〜の間くり返す**」を選びます。", async () => {
  await click(kindRadio("の間くり返す"));
  await sleep(700);
  await stage("cursorHide");
});
const cond1 = branchPanel.getByLabel("1 つ目の条件");
await act("条件に「不備がなくなるまで」と入力します。", () => typeIn(cond1, "不備がなくなるまで"));
await act("「分岐を作る」を押します。枠には、まだ中身がありません。**先に枠を作り、あとから中にステップを足す**のが Flowline の手順です。", async () => {
  await click(branchPanel.getByRole("button", { name: "分岐を作る" }));
  await sleep(1200);
  await stage("cursorHide");
}, {});
await say("右の欄の上に「［不備がなくなるまで］の中に入れます」と表示されています。このまま書くと、枠の中に入ります。", {
  spots: [await spot(addPanel.getByText(/の中に入れます/), { pad: 8 })],
});
await clear();
await act("上長から社員へ、差し戻すステップを書きます。", async () => {
  await typeIn(stepName, "不備を伝えて差し戻す", 80);
  await choose(fromSel, "上長");
  await choose(toSel, "社員");
  await typeIn(artifact, "不備の内容", 80);
});
await act("「続けて追加」を押して、社員が直して出し直すステップを続けます。受け手は上長です。", async () => {
  await click(again);
  await label("不備を伝えて差し戻す").waitFor();
  await sleep(900);
  await typeIn(stepName, "修正して再提出する", 80);
  await choose(toSel, "上長");
  await typeIn(artifact, "修正した経費精算書", 70);
});
await act("「追加」を押します。loop の枠の中に、2 つのステップが入りました。", async () => {
  await click(addBtn);
  await label("修正して再提出する").waitFor();
  await sleep(1000);
  await stage("cursorHide");
  await scrollToStep(2, 180);
});
await closeEdit();
await act("差し戻しと再提出も、送って終わりのやり取りなので、番号を押して矢印を「**通知**」に変えておきます。", async () => {
  for (const n of [3, 4]) {
    await click(num(n), { ms: 450, pause: 150 });
    await sleep(500);
    await click(arrowBtn("通知"), { ms: 450, pause: 150 });
    await sleep(500);
  }
});
await closeEdit();

// 第8章
await chapter("場合分けの枠（alt）");
await sleep(1500);
await hideCard();
await scrollDiagram(0);
await say("次は、支払方法で流れが分かれる場面を描きます。銀行振込なら銀行に依頼し、現金なら社員に渡す、という**場合分け**です。");
await say("ところで、**銀行**がまだ登場人物にいません。描いている途中で足りない人に気づいたら、いつでも足せます。");
await act("丸いボタン「登場人物を編集」を押して、「銀行」と入力します。", async () => {
  await click(actorBtn);
  await sleep(800);
  await typeIn(addInput, "銀行、", 120);
  await sleep(500);
});
await act("カードを押して、種別を「**社外**」にします。", async () => {
  await click(dlgA.getByRole("button", { name: /人目: 銀行/ }));
  await sleep(700);
  await click(dlgA.getByRole("button", { name: "社外", exact: true }), { ms: 600 });
  await sleep(500);
});
await act("「保存」を押すと、図の右端に銀行が加わります。", async () => {
  await click(dlgA.getByRole("group", { name: /の設定/ }).getByRole("button", { name: "閉じる" }), { ms: 500 });
  await sleep(400);
  await click(dlgA.getByRole("button", { name: "保存" }), { ms: 600 });
  await sleep(1200);
  await stage("cursorHide");
});
await act("場合分けは「支払方法を確認する」の結果で変わります。このステップの番号を押します。", async () => {
  await scrollToStep(7, 260);
  await click(num(7));
  await sleep(900);
  await stage("cursorHide");
});
await act("「分岐を追加」を押します。今度は最初から「**もし〜なら（場合分け）**」が選ばれています。", async () => {
  await click(btn("分岐を追加", { exact: true }));
  await sleep(900);
  await stage("cursorHide");
});
await say("条件の欄には、「支払方法を確認する」の結果：と、書き出しが自動で入っています。直前のステップの結果で分かれることが多いためです。", {
  spots: [await spot([branchPanel.getByLabel("1 つ目の条件"), branchPanel.getByLabel("2 つ目の条件")], { pad: 8 })],
});
await clear();
const cond2 = branchPanel.getByLabel("2 つ目の条件");
const caretEnd = (l) => l.evaluate((el) => el.setSelectionRange(el.value.length, el.value.length));
await act("続きを書き足します。1 つ目は「銀行振込」、2 つ目は「現金」です。", async () => {
  await click(cond1, { pause: 200, ms: 600 });
  await caretEnd(cond1);
  await page.keyboard.type("銀行振込", { delay: FAST ? 0 : 110 });
  await sleep(400);
  await click(cond2, { pause: 200, ms: 600 });
  await caretEnd(cond2);
  await page.keyboard.type("現金", { delay: FAST ? 0 : 110 });
  await sleep(400);
});
await say("3 つ以上に分かれるときは「＋ 場合を足す」を押します。条件は、**もれなく、重ならないように**書くのがコツです。", {
  spots: [await spot(branchPanel.getByRole("button", { name: "＋ 場合を足す" }), { pad: 8 })],
});
await clear();
await act("「分岐を作る」を押します。alt の枠が、点線で 2 つの部屋に分かれました。", async () => {
  await click(branchPanel.getByRole("button", { name: "分岐を作る" }));
  await sleep(1200);
  await stage("cursorHide");
});
await act("まず銀行振込の場合です。経理部から銀行へ、振込を依頼します。", async () => {
  await typeIn(stepName, "振込を依頼する", 80);
  await choose(fromSel, "経理部");
  await choose(toSel, "銀行");
  await typeIn(artifact, "振込データ", 80);
});
await act("「追加」を押します。", async () => {
  await click(addBtn);
  await label("振込を依頼する").waitFor();
  await sleep(1000);
  await stage("cursorHide");
  await click(arrowBtn("通知"));
  await sleep(600);
  await stage("cursorHide");
});
await closeEdit();
const ph = app.locator("[data-placeholder]").first();
await ph.scrollIntoViewIfNeeded();
await sleep(600);
await say("もう一方の部屋には「**＋ ここにステップを追加**」と表示されています。まだ中身のない場合の目印です。これを押します。", {
  spots: [await spot(ph, { pad: 8 })],
});
await clear();
await click(ph);
await sleep(900);
await stage("cursorHide");
await act("現金の場合です。経理部から社員へ、現金を渡します。", async () => {
  await typeIn(stepName, "現金を渡す", 80);
  await choose(fromSel, "経理部");
  await choose(toSel, "社員");
  await typeIn(artifact, "現金", 80);
});
await act("「追加」を押して、矢印を「通知」にします。これで、2 つの場合がそろいました。", async () => {
  await click(addBtn);
  await label("現金を渡す").waitFor();
  await sleep(1000);
  await click(arrowBtn("通知"));
  await sleep(800);
  await stage("cursorHide");
});
await closeEdit();
await say("ここでは使いませんが、「**〜のときだけやる**」（opt）は、「10 万円を超えるときだけ部長が承認する」のように、やる・やらないが分かれる場面で使います。");

// 第9章
await chapter("仕上げ");
await sleep(1500);
await hideCard();
await act("「領収書と金額を照合する」は、やり方がまだ確かではないとします。番号を押して、状態の欄を見ます。", async () => {
  await scrollToStep(6, 220);
  await click(num(6));
  await sleep(900);
  await stage("cursorHide");
  await editPanel.getByRole("button", { name: "仮", exact: true }).scrollIntoViewIfNeeded();
  await sleep(500);
});
await act("「**仮**」を押すと、ステップが点線になります。「まだ確かめが必要」という印です。わからない手順は、空けずに仮で書きましょう。", async () => {
  await click(editPanel.getByRole("button", { name: "仮", exact: true }));
  await sleep(1000);
  await stage("cursorHide");
});
const noteInput = editPanel.getByPlaceholder(/何があれば/);
await noteInput.scrollIntoViewIfNeeded();
await act("チームで決めたいことは**付箋**に書きます。「金額が合わないときの対応は？」と入力して、「貼る」を押します。", async () => {
  await typeIn(noteInput, "金額が合わないときの対応は？", 80);
  await click(editPanel.getByRole("button", { name: "貼る" }), { ms: 500 });
  await sleep(1000);
  await stage("cursorHide");
});
await say("図のステップの横に、黄色い「?」が付きました。答えが決まったら、付箋に書くと「決まりごと」になります。");
await act("確かめ終えたら「確定」に戻すと、実線になります。今回は確定に戻しておきます。", async () => {
  await editPanel.getByRole("button", { name: "確定", exact: true }).scrollIntoViewIfNeeded();
  await click(editPanel.getByRole("button", { name: "確定", exact: true }));
  await sleep(1000);
  await stage("cursorHide");
});
await closeEdit();
await scrollDiagram(0, 900);
await act("図が完成しました。全体を上から見直してみましょう。", async () => {
  await sleep(1200);
  const h = await app.evaluate(() => { let el = document.querySelector("svg .messageText"); while (el && !(el.scrollHeight > el.clientHeight + 4 && getComputedStyle(el).overflowY !== "visible")) el = el.parentElement; return el ? el.scrollHeight : 0; });
  await scrollDiagram(h, FAST ? 1 : 9000);
  await sleep(1000);
});
await say("図が長くなったら、右上の「**全体を表示**」が便利です。押すと、図全体が画面に収まります。", {
  spots: [await spot(btn(/全体を表示/), { pad: 8, tag: "全体を表示", tagAt: "below" })],
});
await clear();
await click(btn(/全体を表示/));
await sleep(1200);
await stage("cursorHide");
await say("細かいところは、⌘（Windows では Ctrl）を押しながらスクロールすると拡大・縮小できます。倍率のボタンを押すと、元の幅に戻ります。", {
  spots: [await spot(app.getByRole("button", { name: /^\d+%$/ }), { pad: 8, tag: "倍率（押すと幅に合わせる）", tagAt: "below" })],
  extra: 600,
});
await clear();
await click(app.getByRole("button", { name: /^\d+%$/ }));
await sleep(800);
await stage("cursorHide");
await stage("card", `<div class="eyebrow">第9章　仕上げ</div><h2>見直しの 4 つのポイント</h2><ol>
<li><span>1</span>起点から始まり、終点まで届いているか</li><li><span>2</span>受け渡しが途切れていないか（受け取った人が次を行っているか）</li><li><span>3</span>ステップの名前だけで、何をするか伝わるか</li><li><span>4</span>差し戻しのあとの流れが描かれているか</li></ol>`);
await scrollDiagram(0, 100);
await say("見直しのポイントは 4 つです。特に「**受け渡しが途切れていないか**」は、番号を順に指で追うと確かめられます。", { extra: 1500 });
await say("確認には「**フローの再生**」と「**フローを点検**」が使えます。使い方は、第 1 回の動画「アプリの概要」で紹介しています。");

// まとめ
await stage("cursorHide");
await stage("chapter", "まとめ", "おつかれさまでした", 100);
await showCap("");
await stage("card", `<div class="eyebrow">まとめ</div><h2>業務フロー図を描く手順</h2>
<div class="flow"><div><b>1 整理</b><small>始まりと終わり、<br>関わる人を書き出す</small></div><i>→</i><div><b>2 登場人物</b><small>流れの順に左から並べ、<br>起点・終点を決める</small></div><i>→</i><div><b>3 ステップ</b><small>誰が・誰に・何を<br>を順に書く</small></div><i>→</i><div><b>4 枠と仕上げ</b><small>くり返し・場合分け、<br>仮と付箋</small></div></div>`);
await sleep(700);
await say("業務フロー図は「**整理 → 登場人物 → ステップ → 枠と仕上げ**」の順に描きます。まず一本道を描いてから、枠を足すと迷いません。");
await say("最初から完璧を目指さなくて大丈夫です。わからないところは「仮」や「付箋」にして、**チームで話し合いながら**育てていきましょう。");
await say("まずは、みなさんの身近な業務で、短い図を 1 枚描いてみてください。おつかれさまでした。", { extra: 1500 });
await showCap("");
captions.pop();
const endT = clock() - t0;
if (session) {
  await new Promise((f) => setTimeout(f, 500));
  await session.send("Page.stopScreencast");
}
if (FAST) {
  // 確認用: 完成した図の点検結果（規則のみ）を見る
  await hideCard();
  await btn("フローを点検").click();
  await new Promise((f) => setTimeout(f, 800));
  const r = app.getByRole("complementary", { name: "フローの点検" });
  console.log("RULES:", await r.getByText(/図の点検（/).textContent());
  const cards = r.locator("article").filter({ hasNot: app.locator("xxx") });
  for (const t of await cards.locator("p.font-medium").allTextContents()) console.log(" -", t);
  const m = await (await fetch(`${BASE}/api/diagrams`)).json();
  const d = await (await fetch(`${BASE}/api/diagrams/${m.diagrams.find((x) => x.slug !== slug).slug}`)).json();
  console.log(d.model.branches.map((b) => b.kind + ":" + b.condition).join(" | "));
  const ids = Object.fromEntries(d.model.actors.map((a) => [a.id, a.name]));
  console.log(d.model.steps.filter((x) => x.status !== "retracted").sort((a, b) => a.order - b.order).map((x) => `${ids[x.from]}→${ids[x.to]} ${x.label} [${x.kind}/${x.status}] ${x.artifact ?? ""}`).join("\n"));
}
await browser.close();
writeFileSync(`captions-${VIDEO}.json`, JSON.stringify({ captions, end: endT, t0Wall, frames }, null, 1));
console.log(`captions=${captions.length} end=${(endT / 1000).toFixed(1)}s frames=${frames.length} shots=${shot}`);
