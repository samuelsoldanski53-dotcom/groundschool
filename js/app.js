const App = (() => {
  const routes = {
    dashboard: { title: 'Dashboard', mod: () => Mode_Dashboard },
    learn: { title: 'Learn Mode', mod: () => Mode_Learn },
    flashcards: { title: 'Flashcards', mod: () => Mode_Flashcards },
    quiz: { title: 'Quiz Mode', mod: () => Mode_Quiz },
    weak: { title: 'Weak Topics', mod: () => Mode_Weak },
    library: { title: 'Library', mod: () => Mode_Library },
    tutor: { title: 'AI Tutor', mod: () => Mode_Tutor },
    settings: { title: 'Settings', mod: () => Mode_Settings },
  };
  let route = 'dashboard';

  function currentRoute() { return route; }

  function navigate(name, params = {}) {
    if (!routes[name]) return;
    route = name;
    document.querySelectorAll('.nav-item[data-route]').forEach(el => {
      el.classList.toggle('active', el.dataset.route === name);
    });
    document.getElementById('topbar-title').textContent = routes[name].title;
    const content = document.getElementById('content');
    routes[name].mod().render(content, params);
    document.getElementById('sidebar').classList.remove('open');
    window.scrollTo(0, 0);
    if (DataStore.all().length) renderSidebarSubjects();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('theme-icon').textContent = theme === 'dark' ? '☾' : '☀';
    document.getElementById('theme-label').textContent = theme === 'dark' ? 'Dark mode' : 'Light mode';
  }

  function updateKeyPill() {
    const s = Store.getSettings();
    const pill = document.getElementById('key-pill');
    const status = document.getElementById('key-status');
    if (s.geminiKey) { pill.classList.add('ready'); status.textContent = 'Gemini ready'; }
    else { pill.classList.remove('ready'); status.textContent = 'No key'; }
  }

  function updateStreakPill() {
    document.getElementById('streak-count').textContent = Store.getStreak().count;
  }

  function renderSidebarSubjects() {
    const list = document.getElementById('sidebar-subjects');
    const coverage = document.getElementById('sidebar-coverage');
    if (!list || !coverage) return;
    const subjects = DataStore.getSubjects();

    list.innerHTML = subjects.map(s => {
      const meta = SubjectsMeta.get(s.code);
      const pct = Math.round(UI.subjectCoverage(s.code));
      return `
        <div class="sidebar-subject-item" data-go-subject="${s.code}">
          <div class="sidebar-subject-row">
            <span class="name">${meta.icon} ${UI.escapeHtml(s.code)}</span>
            <span class="pct">${pct}%</span>
          </div>
          <div class="sidebar-mini-bar"><div style="width:${pct}%; background:var(--${meta.accent});"></div></div>
        </div>`;
    }).join('');

    list.querySelectorAll('[data-go-subject]').forEach(el => {
      el.addEventListener('click', () => navigate('learn', { subject: el.dataset.goSubject }));
    });

    const totalScored = DataStore.all().filter(q => q.scored).length;
    const attempted = Object.values(Store.getProgress()).filter(p => p.attempts > 0).length;
    const overallCoverage = totalScored ? Math.round((attempted / totalScored) * 100) : 0;
    coverage.innerHTML = `
      <div class="sidebar-coverage-top"><span>Coverage</span><span>${overallCoverage}%</span></div>
      <div class="sidebar-coverage-sub">Across all scored subjects</div>
    `;
  }

  async function init() {
    const settings = Store.getSettings();
    applyTheme(settings.theme || 'dark');
    updateKeyPill();
    updateStreakPill();

    document.querySelectorAll('.nav-item[data-route]').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.route));
    });
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const cur = Store.getSettings().theme || 'dark';
      const next = cur === 'dark' ? 'light' : 'dark';
      Store.setSettings({ theme: next });
      applyTheme(next);
    });
    document.getElementById('hamburger').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('content').innerHTML = `<div class="empty-state">Loading question bank…</div>`;
    await DataStore.load();
    renderSidebarSubjects();
    navigate('dashboard');
  }

  return { navigate, currentRoute, applyTheme, updateKeyPill, updateStreakPill, renderSidebarSubjects, init };
})();

document.addEventListener('DOMContentLoaded', App.init);
