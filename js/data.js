// Loads and indexes the question bank.
// APP_DATA_VERSION is bumped on every release so browsers/CDNs never serve
// a stale cached copy of the (large) data files after an update.
const APP_DATA_VERSION = 7;

const DataStore = (() => {
  let questions = [];
  let bySubject = {};
  let subjects = []; // [{code, name, count, scoredCount}]
  let loaded = false;

  async function load() {
    if (loaded) return questions;
    const res = await fetch(`data/questions.json?v=${APP_DATA_VERSION}`);
    questions = await res.json();
    bySubject = {};
    for (const q of questions) {
      if (!bySubject[q.subject]) bySubject[q.subject] = [];
      bySubject[q.subject].push(q);
    }
    const subjMap = {};
    for (const q of questions) {
      if (!subjMap[q.subject]) subjMap[q.subject] = { code: q.subject, name: q.subjectName, count: 0, scoredCount: 0 };
      subjMap[q.subject].count++;
      if (q.scored) subjMap[q.subject].scoredCount++;
    }
    subjects = Object.values(subjMap).sort((a, b) => a.name.localeCompare(b.name));
    loaded = true;
    return questions;
  }

  function all() { return questions; }
  function getSubjects() { return subjects; }
  function bySubjectCode(code) { return bySubject[code] || []; }
  function byId(id) { return questions.find(q => q.id === id); }

  function scoredOnly(list) { return (list || questions).filter(q => q.scored); }

  function search(term, opts = {}) {
    const t = term.trim().toLowerCase();
    let list = questions;
    if (opts.subject) list = list.filter(q => q.subject === opts.subject);
    if (opts.scoredOnly) list = list.filter(q => q.scored);
    if (!t) return list;
    return list.filter(q =>
      q.text.toLowerCase().includes(t) ||
      q.options.some(o => o.toLowerCase().includes(t))
    );
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  return { load, all, getSubjects, bySubjectCode, byId, scoredOnly, search, shuffle };
})();
