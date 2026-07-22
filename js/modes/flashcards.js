const Mode_Flashcards = (() => {
  let deck = [];
  let pos = 0;
  let filters = { subject: '', dueOnly: false };

  function buildDeck() {
    let list = DataStore.all().filter(q => q.scored && (q.type === 'short' ? !!q.answer : q.correctIndex != null));
    if (filters.subject) list = list.filter(q => q.subject === filters.subject);
    if (filters.dueOnly) list = list.filter(q => SRS.isDue(Store.getCardSrs(q.id)));
    return list;
  }

  function render(container, params = {}) {
    if (params.subject) filters.subject = params.subject;
    const subjects = DataStore.getSubjects().filter(s => s.scoredCount > 0);
    container.innerHTML = `
      <div class="eyebrow">Ultra Revision</div>
      <h1>Flashcards</h1>
      <p>Auto-generated from the answer-keyed question bank — nothing invented, just the original question and its marked correct answer.</p>

      <div class="filters">
        <select id="fc-subject">
          <option value="">All subjects</option>
          ${subjects.map(s => `<option value="${s.code}" ${filters.subject===s.code?'selected':''}>${UI.escapeHtml(s.name)}</option>`).join('')}
        </select>
        <label style="display:flex; align-items:center; gap:6px; font-size:13px; color:var(--text-dim); font-weight:500;">
          <input type="checkbox" id="fc-due" style="width:auto;"> Due for review only
        </label>
        <button class="btn btn-sm" id="fc-shuffle">🔀 Shuffle</button>
      </div>

      <div id="fc-stage"></div>
    `;
    container.querySelector('#fc-subject').addEventListener('change', e => { filters.subject = e.target.value; resetDeck(container); });
    container.querySelector('#fc-due').addEventListener('change', e => { filters.dueOnly = e.target.checked; resetDeck(container); });
    container.querySelector('#fc-shuffle').addEventListener('click', () => { deck = DataStore.shuffle(deck); pos = 0; renderCard(container); UI.toast('Shuffled'); });

    resetDeck(container);
  }

  function resetDeck(container) {
    deck = buildDeck();
    pos = 0;
    renderCard(container);
  }

  function renderCard(container) {
    const stage = container.querySelector('#fc-stage');
    if (!deck.length) {
      stage.innerHTML = `<div class="empty-state"><div class="icon">▢</div>No cards match these filters. ${filters.dueOnly ? 'Nothing is due right now — nice work.' : ''}</div>`;
      return;
    }
    const q = deck[pos];
    const prog = Store.getQuestionProgress(q.id);
    const srsData = Store.getCardSrs(q.id);

    stage.innerHTML = `
      <div class="flash-stage">
        <div class="flashcard" id="flashcard">
          <div class="flashcard-inner">
            <div class="flashcard-face front">
              <div>
                <div class="eyebrow" style="margin-bottom:10px;">${UI.escapeHtml(q.subjectName)} · #${q.number}</div>
                ${UI.escapeHtml(q.text)}
              </div>
            </div>
            <div class="flashcard-face back">
              <div>
                <div class="eyebrow" style="margin-bottom:10px; color:var(--amber);">Answer</div>
                ${UI.escapeHtml(q.type === 'short' ? q.answer : q.options[q.correctIndex])}
              </div>
            </div>
          </div>
        </div>
        <div class="flash-progress">${pos+1} / ${deck.length} · ease ${srsData.ease.toFixed(1)} · ${srsData.reps || 0} reps</div>
        <div class="flash-controls">
          <button class="btn btn-danger btn-sm" id="grade-again">Again</button>
          <button class="btn btn-sm" id="grade-good">Good</button>
          <button class="btn btn-primary btn-sm" id="grade-easy">Easy</button>
        </div>
        <div class="flash-controls">
          <button class="btn btn-ghost btn-sm" id="fc-fav">${prog.favorite ? '♥ Favorited' : '♡ Favorite'}</button>
          <button class="btn btn-ghost btn-sm" id="fc-prev" ${pos===0?'disabled':''}>← Prev</button>
          <button class="btn btn-ghost btn-sm" id="fc-skip">Skip →</button>
        </div>
      </div>
    `;

    const card = stage.querySelector('#flashcard');
    card.addEventListener('click', () => card.classList.toggle('flipped'));

    stage.querySelector('#grade-again').addEventListener('click', (e) => { e.stopPropagation(); grade(q, 0, container); });
    stage.querySelector('#grade-good').addEventListener('click', (e) => { e.stopPropagation(); grade(q, 1, container); });
    stage.querySelector('#grade-easy').addEventListener('click', (e) => { e.stopPropagation(); grade(q, 2, container); });
    stage.querySelector('#fc-fav').addEventListener('click', (e) => { e.stopPropagation(); Store.toggleFlag(q.id, 'favorite'); renderCard(container); });
    stage.querySelector('#fc-prev').addEventListener('click', (e) => { e.stopPropagation(); pos = Math.max(0,pos-1); renderCard(container); });
    stage.querySelector('#fc-skip').addEventListener('click', (e) => { e.stopPropagation(); advance(container); });
  }

  function grade(q, g, container) {
    const cur = Store.getCardSrs(q.id);
    const next = SRS.schedule(cur, g);
    Store.setCardSrs(q.id, next);
    advance(container);
  }

  function advance(container) {
    if (pos < deck.length - 1) pos++;
    else { UI.toast('Deck complete for this filter.', 'success'); pos = 0; }
    renderCard(container);
  }

  document.addEventListener('keydown', (e) => {
    if (App.currentRoute() !== 'flashcards') return;
    if (e.key === ' ') { e.preventDefault(); document.getElementById('flashcard')?.click(); }
  });

  return { render };
})();
