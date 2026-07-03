const Mode_Quiz = (() => {
  let quiz = null; // { questions, answers: [], current, startedAt }

  function render(container) {
    container.innerHTML = setupScreen();
    bindSetup(container);
  }

  function setupScreen() {
    const subjects = DataStore.getSubjects().filter(s => s.scoredCount > 0);
    return `
      <div class="eyebrow">Ultra Revision</div>
      <h1>Quiz Mode</h1>
      <p>A quick scored quiz pulled straight from the answer-keyed question bank — original wording, original order of options.</p>

      <div class="card" style="max-width:460px;">
        <div class="field">
          <label>Subject</label>
          <select id="qz-subject">
            <option value="">Mixed — all subjects</option>
            ${subjects.map(s => `<option value="${s.code}">${UI.escapeHtml(s.name)} (${s.scoredCount})</option>`).join('')}
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
        <button class="btn btn-primary btn-block" id="qz-start">Start quiz</button>
      </div>
    `;
  }

  function bindSetup(container) {
    container.querySelector('#qz-start').addEventListener('click', () => {
      const subject = container.querySelector('#qz-subject').value;
      const count = parseInt(container.querySelector('#qz-count').value);
      const weak = container.querySelector('#qz-weak').checked;
      startQuiz(container, subject, count, weak);
    });
  }

  function startQuiz(container, subject, count, weak) {
    let pool = DataStore.all().filter(q => q.scored);
    if (subject) pool = pool.filter(q => q.subject === subject);

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

    const selected = DataStore.shuffle(pool).slice(0, count);
    quiz = { questions: selected, answers: new Array(selected.length).fill(null), current: 0, startedAt: Date.now() };
    renderQuestion(container);
  }

  function renderQuestion(container) {
    const q = quiz.questions[quiz.current];
    const answered = quiz.answers[quiz.current] != null;

    container.innerHTML = `
      <div class="eyebrow">Question ${quiz.current+1} of ${quiz.questions.length}</div>
      ${UI.progressBar(((quiz.current) / quiz.questions.length) * 100)}
      <div class="card question-box" style="margin-top:18px;">
        <div class="q-meta"><span class="tag">${UI.escapeHtml(q.subjectName)} · #${q.number}</span></div>
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

    Store.pushQuizResult({ total, correct, pct, subjects: Object.keys(bySubject) });

    container.innerHTML = `
      <div class="eyebrow">Quiz complete</div>
      <h1>Results</h1>
      <div class="card" style="text-align:center; padding:36px;">
        <div class="summary-score">${pct}%</div>
        <p style="margin-top:8px;">${correct} of ${total} correct</p>
      </div>
      <h2 style="margin-top:24px;">By subject</h2>
      <div class="grid grid-2" style="margin-top:12px;">
        ${Object.values(bySubject).map(s => `
          <div class="card">
            <div class="subject-name">${UI.escapeHtml(s.name)}</div>
            <div class="subject-meta">${s.correct}/${s.total} correct</div>
            ${UI.progressBar((s.correct/s.total)*100)}
          </div>`).join('')}
      </div>
      <h2 style="margin-top:24px;">Review</h2>
      <div class="card">
        ${quiz.questions.map((q, i) => {
          const ok = quiz.answers[i] === q.correctIndex;
          return `<div style="padding:10px 0; border-bottom:1px solid var(--border); display:flex; gap:10px; align-items:flex-start;">
            <span style="color:${ok?'var(--success)':'var(--error)'};">${ok?'✅':'❌'}</span>
            <div style="flex:1; font-size:13.5px;">
              <div>${UI.escapeHtml(q.text)}</div>
              <div class="subject-meta">Correct: ${UI.escapeHtml(q.options[q.correctIndex])}${!ok ? ` · You chose: ${UI.escapeHtml(q.options[quiz.answers[i]] ?? 'skipped')}` : ''}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="qa-controls" style="margin-top:20px;">
        <button class="btn btn-primary" id="qz-again">New quiz</button>
      </div>
    `;
    container.querySelector('#qz-again').addEventListener('click', () => render(container));
  }

  return { render };
})();
