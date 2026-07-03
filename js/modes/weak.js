const Mode_Weak = (() => {
  function computeSubjectStats() {
    const progress = Store.getProgress();
    const stats = {};
    for (const q of DataStore.all()) {
      if (!q.scored) continue;
      const p = progress[q.id];
      if (!p || !p.attempts) continue;
      stats[q.subject] = stats[q.subject] || { name: q.subjectName, correct: 0, attempts: 0, questions: [] };
      stats[q.subject].correct += p.correct;
      stats[q.subject].attempts += p.attempts;
      if (!p.lastResult) stats[q.subject].questions.push(q);
    }
    return Object.entries(stats)
      .map(([code, s]) => ({ code, ...s, pct: s.attempts ? (s.correct / s.attempts) * 100 : 0 }))
      .sort((a, b) => a.pct - b.pct);
  }

  function render(container) {
    const stats = computeSubjectStats();
    const missed = DataStore.all().filter(q => {
      const p = Store.getQuestionProgress(q.id);
      return q.scored && p.attempts > 0 && p.lastResult === false;
    });

    container.innerHTML = `
      <div class="eyebrow">Ultra Revision</div>
      <h1>Weak Topics</h1>
      <p>Based on your answer history — the subjects and questions you're currently missing most, in one place.</p>

      ${!stats.length ? `<div class="empty-state"><div class="icon">▲</div>Answer some scored questions in Learn or Quiz mode first — weak-topic insights build up as you go.</div>` : `
      <div class="grid grid-2" style="margin-top:8px;">
        ${stats.map(s => `
          <div class="card subject-card">
            ${UI.gaugeSvg(s.pct, '')}
            <div class="subject-info">
              <div class="subject-code">${s.code}</div>
              <div class="subject-name">${UI.escapeHtml(s.name)}</div>
              <div class="subject-meta">${s.correct}/${s.attempts} correct · ${s.questions.length} currently missed</div>
            </div>
            <button class="btn btn-sm" data-drill="${s.code}">Drill this</button>
          </div>
        `).join('')}
      </div>

      <h2 style="margin-top:26px;">Currently missed questions (${missed.length})</h2>
      <div class="card">
        ${missed.length ? missed.slice(0, 30).map(q => `
          <div style="padding:10px 0; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; gap:12px;">
            <div style="font-size:13.5px;">
              <span class="subject-code">${q.subject} #${q.number}</span> — ${UI.escapeHtml(q.text.slice(0,90))}${q.text.length>90?'…':''}
            </div>
            <button class="btn btn-ghost btn-sm" data-retry="${q.id}">Retry</button>
          </div>
        `).join('') : '<p>Nothing currently marked wrong — nice.</p>'}
      </div>

      <div class="card" style="margin-top:16px;">
        <h2>Ask Gemini for a study plan</h2>
        <p>Get a short, targeted revision plan based on your weakest subjects.</p>
        <button class="btn btn-primary" id="ask-plan">Generate study plan</button>
        <div id="plan-output" style="margin-top:14px;"></div>
      </div>
      `}
    `;

    container.querySelectorAll('[data-drill]').forEach(btn => {
      btn.addEventListener('click', () => App.navigate('learn', { subject: btn.dataset.drill }));
    });
    container.querySelectorAll('[data-retry]').forEach(btn => {
      btn.addEventListener('click', () => App.navigate('learn', {}));
    });
    const planBtn = container.querySelector('#ask-plan');
    if (planBtn) planBtn.addEventListener('click', () => generatePlan(container, stats));
  }

  async function generatePlan(container, stats) {
    const out = container.querySelector('#plan-output');
    const settings = UI.requireApiKey();
    if (!settings) return;
    out.innerHTML = '<div class="explain-loading">Thinking…</div>';
    const summary = stats.slice(0, 6).map(s => `${s.name}: ${Math.round(s.pct)}% (${s.correct}/${s.attempts})`).join('\n');
    try {
      const text = await Gemini.chatTutor({
        apiKey: settings.geminiKey, model: settings.geminiModel,
        history: [], contextQuestion: null,
        message: `Here is my current accuracy by subject from my revision app, weakest first:\n${summary}\n\nGive me a short, prioritized study plan for the next few sessions — which subjects to focus on first and why, and 2-3 concrete tactics for the weakest one. Keep it under 200 words.`,
      });
      out.innerHTML = `<div class="body" style="white-space:pre-wrap; font-size:14px;">${UI.escapeHtml(text)}</div>`;
    } catch (e) {
      out.innerHTML = `<div class="body" style="color:var(--error);">${UI.escapeHtml(e.message)}</div>`;
    }
  }

  return { render };
})();
