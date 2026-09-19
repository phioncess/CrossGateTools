const form = document.querySelector('#finderForm');
const input = document.querySelector('#levelInput');
const results = document.querySelector('#results');
const empty = document.querySelector('#emptyState');
const title = document.querySelector('#resultsTitle');
const summary = document.querySelector('#resultSummary');
const ALL_RECORDS = [...PLACES, ...MONSTER_ZONES];

const clampLevel = value => Math.max(1, Math.min(160, Number.parseInt(value, 10) || 1));
const skillThreshold = level => Math.max(1, Math.floor(level / 2 - 3));

function scorePlace(place, level, mode) {
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
  const range = mode === 'level' ? place.player : place.skill;
  if (!range || level < range[0] || level > range[1]) return false;
  return mode !== 'skill' || place.mobs[1] >= skillThreshold(level);
}

function statusLabel(status) {
  if (status === 'verified') return ['数量已核对', 'good'];
  return ['数量待核验', 'warn'];
}

function reliabilityLabel(value) {
  return value === 'high' ? ['可靠性 高', 'good'] : value === 'medium' ? ['可靠性 中', ''] : ['可靠性 低', 'warn'];
}

function difficultyStars(value) {
  return '★'.repeat(value) + '☆'.repeat(5 - value);
}

function cardTemplate(place, index, mode) {
  const route = ROUTES[place.name] || {difficulty:place.difficulty || 3, tasks:place.tasks || '待补充', route:place.route || '前往方式仍需核验。', reliability:place.reliability || 'low', evidence:place.evidence || [place.source]};
  const src = SOURCES[place.source] || SOURCES[route.evidence?.[0]] || SOURCES.sinaTable;
  const [status, statusClass] = statusLabel(place.countStatus);
  const [reliability, reliabilityClass] = reliabilityLabel(route.reliability);
  const range = mode === 'level' ? place.player : mode === 'skill' ? place.skill : place.mobs;
  const sourceLinks = [...new Set(route.evidence || [place.source])]
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
        <span class="tag ${statusClass}">${status}</span>
        <span class="tag ${reliabilityClass}">${reliability}</span>
      </div>
    </div>
    <div class="card-side">
      <span class="level-badge">${mode === 'browse' ? '怪物 ' : ''}Lv.${range[0]}–${range[1]}</span>
      <div class="count"><span>每战数量</span><b>${place.count}</b></div>
    </div>
    <div class="route-box">
      <div class="route-head"><b>从法兰前往</b><span class="difficulty" aria-label="抵达难度${route.difficulty}星">${difficultyStars(route.difficulty)}</span></div>
      <p>${route.route}</p>
      <span class="prereq">前置：${route.tasks}</span>
    </div>
    <p class="notes">${place.notes}</p>
    <div class="evidence"><b>核验依据</b><div>${sourceLinks || `<a class="card-source" href="${src.url}" target="_blank" rel="noreferrer">${src.name}</a>`}</div></div>
  </article>`;
}

function render() {
  const level = clampLevel(input.value);
  input.value = level;
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const matches = ALL_RECORDS.filter(p => isMatch(p, level, mode)).sort((a,b) => scorePlace(a,level,mode) - scorePlace(b,level,mode));
  title.textContent = mode === 'browse' ? `怪物 Lv.${Math.max(1,level-5)}～${Math.min(160,level+5)} 分布` : `Lv.${level} ${mode === 'level' ? '练级' : '技能'}推荐`;
  summary.textContent = mode === 'skill'
    ? `技能经验最低怪物平均等级：Lv.${skillThreshold(level)}。找到 ${matches.length} 个可参考地点，优先展示怪少且补给便利的选择。`
    : mode === 'browse'
      ? `显示怪物等级与人物 Lv.${level} 相差不超过5级的 ${matches.length} 个区域。包含城外、洞窟、任务地图和非主流练级点；出现不代表适合练级。`
      : `找到 ${matches.length} 个覆盖当前人物等级的练级点；排序综合等级贴合度与资料完整度。`;
  results.innerHTML = matches.map((place, index) => cardTemplate(place, index, mode)).join('');
  empty.hidden = matches.length > 0;
  results.hidden = matches.length === 0;
  document.querySelector('#skillRule').style.display = mode === 'skill' ? 'grid' : 'none';
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
