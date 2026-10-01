((root) => {
  const total = (level, rules) => rules.initial + (level - 1) * rules.perLevel;
  function recommend(level, target, rules) {
    const points = [0,0,0,0,0], weight = target.reduce((a,b) => a+b,0);
    for (let current = 1; current <= level; current++) {
      const budget = total(current, rules), cap = Math.floor(budget * rules.singleFraction);
      while (points.reduce((a,b) => a+b,0) < budget) {
        const allocated = points.reduce((a,b) => a+b,0);
        let index = -1, score = -Infinity;
        target.forEach((value, i) => {
          const deficit = (allocated + 1) * value / weight - points[i];
          if (points[i] < cap && deficit > score) { index = i; score = deficit; }
        });
        points[index]++;
      }
    }
    return points;
  }
  root.CAREER_POINTS_CORE = { total, recommend };
})(typeof window === 'undefined' ? globalThis : window);
