// All state lives in localStorage, scoped under a single namespace.
// Nothing here is ever sent anywhere except direct calls the user's browser
// makes to the Gemini API using the key the user enters in Settings.
const Store = (() => {
  const NS = 'groundschool_v1';

  function _read(key, fallback) {
    try {
      const raw = localStorage.getItem(`${NS}:${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function _write(key, value) {
    localStorage.setItem(`${NS}:${key}`, JSON.stringify(value));
  }

  // ---- Settings ----
  function getSettings() {
    return _read('settings', { geminiKey: '', geminiModel: 'gemini-2.5-flash', theme: 'dark' });
  }
  function setSettings(patch) {
    const cur = getSettings();
    const next = { ...cur, ...patch };
    _write('settings', next);
    return next;
  }

  // ---- Question progress: per-question attempt history ----
  // progress[qid] = { attempts: n, correct: n, lastResult: bool, lastSeen: ts, easy:bool, hard:bool, bookmarked:bool, favorite:bool }
  function getProgress() { return _read('progress', {}); }
  function getQuestionProgress(qid) {
    const p = getProgress();
    return p[qid] || { attempts: 0, correct: 0, lastResult: null, lastSeen: null, bookmarked: false, favorite: false };
  }
  function recordAttempt(qid, isCorrect) {
    const p = getProgress();
    const cur = p[qid] || { attempts: 0, correct: 0, lastResult: null, lastSeen: null, bookmarked: false, favorite: false };
    cur.attempts += 1;
    if (isCorrect) cur.correct += 1;
    cur.lastResult = isCorrect;
    cur.lastSeen = Date.now();
    p[qid] = cur;
    _write('progress', p);
    _bumpStreak();
    return cur;
  }
  function toggleFlag(qid, flag) {
    const p = getProgress();
    const cur = p[qid] || { attempts: 0, correct: 0, lastResult: null, lastSeen: null, bookmarked: false, favorite: false };
    cur[flag] = !cur[flag];
    p[qid] = cur;
    _write('progress', p);
    return cur[flag];
  }

  // ---- Recently viewed ----
  function pushRecent(qid) {
    let recent = _read('recent', []);
    recent = recent.filter(id => id !== qid);
    recent.unshift(qid);
    recent = recent.slice(0, 40);
    _write('recent', recent);
  }
  function getRecent() { return _read('recent', []); }

  // ---- Spaced repetition (flashcards) ----
  // srs[qid] = { ease, interval, due, reps }
  function getSrs() { return _read('srs', {}); }
  function getCardSrs(qid) {
    const s = getSrs();
    return s[qid] || { ease: 2.3, interval: 0, due: Date.now(), reps: 0 };
  }
  function setCardSrs(qid, data) {
    const s = getSrs();
    s[qid] = data;
    _write('srs', s);
  }

  // ---- Streak ----
  function getStreak() { return _read('streak', { count: 0, lastDay: null }); }
  function _bumpStreak() {
    const s = getStreak();
    const today = new Date().toDateString();
    if (s.lastDay === today) return s;
    const y = new Date(Date.now() - 86400000).toDateString();
    const count = s.lastDay === y ? s.count + 1 : 1;
    const next = { count, lastDay: today };
    _write('streak', next);
    return next;
  }

  // ---- Quiz history ----
  function pushQuizResult(result) {
    const hist = _read('quizHistory', []);
    hist.unshift({ ...result, ts: Date.now() });
    _write('quizHistory', hist.slice(0, 50));
  }
  function getQuizHistory() { return _read('quizHistory', []); }

  // ---- Reset ----
  function resetAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(NS))
      .forEach(k => localStorage.removeItem(k));
  }

  return {
    getSettings, setSettings,
    getProgress, getQuestionProgress, recordAttempt, toggleFlag,
    pushRecent, getRecent,
    getSrs, getCardSrs, setCardSrs,
    getStreak,
    pushQuizResult, getQuizHistory,
    resetAll,
  };
})();
