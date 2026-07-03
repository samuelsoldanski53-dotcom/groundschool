# Groundschool — Personal ATPL/PPL Revision App

A private, personal revision app built around your uploaded question banks. Gemini
acts as a tutor that explains the existing questions — it never generates, rewrites,
or alters them.

## What's inside

- **Learn Mode** — one question at a time, original wording, instant correct/incorrect
  feedback plus a full Gemini explanation (why it's right, why your answer was wrong,
  why the distractors are wrong, a memory aid, a common mistake).
- **Flashcards** — auto-generated Question → Answer cards from the scored question
  bank, with flip animation, shuffle, Again/Good/Easy grading, and spaced repetition
  scheduling (SM-2 style).
- **Quiz Mode** — timed-feel scored quizzes by subject or mixed, with a results
  breakdown by subject and a full review of what you got wrong.
- **Weak Topics** — automatically surfaces your lowest-accuracy subjects and
  currently-missed questions from your own answer history, plus an optional
  Gemini-generated study plan.
- **AI Tutor** — a free-form chat instructor, optionally scoped to a specific question.
- **Dashboard** — streaks, overall accuracy, per-subject mastery gauges, bookmarks.

Dark/light mode, keyboard shortcuts (1–7 to answer, → for next, Space to flip a
flashcard), and everything is mobile-responsive.

## About the data

Your upload contained two question banks:

- **`Black/` (993 questions → 979 usable, 9 subjects)**: the source PDFs mark the
  correct answer directly (a checked-box glyph), so these are fully **scored** —
  used for Learn/Quiz correctness checking, Flashcards, and Weak Topics.
- **`Blue/` (6,551 questions, 8 subjects)**: a different export format (Kenya
  civil-aviation focused). I checked every page for a correct-answer marking —
  bold, colour, an answer-key appendix — and there isn't one in these files. These
  are loaded as **unscored reference practice** only: Learn Mode will show them and
  Gemini will discuss the concept, but nothing claims to know "the" right answer.
  If you have a separate answer key for this set, send it over and I can wire up
  scoring for it too.

Both source files carry a copyright notice from the publisher (LPLUS GmbH /
Aircademy). This app is set up for **your personal study use only** — if you ever
want to share it with others, that would need the publisher's permission first.

**A known cosmetic issue:** a handful of Blue-set questions involving compass
headings/bearings had their degree symbol (°) come through as `?` in the source
PDF's font encoding. I fixed the common case (a `?` right after a number), but if
you spot a stray one, that's why.

## Running it locally

No build step — it's plain HTML/CSS/JS. From this folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` directly via `file://` won't work — the browser blocks the
fetch of `data/questions.json` from a local file. You need a local server, which
is exactly what `http.server` gives you.)

## Setting up your Gemini API key

1. Get a free key at **https://aistudio.google.com/apikey**
2. In the app, open **Settings** → paste the key → **Save** → **Test connection**
3. The key is stored only in your browser's `localStorage`. It's sent directly from
   your browser straight to Google's API — it is never written to any file in this
   repo, and never passes through any server of mine.

## Deploying to GitHub Pages (private repo)

1. Create a new **private** GitHub repository.
2. Push this folder's contents to it:
   ```bash
   cd groundschool
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Source → Deploy from a branch → `main` / `/(root)`**.
4. Wait a minute, then visit the URL GitHub gives you.

**Important caveat about "private":** on GitHub's **Free** plan, GitHub Pages
sites are always publicly reachable at their URL even when the *source repo* is
private — "private repo" controls who can see your code, not who can load the
published site. If that matters to you (given the copyright note above), you have
two options:
- Upgrade to **GitHub Pro/Team/Enterprise**, where Pages sites from private repos
  can be restricted to repo collaborators only, or
- Skip Pages and just run it locally (`python3 -m http.server`), or serve it from
  somewhere you control access to.

Either way, no secret ever ends up in the repo — the Gemini key lives only in your
browser, so even a public Pages URL doesn't leak your API key. It would, however,
expose the question bank content to anyone with the link.

## Data persistence

All progress (attempts, streaks, flashcard scheduling, bookmarks, favorites, quiz
history) lives in your browser's `localStorage`, per-browser. There's no account
system and nothing syncs between devices. **Settings → Reset all progress** wipes
it if you ever want a clean slate.

## Extending it

The parser scripts used to build `data/questions.json` from the original PDFs are
not included here (they were a one-off extraction step), but the JSON schema is
simple:

```json
{
  "id": "blk-ALW-1",
  "source": "black",
  "scored": true,
  "subject": "ALW",
  "subjectName": "Air Law",
  "number": 1,
  "text": "...",
  "options": ["...", "...", "...", "..."],
  "correctIndex": 1,
  "points": "1.00"
}
```

If you get an answer key for the Blue set, or more question banks later, you can
regenerate/extend this file and everything else keeps working.
