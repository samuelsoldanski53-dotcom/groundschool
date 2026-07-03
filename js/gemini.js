// Direct browser -> Gemini API calls. The API key never leaves the browser
// except in the request Google itself receives. Nothing is proxied through
// any server, so this works fine on static hosting like GitHub Pages.
const Gemini = (() => {
  const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

  const TUTOR_SYSTEM = `You are an experienced ATPL/PPL ground school flight instructor acting as a personal AI tutor inside a revision app.

Strict rules you must always follow:
- NEVER invent, alter, or second-guess the question, its options, or which option is marked correct — those come from the official uploaded question bank and are fixed. Your job is only to explain.
- If asked to explain why the marked "correct" answer is correct, or why an option is wrong, do so using real aviation/regulatory knowledge (ICAO Annexes, EASA Part-FCL/Part-MED, general airmanship, meteorology, navigation, principles of flight, etc).
- Clearly separate what comes from the syllabus/question bank from any supplementary context you add — label supplementary facts explicitly, e.g. "For context (not part of the question):".
- Keep explanations concise but complete: correct answer rationale, why the student's answer (if wrong) was wrong, why distractors are wrong, one memory aid if useful, and a common mistake to watch for.
- Use a warm, encouraging, expert instructor tone. No filler, no excessive apologising.
- Where genuinely relevant, give a short real-world aviation example.`;

  function getEndpoint(model, apiKey) {
    return `${BASE}/${model}:generateContent`;
  }

  async function callGemini(apiKey, model, systemInstruction, contents) {
    const url = getEndpoint(model, apiKey);
    const body = {
      contents,
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      generationConfig: { temperature: 0.4 },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = `Gemini API error (${res.status})`;
      try {
        const err = await res.json();
        msg = err?.error?.message || msg;
      } catch (e) {}
      throw new Error(msg);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    if (!text) throw new Error('Gemini returned an empty response.');
    return text;
  }

  async function testConnection(apiKey, model) {
    return callGemini(apiKey, model, null, [
      { role: 'user', parts: [{ text: 'Reply with exactly: OK' }] },
    ]);
  }

  function formatQuestionForPrompt(q) {
    const opts = q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n');
    const correct = q.scored && q.correctIndex != null ? String.fromCharCode(65 + q.correctIndex) : 'unknown (not marked in source material)';
    return `Subject: ${q.subjectName}\nQuestion #${q.number}:\n${q.text}\n\nOptions:\n${opts}\n\nMarked correct answer: ${correct}`;
  }

  async function explainQuestion({ apiKey, model, question, userAnswerIndex, isCorrect, textbookContext }) {
    const qBlock = formatQuestionForPrompt(question);
    const userAnswerText = userAnswerIndex != null && question.options[userAnswerIndex] != null
      ? `${String.fromCharCode(65 + userAnswerIndex)}) ${question.options[userAnswerIndex]}`
      : '(no answer selected)';

    const contextBlock = textbookContext
      ? `\n\nRelevant excerpts from the official course textbooks (use these to ground your explanation where they're relevant — cite the book/page naturally in prose, don't just dump them):\n${textbookContext}\n`
      : '';

    const prompt = `${qBlock}\n\nStudent's answer: ${userAnswerText}\nResult: ${isCorrect === true ? 'Correct' : isCorrect === false ? 'Incorrect' : 'Not graded (this question has no marked correct answer in the source material — treat it as reference-only and explain the concept generally without confirming or denying any option as "the" correct one)'}${contextBlock}\n\nProvide, using short markdown-style headers:\n1. Why the correct answer is correct (or, if ungraded, what the key concept being tested is)\n2. Why the student's answer was wrong (skip if correct or no answer given)\n3. Why the other options are wrong (briefly, one line each)\n4. Key concept to remember\n5. A common mistake students make on this topic\n(Keep the whole thing tight — a few short paragraphs, not an essay.)`;

    return callGemini(apiKey, model, TUTOR_SYSTEM, [
      { role: 'user', parts: [{ text: prompt }] },
    ]);
  }

  async function chatTutor({ apiKey, model, history, message, contextQuestion, textbookContext }) {
    const contents = [];
    if (contextQuestion) {
      contents.push({
        role: 'user',
        parts: [{ text: `For context, here is the question we're discussing:\n${formatQuestionForPrompt(contextQuestion)}` }],
      });
      contents.push({ role: 'model', parts: [{ text: 'Got it — I have that question in mind. What would you like to know?' }] });
    }
    if (textbookContext) {
      contents.push({
        role: 'user',
        parts: [{ text: `Here are relevant excerpts from the official course textbooks — use them to ground your answer where relevant:\n${textbookContext}` }],
      });
      contents.push({ role: 'model', parts: [{ text: 'Noted, I\'ll draw on that where it helps.' }] });
    }
    for (const m of history) {
      contents.push({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });
    return callGemini(apiKey, model, TUTOR_SYSTEM, contents);
  }

  async function gradeFreeAnswer({ apiKey, model, question, studentAnswer }) {
    const qBlock = formatQuestionForPrompt(question);
    const prompt = `${qBlock}\n\nThis is a free-text answer question. The student answered:\n"${studentAnswer}"\n\nCompare it against the marked correct answer above. Respond with a first line of exactly "GRADE: CORRECT" or "GRADE: INCORRECT" or "GRADE: PARTIAL", then on following lines briefly explain why, referencing the correct answer.`;
    const text = await callGemini(apiKey, model, TUTOR_SYSTEM, [{ role: 'user', parts: [{ text: prompt }] }]);
    const gradeMatch = text.match(/GRADE:\s*(CORRECT|INCORRECT|PARTIAL)/i);
    const grade = gradeMatch ? gradeMatch[1].toUpperCase() : 'UNKNOWN';
    return { grade, explanation: text.replace(/GRADE:\s*(CORRECT|INCORRECT|PARTIAL)\s*/i, '').trim() };
  }

  return { testConnection, explainQuestion, chatTutor, gradeFreeAnswer };
})();
