const App = (() => {
  const routes = {
    dashboard: { title: 'Dashboard', mod: () => Mode_Dashboard },
    learn: { title: 'Learn Mode', mod: () => Mode_Learn },
    flashcards: { title: 'Flashcards', mod: () => Mode_Flashcards },
    quiz: { title: 'Quiz Mode', mod: () => Mode_Quiz },
    weak: { title: 'Weak Topics', mod: () => Mode_Weak },
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
    navigate('dashboard');
  }

  return { navigate, currentRoute, applyTheme, updateKeyPill, updateStreakPill, init };
})();

document.addEventListener('DOMContentLoaded', App.init);
