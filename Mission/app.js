const input = document.querySelector('#questSearch');
const listbox = document.querySelector('#questOptions');
const toggle = document.querySelector('#comboToggle');
const clearButton = document.querySelector('#clearSearch');
const detail = document.querySelector('#questDetail');
const empty = document.querySelector('#emptyState');
const quickLinks = document.querySelector('#quickLinks');
const questById = new Map(QUESTS.map(quest => [quest.id, quest]));
const ITEM_NAME_BLACKLIST = new Set(['道具','任务','奖品','物品','东西','信','书','水晶']);
const ITEM_ALIASES = new Map([['鳗鱼饭团','星鳗饭团'],['饭团','星鳗饭团']]);
const itemCorpus = JSON.stringify({guides:QUEST_GUIDES,rewards:REWARD_GUIDES,catalog:typeof CATALOG_DETAILS === 'undefined' ? null : CATALOG_DETAILS});
const ITEM_NAMES = [...new Set([...itemCorpus.matchAll(/【([^】]+)】/g)].map(match => match[1].trim()).filter(name => name.length >= 2 && name.length <= 24 && !ITEM_NAME_BLACKLIST.has(name)).map(name => ITEM_ALIASES.get(name) || name).concat(['星鳗饭团','冥界之雨']))].sort((a,b) => b.length - a.length);
const ITEM_PATTERN = new RegExp(ITEM_NAMES.map(name => name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
const BOSS_PRESENTATION = {
  'catalog-5a3faf19-bfba-4bfa-8d5e-8ae55bb50537': [
    {kind:'主线',title:'阿卡斯（43,7）'},
    {kind:'支线',title:'守护者（11,32）'},
    {kind:'支线',title:'守护者（89,32）'}
  ]
};
let activeIndex = -1;
let visibleQuests = [];
let focusSnapshot = '';
let editedSinceFocus = false;

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[\s·・—_\-（）()《》【】\[\]\/]/g, '');
}

function subsequenceScore(query, target) {
  let qi = 0;
  let gaps = 0;
  let last = -1;
  for (let ti = 0; ti < target.length && qi < query.length; ti += 1) {
    if (target[ti] === query[qi]) {
      if (last >= 0) gaps += ti - last - 1;
      last = ti;
      qi += 1;
    }
  }
  return qi === query.length ? 35 - Math.min(25, gaps) : -1;
}

function scoreQuest(quest, rawQuery) {
  const query = normalize(rawQuery);
  if (!query) return 1;
  const fields = [quest.name, ...quest.aliases, quest.series, quest.type, quest.initials].map(normalize).filter(Boolean);
  let best = -1;
  for (const field of fields) {
    if (field === query) best = Math.max(best, 120);
    else if (field.startsWith(query)) best = Math.max(best, 95 - (field.length - query.length));
    else if (field.includes(query)) best = Math.max(best, 75 - field.indexOf(query));
    else best = Math.max(best, subsequenceScore(query, field));
  }
  return best;
}

function matchedQuests(query) {
  const results = QUESTS.map(quest => ({quest, score: scoreQuest(quest, query)}))
    .filter(item => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.quest.name.localeCompare(b.quest.name, 'zh-CN'))
    .map(item => item.quest);
  return normalize(query) ? results.slice(0, 20) : results;
}

function openList(forceAll = false) {
  visibleQuests = matchedQuests(forceAll ? '' : input.value);
  activeIndex = visibleQuests.length ? 0 : -1;
  renderOptions();
  listbox.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}

function closeList() {
  listbox.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
  activeIndex = -1;
}

function restoreUneditedInput() {
  if (!editedSinceFocus && input.value === '' && focusSnapshot) input.value = focusSnapshot;
}

function renderOptions() {
  if (!visibleQuests.length) {
    listbox.innerHTML = '<div class="no-options">没有命中，试试更短的关键词或系列俗称。</div>';
    return;
  }
  listbox.innerHTML = visibleQuests.map((quest, index) => `
    <button type="button" role="option" id="option-${quest.id}" data-quest-id="${quest.id}" aria-selected="${index === activeIndex}">
      <span><b>${quest.name}</b><small>${quest.aliases.slice(0, 3).join(' · ') || quest.type}</small></span>
      <em>${quest.series || quest.type}</em>
    </button>`).join('');
  if (activeIndex >= 0) {
    input.setAttribute('aria-activedescendant', `option-${visibleQuests[activeIndex].id}`);
    listbox.children[activeIndex]?.scrollIntoView({block:'nearest'});
  }
}

function relationButton(id, label) {
  const quest = questById.get(id);
  if (!quest) return '';
  return `<button class="relation-link" type="button" data-quest-id="${quest.id}"><span>${label}</span><b>${quest.name}</b><small>${quest.aliases[0] || quest.type}</small></button>`;
}

function reliability(value) {
  if (value === 'high') return ['资料可靠性高', 'good'];
  if (value === 'medium') return ['资料可靠性中', ''];
  return ['资料可靠性待核验', 'warn'];
}

function cleanListMarker(value) {
  return String(value || '').replace(/^[◆◇※]\s*/, '').trim();
}

function normalizeItemNames(value) {
  return String(value || '').replace(/星鳗饭团|鳗鱼饭团|饭团/g, '星鳗饭团');
}

function formatTaskText(value) {
  const normalized = normalizeItemNames(value);
  let offset = 0;
  return normalized.split(/(【[^】]+】|“[^”]+”)/g).map(part => {
    const start = offset;
    offset += part.length;
    if (/^“[^”]+”$/.test(part)) {
      const before = normalized.slice(Math.max(0, start - 18), start);
      return /(?:输入|键入|回答|说出|回复|口令|密码|暗号)[^“”]{0,12}$/.test(before)
        ? `<mark class="input-text">${part}</mark>`
        : part;
    }
    const bracketed = part.match(/^【([^】]+)】$/);
    if (bracketed) {
      const name = ITEM_ALIASES.get(bracketed[1]) || bracketed[1];
      return `<mark class="item-tag">【${name}】</mark>`;
    }
    return part.replace(ITEM_PATTERN, name => `<mark class="item-tag">【${ITEM_ALIASES.get(name) || name}】</mark>`);
  }).join('');
}

function mentionedItems(value) {
  const normalized = normalizeItemNames(value);
  return ITEM_NAMES.filter(name => normalized.includes(name));
}

function itemActionLabels(value) {
  const source = normalizeItemNames(value);
  const items = mentionedItems(source);
  if (!items.length) return [];
  const spans = items.flatMap(name => {
    const found = [];
    let from = 0;
    while ((from = source.indexOf(name, from)) >= 0) {
      found.push({start:from,end:from + name.length});
      from += name.length;
    }
    return found;
  });
  const cleanGap = gap => !/[。；]/.test(gap);
  const itemAfter = (index, length, distance = 28) => spans.some(span => {
    const gap = source.slice(index + length, span.start);
    return span.start >= index + length && span.start - index <= distance && cleanGap(gap);
  });
  const itemBefore = (index, distance = 24) => spans.some(span => {
    const gap = source.slice(span.end, index);
    return span.end <= index && index - span.end <= distance && cleanGap(gap);
  });
  const rules = [
    {label:'道具要求',pattern:/持有|携带|准备|需要|需有|队长持|每名队员.{0,12}(?:准备|持有)/g,direction:'after'},
    {label:'消耗道具',pattern:/交出|交付|提交|交给|消耗|收走|交(?=[^，。；]{0,12}【)/g,direction:'around'},
    {label:'消耗道具',pattern:/换取|兑换/g,direction:'before'},
    {label:'使用道具',pattern:/双击|使用|装备/g,direction:'around'},
    {label:'取得道具',pattern:/获得|取得|领取|得到|换得|换取|兑换|得(?=【)/g,direction:'after'}
  ];
  const actions = [];
  rules.forEach(rule => {
    for (const match of source.matchAll(rule.pattern)) {
      const linked = rule.direction === 'after'
        ? itemAfter(match.index, match[0].length)
        : rule.direction === 'before'
          ? itemBefore(match.index)
        : itemAfter(match.index, match[0].length) || itemBefore(match.index);
      if (linked) actions.push({label:rule.label,index:match.index});
    }
  });
  return actions.sort((a,b) => a.index - b.index).map(action => action.label).filter((label,index,list) => list.indexOf(label) === index);
}

function itemActionLabel(value) {
  return itemActionLabels(value)[0] || '';
}

function inputActionLabel(value) {
  return /(?:输入|键入|回答|说出|回复)(?:[^。；，,]{0,18})(?:“[^”]+”|「[^」]+」|『[^』]+』|[：:]\s*[^，。；]+)/.test(String(value || '')) ? '输入文字' : '';
}

function stepActionLabels(value) {
  return [...itemActionLabels(value), inputActionLabel(value)].filter(Boolean);
}

function stepActionClass(label) {
  if (label === '消耗道具') return 'consume-action';
  if (label === '取得道具') return 'gain-action';
  if (label === '道具要求') return 'require-action';
  if (label === '输入文字') return 'input-action';
  return 'use-action';
}

function organizeGuide(guide) {
  const steps = guide.steps.map(text => ({text, notices:[]}));
  const consumed = new Set();
  guide.notes.forEach((note, noteIndex) => {
    const items = mentionedItems(note);
    if (!items.length || !/注意|务必|需要|必须|不可|勿|否则|交出|持有|扔掉|获得方式/.test(note)) return;
    let bestIndex = -1;
    let bestScore = 0;
    steps.forEach((step, stepIndex) => {
      const score = items.filter(item => normalizeItemNames(step.text).includes(item)).length;
      if (score > bestScore) { bestScore = score; bestIndex = stepIndex; }
    });
    if (bestIndex >= 0) {
      steps[bestIndex].notices.push(cleanListMarker(note));
      consumed.add(noteIndex);
    }
  });
  return {steps,notes:guide.notes.filter((_, index) => !consumed.has(index))};
}

function renderQuestSteps(steps) {
  const groups = [];
  let current = {route:'', items:[]};
  groups.push(current);
  steps.forEach(step => {
    const rawStep = step.text;
    const routeMatch = rawStep.match(/^(【[^】]+】路线)[：:]?\s*\d+\s*[.．、]\s*(.*)$/);
    const plainMatch = rawStep.match(/^\d+\s*[.．、]\s*(.*)$/);
    const route = routeMatch ? routeMatch[1] : '';
    const text = routeMatch ? routeMatch[2] : (plainMatch ? plainMatch[1] : rawStep);
    if (route !== current.route && (route || current.items.length)) {
      current = {route, items:[]};
      groups.push(current);
    }
    current.items.push({text,notices:step.notices});
  });
  return `<div class="quest-step-groups">${groups.filter(group => group.items.length).map(group => `
    <section class="step-route">
      ${group.route ? `<h4>${group.route}</h4>` : ''}
      <ol class="quest-steps">${group.items.map(item => `<li><div class="step-content"><div class="step-actions">${stepActionLabels(item.text).map(label => `<em class="step-item-action ${stepActionClass(label)}">${label}</em>`).join('')}</div><span>${formatTaskText(item.text)}</span>${item.notices.map(note => `<aside class="inline-notice">${formatTaskText(note)}</aside>`).join('')}</div></li>`).join('')}</ol>
    </section>`).join('')}</div>`;
}

function renderQuestNotes(notes) {
  const groups = [];
  let current = {route:'通用说明', items:[]};
  groups.push(current);
  notes.forEach(rawNote => {
    const routeMatch = rawNote.match(/^【([^】]+)】路线[：:]?$/);
    if (routeMatch) {
      current = {route:`${routeMatch[1]}路线`, items:[]};
      groups.push(current);
      return;
    }
    const note = cleanListMarker(rawNote);
    if (!note || /行走路线[：:]$/.test(note)) return;
    current.items.push(note);
  });
  return groups.filter(group => group.items.length).map(group => `
    <section class="note-group">
      <h4>${group.route}</h4>
      <div class="note-items">${group.items.map(item => `<p class="${/注意|务必|不可|勿丢弃|必须|无法|否则/.test(item) ? 'warning' : ''}">${formatTaskText(item)}</p>`).join('')}</div>
    </section>`).join('');
}

function normalizeEnemyEntries(enemies) {
  const joined = [];
  let pendingPrefix = '';
  for (const raw of enemies || []) {
    const value = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!value) continue;
    if (/^(?:Lv|LV)\.?\s*\d+(?:\s*$|[、，])/.test(value) && !/(?:血量|属性|抗咒|\d动|技能[:：])/.test(value)) {
      if (joined.length) joined[joined.length - 1] += value;
      continue;
    }
    if (/^（[^）]+）$/.test(value)) continue;
    if (/^[^；;]{1,24}[：:]$/.test(value) || /^[^；;]{1,24}[，,]$/.test(value)) {
      pendingPrefix += value;
      continue;
    }
    const complete = pendingPrefix ? `${pendingPrefix}${value}` : value;
    pendingPrefix = '';
    const separated = complete.replace(/([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ\d）)])((?:Lv|LV)\.?\s*\d+(?:[~～-]\d+)?[\u4e00-\u9fff])/g, '$1|||$2');
    joined.push(...separated.split('|||').map(item => item.trim()).filter(Boolean));
  }
  if (pendingPrefix && joined.length) joined[joined.length - 1] += `；${pendingPrefix.replace(/[：:，,]$/, '')}`;
  return joined;
}

function battleEnemyNotes(enemies) {
  return (enemies || []).map(value => String(value || '').trim()).filter(value => /^（[^）]+）$/.test(value)).map(value => {
    const content = value.slice(1, -1).trim();
    return content.startsWith('皆为') ? `全体敌人：${content.slice(2)}` : content;
  });
}

function renderEnemy(enemy) {
  const skillMarker = enemy.match(/[；;，,]\s*技能[:：]/);
  const markerIndex = skillMarker ? skillMarker.index : -1;
  const overview = markerIndex >= 0 ? enemy.slice(0, markerIndex) : enemy;
  const skillsText = markerIndex >= 0 ? enemy.slice(markerIndex + skillMarker[0].length) : '';
  const lead = overview.match(/^(?:([^：:]{1,24})[：:]\s*)?((?:Lv|LV)\.?\s*\d+(?:[~～-]\d+)?)\s*([^，,；;]+)/);
  if (!lead) return `<article class="enemy-card enemy-plain"><p>${enemy}</p></article>`;
  const prefix = lead[1] ? `<span class="enemy-group">${lead[1]}</span>` : '';
  const level = lead[2].replace(/^lv/i, 'Lv');
  const name = lead[3].trim();
  const metaText = overview.slice(lead[0].length).replace(/^[，,；;]\s*/, '');
  const meta = metaText.split(/[，,；;]/).map(item => item.trim()).filter(Boolean);
  const skills = skillsText.split(/[、，,]/).map(item => item.trim()).filter(Boolean);
  return `<article class="enemy-card">
    <header>${prefix}<b>${name}</b><span class="enemy-level">${level}</span></header>
    ${meta.length ? `<div class="enemy-meta">${meta.map(item => `<span>${item}</span>`).join('')}</div>` : ''}
    ${skills.length ? `<div class="enemy-skills"><strong>技能</strong><div>${skills.map(item => `<span>${item}</span>`).join('')}</div></div>` : ''}
  </article>`;
}

function buildBossSections(questId, bossGuides) {
  if (questId === 'catalog-ea811a83-8f76-4186-b1dc-73494b57061c') {
    const tower = bossGuides[2]?.enemies || [];
    const floorGroups = [
      ['1层（13,16）·潘德米尔', tower.slice(0, 3)],
      ['4层（18,10）·普留梅尔', tower.slice(5, 8)],
      ['5层（10,3）·夫利梅尔', tower.slice(8, 11)],
      ['6层（21,11）·尼伯斯', tower.slice(11, 14)],
      ['7层（12,18）·普留比欧斯', tower.slice(14, 17)],
      ['8层（36,29）·夫洛尔', tower.slice(17, 20)],
      ['9层（11,4）·布雷里亚', tower.slice(20, 25)],
      ['9层（13,22）·梅希德', tower.slice(25, 30)],
      ['10层（37,37）·迪尔米', tower.slice(30, 35)],
      ['10层随机二连战·夫留克吉德', tower.slice(35, 40)]
    ].map(([title,enemies]) => ({kind:'守关战',title,enemies,skills:'',strategy:[]}));
    const finalFight = bossGuides[4] || {enemies:[],skills:'',strategy:[]};
    return [
      {...bossGuides[0],kind:'准备战',title:'获取【精灵的水镜】（可选）'},
      ...floorGroups,
      {...bossGuides[3],kind:'主线 BOSS',title:'巴洛斯（39,9）'},
      {...finalFight,kind:'最终战',title:'李贝留斯与四斗神（30,20）',skills:'',strategy:finalFight.skills ? [finalFight.skills] : finalFight.strategy},
      {...bossGuides[5],kind:'支线分流',title:'【老龙之魂】支线·7层（红线/蓝线二选一）'},
      {...bossGuides[6],kind:'支线分流',title:'【老龙之魂】支线·10层（按路线对应）'}
    ].filter(section => section.enemies?.length);
  }
  return bossGuides.map((fight, fightIndex) => {
    const presentation = BOSS_PRESENTATION[questId]?.[fightIndex] || {kind:'关键战斗',title:fight.title};
    return {...fight,...presentation};
  });
}

function bossSectionSummary(questId, sections) {
  if (questId === 'catalog-ea811a83-8f76-4186-b1dc-73494b57061c') return '守关战、主线终战与支线分流';
  if (questId === 'catalog-5a3faf19-bfba-4bfa-8d5e-8ae55bb50537') return '1 场主线 · 2 场支线';
  return `${sections.length} 项战斗资料`;
}

function renderQuest(quest, updateHash = true) {
  input.value = quest.name;
  focusSnapshot = quest.name;
  editedSinceFocus = false;
  closeList();
  const series = quest.series ? QUESTS.filter(item => item.series === quest.series).sort((a,b) => a.order - b.order || a.name.localeCompare(b.name, 'zh-CN')) : [];
  const index = series.findIndex(item => item.id === quest.id);
  const requiredBy = QUESTS.filter(item => item.prerequisites.includes(quest.id));
  const seriesPrevious = quest.prerequisites.map(id => questById.get(id)).filter(item => item?.series === quest.series);
  const seriesNext = requiredBy.filter(item => item.series === quest.series);
  const source = SOURCES[quest.source];
  const [reliabilityText, reliabilityClass] = quest.detailStatus === 'parsed' ? ['详情页已导入', ''] : reliability(quest.reliability);
  const guide = QUEST_GUIDES[quest.id];
  const organizedGuide = organizeGuide(guide);
  const bossGuides = BOSS_GUIDES[quest.id] || [];
  const bossSections = buildBossSections(quest.id, bossGuides);
  const rewards = REWARD_GUIDES[quest.id] || {guaranteed:[quest.reward],chance:[],related:[]};
  const indexOnly = quest.detailStatus === 'index-only';
  const bossHtml = bossSections.length ? bossSections.map(fight => {
    return `
    <article class="boss-fight">
      <div class="boss-heading"><span>${fight.kind}</span><h4>${formatTaskText(fight.title)}</h4></div>
      ${battleEnemyNotes(fight.enemies).length ? `<div class="fight-facts">${battleEnemyNotes(fight.enemies).map(note => `<span>${note}</span>`).join('')}</div>` : ''}
      <div class="enemy-list">${normalizeEnemyEntries(fight.enemies).map(renderEnemy).join('')}</div>
      ${fight.skills ? `<div class="boss-skills"><b>技能 / 特性</b><p>${fight.skills}</p></div>` : ''}
      ${fight.strategy.length ? `<div class="strategy"><b>打法建议</b><ol>${fight.strategy.map(item => `<li>${item}</li>`).join('')}</ol></div>` : ''}
    </article>`;
  }).join('') : indexOnly
      ? '<div class="no-boss"><b>BOSS 资料待按怀旧服核验</b><p>这里的空白不代表没有 BOSS；为避免混入其他服务器数值，尚未核验的数据不会冒充完整资料。</p></div>'
      : quest.bossStatus === 'not-documented'
        ? '<div class="no-boss"><b>原攻略未单列 BOSS 数据</b><p>页面不据此推断“没有 BOSS”；战斗触发点仍保留在任务步骤中。</p></div>'
        : '<div class="no-boss"><b>本任务无 BOSS 战</b><p>流程风险主要来自迷宫、时段或材料条件，详见上方任务步骤。</p></div>';
  const rewardGroup = (titleText, items, className = '') => items.length ? `<div class="reward-group ${className}"><span>${titleText}</span><ul>${items.map(item => `<li>${formatTaskText(item)}</li>`).join('')}</ul></div>` : '';
  const chainHtml = series.length > 1 ? `
    <section class="chain-card">
      <div class="section-title"><span>系列关系链</span><small>${quest.order ? `编号 ${quest.order}` : `第 ${index + 1} 项`} · 已收录 ${series.length} 项</small></div>
      <div class="chain-track">${series.map(item => `<button type="button" data-quest-id="${item.id}" class="chain-node ${item.id === quest.id ? 'current' : ''} ${item.optional ? 'optional' : ''}" title="${item.optional ? '支线／可选' : item.name}"><span>${item.stageLabel || item.order}</span><b>${item.name}</b><small>${item.prerequisites.length ? `前置 ${item.prerequisites.length} 项` : '链条起点'}</small></button>`).join('')}</div>
      <div class="chain-neighbors">
        <div class="chain-direction"><b>直接前置</b>${seriesPrevious.length ? seriesPrevious.map(item => relationButton(item.id, '← 前置')).join('') : '<div class="chain-edge">已是本链起点</div>'}</div>
        <div class="chain-direction"><b>直接后续</b>${seriesNext.length ? seriesNext.map(item => relationButton(item.id, '后续 →')).join('') : '<div class="chain-edge">已是本链末尾</div>'}</div>
      </div>
      <p class="chain-hint">关系线严格依据任务前置生成；同阶段任务可能并行，编号相邻不代表互为前置。虚线节点表示支线或材料任务。</p>
    </section>` : '';
  const prerequisiteHtml = quest.prerequisites.length
    ? quest.prerequisites.map(id => relationButton(id, '必须前置')).join('')
    : '<p class="none-note">资料库中未记录任务型前置；等级、时间、道具等条件仍需查看原攻略。</p>';
  const downstreamHtml = requiredBy.length
    ? requiredBy.map(item => relationButton(item.id, '解锁去向')).join('')
    : '<p class="none-note">当前资料库中没有登记以它为直接前置的任务。</p>';

  detail.innerHTML = `
    <header class="detail-head">
      <div>
        <p class="eyebrow">${quest.series || 'STANDALONE QUEST'}</p>
        <h2>${quest.name}</h2>
        <p class="aliases">${quest.aliases.join(' · ')}</p>
      </div>
      <div class="detail-badges"><span>${quest.type}</span><span>${quest.level}</span>${indexOnly ? '<span class="warn">关系已收录 · 详情待核验</span>' : ''}<span class="${reliabilityClass}">${reliabilityText}</span></div>
    </header>
    <p class="summary">${formatTaskText(quest.summary)}</p>
    <section class="guide-card">
      <div class="section-title"><span>任务内容</span><small>关键流程摘要</small></div>
      <div class="guide-layout">
        <div class="guide-meta">
          <div><span>起点</span><b>${formatTaskText(guide.start)}</b></div>
          <div><span>条件</span><ul>${guide.conditions.map(item => `<li>${formatTaskText(item)}</li>`).join('')}</ul></div>
        </div>
        ${renderQuestSteps(organizedGuide.steps)}
      </div>
      ${organizedGuide.notes.length ? `<div class="quest-notes"><b>补充说明</b><div class="note-groups">${renderQuestNotes(organizedGuide.notes)}</div></div>` : ''}
    </section>
    <section class="boss-card">
      <div class="section-title"><span>BOSS 数据与打法</span><small>${bossSections.length ? bossSectionSummary(quest.id, bossSections) : (indexOnly ? '等待怀旧服核验' : (quest.bossStatus === 'not-documented' ? '原攻略未单列' : '无首领战'))}</small></div>
      <div class="boss-list">${bossHtml}</div>
    </section>
    ${chainHtml}
    <div class="relation-grid">
      <section><div class="section-title"><span>前置任务</span><small>${quest.prerequisites.length} 项</small></div><div class="relation-list">${prerequisiteHtml}</div></section>
      <section><div class="section-title"><span>后续索引</span><small>${requiredBy.length} 项</small></div><div class="relation-list">${downstreamHtml}</div></section>
    </div>
    <section class="rewards-card">
      <div class="section-title"><span>奖励与关联掉落</span><small>怀旧服口径</small></div>
      <div class="rewards-grid">
        ${rewardGroup('必得 / 解锁', rewards.guaranteed, 'guaranteed')}
        ${rewardGroup('概率掉落 / 随机奖励', rewards.chance, 'chance')}
        ${rewardGroup('关联道具与用途', rewards.related, 'related')}
      </div>
    </section>
    <section class="source-card"><div><b>核验来源</b><p>通用任务与怀旧服任务都会保留；同一任务存在多服版本时，只采用怀旧服路线和参数，剔除其他服内容。</p></div><a href="${source.url}" target="_blank" rel="noreferrer">${source.name} ↗</a></section>`;
  detail.hidden = false;
  empty.hidden = true;
  if (updateHash) history.replaceState(null, '', `#quest=${encodeURIComponent(quest.id)}`);
  document.title = `${quest.name} · 魔力任务簿`;
}

function selectActive() {
  if (activeIndex >= 0 && visibleQuests[activeIndex]) renderQuest(visibleQuests[activeIndex]);
}

input.addEventListener('focus', () => {
  focusSnapshot = input.value;
  editedSinceFocus = false;
  input.value = '';
  openList(true);
});
input.addEventListener('input', () => { editedSinceFocus = true; openList(); });
input.addEventListener('blur', () => setTimeout(restoreUneditedInput, 0));
input.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (listbox.hidden) openList();
    else if (visibleQuests.length) {
      activeIndex = (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + visibleQuests.length) % visibleQuests.length;
      renderOptions();
    }
  } else if (event.key === 'Enter' && !listbox.hidden) {
    event.preventDefault(); selectActive();
  } else if (event.key === 'Escape') { restoreUneditedInput(); closeList(); input.blur(); }
});

toggle.addEventListener('click', () => {
  if (listbox.hidden) { input.focus(); openList(true); }
  else { restoreUneditedInput(); closeList(); }
});
clearButton.addEventListener('click', () => {
  input.focus();
  input.value = '';
  editedSinceFocus = true;
  openList(true);
});
listbox.addEventListener('mousedown', event => event.preventDefault());
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-quest-id]');
  if (trigger) {
    const quest = questById.get(trigger.dataset.questId);
    if (quest) renderQuest(quest);
    return;
  }
  if (!event.target.closest('#questCombo')) { restoreUneditedInput(); closeList(); }
});

quickLinks.innerHTML = ['half-2','half-5','dog-4','xuanwu','forest'].map(id => {
  const quest = questById.get(id);
  return `<button type="button" data-quest-id="${id}">${quest.aliases[0] || quest.name}<span>${quest.name}</span></button>`;
}).join('');

document.querySelector('#recordCount').textContent = `${QUESTS.length} 个任务 · 可离线使用`;
const hashQuest = new URLSearchParams(location.hash.slice(1)).get('quest');
if (hashQuest && questById.has(hashQuest)) renderQuest(questById.get(hashQuest), false);
