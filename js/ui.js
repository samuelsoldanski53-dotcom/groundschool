const UI = (() => {
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function toast(msg, type = '') {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }

  function letter(i) { return String.fromCharCode(65 + i); }

  // Circular instrument-style gauge. pct: 0-100
  function gaugeSvg(pct, tag) {
    const r = 38, c = 2 * Math.PI * r;
    const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
    return `
      <div class="gauge">
        <svg viewBox="0 0 92 92">
          <circle class="track" cx="46" cy="46" r="${r}"></circle>
          <circle class="fill" cx="46" cy="46" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${off}"></circle>
        </svg>
        <div class="gauge-label">
          <div class="gauge-pct">${Math.round(pct)}%</div>
          ${tag ? `<div class="gauge-tag">${escapeHtml(tag)}</div>` : ''}
        </div>
      </div>`;
  }

  function progressBar(pct) {
    return `<div class="progress-bar"><div class="progress-bar-fill" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;
  }

  function subjectMastery(code) {
    const qs = DataStore.bySubjectCode(code).filter(q => q.scored);
    if (!qs.length) return 0;
    const progress = Store.getProgress();
    let seen = 0, correct = 0;
    for (const q of qs) {
      const p = progress[q.id];
      if (p && p.attempts > 0) {
        seen++;
        if (p.lastResult) correct++;
      }
    }
    if (!seen) return 0;
    return (correct / seen) * 100;
  }

  // % of a subject's scored questions the user has attempted at least once
  function subjectCoverage(code) {
    const qs = DataStore.bySubjectCode(code).filter(q => q.scored);
    if (!qs.length) return 0;
    const progress = Store.getProgress();
    const seen = qs.filter(q => progress[q.id] && progress[q.id].attempts > 0).length;
    return (seen / qs.length) * 100;
  }

  // best % score across quiz history entries touching this subject
  function subjectBestQuizScore(code) {
    const hist = Store.getQuizHistory();
    const relevant = hist.filter(h => Array.isArray(h.subjects) && h.subjects.includes(code));
    if (!relevant.length) return null;
    return Math.max(...relevant.map(h => h.pct));
  }

  function requireApiKey() {
    const s = Store.getSettings();
    if (!s.geminiKey) {
      toast('Add your Gemini API key in Settings to use AI features.', 'error');
      return null;
    }
    return s;
  }

  function timeAgo(ts) {
    if (!ts) return 'never';
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  return { escapeHtml, toast, letter, gaugeSvg, progressBar, subjectMastery, subjectCoverage, subjectBestQuizScore, requireApiKey, timeAgo };
})();
