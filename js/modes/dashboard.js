const Mode_Dashboard = (() => {
  function render(container) {
    const subjects = DataStore.getSubjects();
    const streak = Store.getStreak();
    const recent = Store.getRecent().slice(0, 5).map(id => DataStore.byId(id)).filter(Boolean);
    const totalScored = DataStore.all().filter(q => q.scored).length;
    const progress = Store.getProgress();
    const attempted = Object.values(progress).filter(p => p.attempts > 0).length;
    const overallCorrect = Object.values(progress).reduce((a, p) => a + p.correct, 0);
    const overallAttempts = Object.values(progress).reduce((a, p) => a + p.attempts, 0);
    const overallPct = overallAttempts ? Math.round((overallCorrect / overallAttempts) * 100) : 0;

    container.innerHTML = `
      <div class="eyebrow">Overview</div>
      <h1>Welcome back</h1>
      <p>${totalScored.toLocaleString()} scored questions across ${subjects.filter(s=>s.scoredCount>0).length} subjects, plus ${DataStore.all().filter(q=>!q.scored).length.toLocaleString()} unscored reference questions for extra practice.</p>

      <div class="grid grid-3" style="margin-top:20px;">
        <div class="card" style="display:flex; align-items:center; gap:16px;">
          ${UI.gaugeSvg(overallPct, 'accuracy')}
          <div>
            <div class="subject-name">Overall accuracy</div>
            <div class="subject-meta">${attempted} of ${totalScored} scored questions attempted</div>
          </div>
        </div>
        <div class="card" style="display:flex; align-items:center; gap:16px;">
          <div style="font-family:var(--font-display); font-size:34px; font-weight:700; color:var(--amber);">🔥 ${streak.count}</div>
          <div>
            <div class="subject-name">Day streak</div>
            <div class="subject-meta">Keep it going today</div>
          </div>
        </div>
        <div class="card" style="display:flex; align-items:center; gap:16px;">
          <div style="font-family:var(--font-display); font-size:34px; font-weight:700; color:var(--cyan);">${Object.values(progress).filter(p=>p.bookmarked).length}</div>
          <div>
            <div class="subject-name">Bookmarked</div>
            <div class="subject-meta">Questions to revisit</div>
          </div>
        </div>
      </div>

      <h2 style="margin-top:28px;">Subject mastery</h2>
      <div class="grid grid-2" style="margin-top:12px;">
        ${subjects.map(s => `
          <div class="card subject-card">
            ${UI.gaugeSvg(UI.subjectMastery(s.code), '')}
            <div class="subject-info">
              <div class="subject-code">${s.code}</div>
              <div class="subject-name">${UI.escapeHtml(s.name)}</div>
              <div class="subject-meta">${s.scoredCount ? `${s.scoredCount} scored` : ''}${s.scoredCount && s.count>s.scoredCount ? ' · ' : ''}${s.count>s.scoredCount ? `${s.count-s.scoredCount} reference` : ''}</div>
            </div>
            <button class="btn btn-sm" data-go-learn="${s.code}">Study</button>
          </div>
        `).join('')}
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
  }

  return { render };
})();
