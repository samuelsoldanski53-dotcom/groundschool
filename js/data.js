// Loads and indexes the question bank.
const DataStore = (() => {
  let questions = [];
  let bySubject = {};
  let byTopicId = {};
  let subjects = []; // [{code, name, count, scoredCount}]
  let topicsBySubject = {}; // code -> [{id, subject, chapterNum, title, pageStart, pageEnd, syllabusBased}]
  let subjectNames = {};
  let textbookSubjects = new Set();
  let loaded = false;

  async function load() {
    if (loaded) return questions;
    const [qRes, tRes] = await Promise.all([
      fetch('data/questions.json'),
      fetch('data/topics.json'),
    ]);
    questions = await qRes.json();
    const topicData = await tRes.json();
    subjectNames = topicData.subjects || {};
    textbookSubjects = new Set(topicData.textbookSubjects || []);
    topicsBySubject = topicData.topics || {};

    bySubject = {};
    byTopicId = {};
    for (const q of questions) {
      if (!bySubject[q.subject]) bySubject[q.subject] = [];
      bySubject[q.subject].push(q);
      if (q.topic) {
        if (!byTopicId[q.topic]) byTopicId[q.topic] = [];
        byTopicId[q.topic].push(q);
      }
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

  function getTopics(subjectCode) { return topicsBySubject[subjectCode] || []; }
  function getTopic(topicId) {
    for (const code in topicsBySubject) {
      const t = topicsBySubject[code].find(x => x.id === topicId);
      if (t) return t;
    }
    return null;
  }
  function byTopic(topicId) { return byTopicId[topicId] || []; }
  function hasTopics(subjectCode) { return (topicsBySubject[subjectCode] || []).length > 0; }
  function isTextbookSubject(subjectCode) { return textbookSubjects.has(subjectCode); }

  function scoredOnly(list) { return (list || questions).filter(q => q.scored); }

  function search(term, opts = {}) {
    const t = term.trim().toLowerCase();
    let list = questions;
    if (opts.subject) list = list.filter(q => q.subject === opts.subject);
    if (opts.topic) list = list.filter(q => q.topic === opts.topic);
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

  return { load, all, getSubjects, bySubjectCode, byId, scoredOnly, search, shuffle, getTopics, getTopic, byTopic, hasTopics, isTextbookSubject };
})();
