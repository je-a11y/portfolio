/* 방명록 · 문의 · 방문자 수 · 로그아웃
   포트폴리오 페이지 안에서 돌아가는 코드입니다. 데이터는 Supabase가 맡고, 로그인한 사람만 쓸 수 있습니다.
   연결 정보는 live-config.js 에 있습니다. */
const cfg = window.PF_LIVE || {};
const $ = id => document.getElementById(id);
const say = (el, text, kind) => { el.textContent = text; el.className = 'lmsg' + (kind ? ' ' + kind : ''); };
const off = () => document.documentElement.classList.remove('live-on');  // 방명록·문의 영역 숨기기

if (cfg.ready) start();
else if (cfg.preview) preview();

async function start() {
  // 로그인 문지기(gate.js)가 만든 연결을 같이 씀. 페이지를 따로 열었을 때는 직접 만듦
  let db = null;
  try { if (window.parent !== window) db = window.parent.pfDb || null; } catch (e) {}
  try {
    if (!db) {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      db = createClient(cfg.url, cfg.key);
    }
    const { data } = await db.auth.getSession();
    if (!data.session) { off(); return; }  // 로그인하지 않았으면 아무것도 보여 주지 않음
  } catch (e) { off(); return; }

  countVisit(db);
  loadGuestbook(db);
  bindGuestbook(db);
  bindContact(db);
  $('logout').addEventListener('click', async e => {
    e.preventDefault();
    await db.auth.signOut();  // 문지기가 알아채고 로그인 화면으로 돌려보냄
    if (window.parent === window) location.reload();
  });
}

/* 방문자 수: 같은 탭에서 처음 들어왔을 때만 1 올리고, 그 뒤로는 읽기만 함 */
async function countVisit(db) {
  let first = true;
  try { first = !sessionStorage.getItem('pf-visited'); } catch (e) {}
  const { data, error } = await db.rpc('visit', { bump: first });
  if (error || data == null) return;
  try { sessionStorage.setItem('pf-visited', '1'); } catch (e) {}
  $('visits').textContent = Number(data).toLocaleString('ko-KR');
}

/* 방명록 읽기 */
async function loadGuestbook(db) {
  const { data, error } = await db.from('guestbook')
    .select('name, message, created_at').order('created_at', { ascending: false }).limit(30);
  if (error) { say($('gb-msg'), '방명록을 불러오지 못했습니다.', 'err'); return; }
  renderGuestbook(data);
}

function renderGuestbook(rows) {
  const list = $('gb-list');
  list.replaceChildren();
  if (!rows.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = '아직 남겨진 글이 없습니다. 첫 번째로 남겨 주세요.';
    list.append(li);
    return;
  }
  rows.forEach(r => {
    // 방문자가 쓴 글은 textContent로만 넣어 태그가 실행되지 않게 함
    const li = document.createElement('li');
    const who = document.createElement('span'); who.className = 'who'; who.textContent = r.name;
    const at = document.createElement('span'); at.className = 'at';
    at.textContent = new Date(r.created_at).toLocaleDateString('ko-KR');
    const txt = document.createElement('p'); txt.className = 'txt'; txt.textContent = r.message;
    li.append(who, at, txt);
    list.append(li);
  });
}

/* 방명록 쓰기 */
function bindGuestbook(db) {
  const form = $('gb-form'), msg = $('gb-msg');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(form);
    if (f.get('website')) return;  // 숨은 칸이 채워졌으면 자동 등록 프로그램
    const name = f.get('name').trim(), message = f.get('message').trim();
    if (!name || !message) { say(msg, '이름과 내용을 모두 적어 주세요.', 'err'); return; }
    const btn = form.querySelector('button');
    btn.disabled = true; say(msg, '남기는 중…');
    const { error } = await db.from('guestbook').insert({ name, message });
    btn.disabled = false;
    if (error) { say(msg, '남기지 못했습니다. 잠시 뒤 다시 시도해 주세요.', 'err'); return; }
    form.reset(); say(msg, '고맙습니다. 방명록에 남겼습니다.', 'ok');
    loadGuestbook(db);
  });
}

/* 문의 보내기: 저장만 되고 페이지에서는 읽을 수 없음 (Supabase 대시보드에서 본인만 확인) */
function bindContact(db) {
  const form = $('ct-form'), msg = $('ct-msg');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(form);
    if (f.get('website')) return;
    const name = f.get('name').trim(), contact = f.get('contact').trim(), message = f.get('message').trim();
    if (!name || !contact || !message) { say(msg, '이름, 연락처, 내용을 모두 적어 주세요.', 'err'); return; }
    const btn = form.querySelector('button');
    btn.disabled = true; say(msg, '보내는 중…');
    const { error } = await db.from('contact_messages').insert({ name, contact, message });
    btn.disabled = false;
    if (error) { say(msg, '보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.', 'err'); return; }
    form.reset(); say(msg, '잘 받았습니다. 확인하고 연락드리겠습니다.', 'ok');
  });
}

/* 미리보기(?live-preview): Supabase 연결 없이 모양만 확인 */
function preview() {
  const note = '미리보기 화면입니다. 실제 사이트에서는 저장됩니다.';
  renderGuestbook([
    { name: '예시 방문자', message: '포트폴리오 잘 봤습니다. 3D 캠퍼스 지도가 인상적이에요.', created_at: new Date().toISOString() },
    { name: '또 다른 방문자', message: '핀볼 게임 재미있게 했습니다.', created_at: new Date(Date.now() - 86400000).toISOString() }
  ]);
  $('visits').textContent = '123';
  [['gb-form', 'gb-msg'], ['ct-form', 'ct-msg']].forEach(([f, m]) => {
    say($(m), note);
    $(f).addEventListener('submit', e => { e.preventDefault(); say($(m), note); });
  });
}
