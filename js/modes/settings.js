const Mode_Settings = (() => {
  function render(container) {
    const s = Store.getSettings();
    container.innerHTML = `
      <div class="eyebrow">Configuration</div>
      <h1>Settings</h1>

      <div class="card" style="max-width:560px;">
        <h2>Gemini API key</h2>
        <p>Stored only in this browser's local storage. It's sent directly from your browser to Google's API — never to any server of mine, and never committed to your repo.</p>
        <div class="field">
          <label>API key</label>
          <input type="password" id="set-key" value="${UI.escapeHtml(s.geminiKey)}" placeholder="AIza…">
          <div class="hint">Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a></div>
        </div>
        <div class="field">
          <label>Model</label>
          <select id="set-model">
            ${['gemini-2.5-flash','gemini-2.5-pro','gemini-3.5-flash','gemini-3.1-pro-preview'].map(m =>
              `<option value="${m}" ${s.geminiModel===m?'selected':''}>${m}</option>`).join('')}
          </select>
          <div class="hint">Flash models are fast and cheap; Pro models reason more deeply on harder questions.</div>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-primary" id="save-key">Save</button>
          <button class="btn" id="test-key">Test connection</button>
        </div>
        <div id="key-test-result" style="margin-top:12px;"></div>
      </div>

      <div class="card" style="max-width:560px;">
        <h2>Appearance</h2>
        <div class="field">
          <label>Theme</label>
          <select id="set-theme">
            <option value="dark" ${s.theme==='dark'?'selected':''}>Dark</option>
            <option value="light" ${s.theme==='light'?'selected':''}>Light</option>
          </select>
        </div>
      </div>

      <div class="card" style="max-width:560px;">
        <h2>Data</h2>
        <p>All progress, flashcard scheduling, streaks and bookmarks live only in this browser. Nothing syncs elsewhere.</p>
        <button class="btn btn-danger" id="reset-data">Reset all progress</button>
      </div>

      <div class="card" style="max-width:560px;">
        <h2>About this data</h2>
        <p><strong>Scored set</strong> (993 questions, 9 subjects): correct answers taken directly from the source material's own answer markings. Used for Learn, Quiz, Flashcards, and Weak Topics scoring.</p>
        <p><strong>Reference set</strong> (6,551 questions, 8 subjects): included for extra practice, but the source files don't mark a correct answer, so these are unscored — Gemini will discuss the concept but won't claim to know "the" answer.</p>
        <p><strong>Textbook grounding</strong>: for Air Law, Navigation, Operational Procedures, and Meteorology, Gemini's explanations pull in relevant passages from the Oxford ATPL course books and ICAO Annex 3 so its answers are grounded in your actual course material.</p>
      </div>
    `;

    container.querySelector('#save-key').addEventListener('click', () => {
      Store.setSettings({
        geminiKey: container.querySelector('#set-key').value.trim(),
        geminiModel: container.querySelector('#set-model').value,
      });
      UI.toast('Settings saved.', 'success');
      App.updateKeyPill();
    });
    container.querySelector('#test-key').addEventListener('click', async () => {
      const key = container.querySelector('#set-key').value.trim();
      const model = container.querySelector('#set-model').value;
      const out = container.querySelector('#key-test-result');
      if (!key) { out.innerHTML = '<span style="color:var(--error);">Enter a key first.</span>'; return; }
      out.innerHTML = '<span class="explain-loading">Testing…</span>';
      try {
        await Gemini.testConnection(key, model);
        out.innerHTML = '<span style="color:var(--success);">✓ Connected successfully.</span>';
      } catch (e) {
        out.innerHTML = `<span style="color:var(--error);">✗ ${UI.escapeHtml(e.message)}</span>`;
      }
    });
    container.querySelector('#set-theme').addEventListener('change', e => {
      Store.setSettings({ theme: e.target.value });
      App.applyTheme(e.target.value);
    });
    container.querySelector('#reset-data').addEventListener('click', () => {
      if (confirm('This clears all local progress, flashcard scheduling, and streaks. Continue?')) {
        Store.resetAll();
        UI.toast('Progress reset.', 'success');
        App.navigate('dashboard');
      }
    });
  }

  return { render };
})();
