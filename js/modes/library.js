const Mode_Library = (() => {
  let searchTerm = '';

  function render(container, params = {}) {
    const view = params.view || (params.topic ? 'topic' : params.subject ? 'subject' : 'subjects');
    if (view === 'topic' && params.topic) return renderTopic(container, params.topic);
    if (view === 'subject' && params.subject) return renderSubject(container, params.subject);
    return renderSubjects(container);
  }

  function topicProgress(topicId) {
    const qs = DataStore.byTopic(topicId).filter(q => q.scored);
    if (!qs.length) return { total: 0, attempted: 0, correct: 0, pct: 0, avgScore: null };
    const progress = Store.getProgress();
    let attempted = 0, correct = 0;
    for (const q of qs) {
      const p = progress[q.id];
      if (p && p.attempts > 0) {
        attempted++;
        if (p.lastResult) correct++;
      }
    }
    return {
      total: qs.length, attempted, correct,
      pct: qs.length ? Math.round((attempted / qs.length) * 100) : 0,
      avgScore: attempted ? Math.round((correct / attempted) * 100) : null,
    };
  }

  function subjectStats(code) {
    const topics = DataStore.getTopics(code);
    const questions = DataStore.bySubjectCode(code).filter(q => q.scored);
    let completedTopics = 0, totalAttempted = 0;
    topics.forEach(t => {
      const tp = topicProgress(t.id);
      totalAttempted += tp.attempted;
      if (tp.total && tp.attempted === tp.total) completedTopics++;
    });
    const estMinutes = topics.length * 12 + questions.length * 0.6;
    return {
      topicCount: topics.length,
      questionCount: questions.length,
      completionPct: questions.length ? Math.round((totalAttempted / questions.length) * 100) : 0,
      completedTopics,
      estMinutes: Math.round(estMinutes),
    };
  }

  function fmtMinutes(mins) {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${h}h${m ? ` ${m}m` : ''}`;
  }

  function renderSubjects(container) {
    const subjects = DataStore.getSubjects();
    const recent = recentTopics();

    container.innerHTML = `
      <div class="eyebrow">Library</div>
      <h1>Browse by subject</h1>
      <p>Every textbook, broken into topics — each with its own lesson, flashcards, and quiz.</p>

      <div class="filters">
        <input type="search" id="lib-search" placeholder="Search all questions and lessons…" value="${UI.escapeHtml(searchTerm)}">
      </div>

      <div id="lib-search-results"></div>

      ${recent.length ? `
      <h2 style="margin-top:22px;">Continue learning</h2>
      <div class="grid grid-2" style="margin-top:10px;">
        ${recent.map(t => topicMiniCard(t)).join('')}
      </div>` : ''}

      <h2 style="margin-top:26px;">Subjects</h2>
      <div class="grid grid-2" style="margin-top:10px;" id="lib-subject-grid">
        ${subjects.map(s => subjectCard(s)).join('')}
      </div>
    `;

    container.querySelector('#lib-subject-grid').querySelectorAll('[data-go-subject]').forEach(el => {
      el.addEventListener('click', () => App.navigate('library', { view: 'subject', subject: el.dataset.goSubject }));
    });
    container.querySelectorAll('[data-go-topic]').forEach(el => {
      el.addEventListener('click', () => App.navigate('library', { view: 'topic', topic: el.dataset.goTopic }));
    });

    const searchInput = container.querySelector('#lib-search');
    let t;
    searchInput.addEventListener('input', e => {
      clearTimeout(t);
      t = setTimeout(() => { searchTerm = e.target.value; renderSearch(container); }, 250);
    });
    if (searchTerm) renderSearch(container);
  }

  function recentTopics() {
    const recentIds = Store.getRecent();
    const seen = new Set();
    const topics = [];
    for (const qid of recentIds) {
      const q = DataStore.byId(qid);
      if (!q || !q.topic || seen.has(q.topic)) continue;
      seen.add(q.topic);
      const topic = DataStore.getTopic(q.topic);
      if (topic) topics.push(topic);
      if (topics.length >= 4) break;
    }
    return topics;
  }

  function topicMiniCard(topic) {
    const tp = topicProgress(topic.id);
    return `
      <div class="card subject-card" data-go-topic="${topic.id}" style="cursor:pointer;">
        <div class="subject-info">
          <div class="subject-name">${UI.escapeHtml(topic.title)}</div>
          <div class="subject-meta">${UI.escapeHtml(topic.subject)} · ${tp.attempted}/${tp.total} questions attempted</div>
        </div>
        ${UI.progressBar(tp.pct)}
      </div>`;
  }

  function subjectCard(s) {
    const meta = SubjectsMeta.get(s.code);
    const stats = subjectStats(s.code);
    const hasBook = DataStore.isTextbookSubject(s.code);
    return `
      <div class="card subject-card" data-go-subject="${s.code}" style="cursor:pointer;">
        <div style="display:flex; align-items:flex-start; gap:14px;">
          <div style="font-size:26px;">${meta.icon}</div>
          <div style="flex:1;">
            <div class="subject-name">${UI.escapeHtml(s.name)} <span class="subject-meta">(${s.code})</span></div>
            <div class="subject-meta" style="margin-top:4px;">
              ${stats.topicCount} topic${stats.topicCount === 1 ? '' : 's'} · ${stats.questionCount} questions · ~${fmtMinutes(stats.estMinutes)}
              ${hasBook ? ' · 📘 textbook' : ' · question bank only'}
            </div>
          </div>
          <div style="font-family:var(--font-mono); font-weight:700; font-size:15px;">${stats.completionPct}%</div>
        </div>
        ${UI.progressBar(stats.completionPct)}
      </div>`;
  }

  function renderSearch(container) {
    const slot = container.querySelector('#lib-search-results');
    if (!searchTerm.trim()) { slot.innerHTML = ''; return; }
    const results = DataStore.search(searchTerm, {}).slice(0, 25);
    slot.innerHTML = `
      <div class="card" style="margin-top:14px;">
        <div class="eyebrow">${results.length} match${results.length === 1 ? '' : 'es'}</div>
        ${results.length ? results.map(q => {
          const topic = q.topic ? DataStore.getTopic(q.topic) : null;
          return `<div class="qz-review-item" data-go-topic="${q.topic || ''}" style="padding:10px 0; border-bottom:1px solid var(--border); cursor:${topic ? 'pointer' : 'default'};">
            <div style="font-size:13.5px;">${UI.escapeHtml(q.text)}</div>
            <div class="subject-meta">${UI.escapeHtml(q.subjectName)}${topic ? ` · ${UI.escapeHtml(topic.title)}` : ''}</div>
          </div>`;
        }).join('') : '<p class="subject-meta">No matches.</p>'}
      </div>
    `;
    slot.querySelectorAll('[data-go-topic]').forEach(el => {
      if (!el.dataset.goTopic) return;
      el.addEventListener('click', () => App.navigate('library', { view: 'topic', topic: el.dataset.goTopic }));
    });
  }

  function renderSubject(container, code) {
    const subj = DataStore.getSubjects().find(s => s.code === code);
    const topics = DataStore.getTopics(code);
    const meta = SubjectsMeta.get(code);
    const stats = subjectStats(code);

    container.innerHTML = `
      <div class="eyebrow"><a href="#" id="lib-crumb-subjects" style="color:inherit;">Library</a> / ${UI.escapeHtml(code)}</div>
      <h1>${meta.icon} ${UI.escapeHtml(subj ? subj.name : code)}</h1>
      <p class="subject-meta">${stats.topicCount} topics · ${stats.questionCount} questions · ${stats.completedTopics}/${stats.topicCount} topics complete</p>
      ${UI.progressBar(stats.completionPct)}

      ${!topics.length ? `<div class="empty-state" style="margin-top:20px;"><div class="icon">▢</div>No topic breakdown yet for this subject.</div>` : `
      <div class="grid grid-2" style="margin-top:20px;">
        ${topics.map(t => topicCard(t)).join('')}
      </div>`}
    `;

    container.querySelector('#lib-crumb-subjects').addEventListener('click', (e) => { e.preventDefault(); App.navigate('library'); });
    container.querySelectorAll('[data-go-topic]').forEach(el => {
      el.addEventListener('click', () => App.navigate('library', { view: 'topic', topic: el.dataset.goTopic }));
    });
  }

  function topicCard(t) {
    const tp = topicProgress(t.id);
    const done = tp.total && tp.attempted === tp.total;
    return `
      <div class="card subject-card" data-go-topic="${t.id}" style="cursor:pointer;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
          <div class="subject-name">${done ? '✅ ' : ''}${UI.escapeHtml(t.title)}</div>
          ${tp.avgScore != null ? `<span style="font-family:var(--font-mono); font-size:12.5px; color:var(--text-dim);">${tp.avgScore}%</span>` : ''}
        </div>
        <div class="subject-meta">${tp.total} questions${t.syllabusBased ? ' · syllabus topic' : ''}</div>
        ${UI.progressBar(tp.pct)}
      </div>`;
  }

  function renderTopic(container, topicId) {
    const topic = DataStore.getTopic(topicId);
    if (!topic) { container.innerHTML = `<div class="empty-state">Topic not found.</div>`; return; }
    const tp = topicProgress(topicId);
    const questions = DataStore.byTopic(topicId);

    container.innerHTML = `
      <div class="eyebrow">
        <a href="#" id="lib-crumb-subjects" style="color:inherit;">Library</a> /
        <a href="#" id="lib-crumb-subject" style="color:inherit;">${UI.escapeHtml(topic.subject)}</a> /
        ${UI.escapeHtml(topic.title)}
      </div>
      <h1>${UI.escapeHtml(topic.title)}</h1>
      <p class="subject-meta">${tp.total} questions · ${tp.attempted}/${tp.total} attempted${tp.avgScore != null ? ` · ${tp.avgScore}% correct so far` : ''}</p>
      ${UI.progressBar(tp.pct)}

      <div class="grid grid-3" style="margin-top:20px; grid-template-columns:repeat(3,1fr);">
        <div class="card" style="text-align:center; cursor:pointer;" id="topic-go-learn">
          <div style="font-size:24px;">📖</div>
          <div class="subject-name" style="margin-top:6px;">Learn</div>
          <div class="subject-meta">Lesson + guided questions</div>
        </div>
        <div class="card" style="text-align:center; cursor:pointer;" id="topic-go-flashcards">
          <div style="font-size:24px;">🗂️</div>
          <div class="subject-name" style="margin-top:6px;">Flashcards</div>
          <div class="subject-meta">Spaced repetition</div>
        </div>
        <div class="card" style="text-align:center; cursor:pointer;" id="topic-go-quiz">
          <div style="font-size:24px;">📝</div>
          <div class="subject-name" style="margin-top:6px;">Topic Quiz</div>
          <div class="subject-meta">Scored, ${tp.total} questions</div>
        </div>
      </div>

      ${tp.attempted && tp.avgScore != null && tp.avgScore < 70 ? `
      <div class="card" style="margin-top:18px; border-color:var(--error);">
        <div class="subject-name" style="color:var(--error);">⚠ Weak area</div>
        <p class="subject-meta" style="margin:4px 0 0;">Your accuracy here is ${tp.avgScore}%. Worth another pass — the Topic Quiz will let you retry what you miss.</p>
      </div>` : ''}

      <h2 style="margin-top:26px;">Questions in this topic</h2>
      <div class="card" style="margin-top:10px;">
        ${questions.slice(0, 30).map(q => `
          <div style="padding:9px 0; border-bottom:1px solid var(--border); font-size:13.5px;">${UI.escapeHtml(q.text)}</div>
        `).join('')}
        ${questions.length > 30 ? `<div class="subject-meta" style="padding-top:8px;">+ ${questions.length - 30} more — open Learn or Quiz to see the rest.</div>` : ''}
      </div>
    `;

    container.querySelector('#lib-crumb-subjects').addEventListener('click', (e) => { e.preventDefault(); App.navigate('library'); });
    container.querySelector('#lib-crumb-subject').addEventListener('click', (e) => { e.preventDefault(); App.navigate('library', { view: 'subject', subject: topic.subject }); });
    container.querySelector('#topic-go-learn').addEventListener('click', () => App.navigate('learn', { topic: topicId }));
    container.querySelector('#topic-go-flashcards').addEventListener('click', () => App.navigate('flashcards', { topic: topicId }));
    container.querySelector('#topic-go-quiz').addEventListener('click', () => App.navigate('quiz', { topic: topicId }));
  }

  return { render };
})();
