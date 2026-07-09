// Loads chunked textbook content (Oxford ATPL books, ICAO Annex 3) on demand,
// per subject, and does simple keyword-overlap retrieval — no external
// embedding API needed, keeps everything client-side and free to run.
const Textbook = (() => {
  const cache = {}; // subject -> chunks[] | null (null = confirmed no textbook)
  const AVAILABLE_SUBJECTS = new Set(['ALW', 'NAV', 'OPC', 'MET', 'RT']);

  const STOPWORDS = new Set('a an the of to in and for is are on with as by at from this that be or which it its into can may shall must not used use should will if than then when where each their these those such has have been'.split(' '));

  function tokenize(text) {
    return (text.toLowerCase().match(/[a-z][a-z\-]{2,}/g) || []).filter(w => !STOPWORDS.has(w));
  }

  async function loadSubject(subject) {
    if (subject in cache) return cache[subject];
    if (!AVAILABLE_SUBJECTS.has(subject)) { cache[subject] = null; return null; }
    try {
      const res = await fetch(`data/textbooks/${subject}.json?v=${typeof APP_DATA_VERSION !== 'undefined' ? APP_DATA_VERSION : 1}`);
      if (!res.ok) { cache[subject] = null; return null; }
      cache[subject] = await res.json();
    } catch (e) {
      cache[subject] = null;
    }
    return cache[subject];
  }

  function scoreChunk(queryTerms, chunk) {
    const termSet = new Set(chunk.terms);
    let hits = 0;
    for (const t of queryTerms) if (termSet.has(t)) hits++;
    return hits;
  }

  async function findRelevant(subject, queryText, limit = 3) {
    const chunks = await loadSubject(subject);
    if (!chunks || !chunks.length) return [];
    const queryTerms = tokenize(queryText);
    if (!queryTerms.length) return [];
    const scored = chunks
      .map(c => ({ c, score: scoreChunk(queryTerms, c) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return scored.map(x => x.c);
  }

  function formatContext(chunks) {
    if (!chunks.length) return '';
    return chunks.map(c =>
      `[${c.book}, p.${c.pageStart}${c.pageEnd !== c.pageStart ? '-' + c.pageEnd : ''}]\n${c.text}`
    ).join('\n\n---\n\n');
  }

  function hasTextbook(subject) {
    return AVAILABLE_SUBJECTS.has(subject);
  }

  return { loadSubject, findRelevant, formatContext, hasTextbook };
})();
