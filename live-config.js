/* Supabase 연결 정보
   Supabase에서 프로젝트를 만든 뒤 아래 두 값을 채우면 방명록 · 문의 · 방문자 수가 켜집니다.
   - url : Project URL          (예: https://abcdefgh.supabase.co)
   - key : Publishable key      (sb_publishable_ 로 시작. 예전 이름은 anon key)
   이 두 값은 공개돼도 되는 값입니다. secret key / service_role key 는 절대 여기에 넣지 마세요. */
window.PF_LIVE = {
  url: 'https://iijarnjgpfrnwkswihsu.supabase.co',
  key: 'sb_publishable_hZGlvyC0JQ93fb9herH-WA_gzpLWzim'
};

/* 값이 채워졌을 때만 방명록 · 문의 영역을 보여 줍니다.
   주소 끝에 ?live-preview 를 붙이면 연결 전에도 모양을 미리 볼 수 있습니다. */
(function () {
  var c = window.PF_LIVE;
  c.ready = !!(c.url && c.key);
  c.preview = !c.ready && location.search.indexOf('live-preview') > -1;
  if (c.ready || c.preview) document.documentElement.classList.add('live-on');
})();
