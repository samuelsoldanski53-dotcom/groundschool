// A lightweight SM-2 derivative. Grades: 0=again(hard), 1=good, 2=easy.
const SRS = (() => {
  const DAY = 86400000;

  function schedule(current, grade) {
    let { ease, interval, reps } = current;
    ease = ease || 2.3;
    interval = interval || 0;
    reps = reps || 0;

    if (grade === 0) { // hard / again
      reps = 0;
      interval = 1; // back tomorrow (in real SM-2 this would be minutes; daily granularity fits a revision app)
      ease = Math.max(1.3, ease - 0.2);
    } else if (grade === 1) { // good
      reps += 1;
      ease = ease;
      if (reps === 1) interval = 1;
      else if (reps === 2) interval = 3;
      else interval = Math.round(interval * ease);
    } else { // easy
      reps += 1;
      ease = ease + 0.15;
      if (reps === 1) interval = 3;
      else interval = Math.round(Math.max(interval, 1) * ease * 1.3);
    }

    const due = Date.now() + interval * DAY;
    return { ease, interval, reps, due };
  }

  function isDue(cardSrs) {
    return !cardSrs.due || cardSrs.due <= Date.now();
  }

  return { schedule, isDue };
})();
