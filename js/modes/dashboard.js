const Mode_Dashboard = (() => {
  function render(container) {
    const subjects = DataStore.getSubjects();
    const streak = Store.getStreak();
    const recent = Store.getRecent().slice(0, 5).map(id => DataStore.byId(id)).filter(Boolean);
    const totalScored = DataStore.all().filter(q => q.scored).length;
    const totalUnscored = DataStore.all().filter(q => !q.scored).length;
    const progress = Store.getProgress();
    const attempted = Object.values(progress).filter(p => p.attempts > 0).length;
    const overallCorrect = Object.values(progress).reduce((a, p) => a + p.correct, 0);
    const overallAttempts = Object.values(progress).reduce((a, p) => a + p.attempts, 0);
    const overallPct = overallAttempts ? Math.round((overallCorrect / overallAttempts) * 100) : 0;
    const bookmarked = Object.values(progress).filter(p => p.bookmarked).length;
    const quizHistory = Store.getQuizHistory();
    const bestQuizScore = quizHistory.length ? Math.max(...quizHistory.map(h => h.pct)) : null;

    container.innerHTML = `
      <div class="eyebrow">Overview</div>
      <div class="hero-row">
        <div>
          <h1>Welcome back</h1>
          <p style="margin:0;">${totalScored.toLocaleString()} scored questions across ${subjects.filter(s=>s.scoredCount>0).length} subjects, plus ${totalUnscored.toLocaleString()} unscored reference questions for extra practice.</p>
        </div>
        <div class="hero-streak">
          <span class="flame">🔥</span>
          <div>
            <div class="hero-streak-num">${streak.count} <span style="font-size:12px; font-weight:400; color:var(--text-faint);">day${streak.count===1?'':'s'}</span></div>
            <div class="hero-streak-label">Revision streak</div>
          </div>
        </div>
      </div>

      <div class="grid grid-3">
        <div class="card" style="display:flex; align-items:center; gap:16px;">
          ${UI.gaugeSvg(overallPct, 'accuracy')}
          <div>
            <div class="subject-name">Overall accuracy</div>
            <div class="subject-meta">${attempted} of ${totalScored} scored questions attempted</div>
          </div>
        </div>
        <div class="card" style="display:flex; align-items:center; gap:16px;">
          <div style="font-family:var(--font-display); font-size:34px; font-weight:700; color:var(--violet);">${bestQuizScore !== null ? bestQuizScore + '%' : '—'}</div>
          <div>
            <div class="subject-name">Best quiz score</div>
            <div class="subject-meta">${quizHistory.length ? `${quizHistory.length} quiz${quizHistory.length===1?'':'zes'} logged` : 'Take a quiz to set a baseline'}</div>
          </div>
        </div>
        <div class="card" style="display:flex; align-items:center; gap:16px;">
          <div style="font-family:var(--font-display); font-size:34px; font-weight:700; color:var(--cyan);">${bookmarked}</div>
          <div>
            <div class="subject-name">Bookmarked</div>
            <div class="subject-meta">Questions to revisit</div>
          </div>
        </div>
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; margin-top:28px;">
        <h2 style="margin:0;">Subjects</h2>
        <span class="eyebrow" style="margin:0;">${subjects.length} topics</span>
      </div>
      <div class="chapter-grid" style="margin-top:12px;">
        ${subjects.map(s => chapterCard(s)).join('')}
      </div>

      ${recent.length ? `
      <h2 style="margin-top:28px;">Recently viewed</h2>
      <div class="card">
        ${recent.map(q => `
          <div style="display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px solid var(--border);">
            <div style="font-size:13.5px; color:var(--text-dim);">${UI.escapeHtml(q.subjectName)} #${q.number}: ${UI.escapeHtml(q.text.slice(0,80))}${q.text.length>80?'…':''}</div>
          </div>
        `).join('')}
      </div>` : ''}
    `;

    container.querySelectorAll('[data-go-learn]').forEach(btn => {
      btn.addEventListener('click', () => App.navigate('learn', { subject: btn.dataset.goLearn }));
    });
    container.querySelectorAll('[data-go-flash]').forEach(btn => {
      btn.addEventListener('click', () => App.navigate('flashcards', { subject: btn.dataset.goFlash }));
    });
    container.querySelectorAll('[data-go-quiz]').forEach(btn => {
      btn.addEventListener('click', () => App.navigate('quiz', { subject: btn.dataset.goQuiz }));
    });
  }

  function chapterCard(s) {
    const meta = SubjectsMeta.get(s.code);
    const coverage = Math.round(UI.subjectCoverage(s.code));
    const best = UI.subjectBestQuizScore(s.code);
    const referenceOnly = s.scoredCount === 0;
    return `
      <div class="chapter-card accent-${meta.accent}">
        <div class="chapter-head">
          <div class="chapter-icon">${meta.icon}</div>
          <div class="chapter-title-block">
            <div class="chapter-code">${UI.escapeHtml(s.code)}${referenceOnly ? ' · reference only' : ''}</div>
            <div class="chapter-name">${UI.escapeHtml(s.name)}</div>
          </div>
          ${best !== null ? `<span class="chapter-best ${best>=75?'good':best>=50?'ok':''}">Best ${Math.round(best)}%</span>` : ''}
        </div>
        <p class="chapter-blurb">${UI.escapeHtml(meta.blurb)}</p>
        <div>
          <div class="chapter-progress-row">
            <span>${s.scoredCount ? `${s.scoredCount} scored` : `${s.count} reference`}${s.scoredCount && s.count > s.scoredCount ? ` · ${s.count - s.scoredCount} ref` : ''}</span>
            <span class="pct">${coverage}% seen</span>
          </div>
          <div class="chapter-mini-bar" style="margin-top:6px;"><div style="width:${coverage}%;"></div></div>
        </div>
        <div class="chapter-actions">
          <button class="btn btn-sm" data-go-flash="${s.code}" ${s.scoredCount ? '' : 'disabled title="No scored cards yet for this subject"'}>▢ Flashcards</button>
          <button class="btn btn-sm btn-primary" data-go-quiz="${s.code}" ${s.scoredCount ? '' : 'disabled title="No scored questions yet for this subject"'}>◈ Take Quiz</button>
        </div>
        <button class="btn btn-sm btn-ghost btn-block" data-go-learn="${s.code}">◐ Study in Learn Mode</button>
      </div>
    `;
  }

  return { render };
})();
