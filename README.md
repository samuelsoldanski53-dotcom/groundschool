# Groundschool — Personal ATPL/PPL Revision App

A private, personal revision app built around your uploaded question banks. Gemini
acts as a tutor that explains the existing questions — it never generates, rewrites,
or alters them.

## What's inside

- **Learn Mode** — one question at a time, original wording, instant correct/incorrect
  feedback plus a full Gemini explanation (why it's right, why your answer was wrong,
  why the distractors are wrong, a memory aid, a common mistake) — grounded in the
  official course textbooks where available (see below).
- **Flashcards** — auto-generated Question → Answer cards from the scored question
  bank, with flip animation, shuffle, Again/Good/Easy grading, and spaced repetition
  scheduling (SM-2 style).
- **Quiz Mode** — configurable scored quizzes (subject, length, weak-question
  priority, "skip mastered questions"), a flag button per question, a results
  screen with per-subject gauges, one-click **retry just what you got wrong** or
  **review flagged questions**, quiz history, and a **🧠 Explain this** button on
  every missed question in the review so Gemini walks you through it right there.
- **Weak Topics** — automatically surfaces your lowest-accuracy subjects and
  currently-missed questions from your own answer history, plus an optional
  Gemini-generated study plan.
- **AI Tutor** — a free-form chat instructor, optionally scoped to a specific
  question, also grounded in the textbooks where relevant.
- **Dashboard** — streaks, overall accuracy, best quiz score, bookmarks, and a
  topic/chapter card grid (one card per subject, with an icon, a short blurb,
  a coverage bar, and one-tap Flashcards / Take Quiz / Study buttons). The
  sidebar also lists every subject with a mini coverage bar for quick jumping.

## Changelog notes

- Ported the topic-card dashboard layout and per-subject sidebar navigation
  from a separate React reference prototype (`easa-human-performance-revision`),
  reimplemented from scratch in vanilla JS/CSS to match this app's existing
  no-build-step architecture and navy/amber design system. Topic grouping is
  the same source-verified subject taxonomy the question bank already used
  (ALW, AGK, NAV, MET, etc.) — no new categorization was invented for the
  actual question content, only presentation metadata (icon + one-line blurb
  per subject).
- Fixed a data bug where the Blue set's Human Performance subject code (`HP`)
  didn't match the Black set's (`HPL`), which caused a duplicate entry in the
  subject dropdown/cards. Both now use `HPL` consistently.
- **Library & Topic rebuild (this session):** the whole Library and Learn Mode
  were restructured into Subject → Topic → Learn/Flashcards/Topic Quiz, matching
  a real learning-platform hierarchy instead of one long mixed question pool.
  - **Human Performance textbook added.** You uploaded the Oxford ATPL Book 8 —
    Human Performance and Limitations PDF; it's now chunked into `data/textbooks/HPL.json`
    (17 real chapters, page-linked) exactly like the other five textbooks.
  - **Topic detection**: for the 6 textbook subjects (ALW, NAV, OPC, MET-original,
    RT, HPL) I parsed each book's real table of contents and located the actual
    chapter-divider pages in the PDF, so every topic is backed by real page ranges
    — nothing invented. This is best-effort text parsing, not a human-verified index:
    ALW (26 topics), OPC (19), MET-icao (unused, see below), RT (11), HPL (17) came
    out clean; NAV (36 topics) has one known gap — "Topographical Maps and Map
    Reading" didn't get its own boundary and its content is folded into the
    previous chapter's range.
  - **Meteorology textbook swapped for a syllabus list.** The only MET PDF on hand
    (ICAO Annex 3) is a regulatory standard about *how* meteorological services
    are delivered, not weather science — your actual MET questions are about
    clouds, fronts, and pressure systems, so matching them against Annex 3 gave
    poor results. MET now uses a standard EASA 050 syllabus topic list (12 topics)
    instead, same approach as the no-textbook subjects below.
  - **No-textbook subjects** (AGK, COM, FPP, POF) each got a standard EASA
    syllabus-based topic list (5–17 topics depending on subject) with no lesson
    text behind them — just a Learn/Flashcards/Quiz split by topic.
  - **All 7,653 questions were categorized** by TF-IDF text-similarity against
    each subject's topic content (real lesson text where available, syllabus
    keywords otherwise) — every question has a topic, none left in a generic
    pool. This is automated content-matching, not manually verified; spot-checks
    looked sound, but treat topic boundaries as "best effort," especially for the
    5 syllabus-based subjects where match confidence is inherently lower (no real
    lesson text to compare against).
  - Dashboard now shows **topics completed/remaining** and **strongest/weakest
    topics**, computed the same way as the existing subject-level stats.
  - Weak Topics mode is unchanged (still subject-level, not topic-level) — a
    good next step if you want topic-level weak-area tracking too.


Dark/light mode, keyboard shortcuts (1–7 to answer, → for next, Space to flip a
flashcard), and everything is mobile-responsive.

## Textbook grounding

Your upload also included a `TextBooks/` folder. I extracted and chunked the ones
with a real text layer, **and** the original PDFs themselves are now bundled in
the app under `data/textbook-pdfs/` — viewable in-app or downloadable straight
from the **Library** section:

| Book | Subject | Chunks | Original PDF |
|---|---|---|---|
| Oxford ATPL Book 1 — Air Law | ALW | 404 | 11.3 MB (compressed from 110 MB, see note below) |
| Oxford ATPL Book 10 — General Navigation | NAV | 463 | 35.2 MB |
| ATPL Book 12 + Oxford ATPL Book 12 — Operational Procedures | OPC | 368 | 3.1 MB + 20.4 MB |
| ICAO Annex 3 — Meteorological Service for International Air Navigation | MET | 166 | 6.3 MB |

**About GitHub's file size limit:** GitHub blocks any individual file over 100MB
— that's a hard per-file cap, not something you can get around by splitting it
across multiple commits/pushes. The original Air Law PDF was 110MB, so I ran it
through Ghostscript's `/ebook` compression preset (downsamples embedded images to
~150dpi, recompresses fonts) to bring it down to 11.3MB — still fully readable on
screen, just not print-resolution. Every other textbook PDF was already under the
limit and is included at full original quality. Total repo size with all of this
included is about 84MB, comfortably fine for a normal GitHub repo.

Where you'll find them:
- **Library** (new sidebar section): browse/search the extracted text per subject,
  plus **View** (opens the real PDF in-app) and **Download** buttons for each
  original book.
- **Learn Mode**: a "📘 Browse [subject] textbook" button appears under Gemini's
  explanation for any question in a subject that has a textbook.
- **Behind the scenes**: the chunked text (not the PDFs — those are just for you
  to read) is what gets fed to Gemini as grounding context in Learn Mode, Quiz
  review, and the AI Tutor.

Two files from the original folder weren't included:
- **`AIRLAW SUMMARY.pdf`** is a scanned/image-only PDF with no text layer, so it
  couldn't be extracted or meaningfully compressed further without OCR. The full
  Air Law book covers the same ground.
- **`OPC_EN.pdf`** turned out to be a smaller excerpt of the same Operational
  Procedures question bank you already have in `Black/`, not a textbook — skipped
  as redundant.

Subjects without a matching textbook (AGK, COM, FPP, POF) work exactly as
before — Gemini answers from its own aviation knowledge, clearly labelled as
supplementary where relevant. **HPL now has a real textbook** — see the Library
& Topics changelog entry below.

## Radiotelephony (RT)

You later uploaded a Skymax Aviation RT notes document. Two genuinely different
things came out of it:

1. **123 real questions** — the notes end with a "Self Study Questions" appendix:
   123 short-answer Q&A pairs with real model answers already written into the
   source (e.g. "What is the minimum age for a R/T licence? [17 Years]"). These
   are loaded as **scored, short-answer** questions (`type: "short"`) — a new
   question type alongside the existing multiple-choice ones. In Learn Mode you
   type an answer instead of picking an option, and Gemini grades it against the
   source's own model answer (correct / partial / incorrect), the same way it
   would grade any free-text response. These also work as flashcards. They're
   excluded from Quiz Mode, which is click-based and MCQ-only by design.
2. **The rest of the document** (radio theory, ATC procedures, distress/urgency
   phraseology, Q-codes, call signs, etc.) was chunked into `data/textbooks/RT.json`
   (50 sections) exactly like the other textbooks, and the original PDF is
   bundled in `data/textbook-pdfs/` — browsable in the Library.

**On AI-generated questions:** you asked for AI to craft questions where none
were provided. Since real questions *were* available here (the 123 above), I
used those rather than inventing anything — fabricated questions could teach
wrong "facts" with no way to verify them against a real source, which runs
against the whole point of this app (fidelity to your actual material). Instead,
I added a **separate, clearly-labelled feature**: in Learn Mode, pick a subject
that has a textbook (ALW, NAV, OPC, MET, or RT) and you'll see a "🤖 Generate
one" button. It asks Gemini to write a fresh multiple-choice practice question
grounded in that subject's textbook content — tagged **"AI-generated — not from
an official bank"**, answered instantly, and deliberately **not** counted toward
your mastery/weak-topics stats, so it can never be confused with or dilute your
real exam-readiness numbers. I checked the actual format regulators use for RT
exams (KCAA, SACAA, UK CAA) before building this — multiple-choice with 3-4
options is the standard format, sometimes mixed with True/False or fill-in-the-
blank, which is what these generated questions follow.




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
