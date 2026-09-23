(function () {
  const M = [
    [8, 2, 3, 3, 1],
    [1, 2, 2, 2, 10],
    [.2, 2.7, .3, .3, .2],
    [.2, .3, 3, .3, .2],
    [.1, .2, .2, 2, .1]
  ];
  const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800];

  function compositions(total, n, prefix = [], out = []) {
    if (n === 1) {
      out.push([...prefix, total]);
      return out;
    }
    for (let i = 0; i <= total; i++) compositions(total - i, n - 1, [...prefix, i], out);
    return out;
  }

  const RANDOM_COMPOSITIONS = compositions(10, 5);

  function weight(points) {
    return FACT[10] / points.reduce((product, value) => product * FACT[value], 1);
  }

  function zeroDTypical(base, ratio) {
    const frequencies = Array.from({ length: 5 }, () => new Map());
    for (const random of RANDOM_COMPOSITIONS) {
      const bp = base.map((value, i) => (value + random[i]) * ratio / 100);
      const scenarioWeight = weight(random);
      M.forEach((row, statIndex) => {
        const value = Math.floor(20 + row.reduce((sum, coefficient, i) => sum + coefficient * bp[i], 0) + 1e-8);
        frequencies[statIndex].set(value, (frequencies[statIndex].get(value) || 0) + scenarioWeight);
      });
    }
    return frequencies.map(map => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]);
  }

  window.CG_REFERENCE = { zeroDTypical };
})();
