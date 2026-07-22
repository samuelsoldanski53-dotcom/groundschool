const Mode_Quiz = (() => {
  let quiz = null; // { questions, answers: [], current, startedAt, flagged: Set }

  function render(container, params = {}) {
    if (params.topic) {
      const topic = DataStore.getTopic(params.topic);
      const pool = DataStore.byTopic(params.topic).filter(q => q.scored && q.type === 'mcq');
      container.innerHTML = `
        <div class="eyebrow">${topic ? UI.escapeHtml(topic.subject) : ''} · Topic Quiz</div>
        <h1>${topic ? UI.escapeHtml(topic.title) : 'Topic Quiz'}</h1>
        <p>${pool.length} question${pool.length === 1 ? '' : 's'} for this topic only.</p>
        <div class="qa-controls" style="justify-content:flex-start; gap:12px;">
          <button class="btn btn-ghost btn-sm" id="qz-back-topic">← Back to topic</button>
          <button class="btn btn-primary" id="qz-start-topic" ${pool.length ? '' : 'disabled'}>Start topic quiz</button>
        </div>
        <div id="qz-stage"></div>
      `;
      container.querySelector('#qz-back-topic').addEventListener('click', () => App.navigate('library', { view: 'topic', topic: params.topic }));
      const startBtn = container.querySelector('#qz-start-topic');
      if (startBtn) startBtn.addEventListener('click', () => startQuiz(container, { fixedPool: pool, returnTopic: params.topic }));
      return;
    }
    container.innerHTML = setupScreen(params.subject || '');
    bindSetup(container);
  }

  function setupScreen(preselectSubject) {
    const subjects = DataStore.getSubjects().filter(s =>
      DataStore.bySubjectCode(s.code).some(q => q.scored && q.type === 'mcq')
    );
    const history = Store.getQuizHistory().slice(0, 5);
    return `
      <div class="eyebrow">Ultra Revision</div>
      <h1>Quiz Mode</h1>
      <p>A quick scored quiz pulled straight from the answer-keyed question bank — original wording, original order of options.</p>

      <div class="grid grid-2" style="align-items:start;">
        <div class="card">
          <h2>New quiz</h2>
          <div class="field">
            <label>Subject</label>
            <select id="qz-subject">
              <option value="">Mixed — all subjects</option>
              ${subjects.map(s => `<option value="${s.code}" ${preselectSubject===s.code?'selected':''}>${UI.escapeHtml(s.name)} (${s.scoredCount})</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Number of questions</label>
            <select id="qz-count">
              <option value="10">10</option>
              <option value="20" selected>20</option>
              <option value="40">40</option>
              <option value="80">80</option>
            </select>
          </div>
          <div class="field">
            <label style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" id="qz-weak" style="width:auto;"> Prioritize my weak questions
            </label>
          </div>
          <div class="field">
            <label style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" id="qz-fresh" style="width:auto;"> Skip questions I've already mastered (last 3 correct)
            </label>
          </div>
          <button class="btn btn-primary btn-block" id="qz-start">Start quiz</button>
        </div>

        <div class="card">
          <h2>Recent results</h2>
          ${history.length ? history.map(h => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid var(--border); font-size:13px;">
              <span style="color:var(--text-dim);">${new Date(h.ts).toLocaleDateString()} · ${h.total} questions</span>
              <span style="font-family:var(--font-mono); font-weight:600; color:${h.pct>=75?'var(--success)':h.pct>=50?'var(--amber)':'var(--error)'};">${h.pct}%</span>
            </div>
          `).join('') : '<p>No quizzes yet — your history will show up here.</p>'}
        </div>
      </div>

      <div id="qz-stage"></div>
    `;
  }

  function bindSetup(container) {
    container.querySelector('#qz-start').addEventListener('click', () => {
      const subject = container.querySelector('#qz-subject').value;
      const count = parseInt(container.querySelector('#qz-count').value);
      const weak = container.querySelector('#qz-weak').checked;
      const fresh = container.querySelector('#qz-fresh').checked;
      startQuiz(container, { subject, count, weak, fresh });
    });
  }

  function masteryOk(qid) {
    const p = Store.getQuestionProgress(qid);
    return p.attempts >= 3 && p.lastResult === true;
  }

  function startQuiz(container, { subject, count, weak, fresh, fixedPool, returnTopic }) {
    let pool = fixedPool || DataStore.all().filter(q => q.scored && q.type === 'mcq');
    if (!fixedPool) {
      if (subject) pool = pool.filter(q => q.subject === subject);
      if (fresh) pool = pool.filter(q => !masteryOk(q.id));

      if (weak) {
        const progress = Store.getProgress();
        pool = pool.slice().sort((a, b) => {
          const pa = progress[a.id], pb = progress[b.id];
          const ra = pa && pa.attempts ? pa.correct / pa.attempts : -1;
          const rb = pb && pb.attempts ? pb.correct / pb.attempts : -1;
          return ra - rb;
        });
        pool = pool.slice(0, Math.max(count * 3, count));
      }
    }

    const selected = fixedPool ? DataStore.shuffle(fixedPool) : DataStore.shuffle(pool).slice(0, count);
    if (!selected.length) {
      UI.toast('No questions match those filters.', 'error');
      return;
    }
    quiz = { questions: selected, answers: new Array(selected.length).fill(null), current: 0, startedAt: Date.now(), flagged: new Set(), returnTopic: returnTopic || null };
    renderQuestion(container);
  }

  function renderQuestion(container) {
    const q = quiz.questions[quiz.current];
    const answered = quiz.answers[quiz.current] != null;
    const flagged = quiz.flagged.has(q.id);

    container.innerHTML = `
      <div class="eyebrow">Question ${quiz.current+1} of ${quiz.questions.length}</div>
      ${UI.progressBar(((quiz.current) / quiz.questions.length) * 100)}
      <div class="card question-box" style="margin-top:18px;">
        <div class="q-meta">
          <span class="tag">${UI.escapeHtml(q.subjectName)} · #${q.number}</span>
          <button class="btn btn-ghost btn-sm" id="qz-flag" style="margin-left:auto;">${flagged ? '🚩 Flagged' : '⚑ Flag'}</button>
        </div>
        <div class="q-text">${UI.escapeHtml(q.text)}</div>
        <div class="options" id="qz-options">
          ${q.options.map((o, i) => `
            <button class="option" data-idx="${i}" ${answered?'disabled':''}
              ${answered && i===q.correctIndex ? 'style="border-color:var(--success);"' : ''}>
              <span class="option-letter">${UI.letter(i)}</span><span>${UI.escapeHtml(o)}</span>
            </button>`).join('')}
        </div>
        <div class="qa-controls">
          <button class="btn btn-ghost btn-sm" id="qz-prev" ${quiz.current===0?'disabled':''}>← Previous</button>
          <div class="spacer"></div>
          <button class="btn btn-primary btn-sm" id="qz-next">${quiz.current===quiz.questions.length-1?'Finish':'Next →'}</button>
        </div>
      </div>
    `;

    container.querySelectorAll('#qz-options .option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (quiz.answers[quiz.current] != null) return;
        const i = parseInt(btn.dataset.idx);
        quiz.answers[quiz.current] = i;
        Store.recordAttempt(q.id, i === q.correctIndex);
        renderQuestion(container);
      });
    });
    container.querySelector('#qz-flag').addEventListener('click', () => {
      if (flagged) quiz.flagged.delete(q.id); else quiz.flagged.add(q.id);
      renderQuestion(container);
    });
    container.querySelector('#qz-prev').addEventListener('click', () => { quiz.current = Math.max(0, quiz.current-1); renderQuestion(container); });
    container.querySelector('#qz-next').addEventListener('click', () => {
      if (quiz.current < quiz.questions.length - 1) { quiz.current++; renderQuestion(container); }
      else finishQuiz(container);
    });
  }

  function finishQuiz(container) {
    const total = quiz.questions.length;
    const correct = quiz.questions.reduce((acc, q, i) => acc + (quiz.answers[i] === q.correctIndex ? 1 : 0), 0);
    const pct = Math.round((correct / total) * 100);
    const bySubject = {};
    quiz.questions.forEach((q, i) => {
      bySubject[q.subject] = bySubject[q.subject] || { name: q.subjectName, correct: 0, total: 0 };
      bySubject[q.subject].total++;
      if (quiz.answers[i] === q.correctIndex) bySubject[q.subject].correct++;
    });

    Store.pushQuizResult({ total, correct, pct, subjects: Object.keys(bySubject), topic: quiz.returnTopic || undefined });

    const incorrectQuestions = quiz.questions.filter((q, i) => quiz.answers[i] !== q.correctIndex);
    const flaggedQuestions = quiz.questions.filter(q => quiz.flagged.has(q.id));
    const topic = quiz.returnTopic ? DataStore.getTopic(quiz.returnTopic) : null;

    container.innerHTML = `
      <div class="eyebrow">${topic ? UI.escapeHtml(topic.subject) + ' · Topic Quiz' : 'Quiz complete'}</div>
      <h1>Results${topic ? `: ${UI.escapeHtml(topic.title)}` : ''}</h1>
      <div class="card" style="display:flex; align-items:center; gap:24px; padding:28px;">
        ${UI.gaugeSvg(pct, 'score')}
        <div>
          <div style="font-family:var(--font-display); font-size:20px; font-weight:700;">${correct} of ${total} correct</div>
          <div class="subject-meta">${pct >= 75 ? 'Solid result — keep this pace up.' : pct >= 50 ? 'Getting there — worth another pass on the misses below.' : 'Rough one — that\'s exactly what Weak Topics and Retry are for.'}</div>
        </div>
      </div>

      ${incorrectQuestions.length ? `
      <h2 style="margin-top:24px;">Weak areas from this attempt</h2>
      <div class="card" style="padding:16px 18px;">
        <p class="subject-meta" style="margin:0;">You missed ${incorrectQuestions.length} of ${total} questions here. Retry them below, or head to the full <a href="#" id="qz-go-weak">Weak Topics</a> view to see patterns across every subject.</p>
      </div>` : ''}

      <h2 style="margin-top:24px;">By subject</h2>
      <div class="grid grid-2" style="margin-top:12px;">
        ${Object.values(bySubject).map(s => `
          <div class="card subject-card">
            ${UI.gaugeSvg((s.correct/s.total)*100, '')}
            <div class="subject-info">
              <div class="subject-name">${UI.escapeHtml(s.name)}</div>
              <div class="subject-meta">${s.correct}/${s.total} correct</div>
            </div>
          </div>`).join('')}
      </div>

      <div class="qa-controls" style="margin-top:22px; flex-wrap:wrap;">
        ${topic ? `<button class="btn" id="qz-back-topic-results">← Back to topic</button>` : ''}
        <button class="btn btn-primary" id="qz-restart">New quiz</button>
        ${incorrectQuestions.length ? `<button class="btn" id="qz-retry-wrong">Retry the ${incorrectQuestions.length} I missed</button>` : ''}
        ${flaggedQuestions.length ? `<button class="btn" id="qz-retry-flagged">Review ${flaggedQuestions.length} flagged</button>` : ''}
      </div>

      <h2 style="margin-top:26px;">Review</h2>
      <div class="card" id="qz-review">
        ${quiz.questions.map((q, i) => {
          const ok = quiz.answers[i] === q.correctIndex;
          return `<div class="qz-review-item" data-qid="${q.id}" style="padding:12px 0; border-bottom:1px solid var(--border);">
            <div style="display:flex; gap:10px; align-items:flex-start;">
              <span style="color:${ok?'var(--success)':'var(--error)'};">${ok?'✅':'❌'}</span>
              <div style="flex:1; font-size:13.5px;">
                <div>${UI.escapeHtml(q.text)}</div>
                <div class="subject-meta">Correct: ${UI.escapeHtml(q.options[q.correctIndex])}${!ok ? ` · You chose: ${UI.escapeHtml(q.options[quiz.answers[i]] ?? 'skipped')}` : ''}</div>
                ${!ok ? `<button class="btn btn-ghost btn-sm" data-explain="${q.id}" style="margin-top:6px;">🧠 Explain this</button>
                <div class="explain-slot" id="explain-${q.id}"></div>` : ''}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;

    container.querySelector('#qz-restart').addEventListener('click', () => render(container));
    const retryWrongBtn = container.querySelector('#qz-retry-wrong');
    if (retryWrongBtn) retryWrongBtn.addEventListener('click', () => startQuiz(container, { fixedPool: incorrectQuestions, returnTopic: quiz.returnTopic }));
    const retryFlaggedBtn = container.querySelector('#qz-retry-flagged');
    if (retryFlaggedBtn) retryFlaggedBtn.addEventListener('click', () => startQuiz(container, { fixedPool: flaggedQuestions, returnTopic: quiz.returnTopic }));
    const backTopicBtn = container.querySelector('#qz-back-topic-results');
    if (backTopicBtn) backTopicBtn.addEventListener('click', () => App.navigate('library', { view: 'topic', topic: quiz.returnTopic }));
    const goWeakLink = container.querySelector('#qz-go-weak');
    if (goWeakLink) goWeakLink.addEventListener('click', (e) => { e.preventDefault(); App.navigate('weak'); });

    container.querySelectorAll('[data-explain]').forEach(btn => {
      btn.addEventListener('click', () => explainReviewQuestion(btn.dataset.explain));
    });
  }

  async function explainReviewQuestion(qid) {
    const q = DataStore.byId(qid);
    const idx = quiz.questions.findIndex(x => x.id === qid);
    const userIdx = quiz.answers[idx];
    const slot = document.getElementById(`explain-${qid}`);
    const settings = UI.requireApiKey();
    if (!settings) return;
    slot.innerHTML = '<div class="explain-loading" style="margin-top:8px;">Loading explanation…</div>';
    try {
      let textbookContext = '';
      if (Textbook.hasTextbook(q.subject)) {
        const chunks = await Textbook.findRelevant(q.subject, q.text + ' ' + q.options.join(' '), 3);
        textbookContext = Textbook.formatContext(chunks);
      }
      const text = await Gemini.explainQuestion({
        apiKey: settings.geminiKey, model: settings.geminiModel,
        question: q, userAnswerIndex: userIdx, isCorrect: false, textbookContext,
      });
      slot.innerHTML = `<div class="body" style="margin-top:8px; font-size:13.5px; white-space:pre-wrap;">${UI.escapeHtml(text)}</div>`;
    } catch (e) {
      slot.innerHTML = `<div class="body" style="margin-top:8px; color:var(--error); font-size:13px;">${UI.escapeHtml(e.message)}</div>`;
    }
  }

  return { render };
})();
