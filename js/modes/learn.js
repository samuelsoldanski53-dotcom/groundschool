const Mode_Learn = (() => {
  let queue = [];
  let idx = 0;
  let answered = false;
  let selectedIndex = null;
  let currentFilters = { subject: '', source: 'black', search: '' };

  function buildQueue() {
    let list = DataStore.all();
    if (currentFilters.subject) list = list.filter(q => q.subject === currentFilters.subject);
    if (currentFilters.source === 'black') list = list.filter(q => q.scored);
    if (currentFilters.source === 'blue') list = list.filter(q => !q.scored);
    if (currentFilters.search) {
      const t = currentFilters.search.toLowerCase();
      list = list.filter(q => q.text.toLowerCase().includes(t));
    }
    list.sort((a, b) => a.subject.localeCompare(b.subject) || a.number - b.number);
    return list;
  }

  function render(container, params = {}) {
    if (params.subject) currentFilters.subject = params.subject;
    queue = buildQueue();
    idx = 0;
    answered = false;
    selectedIndex = null;
    container.innerHTML = shell();
    bindFilterEvents(container);
    renderQuestion(container);
  }

  function shell() {
    const subjects = DataStore.getSubjects();
    return `
      <div class="eyebrow">Ultra Revision</div>
      <h1>Learn Mode</h1>
      <p>Work through questions one at a time, exactly as written in the source material, with full Gemini tutoring after each answer.</p>

      <div class="filters">
        <select id="lf-subject">
          <option value="">All subjects</option>
          ${subjects.map(s => `<option value="${s.code}" ${currentFilters.subject===s.code?'selected':''}>${UI.escapeHtml(s.name)}</option>`).join('')}
        </select>
        <select id="lf-source">
          <option value="black" ${currentFilters.source==='black'?'selected':''}>Scored (answer key available)</option>
          <option value="blue" ${currentFilters.source==='blue'?'selected':''}>Reference only (no answer key)</option>
          <option value="all" ${currentFilters.source==='all'?'selected':''}>All questions</option>
        </select>
        <input type="search" id="lf-search" placeholder="Search keyword…" value="${UI.escapeHtml(currentFilters.search)}">
      </div>

      <div id="learn-stage"></div>
    `;
  }

  function bindFilterEvents(container) {
    container.querySelector('#lf-subject').addEventListener('change', e => {
      currentFilters.subject = e.target.value; refresh(container);
    });
    container.querySelector('#lf-source').addEventListener('change', e => {
      currentFilters.source = e.target.value; refresh(container);
    });
    let t;
    container.querySelector('#lf-search').addEventListener('input', e => {
      clearTimeout(t);
      t = setTimeout(() => { currentFilters.search = e.target.value; refresh(container); }, 300);
    });
  }

  function refresh(container) {
    queue = buildQueue();
    idx = 0; answered = false; selectedIndex = null;
    renderQuestion(container);
  }

  function renderQuestion(container) {
    const stage = container.querySelector('#learn-stage');
    if (!queue.length) {
      stage.innerHTML = `<div class="empty-state"><div class="icon">◐</div>No questions match these filters.</div>`;
      return;
    }
    const q = queue[idx];
    Store.pushRecent(q.id);
    const prog = Store.getQuestionProgress(q.id);

    stage.innerHTML = `
      <div class="card question-box">
        <div class="q-meta">
          <span class="tag">${UI.escapeHtml(q.subjectName)} · #${q.number}</span>
          ${q.scored ? '<span class="tag tag-scored">✓ Answer key</span>' : '<span class="tag tag-unscored">Reference only</span>'}
          ${q.points ? `<span class="tag">${q.points} pt</span>` : ''}
          <span style="margin-left:auto; display:flex; gap:6px;">
            <button class="btn btn-ghost btn-sm" id="bm-btn" title="Bookmark">${prog.bookmarked ? '★ Bookmarked' : '☆ Bookmark'}</button>
            <button class="btn btn-ghost btn-sm" id="fav-btn" title="Favorite">${prog.favorite ? '♥ Favorite' : '♡ Favorite'}</button>
          </span>
        </div>
        <div class="q-text">${idx+1}. ${UI.escapeHtml(q.text)}</div>
        <div class="options" id="options-wrap">
          ${q.options.map((o, i) => `
            <button class="option" data-idx="${i}">
              <span class="option-letter">${UI.letter(i)}</span>
              <span>${UI.escapeHtml(o)}</span>
            </button>
          `).join('')}
        </div>
        <div id="feedback-slot"></div>
        <div class="qa-controls">
          <button class="btn btn-ghost btn-sm" id="prev-btn" ${idx===0?'disabled':''}>← Previous</button>
          <span class="hint" style="font-family:var(--font-mono);">${idx+1} / ${queue.length}</span>
          <div class="spacer"></div>
          <button class="btn btn-sm" id="skip-btn">Skip <kbd>→</kbd></button>
        </div>
      </div>
    `;

    stage.querySelectorAll('.option').forEach(btn => {
      btn.addEventListener('click', () => selectOption(stage, q, parseInt(btn.dataset.idx)));
    });
    stage.querySelector('#prev-btn').addEventListener('click', () => { idx = Math.max(0, idx-1); answered=false; selectedIndex=null; renderQuestion(container); });
    stage.querySelector('#skip-btn').addEventListener('click', () => nextQuestion(container));
    stage.querySelector('#bm-btn').addEventListener('click', () => { Store.toggleFlag(q.id, 'bookmarked'); renderQuestion(container); });
    stage.querySelector('#fav-btn').addEventListener('click', () => { Store.toggleFlag(q.id, 'favorite'); renderQuestion(container); });
  }

  function selectOption(stage, q, i) {
    if (answered) return;
    answered = true;
    selectedIndex = i;
    const isCorrect = q.scored ? (i === q.correctIndex) : null;
    if (q.scored) Store.recordAttempt(q.id, isCorrect);

    stage.querySelectorAll('.option').forEach((btn, bi) => {
      btn.disabled = true;
      if (q.scored) {
        if (bi === q.correctIndex) btn.classList.add('correct');
        if (bi === i && i !== q.correctIndex) btn.classList.add('incorrect');
      } else if (bi === i) {
        btn.classList.add('selected');
      }
    });

    const feedback = stage.querySelector('#feedback-slot');
    feedback.innerHTML = `
      <div class="feedback-panel">
        <div class="feedback-header">
          ${q.scored ? `<span class="result-badge ${isCorrect?'correct':'incorrect'}">${isCorrect ? '✅ Correct' : '❌ Incorrect'}</span>` : '<span class="result-badge" style="color:var(--text-dim);">No answer key for this question — here for extra practice</span>'}
        </div>
        <div class="explain-block">
          <h3>🧠 Gemini tutor</h3>
          <div class="body explain-loading" id="explain-body">Loading explanation…</div>
          ${Textbook.hasTextbook(q.subject) ? `<button class="btn btn-ghost btn-sm" id="open-library-btn" style="margin-top:10px;">📘 Browse ${UI.escapeHtml(q.subjectName)} textbook</button>` : ''}
        </div>
        <div class="qa-controls" style="margin-top:16px;">
          <button class="btn btn-primary btn-sm" id="next-q-btn">Next question <kbd>→</kbd></button>
          <button class="btn btn-ghost btn-sm" id="ask-more-btn">Ask a follow-up in AI Tutor</button>
        </div>
      </div>
    `;
    feedback.querySelector('#next-q-btn').addEventListener('click', () => nextQuestion(stage.closest('#content')));
    feedback.querySelector('#ask-more-btn').addEventListener('click', () => App.navigate('tutor', { questionId: q.id }));
    const libBtn = feedback.querySelector('#open-library-btn');
    if (libBtn) libBtn.addEventListener('click', () => App.navigate('library', { subject: q.subject }));

    loadExplanation(q, i, isCorrect);
  }

  async function loadExplanation(q, selIdx, isCorrect) {
    const el = document.getElementById('explain-body');
    if (!el) return;
    const settings = UI.requireApiKey();
    if (!settings) { el.textContent = 'Add a Gemini API key in Settings to enable AI explanations.'; el.classList.remove('explain-loading'); return; }
    try {
      let textbookContext = '';
      if (Textbook.hasTextbook(q.subject)) {
        const chunks = await Textbook.findRelevant(q.subject, q.text + ' ' + q.options.join(' '), 3);
        textbookContext = Textbook.formatContext(chunks);
      }
      const text = await Gemini.explainQuestion({
        apiKey: settings.geminiKey, model: settings.geminiModel,
        question: q, userAnswerIndex: selIdx, isCorrect, textbookContext,
      });
      el.textContent = text;
      el.classList.remove('explain-loading');
    } catch (e) {
      el.textContent = `Couldn't reach Gemini: ${e.message}`;
      el.classList.remove('explain-loading');
    }
  }

  function nextQuestion(container) {
    if (idx < queue.length - 1) { idx++; answered=false; selectedIndex=null; renderQuestion(container); }
    else { UI.toast('You\'ve reached the end of this set.', 'success'); }
  }

  document.addEventListener('keydown', (e) => {
    if (App.currentRoute() !== 'learn') return;
    if (e.key === 'ArrowRight') {
      const c = document.getElementById('content');
      if (answered) nextQuestion(c);
    }
    if (!answered && ['1','2','3','4','5','6','7'].includes(e.key)) {
      const stage = document.getElementById('learn-stage');
      const btn = stage?.querySelector(`.option[data-idx="${parseInt(e.key)-1}"]`);
      if (btn) btn.click();
    }
  });

  return { render };
})();
