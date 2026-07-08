const Mode_Library = (() => {
  const SUBJECTS = [
    { code: 'ALW', name: 'Air Law' },
    { code: 'NAV', name: 'Navigation' },
    { code: 'OPC', name: 'Operational Procedures' },
    { code: 'MET', name: 'Meteorology' },
  ];
  const PDFS = {
    ALW: [{ title: 'Oxford ATPL Book 1 — Air Law', file: 'ALW-oxford-book1-air-law.pdf', size: '11.3 MB' }],
    NAV: [{ title: 'Oxford ATPL Book 10 — General Navigation', file: 'NAV-oxford-book10-general-navigation.pdf', size: '35.2 MB' }],
    OPC: [
      { title: 'ATPL Book 12 — Operational Procedures', file: 'OPC-book12-operational-procedures.pdf', size: '3.1 MB' },
      { title: 'Oxford ATPL Book 12 — Operational Procedures', file: 'OPC-oxford-book12-operational-procedures.pdf', size: '20.4 MB' },
    ],
    MET: [{ title: 'ICAO Annex 3 — Meteorological Service for International Air Navigation', file: 'MET-icao-annex-3.pdf', size: '6.3 MB' }],
  };
  const PDF_BASE = 'data/textbook-pdfs/';
  const PAGE_SIZE = 40;
  let state = { subject: null, chunks: [], filtered: [], shown: 0, query: '' };

  function render(container, params = {}) {
    if (params.subject) {
      openSubject(container, params.subject);
    } else {
      renderIndex(container);
    }
  }

  function renderIndex(container) {
    container.innerHTML = `
      <div class="eyebrow">Reference</div>
      <h1>Library</h1>
      <p>The course textbooks behind Gemini's explanations, extracted and made readable in-app. This is the same content the AI Tutor draws on when it explains a question in these subjects.</p>

      <div class="grid grid-2" style="margin-top:8px;" id="lib-cards">
        ${SUBJECTS.map(s => `
          <div class="card subject-card" data-open="${s.code}" style="cursor:pointer;">
            <div class="subject-info">
              <div class="subject-code">${s.code}</div>
              <div class="subject-name">${UI.escapeHtml(s.name)}</div>
              <div class="subject-meta" id="lib-meta-${s.code}">Loading…</div>
            </div>
            <button class="btn btn-sm">Open →</button>
          </div>
        `).join('')}
      </div>

      <div class="card" style="margin-top:16px;">
        <p style="margin:0;">Subjects without a textbook here (AGK, COM, FPP, HPL, POF) aren't missing anything broken — those source PDFs just weren't book-format material, so Gemini answers those from general aviation knowledge instead.</p>
      </div>
    `;

    container.querySelectorAll('[data-open]').forEach(card => {
      card.addEventListener('click', () => openSubject(container, card.dataset.open));
    });

    // fill in chunk counts / book titles async
    SUBJECTS.forEach(async s => {
      const chunks = await Textbook.loadSubject(s.code);
      const meta = document.getElementById(`lib-meta-${s.code}`);
      if (!meta) return;
      if (!chunks || !chunks.length) { meta.textContent = 'Unavailable'; return; }
      const books = [...new Set(chunks.map(c => c.book))];
      meta.textContent = `${books.length > 1 ? books.length + ' books' : books[0]} · ${chunks.length} sections`;
    });
  }

  async function openSubject(container, subjectCode) {
    container.innerHTML = `<div class="empty-state">Loading ${UI.escapeHtml(subjectCode)} library…</div>`;
    const chunks = await Textbook.loadSubject(subjectCode);
    const subjMeta = SUBJECTS.find(s => s.code === subjectCode);

    if (!chunks || !chunks.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">📘</div>No textbook available for this subject.</div>
        <button class="btn" id="lib-back">← Back to Library</button>`;
      container.querySelector('#lib-back').addEventListener('click', () => renderIndex(container));
      return;
    }

    state = { subject: subjectCode, chunks, filtered: chunks, shown: PAGE_SIZE, query: '' };
    const books = [...new Set(chunks.map(c => c.book))];
    const pdfs = PDFS[subjectCode] || [];

    container.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="lib-back">← Back to Library</button>
      <div class="eyebrow" style="margin-top:10px;">${books.join(' · ')}</div>
      <h1>${UI.escapeHtml(subjMeta.name)}</h1>

      ${pdfs.length ? `
      <div class="card" style="margin-bottom:16px;">
        <h2>Original textbook${pdfs.length > 1 ? 's' : ''}</h2>
        <p>The searchable sections below are extracted from these — open the original if you want the real page layout, diagrams, and figures.</p>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${pdfs.map(p => `
            <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--surface-alt); border:1px solid var(--border); border-radius:var(--radius);">
              <span style="flex:1; font-size:13.5px;">📄 ${UI.escapeHtml(p.title)} <span class="hint" style="display:inline;">(${p.size})</span></span>
              <button class="btn btn-sm" data-view-pdf="${p.file}">View</button>
              <a class="btn btn-sm" href="${PDF_BASE}${p.file}" download>⬇ Download</a>
            </div>
          `).join('')}
        </div>
        <div id="lib-pdf-viewer" style="display:none; margin-top:14px;"></div>
      </div>
      ` : ''}

      <div class="filters">
        <input type="search" id="lib-search" placeholder="Search this book…" style="max-width:340px;">
        <span class="hint" id="lib-count" style="align-self:center;"></span>
      </div>
      <div id="lib-content"></div>
      <div style="text-align:center; margin-top:18px;">
        <button class="btn" id="lib-more">Load more</button>
      </div>
    `;

    container.querySelectorAll('[data-view-pdf]').forEach(btn => {
      btn.addEventListener('click', () => {
        const viewer = container.querySelector('#lib-pdf-viewer');
        const src = `${PDF_BASE}${btn.dataset.viewPdf}`;
        viewer.style.display = 'block';
        viewer.innerHTML = `<iframe src="${src}" style="width:100%; height:70vh; border:1px solid var(--border); border-radius:var(--radius);"></iframe>`;
        viewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });

    container.querySelector('#lib-back').addEventListener('click', () => renderIndex(container));
    container.querySelector('#lib-more').addEventListener('click', () => {
      state.shown += PAGE_SIZE;
      renderContent(container);
    });

    let t;
    container.querySelector('#lib-search').addEventListener('input', e => {
      clearTimeout(t);
      const q = e.target.value;
      t = setTimeout(() => {
        state.query = q.trim().toLowerCase();
        state.filtered = state.query
          ? state.chunks.filter(c => c.text.toLowerCase().includes(state.query))
          : state.chunks;
        state.shown = PAGE_SIZE;
        renderContent(container);
      }, 250);
    });

    renderContent(container);
  }

  function highlight(text, query) {
    const safe = UI.escapeHtml(text);
    if (!query) return safe;
    const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp(`(${esc})`, 'ig'), '<mark style="background:var(--amber); color:#1B1204; border-radius:2px;">$1</mark>');
  }

  function renderContent(container) {
    const content = container.querySelector('#lib-content');
    const countEl = container.querySelector('#lib-count');
    const moreBtn = container.querySelector('#lib-more');
    const list = state.filtered;
    const visible = list.slice(0, state.shown);

    countEl.textContent = state.query
      ? `${list.length} matching section${list.length === 1 ? '' : 's'}`
      : `${list.length} sections total`;

    if (!visible.length) {
      content.innerHTML = `<div class="empty-state"><div class="icon">🔍</div>No sections match "${UI.escapeHtml(state.query)}".</div>`;
      moreBtn.style.display = 'none';
      return;
    }

    content.innerHTML = visible.map(c => `
      <div class="card" style="margin-top:12px;">
        <div class="eyebrow">${UI.escapeHtml(c.book)} · p.${c.pageStart}${c.pageEnd !== c.pageStart ? '-' + c.pageEnd : ''}</div>
        <p style="color:var(--text); margin-top:8px; white-space:pre-wrap;">${highlight(c.text, state.query)}</p>
      </div>
    `).join('');

    moreBtn.style.display = state.shown < list.length ? 'inline-flex' : 'none';
  }

  return { render };
})();
