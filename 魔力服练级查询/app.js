const form = document.querySelector('#finderForm');
const input = document.querySelector('#levelInput');
const results = document.querySelector('#results');
const empty = document.querySelector('#emptyState');
const title = document.querySelector('#resultsTitle');
const summary = document.querySelector('#resultSummary');
const resultIndex = document.querySelector('#resultIndex');
const ALL_RECORDS = [...PLACES, ...MONSTER_ZONES];

const clampLevel = value => Math.max(1, Math.min(120, Number.parseInt(value, 10) || 1));
const skillThreshold = level => Math.max(1, Math.floor(level / 2 - 3));

// d = 怪物平均等级 - 人物等级。怪物高0～5级时为100%；超过5级会骤降。
function xpPercent(characterLevel, monsterAverageLevel) {
  const d = Math.floor(monsterAverageLevel) - characterLevel;
  if (d >= 0 && d <= 5) return 100;
  if (d >= 25 || d <= -30) return 0;
  if (d >= 6) return Math.max(0, (25 - d) * 10 / 3);
  return Math.max(0, (30 + d) * 10 / 3);
}

function levelBandFor(place, level) {
  if (!place.levelBands?.length) return null;
  const targetMonsterLevel = level + 3;
  return [...place.levelBands].sort((a, b) => {
    const aMiddle = (a.mobs[0] + a.mobs[1]) / 2;
    const bMiddle = (b.mobs[0] + b.mobs[1]) / 2;
    return Math.abs(aMiddle - targetMonsterLevel) - Math.abs(bMiddle - targetMonsterLevel) || aMiddle - bMiddle;
  })[0];
}

const monsterRange = (place, level, mode = 'level') => mode === 'level' && levelBandFor(place, level)?.mobs || place.mobs;
const monsterAverage = (place, level, mode = 'level') => {
  const range = monsterRange(place, level, mode);
  return Math.floor((range[0] + range[1]) / 2);
};
const formatPercent = value => value === 0 ? '近乎 0%' : `${Number(value.toFixed(2))}%`;
function xpSnapshot(place, level) {
  const range = monsterRange(place, level, 'level');
  const values = [];
  for (let mobLevel = range[0]; mobLevel <= range[1]; mobLevel += 1) values.push(xpPercent(level, mobLevel));
  const averageLevel = monsterAverage(place, level, 'level');
  const lowestRate = xpPercent(level, range[0]);
  const averageRate = xpPercent(level, averageLevel);
  const highestRate = xpPercent(level, range[1]);
  return { representative: averageRate, min: Math.min(...values), max: Math.max(...values), averageLevel, lowestRate, averageRate, highestRate, range, band:levelBandFor(place, level) };
}

function scorePlace(place, level, mode) {
  if (mode === 'level') {
    const xp = xpSnapshot(place, level);
    let score = 100 - xp.representative + Math.abs(xp.averageLevel - (level + 3)) * .5;
    if (place.featured) score -= .75;
    if (place.countStatus === 'verified') score -= .35;
    return score;
  }
  const range = mode === 'level' ? place.player : mode === 'skill' ? place.skill : place.mobs;
  const middle = (range[0] + range[1]) / 2;
  let score = Math.abs(level - middle);
  if (place.featured) score -= .75;
  if (place.countStatus === 'verified') score -= .35;
  if (mode === 'skill' && place.count !== '待核验') score -= .25;
  return score;
}

function isMatch(place, level, mode) {
  if (mode === 'browse') return place.mobs[1] >= level - 5 && place.mobs[0] <= level + 5;
  if (!place.modes.includes(mode)) return false;
  if (mode === 'level') return xpSnapshot(place, level).max > 0;
  const range = mode === 'level' ? place.player : place.skill;
  if (!range || level < range[0] || level > range[1]) return false;
  return mode !== 'skill' || place.mobs[1] >= skillThreshold(level);
}

function reliabilityLabel(value) {
  return value === 'high' ? ['可靠性 高', 'good'] : value === 'medium' ? ['可靠性 中', ''] : ['可靠性 低', 'warn'];
}

function difficultyStars(value) {
  return '★'.repeat(value) + '☆'.repeat(5 - value);
}

function visiblePlaceNotes(place) {
  if (place.countStatus === 'verified') return place.notes || '';
  return (place.notes || '')
    .split(/(?<=[。；])/)
    .filter(sentence => !/(数量|每战|普通遭遇)/.test(sentence))
    .join('')
    .trim();
}

function buildCoreJudgment(place, level, mode, xp) {
  if (mode === 'browse') {
    const queryMin = Math.max(1, level - 5);
    const queryMax = Math.min(120, level + 5);
    return `怪物Lv.${place.mobs[0]}～${place.mobs[1]}与查询范围Lv.${queryMin}～${queryMax}相交。这只表示怪物等级分布命中，不代表适合练级或烧技能。`;
  }

  if (mode === 'skill') {
    return `人物Lv.${level}的技能经验初筛门槛为怪物平均Lv.${skillThreshold(level)}；本地点记录为Lv.${place.mobs[0]}～${place.mobs[1]}，因此通过地点级初筛。实际仍按当场全部怪物平均等级结算，BOSS不提供技能经验。`;
  }

  const guidePosition = level < place.player[0]
    ? `当前Lv.${level}低于攻略参考起点Lv.${place.player[0]}`
    : level > place.player[1]
      ? `当前Lv.${level}高于攻略参考上限Lv.${place.player[1]}`
      : `当前Lv.${level}处于攻略参考Lv.${place.player[0]}～${place.player[1]}范围内`;
  const averageRate = xp.averageRate;
  const decay = averageRate === 100
    ? '代表平均等级的等级差系数为100%'
    : averageRate >= 80
      ? `代表平均等级系数约${formatPercent(averageRate)}，衰减较小`
      : averageRate >= 50
        ? `代表平均等级系数约${formatPercent(averageRate)}，存在明显衰减`
        : averageRate > 0
          ? `代表平均等级系数约${formatPercent(averageRate)}，衰减较大`
          : '代表平均等级系数已接近0%';
  const spread = `最低／代表平均／最高怪物的估算分别为${formatPercent(xp.lowestRate)}、${formatPercent(xp.averageRate)}、${formatPercent(xp.highestRate)}`;
  const scopeSentence = xp.band
    ? `已按楼层等级变化选取“${xp.band.label}”（怪物Lv.${xp.range[0]}${xp.range[1] === xp.range[0] ? '' : `～${xp.range[1]}`}）参与排序。`
    : place.levelScope
      ? `本地点采用“${place.levelScope}”口径，Lv.${place.mobs[0]}～${place.mobs[1]}不表示每层都出现相同等级。`
      : '';
  const accessSentence = place.access ? '本地点另有独立准入条件，不能仅凭人物等级判断能否到达。' : '';
  return `${guidePosition}；${decay}；${spread}。${scopeSentence}${accessSentence}`;
}

function renderLevelBands(place, selectedBand) {
  if (!place.levelBands?.length) return '';
  return `<details class="layer-guide" open><summary><b>楼层／区域等级表</b><span>当前建议：${selectedBand.label}</span></summary><div class="layer-grid">${place.levelBands.map(band => `<div class="${band === selectedBand ? 'selected' : ''}"><b>${band.label}</b><span>怪物 Lv.${band.mobs[0]}${band.mobs[1] === band.mobs[0] ? '' : `～${band.mobs[1]}`}</span></div>`).join('')}</div></details>`;
}

function cardTemplate(place, index, mode) {
  const route = ROUTES[place.name] || {difficulty:place.difficulty || 3, tasks:place.tasks || '待补充', route:place.route || '前往方式仍需核验。', reliability:place.reliability || 'low', evidence:place.evidence || [place.source]};
  const src = SOURCES[place.source] || SOURCES[route.evidence?.[0]] || SOURCES.sinaTable;
  const [reliability, reliabilityClass] = reliabilityLabel(route.reliability);
  const range = mode === 'level' ? place.player : mode === 'skill' ? place.skill : place.mobs;
  const xp = mode === 'level' ? xpSnapshot(place, clampLevel(input.value)) : null;
  const shownMobs = mode === 'level' ? xp.range : place.mobs;
  const selectedBand = mode === 'level' ? xp.band : null;
  const accessLine = place.access ? `<span class="access-note"><b>准入 / 前置：</b>${place.access}</span>` : '';
  const countKnown = place.countStatus === 'verified' && place.count && place.count !== '待核验';
  const judgment = buildCoreJudgment(place, clampLevel(input.value), mode, xp);
  const placeNote = visiblePlaceNotes(place);
  const sourceKeys = [...(route.evidence || []), place.source, ...(mode === 'level' ? ['xpRule', 'xpTable'] : [])];
  const sourceLinks = [...new Set(sourceKeys)]
    .map(key => SOURCES[key])
    .filter(Boolean)
    .map(item => `<a class="card-source" href="${item.url}" target="_blank" rel="noreferrer">${item.name}</a>`)
    .join('<span class="source-sep">·</span>');
  return `<article id="result-card-${index}" class="map-card ${place.featured ? 'featured' : ''}">
    <div>
      <span class="card-rank">#${String(index + 1).padStart(2, '0')}</span>
      <h3>${place.name}</h3>
      <div class="aliases">${place.aliases || ''}</div>
      <p class="monsters">${place.monsters}</p>
      <div class="tags">
        <span class="tag">怪物 Lv.${shownMobs[0]}${shownMobs[1] !== shownMobs[0] ? `～${shownMobs[1]}` : ''}</span>
        ${selectedBand ? `<span class="tag good">推荐层：${selectedBand.label}</span>` : ''}
        ${mode === 'level' && place.levelScope ? `<span class="tag">口径：${place.levelScope}</span>` : ''}
        ${place.audience ? `<span class="tag warn">适合：${place.audience}</span>` : ''}
        <span class="tag">${place.crystal}</span>
        <span class="tag ${reliabilityClass}">${reliability}</span>
      </div>
    </div>
    <div class="card-side">
      <span class="level-badge">${mode === 'level' ? '攻略参考 ' : mode === 'browse' ? '怪物 ' : ''}Lv.${range[0]}–${range[1]}</span>
      ${countKnown ? `<div class="count"><span>每战数量</span><b>${place.count}</b></div>` : ''}
    </div>
    ${mode === 'level' ? `<div class="xp-box"><div class="xp-title"><span>当前等级的等级差系数估算</span><strong>仅供比较</strong></div><div class="xp-points"><div><span>最低怪 Lv.${shownMobs[0]}</span><b>${formatPercent(xp.lowestRate)}</b></div><div><span>代表平均 Lv.${xp.averageLevel}</span><b>${formatPercent(xp.averageRate)}</b></div><div><span>最高怪 Lv.${shownMobs[1]}</span><b>${formatPercent(xp.highestRate)}</b></div></div><p>逐层地点只用当前推荐层参与排序；全局区间则以整段范围估算。实际游戏按单场全部怪物的平均等级结算，因此这三项不是单场最终经验，也不是效率承诺。</p>${accessLine}</div>${renderLevelBands(place, selectedBand)}` : ''}
    ${renderPrerequisite(place, route)}
    ${placeNote ? `<div class="place-note"><b>地点资料</b><p>${placeNote}</p></div>` : ''}
    <div class="judgment"><b>统一判断</b><p>${judgment}</p></div>
    <div class="evidence"><b>核验依据</b><div>${sourceLinks || `<a class="card-source" href="${src.url}" target="_blank" rel="noreferrer">${src.name}</a>`}</div></div>
  </article>`;
}

function indexTemplate(place, index, mode, level) {
  const band = mode === 'level' ? levelBandFor(place, level) : null;
  const mobs = mode === 'level' ? monsterRange(place, level, mode) : place.mobs;
  const detail = `${band ? `${band.label} · ` : ''}怪 Lv.${mobs[0]}${mobs[1] === mobs[0] ? '' : `～${mobs[1]}`}`;
  return `<button type="button" data-result-target="result-card-${index}" title="跳转到${place.name}"><b>#${String(index + 1).padStart(2, '0')} ${place.name}</b><span>${detail}</span></button>`;
}

function renderPrerequisite(place, route) {
  if (Array.isArray(place.relatedTasks)) {
    const taskNames = place.relatedTasks.length
      ? place.relatedTasks.map(name => `<span class="task-name">《${name}》</span>`).join('')
      : '<span class="no-task">无任务前置</span>';
    return `<div class="prereq-strip"><b>关联任务</b><div class="prereq-detail"><div class="task-names">${taskNames}</div>${place.requirements ? `<p>${place.requirements}</p>` : ''}</div></div>`;
  }
  const legacy = route.tasks && !['无', '待补充'].includes(route.tasks) ? route.tasks : place.access;
  return legacy
    ? `<div class="prereq-strip"><b>准入 / 前置</b><span>${legacy}</span></div>`
    : `<div class="prereq-strip no-prereq"><b>关联任务</b><span>无任务前置</span></div>`;
}

function render() {
  const level = clampLevel(input.value);
  input.value = level;
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const matches = ALL_RECORDS.filter(p => isMatch(p, level, mode)).sort((a,b) => scorePlace(a,level,mode) - scorePlace(b,level,mode));
  title.textContent = mode === 'browse' ? `怪物 Lv.${Math.max(1,level-5)}～${Math.min(120,level+5)} 分布` : `Lv.${level} ${mode === 'level' ? '练级' : '技能'}推荐`;
  summary.textContent = mode === 'skill'
    ? `技能经验最低怪物平均等级：Lv.${skillThreshold(level)}。找到 ${matches.length} 个可参考地点，优先展示怪少且补给便利的选择。`
    : mode === 'browse'
      ? `显示怪物等级与人物 Lv.${level} 相差不超过5级的 ${matches.length} 个区域。包含城外、洞窟、任务地图和非主流练级点；出现不代表适合练级。`
      : `找到 ${matches.length} 个仍可获得经验的练级点。逐层地点会先选择与当前等级匹配的楼层，再参与推荐排序；标为“全区域”的地点仍按整体等级范围估算。`;
  results.innerHTML = matches.map((place, index) => cardTemplate(place, index, mode)).join('');
  resultIndex.innerHTML = matches.length ? `<div class="result-index-label"><b>快速索引</b><span>按推荐顺序</span></div><div class="result-index-track">${matches.map((place, index) => indexTemplate(place, index, mode, level)).join('')}</div>` : '';
  resultIndex.hidden = matches.length === 0;
  empty.hidden = matches.length > 0;
  results.hidden = matches.length === 0;
  document.querySelector('#skillRule').style.display = mode === 'skill' ? 'grid' : 'none';
  document.querySelector('#xpRule').style.display = mode === 'level' ? 'grid' : 'none';
  history.replaceState(null, '', `#level=${level}&mode=${mode}`);
}

form.addEventListener('submit', event => { event.preventDefault(); render(); document.querySelector('.results-section').scrollIntoView({behavior:'smooth'}); });
document.querySelectorAll('input[name="mode"]').forEach(el => el.addEventListener('change', render));
document.querySelectorAll('[data-step]').forEach(btn => btn.addEventListener('click', () => { input.value = clampLevel(input.value) + Number(btn.dataset.step); render(); }));
document.querySelectorAll('[data-level]').forEach(btn => btn.addEventListener('click', () => { input.value = btn.dataset.level; render(); }));
input.addEventListener('change', render);
resultIndex.addEventListener('click', event => {
  const button = event.target.closest('[data-result-target]');
  if (!button) return;
  const card = document.getElementById(button.dataset.resultTarget);
  if (!card) return;
  card.scrollIntoView({behavior:'smooth', block:'start'});
  card.classList.remove('index-highlight');
  requestAnimationFrame(() => card.classList.add('index-highlight'));
  setTimeout(() => card.classList.remove('index-highlight'), 1400);
});

document.querySelector('#recordCount').textContent = `${ALL_RECORDS.length} 个地点`;
document.querySelector('#sourceLinks').innerHTML = Object.values(SOURCES).map(source => `<a href="${source.url}" target="_blank" rel="noreferrer">${source.name} ↗</a>`).join('');

const hashParams = new URLSearchParams(location.hash.slice(1));
if (hashParams.has('level')) input.value = clampLevel(hashParams.get('level'));
if (hashParams.get('mode') === 'skill') document.querySelector('input[value="skill"]').checked = true;
if (hashParams.get('mode') === 'browse') document.querySelector('input[value="browse"]').checked = true;
render();
