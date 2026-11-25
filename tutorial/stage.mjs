// 撮影台（1920×1080）。上 930px にアプリを iframe で 1.25 倍表示し、下 150px を字幕の帯にする。
// カーソル・強調枠・章カードは iframe の外に重ねるので、アプリのダイアログに隠れない。
export const APP_W = 1536, APP_H = 744, SCALE = 1.25, STAGE_W = 1920, STAGE_H = 1080, BAND = 150;

export const stageHtml = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>stage</title><style>
:root{--ink:#0f172a;--accent:#0284c7;--amber:#fbbf24;--band:#0f172a}
*{box-sizing:border-box}html,body{margin:0;width:${STAGE_W}px;height:${STAGE_H}px;overflow:hidden;background:#fff;
 font-family:"Hiragino Sans","Hiragino Kaku Gothic ProN",sans-serif;-webkit-font-smoothing:antialiased}
#viewport{position:absolute;left:0;top:0;width:${STAGE_W}px;height:${STAGE_H - BAND}px;overflow:hidden;background:#fff}
#app{position:absolute;left:0;top:0;width:${APP_W}px;height:${APP_H}px;border:0;transform:scale(${SCALE});transform-origin:0 0}
#dim{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity .35s}
.ring{position:absolute;border:4px solid var(--amber);border-radius:12px;pointer-events:none;box-shadow:0 0 0 3px rgba(15,23,42,.35);
 transition:opacity .3s;animation:pop .4s ease-out}
@keyframes pop{from{transform:scale(1.06);opacity:0}to{transform:none;opacity:1}}
.tag{position:absolute;background:var(--ink);color:#fff;font-size:24px;font-weight:600;padding:6px 16px;border-radius:8px;white-space:nowrap;pointer-events:none;animation:pop .4s ease-out}
#cursor{position:absolute;left:0;top:0;width:40px;height:40px;pointer-events:none;z-index:50;transform:translate(960px,600px);opacity:0;transition:opacity .25s;
 filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))}
.ripple{position:absolute;width:64px;height:64px;margin:-32px;border-radius:50%;border:4px solid var(--accent);pointer-events:none;z-index:49;animation:rip .6s ease-out forwards}
@keyframes rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.2);opacity:0}}
#card{position:absolute;inset:0;z-index:40;background:#f8fafc;color:var(--ink);display:flex;flex-direction:column;justify-content:center;padding:0 200px;opacity:0;pointer-events:none;transition:opacity .45s}
#card.on{opacity:1}
#card .eyebrow{font-size:34px;font-weight:600;color:var(--accent);margin-bottom:20px}
#card h1{font-size:88px;line-height:1.25;margin:0;font-weight:700;letter-spacing:.01em}
#card h2{font-size:68px;line-height:1.3;margin:0;font-weight:700}
#card p{font-size:36px;line-height:1.6;color:#475569;margin:28px 0 0}
#card ol{list-style:none;margin:44px 0 0;padding:0;display:flex;flex-direction:column;gap:22px}
#card ol li{font-size:40px;font-weight:500;display:flex;gap:26px;align-items:center}
#card ol li span{flex:none;width:60px;height:60px;border-radius:50%;background:var(--ink);color:#fff;font-size:30px;font-weight:700;display:flex;align-items:center;justify-content:center}
#card .flow{display:flex;align-items:stretch;gap:0;margin-top:52px}
#card .flow div{flex:1;background:#fff;border:2px solid #cbd5e1;border-radius:14px;padding:24px 26px}
#card .flow b{display:block;font-size:40px;font-weight:700;margin-bottom:8px}
#card .flow small{font-size:26px;line-height:1.5;color:#475569;display:block}
#card .flow i{flex:none;width:56px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:38px;color:#94a3b8}
.uml{display:flex;gap:60px;align-items:center;margin-top:30px}.uml-notes p{font-size:32px;margin:0 0 30px;color:#334155}.uml-notes b{color:#0f172a}
.map{border-collapse:collapse;margin-top:40px;width:100%;font-size:32px}.map th{text-align:left;color:#475569;font-weight:600;font-size:28px;padding:14px 22px;border-bottom:3px solid #94a3b8}.map td{padding:20px 22px;border-bottom:1px solid #cbd5e1;vertical-align:middle}.map td:first-child{font-weight:700}.arrows{font-size:30px}
#card{padding:0 150px}
#band{position:absolute;left:0;right:0;bottom:0;height:${BAND}px;background:var(--band);color:#fff;display:flex;align-items:center;gap:36px;padding:0 48px;z-index:60}
#chapter{flex:none;width:310px;border-right:2px solid #334155;padding-right:28px;height:92px;display:flex;flex-direction:column;justify-content:center}
#chapter b{font-size:22px;font-weight:600;color:#7dd3fc;display:block}
#chapter span{font-size:24px;font-weight:600;line-height:1.3;display:block;margin-top:4px}
#caption{flex:1;font-size:36px;font-weight:600;line-height:1.42;letter-spacing:.01em;transition:opacity .18s}
#caption b{color:var(--amber);font-weight:700}
#progress{position:absolute;left:0;bottom:${BAND}px;height:5px;background:var(--accent);z-index:61;width:0;transition:width .6s}
</style></head><body>
<div id="viewport"><iframe id="app" name="app" title="app"></iframe>
<svg id="dim" viewBox="0 0 ${STAGE_W} ${STAGE_H - BAND}" preserveAspectRatio="none"><path id="dimPath" fill="rgba(15,23,42,.42)" fill-rule="evenodd" d=""/></svg>
<div id="marks"></div>
<div id="card"></div></div>
<svg id="cursor" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.7 14.8 L11.8 21.5 L15 20 L11.9 13.5 L18.2 13.5 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>
<div id="progress"></div>
<div id="band"><div id="chapter"><b id="chapNo"></b><span id="chapName"></span></div><div id="caption"></div></div>
<script>
const $=id=>document.getElementById(id);
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\\*\\*(.+?)\\*\\*/g,'<b>$1</b>');
window.stage={
 caption(t){const c=$('caption');c.style.opacity=0;setTimeout(()=>{c.innerHTML=esc(t);c.style.opacity=1},180)},
 chapter(no,name,pct){$('chapNo').textContent=no;$('chapName').textContent=name;$('progress').style.width=pct+'%'},
 card(html){const c=$('card');if(html){c.innerHTML=html;c.classList.add('on')}else c.classList.remove('on')},
 spots(list){
  const H=${STAGE_H - BAND},W=${STAGE_W};const m=$('marks');m.innerHTML='';
  if(!list.length){$('dim').style.opacity=0;return}
  let d='M0 0H'+W+'V'+H+'H0Z';
  for(const r of list){const p=r.pad??8,x=r.x-p,y=r.y-p,w=r.w+2*p,h=r.h+2*p;
   d+=' M'+x+' '+y+'h'+w+'v'+h+'h'+(-w)+'Z';
   const e=document.createElement('div');e.className='ring';e.style.cssText='left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px';m.append(e);
   if(r.tag){const t=document.createElement('div');t.className='tag';t.textContent=r.tag;
    const below=r.tagAt==='below'||(r.tagAt!=='above'&&y<70);
    t.style.left=Math.max(12,Math.min(x,W-420))+'px';t.style.top=(below?y+h+10:y-54)+'px';m.append(t)}}
  $('dimPath').setAttribute('d',d);$('dim').style.opacity=1},
 cursor(x,y,ms){const c=$('cursor');c.style.opacity=1;c.style.transition='opacity .25s, transform '+ms+'ms cubic-bezier(.45,.05,.25,1)';c.style.transform='translate('+x+'px,'+y+'px)'},
 cursorHide(){$('cursor').style.opacity=0},
 ripple(x,y){const r=document.createElement('div');r.className='ripple';r.style.left=x+'px';r.style.top=y+'px';document.body.append(r);setTimeout(()=>r.remove(),700)},
};
</script></body></html>`;
