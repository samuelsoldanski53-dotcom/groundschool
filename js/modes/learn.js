const Mode_Learn = (() => {
  let queue = [];
  let idx = 0;
  let answered = false;
  let currentFilters = { subject: '', topic: '', source: 'black', search: '' };

  function buildQueue() {
    let list = DataStore.all();
    if (currentFilters.topic) list = list.filter(q => q.topic === currentFilters.topic);
    else if (currentFilters.subject) list = list.filter(q => q.subject === currentFilters.subject);
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
    currentFilters.topic = params.topic || '';
    queue = buildQueue();
    idx = 0;
    answered = false;
    container.innerHTML = shell(params);
    if (currentFilters.topic) {
      renderLessonPanel(container, currentFilters.topic);
      const backBtn = container.querySelector('#learn-back-topic');
      if (backBtn) backBtn.addEventListener('click', () => App.navigate('library', { view: 'topic', topic: currentFilters.topic }));
    } else {
      bindFilterEvents(container);
      const genBtn = container.querySelector('#gen-practice-btn');
      if (genBtn) genBtn.addEventListener('click', () => generatePractice(container));
    }
    renderQuestion(container);
  }

  async function renderLessonPanel(container, topicId) {
    const slot = container.querySelector('#lesson-panel');
    if (!slot) return;
    const topic = DataStore.getTopic(topicId);
    if (!topic) { slot.innerHTML = ''; return; }
    const chunks = await Textbook.getTopicChunks(topic.subject, topicId);
    if (!chunks.length) {
      slot.innerHTML = `<div class="card" style="border-style:dashed;"><p class="subject-meta" style="margin:0;">No lesson text on file for this topic yet — this is a syllabus-based topic without a linked textbook.</p></div>`;
      return;
    }
    slot.innerHTML = `
      <div class="card lesson-card">
        <div class="eyebrow">Lesson · ${UI.escapeHtml(chunks[0].book)}</div>
        <details ${chunks.length <= 2 ? 'open' : ''}>
          <summary style="cursor:pointer; font-weight:600; margin-bottom:8px;">Read the lesson (pages ${chunks[0].pageStart}–${chunks[chunks.length-1].pageEnd})</summary>
          <div class="lesson-text" style="max-height:420px; overflow-y:auto; font-size:13.5px; line-height:1.6; white-space:pre-wrap; margin-top:10px;">${chunks.map(c => UI.escapeHtml(c.text)).join('\n\n')}</div>
        </details>
      </div>
    `;
  }

  function shell(params = {}) {
    if (currentFilters.topic) {
      const topic = DataStore.getTopic(currentFilters.topic);
      return `
        <div class="eyebrow">${topic ? UI.escapeHtml(topic.subject) : ''} · Learn</div>
        <h1>${topic ? UI.escapeHtml(topic.title) : 'Learn'}</h1>
        <div class="qa-controls" style="justify-content:flex-start; margin-bottom:14px;">
          <button class="btn btn-ghost btn-sm" id="learn-back-topic">← Back to topic</button>
        </div>
        <div id="lesson-panel" style="margin-bottom:18px;"></div>
        <div id="learn-stage"></div>
      `;
    }
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

      ${currentFilters.subject && Textbook.hasTextbook(currentFilters.subject) ? `
      <div class="card" style="margin-bottom:16px; border-style:dashed;">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <div style="flex:1; min-width:200px;">
            <div class="subject-name">🤖 AI practice question</div>
            <div class="subject-meta">Gemini writes a fresh question grounded in the textbook — clearly separate from the official bank above, and not counted in your mastery stats.</div>
          </div>
          <button class="btn btn-sm" id="gen-practice-btn">Generate one</button>
        </div>
        <div id="practice-slot"></div>
      </div>
      ` : ''}

      <div id="learn-stage"></div>
    `;
  }

  function bindFilterEvents(container) {
    container.querySelector('#lf-subject').addEventListener('change', e => {
      currentFilters.subject = e.target.value; render(container);
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
    idx = 0; answered = false;
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
    answered = false;

    stage.innerHTML = `
      <div class="card question-box">
        <div class="q-meta">
          <span class="tag">${UI.escapeHtml(q.subjectName)} · #${q.number}</span>
          ${q.scored ? '<span class="tag tag-scored">✓ Answer key</span>' : '<span class="tag tag-unscored">Reference only</span>'}
          ${q.type === 'short' ? '<span class="tag">short answer</span>' : ''}
          ${q.points ? `<span class="tag">${q.points} pt</span>` : ''}
          <span style="margin-left:auto; display:flex; gap:6px;">
            <button class="btn btn-ghost btn-sm" id="bm-btn" title="Bookmark">${prog.bookmarked ? '★ Bookmarked' : '☆ Bookmark'}</button>
            <button class="btn btn-ghost btn-sm" id="fav-btn" title="Favorite">${prog.favorite ? '♥ Favorite' : '♡ Favorite'}</button>
          </span>
        </div>
        <div class="q-text">${idx+1}. ${UI.escapeHtml(q.text)}</div>
        <div id="answer-wrap">
          ${q.type === 'short' ? renderShortAnswerInput() : renderOptions(q)}
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

    if (q.type === 'short') {
      const submitBtn = stage.querySelector('#short-submit');
      const textarea = stage.querySelector('#short-input');
      submitBtn.addEventListener('click', () => submitShortAnswer(stage, q, textarea.value.trim()));
      textarea.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitShortAnswer(stage, q, textarea.value.trim());
      });
    } else {
      stage.querySelectorAll('.option').forEach(btn => {
        btn.addEventListener('click', () => selectOption(stage, q, parseInt(btn.dataset.idx)));
      });
    }
    stage.querySelector('#prev-btn').addEventListener('click', () => { idx = Math.max(0, idx-1); renderQuestion(container); });
    stage.querySelector('#skip-btn').addEventListener('click', () => nextQuestion(container));
    stage.querySelector('#bm-btn').addEventListener('click', () => { Store.toggleFlag(q.id, 'bookmarked'); renderQuestion(container); });
    stage.querySelector('#fav-btn').addEventListener('click', () => { Store.toggleFlag(q.id, 'favorite'); renderQuestion(container); });
  }

  function renderOptions(q) {
    return `
      <div class="options" id="options-wrap">
        ${q.options.map((o, i) => `
          <button class="option" data-idx="${i}">
            <span class="option-letter">${UI.letter(i)}</span>
            <span>${UI.escapeHtml(o)}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  function renderShortAnswerInput() {
    return `
      <div class="free-answer-input">
        <textarea id="short-input" placeholder="Type your answer… (Ctrl/Cmd+Enter to submit)" rows="3"></textarea>
        <button class="btn btn-primary btn-sm" id="short-submit" style="margin-top:8px;">Submit answer</button>
      </div>
    `;
  }

  function selectOption(stage, q, i) {
    if (answered) return;
    answered = true;
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

    renderFeedbackShell(stage, q, q.scored ? (isCorrect ? 'correct' : 'incorrect') : null);
    loadExplanation(q, i, isCorrect);
  }

  async function submitShortAnswer(stage, q, answerText) {
    if (answered || !answerText) return;
    answered = true;
    stage.querySelector('#short-submit').disabled = true;
    stage.querySelector('#short-input').disabled = true;

    renderFeedbackShell(stage, q, 'grading');
    const el = document.getElementById('explain-body');
    const settings = UI.requireApiKey();
    if (!settings) {
      if (el) { el.textContent = 'Add a Gemini API key in Settings to grade short-answer questions.'; el.classList.remove('explain-loading'); }
      return;
    }
    try {
      let textbookContext = '';
      if (Textbook.hasTextbook(q.subject)) {
        const chunks = await Textbook.findRelevant(q.subject, q.text, 3);
        textbookContext = Textbook.formatContext(chunks);
      }
      const result = await Gemini.gradeFreeAnswer({
        apiKey: settings.geminiKey, model: settings.geminiModel,
        question: q, studentAnswer: answerText, textbookContext,
      });
      const isCorrect = result.grade === 'CORRECT';
      Store.recordAttempt(q.id, isCorrect);
      updateFeedbackBadge(stage, result.grade);
      if (el) { el.textContent = result.explanation; el.classList.remove('explain-loading'); }
    } catch (e) {
      if (el) { el.textContent = `Couldn't reach Gemini: ${e.message}`; el.classList.remove('explain-loading'); }
    }
  }

  function renderFeedbackShell(stage, q, status) {
    const feedback = stage.querySelector('#feedback-slot');
    const badge = status === 'grading'
      ? '<span class="result-badge" style="color:var(--text-dim);">Grading…</span>'
      : status === 'correct' ? '<span class="result-badge correct">✅ Correct</span>'
      : status === 'incorrect' ? '<span class="result-badge incorrect">❌ Incorrect</span>'
      : '<span class="result-badge" style="color:var(--text-dim);">No answer key for this question — here for extra practice</span>';

    feedback.innerHTML = `
      <div class="feedback-panel">
        <div class="feedback-header" id="feedback-header">${badge}</div>
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
  }

  function updateFeedbackBadge(stage, grade) {
    const header = stage.querySelector('#feedback-header');
    if (!header) return;
    if (grade === 'CORRECT') header.innerHTML = '<span class="result-badge correct">✅ Correct</span>';
    else if (grade === 'PARTIAL') header.innerHTML = '<span class="result-badge" style="color:var(--amber);">◐ Partially correct</span>';
    else header.innerHTML = '<span class="result-badge incorrect">❌ Incorrect</span>';
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

  async function generatePractice(container) {
    const slot = container.querySelector('#practice-slot');
    const settings = UI.requireApiKey();
    if (!settings) return;
    slot.innerHTML = '<div class="explain-loading" style="margin-top:12px;">Writing a question…</div>';
    try {
      const subjectName = DataStore.getSubjects().find(s => s.code === currentFilters.subject)?.name || currentFilters.subject;
      const chunks = await Textbook.findRelevant(currentFilters.subject, currentFilters.search || subjectName, 2);
      const textbookContext = Textbook.formatContext(
        chunks.length ? chunks : (await Textbook.loadSubject(currentFilters.subject) || []).slice(0, 1)
      );
      const q = await Gemini.generatePracticeQuestion({
        apiKey: settings.geminiKey, model: settings.geminiModel, subjectName, textbookContext,
      });
      renderPracticeQuestion(slot, q);
    } catch (e) {
      slot.innerHTML = `<div class="body" style="color:var(--error); margin-top:12px;">${UI.escapeHtml(e.message)}</div>`;
    }
  }

  function renderPracticeQuestion(slot, q) {
    slot.innerHTML = `
      <div style="margin-top:14px; padding-top:14px; border-top:1px dashed var(--border);">
        <span class="tag" style="border-color:var(--cyan); color:var(--cyan);">🤖 AI-generated — not from an official bank</span>
        <div class="q-text" style="margin-top:10px;">${UI.escapeHtml(q.question)}</div>
        <div class="options">
          ${q.options.map((o, i) => `
            <button class="option" data-idx="${i}">
              <span class="option-letter">${UI.letter(i)}</span><span>${UI.escapeHtml(o)}</span>
            </button>`).join('')}
        </div>
        <div id="practice-feedback"></div>
      </div>
    `;
    slot.querySelectorAll('.option').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.idx);
        const correct = i === q.correctIndex;
        slot.querySelectorAll('.option').forEach((b, bi) => {
          b.disabled = true;
          if (bi === q.correctIndex) b.classList.add('correct');
          if (bi === i && !correct) b.classList.add('incorrect');
        });
        slot.querySelector('#practice-feedback').innerHTML = `
          <div class="feedback-panel">
            <span class="result-badge ${correct ? 'correct' : 'incorrect'}">${correct ? '✅ Correct' : '❌ Incorrect'}</span>
            <div class="body" style="margin-top:8px; font-size:13.5px;">${UI.escapeHtml(q.explanation)}</div>
          </div>
        `;
      });
    });
  }

  function nextQuestion(container) {
    if (idx < queue.length - 1) { idx++; renderQuestion(container); }
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
