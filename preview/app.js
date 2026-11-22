/* ==========================================================
   メタル脳 — オパビのイヤホン帳 / app.js
   依存なし（Vanilla JS）。データは data/models.js・data/wishlist.js
   ========================================================== */
(function () {
  'use strict';

  // ---------- 定義 ----------
  const RANKS = [
    { key: 'S',  label: 'S',    desc: '鳥肌が立つレベル。末永く付き合う主力', view: 'srow' },
    { key: 'A',  label: 'A',    desc: 'その役割で手持ちの1番手', view: 'card' },
    { key: 'BP', label: 'B+',   desc: 'ヘビロテではないが、すぐ手が届く位置', view: 'card' },
    { key: 'B',  label: 'B',    desc: '良好。出番は少なめ', view: 'ledger' },
    { key: 'C',  label: 'C',    desc: '聴けるが、あえて選ぶ理由がない', view: 'mini' },
    { key: 'D',  label: 'D',    desc: '好みから明確に外れる', view: 'mini' },
    { key: 'X',  label: '評価外', desc: '装着感が合わず、音を評価できない', view: 'mini' }
  ];
  const ROLES = {
    power:      { label: '圧', desc: '圧・量感' },
    edge:       { label: '切', desc: '速さ・輪郭' },
    atmosphere: { label: '響', desc: '残響・空間' }
  };
  const ROLE_ORDER = ['power', 'atmosphere', 'edge'];
  const HERO = [['doscinco', 'power'], ['cincotres', 'edge'], ['luna', 'atmosphere'], ['estrella', 'none']];
  const TONE = [['low', '低域', 'power'], ['mid', '中高域', 'none'], ['stage', '音場', 'edge']];
  const SONG_COLORS = ['power', 'edge', 'none', 'atmosphere'];
  const MAKER_TOP = 8;

  // ---------- データ整形 ----------
  MODELS.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const byId = Object.fromEntries(MODELS.map(m => [m.id, m]));
  const rankOf = k => RANKS.find(r => r.key === k);
  const roleOf = m => (m.axis || []).slice(0, 2); // 役割は最大2つ（主→副）
  const isOpenable = m => !m.pending;
  const openable = MODELS.filter(isOpenable);

  // 品番：ランク内の通し番号
  const numbering = {};
  RANKS.forEach(r => MODELS.filter(m => m.rank === r.key).forEach((m, i) => {
    numbering[m.id] = { no: `${r.label === '評価外' ? 'X' : r.label}-${String(i + 1).padStart(2, '0')}`, total: MODELS.filter(x => x.rank === r.key).length };
  }));

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  // ---------- 部品 ----------
  function nameHtml(m) {
    const [main] = roleOf(m);
    const ini = main ? `var(--${main}-t)` : 'var(--ink)';
    return `<span class="ini" style="--ini:${ini}">${esc(m.name.charAt(0))}</span>${esc(m.name.slice(1))}`;
  }
  function roleChips(m) {
    return roleOf(m).map(a => `<b class="rchip" style="background:var(--${a})">${ROLES[a].label}</b>`).join('');
  }
  function photoHtml(m, kind, opts = {}) {
    const p = PHOTOS[m.id];
    const arStyle = opts.ar ? ` style="--ar:${opts.ar}"` : '';
    if (!p) return `<div class="ph"${arStyle}><div class="noimg">${esc(m.drivers)}<br>NO PHOTO</div></div>`;
    const ws = p[kind];
    const src = `img/${m.id}-${kind}-${ws[0]}.webp`;
    const srcset = ws.map(w => `img/${m.id}-${kind}-${w}.webp ${w}w`).join(', ');
    let style = '';
    if (m.photoPos || m.photoZoom) {
      const o = m.photoPos || '50% 50%';
      const zoom = kind === 'card' && m.photoZoom ? `transform:scale(${m.photoZoom});transform-origin:${o}` : '';
      style = ` style="object-position:${o};${zoom}"`;
    }
    const load = opts.eager ? ' fetchpriority="high"' : ' loading="lazy"';
    const lift = p.lum < 0.15 ? ' class="lift-strong"' : p.lum < 0.3 ? ' class="lift-soft"' : '';
    return `<div class="ph"${arStyle}><img src="${src}" srcset="${srcset}" sizes="${opts.sizes || '(max-width:720px) 50vw, 360px'}" alt="${esc(m.brand + ' ' + m.name)}"${lift}${load} decoding="async"${style}></div>`;
  }
  function matHtml(m, kind, opts = {}) {
    const [main, sub] = roleOf(m);
    const cls = ['mat'];
    if (opts.sm) cls.push('mat--sm');
    if (opts.dots && !m.pending) cls.push('mat--dots');
    if (sub && !m.pending) cls.push('has-sub');
    const vars = [];
    if (main && !m.pending) vars.push(`--main-c:var(--${main})`);
    else if (!m.pending) vars.push('--main-c:var(--none)');
    if (sub) vars.push(`--sub-c:var(--${sub})`);
    const badge = m.pending ? '<span class="badge">準備中</span>' : '';
    return `<div class="${cls.join(' ')}" style="${vars.join(';')}"><div class="mat__inner">${badge}${photoHtml(m, kind, opts)}</div></div>`;
  }
  const wrapLink = (m, cls, inner) => isOpenable(m)
    ? `<a class="${cls}" href="#${m.id}" data-open="${m.id}">${inner}</a>`
    : `<div class="${cls}">${inner}</div>`;
  const dataAttrs = m => `data-id="${m.id}" data-brand="${esc(m.brand)}" data-axis="${(m.axis || []).join(' ')}"`;

  // ---------- 一覧の描画 ----------
  function srowHtml(m) {
    const n = numbering[m.id];
    const inner = `${matHtml(m, 'card', { dots: true, sizes: '(max-width:720px) 132px, 400px' })}
      <div>
        <div class="meta"><span>${n.no} ／ ${esc(m.brand)}</span><span>${esc(m.drivers)}</span></div>
        <h3 class="name">${nameHtml(m)}</h3>
        <p class="catch">${esc(m.catch)}</p>
        ${m.lead ? `<p class="srow__lead">${esc(m.lead)}</p>` : ''}
        <p class="chips">${roleChips(m)}<span class="genre">${esc(m.genre || '')}</span></p>
      </div>`;
    return `<article class="srow item${m.pending ? ' is-pending' : ''}" ${dataAttrs(m)}>${wrapLink(m, 'srow__link', inner)}</article>`;
  }
  function cardHtml(m) {
    const n = numbering[m.id];
    const inner = `${matHtml(m, 'card', { dots: m.rank === 'A' })}
      <div class="meta"><span>${n.no} ／ ${esc(m.brand)}</span><span>${esc(m.drivers)}</span></div>
      <h3 class="name">${nameHtml(m)}</h3>
      <p class="catch">${esc(m.catch || '（ひとこと未記入）')}</p>
      <p class="chips">${roleChips(m)}<span class="genre">${esc(m.genre || '')}</span></p>`;
    return `<article class="card item${m.pending ? ' is-pending' : ''}" ${dataAttrs(m)}>${wrapLink(m, 'card__link', inner)}</article>`;
  }
  function lrowHtml(m) {
    const n = numbering[m.id];
    const inner = `<span class="lrow__no">${n.no}</span><span class="lrow__name">${esc(m.name)}</span><span class="lrow__brand">${esc(m.brand)}</span><span class="lrow__drv">${esc(m.drivers)}</span><span class="lrow__catch${m.catch ? '' : ' is-empty'}">${esc(m.catch || '—')}</span>`;
    return `<li class="lrow item${m.pending ? ' is-pending' : ''}" ${dataAttrs(m)}>${wrapLink(m, 'lrow__link', inner)}</li>`;
  }
  function miniHtml(m) {
    return `<li class="item" ${dataAttrs(m)}><b>${esc(m.name)}</b>${m.catch ? ` <span>— ${esc(m.catch)}</span>` : ''}</li>`;
  }

  function renderTiers() {
    const html = RANKS.map(r => {
      const list = MODELS.filter(m => m.rank === r.key);
      if (!list.length) return '';
      let body = '';
      if (r.view === 'srow') body = `<div class="slist">${list.map(srowHtml).join('')}</div>`;
      else if (r.view === 'card') body = `<div class="cards">${list.map(cardHtml).join('')}</div>`;
      else if (r.view === 'ledger') body = `<ul class="ledger-list"><li class="ledger-head" aria-hidden="true"><span>NO.</span><span>MODEL</span><span>BRAND</span><span>DRIVERS</span><span>ひとこと</span></li>${list.map(lrowHtml).join('')}</ul>`;
      else body = `<ul class="mini">${list.map(miniHtml).join('')}</ul>`;
      return `<section class="tier tier--${r.key}" id="rank-${r.key}" data-rank="${r.key}" aria-labelledby="rh-${r.key}">
        <div class="wrap">
          <div class="tier__head"><h2 class="tier__rank" id="rh-${r.key}">${r.label}</h2><span class="tier__desc">${r.desc}</span><span class="tier__count" data-count></span></div>
          ${body}
        </div></section>`;
    }).join('');
    $('#tiers').innerHTML = html;

    $('#rankTabs').innerHTML = RANKS.filter(r => MODELS.some(m => m.rank === r.key))
      .map(r => `<button type="button" class="ranktab${r.label.length > 2 ? ' ranktab--jp' : ''}" data-rank="${r.key}">${r.label}<span class="n" data-n></span></button>`).join('');
  }

  function renderHero() {
    $('#heroPanels').innerHTML = HERO.map(([id, role]) => {
      const m = byId[id];
      if (!m || !PHOTOS[id]) return '';
      const cap = role === 'none' ? '<b>—</b>未分類' : `<b>${ROLES[role].label}</b>${ROLES[role].desc}`;
      return `<figure class="panel"><div class="panel__mat" style="--c:var(--${role});--d:var(--${role}-d)"><img src="img/${id}-card-${PHOTOS[id].card[0]}.webp" alt="" loading="eager" decoding="async" style="object-position:${m.photoPos || '50% 50%'}"></div><figcaption>${cap}</figcaption></figure>`;
    }).join('');
  }

  // ---------- ほしい台帳 ----------
  function renderWish() {
    const groups = {};
    WISHLIST.forEach(w => (groups[w.brand] = groups[w.brand] || []).push(w));
    const brands = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true }));
    const slug = b => 'wb-' + b.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    $('#brandNav').innerHTML = brands.map(b => `<button type="button" data-target="${slug(b)}">${esc(b)}<span class="n">${groups[b].length}</span></button>`).join('');
    $('#wishList').innerHTML = brands.map(b => `<section class="wgroup" id="${slug(b)}">
      <div class="wgroup__head"><h3>${esc(b)}</h3><span>${groups[b].length}機種</span></div>
      <ul>${groups[b].map(w => `<li><b>${esc(w.name)}</b><span>${esc(w.drivers)}</span>${w.note ? `<p class="wnote">${esc(w.note)}</p>` : ''}</li>`).join('')}</ul></section>`).join('');
    $('#wishMeta').textContent = `${brands.length}メーカー ／ ${WISHLIST.length}機種`;
    // メーカー名の帯の高さを測って、見出しの止まる位置に使う（折り返しても隠れない）
    const nav = $('.brandnav');
    const syncNavH = () => { if (nav.offsetHeight) document.documentElement.style.setProperty('--brandnav-h', nav.offsetHeight + 'px'); };
    window.addEventListener('resize', syncNavH);
    document.addEventListener('wishshown', syncNavH);
    $('#brandNav').addEventListener('click', e => {
      const b = e.target.closest('button[data-target]');
      if (b) document.getElementById(b.dataset.target).scrollIntoView({ block: 'start' });
    });
  }

  // ---------- ランクタブ（現在地の追従） ----------
  let tabTicking = false;
  function updateActiveTab() {
    tabTicking = false;
    const nav = $('.ranktabs');
    const line = nav.getBoundingClientRect().bottom + 8;
    let current = null;
    $$('.tier').forEach(s => { if (!s.hidden && s.getBoundingClientRect().top <= line) current = s.dataset.rank; });
    if (!current) { const first = $$('.tier').find(s => !s.hidden); current = first && first.dataset.rank; }
    $$('.ranktab').forEach(t => {
      const on = t.dataset.rank === current;
      if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
      if (on && t.scrollIntoView && t.offsetParent) {
        const list = t.parentElement;
        const l = t.offsetLeft - list.offsetLeft, r = l + t.offsetWidth;
        if (l < list.scrollLeft || r > list.scrollLeft + list.clientWidth) list.scrollLeft = l - 16;
      }
    });
  }
  window.addEventListener('scroll', () => { if (!tabTicking) { tabTicking = true; requestAnimationFrame(updateActiveTab); } }, { passive: true });
  function bindTabs() {
    $('#rankTabs').addEventListener('click', e => {
      const t = e.target.closest('.ranktab');
      if (!t || t.disabled) return;
      const sec = document.getElementById('rank-' + t.dataset.rank);
      sec.style.scrollMarginTop = $('.ranktabs').offsetHeight + 'px';
      sec.scrollIntoView({ block: 'start' });
    });
  }

  // ---------- 絞り込み ----------
  const filter = { roles: new Set(), makers: new Set() };
  let draft = { roles: new Set(), makers: new Set() };
  let makersExpanded = false;
  const makerCounts = (() => {
    const c = {};
    MODELS.forEach(m => { c[m.brand] = (c[m.brand] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en', { sensitivity: 'base' }));
  })();
  const roleCount = r => MODELS.filter(m => (m.axis || []).includes(r)).length;
  const matches = (m, f) =>
    (!f.roles.size || (m.axis || []).some(a => f.roles.has(a))) &&
    (!f.makers.size || f.makers.has(m.brand));
  const activeCount = f => f.roles.size + f.makers.size;
  // キーワード検索（機種名・メーカー・構成・ジャンル・バンド・キャッチを部分一致。全角半角・大小文字は区別しない）
  let query = '';
  const norm = v => String(v || '').normalize('NFKC').toLowerCase();
  const songText = m => (m.songs || []).map(s => Array.isArray(s) ? s[0] : s).join(' ');
  const hay = m => norm([m.name, m.brand, m.drivers, m.genre, m.catch, songText(m)].join(' '));
  const qmatch = m => !query || query.split(/\s+/).filter(Boolean).every(w => hay(m).includes(w));
  const visible = m => matches(m, filter) && qmatch(m);
  const narrowing = () => activeCount(filter) > 0 || !!query;

  function renderSheet() {
    $('#roleOpts').innerHTML = ROLE_ORDER.map(r => `<button type="button" class="ropt" data-role="${r}" aria-pressed="${draft.roles.has(r)}" style="--c:var(--${r})"><span class="sw" aria-hidden="true"></span>${ROLES[r].label}<span class="n">${roleCount(r)}</span></button>`).join('');
    const list = makersExpanded ? makerCounts : makerCounts.slice(0, MAKER_TOP);
    const rest = makerCounts.length - MAKER_TOP;
    $('#makerOpts').innerHTML = list.map(([b, n]) => `<button type="button" class="mopt" data-maker="${esc(b)}" aria-pressed="${draft.makers.has(b)}">${esc(b)}<span class="n">${n}</span></button>`).join('') +
      (rest > 0 ? `<button type="button" class="mmore" data-more aria-expanded="${makersExpanded}">${makersExpanded ? '閉じる' : `ほか${rest}社`}</button>` : '');
    const n = MODELS.filter(m => matches(m, draft)).length;
    $('#filterApply').textContent = `${n}機種を表示`;
    $('#filterApply').disabled = n === 0;
    $('#roleNote').hidden = !draft.roles.size;
  }
  function openSheet() {
    draft = { roles: new Set(filter.roles), makers: new Set(filter.makers) };
    makersExpanded = [...draft.makers].some(b => makerCounts.findIndex(([x]) => x === b) >= MAKER_TOP);
    renderSheet();
    $('#sheet').hidden = false;
    lock(true);
    $('.sheet__panel').focus();
  }
  function closeSheet() {
    $('#sheet').hidden = true;
    if ($('#modal').hidden) lock(false);
    $('#filterBtn').focus();
  }
  function applyFilter() {
    const on = narrowing();
    $$('.tier').forEach(sec => {
      const items = $$('.item', sec);
      let vis = 0;
      items.forEach(el => {
        const ok = visible(byId[el.dataset.id]);
        el.hidden = !ok;
        if (ok) vis++;
      });
      sec.hidden = vis === 0;
      $('[data-count]', sec).textContent = on ? `${vis} ／ ${items.length}機種` : `${items.length}機種`;
      const tab = $(`.ranktab[data-rank="${sec.dataset.rank}"]`);
      if (tab) { tab.disabled = vis === 0; $('[data-n]', tab).textContent = on && vis ? vis : ''; }
    });
    const fOn = activeCount(filter) > 0;
    const badge = $('#filterBadge');
    badge.hidden = !fOn; badge.textContent = activeCount(filter);
    const bar = $('#filterBar');
    bar.hidden = !fOn;
    const hits = MODELS.filter(visible).length;
    $('#searchCount').textContent = query ? `${hits}件` : '';
    let empty = $('#emptyNote');
    if (!empty) { empty = document.createElement('p'); empty.id = 'emptyNote'; empty.className = 'empty-note wrap'; $('#tiers').after(empty); }
    empty.hidden = hits > 0;
    empty.textContent = '該当する機種が見つかりませんでした。言葉を変えるか、絞り込みを解除してください。';
    if (fOn) {
      const total = MODELS.filter(m => matches(m, filter)).length;
      bar.innerHTML = [...filter.roles].map(r => `<span class="chip chip--role" style="background:var(--${r})">${ROLES[r].label}<button type="button" data-rm-role="${r}" aria-label="${ROLES[r].label}の絞り込みを解除"><svg aria-hidden="true" width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M2 2l10 10M12 2L2 12"/></svg></button></span>`).join('') +
        [...filter.makers].map(b => `<span class="chip">${esc(b)}<button type="button" data-rm-maker="${esc(b)}" aria-label="${esc(b)}の絞り込みを解除"><svg aria-hidden="true" width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M2 2l10 10M12 2L2 12"/></svg></button></span>`).join('') +
        `<span class="filterbar__count">で絞り込み中 ・ <b>${total}機種</b></span><button type="button" class="link-btn" data-clear>すべて表示</button>`;
    }
    updateActiveTab();
  }
  function openSearch() {
    $('.ranktabs__inner').classList.add('is-search');
    $('#searchRow').hidden = false;
    $('#searchBtn').setAttribute('aria-expanded', 'true');
    $('#searchInput').focus();
  }
  function closeSearch() {
    $('.ranktabs__inner').classList.remove('is-search');
    $('#searchRow').hidden = true;
    $('#searchBtn').setAttribute('aria-expanded', 'false');
    $('#searchInput').value = '';
    if (query) { query = ''; applyFilter(); }
    $('#searchBtn').focus();
  }
  function bindSearch() {
    $('#searchBtn').addEventListener('click', openSearch);
    $('#searchClose').addEventListener('click', closeSearch);
    $('#searchInput').addEventListener('input', e => {
      query = norm(e.target.value).trim();
      applyFilter();
      // 結果が上にある場合に備えて、一覧の先頭へ寄せる
      const top = $('#viewOwned').getBoundingClientRect().top + window.scrollY;
      if (window.scrollY > top) window.scrollTo(0, top);
    });
    $('#searchInput').addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeSearch(); } if (e.key === 'Enter') e.target.blur(); });
  }
  function bindFilter() {
    $('#filterBtn').addEventListener('click', openSheet);
    $('#sheet').addEventListener('click', e => {
      if (e.target.closest('[data-close]')) return closeSheet();
      const r = e.target.closest('[data-role]');
      if (r) { toggle(draft.roles, r.dataset.role); return renderSheet(); }
      const mk = e.target.closest('[data-maker]');
      if (mk) { toggle(draft.makers, mk.dataset.maker); return renderSheet(); }
      if (e.target.closest('[data-more]')) { makersExpanded = !makersExpanded; return renderSheet(); }
    });
    $('#filterReset').addEventListener('click', () => { draft = { roles: new Set(), makers: new Set() }; renderSheet(); });
    $('#filterApply').addEventListener('click', () => {
      filter.roles = new Set(draft.roles); filter.makers = new Set(draft.makers);
      applyFilter(); closeSheet();
      $('#viewOwned').scrollIntoView({ block: 'start' });
    });
    $('#filterBar').addEventListener('click', e => {
      const r = e.target.closest('[data-rm-role]'), mk = e.target.closest('[data-rm-maker]');
      if (r) filter.roles.delete(r.dataset.rmRole);
      else if (mk) filter.makers.delete(mk.dataset.rmMaker);
      else if (e.target.closest('[data-clear]')) { filter.roles.clear(); filter.makers.clear(); }
      else return;
      applyFilter();
    });
  }
  const toggle = (set, v) => set.has(v) ? set.delete(v) : set.add(v);

  // ---------- 詳細モーダル ----------
  let lastFocus = null;
  let openedInPage = false;

  function relatedHtml([id, text]) {
    const r = byId[id];
    if (r && isOpenable(r)) return `<button type="button" class="vs__item vs__item--link" data-goto="${r.id}" aria-label="${esc(r.name)}の詳細を見る：${esc(text)}"><span><b>${esc(r.name)}</b>${esc(text)}</span><svg class="vs__go" aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9h11M10 4.5L14.5 9 10 13.5"/></svg></button>`;
    return `<p class="vs__item"><b>${esc(r ? r.name : id)}</b>${esc(text)}</p>`;
  }
  function verdictHtml(v) {
    // **語** を強調（色の影）として扱う
    return esc(v).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>');
  }
  // 合う曲の速さ（1=遅い〜5=速い）。range=[合う範囲の端, 端]、best=いちばん合う段階（2つの山があるときは [2,4] のように配列）
  function tempoHtml(m) {
    const t = m.tempo;
    if (!t || !Array.isArray(t.range)) return '';
    const lo = Math.max(1, Math.min(t.range[0], t.range[1])), hi = Math.min(5, Math.max(t.range[0], t.range[1]));
    const bests = (Array.isArray(t.best) ? t.best : t.best ? [t.best] : []).filter(n => n >= 1 && n <= 5);
    const cells = [1, 2, 3, 4, 5].map(i => {
      const on = i >= lo && i <= hi, best = bests.includes(i);
      return `<span class="tempo__cell${on ? ' is-on' : ''}${best ? ' is-best' : ''}"></span>`;
    }).join('');
    const label = ['', '遅い', 'やや遅い', '中くらい', 'やや速い', '速い'];
    const bestWord = bests.length > 1 ? '特に合う' : 'いちばん合う';
    const desc = `合う速さ：${label[lo]}〜${label[hi]}${bests.length ? `（${bestWord}のは${bests.map(n => label[n]).join('と')}曲）` : ''}`;
    return `<section class="dsec"><h3 class="label">TEMPO<small>合う曲の速さ</small></h3>
      <div class="tempo" role="img" aria-label="${desc}">
        <div class="tempo__bar">${cells}</div>
        <div class="tempo__ends" aria-hidden="true"><span>遅い</span><span>速い</span></div>
        <div class="tempo__legend" aria-hidden="true">${bests.length ? `<span><i class="lg-best"></i>${bestWord}</span>` : ''}<span><i class="lg-on"></i>合う</span></div>
      </div>${t.note ? `<p class="tempo__note">${esc(t.note)}</p>` : ''}</section>`;
  }
  // 前後の機種。絞り込み中は、絞り込んだ機種の中だけで回る（今の機種が範囲外なら全機種）
  function navList(m) {
    if (!narrowing()) return openable;
    const list = openable.filter(visible);
    return list.includes(m) ? list : openable;
  }
  function stepModel(m, dir) {
    const list = navList(m), i = list.indexOf(m);
    return list[(i + dir + list.length) % list.length];
  }
  function detailHtml(m) {
    const r = rankOf(m.rank), n = numbering[m.id];
    const [main] = roleOf(m);
    const prev = stepModel(m, -1), next = stepModel(m, 1);
    const songs = (m.songs || []).map((s, i) => {
      const [t, u, pick] = Array.isArray(s) ? s : [s];
      const [artist, ...rest] = String(t).split(' - ');
      const title = rest.length ? rest.join(' - ') : t;
      const by = rest.length ? artist : '';
      const body = `<span class="sq" aria-hidden="true" style="background:var(--${SONG_COLORS[i % 4]})"></span><span><b>${esc(title)}</b> <span class="by">${by ? '— ' + esc(by) : ''}</span></span>${pick ? '<span class="pick">いちばん推し</span>' : '<span></span>'}`;
      const ext = '<span class="ext" aria-hidden="true">↗</span><span class="sr">（外部サイトで開く）</span>';
      return `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${body.replace('</b>', '</b>' + ext)}</a>` : `<a>${body}</a>`}</li>`;
    }).join('');
    return `
      <div class="dlg__bar">
        <span>${n.no} ／ ${n.total}機種中</span>
        <div class="dlg__actions">
          <button type="button" class="dlg__share" data-share><svg aria-hidden="true" width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2v10M5 6l4-4 4 4M3 10v6h12v-6"/></svg><span class="lbl">リンクをコピー</span></button>
          <button type="button" class="dlg__close" data-close-modal><svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 2l10 10M12 2L2 12"/></svg><span class="lbl">閉じる</span><span class="lbl-sp">一覧へ</span></button>
        </div>
      </div>

      <section class="dlg__hero">
        <div class="dlg__photo" data-zoom>${matHtml(m, 'full', { dots: true, eager: true, sizes: '(max-width:720px) 100vw, 600px' })}
          ${PHOTOS[m.id] ? `<button type="button" class="zoom-btn" data-zoom aria-label="写真を拡大して表示"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 2H14v4.5M14 2l-5 5M6.5 14H2V9.5M2 14l5-5"/></svg><span>拡大</span></button>` : ''}</div>
        <div class="dlg__info">
          <div class="dlg__rankrow">
            <div class="dlg__rank${m.rank === 'S' ? ' is-S' : ''}${r.label.length > 2 ? ' is-sm' : ''}" style="--rk:var(--${main || 'none'})">${r.label}</div>
            <div class="dlg__spec">${esc(m.brand)}<br>${esc(m.spec || m.drivers)}</div>
          </div>
          <h2 class="name dlg__name" id="dlgTitle">${nameHtml(m)}</h2>
          <p class="dlg__catch">${esc(m.catch)}</p>
          ${m.lead ? `<p class="dlg__lead">${esc(m.lead)}</p>` : ''}
          <div class="chips">${roleChips(m)}<span>${esc(m.genre || '')}</span></div>
        </div>
      </section>

      ${m.tone ? `<section class="dsec"><h3 class="label">TONE<small>音の印象</small></h3><div class="tone">${TONE.map(([k, h, c]) => `<div><h3 style="background:var(--${c})">${h}</h3><p>${esc(m.tone[k])}</p></div>`).join('')}</div></section>` : ''}

      ${tempoHtml(m)}

      <section class="dsec likes">
        <div><h3 class="label">LIKE<small>好きなところ</small></h3><ol class="nlist nlist--good">${(m.good || []).map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ol></div>
        <div><h3 class="label">HMM<small>気になるところ</small></h3><ol class="nlist nlist--bad">${(m.bad || []).map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ol>
        ${m.fit ? `<p class="fit"><b>装着感</b>${esc(m.fit)}</p>` : ''}</div>
      </section>

      ${m.verdict ? `<section class="verdict"><h3 class="label">VERDICT<small>ひとことで言うと</small></h3><p><span>${verdictHtml(m.verdict)}</span></p></section>` : ''}

      <div class="dlg__lists">
        ${songs ? `<div><h3 class="label">PLAYLIST<small>これで聴いてほしい</small></h3><ol class="playlist" style="margin-top:12px">${songs}</ol></div>` : ''}
        <div>
          ${(m.related || []).length ? `<h3 class="label">VS<small>比べるなら</small></h3><div class="vs" style="margin-top:12px">${m.related.map(relatedHtml).join('')}</div>` : ''}
          ${m.setup ? `<h3 class="label" style="margin-top:28px">SETUP<small>試聴環境</small></h3><p class="setup" style="margin-top:8px">${esc(m.setup)}</p>` : ''}
          ${(m.log || []).length ? `<details class="log"><summary>検証ログ（リファレンス曲での比較）</summary><div class="log__body">${m.log.map(([h, t]) => `<h4>${esc(h)}</h4><p>${esc(t)}</p>`).join('')}</div></details>` : ''}
        </div>
      </div>

      <div class="dlg__foot">
        <button type="button" class="outline-btn" style="width:100%" data-share><svg aria-hidden="true" width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2v10M5 6l4-4 4 4M3 10v6h12v-6"/></svg>この機種をシェア</button>
        <nav class="pager" aria-label="前後の機種">
          <a href="#${prev.id}" data-goto="${prev.id}"><span class="p-label">← 前　${numbering[prev.id].no}</span><b>${nameHtml(prev)}</b></a>
          <a href="#${next.id}" data-goto="${next.id}" class="next"><span class="p-label">次　${numbering[next.id].no} →</span><b>${nameHtml(next)}</b></a>
        </nav>
        <p class="swipe-hint">左右にスワイプしても移動できます</p>
      </div>`;
  }

  function showModal(m) {
    const modal = $('#modal'), panel = $('#modalPanel');
    const wasHidden = modal.hidden;
    if (wasHidden) lastFocus = document.activeElement;
    panel.innerHTML = detailHtml(m);
    panel.setAttribute('aria-label', `${m.name} の詳細`);
    // 強調（色の影）はその機種の主の役割の色。役割なしは未分類の色
    panel.style.setProperty('--emph', `var(--${roleOf(m)[0] || 'none'})`);
    modal.hidden = false;
    modal.scrollTop = 0;
    lock(true);
    panel.focus({ preventScroll: true });
    document.title = `${m.name} — メタル脳`;
  }
  function hideModal() {
    const modal = $('#modal');
    if (modal.hidden) return;
    const id = location.hash.slice(1);
    modal.hidden = true;
    $('#modalPanel').innerHTML = '';
    lock(false);
    document.title = 'メタル脳 — オパビのイヤホン帳';
    const back = (id && $(`[data-open="${CSS.escape(id)}"]`)) || lastFocus;
    if (back && back.focus) back.focus({ preventScroll: false });
  }
  // 先に画面を閉じてから履歴を整える（埋め込み表示などで back が外側に吸われても1回で閉じる）
  const clearHash = () => history.replaceState(null, '', location.pathname + location.search);
  function closeModal() {
    const id = location.hash.slice(1);
    hideModal();
    if (openedInPage) {
      openedInPage = false;
      history.back();
      // back が効かなかった（ハッシュが残った）ときは直接消す
      setTimeout(() => { if (location.hash.slice(1) === id) clearHash(); }, 350);
    } else {
      clearHash();
    }
  }
  function gotoModel(id) {
    history.replaceState(null, '', '#' + id);
    route();
  }
  function bindModal() {
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-open]');
      if (a && !e.metaKey && !e.ctrlKey) openedInPage = true;
    });
    $('#modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) return closeModal();
      if (e.target.closest('[data-close-modal]')) return closeModal();
      const g = e.target.closest('[data-goto]');
      if (g) { e.preventDefault(); return gotoModel(g.dataset.goto); }
      if (e.target.closest('[data-share]')) return share();
      if (e.target.closest('[data-zoom]')) { const cur = byId[location.hash.slice(1)]; if (cur) openLightbox(cur); }
    });
    document.addEventListener('keydown', e => {
      // ← / → で前後の機種へ（詳細だけが開いているとき）
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !$('#modal').hidden &&
          $('#lightbox').hidden && $('#sheet').hidden && $('#copyBox').hidden &&
          !e.altKey && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''))) {
        const cur = byId[location.hash.slice(1)];
        if (cur) {
          e.preventDefault();
          gotoModel(stepModel(cur, e.key === 'ArrowRight' ? 1 : -1).id);
        }
        return;
      }
      if (e.key !== 'Escape') return;
      if (!$('#copyBox').hidden) return hideCopyBox();
      if (!$('#lightbox').hidden) return closeLightbox();
      if (!$('#sheet').hidden) return closeSheet();
      if (!$('#modal').hidden) closeModal();
    });
    // 左右スワイプで前後の機種へ
    let sx = 0, sy = 0, st = 0;
    const panel = $('#modalPanel');
    panel.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, { passive: true });
    panel.addEventListener('touchend', e => {
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Date.now() - st > 600 || Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      const m = byId[location.hash.slice(1)]; if (!m) return;
      gotoModel(stepModel(m, dx < 0 ? 1 : -1).id);
    }, { passive: true });
  }

  // ---------- 写真の拡大表示 ----------
  let zoomReturn = null;
  // 開くときに履歴を1段積み（URL は変えない）、ブラウザの「戻る」で拡大表示だけ閉じられるようにする
  const isLbState = () => !!(history.state && history.state.lightbox);
  function openLightbox(m) {
    const p = PHOTOS[m.id]; if (!p) return;
    const w = p.full[p.full.length - 1];
    const img = $('#lightboxImg');
    img.src = `img/${m.id}-full-${w}.webp`;
    img.alt = `${m.brand} ${m.name}`;
    zoomReturn = document.activeElement;
    $('#lightbox').hidden = false;
    $('#lightbox').focus();
    try { history.pushState({ lightbox: true }, '', location.href); } catch (_) {}
  }
  function hideLightbox() {
    if ($('#lightbox').hidden) return;
    $('#lightbox').hidden = true;
    $('#lightboxImg').removeAttribute('src');
    const back = zoomReturn && document.contains(zoomReturn) ? zoomReturn : $('.zoom-btn');
    if (back) back.focus();
  }
  // ×・背景・Esc で閉じるときは、積んだ履歴を戻して取り消す
  function closeLightbox() {
    hideLightbox();
    if (isLbState()) history.back();
  }
  function bindLightbox() {
    window.addEventListener('popstate', () => { if (!isLbState()) hideLightbox(); });
    $('#lightbox').addEventListener('click', e => {
      if (e.target.closest('[data-close-lightbox]') || e.target === e.currentTarget) closeLightbox();
    });
  }

  async function share() {
    const url = location.href;
    const m = byId[location.hash.slice(1)];
    const title = m ? `${m.name}｜メタル脳 — オパビのイヤホン帳` : document.title;
    const coarse = matchMedia('(pointer:coarse)').matches;
    if (coarse && navigator.share) {
      try { await navigator.share({ title, url }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; /* 共有不可の環境はコピーに切り替え */ }
    }
    try { await navigator.clipboard.writeText(url); toast('リンクをコピーしました'); }
    catch (_) { showCopyBox(url); }
  }
  // コピーに失敗したら、URLを選択した状態で見せて手でコピーしてもらう
  function showCopyBox(url) {
    const box = $('#copyBox'), input = $('#copyBoxInput');
    input.value = url;
    box.hidden = false;
    input.focus();
    input.select();
    try { input.setSelectionRange(0, url.length); } catch (_) {}
  }
  function hideCopyBox() { $('#copyBox').hidden = true; }
  $('#copyBoxClose').addEventListener('click', hideCopyBox);
  $('#copyBoxInput').addEventListener('focus', e => e.target.select());

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2000);
  }

  // ---------- スクロール固定 ----------
  function lock(on) { document.documentElement.classList.toggle('is-locked', on); }

  // ---------- 台帳の切り替え・ルーティング ----------
  function showLedger(which) {
    const wish = which === 'wish';
    $('#viewOwned').hidden = wish;
    $('#viewWish').hidden = !wish;
    $('#tabOwned').setAttribute('aria-selected', String(!wish));
    $('#tabWish').setAttribute('aria-selected', String(wish));
    if (wish) document.dispatchEvent(new Event('wishshown'));
  }
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === 'wish') { showLedger('wish'); hideModal(); return; }
    showLedger('owned');
    const m = byId[h];
    if (m && isOpenable(m)) showModal(m);
    else hideModal();
  }
  function bindLedger() {
    $('.ledger').addEventListener('click', e => {
      const b = e.target.closest('[data-ledger]'); if (!b) return;
      if (b.dataset.ledger === 'wish') location.hash = 'wish';
      else { history.pushState(null, '', location.pathname + location.search); route(); }
    });
    window.addEventListener('hashchange', () => {
      if (!byId[location.hash.slice(1)]) openedInPage = false;
      route();
    });
  }

  // ---------- 白地／黒地の切り替え ----------
  // 初期値は端末（またはアプリ）の設定。ボタンで選んだらその端末に保存する。
  const root = document.documentElement;
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  const currentTheme = () => root.dataset.theme || (darkMQ.matches ? 'dark' : 'light');
  function syncThemeBtn() {
    const dark = currentTheme() === 'dark';
    $('#themeLabel').textContent = dark ? '白地にする' : '黒地にする';
    $('#themeBtn').setAttribute('aria-pressed', String(dark));
  }
  try { const saved = localStorage.getItem('theme'); if (saved === 'light' || saved === 'dark') root.dataset.theme = saved; } catch (_) {}
  $('#themeBtn').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (_) {}
    syncThemeBtn();
  });
  darkMQ.addEventListener && darkMQ.addEventListener('change', syncThemeBtn);
  syncThemeBtn();

  // ---------- 起動 ----------
  $('#countOwned').textContent = MODELS.length;
  $('#countWish').textContent = WISHLIST.length;
  renderHero();
  renderTiers();
  renderWish();
  bindTabs();
  bindFilter();
  bindSearch();
  bindModal();
  bindLightbox();
  bindLedger();
  applyFilter();
  route();
})();
