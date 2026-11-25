// ── 本編（第3回）── 枠を組み合わせる（複合フラグメントと入れ子）
// 題材: 見本の図「請求書受領業務（複合フラグメントの見本）」（flowline-app の samples/combined-fragments.json）
const list = await (await fetch(`${BASE}/api/diagrams`)).json();
for (const d of list.diagrams) if (d.slug !== slug) await fetch(`${BASE}/api/diagrams/${d.slug}`, { method: "DELETE" });

await app.goto(`${BASE}/`);
await app.getByText("保存済みの図").waitFor();
await stage("chapter", "はじめに", "この動画について", 0);
await stage("card", `<div class="eyebrow">アプリをご利用のみなさまへ</div><h1>Flowline はじめてガイド</h1><p>枠を組み合わせる ─ 複合フラグメントと入れ子</p>`);
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
const choose = async (sel, label) => {
  const c = await moveTo(sel, 600);
  await sleep(200);
  await stage("ripple", c.x, c.y);
  await sel.selectOption({ label });
  await sleep(600);
};
const label = (t) => app.locator("svg .messageText").filter({ hasText: t }).first();
const frame = (k) => app.locator('svg g[data-et="control-structure"]').nth(k);
const addPanel = app.getByRole("complementary", { name: "ステップの追加" });
const editPanel = app.getByRole("complementary", { name: "ステップの編集" });
const branchPanel = app.getByRole("complementary", { name: "分岐の追加" });
const closeEdit = async () => { await click(editPanel.getByRole("button", { name: "閉じる" }), { ms: 500 }); await sleep(500); await stage("cursorHide"); };

await say("第 3 回は、分岐の**枠を組み合わせる**描き方を説明します。くり返しの中に場合分けを入れる、といった描き方です。");
await stage("card", `<div class="eyebrow">この動画でわかること</div><h2>枠の中に、枠を入れる</h2><ol>
<li><span>1</span>枠のおさらいと、入れ子の考え方</li><li><span>2</span>見本の図を読む</li><li><span>3</span>入れ子の枠を作る</li><li><span>4</span>畳む・再生で確かめる、入れ子のコツ</li></ol>`);
await say("この動画に音声はありません。実際にアプリで見本の図を開いて、**動画を止めながら一緒に見る**のもおすすめです。");
await say("題材は、一覧にある見本の図「**請求書受領業務（複合フラグメントの見本）**」です。第 1 回と同じ請求書の業務を、枠を使って細かく描いたものです。", { extra: 800 });

// 第1章
await chapter("枠のおさらい");
await sleep(1500);
await stage("card", `<div class="eyebrow">第1章　枠のおさらい</div><h2>枠で「条件」を表します</h2>
<table class="map"><tr><th>図の札</th><th>Flowline のボタン</th><th>意味</th></tr>
<tr><td>alt</td><td>もし〜なら（場合分け）</td><td>条件によって、どれか 1 つの流れに進む</td></tr>
<tr><td>opt</td><td>〜のときだけやる</td><td>条件に合うときだけ、中を行う</td></tr>
<tr><td>loop</td><td>〜の間くり返す</td><td>条件を満たす間、中をくり返す</td></tr></table>`);
await say("第 2 回で紹介したとおり、条件のある流れは**枠**で囲みます。UML では「組み合わせフラグメント」や「**複合フラグメント**」と呼びます。", { extra: 600 });
await say("枠の左上の札が種類、[ ] の中が条件です。alt は「どれか 1 つ」、opt は「やるか、やらないか」、loop は「くり返す」でした。", { extra: 600 });
await stage("card", `<div class="eyebrow">第1章　枠のおさらい</div><h2>枠は、組み合わせられます</h2>
<div class="uml"><svg viewBox="0 0 900 430" width="900" height="430" font-family="Hiragino Sans" font-size="24">
<g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-dasharray="7 5"><rect x="10" y="10" width="880" height="410" rx="4"/><rect x="50" y="90" width="800" height="300" rx="4"/><rect x="90" y="170" width="520" height="110" rx="4"/></g>
<line x1="50" y1="300" x2="850" y2="300" stroke="#7c3aed" stroke-width="2" stroke-dasharray="4 4"/>
<g fill="#ede9fe" stroke="#7c3aed" stroke-width="2"><path d="M10 10h90v32l-12 12h-78z"/><path d="M50 90h70v32l-12 12h-58z"/><path d="M90 170h70v32l-12 12h-58z"/></g>
<g fill="#0f172a"><text x="22" y="41">loop</text><text x="66" y="121">alt</text><text x="104" y="201">opt</text>
<text x="130" y="41">［請求書に不備がある］</text><text x="140" y="121">［金額・品目に誤りがある］</text><text x="180" y="201">［支払期日が近い場合］</text>
<text x="80" y="340">［発注書・検収書が足りない］</text></g>
<g fill="#475569" font-size="21"><text x="180" y="250">電話で至急の再発行を頼む</text><text x="120" y="378">発注書・検収書をそろえる</text></g></svg>
<div class="uml-notes"><p><b>外側：loop</b><br>不備がある間くり返す</p><p><b>その中：alt</b><br>不備の種類で分かれる</p><p><b>さらに中：opt</b><br>期日が近いときだけ</p></div></div>`);
await say("実際の業務では、「くり返しの中で、さらに場合が分かれる」ことがよくあります。UML では、**枠の中に枠を入れる**ことができます。", { extra: 600 });
await say("これを「**入れ子**」と呼びます。Flowline でも、枠の中に枠を **3 段まで**作れます。", { extra: 400 });

// 第2章
await chapter("見本の図を読む");
await sleep(1500);
await hideCard();
const link = app.getByRole("link", { name: /複合フラグメントの見本/ });
await act("一覧から、見本の図を開きます。", async () => {
  await click(link);
  await app.locator("svg .messageText").first().waitFor();
  await sleep(1200);
  await stage("cursorHide");
}, { spots: [await spot(link, { pad: 8 })] });
await clear();
await say("見本の図です。枠が **5 つ**あります。上から順に読んでいきましょう。");
await say("最初の **alt** は、請求書の届き方による場合分けです。メールで届いた場合と、郵送で届いた場合に分かれます。", {
  spots: [await spot(frame(0), { pad: 4, tag: "alt：届き方", tagAt: "above" })],
});
await clear();
await scrollToStep(3, 120);
await say("どちらの場合も、枠を出たところで**合流**します。⑤で、総務部から経理部へ請求書が回ります。", {
  spots: [await spot([num(5), label("請求書を経理部に回す")], { pad: 10 })],
});
await clear();
await scrollToStep(7, 260);
await say("次の **loop** は、請求書に不備がある間のくり返しです。経理部が差し戻し、直した請求書が出し直されるまでをくり返します。", {
  spots: [await spot(frame(1), { pad: 4, tag: "loop：不備がある間", tagAt: "above" })],
});
await say("loop の中に、もう 1 つ **alt** があります。不備の種類によって、直し方が変わるからです。", {
  spots: [await spot(frame(2), { pad: 4, tag: "loop の中の alt", tagAt: "above" })],
});
await say("金額・品目に誤りがあれば、取引先に直してもらいます。発注書・検収書が足りなければ、営業担当がそろえます。", {
  spots: [await spot(frame(2), { pad: 4 })],
});
await say("さらにその中に **opt** があります。支払期日が近い場合だけ、営業担当が電話で急いでもらう、という手順です。", {
  spots: [await spot(frame(3), { pad: 4, tag: "alt の中の opt", tagAt: "above" })],
});
await say("枠は、内側に入るほど**少しずつ内側に寄せて**描かれます。どの枠の中にあるかは、囲んでいる線でわかります。", {
  spots: [await spot([frame(1), frame(2), frame(3)], { pad: 4 })],
});
await clear();
await scrollToStep(13, 160);
await say("最後の **opt** は、支払額が 100 万円以上のときだけ、経理部長の承認を取る手順です。この枠は、どの枠にも入っていません。", {
  spots: [await spot(frame(4), { pad: 4, tag: "opt：100 万円以上", tagAt: "above" })],
});
await clear();

// 第3章
await chapter("入れ子の読み方");
await sleep(1500);
await stage("card", `<div class="eyebrow">第3章　入れ子の読み方</div><h2>外側の条件から、順に重ねて読みます</h2><ol>
<li><span>1</span>請求書に不備がある間（loop）</li><li><span>2</span>その不備が、金額・品目の誤りで（alt）</li><li><span>3</span>しかも、支払期日が近い場合だけ（opt）</li></ol>
<p>この 3 つがそろったときに、⑨「電話で至急の再発行を頼む」を行います。</p>`);
await say("入れ子の枠の中の手順は、**外側の条件から順に重ねて**読みます。");
await say("たとえば⑨は、「請求書に不備があり」「その不備が金額・品目の誤りで」「支払期日が近い」ときにだけ行う手順です。", { extra: 1200 });
await hideCard();
await scrollToStep(7, 200);
await act("⑨の番号を押してみます。", async () => {
  await click(num(9));
  await sleep(1000);
  await stage("cursorHide");
});
const outerNote = editPanel.getByText("この枠は、次の枠の中にあります（入れ子）");
await outerNote.scrollIntoViewIfNeeded();
await sleep(400);
await say("右の「分岐」の欄に、「**この枠は、次の枠の中にあります**」と、外側の枠が順に表示されます。", {
  spots: [await spot(outerNote.locator(".."), { pad: 8, tag: "外側の枠", tagAt: "above" })],
});
await say("その下が、いちばん内側の枠です。条件を直したり、この枠にステップを足したりするのは、ここで行います。", {
  spots: [await spot(editPanel.getByLabel("この場合の条件").locator("xpath=ancestor::div[contains(@class,'border-dashed')][1]"), { pad: 6 })],
});
await clear();
await closeEdit();
await scrollToStep(10, 70);
await say("内側の枠を出ると、ひとつ外側の枠に戻ります。⑩は、opt を出て、alt の「金額・品目に誤りがある」場合に戻った手順です。", {
  spots: [await spot([num(10), label("修正した請求書を送り直す")], { pad: 10 })],
});
await say("⑫は、内側の alt を出て、loop に戻った手順です。不備の種類にかかわらず、請求書を出し直します。", {
  spots: [await spot([num(12), label("請求書を出し直す")], { pad: 10 })],
});
await clear();

// 第4章
await chapter("入れ子の枠を作る");
await sleep(1500);
await hideCard();
await say("では、入れ子の枠を作ってみます。書類が足りない場合に「保管場所が分からないときだけ、総務部に問い合わせる」手順を足します。", { extra: 600 });
await scrollToStep(11, 320);
await act("⑪の番号を押してから、「**分岐を追加**」を押します。", async () => {
  await click(num(11));
  await sleep(900);
  await click(btn("分岐を追加", { exact: true }));
  await sleep(1000);
  await stage("cursorHide");
});
const where = branchPanel.getByText("どこに作りますか？").locator("..");
await where.scrollIntoViewIfNeeded();
await sleep(400);
await say("⑪は枠の中にあるので、「**どこに作りますか？**」という欄が出ます。どの枠の中に枠を作るかを選べます。", {
  spots: [await spot(where, { pad: 6, tag: "作る場所", tagAt: "above" })],
});
await say("選べるのは、どの枠にも入れないか、loop の中か、alt の「発注書・検収書が足りない」場合の中か、です。", {
  spots: [await spot(where, { pad: 6 })],
});
await say("最初は、**いちばん内側**が選ばれています。今回はこのまま、alt の中に作ります。", {
  spots: [await spot(branchPanel.locator("label").filter({ hasText: "発注書・検収書が足りない" }), { pad: 6 })],
});
await clear();
const kindRadio = (t) => branchPanel.locator("label").filter({ hasText: t });
await act("種類は「**〜のときだけやる**」（opt）を選びます。", async () => {
  await kindRadio("のときだけやる").scrollIntoViewIfNeeded();
  await click(kindRadio("のときだけやる"));
  await sleep(600);
  await stage("cursorHide");
});
await act("条件に「保管場所が分からない場合」と入力します。", async () => {
  const cond = branchPanel.getByLabel("1 つ目の条件");
  await cond.scrollIntoViewIfNeeded();
  await sleep(300);
  await typeIn(cond, "保管場所が分からない場合");
});
await act("「分岐を作る」を押します。alt の「発注書・検収書が足りない」場合の中に、opt の枠ができました。", async () => {
  await click(branchPanel.getByRole("button", { name: "分岐を作る" }));
  await sleep(1400);
  await stage("cursorHide");
});
const stepName = addPanel.getByLabel("ステップの名前");
await act("右の欄で、枠の中に入れるステップを書きます。営業担当から総務部へ、書類の保管場所を問い合わせます。", async () => {
  await typeIn(stepName, "書類の保管場所を問い合わせる", 80);
  await choose(addPanel.locator("select").nth(0), "営業担当");
  await choose(addPanel.locator("select").nth(1), "総務部");
});
await act("「追加」を押します。", async () => {
  await click(addPanel.getByRole("button", { name: "追加", exact: true }));
  await label("書類の保管場所を問い合わせる").waitFor();
  await sleep(1000);
  await stage("cursorHide");
});
await closeEdit();
await scrollToStep(11, 260);
await say("⑫として、opt の枠の中に手順が入りました。3 段の入れ子です。後ろの手順の番号は、自動で振り直されます。", {
  spots: [await spot(frame(4), { pad: 4, tag: "新しい opt", tagAt: "above" })],
});
await clear();
await act("枠の中のステップを選ぶと、場合ごとに「**＋ この中に分岐を追加**」も表示されます。ここからも、その場合の中に枠を作れます。", async () => {
  await click(num(11));
  await sleep(900);
  await stage("cursorHide");
  const b = editPanel.getByRole("button", { name: "＋ この中に分岐を追加" }).nth(1);
  await b.scrollIntoViewIfNeeded();
  await sleep(300);
  await stage("spots", [await spot(b, { pad: 6 })]);
});
await clear();
await closeEdit();
await say("入れ子は **3 段まで**です。⑨や、いま足した手順は 3 段目にいるので、その中にはもう枠を作れません。");

// 第5章
await chapter("畳む・再生で確かめる");
await sleep(1500);
await hideCard();
await scrollToStep(7, 200);
await say("入れ子が増えると、図が長くなります。いま読みたいところ以外は、**枠を畳む**と見やすくなります。");
await act("内側の alt の札を押すと、その枠だけが「▸」の 1 行に畳まれます。外側の loop は、そのまま残ります。", async () => {
  await click(app.locator("svg .labelText").nth(2));
  await sleep(1400);
  await stage("cursorHide");
  await stage("spots", [await spot(app.locator("[data-collapsed]").first(), { pad: 8, tag: "畳んだ alt", tagAt: "above" })]);
});
await clear();
await act("畳んだ 1 行を押すと、元に戻ります。", async () => {
  await click(app.locator("[data-collapsed]").first());
  await sleep(1400);
  await stage("cursorHide");
});
await scrollDiagram(0, 900);
await act("次に「**フローの再生**」で確かめます。再生では、枠に入るたびに条件を説明してくれます。", async () => {
  await click(btn("フローの再生"));
  await sleep(500);
  await stage("cursorHide");
});
const dlg = app.getByRole("dialog", { name: /流れのプレビュー/ });
await click(dlg.getByRole("button", { name: /一時停止/ }), { pause: 150 });
await sleep(300);
await act("loop に入る場面まで進めます。", async () => {
  await click(dlg.getByRole("button", { name: "12 番目の場面へ" }), { ms: 600 });
  await sleep(800);
  await stage("cursorHide");
});
const next = dlg.getByRole("button", { name: /次へ/ });
const context = dlg.locator("section span.border-violet-300");
await say("「くり返し」の場面です。「請求書に不備がある」の間、次の手順をくり返す、と説明しています。");
await act("「次へ」で進めると、loop の中の手順の上に、**どの枠の中か**が紫の印で表示されます。", async () => {
  await click(next, { ms: 600 });
  await sleep(700);
  await stage("spots", [await spot(context, { pad: 6 })]);
});
await clear();
await act("さらに進めると、内側の alt に入る場面になります。", async () => {
  await click(next, { ms: 500, pause: 200 });
  await sleep(1200);
  await click(next, { ms: 300, pause: 200 });
  await sleep(600);
});
await act("alt の中の手順です。印が「くり返す中で、金額・品目に誤りがある場合」と、**外側から順に**つながりました。", async () => {
  await click(next, { ms: 300, pause: 200 });
  await sleep(700);
  await stage("spots", [await spot(context, { pad: 6 })]);
});
await clear();
await act("3 段目の opt の中の手順まで進めます。", async () => {
  await click(next, { ms: 300, pause: 200 });
  await sleep(1200);
  await click(next, { ms: 300, pause: 200 });
  await sleep(700);
});
await say("印に、3 つの条件がすべて並びました。入れ子の読み方そのままです。チームで流れを確かめるときに使ってください。", {
  spots: [await spot(context, { pad: 6 })],
  extra: 800,
});
await clear();
await click(dlg.getByRole("button", { name: "閉じる" }));
await sleep(700);
await stage("cursorHide");

// 第6章
await chapter("入れ子のコツ");
await sleep(1500);
await stage("card", `<div class="eyebrow">第6章　入れ子のコツ</div><h2>入れ子を描くときの 4 つのコツ</h2><ol>
<li><span>1</span>まず一本道、次に外側の枠、最後に内側の枠の順に描く</li><li><span>2</span>内側の条件に、外側の条件を書き直さない</li><li><span>3</span>深くなりすぎたら、図を分けることも考える</li><li><span>4</span>枠を消しても、中の手順は消えずに外側へ残る</li></ol>`);
await say("1 つ目。いきなり入れ子を描かず、**一本道 → 外側の枠 → 内側の枠**の順に描くと迷いません。", { extra: 600 });
await say("2 つ目。内側の条件には、外側の条件を書き直しません。「不備があり、金額が誤り」ではなく「**金額・品目に誤りがある**」と書きます。", { extra: 600 });
await say("3 つ目。3 段でも読みにくくなるときは、細かい部分を**別の図に分ける**ことも考えましょう。図は、1 枚で全部を描く必要はありません。", { extra: 600 });
await say("4 つ目。枠を消すと、中の手順と内側の枠は**ひとつ外側に残ります**。枠の作り直しも、気軽に試せます。", { extra: 600 });

// まとめ
await stage("cursorHide");
await stage("chapter", "まとめ", "おつかれさまでした", 100);
await showCap("");
await stage("card", `<div class="eyebrow">まとめ</div><h2>枠を組み合わせる</h2>
<div class="flow"><div><b>読む</b><small>外側の条件から<br>順に重ねる</small></div><i>→</i><div><b>作る</b><small>「どこに作りますか？」<br>で枠の中を選ぶ</small></div><i>→</i><div><b>見る</b><small>枠を畳む、<br>再生で確かめる</small></div></div>`);
await sleep(700);
await say("入れ子の枠は、**外側の条件から順に重ねて読む**のが基本です。作るときは「どこに作りますか？」で、入れる枠を選びます。");
await say("見本の図は、一覧からいつでも開けます。枠を畳んだり、再生したりして、入れ子の読み方に慣れてみてください。");
await say("条件の複雑な業務も、枠を組み合わせれば 1 枚の図で表せます。おつかれさまでした。", { extra: 1500 });
await showCap("");
captions.pop();
const endT = clock() - t0;
if (session) {
  await new Promise((f) => setTimeout(f, 500));
  await session.send("Page.stopScreencast");
}
await browser.close();
writeFileSync(`captions-${VIDEO}.json`, JSON.stringify({ captions, end: endT, t0Wall, frames }, null, 1));
console.log(`captions=${captions.length} end=${(endT / 1000).toFixed(1)}s frames=${frames.length} shots=${shot}`);
