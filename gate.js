/* 로그인 문지기
   1) 로그인 여부를 확인하고  2) 로그인한 사람에게만 Supabase 비공개 보관함(site)에서 페이지를 받아 와 보여 줍니다.
   이 저장소(GitHub)에는 포트폴리오 내용이 없습니다. 보관함은 로그인하지 않으면 Supabase가 거절합니다. */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.PF_LIVE;
const db = createClient(cfg.url, cfg.key);
window.pfDb = db;  // 불러온 페이지 안의 방명록·문의(live.js)가 같은 로그인을 씀

const BASE = new URL('.', location.href).href;            // 이 로그인 화면이 놓인 주소
const asked = new URLSearchParams(location.search).get('p') || '';
const PAGE = /^[\w-]+\.html$/.test(asked) ? asked : 'portfolio-3d.html';  // 주소 뒤 ?p=파일이름 으로 보여 줄 페이지를 고름
const ASSET = /portfolio-assets\/[\w.-]+/g;

const $ = id => document.getElementById(id);
const view = v => { document.body.dataset.view = v; };
const say = text => { $('msg').textContent = text; };

/* ── 로그인 · 가입 화면 ── */
let mode = 'in';
function setMode(m) {
  mode = m;
  $('tab-in').setAttribute('aria-pressed', m === 'in');
  $('tab-up').setAttribute('aria-pressed', m === 'up');
  $('go').textContent = m === 'in' ? '로그인' : '가입하고 보기';
  $('auth').password.autocomplete = m === 'in' ? 'current-password' : 'new-password';
  $('hint').textContent = m === 'in'
    ? '처음 오셨다면 위에서 ‘가입’을 눌러 주세요.'
    : '이메일과 비밀번호만 정하면 바로 볼 수 있습니다. 확인 메일은 보내지 않습니다.';
  say('');
}
$('tab-in').onclick = () => setMode('in');
$('tab-up').onclick = () => setMode('up');

function explain(error) {
  const code = error.code || '', text = error.message || '';
  if (code === 'invalid_credentials' || /Invalid login/i.test(text)) return '이메일 또는 비밀번호가 맞지 않습니다. 처음이라면 ‘가입’을 눌러 주세요.';
  if (code === 'user_already_exists' || /already registered/i.test(text)) return '이미 가입된 이메일입니다. ‘로그인’으로 들어와 주세요.';
  if (code === 'weak_password' || /at least 6/i.test(text)) return '비밀번호는 6자 이상으로 정해 주세요.';
  if (code === 'email_address_invalid' || code === 'validation_failed' || /invalid/i.test(text)) return '이메일 주소를 다시 확인해 주세요.';
  if (error.status === 429 || /rate limit/i.test(text)) return '요청이 많습니다. 잠시 뒤 다시 시도해 주세요.';
  return '문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.';
}

$('auth').addEventListener('submit', async e => {
  e.preventDefault();
  const email = e.target.email.value.trim(), password = e.target.password.value;
  $('go').disabled = true; say('');
  const { data, error } = mode === 'in'
    ? await db.auth.signInWithPassword({ email, password })
    : await db.auth.signUp({ email, password });
  $('go').disabled = false;
  if (error) { say(explain(error)); return; }
  if (!data.session) { say('가입은 됐지만 로그인되지 않았습니다. ‘로그인’으로 다시 들어와 주세요.'); setMode('in'); return; }
  openPage();
});

/* ── 로그인한 사람에게 페이지 보여 주기 ── */
async function openPage() {
  view('loading');
  const { data: file, error } = await db.storage.from('site').download(PAGE);
  if (error) {
    // 로그인이 더는 유효하지 않거나(계정 삭제 등) 없는 페이지인 경우
    const { data: user } = await db.auth.getUser();
    if (!user || !user.user) { await db.auth.signOut(); view('login'); say('다시 로그인해 주세요.'); return; }
    $('wait').textContent = '페이지를 찾지 못했습니다.';
    return;
  }
  const doc = new DOMParser().parseFromString(await file.text(), 'text/html');

  // ① 다른 포트폴리오 페이지로 가는 링크 → 이 문지기를 거치도록 바꿈
  doc.querySelectorAll('a[href]').forEach(a => {
    const m = /^([\w-]+\.html)(#.*)?$/.exec(a.getAttribute('href'));
    if (!m) return;
    a.setAttribute('href', BASE + '?p=' + m[1] + (m[2] || ''));
    if (!a.getAttribute('target')) a.setAttribute('target', '_top');
  });
  // ② 공개 파일(live.css, live.js 등) → 전체 주소로
  doc.querySelectorAll('link[href], script[src]').forEach(el => {
    const key = el.hasAttribute('src') ? 'src' : 'href', v = el.getAttribute(key);
    if (!/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(v)) el.setAttribute(key, BASE + v);
  });
  // ③ 이미지 → 하루 동안만 열리는 임시 주소로
  const holders = [...doc.querySelectorAll('[style*="portfolio-assets/"], img[src^="portfolio-assets/"]')];
  const paths = [...new Set(holders.flatMap(el => ((el.getAttribute('style') || '') + ' ' + (el.getAttribute('src') || '')).match(ASSET) || []))];
  if (paths.length) {
    const { data: signed } = await db.storage.from('site').createSignedUrls(paths, 86400);
    const urlOf = Object.fromEntries((signed || []).filter(s => s.signedUrl).map(s => [s.path, s.signedUrl]));
    holders.forEach(el => ['style', 'src'].forEach(k => {
      const v = el.getAttribute(k);
      if (v) el.setAttribute(k, v.replace(ASSET, p => urlOf[p] || p));
    }));
  }

  const html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  const frame = $('frame');
  frame.onload = () => { view('page'); frame.focus(); };
  frame.src = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })) + location.hash;
  document.title = doc.title || document.title;
}

/* ── 시작 ── */
db.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') location.replace(BASE); });  // 로그아웃하면 로그인 화면으로

const { data } = await db.auth.getSession();
if (data.session) openPage();
else view('login');
