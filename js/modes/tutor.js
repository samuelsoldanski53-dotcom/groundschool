const Mode_Tutor = (() => {
  let history = [];
  let contextQuestion = null;

  function render(container, params = {}) {
    if (params.questionId) {
      contextQuestion = DataStore.byId(params.questionId);
      history = [];
    }
    container.innerHTML = `
      <div class="eyebrow">Ultra Revision</div>
      <h1>AI Tutor</h1>
      <p>A 24/7 instructor for the material in your question bank. Ask about a concept, a calculation, or a specific question.</p>

      ${contextQuestion ? `
        <div class="card" style="margin-bottom:16px; border-color: var(--amber);">
          <div class="eyebrow">Discussing</div>
          <div style="font-size:14px; margin-top:4px;">${UI.escapeHtml(contextQuestion.subjectName)} #${contextQuestion.number}: ${UI.escapeHtml(contextQuestion.text)}</div>
          <button class="btn btn-ghost btn-sm" id="clear-ctx" style="margin-top:8px;">Clear context</button>
        </div>
      ` : ''}

      <div class="card">
        <div class="chat-window" id="chat-window"></div>
        <div class="chat-input-row">
          <textarea id="chat-input" placeholder="Ask anything about your syllabus…"></textarea>
          <button class="btn btn-primary" id="chat-send">Send</button>
        </div>
        <div class="hint">Gemini explains and teaches — it never rewrites or generates new exam questions.</div>
      </div>
    `;

    renderHistory(container);

    const clearBtn = container.querySelector('#clear-ctx');
    if (clearBtn) clearBtn.addEventListener('click', () => { contextQuestion = null; render(container); });

    const send = () => {
      const input = container.querySelector('#chat-input');
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      sendMessage(container, msg);
    };
    container.querySelector('#chat-send').addEventListener('click', send);
    container.querySelector('#chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }

  function renderHistory(container) {
    const win = container.querySelector('#chat-window');
    if (!history.length) {
      win.innerHTML = `<div class="empty-state" style="padding:30px;"><div class="icon">✦</div>Ask your first question to get started.</div>`;
      return;
    }
    win.innerHTML = history.map(m => `<div class="chat-msg ${m.role}">${UI.escapeHtml(m.text)}</div>`).join('');
    win.scrollTop = win.scrollHeight;
  }

  async function sendMessage(container, msg) {
    const settings = UI.requireApiKey();
    if (!settings) return;
    history.push({ role: 'user', text: msg });
    renderHistory(container);
    history.push({ role: 'ai', text: '…' });
    renderHistory(container);

    try {
      const reply = await Gemini.chatTutor({
        apiKey: settings.geminiKey, model: settings.geminiModel,
        history: history.slice(0, -1).map(m => ({ role: m.role === 'ai' ? 'model' : 'user', text: m.text })),
        message: msg,
        contextQuestion,
      });
      history[history.length - 1] = { role: 'ai', text: reply };
    } catch (e) {
      history[history.length - 1] = { role: 'ai', text: `Error: ${e.message}` };
    }
    renderHistory(container);
  }

  return { render };
})();
