const input = document.querySelector('#questSearch');
const listbox = document.querySelector('#questOptions');
const toggle = document.querySelector('#comboToggle');
const clearButton = document.querySelector('#clearSearch');
const detail = document.querySelector('#questDetail');
const empty = document.querySelector('#emptyState');

// 练级查询是关联数据的唯一来源。保留已人工核验的详细路线，再为其余关联任务补全练级卡片。
(function integrateTrainingRoutes() {
  globalThis.TRAINING_ROUTES ||= {};
  const questByName = new Map(QUESTS.map(quest => [quest.name, quest]));
  (globalThis.TRAINING_ROUTE_INDEX || []).forEach(route => {
    const entryTasks = globalThis.TRAINING_ENTRY_TASKS?.[route.name] || [];
    entryTasks.forEach(taskName => {
      const quest = questByName.get(taskName);
      if (!quest) return;
      const routes = (globalThis.TRAINING_ROUTES[taskName] ||= []);
      const incomingNames = [route.name, ...(route.aliases || [])].map(normalize).filter(Boolean);
      const duplicate = routes.some(item => {
        const existingNames = [item.name, ...(item.aliases || [])].map(normalize).filter(Boolean);
        return existingNames.some(existing => incomingNames.some(incoming => existing.includes(incoming) || incoming.includes(existing)));
      });
      if (!duplicate) routes.push({...route, source: '练级查询'});
      quest.aliases = [...new Set([...quest.aliases, route.name, ...route.aliases])];
    });
  });
})();

const questById = new Map(QUESTS.map(quest => [quest.id, quest]));
const ITEM_NAME_BLACKLIST = new Set(['道具','任务','奖品','物品','东西','信','书','水晶']);
const ITEM_ALIASES = new Map([['鳗鱼饭团','星鳗饭团'],['饭团','星鳗饭团']]);
const itemCorpus = JSON.stringify({
  guides:QUEST_GUIDES,
  rewards:REWARD_GUIDES,
  catalog:typeof CATALOG_DETAILS === 'undefined' ? null : CATALOG_DETAILS,
  training:globalThis.TRAINING_ROUTES || null
});
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
let selectedQuestId = null;

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
  const pinyinFields = globalThis.PINYIN_INDEX?.[quest.id] || [];
  const fields = [quest.name, ...quest.aliases, quest.series, quest.sourceCategory, quest.type, quest.initials, ...pinyinFields].map(normalize).filter(Boolean);
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
  const selectedIndex = selectedQuestId ? visibleQuests.findIndex(quest => quest.id === selectedQuestId) : -1;
  activeIndex = selectedIndex >= 0 ? selectedIndex : (visibleQuests.length ? 0 : -1);
  listbox.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  renderOptions();
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
    <button type="button" role="option" id="option-${quest.id}" data-quest-id="${quest.id}" data-current="${quest.id === selectedQuestId}" aria-selected="${index === activeIndex}">
      <span><b>${quest.name}</b><small>${quest.aliases.slice(0, 3).join(' · ') || quest.type}</small></span>
      <em>${quest.series || quest.sourceCategory || quest.type}</em>
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

function renderKeyItems(questId) {
  const excluded = new Set((globalThis.STRUCTURED_REWARD_GUIDES?.[questId]?.keyItemExclusions || []).map(normalize));
  const entries = (globalThis.KEY_ITEM_GUIDES?.[questId] || []).filter(entry => !excluded.has(normalize(entry.name)));
  if (!entries.length) return '';
  return `<section class="key-items-card">
    <div class="section-title"><span>关键道具去向</span><small>重复路线与后续任务用途</small></div>
    <div class="key-item-list">${entries.map(entry => `<article class="key-item-card">
      <header><h3>${formatTaskText(`【${entry.name}】`)}</h3><span>${entry.stepNumber ? `流程第 ${entry.stepNumber} 步取得` : '本任务取得'}</span></header>
      ${entry.trainingUses.length ? `<div class="key-use-block training"><b>重复练级路线</b>${entry.trainingUses.map(use => `<div><strong>${escapeHtml(use.routeName)}</strong><p>${formatTaskText(use.text)}</p></div>`).join('')}</div>` : ''}
      ${entry.questUses.length ? `<div class="key-use-block downstream"><b>后续任务使用</b><div class="key-quest-links">${entry.questUses.map(use => relationButton(use.questId, '需要此道具')).join('')}</div>${entry.questUses.map(use => `<p><strong>${escapeHtml(use.questName)}：</strong>${formatTaskText(use.text)}</p>`).join('')}</div>` : ''}
    </article>`).join('')}</div>
  </section>`;
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
  // 本工具仅收录怀旧服资料：剥离"（怀旧服为Lv.59~65）"式多服对比标注
  const normalized = normalizeItemNames(String(value ?? '')
    .replace(/（怀旧服为/g, '（')
    .replace(/（在怀旧服是这样，其他未知）/g, '（实测如此，其他服未知）')
    .replace(/[（(]怀旧服[）)]/g, ''));
  let offset = 0;
  return normalized.split(/(【[^】]+】|称号\s*[“"][^”"]+[”"]|[“"][^”"]+[”"]\s*称号|[“"][^”"]+[”"])/g).map(part => {
    const start = offset;
    offset += part.length;
    if (/^称号\s*[“"][^”"]+[”"]$/.test(part) || /^[“"][^”"]+[”"]\s*称号$/.test(part)) {
      return `<mark class="title-tag">【${part.replace(/\s+/g, '')}】</mark>`;
    }
    if (/^[“"][^”"]+[”"]$/.test(part)) {
      const before = normalized.slice(0, start);
      const clauseStart = Math.max(before.lastIndexOf('。'), before.lastIndexOf('；'), before.lastIndexOf('，'), before.lastIndexOf(','), before.lastIndexOf('\n'));
      const clause = before.slice(clauseStart + 1);
      return /(?:输入|键入|回答|说出|回复|口令|密码|暗号)/.test(clause)
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
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

function organizeGuide(guide, lowerItemNames = [], structuredRewardData = null, lowerItemNotes = []) {
  const steps = guide.steps.map(text => ({text, notices:[]}));
  const consumed = new Set();
  const omitted = new Set();
  const stopWords = new Set(['任务','战斗','获得','进入','前往','对话','怀旧服','队伍','角色','玩家','需要','可以','无法','随机','迷宫','地图','资料','说明','注意','建议','技能','魔物','物品','道具','称号','路线','完成','胜利','使用','持有','交出','传送','返回']);
  const tokens = value => {
    const text = normalizeItemNames(cleanListMarker(value));
    const found = new Set();
    for (const item of mentionedItems(text)) found.add(item);
    for (const match of text.matchAll(/[（(](\d{1,3}\s*[.，,]\s*\d{1,3})[）)]/g)) found.add(`坐标:${match[1].replace(/[，,]/g,'.').replace(/\s+/g,'')}`);
    for (const match of text.matchAll(/[《【]([^》】]{2,24})[》】]/g)) found.add(match[1]);
    for (const match of text.matchAll(/[\u3400-\u9fff]{2,12}(?:村|镇|城|塔|洞窟|洞穴|迷宫|遗迹|宫殿|神殿|研究所|研究室|之地|水脉|大树|火山|岛|船|山|墓|巢|坑道|祠|牢城|港湾|港口|之间|房间|营地)/g)) found.add(match[0]);
    for (const match of text.matchAll(/(?:与|找|调查|击倒|打倒|寻找)([\u3400-\u9fff·]{2,12})(?=[（(，,。；]|对话|战斗)/g)) found.add(match[1]);
    for (const match of text.matchAll(/[\u3400-\u9fffA-Za-z0-9]{2,14}/g)) {
      const word = match[0];
      if (!stopWords.has(word) && !/^Lv\d+$/i.test(word)) found.add(word);
    }
    return found;
  };
  const noteIsRewardOrDrop = note => /(?:掉落物品|物品说明|奖励)[：:]|随机(?:掉落|获得|取得)|有几率(?:掉落|获得)|概率(?:掉落|获得)|一定几率|必定掉落|战斗胜利后[^。；]{0,50}(?:掉落|随机获得)/.test(note);
  const noteIsBattleData = note => /^(?:本次战斗|第一战|第二战|第[一二三四五六七八九十]+战)[：:]?$/.test(note)
    || /^[一二三四五六七八九十]+[，,].{0,30}守门者/.test(note)
    || /^(?:[Ll][Vv]|[Vv])[.．]?\s*\d+/.test(note)
    || (/(?:血量约|HP约|\d动|技能[:：]|邪魔系|属性[:：])/.test(note) && note.length > 45);
  const noteIsNarrative = note => note.length > 180 && !/注意|必须|不可|无法|否则|建议|掉落|获得|持有|交出|进入|传送|刷新|时间/.test(note);
  const globalNotice = note => /任务时间|开放时间|刷新时间|不可重做|可重做|全队|每名队员|队长|组队|单人|时段|黄昏|清晨|夜晚|白天|注意|务必|必须|不可|无法|否则|注销|登出|掉线|解散|宠邮/.test(note);
  const noteBelongsToLowerItem = note => {
    if (!lowerItemNames.length) return false;
    const names = [...String(note || '').matchAll(/【([^】]+)】/g)].map(match => normalize(match[1])).filter(Boolean);
    return names.some(noteName => lowerItemNames.some(itemName => {
      const normalizedItem = normalize(itemName);
      return normalizedItem === noteName || normalizedItem.includes(noteName) || noteName.includes(normalizedItem);
    }));
  };
  const noteBelongsToStructuredReward = note => {
    if (!structuredRewardData) return false;
    const normalizedNote = normalize(note);
    if (lowerItemNames.some(itemName => normalizedNote.includes(normalize(itemName)))) return true;
    return /^(?:名称.*(?:所需|备注)|奖品(?:说明|兑换)|旧版|第[一二三四五六七八九十]+次[：:]?|\d{4}(?:[-年]|版)|.*版本[：:]?)/.test(note)
      || /(?:攻击|防御|敏捷|精神|回复|生命|魔力|必杀|反击|命中|闪躲|魔攻|抗魔)\s*[+-]\s*\d+/.test(note)
      || /(?:兑换奖励所需|奖品有所改变|最终奖品为)/.test(note);
  };
  const noteAlreadyRenderedBelow = note => {
    const key = cleanListMarker(note).replace(/[◆◇\s，,。；;：:（）()~～*]/g, '');
    if (!key) return false;
    return lowerItemNotes.some(itemNote => {
      const itemKey = cleanListMarker(itemNote).replace(/[◆◇\s，,。；;：:（）()~～*]/g, '');
      return itemKey && (itemKey === key || itemKey.includes(key) || key.includes(itemKey));
    });
  };

  guide.notes.forEach((note, noteIndex) => {
    const clean = cleanListMarker(note);
    if (!clean || noteAlreadyRenderedBelow(clean) || noteBelongsToStructuredReward(clean) || noteBelongsToLowerItem(clean) || noteIsRewardOrDrop(clean) || noteIsBattleData(clean)) {
      omitted.add(noteIndex);
      return;
    }
    const explicit = clean.match(/第\s*(\d+)\s*步/);
    if (explicit && steps[Number(explicit[1]) - 1]) {
      steps[Number(explicit[1]) - 1].notices.push(clean);
      consumed.add(noteIndex);
      return;
    }
    const noteTokens = tokens(clean);
    let bestIndex = -1;
    let bestScore = 0;
    steps.forEach((step, stepIndex) => {
      const stepTokens = tokens(step.text);
      let score = 0;
      noteTokens.forEach(token => {
        const exact = stepTokens.has(token);
        const partial = !exact && token.length >= 3 && [...stepTokens].some(stepToken => stepToken.length >= 3 && (stepToken.includes(token) || token.includes(stepToken)));
        if (!exact && !partial) return;
        if (token.startsWith('坐标:')) score += 12;
        else if (ITEM_NAMES.includes(token)) score += 9;
        else score += partial ? 3 : Math.min(6, Math.max(2, token.length - 1));
      });
      const noteAreas = [...clean.matchAll(/(?:前往|进入|抵达|返回)([^，。；]{2,24})/g)].map(match => match[1]);
      if (noteAreas.some(area => normalizeItemNames(step.text).includes(area))) score += 7;
      if (score > bestScore) { bestScore = score; bestIndex = stepIndex; }
    });
    if (bestIndex >= 0 && bestScore >= 4) {
      steps[bestIndex].notices.push(clean);
      consumed.add(noteIndex);
    }
  });
  steps.forEach(step => {
    const unique = new Map();
    step.notices.forEach(note => {
      const key = note.replace(/[◆◇\s，,。；;：:（）()~～*]/g,'');
      if ([...unique.keys()].some(existing => existing.includes(key) || key.includes(existing))) return;
      unique.set(key, note);
    });
    step.notices = [...unique.values()];
  });
  const remaining = [];
  guide.notes.forEach((note, index) => {
    if (consumed.has(index) || omitted.has(index)) return;
    const clean = cleanListMarker(note);
    const key = clean.replace(/[◆◇\s，,。；;：:（）()~～*]/g,'');
    if (remaining.some(item => item.key.includes(key) || key.includes(item.key))) return;
    remaining.push({key, note});
  });
  return {steps,notes:remaining.map(item => item.note)};
}

function renderSourceSupplements(questId, stepNumber, seen = new Set(), includeRemaining = false) {
  const sourceDoc = typeof SOURCE_DOCUMENTS === 'undefined' ? null : SOURCE_DOCUMENTS[questId];
  if (!sourceDoc) return '';
  const matchStep = item => includeRemaining || Number(item.afterStep) === Number(stepNumber);
  const areas = (sourceDoc.areas || []).filter(item => {
    const key = `area:${item.afterStep}:${item.text}`;
    if (!matchStep(item) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const images = (sourceDoc.images || []).filter(item => {
    const key = `image:${item.src}`;
    if (!matchStep(item) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return `${areas.map(area => {
    const lines = String(area.text || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
    return `<section class="source-area"><b>区域魔物</b><ul>${lines.map(line => `<li>${formatTaskText(line.replace(/^◆/, ''))}</li>`).join('')}</ul></section>`;
  }).join('')}${images.length ? `<div class="source-images">${images.map(image => `<figure><a href="${escapeHtml(image.src)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.caption)}" loading="lazy"></a><figcaption>${escapeHtml(image.caption)}<span>点击查看原图</span></figcaption></figure>`).join('')}</div>` : ''}`;
}

function renderStepNotices(notices) {
  if (!notices.length) return '';
  const classify = note => {
    if (/守门者所需|只需放在物品栏|进入条件/.test(note)) return {label:'进入条件', className:'require'};
    if (/获得方式|来源[:：]|参考《/.test(note)) return {label:'道具来源', className:'source'};
    if (/路线[:：]|到达方法|前往.+(?:村|镇|岛|城)/.test(note)) return {label:'路线补充', className:'route'};
    if (/选[“"](?:是|否)|路线[：:]|分支/.test(note)) return {label:'分支说明', className:'branch'};
    if (/必须|不可|无法|否则|注意|失败|注销|丢弃/.test(note)) return {label:'注意事项', className:'warning'};
    return {label:'步骤补充', className:'info'};
  };
  return `<div class="step-notices">${notices.map(note => {
    const type = classify(note);
    const content = formatTaskText(cleanListMarker(note)).replace(/\n/g, '<br>');
    const collapsible = note.length > 110;
    return collapsible
      ? `<details class="step-note ${type.className}"><summary><b>${type.label}</b><span>展开查看</span></summary><div>${content}</div></details>`
      : `<aside class="step-note ${type.className}"><b>${type.label}</b><div>${content}</div></aside>`;
  }).join('')}</div>`;
}

function renderQuestSteps(questId, steps, trainingMarkers = []) {
  const seenSources = new Set();
  const groups = [];
  let current = {route:'', items:[]};
  groups.push(current);
  steps.forEach(step => {
    const rawStep = step.text;
    const routeMatch = rawStep.match(/^(【[^】]+】路线)[：:]?\s*\d+(?:[*＊]{1,2})?\s*[.．、]\s*(.*)$/);
    const plainMatch = rawStep.match(/^\d+(?:[*＊]{1,2})?\s*[.．、]\s*(.*)$/);
    const route = routeMatch ? routeMatch[1] : '';
    const text = routeMatch ? routeMatch[2] : (plainMatch ? plainMatch[1] : rawStep);
    if (route !== current.route && (route || current.items.length)) {
      current = {route, items:[]};
      groups.push(current);
    }
    const stepNumber = Number((rawStep.match(/^(?:【[^】]+】路线[：:]?\s*)?(\d+)(?:[*＊]{1,2})?\s*[.．、]/) || [])[1]) || groups.reduce((total, group) => total + group.items.length, 0) + 1;
    current.items.push({text,notices:step.notices,stepNumber});
  });
  const groupHtml = groups.filter(group => group.items.length).map(group => `
    <section class="step-route">
      ${group.route ? `<h4>${group.route}</h4>` : ''}
      <ol class="quest-steps">${group.items.map(item => {
        const markers = trainingMarkers.filter(marker => Number(marker.step) === Number(item.stepNumber));
        return `<li class="${markers.length ? 'training-entry-step' : ''}"><div class="step-content"><div class="step-actions">${stepActionLabels(item.text).map(label => `<em class="step-item-action ${stepActionClass(label)}">${label}</em>`).join('')}</div><span>${formatTaskText(item.text)}</span>${markers.map(marker => `<aside class="training-step-marker"><b>练级入口：${formatTaskText(marker.name)}</b><span>${formatTaskText(marker.note || '做到这一步即可进入练级，后续任务可暂停。')}</span></aside>`).join('')}${renderStepNotices(item.notices)}${renderSourceSupplements(questId, item.stepNumber, seenSources)}</div></li>`;
      }).join('')}</ol>
    </section>`).join('');
  const remaining = renderSourceSupplements(questId, null, seenSources, true);
  return `<div class="quest-step-groups">${groupHtml}${remaining ? `<section class="source-appendix"><h4>原攻略附图与区域资料</h4>${remaining}</section>` : ''}</div>`;
}

function renderQuestNotes(notes) {
  const groups = [];
  let current = {route:'全局注意', items:[]};
  groups.push(current);
  notes.forEach(rawNote => {
    rawNote = String(rawNote ?? '');
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

const ITEM_STAT_LABELS = {
  life:'生命', magic:'魔力', attack:'攻击', defense:'防御', agility:'敏捷', spirit:'精神', recovery:'回复',
  poisonResistance:'抗毒', drunkResistance:'抗酒醉', sleepResistance:'抗昏睡', confusionResistance:'抗混乱',
  petrifyResistance:'抗石化', forgetResistance:'抗遗忘', critical:'必杀', hit:'命中', counter:'反击', dodge:'闪躲',
  durability:'耐久', magicAttack:'魔攻', magicResistance:'抗魔', charm:'魅力'
};

function formatItemStat(key, value) {
  const label = ITEM_STAT_LABELS[key] || key;
  if (value == null || typeof value !== 'object') return `${label} ${value}`;
  const min = Number(value.min);
  const max = Number(value.max);
  if (!Number.isFinite(min) && !Number.isFinite(max)) return '';
  return `${label} ${min === max || !Number.isFinite(max) ? min : `${min}～${max}`}`;
}

function renderArchiveItem(item, sourceText = '') {
  if (!item) return '';
  const stats = Object.entries(item.stats || {}).map(([key, value]) => formatItemStat(key, value)).filter(Boolean);
  return `<article class="archive-item-card">
    <header><h4>${formatTaskText(`【${item.name}】`)}</h4><div><span>Lv.${item.level ?? '—'}</span><span>${escapeHtml(item.subtype || item.category || '装备')}</span></div></header>
    <div class="archive-stats">${stats.map(stat => `<span>${escapeHtml(stat)}</span>`).join('')}</div>
    ${sourceText ? `<p class="item-source">${escapeHtml(sourceText)}</p>` : ''}
    ${item.detailNote ? `<p class="item-note">${escapeHtml(item.detailNote)}</p>` : ''}
  </article>`;
}

function renderRewardEquipmentArchive(archive) {
  const entries = archive?.entries || [];
  if (!entries.length) return '';
  const sourceText = archive.sourceFile ? `属性来源：${archive.sourceFile}` : '属性来源：魔力装备档案';
  if (entries.length > 1) {
    return `<div class="reward-equipment-variants"><b>装备型号</b><div class="reward-equipment-variant-grid">${entries.map(entry => {
      const stats = Object.entries(entry.stats || {}).map(([key, value]) => formatItemStat(key, value)).filter(Boolean);
      return `<section class="reward-equipment-variant"><header><strong>${formatTaskText(`【${entry.name}】`)}</strong><span>Lv.${entry.level ?? '—'} · ${escapeHtml(entry.subtype || entry.category || '装备')}</span></header><div class="archive-stats">${stats.map(stat => `<span>${escapeHtml(stat)}</span>`).join('')}</div>${entry.detailNote ? `<p class="item-note">${escapeHtml(entry.detailNote)}</p>` : ''}</section>`;
    }).join('')}</div><p class="item-source">${escapeHtml(sourceText)}</p></div>`;
  }
  const entry = entries[0];
  const facts = [
    entry.level != null ? `Lv.${entry.level}` : '',
    entry.subtype || entry.category || '',
    entry.hands != null ? `${entry.hands}手` : '',
    ...Object.entries(entry.stats || {}).map(([key, value]) => formatItemStat(key, value)).filter(Boolean)
  ].filter(Boolean);
  return `${facts.length ? `<div class="archive-stats reward-attributes">${facts.map(fact => `<span>${escapeHtml(fact)}</span>`).join('')}</div>` : ''}
    ${entry.detailNote ? `<p class="item-note">${escapeHtml(entry.detailNote)}</p>` : ''}
    <p class="item-source">${escapeHtml(sourceText)}</p>`;
}

function usefulAcquisitionEvents(questId, rewardData) {
  if (globalThis.STRUCTURED_REWARD_GUIDES?.[questId]?.replaceGenericAcquisitions) return [];
  const keyItemNames = new Set((globalThis.KEY_ITEM_GUIDES?.[questId] || []).map(entry => normalize(entry.name)));
  const coveredNames = new Set([
    ...(rewardData.equipmentRewards || []).map(entry => entry.item?.name),
    ...(rewardData.specialRewards || []).flatMap(entry => entry.items || []),
    ...(rewardData.combatDrops || []).flatMap(entry => (entry.items || []).map(item => item.name))
  ].map(normalize).filter(Boolean));
  const filtered = (REWARD_GUIDES[questId]?.acquisitions || []).map(event => ({
    ...event,
    items:(event.items || []).filter(item => {
      const name = normalize(item.name);
      const independentFacts = (item.notes || []).filter(note => !/^(?:为后续任务相关道具|任务剧情|BOSS打法|其它攻略)/.test(String(note).trim()));
      const hasIndependentFacts = independentFacts.length > 0;
      // 纯流程关键道具已在上方步骤和“关键道具去向”展示；没有属性或独立用途时不在下方重复。
      if (keyItemNames.has(name) && !hasIndependentFacts) return false;
      return (item.role === 'reward' || hasIndependentFacts) && !coveredNames.has(name);
    })
  })).filter(event => event.items.length);
  const firstByName = new Map();
  filtered.forEach(event => {
    event.items = event.items.filter(item => {
      const name = normalize(item.name);
      const source = {stepNumber:event.stepNumber || null, action:event.action || '', label:event.label || ''};
      if (!firstByName.has(name)) {
        item.sources = [source];
        firstByName.set(name, item);
        return true;
      }
      const existing = firstByName.get(name);
      if (!(existing.sources || []).some(entry => entry.stepNumber === source.stepNumber && entry.action === source.action)) existing.sources.push(source);
      existing.notes = [...new Set([...(existing.notes || []), ...(item.notes || [])])];
      return false;
    });
  });
  return filtered.filter(event => event.items.length);
}

function structuredRewardNames(questId) {
  const data = globalThis.STRUCTURED_REWARD_GUIDES?.[questId];
  if (!data) return [];
  return [...new Set([
    ...(data.acquisitionEvents || []).flatMap(event => (event.rewards || []).map(reward => reward.name)),
    ...(data.itemDetails || []).map(item => item.name),
    ...(data.exchanges || []).map(item => item.name)
  ].flatMap(name => String(name || '').split('／')).map(name => name.replace(/^称号[“"]|[”"]$/g, '').trim()).filter(Boolean))];
}

function renderStructuredRewards(questId) {
  const data = globalThis.STRUCTURED_REWARD_GUIDES?.[questId];
  if (!data) return '';
  const events = data.acquisitionEvents || [];
  const items = data.itemDetails || [];
  const exchanges = data.exchanges || [];
  const versions = data.versions || [];
  return `<section class="reward-subsection structured-rewards">
    <h3>获得事件</h3>
    <p class="reward-rule">按来源事件重组：步骤、来源、数量和随机性只在这里记录一次。</p>
    <div class="structured-event-list">${events.map(event => `<article class="structured-event-card">
      <header><b>${event.stepNumber ? `流程第 ${event.stepNumber} 步` : '额外来源'}</b><span>${escapeHtml(event.certainty)}</span></header>
      <p class="structured-source">${escapeHtml(event.source)}</p>
      <div class="structured-reward-rows">${event.rewards.map(reward => `<div><strong>${formatTaskText(`【${reward.name}】`)}</strong><span>${escapeHtml(reward.quantity || '数量未注明')}</span>${reward.note ? `<small>${escapeHtml(reward.note)}</small>` : ''}</div>`).join('')}</div>
    </article>`).join('')}</div>
    ${items.length ? `<h3>物品资料</h3><div class="structured-item-grid">${items.map(item => `<article class="structured-item-card">
      <header><h4>${formatTaskText(`【${item.name}】`)}</h4><span>${escapeHtml(item.kind)}</span></header>
      <dl><dt>获得方式</dt><dd>${item.sources.map(source => `<span>${escapeHtml(source)}</span>`).join('')}</dd><dt>属性 / 用途</dt><dd>${item.facts.map(fact => `<span>${escapeHtml(fact)}</span>`).join('')}</dd></dl>
    </article>`).join('')}</div>` : ''}
    ${exchanges.length ? `<h3>积分兑换表</h3><div class="exchange-table" role="table"><div class="exchange-row exchange-head" role="row"><b>所需积分</b><b>兑换物</b><b>结果 / 属性入口</b></div>${exchanges.map(entry => `<div class="exchange-row" role="row"><span>${escapeHtml(entry.cost)}</span><strong>${formatTaskText(`【${entry.name}】`)}</strong><span>${formatTaskText(entry.result)}</span></div>`).join('')}</div>` : ''}
    ${versions.length ? `<h3>旧版差异</h3><div class="reward-version-list">${versions.map(version => `<article><h4>${escapeHtml(version.name)}</h4><ul>${version.facts.map(fact => `<li>${formatTaskText(fact)}</li>`).join('')}</ul></article>`).join('')}</div>` : ''}
  </section>`;
}

function renderRewardItems(rewardData, questId) {
  const equipment = rewardData.equipmentRewards || [];
  const specialRewards = rewardData.specialRewards || [];
  const suppressedDrops = new Set((globalThis.STRUCTURED_REWARD_GUIDES?.[questId]?.suppressCombatDrops || []).map(normalize));
  const drops = (rewardData.combatDrops || []).map(drop => ({
    ...drop,
    items:(drop.items || []).filter(item => !suppressedDrops.has(normalize(item.name)))
  })).filter(drop => drop.items.length);
  const titles = rewardData.titles || [];
  const acquisitions = usefulAcquisitionEvents(questId, rewardData);
  const structured = renderStructuredRewards(questId);
  if (!structured && !acquisitions.length && !equipment.length && !specialRewards.length && !drops.length && !titles.length) {
    return '<p class="none-note">原攻略未记录可核验的道具获取、战斗掉落或称号成果。</p>';
  }
  const dropGroups = [];
  const grouped = new Map();
  drops.forEach(drop => {
    const key = drop.group || `__${dropGroups.length}`;
    if (!grouped.has(key)) {
      const group = {title:drop.group || '', note:drop.groupNote || '', drops:[]};
      grouped.set(key, group);
      dropGroups.push(group);
    }
    grouped.get(key).drops.push(drop);
  });
  const renderDropItem = entry => {
    if (entry.item) return renderArchiveItem(entry.item);
    const detail = String(entry.description || '').replace(/^【[^】]+】[^：:]{0,20}[：:]\s*/, '').trim();
    return `<div class="drop-item-plain"><strong>${formatTaskText(`【${entry.name}】`)}</strong>${detail ? `<small>${formatTaskText(detail)}</small>` : ''}</div>`;
  };
  const renderDrop = drop => `<article class="combat-drop-card"><header><b>${escapeHtml(drop.source)}</b><span>${escapeHtml(drop.probability)}</span></header><div class="drop-items">${drop.items.map(renderDropItem).join('')}</div>${drop.summary ? `<p>${formatTaskText(drop.summary)}</p>` : ''}</article>`;
  return `${structured}${acquisitions.length ? `<section class="reward-subsection"><h3>有使用价值的道具</h3><p class="reward-rule">上方流程保留取得步骤；这里集中展示可保留、可使用或有独立效果的道具资料。</p><div class="acquisition-event-list">${acquisitions.map(event => `<article class="acquisition-event-card"><header><div><span>${event.stepNumber ? `流程第 ${event.stepNumber} 步` : (event.action ? '额外取得方式' : '物品资料')}</span><b>${event.items.length} 项道具</b></div><em>${escapeHtml(event.label)}</em></header>${!event.stepNumber && event.action ? `<div class="acquisition-action"><b>取得方式</b><p>${formatTaskText(event.action)}</p></div>` : ''}<div class="acquisition-item-grid">${event.items.map(item => `<section class="acquisition-item ${item.unresolved ? 'unresolved' : ''}"><h4>${formatTaskText(`【${item.name}】`)}</h4>${item.sources?.length > 1 ? `<p class="acquisition-sources"><b>取得位置</b>${item.sources.map(source => `<span>${source.stepNumber ? `流程第 ${source.stepNumber} 步` : escapeHtml(source.label || '额外取得方式')}</span>`).join('')}</p>` : ''}${item.notes?.length ? `<ul>${item.notes.map(note => `<li>${formatTaskText(note)}</li>`).join('')}</ul>` : '<p>原攻略确认可取得，但未单列可核验属性或使用效果。</p>'}</section>`).join('')}</div></article>`).join('')}</div></section>` : ''}
    ${equipment.length ? `<section class="reward-subsection"><h3>任务奖励装备</h3><p class="reward-rule">展示取得来源与装备档案中可核验的等级、耐久和属性。</p><div class="archive-item-grid">${equipment.map(entry => renderArchiveItem(entry.item, `${entry.sources?.[0]?.label || '任务步骤'}明确获得`)).join('')}</div></section>` : ''}
    ${specialRewards.length ? `<section class="reward-subsection"><h3>其他任务奖励</h3><p class="reward-rule">宠物、宠物蛋、图鉴、设计图、配方或技能等有独立用途的成果；普通流程任务道具不在此重复。</p><div class="special-reward-list">${specialRewards.map(reward => `<article><header><b>${reward.items.length ? reward.items.map(name => formatTaskText(`【${name}】`)).join('、') : '特殊奖励'}</b><span>${escapeHtml(reward.source)}</span></header><p>${formatTaskText(reward.text)}</p></article>`).join('')}</div></section>` : ''}
    ${drops.length ? `<section class="reward-subsection"><h3>战斗掉落</h3><p class="reward-rule">概率与必掉按资料原文标注；同一战斗分支合并展示，装备档案仅负责补充属性。</p><div class="combat-drop-list">${dropGroups.map(group => group.title
      ? `<section class="combat-drop-group"><h4>${escapeHtml(group.title)}</h4><div class="combat-drop-branches">${group.drops.map(renderDrop).join('')}</div>${group.note ? `<p class="drop-group-note">${formatTaskText(group.note)}</p>` : ''}</section>`
      : group.drops.map(renderDrop).join('')).join('')}</div></section>` : ''}
    ${titles.length ? `<section class="reward-subsection"><h3>称号成果</h3><div class="title-results">${titles.map(title => `<span>${formatTaskText(`称号“${title}”`)}</span>`).join('')}</div></section>` : ''}`;
}

function normalizeEnemyEntries(enemies) {
  if ((enemies || []).every(enemy => enemy && typeof enemy === 'object')) return enemies;
  const joined = [];
  let pendingPrefix = '';
  for (const raw of enemies || []) {
    const value = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!value) continue;
    if (/^(?:Lv|LV)\.?\s*\d+\s*(?:$|[、，(（])/.test(value) && !/(?:血量约|HP约|HP：|\d动|技能[:：]|邪魔系|属性)/.test(value)) {
      if (joined.length) joined[joined.length - 1] += value;
      continue;
    }
    if (/^技能[:：]/.test(value)) {
      if (joined.length) joined[joined.length - 1] += `；${value}`;
      else joined.push(value);
      continue;
    }
    if (/^（[^）]+）$/.test(value)) continue;
    if (/^[^；;]{1,24}[：:]$/.test(value) || /^[^；;]{1,24}[，,]$/.test(value)) {
      pendingPrefix += value;
      continue;
    }
    const complete = pendingPrefix ? `${pendingPrefix}${value}` : value;
    pendingPrefix = '';
    let prose = '';
    const diaoIdx = complete.indexOf('◇');
    if (diaoIdx >= 0) { prose = complete.slice(diaoIdx + 1).trim(); }
    const proseFree = diaoIdx >= 0 ? complete.slice(0, diaoIdx).trim() : complete;
    // ｜混排（如"东方甲乙土｜石怪、岩怪｜Lv.65巨人，…｜古树之叶"）：唯一带战斗参数的段作本体，其余降为 meta
    if (proseFree.includes('｜') && !/^技能[:：]/.test(proseFree)) {
      const segs = proseFree.split(/[｜]/).map(s => s.trim()).filter(Boolean);
      // 完整敌人段 = 等级+名字+战斗参数同时具备（防止把"海盗×1｜HP约8000"这类正常条目拆坏）
      const isFullEnemy = s => /[Ll][Vv]\.?\s*\d+(?:[~～-]\d+)?\s*[\u4e00-\u9fff（]/.test(s) && /(?:血量|HP|技能[:：]|\d动)/.test(s);
      const statIdx = segs.findIndex(isFullEnemy);
      if (statIdx > 0 && segs.filter(isFullEnemy).length === 1) {
        const statsSeg = segs[statIdx];
        const labels = segs.filter((_, i) => i !== statIdx);
        const mk = statsSeg.match(/^([\s\S]*?)([；;]\s*技能[:：][\s\S]*)$/);
        const rebuilt = mk ? `${mk[1]}｜${labels.join('｜')}${mk[2]}` : `${statsSeg}｜${labels.join('｜')}`;
        joined.push(rebuilt);
        if (prose) joined.push(`◇${prose}`);
        continue;
      }
    }
    // 一行多种怪（如"Lv.50血骷髅×5、死灵×4"）：按种类拆成独立条目，共享等级与尾部参数
    const group = proseFree.match(/^([Ll]?[Vv]\.?\s*\d+(?:[~～-]\d+)?)\s*([^，,；;｜]+(?:[、][^，,；;｜]+)+)([，,；;｜].*)?$/);
    if (group && !/(?:技能[:：]|血量|属性|HP)/.test(proseFree)) {
      const trailing = group[3] || '';
      group[2].split(/[、]/).forEach(seg => {
        const part = seg.trim();
        if (part) joined.push(`${group[1]}${part}${trailing}`);
      });
      if (prose) joined.push(`◇${prose}`);
      continue;
    }
    const separated = proseFree.replace(/([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ\d）)])((?:Lv|LV|v)\.?\s*\d+(?:[~～-]\d+)?[\u4e00-\u9fff])/g, '$1|||$2');
    joined.push(...separated.split('|||').map(item => item.trim()).filter(Boolean));
    if (prose) joined.push(`◇${prose}`);
  }
  if (pendingPrefix && joined.length) joined[joined.length - 1] += `；${pendingPrefix.replace(/[：:，,]$/, '')}`;
  return joined;
}

function separateOrphanSkills(entries) {
  const enemies = [];
  const notes = [];
  for (const entry of entries) {
    if (entry && typeof entry === 'object') {
      enemies.push(entry);
      continue;
    }
    if (/^技能[:：]/.test(entry) || (/^[Ll][Vv]\.?\s*\d+\s*（/.test(entry) && !/(?:血量约|HP约|HP：|\d动|邪魔系|属性)/.test(entry))) {
      notes.push(entry.replace(/^技能[:：]\s*/, ''));
      continue;
    }
    // 迷宫说明/场景描述类散文：不是敌人，转为备注
    if (/随机迷宫|迷宫刷新时间|地图大小范围|宝箱数量|魔物为|内存在多个/.test(entry) && !/[Ll][Vv]\.?\s*\d+/.test(entry.slice(0, 8))) {
      notes.push(entry);
      continue;
    }
    enemies.push(entry);
  }
  return {enemies, notes};
}

function battleEnemyNotes(enemies) {
  return (enemies || []).filter(value => typeof value === 'string').map(value => String(value || '').trim()).filter(value => /^（[^）]+）$/.test(value)).map(value => {
    const content = value.slice(1, -1).trim();
    return content.startsWith('皆为') ? `全体敌人：${content.slice(2)}` : content;
  });
}

function parseEnemyOverview(overview) {
  const original = overview;
  let roundPrefix = '';
  let cut = 0;
  const round = overview.match(/^第[一二三四五六七八九十\d]+战\s*/);
  if (round) { roundPrefix = round[0].replace(/\s+$/, ''); cut += round[0].length; overview = overview.slice(round[0].length); }
  // 阶段标题类前缀（如"伊姆尔森林（②③④⑤）、森之迷宫魔物："）：作为组标签保留，本体照常解析
  const stage = overview.match(/^([^：:]{1,30})[：:]\s*/);
  if (stage && /[、]/.test(stage[1]) && !/[0-9]/.test(stage[1]) && !/(?:[Ll][Vv]|血量|HP|属性|抗|动|技能)/.test(stage[1])) {
    roundPrefix = roundPrefix ? `${roundPrefix}·${stage[1]}` : stage[1];
    cut += stage[0].length;
    overview = overview.slice(stage[0].length);
  }
  const levelToken = '((?:[Ll][Vv]|[Vv])[.．]?\\s*\\d+(?:\\s*[~～-]\\s*\\d+)?)';
  const headRe = new RegExp(`^([^：:]{1,24})[：:]\\s*${levelToken}?\\s*(?:[，,]\\s*)?(?=[^\\d，,；;｜：])([^，,；;｜：]+)`, 'i');
  const plainRe = new RegExp(`^${levelToken}?\\s*(?:[，,]\\s*)?(?=[^\\d，,；;｜：])([^，,；;｜：]+)`, 'i');
  const headed = headRe.exec(overview);
  if (headed) {
    const label = headed[1];
    const labelOk = !/[，,、；;｜]/.test(label) && !/(?:Lv|LV|血量|HP|属性|抗|动|坐标|[0-9])/.test(label);
    if (labelOk && headed[3]) return {prefix:roundPrefix ? `${roundPrefix}·${label}` : label, level:headed[2] || '', name:headed[3], end:cut + headed[0].length};
  }
  const plain = plainRe.exec(overview);
  if (plain) {
    let level = plain[1] || '';
    // 等级位于"｜"之后的情况（如"（坐标）（名字）｜Lv.79，二动"）
    if (!level) {
      const afterBar = original.match(/[｜]\s*([Ll]?[Vv]\.?\s*\d+(?:[~～-]\d+)?)/);
      if (afterBar) level = afterBar[1];
    }
    return {prefix:roundPrefix, level, name:plain[2], end:cut + plain[0].length};
  }
  return null;
}

function renderEnemy(enemy, extraSkills = '') {
  if (enemy && typeof enemy === 'object') {
    const formatRange = value => {
      if (value == null) return '';
      if (typeof value !== 'object') return String(value);
      if (value.min == null) return '';
      return `${value.min}${value.max != null && value.max !== value.min ? `～${value.max}` : ''}`;
    };
    const levelValue = enemy.level ?? enemy.levelRange ?? enemy.levelApprox;
    const level = levelValue != null ? `Lv.${formatRange(levelValue)}` : '';
    const actionCount = enemy.actionCount ?? enemy.actions;
    const actions = actionCount != null && actionCount !== '' ? `${actionCount}动` : '';
    const meta = [];
    const count = formatRange(enemy.count);
    if (count && count !== '1') meta.push(`数量 ${count}`);
    const hpValue = enemy.hp ?? enemy.hpApprox ?? enemy.hpRaw;
    const hp = formatRange(hpValue);
    if (hp) meta.push(`血量${enemy.hpApprox != null || enemy.hp?.approximate ? '约' : ' '}${hp}`);
    if (enemy.race) meta.push(enemy.race);
    const elementNames = {all:'全',earth:'地',water:'水',fire:'火',wind:'风'};
    const elementText = typeof enemy.elements === 'string'
      ? enemy.elements
      : Object.entries(enemy.elements || {}).map(([key,value]) => `${elementNames[key] || key}${value}`).join('／');
    if (elementText) meta.push(`属性：${elementText}`);
    const curseResistance = enemy.curseResistance ?? enemy.resistance;
    if (curseResistance === true || curseResistance === 'resistant' || curseResistance === '抗咒') meta.push('抗咒');
    if (curseResistance === false || curseResistance === 'not-resistant' || curseResistance === '不抗咒') meta.push('不抗咒');
    const skills = [...new Set([...(enemy.skills || []), ...String(extraSkills || '').split(/[；;、，,]/)].map(item => String(item || '').trim()).filter(Boolean))];
    return `<article class="enemy-card">
      <header><b>${formatTaskText(enemy.name || '敌人资料')}</b>${level ? `<span class="enemy-level">${level}</span>` : ''}<span class="enemy-actions${actions ? '' : ' actions-none'}">${actions || '未记录'}</span></header>
      ${meta.length ? `<div class="enemy-meta">${meta.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : ''}
      ${skills.length ? `<div class="enemy-skills"><strong>技能</strong><div>${skills.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div></div>` : '<div class="enemy-skills enemy-skills-none"><strong>技能</strong><span class="skills-none">资料未记录</span></div>'}
    </article>`;
  }
  // 源数据"（坐标）（名字）"前缀颠倒的情况：交换顺序让名字可被正常解析
  enemy = enemy.replace(/^（\s*([0-9]{1,3}[.，,][0-9]{1,3})\s*）\s*（([^）]+)）/, '（$2）（$1）');
  const skillMarker = enemy.match(/[；;，,]\s*技能[:：]/);
  const markerIndex = skillMarker ? skillMarker.index : -1;
  const overview = markerIndex >= 0 ? enemy.slice(0, markerIndex) : enemy;
  const skillsText = markerIndex >= 0 ? enemy.slice(markerIndex + skillMarker[0].length) : '';
  const parsed = parseEnemyOverview(overview);
  if (!parsed) return `<article class="enemy-card enemy-plain"><p>${enemy}</p></article>`;
  const prefix = parsed.prefix ? `<span class="enemy-group">${parsed.prefix}</span>` : '';
  const level = parsed.level ? parsed.level.replace(/^lv[.．]?/i, 'Lv.').replace(/^v[.．]?/i, 'Lv.').replace(/\s*[~～-]\s*/g, '～') : '';
  let name = parsed.name.trim();
  let meta = [];
  const tail = name.match(/（([^）]*)）\s*(?:[×*]\s*(\d+))?\s*$/);
  if (tail) {
    meta.push(tail[1].trim());
    name = name.slice(0, tail.index).trim();
    if (tail[2] && Number(tail[2]) > 1) name += `×${tail[2]}`;
  } else {
    const count = name.match(/\s*[×*]\s*(\d+)\s*$/);
    if (count) {
      const base = name.slice(0, count.index).trim();
      name = Number(count[1]) > 1 ? `${base}×${count[1]}` : base;
    }
  }
  // 名字整体被括号包裹（如"（石头）"）时还原为纯名字
  const wrapped = name.match(/^（([^）]+)）$/);
  if (wrapped) name = wrapped[1].trim();
  meta.unshift(...overview.slice(parsed.end).replace(/^[，,；;｜：\s]+/, '').split(/[，,；;｜]/).map(item => item.trim()).filter(Boolean));
  // 等级已进徽标，去掉 meta 里重复的等级 chip
  if (parsed.level) {
    const norm = s => String(s).replace(/[\s.]/g, '').toLowerCase();
    const lvNorm = norm(parsed.level);
    meta = meta.filter(seg => norm(seg) !== lvNorm);
  }
  // 处理源数据粘连：属性/血量后直接跟"技能："的情况（如"属性:全属性30阿鲁巴斯技能：攻击"）
  const gluedSkills = [];
  meta = meta.flatMap(seg => {
    const attrGlue = seg.match(/^(.*?约?[\d~～]+)\s*(属性[:：].+)$/);
    if (attrGlue && !/属性/.test(attrGlue[1])) return [attrGlue[1], attrGlue[2]];
    return [seg];
  });
  meta = meta.flatMap(seg => {
    const glued = seg.match(/^(.*?)(?:技能[（(][左右][）)]|技能)[:：]\s*(.+)$/);
    if (!glued) return [seg];
    let pre = glued[1].replace(/^[，,；;｜：\s]+/, '');
    if (name && pre.endsWith(name)) pre = pre.slice(0, pre.length - name.length).trim();
    gluedSkills.push(glued[2]);
    return pre ? [pre] : [];
  });
  // 行动次数提取（"1动/2动/（1动）/二动/1~2动"），转为"一动/二动"显示在标题行最右
  const cnDigit = ch => ({'1':'一','2':'二','3':'三','4':'四','5':'五','6':'六','7':'七','8':'八','9':'九','两':'二'})[ch] || ch;
  const actionsLabel = raw => `${String(raw).replace(/[0-9一两]/g, cnDigit).replace(/[-~]/g, '～')}动`;
  let actions = '';
  meta = meta.flatMap(seg => {
    if (actions) return [seg];
    const m = seg.match(/^[（(]?([0-9一二两三四五六七八九十]+(?:[~～-][0-9一二两三四五六七八九十]+)?)动[）)]?$/) || seg.match(/^行动[:：]?\s*([0-9一二两三四五六七八九十]+)动?$/);
    if (m) { actions = actionsLabel(m[1]); return []; }
    const glue = seg.match(/^([0-9]+动)(?=血量|HP|属性|抗|技能)/);
    if (glue) { actions = actionsLabel(glue[1].replace(/动$/, '')); return [seg.slice(glue[1].length)]; }
    return [seg];
  });
  const combinedSkills = [skillsText, ...gluedSkills, extraSkills].filter(part => part && part.trim()).join('；');
  const skillSeen = new Set();
  const skills = combinedSkills.split(/[；;、，,]/).map(item => item.trim().replace(/^护卫护卫/, '护卫')).filter(item => {
    if (!item) return false;
    const key = item.replace(/\s+/g, '').toLowerCase();
    if (skillSeen.has(key)) return false;
    skillSeen.add(key);
    return true;
  });
  return `<article class="enemy-card">
    <header>${prefix}<b>${name}</b>${level ? `<span class="enemy-level">${level}</span>` : ''}<span class="enemy-actions${actions ? '' : ' actions-none'}">${actions || '未记录'}</span></header>
    ${meta.length ? `<div class="enemy-meta">${meta.map(item => `<span>${item}</span>`).join('')}</div>` : ''}
    ${skills.length ? `<div class="enemy-skills"><strong>技能</strong><div>${skills.map(item => `<span>${item}</span>`).join('')}</div></div>` : '<div class="enemy-skills enemy-skills-none"><strong>技能</strong><span class="skills-none">资料未记录</span></div>'}
  </article>`;
}

function enemyNameCore(enemy) {
  if (enemy && typeof enemy === 'object') return String(enemy.name || '').trim();
  // 先剥掉技能段，防止"Lv.65小樱；技能：定点移动、逃跑"把技能词当名字
  let text = String(enemy || '').split(/技能[:：]/)[0];
  // "（坐标）（名字）"前缀颠倒：交换后直取括号名
  const swapped = text.replace(/^（\s*([0-9]{1,3}[.，,][0-9]{1,3})\s*）\s*（([^）]+)）/, '（$2）（$1）');
  const paren = swapped.match(/^（([^）]+)）/);
  if (paren) return paren[1].trim();
  const clean = s => String(s || '').replace(/^[、，,；;]+/, '').replace(/[×x*]\s*\d+[\s\S]*$/, '').replace(/（[^）]*）/g, '').trim();
  // "首领名：Lv.90修特"格式：冒号后必须有等级才认前缀，防止"名字：HP≈45000"把统计词当名字
  const head = text.match(/^[^：:]{1,24}[：:]\s*((?:[Ll][Vv]\.?\s*\d+(?:[~～-]\d+)?)?)\s*([^，,；;｜：]+)/);
  if (head && head[1]) return clean(head[2]);
  const plain = text.match(/^([Ll][Vv]\.?\s*\d+(?:[~～-]\d+)?)?\s*([^，,；;｜：]+)/);
  return plain ? clean(plain[2]) : '';
}

function assignFightSkills(enemies, skillsValue) {
  const assigned = enemies.map(() => '');
  const extraNotes = [];
  if (enemies.some(enemy => enemy && typeof enemy === 'object')) return {assignments: assigned, extraNotes};
  const skills = String(skillsValue || '').trim();
  if (!skills || !enemies.length) return {assignments: assigned, extraNotes};
  skills.split(/\s*[；;]\s*/).map(item => item.replace(/[。\s]+$/, '').trim()).filter(Boolean).forEach(segment => {
    if (segment.includes('【') || /[，,！？]/.test(segment) || segment.length >= 40) {
      extraNotes.push(segment);
      return;
    }
    let target = 0;
    let body = segment;
    if (/^(?:[0-9]+\s*只)?(?:小怪|喽啰|杂兵)/.test(segment) && !segment.includes('：') && !segment.includes(':')) {
      extraNotes.push(segment);
      return;
    }
    const headed = segment.match(/^([^：:]{1,16})[：:]\s*(.+)$/);
    if (headed) {
      const prefix = headed[1].replace(/[0-9]+\s*只/g, '').trim();
      const index = enemies.findIndex((_, i) => {
        const core = enemyNameCore(enemies[i]);
        return core && core.length >= 2 && (core.includes(prefix) || prefix.includes(core));
      });
      const minion = /[0-9]\s*只|小怪|喽啰|杂兵|小鸟|幼/.test(headed[1]);
      body = headed[2];
      if (index >= 0) {
        assigned[index] = assigned[index] ? `${assigned[index]}；${body}` : body;
        return;
      }
      if (minion && enemies.length > 1) {
        // "N只小怪：技能" 是群体描述，覆盖除首领外的全部敌人
        for (let mi = 1; mi < enemies.length; mi++) {
          assigned[mi] = assigned[mi] ? `${assigned[mi]}；${body}` : body;
        }
        return;
      }
      target = 0;
    }
    assigned[target] = assigned[target] ? `${assigned[target]}；${body}` : body;
  });
  return {assignments: assigned, extraNotes};
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

function bossStepRef(fightTitle, steps) {
  const core = String(fightTitle || '').replace(/[（(][^）)]*[）)]/g, '').replace(/第[一二三四五六七八九十\d]+战/g, '').replace(/最终战$/, '').replace(/怀旧服/g, '').trim();
  if (!core || !steps || !steps.length) return '';
  const hitBattle = [];
  const hitAny = [];
  steps.forEach((step, idx) => {
    if (!step.text.includes(core)) return;
    (/(战斗|对战|击败|挑战|开打|进入战斗)/.test(step.text) ? hitBattle : hitAny).push(idx + 1);
  });
  const target = hitBattle.length ? hitBattle : hitAny;
  return target.length ? `对应第 ${target.join('、')} 步` : '';
}

// 一场战斗资料里混排了多个"标签｜小怪｜Lv.N本体｜掉落"子战斗（如东方甲乙土/南方丙丁火四方向）时，拆为独立战斗块
// 注意"海盗×1｜HP约8000"这类"名字｜参数"正常格式不算（段数不足且首段是名字）
function expandLabeledFights(sections) {
  const isLabeled = e => {
    const segs = e.split('｜');
    return segs.length >= 3 && !/^[Ll][Vv]/.test(segs[0].trim()) && /^[Ll][Vv]/.test(segs[2].trim());
  };
  return (sections || []).flatMap(fight => {
    const raw = (fight.enemies || []).map(e => String(e || '').trim()).filter(Boolean);
    if (raw.filter(isLabeled).length < 2) return [fight];
    const groups = [];
    for (const entry of raw) {
      if (isLabeled(entry) || !groups.length) groups.push([]);
      groups[groups.length - 1].push(entry);
    }
    return groups.map(g => {
      const label = (g[0].match(/^([^｜,，;；]{1,14})｜/) || ['', ''])[1];
      return {...fight, title: label ? `${fight.title}·${label}` : fight.title, _stepTitle: fight.title, enemies: g};
    });
  });
}

// 战斗标题清洗：剥离"（怀旧服）"后缀；尾部动作词清理；标题与敌人对不上时纠正（NPC名误当BOSS名/句子误当标题）
// 名字池基于"归一化后的敌人条目"，防止技能碎片（如"Lv.8、火焰魔法"）污染标题
function polishFightTitle(fight) {
  let title = String(fight.title || '').replace(/[（(]怀旧服[^）)]*[）)]/g, '').trim();
  if (/可遇到的魔物|区域(内)?(可遇)?魔物/.test(title)) return {...fight, kind: '区域魔物', title: '区域魔物（非BOSS）'};
  // 尾部动作词清理："遗迹地下每层守门者对话进入" → "遗迹地下每层守门者"
  title = title.replace(/(?:处)?对话(?:进入|战斗|开战)?$/, '').replace(/关键战斗$/, '').replace(/[之的]$/, '').trim();
  const enemies = normalizeEnemyEntries(fight.enemies || []);
  const raw = enemies.map(e => e.split(/技能[:：]/)[0]).join(' ');
  const names = [...new Set(enemies.map(e => enemyNameCore(e)).filter(Boolean))];
  const matched = title && title.split('·').some(p => p.trim() && (raw.includes(p.trim()) || names.some(n => p.includes(n) || n.includes(p))));
  if (matched) return {...fight, title};
  // 标题与敌人名同尾（"…守门者" vs "傲慢的守门者"）也算有效标题
  const tailMatched = title && title.length >= 4 && names.some(n => n.length >= 4 && title.endsWith(n.slice(-3)));
  if (tailMatched) return {...fight, title};
  // 通用垃圾标题（"关键战斗"/"XX对话"/单字残句/技能文本串）→ 用敌人名
  const generic = !title || /^(关键战斗|之?对话|女|男|？？？.*)$/.test(title)
    || (/技能|攻击|魔法|逃跑|移动|召唤/.test(title) && !title.includes('【'));
  if (names.length === 1 || generic || title.length >= 14) {
    return {...fight, title: names.slice(0, 3).join('、') || title || String(fight.kind || '') || 'BOSS 战'};
  }
  return {...fight, title};
}

function bossSectionSummary(questId, sections) {
  if (questId === 'catalog-ea811a83-8f76-4186-b1dc-73494b57061c') return '守关战、主线终战与支线分流';
  if (questId === 'catalog-5a3faf19-bfba-4bfa-8d5e-8ae55bb50537') return '1 场主线 · 2 场支线';
  return `${sections.length} 项战斗资料`;
}

function isStepCopy(value, guideText) {
  const text = String(value || '').replace(/^◆\s*/, '').trim();
  if (!text) return true;
  if (/^[0-9]+\s*[.．、]/.test(text)) return true;
  return text.length >= 10 && guideText.includes(text);
}

function trainingRouteDetails(route) {
  const entries = Object.entries(globalThis.TRAINING_ROUTE_DETAILS || {});
  const routeNames = [route.name, ...(route.aliases || [])].map(normalize).filter(Boolean);
  const match = entries.find(([name]) => routeNames.some(routeName => routeName.includes(normalize(name)) || normalize(name).includes(routeName)));
  return match?.[1] || {};
}

function renderTrainingRoutes(quest) {
  const routes = globalThis.TRAINING_ROUTES?.[quest.name] || [];
  if (!routes.length) return '';
  return `<section class="training-routes">
    <div class="section-title"><span>练级路线</span><small>首次推进与快速重复路线分开显示</small></div>
    <div class="training-route-list">${routes.map(route => {
      const routeInfo = trainingRouteDetails(route);
      const routeStep = routeInfo.stepsByTask?.[quest.name] ?? routeInfo.step;
      const firstTime = routeInfo.firstTime || `首次开放条件：${route.unlock}。${route.route ? ` 按路线说明抵达${route.name}后即可停下任务流程。` : ''}`;
      const quickRoute = routeInfo.quick === true ? routeInfo.repeat : '';
      return `<details class="training-route-card" open>
      <summary><b>${route.name}</b><span>${routeInfo.checkpoint || route.levels}</span></summary>
      <div class="training-route-paths ${quickRoute ? 'has-quick' : ''}">
        <article class="training-path first"><em>路线 1</em><div><strong>首次练级路线 · ${routeInfo.checkpoint || '按开放条件进入'}</strong><p>${formatTaskText(firstTime)}</p>${routeStep ? `<small>对应下方完整任务流程的第 ${routeStep} 步</small>` : ''}</div></article>
        ${quickRoute ? `<article class="training-path quick"><em>路线 2</em><div><strong>取得关键道具后的快速路线</strong><p>${formatTaskText(quickRoute)}</p></div></article>` : ''}
      </div>
      <p class="training-levels"><strong>练级等级</strong>${formatTaskText(route.levels)}</p>
    </details>`;}).join('')}</div>
  </section>`;
}

function switchDetailTab(tabName) {
  document.querySelectorAll('[data-detail-tab]').forEach(button => {
    const active = button.dataset.detailTab === tabName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-detail-panel]').forEach(panel => {
    panel.hidden = panel.dataset.detailPanel !== tabName;
  });
}

function structuredQuestRecord(questId) {
  return globalThis.QUEST_DATA?.quests?.[questId] || null;
}

function structuredGuide(record, fallback) {
  if (!record) return null;
  const firstStep = record.flow.steps[0]?.text || '';
  const rawStart = String(record.flow.start?.location || fallback.start || '').replace(/^(?:步骤\s*)?\d+[.、．]\s*/, '').trim();
  const duplicateStart = rawStart.replace(/\s+/g, '') === firstStep.replace(/\s+/g, '');
  const conciseStart = duplicateStart
    ? rawStart.split(/[，,；;]/)[0].replace(/调查(?=\s*[（(]\d)/, '').trim()
    : rawStart;
  const globalNotes = [
    ...(record.flow.notes || []).map(note => note.text),
    ...(record.segments || []).filter(segment => segment.type === 'update-heading').map(segment => segment.text)
  ];
  return {
    guide: {
      start: conciseStart,
      conditions: record.requirements.text || fallback.conditions || [],
      steps: record.flow.steps.map(step => `${step.order}.${step.text}`),
      notes: []
    },
    organized: {
      steps: record.flow.steps.map(step => ({
        text: `${step.order}.${step.text}`,
        notices: (step.notes || []).map(note => note.text)
      })),
      notes: globalNotes
    }
  };
}

function structuredTextList(value) {
  if (value == null) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map(item => typeof item === 'object' ? item?.text : item).map(item => String(item ?? '').trim()).filter(Boolean);
}

function structuredBossSections(record) {
  if (!record) return [];
  const result = [];
  for (const version of Object.values(record.versions || {})) {
    for (const tier of Object.values(version.tiers || {})) {
      for (const battle of Object.values(tier.battles || {})) {
        const relatedChanges = (version.changes || []).filter(change => change.targetBattleOrder === battle.order);
        const rounds = Array.isArray(battle.rounds) && battle.rounds.length ? battle.rounds : [null];
        const firstEnemyName = Object.values(battle.enemies || {})[0]?.name;
        const baseTitle = battle.title || battle.name || firstEnemyName || (rounds[0] ? '连续战斗' : `战斗 ${battle.order ?? battle.id ?? ''}`.trim());
        rounds.forEach((round, roundIndex) => result.push({
          kind: version.key === 'common' ? '关键战斗' : version.label,
          title: [tier.key === 'common' ? '' : tier.label, baseTitle, round ? `第${round.order ?? roundIndex + 1}场` : ''].filter(Boolean).join(' · '),
          versionKey: version.key,
          tierKey: tier.key,
          order: round?.order ?? battle.order,
          enemies: round ? (round.enemies || []) : Object.values(battle.enemies || {}),
          skills: '',
          strategy: structuredTextList(round?.strategy ?? round?.strategies ?? battle.strategy),
          notes: [
            ...relatedChanges.flatMap(change => [change.text, ...structuredTextList(change.details)]),
            ...structuredTextList(battle.notes),
            ...structuredTextList(round?.notes),
            ...(round?.headerElements ? [`全体属性：${round.headerElements}`] : [])
          ].filter(Boolean),
          sourceLines: round?.sourceLines || battle.sourceLines || []
        }));
      }
    }
  }
  return result.sort((a,b) => a.versionKey.localeCompare(b.versionKey, 'zh-CN') || String(a.tierKey).localeCompare(String(b.tierKey), 'zh-CN') || (a.order || 999) - (b.order || 999));
}

function renderStructuredVersionChanges(record) {
  if (!record) return '';
  const rows = [];
  for (const version of Object.values(record.versions || {})) {
    const battleOrders = new Set(Object.values(version.tiers || {}).flatMap(tier => Object.values(tier.battles || {}).map(battle => battle.order)));
    for (const change of version.changes || []) {
      if (change.targetBattleOrder && battleOrders.has(change.targetBattleOrder)) continue;
      const changeText = String(change.text ?? '').trim();
      const details = structuredTextList(change.details);
      const body = [changeText, ...details].filter(Boolean);
      if (!body.length) continue;
      rows.push(`<span><b>${escapeHtml(version.label)}${change.targetBattleOrder ? ` · 第${change.targetBattleOrder}关调整` : '调整'}</b>：${body.map(item => formatTaskText(item)).join('；')}</span>`);
    }
  }
  return rows.length ? `<div class="fight-facts version-change-list">${rows.join('')}</div>` : '';
}

function renderRewardKnowledge(rewardItem) {
  const properties = rewardItem.properties || {};
  const formatStats = stats => Object.entries(stats || {}).map(([name, value]) => `${name}${typeof value === 'number' && value >= 0 ? '+' : ''}${value}`).join('、');
  const formatModifiers = modifiers => typeof modifiers === 'string'
    ? modifiers
    : Object.entries(modifiers || {}).map(([name, value]) => `${name}${typeof value === 'number' && value >= 0 ? '+' : ''}${value}`).join('、');
  const rows = [
    ['类别', properties.type],
    ['等级', properties.level != null ? `Lv.${properties.level}` : ''],
    ['用途', properties.use],
    ['使用效果', properties.effect],
    ['获得结果', properties.result],
    ['结果说明', properties.petDescription || properties.description],
    ['属性数值', formatStats(properties.stats)],
    ['耐久', properties.durability],
    ['修正', formatModifiers(properties.modifiers)],
    ['技能经验', properties.skillExperience != null ? `+${properties.skillExperience}` : ''],
    ['每组叠加', properties.stackLimit != null ? `${properties.stackLimit} 个` : ''],
    ['交易', properties.tradeable === true ? '可交易' : properties.tradeable === false ? '不可交易' : ''],
    ['型号说明', properties.variants],
    ['版本说明', properties.availabilityNote || properties.change],
    ['参考任务', properties.referenceQuest],
    ['核验说明', properties.verificationNote]
  ].filter(([, value]) => value !== '' && value != null);
  const profile = properties.petProfile || properties.resultPetProfile;
  if (profile) {
    const baseStats = Array.isArray(profile.baseStats)
      ? ['体', '攻', '防', '敏', '魔'].map((key, index) => `${key}${profile.baseStats[index]}`).join('／')
      : Object.entries(profile.baseStats || {}).map(([key, value]) => `${key}${value}`).join('／');
    const elements = typeof profile.elements === 'string'
      ? profile.elements
      : Object.entries(profile.elements || {}).map(([key, value]) => `${key}${value}`).join('／');
    const modifiers = typeof profile.modifiers === 'string'
      ? profile.modifiers
      : Object.entries(profile.modifiers || {}).map(([key, value]) => `${key}+${value}`).join('／');
    rows.push(
      ['结果宠种族', profile.race],
      ['属性', elements],
      ['技能栏', profile.skillSlots != null ? `${profile.skillSlots} 格` : ''],
      ['总档', profile.totalGrade != null ? `${profile.totalGrade}D${profile.gradeStatus ? `（${profile.gradeStatus}）` : ''}` : ''],
      ['档位', baseStats],
      ['修正', modifiers]
    );
  }
  const optionHtml = (properties.options || []).length ? `<div class="reward-option-list"><b>分型资料</b>${properties.options.map(option => `<section><strong>${escapeHtml(option.name)}</strong><span>武器：${escapeHtml(option.weapon)}</span><span>防具：${escapeHtml(option.armor)}</span><span>饰品：${escapeHtml(option.accessory)}</span></section>`).join('')}</div>` : '';
  const skillsHtml = (properties.skills || []).length ? `<div class="reward-skill-list"><b>可习得技能</b><p>${properties.skills.map(skill => `<span>${escapeHtml(skill)}</span>`).join('')}</p></div>` : '';
  const references = (rewardItem.references || []).filter(reference => reference?.url && reference?.label);
  const referencesHtml = references.length ? `<div class="reward-reference-list"><b>资料来源</b>${references.map(reference => `<a href="${escapeHtml(reference.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(reference.label)} ↗</a>`).join('')}</div>` : '';
  return `${rows.filter(([, value]) => value !== '' && value != null).length ? `<dl class="reward-fact-list">${rows.filter(([, value]) => value !== '' && value != null).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${formatTaskText(String(value))}</dd></div>`).join('')}</dl>` : ''}${optionHtml}${skillsHtml}${referencesHtml}`;
}

function renderVersionedRewards(record) {
  if (!record) return '';
  const useVersionAccordion = record.presentation?.rewardLayout === 'version-accordion';
  const semanticEvents = (record.rewardEvents || [])
    .map(rewardEvent => ({ ...rewardEvent, items: (rewardEvent.items || []).filter(rewardItem => rewardItem.role === 'valuable-result') }))
    .filter(rewardEvent => rewardEvent.items.length);
  const hasVersionedData = Object.keys(record.versions || {}).some(key => key !== 'common');
  const hasPeriodicOffers = semanticEvents.some(event => event.items.some(item => item.purchase && item.resultPet));
  if (!hasVersionedData && !hasPeriodicOffers) return '';
  if (semanticEvents.length) {
    const grouped = new Map();
    for (const rewardEvent of semanticEvents) {
      const groupKey = `${rewardEvent.version || 'common'}\u0000${rewardEvent.tier || 'common'}`;
      if (!grouped.has(groupKey)) grouped.set(groupKey, []);
      grouped.get(groupKey).push(rewardEvent);
    }
    const signedRange = value => {
      if (value == null) return '';
      if (typeof value === 'number') return `${value >= 0 ? '+' : ''}${value}`;
      if (typeof value === 'object' && value.min != null && value.max != null) return `+${value.min}～+${value.max}`;
      return String(value);
    };
    const groups = [];
    for (const [groupKey, events] of grouped) {
      const [versionKey, tierKey] = groupKey.split('\u0000');
      const version = record.versions?.[versionKey];
      const tier = version?.tiers?.[tierKey];
      const periodicGroup = events.some(event => event.items.some(item => item.purchase && item.resultPet));
      const title = periodicGroup ? '历次上架记录' : [versionKey === 'common' ? '通用资料' : (version?.label || versionKey), tierKey === 'common' ? '' : (tier?.label || tierKey)].filter(Boolean).join(' · ');
      // 同名道具可能分别属于不同年份或档位的奖池；只能在当前版本与档位内去重。
      const renderedItemNames = new Set();
      let renderedItemCount = 0;
      const cards = events.map(rewardEvent => {
        const eventLabel = periodicGroup ? '周期上架' : rewardEvent.kind === 'battle-drop' ? '战斗掉落' : rewardEvent.kind === 'reward-pool' ? '随机奖池' : rewardEvent.kind === 'exchange-recipe' ? '兑换' : '明确记录';
        const eventItems = (rewardEvent.items || []).filter(rewardItem => {
          if (periodicGroup) return true;
          if (renderedItemNames.has(rewardItem.name)) return false;
          renderedItemNames.add(rewardItem.name);
          return true;
        });
        if (!eventItems.length) return '';
        renderedItemCount += eventItems.length;
        const items = eventItems.map(rewardItem => {
          if (rewardItem.purchase && rewardItem.resultPet) {
            const purchase = rewardItem.purchase;
            const resultPet = rewardItem.resultPet;
            const offerMeta = [resultPet.race, resultPet.elements ? `属性 ${resultPet.elements}` : '', resultPet.skillSlots != null ? `技能栏 ${resultPet.skillSlots}` : '', resultPet.totalGrowth != null ? `总档 ${resultPet.totalGrowth}` : ''].filter(Boolean);
            const price = purchase.unitPrice != null ? `${Number(purchase.unitPrice).toLocaleString('zh-CN')}G${purchase.parts ? '／张' : ''}` : '原攻略未列价格';
            return `<section class="acquisition-item periodic-offer"><h4>${formatTaskText(`【${rewardItem.name}】`)}${rewardItem.date ? `<span>${escapeHtml(rewardItem.date)}</span>` : ''}</h4>
              <p class="offer-purchase"><b>上架规格</b> ${escapeHtml([purchase.parts, price].filter(Boolean).join(' · '))}</p>
              <p class="offer-result"><b>改造结果</b> ${formatTaskText(`【${resultPet.name}】`)}</p>
              ${offerMeta.length ? `<div class="enemy-meta reward-attributes">${offerMeta.map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div>` : ''}
              ${Array.isArray(resultPet.growth) && resultPet.growth.length >= 5 ? `<p><b>档位</b> ${resultPet.growth.map(value => escapeHtml(String(value))).join(' / ')}</p>` : ''}
              ${rewardItem.basePetRestriction ? `<p><b>底宠限制</b> ${escapeHtml(rewardItem.basePetRestriction)}</p>` : ''}
              ${rewardItem.additionalFacts?.length ? `<ul>${rewardItem.additionalFacts.map(note => `<li>${formatTaskText(note)}</li>`).join('')}</ul>` : ''}
            </section>`;
          }
          const properties = rewardItem.properties || {};
          const equipmentArchiveHtml = renderRewardEquipmentArchive(rewardItem.equipmentArchive);
          const knowledgeHtml = renderRewardKnowledge(rewardItem);
          const attributes = [
            properties.level != null ? `等级 ${properties.level}` : '',
            properties.category ? `种类 ${properties.category}` : '',
            properties.attack != null ? `攻击 ${signedRange(properties.attack)}` : '',
            properties.defense != null ? `防御 ${signedRange(properties.defense)}` : '',
            properties.recovery != null ? `回复 ${signedRange(properties.recovery)}` : '',
            properties.durability != null ? `耐久${typeof properties.durability === 'object' ? `约 ${properties.durability.min}～${properties.durability.max}` : ` ${properties.durability}`}` : ''
          ].filter(Boolean);
          const variants = rewardItem.variants || [];
          return `<section class="acquisition-item"><h4>${formatTaskText(`【${rewardItem.name}】`)}</h4>
            ${rewardItem.quantity != null ? `<p><b>数量</b> ${escapeHtml(String(rewardItem.quantity))}</p>` : ''}
            ${attributes.length ? `<div class="enemy-meta reward-attributes">${attributes.map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div>` : ''}
            ${knowledgeHtml}
            ${equipmentArchiveHtml}
            ${properties.title ? `<p class="versioned-reward-title"><b>称号效果</b> ${escapeHtml(properties.title)}</p>` : ''}
            ${variants.length ? `<div class="versioned-reward-effects"><b>型号效果</b><ul>${variants.map(variant => typeof variant === 'string' ? `<li>${escapeHtml(variant)}</li>` : `<li><strong>${escapeHtml(variant.model)}</strong> ${escapeHtml(variant.effect?.skill || '')}：耗魔 ${variant.effect?.manaCostChangePercent ?? ''}%${variant.note ? `（${escapeHtml(variant.note)}）` : ''}</li>`).join('')}</ul></div>` : ''}
          </section>`;
        }).join('');
        return `<article class="acquisition-event-card"><header><div><span>${eventLabel}</span><b>${eventItems.length} 项道具</b></div></header><div class="acquisition-item-grid">${items}</div></article>`;
      }).filter(Boolean).join('');
      if (useVersionAccordion) {
        const open = groups.length === 0 ? ' open' : '';
        groups.push(`<details class="reward-subsection reward-accordion"${open}><summary><h3>${escapeHtml(title)}</h3><span>${renderedItemCount} 项奖励</span></summary><div class="structured-reward-list">${cards}</div></details>`);
      } else {
        groups.push(`<section class="reward-subsection"><h3>${escapeHtml(title)}</h3><div class="structured-reward-list">${cards}</div></section>`);
      }
    }
    return groups.join('');
  }
  const groups = [];
  for (const version of Object.values(record.versions || {})) {
    for (const tier of Object.values(version.tiers || {})) {
      if (!(tier.rewards || []).length) continue;
      const title = [version.key === 'common' ? '通用资料' : version.label, tier.key === 'common' ? '' : tier.label].filter(Boolean).join(' · ');
      const cards = tier.rewards.map(reward => {
        const attributes = reward.attributes || {};
        const attributeLabels = [
          attributes.level ? `等级 ${attributes.level}` : '',
          attributes.category ? `种类 ${attributes.category}` : '',
          attributes.attack ? `攻击 +${attributes.attack.min}～+${attributes.attack.max}` : '',
          attributes.defense ? `防御 +${attributes.defense.min}～+${attributes.defense.max}` : '',
          attributes.recovery ? `回复 +${attributes.recovery.min}～+${attributes.recovery.max}` : '',
          attributes.durability ? `耐久约 ${attributes.durability.min}～${attributes.durability.max}` : ''
        ].filter(Boolean);
        return `<article class="acquisition-event-card"><header><div><span>${reward.kind === 'chance' ? '随机／概率' : reward.kind === 'exchange' ? '兑换' : '明确记录'}</span><b>${reward.items.map(item => `【${escapeHtml(item)}】`).join('、')}</b></div></header>
          ${attributeLabels.length ? `<div class="enemy-meta reward-attributes">${attributeLabels.map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div>` : ''}
          ${reward.title ? `<p class="versioned-reward-title"><b>称号效果</b> ${escapeHtml(reward.title)}</p>` : ''}
          ${reward.effects?.length ? `<div class="versioned-reward-effects"><b>型号效果</b><ul>${reward.effects.map(effect => `<li><strong>${escapeHtml(effect.variant)}</strong> ${escapeHtml(effect.skill)}：耗魔 -${effect.reductionPercent}%${effect.note ? `（${escapeHtml(effect.note)}）` : ''}</li>`).join('')}</ul></div>` : ''}
          ${reward.details?.length ? `<div class="versioned-reward-text"><ul>${reward.details.map(detail => `<li>${formatTaskText(detail)}</li>`).join('')}</ul></div>` : ''}</article>`;
      }).join('');
      groups.push(`<section class="reward-subsection"><h3>${escapeHtml(title)}</h3><div class="structured-reward-list">${cards}</div></section>`);
    }
  }
  return groups.join('');
}

function renderQuest(quest, updateHash = true) {
  selectedQuestId = quest.id;
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
  const sourceGuide = QUEST_GUIDES[quest.id];
  const structuredRecord = structuredQuestRecord(quest.id);
  // 只有完成逐行人工语义核验的记录才可成为正式渲染源；旧数据仅作为安全回退。
  const structuredPresentationRecord = structuredRecord?.verification?.status === 'verified'
    ? structuredRecord
    : null;
  const structuredGuideData = structuredGuide(structuredPresentationRecord, sourceGuide);
  const guide = structuredGuideData?.guide || sourceGuide;
  const itemRewards = ITEM_REWARD_GUIDES[quest.id] || {equipmentRewards:[],specialRewards:[],combatDrops:[],titles:[]};
  const lowerAcquisitionEvents = usefulAcquisitionEvents(quest.id, itemRewards);
  const lowerItemNames = [
    ...lowerAcquisitionEvents.flatMap(event => event.items.map(item => item.name)),
    ...structuredRewardNames(quest.id)
  ];
  const lowerItemNotes = lowerAcquisitionEvents.flatMap(event => event.items.flatMap(item => item.notes || []));
  const organizedGuide = structuredGuideData?.organized || organizeGuide(guide, lowerItemNames, globalThis.STRUCTURED_REWARD_GUIDES?.[quest.id] || null, lowerItemNotes);
  const keyItemsHtml = renderKeyItems(quest.id);
  const structuredBosses = structuredBossSections(structuredPresentationRecord);
  const structuredVersionChanges = renderStructuredVersionChanges(structuredPresentationRecord);
  const bossGuides = BOSS_GUIDES[quest.id] || [];
  let bossSections = structuredPresentationRecord
    ? structuredBosses
    : expandLabeledFights(buildBossSections(quest.id, bossGuides)).map(polishFightTitle);
  // 同名战斗用首个敌人名+等级消歧
  const titleCount = {};
  bossSections.forEach(f => { titleCount[f.title] = (titleCount[f.title] || 0) + 1; });
  bossSections = bossSections.map(f => {
    if (titleCount[f.title] <= 1) return f;
    const firstEnemy = (f.enemies || [])[0] || '';
    const core = enemyNameCore(firstEnemy);
    const enemyLevel = firstEnemy && typeof firstEnemy === 'object'
      ? (firstEnemy.level ?? firstEnemy.levelRange ?? firstEnemy.levelApprox)
      : null;
    const lv = enemyLevel != null
      ? (typeof enemyLevel === 'object'
          ? (enemyLevel.min == null ? '' : `${enemyLevel.min}${enemyLevel.max != null && enemyLevel.max !== enemyLevel.min ? `～${enemyLevel.max}` : ''}`)
          : String(enemyLevel))
      : (String(firstEnemy).match(/^[LlIi]?[Vv][.．]?\s*(\d+(?:\s*[~～-]\s*\d+)?)/) || [])[1];
    return {...f, title: `${f.title}（${core}${lv ? `·Lv.${lv}` : ''}）`};
  });
  const indexOnly = quest.detailStatus === 'index-only';
  const bossHtml = bossSections.length ? bossSections.map(fight => {
    const separated = separateOrphanSkills(normalizeEnemyEntries(fight.enemies));
    const proseNotes = separated.enemies.filter(entry => /^◇/.test(entry)).map(entry => entry.replace(/^◇/, ''));
    const enemies = separated.enemies.filter(entry => !/^◇/.test(entry));
    const orphanNotes = separated.notes;
    const {assignments: skillAssignments, extraNotes} = assignFightSkills(enemies, fight.skills);
    const stepRef = bossStepRef(fight._stepTitle || fight.title, organizedGuide.steps);
    const fightFacts = [...battleEnemyNotes(fight.enemies), ...(fight.notes || []).map(note => escapeHtml(String(note)))];
    const strategyItems = [...(fight.strategy || []), ...proseNotes, ...extraNotes]
      .map(item => String(item ?? '').trim())
      .filter(item => item.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim());
    return `
    <article class="boss-fight">
      <div class="boss-heading"><span>${fight.kind}</span><h4>${formatTaskText(fight.title)}</h4>${stepRef ? `<em class="boss-step">${stepRef}</em>` : ''}</div>
      ${fightFacts.length ? `<div class="fight-facts">${fightFacts.map(note => `<span>${note}</span>`).join('')}</div>` : ''}
      <div class="enemy-list">${enemies.map((enemy, enemyIndex) => renderEnemy(enemy, skillAssignments[enemyIndex])).join('')}</div>
      ${orphanNotes.length ? `<div class="fight-facts fight-notes">${orphanNotes.map(note => {
        const isScene = /随机迷宫|迷宫刷新时间|地图大小范围|宝箱数量|魔物为|内存在多个/.test(note);
        const label = isScene ? '场景资料' : (enemies.length ? '资料残缺（技能续）' : '本场敌人资料缺失，仅存技能记录');
        return `<span>${label}：${note}</span>`;
      }).join('')}</div>` : ''}
      ${strategyItems.length ? `<div class="strategy"><b>打法建议</b><ol>${strategyItems.map(item => `<li>${item}</li>`).join('')}</ol></div>` : ''}
    </article>`;
  }).join('') : indexOnly
      ? '<div class="no-boss"><b>BOSS 资料待核验</b><p>这里的空白不代表没有 BOSS；为避免混入其他服务器数值，尚未核验的数据不会冒充完整资料。</p></div>'
      : quest.bossStatus === 'not-documented'
        ? '<div class="no-boss"><b>原攻略未单列 BOSS 数据</b><p>页面不据此推断“没有 BOSS”；战斗触发点仍保留在任务步骤中。</p></div>'
        : '<div class="no-boss"><b>本任务无 BOSS 战</b><p>流程风险主要来自迷宫、时段或材料条件，详见上方任务步骤。</p></div>';
  const chainHtml = series.length > 1 ? `
    <section class="chain-card">
      <div class="section-title"><span>系列关系链</span><small>${quest.stageLabel ? `当前 ${quest.stageLabel}` : (quest.order ? `第 ${quest.order} 项` : `第 ${index + 1} 项`)} · 已收录 ${series.length} 项</small></div>
      <div class="chain-track">${series.map(item => `<button type="button" data-quest-id="${item.id}" class="chain-node ${item.id === quest.id ? 'current' : ''} ${item.optional ? 'optional' : ''}" title="${item.optional ? '支线／可选' : item.name}"><span>${item.stageLabel || item.order}</span><b>${item.name}</b><small>${item.prerequisites.length ? `前置 ${item.prerequisites.length} 项` : '链条起点'}</small></button>`).join('')}</div>
      <div class="chain-neighbors">
        <div class="chain-direction"><b>直接前置</b><div class="chain-relation-list">${seriesPrevious.length ? seriesPrevious.map(item => relationButton(item.id, '← 前置')).join('') : '<div class="chain-edge">已是本链起点</div>'}</div></div>
        <div class="chain-direction"><b>直接后续</b><div class="chain-relation-list">${seriesNext.length ? seriesNext.map(item => relationButton(item.id, '后续 →')).join('') : '<div class="chain-edge">已是本链末尾</div>'}</div></div>
      </div>
      <p class="chain-hint">关系线严格依据任务前置生成；同阶段任务可能并行，编号相邻不代表互为前置。虚线节点表示支线或材料任务。</p>
    </section>` : '';
  const seriesPreviousIds = new Set(seriesPrevious.map(item => item.id));
  const seriesNextIds = new Set(seriesNext.map(item => item.id));
  const otherPrerequisites = quest.prerequisites.filter(id => !seriesPreviousIds.has(id));
  const otherDownstream = requiredBy.filter(item => !seriesNextIds.has(item.id));
  const prerequisiteHtml = otherPrerequisites.length
    ? otherPrerequisites.map(id => relationButton(id, '必须前置')).join('')
    : '<div class="relation-empty">没有系列链以外的前置任务</div>';
  const downstreamHtml = otherDownstream.length
    ? otherDownstream.map(item => relationButton(item.id, '解锁去向')).join('')
    : '<div class="relation-empty">没有系列链以外的后续任务</div>';
  const relationHtml = `<div class="relation-grid">
      <section><div class="section-title"><span>前置任务</span><small>链外 ${otherPrerequisites.length} 项</small></div><div class="relation-list">${prerequisiteHtml}</div></section>
      <section><div class="section-title"><span>后续索引</span><small>链外 ${otherDownstream.length} 项</small></div><div class="relation-list">${downstreamHtml}</div></section>
    </div>`;
  const trainingHtml = renderTrainingRoutes(quest);
  const trainingMarkers = (globalThis.TRAINING_ROUTES?.[quest.name] || []).flatMap(route => {
    const routeInfo = trainingRouteDetails(route);
    const routeStep = routeInfo.stepsByTask?.[quest.name] ?? routeInfo.step;
    return routeStep ? [{step:routeStep,name:route.name,note:routeInfo.stepNote || routeInfo.checkpoint}] : [];
  });
  const displaySummary = structuredPresentationRecord && /^必要条件[：:]/.test(quest.summary)
    ? quest.summary.split(/[；;]/)
      .map(part => part.trim())
      .filter(part => part && !/^(?:必要条件[：:]|怀旧服临时任务|以下仅展示怀旧服路线与参数)/.test(part))
      .join('；')
    : quest.summary;

  detail.innerHTML = `
    <header class="detail-head">
      <div>
        <p class="eyebrow">${quest.series || quest.sourceCategory || quest.type || '独立任务'}</p>
        <h2>${quest.name}</h2>
        <p class="aliases">${quest.aliases.join(' · ')}</p>
      </div>
      <div class="detail-badges"><span>${quest.type}</span><span>${quest.level}</span>${indexOnly ? '<span class="warn">关系已收录 · 详情待核验</span>' : ''}<span class="${reliabilityClass}">${reliabilityText}</span></div>
    </header>
    ${displaySummary ? `<p class="summary">${formatTaskText(displaySummary)}</p>` : ''}
    ${chainHtml}
    ${relationHtml}
    ${trainingHtml ? `<div class="detail-tabs" role="tablist" aria-label="任务内容切换">
      <button type="button" class="active" role="tab" aria-selected="true" data-detail-tab="task">完整任务流程</button>
      <button type="button" role="tab" aria-selected="false" data-detail-tab="training">练级路线</button>
    </div><div data-detail-panel="task"><div class="task-flow-content">` : ''}
    <section class="guide-card">
      <div class="section-title"><span>任务内容</span><small>关键流程摘要</small></div>
      <div class="guide-layout">
        <div class="guide-meta">
          <div><span>起点</span><b>${formatTaskText(guide.start)}</b></div>
          <div><span>条件</span><ul>${guide.conditions.map(item => `<li>${formatTaskText(item)}</li>`).join('')}</ul></div>
        </div>
        ${renderQuestSteps(quest.id, organizedGuide.steps, trainingMarkers)}
      </div>
      ${organizedGuide.notes.length ? `<div class="quest-notes"><b>全局注意事项</b><div class="note-groups">${renderQuestNotes(organizedGuide.notes)}</div></div>` : ''}
    </section>
    ${keyItemsHtml}
    <section class="boss-card">
      <div class="section-title"><span>BOSS 数据与打法</span><small>${bossSections.length ? bossSectionSummary(quest.id, bossSections) : (indexOnly ? '等待核验' : (quest.bossStatus === 'not-documented' ? '原攻略未单列' : '无首领战'))}</small></div>
      ${structuredVersionChanges}
      <div class="boss-list">${bossHtml}</div>
    </section>
    <section class="rewards-card">
      <div class="section-title"><span>道具获取与战斗掉落</span><small>获得方式、掉落与成果统一汇总</small></div>
      ${globalThis.STRUCTURED_REWARD_GUIDES?.[quest.id]
        ? renderRewardItems(itemRewards, quest.id)
        : (renderVersionedRewards(structuredPresentationRecord) || renderRewardItems(itemRewards, quest.id))}
    </section>
    <section class="source-card"><div><b>核验来源</b><p>仅收录怀旧服资料；同一任务存在多服版本时，只采用怀旧服路线和参数。</p></div><a href="${source.url}" target="_blank" rel="noreferrer">${source.name} ↗</a></section>
    ${trainingHtml ? `</div></div><div data-detail-panel="training" hidden>${trainingHtml}</div>` : ''}`;
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
  const detailTab = event.target.closest('[data-detail-tab]');
  if (detailTab) {
    switchDetailTab(detailTab.dataset.detailTab);
    return;
  }
  if (!event.target.closest('#questCombo')) { restoreUneditedInput(); closeList(); }
});

document.querySelector('#recordCount').textContent = `${QUESTS.length} 个任务`;
const hashQuest = new URLSearchParams(location.hash.slice(1)).get('quest');
if (hashQuest && questById.has(hashQuest)) renderQuest(questById.get(hashQuest), false);
