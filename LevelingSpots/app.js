const form = document.querySelector('#finderForm');
const input = document.querySelector('#levelInput');
const results = document.querySelector('#results');
const empty = document.querySelector('#emptyState');
const title = document.querySelector('#resultsTitle');
const summary = document.querySelector('#resultSummary');
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

const monsterAverage = place => Math.floor((place.mobs[0] + place.mobs[1]) / 2);
const formatPercent = value => value === 0 ? '近乎 0%' : `${Number(value.toFixed(2))}%`;
function xpSnapshot(place, level) {
  const values = [];
  for (let mobLevel = place.mobs[0]; mobLevel <= place.mobs[1]; mobLevel += 1) values.push(xpPercent(level, mobLevel));
  const averageLevel = monsterAverage(place);
  const lowestRate = xpPercent(level, place.mobs[0]);
  const averageRate = xpPercent(level, averageLevel);
  const highestRate = xpPercent(level, place.mobs[1]);
  return { representative: averageRate, min: Math.min(...values), max: Math.max(...values), averageLevel, lowestRate, averageRate, highestRate };
}

function scorePlace(place, level, mode) {
  if (mode === 'level') {
    const xp = xpSnapshot(place, level);
    let score = 100 - xp.representative;
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
  const accessSentence = place.access ? '本地点另有独立准入条件，不能仅凭人物等级判断能否到达。' : '';
  return `${guidePosition}；${decay}；${spread}。${accessSentence}`;
}

function cardTemplate(place, index, mode) {
  const route = ROUTES[place.name] || {difficulty:place.difficulty || 3, tasks:place.tasks || '待补充', route:place.route || '前往方式仍需核验。', reliability:place.reliability || 'low', evidence:place.evidence || [place.source]};
  const src = SOURCES[place.source] || SOURCES[route.evidence?.[0]] || SOURCES.sinaTable;
  const [reliability, reliabilityClass] = reliabilityLabel(route.reliability);
  const range = mode === 'level' ? place.player : mode === 'skill' ? place.skill : place.mobs;
  const xp = mode === 'level' ? xpSnapshot(place, clampLevel(input.value)) : null;
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
  return `<article class="map-card ${place.featured ? 'featured' : ''}">
    <div>
      <span class="card-rank">#${String(index + 1).padStart(2, '0')}</span>
      <h3>${place.name}</h3>
      <div class="aliases">${place.aliases || ''}</div>
      <p class="monsters">${place.monsters}</p>
      <div class="tags">
        <span class="tag">怪物 Lv.${place.mobs[0]}${place.mobs[1] !== place.mobs[0] ? `～${place.mobs[1]}` : ''}</span>
        <span class="tag">${place.crystal}</span>
        <span class="tag ${reliabilityClass}">${reliability}</span>
      </div>
    </div>
    <div class="card-side">
      <span class="level-badge">${mode === 'level' ? '攻略参考 ' : mode === 'browse' ? '怪物 ' : ''}Lv.${range[0]}–${range[1]}</span>
      ${countKnown ? `<div class="count"><span>每战数量</span><b>${place.count}</b></div>` : ''}
    </div>
    ${mode === 'level' ? `<div class="xp-box"><div class="xp-title"><span>当前等级的等级差系数估算</span><strong>仅供比较</strong></div><div class="xp-points"><div><span>最低怪 Lv.${place.mobs[0]}</span><b>${formatPercent(xp.lowestRate)}</b></div><div><span>代表平均 Lv.${xp.averageLevel}</span><b>${formatPercent(xp.averageRate)}</b></div><div><span>最高怪 Lv.${place.mobs[1]}</span><b>${formatPercent(xp.highestRate)}</b></div></div><p>分别把最低、等级范围中点向下取整、最高怪物等级代入等级差表。实际游戏按单场全部怪物的平均等级结算，因此这三项不是单场最终经验，也不是效率承诺。</p>${accessLine}</div>` : ''}
    <div class="route-box">
      <div class="route-head"><b>从法兰前往</b><span class="difficulty" aria-label="抵达难度${route.difficulty}星">${difficultyStars(route.difficulty)}</span></div>
      <p>${route.route}</p>
      <span class="prereq">前置：${route.tasks}</span>
    </div>
    ${placeNote ? `<div class="place-note"><b>地点资料</b><p>${placeNote}</p></div>` : ''}
    <div class="judgment"><b>统一判断</b><p>${judgment}</p></div>
    <div class="evidence"><b>核验依据</b><div>${sourceLinks || `<a class="card-source" href="${src.url}" target="_blank" rel="noreferrer">${src.name}</a>`}</div></div>
  </article>`;
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
      : `找到 ${matches.length} 个仍可获得经验的练级点，按代表平均等级的系数从高到低排列。每张卡同时列出最低、代表平均、最高怪物等级的估算；实际结果以每场怪物平均等级为准。`;
  results.innerHTML = matches.map((place, index) => cardTemplate(place, index, mode)).join('');
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

document.querySelector('#recordCount').textContent = `${ALL_RECORDS.length} 个地点 · 可离线使用`;
document.querySelector('#sourceLinks').innerHTML = Object.values(SOURCES).map(source => `<a href="${source.url}" target="_blank" rel="noreferrer">${source.name} ↗</a>`).join('');

const hashParams = new URLSearchParams(location.hash.slice(1));
if (hashParams.has('level')) input.value = clampLevel(hashParams.get('level'));
if (hashParams.get('mode') === 'skill') document.querySelector('input[value="skill"]').checked = true;
if (hashParams.get('mode') === 'browse') document.querySelector('input[value="browse"]').checked = true;
render();
