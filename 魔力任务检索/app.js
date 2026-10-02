const input = document.querySelector('#questSearch');
const listbox = document.querySelector('#questOptions');
const toggle = document.querySelector('#comboToggle');
const clearButton = document.querySelector('#clearSearch');
const detail = document.querySelector('#questDetail');
const empty = document.querySelector('#emptyState');

const QUEST_RECORDS = Object.values(globalThis.QUEST_DATA?.quests || {}).filter(record => record.verification?.status === 'verified');
const QUEST_RECORD_BY_ID = new Map(QUEST_RECORDS.map(record => [record.id, record]));
const QUEST_RECORD_BY_NAME = new Map(QUEST_RECORDS.map(record => [record.name, record]));

function relationTargetId(relation) {
  if (typeof relation === 'string') return relation;
  return relation?.questId || QUEST_RECORD_BY_NAME.get(relation?.quest || relation?.targetQuest)?.id || '';
}

// 搜索与关系视图只保留索引字段；正文、流程、战斗和奖励始终直接读取 QUEST_DATA。
const QUEST_INDEX = QUEST_RECORDS.map(record => {
  const metadata = record.metadata || {};
  const presentation = record.presentation || {};
  return {
    id: record.id,
    name: record.name,
    aliases: [...(record.aliases || [])],
    initials: presentation.initials || '',
    series: presentation.series || '',
    order: presentation.order ?? null,
    stageLabel: presentation.stageLabel || '',
    optional: Boolean(presentation.optional),
    level: metadata.level || '',
    type: presentation.type || metadata.category || '任务',
    sourceCategory: presentation.sourceCategory || metadata.category || '',
    prerequisites: (record.relations?.prerequisites || []).map(relationTargetId).filter(Boolean),
    summary: metadata.summary || '',
    availability: metadata.availability || 'available'
  };
});

// 练级查询是关联数据的唯一来源。保留已人工核验的详细路线，再为其余关联任务补全练级卡片。
(function integrateTrainingRoutes() {
  globalThis.TRAINING_ROUTES ||= {};
  const questByName = new Map(QUEST_INDEX.map(quest => [quest.name, quest]));
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

const questById = new Map(QUEST_INDEX.map(quest => [quest.id, quest]));
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
  const results = QUEST_INDEX.map(quest => ({quest, score: scoreQuest(quest, query)}))
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
  const entries = globalThis.KEY_ITEM_GUIDES?.[questId] || [];
  if (!entries.length) return '';
  return `<section class="key-items-card">
    <div class="section-title"><span>关键道具去向</span><small>重复路线与后续任务用途</small></div>
    <div class="key-item-list">${entries.map(entry => `<article class="key-item-card">
      <header><h3>${formatTaskText(`【${entry.name}】`)}</h3><span>${entry.stepNumber ? `流程第 ${entry.stepNumber} 步取得` : '本任务取得'}</span></header>
      ${entry.trainingUses.length ? `<div class="key-use-block training"><b>重复练级路线</b>${entry.trainingUses.map(use => `<div><strong>${escapeHtml(use.routeName)}</strong><p>${formatTaskText(use.text)}</p></div>`).join('')}</div>` : ''}
      ${(entry.repeatUses || []).length ? `<div class="key-use-block"><b>重复任务路线</b>${entry.repeatUses.map(use => `<div><strong>${escapeHtml(use.routeName)}</strong><p>${formatTaskText(use.text)}</p></div>`).join('')}</div>` : ''}
      ${entry.questUses.length ? `<div class="key-use-block downstream"><b>后续任务使用</b><div class="key-quest-links">${entry.questUses.map(use => relationButton(use.questId, '需要此道具')).join('')}</div>${entry.questUses.map(use => `<p><strong>${escapeHtml(use.questName)}：</strong>${formatTaskText(use.text)}</p>`).join('')}</div>` : ''}
    </article>`).join('')}</div>
  </section>`;
}

function formatTaskText(value) {
  const normalized = String(value ?? '');
  let offset = 0;
  return normalized.split(/(【[^】]+】|称号\s*[“"][^”"]+[”"]|[“"][^”"]+[”"]\s*称号|[“"][^”"]+[”"])/g).map(part => {
    const start = offset;
    offset += part.length;
    if (/^称号\s*[“"][^”"]+[”"]$/.test(part) || /^[“"][^”"]+[”"]\s*称号$/.test(part)) {
      return `<mark class="title-tag">${escapeHtml(part)}</mark>`;
    }
    if (/^[“"][^”"]+[”"]$/.test(part)) {
      const before = normalized.slice(0, start);
      const clauseStart = Math.max(before.lastIndexOf('。'), before.lastIndexOf('；'), before.lastIndexOf('，'), before.lastIndexOf(','), before.lastIndexOf('\n'));
      const clause = before.slice(clauseStart + 1);
      return /(?:输入|键入|回答|说出|回复|口令|密码|暗号)/.test(clause)
        ? `<mark class="input-text">${escapeHtml(part)}</mark>`
        : escapeHtml(part);
    }
    const bracketed = part.match(/^【([^】]+)】$/);
    if (bracketed) {
      return `<mark class="item-tag">【${escapeHtml(bracketed[1])}】</mark>`;
    }
    return escapeHtml(part);
  }).join('');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function stepActionClass(label) {
  if (label === '消耗道具') return 'consume-action';
  if (label === '取得道具') return 'gain-action';
  if (label === '道具要求') return 'require-action';
  if (label === '输入文字') return 'input-action';
  return 'use-action';
}

function renderSourceSupplements(questId, stepNumber, seen = new Set(), includeRemaining = false) {
  const record = structuredQuestRecord(questId);
  const sourceDoc = globalThis.SOURCE_DOCUMENTS?.[questId] || null;
  const sourceAreas = record?.sourceSupplements?.areas || [];
  const sourceImages = record?.sourceSupplements?.images || sourceDoc?.images || [];
  if (!sourceAreas.length && !sourceImages.length) return '';
  const matchStep = item => includeRemaining || Number(item.afterStep) === Number(stepNumber);
  const areas = sourceAreas.filter(item => {
    const key = `area:${item.afterStep}:${item.text}`;
    if (!matchStep(item) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const images = sourceImages.filter(item => {
    const key = `image:${item.placementId || item.src}`;
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
  const groups = new Map();
  for (const note of notices) {
    const type = note.type || '';
    const group = type === 'blocking-condition' ? ['require','进入条件']
      : ['route','reentry','alternative-fee'].includes(type) ? ['route','路线说明']
      : ['failure-condition','safety-warning'].includes(type) ? ['warning','注意事项']
      : ['info','补充说明'];
    if (!groups.has(group[0])) groups.set(group[0], {label:group[1], notes:[]});
    groups.get(group[0]).notes.push(note);
  }
  return `<div class="step-notices"><aside class="step-note consolidated">${[...groups].map(([type, group]) => `<section class="step-note-group ${type}"><b>${group.label}</b><ul>${group.notes.map(note => `<li>${formatTaskText(note.text).replace(/\n/g, '<br>')}</li>`).join('')}</ul></section>`).join('')}</aside></div>`;
}

function renderStepBranches(groups) {
  if (!Array.isArray(groups) || !groups.length) return '';
  return `<div class="step-branches">${groups.map(group => `<section class="step-branch"><h5>${escapeHtml(group.title)}${group.recommended ? '<em>推荐</em>' : ''}</h5>${group.condition ? `<p class="branch-condition">${formatTaskText(group.condition)}</p>` : ''}${renderStepOperations(group.operations)}</section>`).join('')}</div>`;
}

function renderStepOperations(operations) {
  if (!Array.isArray(operations) || !operations.length) return '';
  return `<ol class="step-operations">${operations.map(operation => `<li>${formatTaskText(operation.text)}</li>`).join('')}</ol>`;
}

function renderStepChoices(questId, choices) {
  if (!Array.isArray(choices) || !choices.length) return '';
  const record = structuredQuestRecord(questId);
  const rewardEvents = new Map((record?.rewardEvents || []).map(event => [event.id, event]));
  const rows = choices.map(choice => {
    const facts = [];
    const additionalInput = choice.additionalInput;
    if (additionalInput?.item) {
      const amount = additionalInput.quantity != null ? `${additionalInput.quantity}${additionalInput.unit || ''}` : '';
      facts.push(`<span><b>额外消耗</b>${formatTaskText([amount, additionalInput.item].filter(Boolean).join(' '))}</span>`);
    }
    if (choice.output) facts.push(`<span><b>获得</b>${formatTaskText(`【${choice.output}】`)}</span>`);
    const rewardEvent = rewardEvents.get(choice.rewardEvent);
    if (rewardEvent) {
      const names = (rewardEvent.items || []).map(item => `【${item.name}】`).join('、');
      const resultLabel = rewardEvent.selection === 'random-one' ? '随机获得其中 1 项' : '可能获得';
      facts.push(`<span><b>${resultLabel}</b>${formatTaskText(names)}</span>`);
    }
    return `<div><strong>选择“${escapeHtml(choice.value)}”</strong>${facts.join('')}</div>`;
  }).join('');
  return `<div class="step-choice-details"><b>分支结果</b>${rows}</div>`;
}

function renderStepQuiz(quiz) {
  if (!quiz || typeof quiz !== 'object') return '';
  return `<div class="step-quiz">${[['day','白天'],['night','夜晚']].map(([key,label]) => {
    const rows = quiz[key];
    if (!Array.isArray(rows) || !rows.length) return '';
    return `<section><h4>${label}题库</h4><div class="quiz-table-scroll"><table><thead><tr><th>序号</th><th>问题</th><th>答案</th></tr></thead><tbody>${rows.map(([question,answer], index) => `<tr><td>${index + 1}</td><td>${formatTaskText(question)}</td><td>${formatTaskText(answer)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }).join('')}</div>`;
}

function renderGuideSections(sections) {
  if (!Array.isArray(sections) || !sections.length) return '';
  return `<section class="guide-appendix"><h4>补充路线与后续用途</h4>${sections.map(section => `<details class="guide-section"><summary>${escapeHtml(section.title)}</summary>${renderStepOperations(section.operations)}${renderStepNotices(section.notes || [])}</details>`).join('')}</section>`;
}

function renderQuestSteps(questId, steps, trainingMarkers = []) {
  const seenSources = new Set();
  const groups = [];
  let current = {route:'', items:[]};
  groups.push(current);
  steps.forEach(step => {
    const route = step.route || step.branch || '';
    if (route !== current.route && (route || current.items.length)) {
      current = {route, items:[]};
      groups.push(current);
    }
    current.items.push(step);
  });
  const groupHtml = groups.filter(group => group.items.length).map(group => `
    <section class="step-route">
      ${group.route ? `<h4>${group.route}</h4>` : ''}
      <ol class="quest-steps">${group.items.map(item => {
        const markers = trainingMarkers.filter(marker => Number(marker.step) === Number(item.order));
        return `<li class="${markers.length ? 'training-entry-step' : ''}"><div class="step-content"><div class="step-actions">${item.actions.map(label => `<em class="step-item-action ${stepActionClass(label)}">${label}</em>`).join('')}</div><span>${formatTaskText(item.text)}</span>${renderStepOperations(item.sourceDetails?.operations)}${renderStepBranches(item.sourceDetails?.branchGroups)}${markers.map(marker => `<aside class="training-step-marker"><b>练级入口：${formatTaskText(marker.name)}</b><span>${formatTaskText(marker.note || '做到这一步即可进入练级，后续任务可暂停。')}</span></aside>`).join('')}${renderStepNotices(item.notices)}${renderStepChoices(questId, item.sourceDetails?.choices)}${renderStepQuiz(item.sourceDetails?.quiz)}${renderStepOperations(item.sourceDetails?.afterOperations)}${renderPresentationFacts(item.sourceDetails?.presentationFacts)}${renderStepSourceSections(item.sourceDetails?.presentationSections)}${renderSourceSupplements(questId, item.order, seenSources)}</div></li>`;
      }).join('')}</ol>
    </section>`).join('');
  const remaining = renderSourceSupplements(questId, null, seenSources, true);
  return `<div class="quest-step-groups">${groupHtml}${renderGuideSections(structuredQuestRecord(questId)?.flow?.sections)}${remaining ? `<section class="source-appendix"><h4>原攻略附图与区域资料</h4>${remaining}</section>` : ''}</div>`;
}

function renderQuestNotes(notes) {
  const warningTypes = new Set(['known-bug','source-bug-caveat','disposable-after-completion']);
  return `<section class="note-group"><h4>全局注意</h4><div class="note-items">${notes.map(note => `<p class="${warningTypes.has(note.type) ? 'warning' : ''}">${formatTaskText(note.text)}</p>`).join('')}</div></section>`;
}

function renderPresentationFacts(facts, displayedLabels = []) {
  const seen = new Set();
  const rows = (facts || []).filter(row => {
    const signature = `${row.label}\u0000${row.text}`;
    if (!row.text || displayedLabels.includes(row.label) || seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
  return rows.length ? `\n<dl class="reward-fact-list semantic-facts">${rows.map(row => `<div data-fact-key="${escapeHtml(row.key)}"${row.sourceEventId ? ` data-fact-event="${escapeHtml(row.sourceEventId)}"` : ''}><dt>${escapeHtml(row.label)}</dt><dd>${formatTaskText(row.text)}${renderStepSourceSections(row.sections)}${row.questId ? relationButton(row.questId, '查看任务') : ''}</dd></div>`).join('\n')}</dl>\n` : '';
}

function renderStepSourceSections(sections) {
  return (sections || []).map(section => {
    const body = section.kind === 'rounds'
      ? (section.rounds || []).map(round => `<section class="step-battle-round"><h4>第${escapeHtml(round.order)}场</h4><div class="enemy-grid">${structuredValues(round.enemies).map(enemy => renderEnemy(enemy)).join('')}</div></section>`).join('')
      : `<div class="semantic-table-scroll"><table class="semantic-table"><thead><tr><th>${escapeHtml(section.columns?.[0] || (section.key === 'quizBank' ? '问题' : '项目'))}</th><th>${escapeHtml(section.columns?.[1] || (section.key === 'quizBank' ? '答案' : '资料与规则'))}</th></tr></thead><tbody>${(section.rows || []).map(row => `<tr><th scope="row">${formatTaskText(row.label)}</th><td>${formatTaskText(row.text)}</td></tr>`).join('')}</tbody></table></div>`;
    return `<section class="step-data-section" data-step-field="${escapeHtml(section.key)}"><h4>${escapeHtml(section.title)}</h4>${body}</section>`;
  }).join('');
}

function renderAlternateRewardFacts(primary, sources) {
  const properties = {...primary.commonProperties, ...primary.properties, ...primary.appraisedProperties};
  const primarySource = (sources || []).find(source => source.item === primary);
  const unique = new Set();
  return (sources || []).filter(source => source.item !== primary).map(source => {
    const alternate = {...source.item.commonProperties, ...source.item.properties, ...source.item.appraisedProperties};
    const facts = (source.item.allPropertyFacts || []).filter(row => JSON.stringify(alternate[row.key]) !== JSON.stringify(properties[row.key]));
    facts.push(...(source.item.presentationItemFacts || []).filter(row => JSON.stringify(source.item[row.key]) !== JSON.stringify(primary[row.key])));
    facts.push(...(source.event?.presentationFacts || []).filter(row => !(primarySource?.event?.presentationFacts || []).some(primaryRow => primaryRow.key === row.key && primaryRow.text === row.text)).map(row => ({...row,sourceEventId:source.event.id})));
    const context = ['quantity','use','useEffect','firstClearOnly','unidentifiedName','identifiedName'].filter(key => source.item[key] != null && JSON.stringify(source.item[key]) !== JSON.stringify(primary[key]));
    const contextLabels = {quantity:'数量',use:'用途',useEffect:'使用效果',firstClearOnly:'仅首通取得',unidentifiedName:'未鉴定名称',identifiedName:'鉴定后名称'};
    context.forEach(key => facts.push({key,label:contextLabels[key],text:structuredValueText(source.item[key])}));
    if (!facts.length) return '';
    const signature = JSON.stringify(facts);
    if (unique.has(signature)) return '';
    unique.add(signature);
    return `<section class="reward-source-variant"><b>${escapeHtml(source.label)}的资料差异</b>${renderPresentationFacts(facts)}</section>`;
  }).join('');
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

function formatStructuredRange(value) {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  if (value.min == null) return '';
  return `${value.min}${value.max != null && value.max !== value.min ? `～${value.max}` : ''}`;
}

function renderEnemy(enemy) {
  if (!enemy || typeof enemy !== 'object') return '';
  const levelValue = enemy.level ?? enemy.levelRange ?? enemy.levelApprox;
  const level = levelValue != null ? `Lv.${formatStructuredRange(levelValue)}` : '';
  const actionCount = enemy.actionCount ?? enemy.actions;
  const actions = actionCount != null && actionCount !== '' ? `${actionCount}动` : '';
  const meta = [];
  const count = formatStructuredRange(enemy.count);
  if (count && count !== '1') meta.push(`数量 ${count}`);
  const hpValue = enemy.hp ?? enemy.hpApprox ?? enemy.hpRaw;
  const hp = formatStructuredRange(hpValue);
  if (hp) meta.push(`血量${enemy.hpApprox != null || enemy.hp?.approximate ? '约' : ' '}${hp}`);
  if (enemy.race) meta.push(enemy.race);
  if (enemy.position) meta.push(`站位：${enemy.position}`);
  if (enemy.modifiers) meta.push(`修正：${enemy.modifiers}`);
  if (enemy.poisonResistance === 'not-resistant') meta.push('不抗毒');
  if (enemy.poisonResistance === 'resistant') meta.push('抗毒');
  if (enemy.petrifyResistance === 'not-resistant') meta.push('不抗石化');
  if (enemy.petrifyResistance === 'resistant') meta.push('抗石化');
  const elementNames = {all:'全',earth:'地',water:'水',fire:'火',wind:'风'};
  const elementText = typeof enemy.elements === 'string'
    ? enemy.elements
    : Object.entries(enemy.elements || {}).map(([key,value]) => `${elementNames[key] || key}${value}`).join('／');
  if (elementText) meta.push(`属性：${elementText}`);
  const curseResistance = enemy.curseResistance ?? enemy.resistance;
  if (curseResistance === true || curseResistance === 'resistant' || curseResistance === '抗咒') meta.push('抗咒');
  if (curseResistance === false || curseResistance === 'not-resistant' || curseResistance === '不抗咒') meta.push('不抗咒');
  if (curseResistance && ![true,false,'resistant','not-resistant','抗咒','不抗咒'].includes(curseResistance)) meta.push(`抗性：${curseResistance}`);
  const skills = [...new Set((enemy.skills || []).map(item => String(item || '').trim()).filter(Boolean))];
  const sourceDetails = renderStructuredFields(enemy._sourceDetails || enemy, ENEMY_RENDERED_FIELDS, '敌人补充资料');
  return `<article class="enemy-card">
    <header><b>${formatTaskText(enemy.name || enemy.display || enemy.base || '敌人资料')}</b>${level ? `<span class="enemy-level">${escapeHtml(level)}</span>` : ''}${actions ? `<span class="enemy-actions">${escapeHtml(actions)}</span>` : ''}</header>
    ${meta.length ? `<div class="enemy-meta">${meta.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : ''}
    ${skills.length ? `<div class="enemy-skills"><strong>技能</strong><div>${skills.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div></div>` : '<div class="enemy-skills enemy-skills-none"><strong>技能</strong><span class="skills-none">资料未记录</span></div>'}
    ${sourceDetails}
  </article>`;
}

function bossSectionSummary(questId, sections) {
  if (questId === 'catalog-ea811a83-8f76-4186-b1dc-73494b57061c') return '守关战、主线终战与支线分流';
  if (questId === 'catalog-5a3faf19-bfba-4bfa-8d5e-8ae55bb50537') return '1 场主线 · 2 场支线';
  return `${sections.length} 项战斗／区域资料`;
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
  return QUEST_RECORD_BY_ID.get(questId) || null;
}

function structuredStepActions(step) {
  const labels = [];
  const inputs = (step.inputs || []).filter(item => item.entityType !== 'skill');
  if ((step.inputs || []).some(item => item.entityType === 'skill' && item.action === 'use')) labels.push('使用技能');
  const requireActions = new Set(['hold', 'hold-one-of', 'carry', 'require', 'possess', 'present', 'hold-title', 'proof-of-progress', 'wait-completion']);
  const useActions = new Set(['use', 'use-and-consume', 'equip', 'equip-one-of', 'open', 'appraise', 'inspect', 'hatch', 'double-click-use', 'identify-and-use', 'reduce-durability']);
  const discardActions = new Set(['discard','discard-if-held','drop-before-dialogue']);
  const removalActions = new Set(['system-remove','removed-on-entry','remove','remove-title']);
  if (inputs.some(item => requireActions.has(item.action) || item.consumed === false && !useActions.has(item.action))) labels.push('道具要求');
  if (inputs.some(item => useActions.has(item.action))) labels.push('使用道具');
  if (inputs.some(item => discardActions.has(item.action))) labels.push('丢弃道具');
  if (inputs.some(item => removalActions.has(item.action))) labels.push('收走道具');
  if (inputs.some(item => !requireActions.has(item.action) && !discardActions.has(item.action) && !removalActions.has(item.action) && (!useActions.has(item.action) || item.consumed === true || item.action === 'use-and-consume') && item.consumed !== false)) labels.push('消耗道具');
  if ((step.outputs || []).some(item => !['skill','career'].includes(item.entityType))) labels.push('取得道具');
  if ((step.outputs || []).some(item => item.entityType === 'skill')) labels.push('学习技能');
  if ((step.outputs || []).some(item => item.entityType === 'career')) labels.push('就职');
  if ((step.commands || []).length) labels.push('输入文字');
  return labels;
}

function structuredGuide(record) {
  const conditions = [
    ...structuredTextList(record.requirements?.text),
    ...structuredTextList(record.requirements?.conditions)
  ].filter((item, index, list) => list.indexOf(item) === index);
  return {
    start: String(record.flow?.start?.location || ''),
    conditions,
    steps: (record.flow?.steps || []).map(step => ({
      id: step.id,
      order: step.order,
      text: step.text,
      route: typeof step.route === 'string' ? step.route : '',
      branch: typeof step.branch === 'string' ? step.branch : '',
      notices: (step.notes || []).map(note => typeof note === 'object' ? note : {text:String(note)}).filter(note => note.text),
      actions: structuredStepActions(step),
      sourceDetails: step
    })),
    notes: (record.flow?.notes || []).map(note => typeof note === 'object' ? note : {text:String(note)}).filter(note => note.text)
  };
}

function structuredTextList(value) {
  if (value == null) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map(item => typeof item === 'object' ? item?.text : item).map(item => String(item ?? '').trim()).filter(Boolean);
}

function structuredValues(value) {
  return Array.isArray(value) ? value : Object.values(value || {});
}

const STRUCTURED_FIELD_LABELS = {
  actionCount:'行动次数', actions:'行动次数', additionalBattle:'追加战斗', additionalInput:'额外消耗', advice:'建议', ambush:'偷袭', ambushPossible:'可偷袭', area:'区域',
  approximate:'约数', approximateFloors:'约层数', areaDrops:'区域掉落', areas:'区域', attributes:'属性', autoBattleAllowed:'允许自动战斗',
  autoBattleChangeDate:'自动战斗规则变更日期', battleBackground:'战斗背景', battleExperience:'战斗经验', battleExperiencePerEncounter:'每场战斗经验',
  back:'后排', front:'前排', bottomEnemies:'底层魔物', canAmbush:'可偷袭', capturable:'可捕捉', capture:'捕捉', capturePoint:'捕捉点', captureRules:'捕捉规则',
  book:'书籍', career:'职业', chance:'概率', chanceDrop:'概率掉落', changeLog:'变更记录', chestCount:'宝箱数量', chests:'宝箱', coordinate:'坐标', count:'数量', description:'说明', details:'详情',
  date:'日期', previousEnemyCount:'变更前魔物数量', currentEnemyCount:'变更后魔物数量', experienceMultiplierApprox:'约经验倍率',
  day:'白天', night:'夜晚', damage:'伤害', frequency:'使用频率', derivation:'推导依据', drop:'掉落', dropDistribution:'掉落分配', dropRule:'掉落规则', drops:'掉落', element:'属性', elements:'属性', earth:'地', water:'水', fire:'火', wind:'风', encounters:'遭遇',
  enemiesByRoute:'分路线魔物', enemiesByServer:'分服务器魔物', enemy:'魔物', enemyCount:'魔物数量', enemyDetails:'敌人资料',
  enemyEffects:'敌人效果', enemyGroups:'敌人组', enemyLevel:'魔物等级', enemyLevelApprox:'魔物约等级', enemyLevelRule:'魔物等级规则',
  enemySkills:'魔物技能', entry:'入口', experience:'经验', expected:'目录名称', detailed:'详细资料名称', matches:'是否一致', fixedCount:'固定数量', fixedEnemyCount:'固定敌人数', fixedMap:'固定地图',
  floor:'楼层', floors:'层数', floorsApprox:'约层数', floorsEach:'每段层数', floorsPerArea:'每区层数', floorsPerStage:'每阶段层数', floorRanges:'楼层范围与等级',
  formations:'阵容', grantsBattleExperience:'有战斗经验', grantsSkillExperience:'有技能经验', groups:'分组', hasTreasureChests:'有宝箱', headerElements:'全体属性',
  hp:'生命', attack:'攻击', agility:'敏捷', mp:'魔力', recovery:'回复', spirit:'精神', hpApprox:'约生命值', inside:'内部区域', ingredients:'材料', instances:'实例', item:'道具', layout:'布局', level:'等级', levelsByServer:'分服务器等级',
  location:'地点', locations:'地点', map:'地图', mapSize:'地图尺寸', mapSizeRange:'地图尺寸范围', maxEncounter:'最多遭遇',
  maxEncounterCount:'最多遭遇数量', maxEnemies:'最多敌人数', maxEnemyCount:'最多敌人数', maximumEncounterCount:'最多遭遇数量',
  materials:'材料', maximumEnemyCount:'最多敌人数', maze:'迷宫', mazeCount:'迷宫数量', mazeEnemies:'迷宫魔物', mazeFloors:'迷宫层数', mentor:'导师',
  name:'名称', order:'顺序', enemies:'敌人', raw:'原攻略原文', role:'角色', type:'类型', npc:'NPC', cost:'费用', amount:'金额', unit:'单位', notes:'备注', objective:'目标', output:'获得结果', place:'地点', price:'价格', priceG:'价格（G）', purpose:'用途', quantity:'数量', race:'种族', randomDrop:'随机掉落', randomDrops:'随机掉落', randomMaze:'随机迷宫', rewardEvent:'奖励事件',
  rate:'概率', recipient:'获得者', recommendedCrystal:'建议水晶', recommendedCrystals:'建议水晶', refreshBehavior:'刷新规则',
  refreshHours:'刷新小时数', refreshHoursApprox:'约刷新小时数', refreshMinutesApprox:'约刷新分钟数', route:'路线', routes:'路线',
  sealAllowed:'允许封印', sealRestrictions:'封印限制', skill:'技能', skillExperience:'技能经验', skills:'技能', stages:'阶段', strategy:'打法', summary:'摘要',
  subject:'教授内容', support:'辅助控制', teacher:'导师', text:'内容', time:'时间', totalCount:'总数', tradeable:'可交易', trainingAccessWithoutQuest:'无需任务可进入练级点', treasureChestCount:'宝箱数量', treasureChests:'有宝箱', outputs:'获得结果', continues:'继续任务', endsQuest:'任务结束',
  trigger:'触发方式', value:'选择值', versions:'版本', warning:'警告', warnings:'警告', zones:'区域',
  consecutiveBattles:'连续战斗场数', battle:'所属战斗',
  minionCount:'小怪数量', summonCondition:'召唤条件', selfDestructCondition:'自爆条件', strategyNotes:'打法建议',
  playerTremorLv10:'玩家战栗袭心 Lv10', petTremorV:'宠物战栗袭心 V',
  optional:'可选', repeatable:'可重复', postCompletion:'完成后', alternateRoute:'替代路线', choices:'选择', server:'服务器',
  waitAfterPreviousStep:'上一步后等待', waitBeforeStep:'本步前等待', waitHours:'等待小时数', shortcut:'捷径', outcome:'结果',
  condition:'条件', conditional:'条件分支', closed:'已关闭', closedDate:'关闭日期', availability:'开放状态', sourceConflict:'来源冲突',
  sourceUncertainty:'来源不确定项', sourceAmbiguity:'来源歧义', sourceCorrection:'来源修正', sourceIncomplete:'来源未完整记录', sourceWording:'原攻略表述', normalizedMeaning:'归一化含义', reason:'判断依据',
  battleRef:'关联战斗', battleRefs:'关联战斗', rewardEventRef:'关联奖励', rewardEventRefs:'关联奖励', exchangeRecipe:'兑换配方',
  recipe:'配方', recipes:'配方', gathering:'采集', quiz:'问答', quizBank:'题库', shop:'商店', teachers:'导师', mentors:'导师',
  jobMentors:'职业导师', skillMentors:'技能导师', sites:'地点', serviceOptions:'服务选项', offers:'供应项目'
};

Object.assign(STRUCTURED_FIELD_LABELS, {
  boostItem:'加成道具', coordinateRange:'捕捉范围', coordinates:'捕捉坐标', costG:'价格（G）', currency:'货币', effect:'效果', effectPool:'随机效果池', entityType:'资料类型', equipped:'需要装备', exchange:'兑换', first:'第一种材料', flower:'获得花朵', guide:'参考攻略', holder:'持有者', hours:'小时', identification:'需要鉴定', input:'交出', mechanic:'战斗机制', method:'方式', minutes:'分钟', optimizationItem:'优化道具', percent:'概率（%）', pet:'宠物', probabilityTotal:'概率合计（%）', quest:'任务', reference:'参考任务', requirements:'所需条件', results:'结果', scope:'范围', second:'第二种材料', source:'来源', stack:'叠加数量',
  ordinaryEnemies:'普通敌人', rounds:'战斗轮次', roster:'敌方阵容', alternatives:'随机出现其一', consecutive:'连续进行', currentVersionLevelRanges:'当前版本等级范围',
  listedEnemyLevels:'原攻略列出的敌人等级', conditionText:'条件说明', elementsRaw:'原文属性', curseResistanceRaw:'原文抗咒说明',
  sourceAmbiguous:'原攻略表述有歧义', troubleshooting:'异常处理', rareEnemies:'稀有敌人', floorRecords:'分层记录',
  allowsIntermediateOutputThenInput:'允许中间产物继续作为材料', sequence:'顺序', levelRange:'等级范围', branch:'分支',
  levelDistributions:'等级分布', kind:'类型', overview:'概况', randomEncounter:'随机遭遇', sequenceCount:'连续场次数',
  turnPattern:'行动规律', clientDataGate:'客户端数据条件', referenceOnly:'仅供参考', weapon:'武器', alternateEnding:'另一结局',
  bugAffected:'受异常影响', unavailableOn:'不可用版本', requiredForCompletion:'完成任务必须', trainingRoute:'练级路线',
  formationRaw:'原文阵容', timing:'时机', modes:'模式', weakenedVariants:'弱化形态', servers:'服务器', mode:'模式',
  round:'场次', spawnNote:'出现说明', npcLocations:'NPC 位置', hpCost:'生命消耗', confirmationPoints:'确认点',
  lowMpBehavior:'低魔力时行为', poisonPossible:'可中毒', poisonDifficulty:'中毒难度', dodge:'闪躲', soloResult:'单人结果',
  multiResult:'多人结果', accuracyCorrection:'命中修正', criticalCorrection:'必杀修正', selection:'选择方式',
  repeatability:'可重复性', region:'区域', chainedBattles:'连续战斗', enemiesPerBattle:'每场敌人', tier:'档位',
  groupedRandomPool:'分组随机池', fixedSections:'固定区域', randomUnderground:'随机地下区域', confidence:'可信度',
  behavior:'行为', drainThresholds:'吸取阈值', continuous:'连续进行', skillLevel:'技能等级', sourceRoster:'原攻略阵容',
  detailedRoster:'详细阵容', nameConflicts:'名称冲突', index:'序号', stats:'数值', skillsUnlisted:'原攻略未列技能',
  zeroMpUsableSkills:'魔力为 0 时可用技能', noReward:'无奖励', locationArea:'所在区域',
  unverifiedFastCoordinate:'未核验快速坐标', perMemberDrop:'每名队员掉落', duplicateDropPrevention:'防止重复掉落',
  inventoryFullDoesNotPreventDuplicate:'物品栏满不阻止重复取得', requiredTitle:'所需称号', correctNpc:'正确 NPC', wrongNpc:'错误 NPC',
  partyMustDisband:'队伍必须解散', formation:'阵容', ailmentResistance:'状态抗性', sourceQuantityAmbiguous:'原攻略数量有歧义',
  allEnemiesActionCount:'全体敌人行动次数', noDropCondition:'不掉落条件', groupedAcquisition:'组合取得',
  sourceFollowupUnspecified:'原攻略未说明后续', step:'步骤', modifiers:'修正', inputSelection:'输入选择', counterRate:'反击率',
  abortsQuest:'终止任务', randomGroup:'随机组', failureResumeStep:'失败后恢复步骤', respawn:'刷新', sourceLimitation:'原攻略限制',
  pricePerSkillG:'每项技能价格（G）', strongStatusTeachers:'强力状态技能导师', resistanceBooks:'抗性技能书',
  terminatesWithoutReward:'无奖励结束', strategies:'打法', sourceHasEmptySkillToken:'原攻略存在空技能项', replenishment:'补充规则',
  version:'版本', randomRecipient:'随机获得者', position:'位置', selfDebuff:'自身负面效果', reward:'奖励',
  ambushImpossible:'无法偷袭', recommendedAction:'建议行动', multipleNpcs:'多个 NPC', companionsAllowed:'允许携带伙伴',
  choice:'选择', mpApprox:'约魔力值', accuracy:'命中', materialSources:'材料来源', group:'分组', attemptLimit:'尝试次数上限',
  requiresItem:'所需道具', dropExclusion:'掉落排除', orderIndependent:'顺序不限', rareEncounter:'稀有遭遇', acquisition:'获得方式',
  shadowCount:'影子数量', failureBattleRef:'失败战斗关联', failureBattle:'失败战斗', result:'结果', mutuallyExclusiveWith:'互斥项',
  randomSpecies:'随机种类', sealableSpecies:'可封印种类', routeItem:'路线道具', timingDecision:'时机选择',
  equipmentRefs:'装备资料关联', recipeRefs:'配方关联', appearance:'外观', carriesItem:'携带道具', stairs:'楼梯',
  challengeOptions:'挑战选项', difficultyModifier:'难度修正', resistances:'抗性', summoned:'召唤出现',
  sourceSaysSameStatsInTemple:'原攻略说明神殿内数值相同', floor3:'第 3 层', repeatableBattle:'可重复战斗',
  repeatableForReputation:'可重复取得声望', failureRoute:'失败路线', charmChange:'魅力变化', dailyAttemptLimit:'每日次数上限',
  solo:'单人', rewardPool:'奖励池', postActivity:'活动结束后', petMailAvailable:'可使用宠物邮件', petMail:'宠物邮件',
  petMailNote:'宠物邮件说明', companions:'同伴', suggestedCrystal:'建议水晶', versionNote:'版本说明', variantRule:'变体规则',
  failureItemLoss:'失败损失道具', variant:'变体', randomBoss:'随机首领', acquisitionMethodUnspecified:'原攻略未说明获得方式',
  partySensitive:'队伍状态相关', sourceConsumptionAmbiguous:'原攻略消耗说明有歧义', refreshHoursSource:'原攻略刷新小时',
  dailySchedule:'每日时段', alternate:'替代方案', abandonsRoute:'放弃当前路线', defense:'防御', minimumEnemyLevel:'最低敌人等级',
  randomLevel1Encounter:'随机遭遇 1 级宠物', battleCount:'战斗场数', durationApproxTurns:'约持续回合',
  rareLevel1:'可能出现 1 级魔物',
  bossesAttackEachOther:'首领互相攻击', actionCountPerEnemy:'每名敌人行动次数', repeatableAfterDiscard:'丢弃后可重做',
  randomNpcs:'随机 NPC', allResistances:'全抗性', postBattle:'战斗结束后', stage:'阶段',
  randomMazeAfterRouteStep:'路线步骤后的随机迷宫', randomMazeFloorsApprox:'随机迷宫约层数',
  randomSpecialEncounter:'随机特殊遭遇', sameAs:'与此相同', failureCondition:'失败条件', retry:'重试', escapeTrigger:'逃跑触发',
  refreshTimeHours:'刷新时间（小时）', refreshTimeApproximate:'刷新时间为约数', interaction:'交互', routeRole:'路线作用',
  halfMountainEncounter:'半山遭遇', formationNote:'阵容说明', experienceAvailableOnHighLevelServers:'高等级服务器可获经验',
  exchangeMap:'兑换表', note:'说明', curseResistance:'抗咒', repeatLimit:'重复上限', sourceLocationRaw:'原攻略地点原文',
  versionPools:'分版本池', petrifyResistance:'抗石化', abortsCurrentRun:'终止本次流程', randomMultiBattles:'随机多场战斗',
  resetEntryFloors:'重置入口层数', names:'名称', searchStrategyNotes:'搜索建议', startEffect:'开始效果', retryByEscape:'逃跑后重试',
  randomAppearance:'随机出现', clearType:'通关方式', followUpEncounter:'后续遭遇', key:'项目', heading:'标题', headings:'标题',
  resupply:'补给', sourceBoss:'原攻略首领名称', doesNotInterruptAutoBattle:'不会中断自动战斗', retryAfterDefeat:'战败后可重试',
  sleepResistance:'抗昏睡', repeatIntervalHours:'重复间隔（小时）', sourceNameVariant:'原攻略名称变体', petRecipes:'宠物配方',
  seedRecipes:'种子配方', combatModifiers:'战斗修正', damageNote:'伤害说明', mirrorWaterHeal:'镜水治疗量', bossSelection:'首领选择',
  members:'成员', duplicateSourceLines:'原攻略重复记录', resultUnspecified:'原攻略未说明结果', drySandExchangeResult:'干燥砂兑换结果',
  sequenceOrderRequired:'必须按顺序', colors:'颜色', requiredBook:'所需书籍', sourceQuest:'来源任务', statusResistance:'状态抗性',
  sourceValueWarning:'原攻略数值警告', branchChoice:'分支选择',
  design:'设计图', parts:'设计图部件', unitPrice:'单价（G）', resultPet:'改造结果宠物', skillSlots:'技能栏', growth:'成长档', totalGrowth:'总档', propertyText:'属性原文', additionalFacts:'其他资料', basePetRestriction:'基础宠物限制', sourceOmission:'原攻略未列明'
});

const STEP_RENDERED_FIELDS = new Set(['id','order','text','route','branch','notes','inputs','outputs','choices','quiz','commands','operations','branchGroups','afterOperations','battleRef','battleRefs','allowsIntermediateOutputThenInput','sourceLines','verification']);
const ENCOUNTER_RENDERED_FIELDS = new Set([
  'id','title','location','enemies','notes','sourceLines','verification','order','triggerStep',
  'level','levelRange','enemyLevel','enemyLevelApprox','count','enemyCount','skills','enemySkills'
]);
const BATTLE_RENDERED_FIELDS = new Set([
  'id','key','heading','headings','overview','title','name','enemies','rounds','randomOneOf','consecutiveBattles','strategy','strategyNotes','notes','sourceLines','verification','order','triggerStep'
]);
const BATTLE_PART_RENDERED_FIELDS = new Set([
  'id','title','name','enemies','strategy','strategies','notes','sourceLines','verification','order','triggerStep','headerElements'
]);
const ENEMY_RENDERED_FIELDS = new Set([
  'id','name','display','base','level','levelRange','levelApprox','count','hp','hpApprox','hpRaw','race','position','modifiers',
  'poisonResistance','petrifyResistance','elements','curseResistance','resistance','actions','actionCount','skills','sourceLines','verification','raw','role',
  'catalogEvidenceKeys','catalogSourceLines','_sourceDetails','battle'
]);

function structuredFieldLabel(key) {
  return STRUCTURED_FIELD_LABELS[key] || (/[^\x00-\x7F]/.test(key) ? key : '补充信息');
}

function structuredValueText(value, depth = 0) {
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value !== 'object') {
    const enumLabels = {
      'source-unspecified':'原攻略未提供', verified:'已核验', available:'开放', closed:'已关闭',
      resistant:'抗', 'not-resistant':'不抗', random:'随机', skill:'技能', pet:'宠物', enemy:'敌人', boss:'首领', 'random-minion':'随机小怪', 'party-leader':'队长',
      'battle-capture-opportunity':'战斗中可捕捉'
    };
    return enumLabels[value] || String(value);
  }
  if (value.min != null && Object.keys(value).every(key => ['min','max','approximate','unit'].includes(key))) {
    const range = `${value.min}${value.max != null && value.max !== value.min ? `～${value.max}` : ''}`;
    return `${value.approximate ? '约' : ''}${range}${value.unit || ''}`;
  }
  if (Array.isArray(value)) {
    return value.map(item => structuredValueText(item, depth + 1)).filter(Boolean).join('；');
  }
  const entries = Object.entries(value)
    .filter(([key, item]) => !['id','line','lines','sourceLines','strategySourceLines','verification','catalogEvidenceKeys','catalogSourceLines','battleRef','battleRefs','allowsIntermediateOutputThenInput'].includes(key) && item != null && item !== '')
    .map(([key, item]) => `${structuredFieldLabel(key)}：${structuredValueText(item, depth + 1)}`)
    .filter(text => !text.endsWith('：'));
  return depth > 1 ? entries.join('、') : entries.join('；');
}

function renderStructuredFields(source, excludedKeys = new Set(), title = '数据源补充') {
  if (!source || typeof source !== 'object') return '';
  const evidenceKeys = new Set(['id','line','lines','sourceLines','strategySourceLines','verification','catalogEvidenceKeys','catalogSourceLines','battleRef','battleRefs','allowsIntermediateOutputThenInput']);
  const entries = Object.entries(source).filter(([key, value]) => !excludedKeys.has(key) && !evidenceKeys.has(key) && value != null && value !== '');
  if (!entries.length) return '';
  return `<div class="structured-source-details"><b>${escapeHtml(title)}</b><dl>${entries.map(([key, value]) => {
    const text = structuredValueText(value);
    return text ? `<div data-source-field="${escapeHtml(key)}"><dt>${escapeHtml(structuredFieldLabel(key))}</dt><dd>${formatTaskText(text)}</dd></div>` : '';
  }).join('')}</dl></div>`;
}

function structuredUndocumentedBattleCount(record) {
  let count = 0;
  for (const version of Object.values(record?.versions || {})) {
    for (const tier of Object.values(version.tiers || {})) {
      for (const battle of Object.values(tier.battles || {})) {
        const directEnemies = structuredValues(battle.enemies);
        const roundEnemies = structuredValues(battle.rounds).flatMap(round => structuredValues(round?.enemies));
        const randomEnemies = structuredValues(battle.randomOneOf).flatMap(branch => structuredValues(Array.isArray(branch) ? branch : branch?.enemies));
        if (!directEnemies.length && !roundEnemies.length && !randomEnemies.length) count += 1;
      }
    }
  }
  return count;
}

function structuredBossSections(record) {
  if (!record) return [];
  const result = [];
  for (const version of Object.values(record.versions || {})) {
    for (const tier of Object.values(version.tiers || {})) {
      for (const encounter of structuredValues(tier.encounters)) {
        const encounterLevel = encounter.level ?? encounter.levelRange ?? encounter.enemyLevel ?? encounter.enemyLevelApprox;
        const encounterCount = encounter.count ?? encounter.enemyCount;
        const encounterSkills = encounter.skills ?? encounter.enemySkills ?? [];
        const enemies = structuredValues(encounter.enemies).map(enemy => {
          const entry = typeof enemy === 'object' ? enemy : {name:enemy};
          const displayName = entry.name || entry.display || entry.base || '敌人资料';
          const baseName = entry.display && entry.base && entry.display !== entry.base ? `（${entry.base}）` : '';
          return {
            ...entry,
            name: `${displayName}${baseName}`,
            level: entry.level ?? entry.levelRange ?? entry.levelApprox ?? encounterLevel,
            count: entry.count ?? encounterCount,
            hpApprox: entry.hpApprox ?? entry.hp ?? encounter.hpApprox ?? encounter.hp,
            race: entry.race ?? encounter.race,
            elements: entry.elements ?? encounter.elements,
            skills: entry.skills ?? encounterSkills,
            _sourceDetails: entry
          };
        });
        if (!enemies.length) continue;
        const floorLabel = encounter.floors ? `${String(encounter.floors).replace('-', '～')}层` : '';
        result.push({
          kind: '区域魔物',
          title: encounter.title || encounter.location || [floorLabel, encounter.randomMaze ? '随机迷宫' : '区域遭遇'].filter(Boolean).join(' · '),
          versionKey: version.key,
          tierKey: tier.key,
          order: encounter.order || 0,
          stepId: encounter.triggerStep || '',
          enemies,
          skills: '',
          strategy: [],
          notes: structuredTextList(encounter.notes),
          sourceDetails: encounter,
          renderedSourceFields: ENCOUNTER_RENDERED_FIELDS,
          sourceDetailGroups: [{source:encounter, renderedFields:ENCOUNTER_RENDERED_FIELDS}],
          sourceLines: encounter.sourceLines || []
        });
      }
      for (const battle of Object.values(tier.battles || {})) {
        const relatedChanges = (version.changes || []).filter(change => change.targetBattleOrder === battle.order);
        const commonNotes = [
          ...relatedChanges.flatMap(change => [change.text, ...structuredTextList(change.details)]),
          ...structuredTextList(battle.notes)
        ].filter(Boolean);
        const pushSection = ({ enemies, title, order, strategy, notes, sourceLines, stepId, sourceDetails = battle, renderedSourceFields = BATTLE_RENDERED_FIELDS }) => {
          const enemyEntries = structuredValues(enemies).map(enemy => typeof enemy === 'object' ? enemy : {name:String(enemy),skills:[]});
          if (!enemyEntries.length) return;
          result.push({
          kind: version.key === 'common' ? '关键战斗' : version.label,
          title: [tier.key === 'common' ? '' : tier.label, title].filter(Boolean).join(' · '),
          versionKey: version.key,
          tierKey: tier.key,
          order: order ?? battle.order,
          stepId: stepId || battle.triggerStep || '',
          enemies: enemyEntries,
          skills: '',
          strategy: structuredTextList(strategy ?? battle.strategy),
          notes: [...commonNotes, ...structuredTextList(notes)].filter(Boolean),
          sourceDetails,
          renderedSourceFields,
          sourceDetailGroups: sourceDetails === battle
            ? [{source:battle, renderedFields:BATTLE_RENDERED_FIELDS}]
            : [{source:battle, renderedFields:BATTLE_RENDERED_FIELDS}, {source:sourceDetails, renderedFields:renderedSourceFields}],
          sourceLines: sourceLines || battle.sourceLines || []
          });
        };

        const randomBranches = Object.entries(battle.randomOneOf || {});
        if (randomBranches.length) {
          randomBranches.forEach(([branchName, branch], branchIndex) => {
            const branchData = Array.isArray(branch) ? { enemies: branch } : branch;
            pushSection({
              enemies: branchData.enemies,
              title: [battle.title || battle.name, branchName].filter(Boolean).join(' · '),
              order: battle.order ?? branchIndex + 1,
              strategy: branchData.strategy ?? branchData.strategies,
              notes: branchData.notes,
              sourceLines: branchData.sourceLines,
              stepId: branchData.triggerStep,
              sourceDetails: branchData,
              renderedSourceFields: BATTLE_PART_RENDERED_FIELDS
            });
          });
          continue;
        }

        const consecutiveCount = Number(battle.consecutiveBattles || 0);
        const consecutiveEnemies = structuredValues(battle.enemies);
        if (consecutiveCount > 1 && consecutiveEnemies.some(enemy => Number(enemy?.battle) > 0)) {
          const baseTitle = battle.title || battle.name || '连续战斗';
          for (let battleNumber = 1; battleNumber <= consecutiveCount; battleNumber += 1) {
            pushSection({
              enemies: consecutiveEnemies.filter(enemy => Number(enemy?.battle) === battleNumber),
              title: `${baseTitle} · 第${battleNumber}场`,
              order: battle.order ?? battleNumber,
              strategy: battle.strategy ?? battle.strategyNotes,
              notes: [],
              sourceLines: battle.sourceLines,
              stepId: battle.triggerStep
            });
          }
          continue;
        }

        const rounds = structuredValues(battle.rounds);
        if (rounds.length) {
          const firstRoundEnemy = structuredValues(rounds[0]?.enemies)[0]?.name;
          const baseTitle = battle.title || battle.name || firstRoundEnemy || '连续战斗';
          rounds.forEach((round, roundIndex) => pushSection({
            enemies: round.enemies,
            title: `${baseTitle} · 第${round.order ?? roundIndex + 1}场`,
            order: round.order ?? battle.order,
            strategy: round.strategy ?? round.strategies,
            notes: [...structuredTextList(round.notes), ...(round.headerElements ? [`全体属性：${round.headerElements}`] : [])],
            sourceLines: round.sourceLines,
            stepId: round.triggerStep,
            sourceDetails: round,
            renderedSourceFields: BATTLE_PART_RENDERED_FIELDS
          }));
          continue;
        }

        const enemies = structuredValues(battle.enemies);
        const firstEnemyName = enemies[0]?.name;
        pushSection({
          enemies,
          title: battle.title || battle.name || firstEnemyName || '关键战斗',
          order: battle.order,
          strategy: battle.strategy ?? battle.strategyNotes,
          notes: [],
          sourceLines: battle.sourceLines,
          stepId: battle.triggerStep
        });
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
      const changeText = String(change.text ?? change.change ?? '').trim();
      const details = structuredTextList(change.details);
      const body = [changeText, ...details].filter(Boolean);
      if (!body.length) continue;
      rows.push(`<span><b>${escapeHtml(version.label)}${change.targetBattleOrder ? ` · 第${change.targetBattleOrder}关调整` : '调整'}</b>：${body.map(item => formatTaskText(item)).join('；')}</span>`);
    }
  }
  return rows.length ? `<div class="fight-facts version-change-list">${rows.join('')}</div>` : '';
}

function renderRewardKnowledge(rewardItem, displayedLabels = []) {
  const properties = {...(rewardItem.commonProperties || {}), ...(rewardItem.properties || {}), ...(rewardItem.appraisedProperties || {})};
  const raceChange = properties.raceChange;
  const raceChangeText = typeof raceChange === 'string'
    ? `种族变为${raceChange}`
    : raceChange?.to ? [`种族变为${raceChange.to}`, raceChange.scope].filter(Boolean).join('；') : '';
  const skillEffect = properties.skillEffect;
  const skillEffectText = typeof skillEffect === 'string' ? skillEffect
    : skillEffect?.skill && skillEffect.mpReductionPercent != null
      ? `${skillEffect.skill}耗魔减少${skillEffect.mpReductionPercent}%` : '';
  const knowledgeValue = value => {
    if (value == null) return '';
    if (['string', 'number', 'boolean'].includes(typeof value)) return String(value);
    if (Array.isArray(value) && value.every(item => ['string', 'number'].includes(typeof item))) return value.join('、');
    if (typeof value === 'object') return value.text || value.name || '';
    return '';
  };
  const formatStats = stats => Object.entries(stats || {}).map(([name, value]) => `${name}${typeof value === 'number' && value >= 0 ? '+' : ''}${formatRange(value)}`).join('、');
  const formatRange = value => value && typeof value === 'object' && value.min != null
    ? `${value.min}${value.max != null && value.max !== value.min ? `～${value.max}` : ''}`
    : value;
  const formatModifiers = modifiers => typeof modifiers === 'string'
    ? modifiers
    : Object.entries(modifiers || {}).map(([name, value]) => `${name}${typeof value === 'number' && value >= 0 ? '+' : ''}${formatRange(value)}`).join('、');
  const propertyText = key => (rewardItem.allPropertyFacts || []).find(row => row.key === key)?.text || knowledgeValue(properties[key]);
  const useEffect = propertyText('effect') || [
    typeof properties.hpRecovery === 'number' ? `使用后恢复生命值${properties.hpRecovery}点` : '',
    typeof properties.mpRecovery === 'number' ? `使用后恢复魔法值${properties.mpRecovery}点` : '',
    properties.skillExperienceIncrease?.amount != null
      ? `使用后${properties.skillExperienceIncrease.skill === '随机' ? '随机增加' : '增加'}技能经验值${properties.skillExperienceIncrease.amount}点`
      : ''
  ].filter(Boolean).join('；');
  const rows = [
    ['类别', knowledgeValue(properties.type)],
    ['等级', properties.level != null ? `Lv.${properties.level}` : ''],
    ['用途', knowledgeValue(properties.use)],
    ['使用效果', useEffect],
    ['获得结果', propertyText('result')],
    ['结果说明', knowledgeValue(properties.petDescription || properties.description)],
    ['属性数值', formatStats(properties.stats)],
    ['耐久', formatRange(properties.durability)],
    ['修正', formatModifiers(properties.modifiers)],
    ['技能经验', properties.skillExperience != null ? `+${properties.skillExperience}` : ''],
    ['每组叠加', properties.stackLimit != null ? `${properties.stackLimit} 个` : ''],
    ['交易', properties.tradeable === true ? '可交易' : properties.tradeable === false ? '不可交易' : ''],
    ['型号说明', knowledgeValue(properties.variants)],
    ['版本说明', knowledgeValue(properties.availabilityNote || properties.change)],
    ['装备称号', propertyText('equippedTitle')],
    ['种族变化', raceChangeText],
    ['技能效果', skillEffectText || propertyText('skillEffect')],
    ['装备限制', knowledgeValue(properties.equipRestriction)],
    ['参考任务', knowledgeValue(properties.referenceQuest)],
    ['核验说明', knowledgeValue(properties.verificationNote)]
  ].filter(([label, value]) => !displayedLabels.includes(label) && value !== '' && value != null);
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
  return `${rows.filter(([, value]) => value !== '' && value != null).length ? `<dl class="reward-fact-list">${rows.filter(([, value]) => value !== '' && value != null).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${formatTaskText(String(value))}</dd></div>`).join('')}</dl>` : ''}${renderPresentationFacts(rewardItem.presentationFacts, displayedLabels)}${optionHtml}${skillsHtml}${referencesHtml}`;
}

function renderVersionedRewards(record) {
  if (!record) return '';
  const useVersionAccordion = record.presentation?.rewardLayout === 'version-accordion';
  const semanticEvents = (record.rewardEvents || [])
    .map(rewardEvent => ({ ...rewardEvent, items: (rewardEvent.items || []).filter(rewardItem => rewardItem.role === 'valuable-result') }))
    .filter(rewardEvent => rewardEvent.items.length);
  if (!semanticEvents.length) return '';
  {
    const grouped = new Map();
    for (const rewardEvent of semanticEvents) {
      const groupKey = `${rewardEvent.version || 'common'}\u0000${rewardEvent.tier || 'common'}`;
      if (!grouped.has(groupKey)) grouped.set(groupKey, []);
      grouped.get(groupKey).push(rewardEvent);
    }
    const signedRange = value => {
      if (value == null) return '';
      if (typeof value === 'number') return `${value >= 0 ? '+' : ''}${value}`;
      if (typeof value === 'object' && value.min != null) {
        const signed = number => typeof number === 'number' ? `${number >= 0 ? '+' : ''}${number}` : String(number);
        return value.max != null && value.max !== value.min ? `${signed(value.min)}～${signed(value.max)}` : signed(value.min);
      }
      if (typeof value === 'object' && value.max != null) return `最高 ${value.max >= 0 ? '+' : ''}${value.max}`;
      return String(value);
    };
    const plainRange = value => {
      if (value == null) return '';
      if (typeof value === 'object' && value.min != null) return value.max != null && value.max !== value.min ? `${value.min}～${value.max}` : String(value.min);
      if (typeof value === 'object' && value.max != null) return `最高 ${value.max}`;
      return String(value);
    };
    const groups = [];
    for (const [groupKey, events] of grouped) {
      const [versionKey, tierKey] = groupKey.split('\u0000');
      const version = record.versions?.[versionKey];
      const tier = version?.tiers?.[tierKey];
      const periodicGroup = events.some(event => event.items.some(item => item.purchase && item.resultPet));
      const title = periodicGroup ? '历次上架记录' : [versionKey === 'common' ? '通用资料' : (version?.label || versionKey), tierKey === 'common' ? '' : (tier?.label || tierKey)].filter(Boolean).join(' · ');
      const eventLabelFor = rewardEvent => {
        const sourceStep = (record.flow?.steps || []).find(step => step.id === rewardEvent.step);
        const stepNumber = sourceStep?.order;
        if (sourceStep?.branch) return sourceStep.branch;
        if (stepNumber != null) return `流程第 ${stepNumber} 步`;
        return periodicGroup ? '周期上架' : rewardEvent.kind === 'battle-drop' ? '战斗掉落' : rewardEvent.kind === 'reward-pool' ? '随机奖池' : rewardEvent.kind === 'exchange-recipe' ? '兑换' : '明确记录';
      };
      const eventCountLabelFor = (rewardEvent, count) => {
        const selection = String(rewardEvent.selection || '');
        if (/^random-one(?:-|$)/.test(selection)) return `随机获得 1 项（奖池共 ${count} 项）`;
        if (['one-of-two', 'source-unspecified-one-of-two'].includes(selection)) return `获得其中 1 项（共 ${count} 项）`;
        if (['choose-one', 'player-choice-one'].includes(selection)) return `自选 1 项（共 ${count} 项）`;
        return `${count} 项道具`;
      };
      // 同一道具可同时来自首通、掉落和兑换。保留字段最完整的一份卡片，
      // 再把其他来源合并到该卡片，避免同名去重时反而丢掉兑换属性。
      const primaryItemByName = new Map();
      const sourceLabelsByName = new Map();
      const sourceItemsByName = new Map();
      if (!periodicGroup) {
        const itemScore = item => Object.keys(item.properties || {}).length * 2
          + Object.keys(item).length
          + (item.cost ? 20 : 0)
          + (item.variants?.length || 0) * 3
          + (item.pet || item.resultPet ? 10 : 0);
        events.forEach(rewardEvent => (rewardEvent.items || []).forEach(item => {
          const current = primaryItemByName.get(item.name);
          if (!current || itemScore(item) > itemScore(current)) primaryItemByName.set(item.name, item);
          const labels = sourceLabelsByName.get(item.name) || [];
          const sourceLabel = rewardEvent.kind === 'exchange-recipe' && item.cost?.item && item.cost?.quantity != null
            ? `${item.cost.quantity} 个${item.cost.item}兑换`
            : rewardEvent.kind === 'reward-pool' && item.firstClearOnly
              ? '首次通关随机获得'
              : eventLabelFor(rewardEvent);
          if (!labels.includes(sourceLabel)) labels.push(sourceLabel);
          sourceLabelsByName.set(item.name, labels);
          const sources = sourceItemsByName.get(item.name) || [];
          sources.push({label:sourceLabel,item,event:rewardEvent});
          sourceItemsByName.set(item.name, sources);
        }));
      }
      let renderedItemCount = 0;
      const cards = events.map(rewardEvent => {
        const eventLabel = eventLabelFor(rewardEvent);
        const eventItems = (rewardEvent.items || []).filter(rewardItem => {
          if (periodicGroup) return true;
          return primaryItemByName.get(rewardItem.name) === rewardItem;
        });
        if (!eventItems.length) return '';
        renderedItemCount += eventItems.length;
        const extraSourceGroups = new Map();
        for (const item of eventItems) {
          const extraSources = (sourceLabelsByName.get(item.name) || []).filter(label => label !== eventLabel);
          if (!extraSources.length) continue;
          const label = extraSources.join('；');
          if (!extraSourceGroups.has(label)) extraSourceGroups.set(label, []);
          extraSourceGroups.get(label).push(item.name);
        }
        const sharedSourceGroups = [...extraSourceGroups].filter(([, names]) => names.length > 1);
        const sharedSourceNames = new Set(sharedSourceGroups.flatMap(([, names]) => names));
        const extraSourcesHtml = sharedSourceGroups.length ? `<details class="reward-extra-sources"><summary>其他取得方式</summary>${sharedSourceGroups.map(([label, names]) => `<p>${names.map(name => formatTaskText(`【${name}】`)).join('、')}：${escapeHtml(label)}</p>`).join('')}</details>` : '';
        const compactItems = eventItems.every(item => !item.equipmentArchive && !item.variants && !item.pet && !item.resultPet && !item.properties?.petProfile && !item.properties?.resultPetProfile && !item.properties?.options && !item.properties?.skills && !item.contents && !item.result && !item.cost);
        const items = eventItems.map(rewardItem => {
          if (rewardItem.purchase && rewardItem.resultPet) {
            const purchase = rewardItem.purchase;
            const resultPet = rewardItem.resultPet;
            const offerMeta = [resultPet.race, resultPet.elements ? `属性 ${resultPet.elements}` : '', resultPet.skillSlots != null ? `技能栏 ${resultPet.skillSlots}` : '', resultPet.totalGrowth != null ? `总档 ${resultPet.totalGrowth}` : ''].filter(Boolean);
            const price = purchase.unitPrice != null ? `${Number(purchase.unitPrice).toLocaleString('zh-CN')}G${purchase.parts ? '／张' : ''}` : '原攻略未列价格';
            return `<section class="acquisition-item periodic-offer" data-reward-name="${escapeHtml(rewardItem.name)}" data-reward-version="${escapeHtml(versionKey)}" data-reward-tier="${escapeHtml(tierKey)}"><h4>${formatTaskText(`【${rewardItem.name}】`)}${rewardItem.date ? `<span>${escapeHtml(rewardItem.date)}</span>` : ''}</h4>
              <p class="offer-purchase"><b>上架规格</b> ${escapeHtml([purchase.parts, price].filter(Boolean).join(' · '))}</p>
              <p class="offer-result"><b>改造结果</b> ${formatTaskText(`【${resultPet.name}】`)}</p>
              ${offerMeta.length ? `<div class="enemy-meta reward-attributes">${offerMeta.map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div>` : ''}
              ${Array.isArray(resultPet.growth) && resultPet.growth.length >= 5 ? `<p><b>档位</b> ${resultPet.growth.map(value => escapeHtml(String(value))).join(' / ')}</p>` : ''}
              ${rewardItem.basePetRestriction ? `<p><b>底宠限制</b> ${escapeHtml(rewardItem.basePetRestriction)}</p>` : ''}
              ${rewardItem.additionalFacts?.length ? `<ul>${rewardItem.additionalFacts.map(note => `<li>${formatTaskText(note)}</li>`).join('')}</ul>` : ''}
              ${renderPresentationFacts(rewardItem.presentationFacts)}${renderPresentationFacts(rewardItem.presentationItemFacts)}
            </section>`;
          }
          const properties = {...(rewardItem.commonProperties || {}), ...(rewardItem.properties || {}), ...(rewardItem.appraisedProperties || {})};
          const equipmentArchiveHtml = renderRewardEquipmentArchive(rewardItem.equipmentArchive);
          const knowledgeHtml = renderRewardKnowledge(rewardItem, ['等级', '耐久', '交易', ...(rewardItem.use || rewardItem.useEffect || properties.useEffect || properties.use ? ['用途'] : [])]);
          const statLabels = [
            ['attack', '攻击'], ['defense', '防御'], ['agility', '敏捷'], ['spirit', '精神'],
            ['recovery', '回复'], ['critical', '必杀'], ['counter', '反击'], ['accuracy', '命中'],
            ['dodge', '闪躲'], ['evasion', '闪躲'], ['hp', '生命'], ['life', '生命'], ['mp', '魔力'], ['magic', '魔力'],
            ['magicAttack', '魔攻'], ['magicalAttack', '魔攻'], ['magicResistance', '抗魔'], ['charm', '魅力'], ['luck', '幸运'],
            ['poisonResistance', '抗毒'], ['sleepResistance', '抗睡眠'], ['petrifyResistance', '抗石化'],
            ['drunkResistance', '抗酒醉'], ['confusionResistance', '抗混乱'], ['forgetResistance', '抗遗忘']
          ];
          const seenStats = new Set();
          const attributes = [
            properties.level != null ? `等级 ${properties.level}` : '',
            properties.category ? `种类 ${properties.category}` : '',
            ...statLabels.map(([key, label]) => {
              if (properties[key] == null || seenStats.has(label)) return '';
              seenStats.add(label);
              return `${label} ${signedRange(properties[key])}`;
            }),
            properties.durability != null ? `耐久${typeof properties.durability === 'object' ? `约 ${properties.durability.min}～${properties.durability.max}` : ` ${properties.durability}`}` : ''
          ].filter(Boolean);
          const variants = Array.isArray(rewardItem.variants)
            ? rewardItem.variants
            : rewardItem.variants == null
              ? []
              : typeof rewardItem.variants === 'object'
                ? Object.values(rewardItem.variants)
                : [rewardItem.variants];
          const costHtml = rewardItem.cost?.item
            ? `<p><b>兑换需要</b> ${escapeHtml([
                rewardItem.cost.quantity != null ? `${rewardItem.cost.quantity} 个${rewardItem.cost.item}` : rewardItem.cost.item,
                rewardItem.cost.durability != null ? `消耗 ${rewardItem.cost.durability} 点耐久` : ''
              ].filter(Boolean).join(' · '))}</p>`
            : '';
          const resultChoices = rewardItem.result?.randomOneOf || rewardItem.randomOneOf || [];
          const contentsText = Array.isArray(rewardItem.contents)
            ? rewardItem.contents.map(entry => typeof entry === 'string' ? entry : `${entry.item || entry.name}${entry.quantity != null ? ` × ${entry.quantity}` : ''}`).join('、')
            : rewardItem.contents?.randomOneOf
              ? `随机一种：${rewardItem.contents.randomOneOf.join('、')}`
              : typeof rewardItem.contents === 'string' ? rewardItem.contents : '';
          const resultHtml = resultChoices.length
            ? `<p><b>随机获得</b> ${resultChoices.map(item => typeof item === 'string'
                ? formatTaskText(`【${item}】`)
                : `${formatTaskText(`【${item.item || item.name}】`)}${item.quantity != null ? ` × ${escapeHtml(plainRange(item.quantity))}` : ''}`
              ).join('、')}</p>`
            : contentsText ? `<p><b>内容</b> ${formatTaskText(contentsText)}</p>` : '';
          const useValue = rewardItem.use || rewardItem.useEffect || properties.useEffect || properties.use;
          const useText = typeof useValue === 'string'
            ? useValue
            : useValue?.skillSlotsFrom != null && useValue?.skillSlotsTo != null
              ? `技能栏从 ${useValue.skillSlotsFrom} 格扩充至 ${useValue.skillSlotsTo} 格`
              : useValue?.location
                ? [`在${useValue.location}使用`, useValue.additionalInput ? `另需${useValue.additionalInput}` : '', useValue.result ? `获得${useValue.result}` : ''].filter(Boolean).join('；')
                : useValue?.result
                  ? [useValue.with ? `配合${useValue.with}` : '', useValue.npc ? `交给${useValue.npc}` : '', `获得${useValue.result}`].filter(Boolean).join('；')
                  : '';
          const pet = rewardItem.pet || null;
          const elementNames = { earth:'地', water:'水', fire:'火', wind:'风' };
          const petElements = pet?.elements && typeof pet.elements === 'object'
            ? Object.entries(pet.elements).map(([key, value]) => `${elementNames[key] || key}${value}`).join('／')
            : pet?.elements;
          const petHtml = pet ? `<div class="reward-pet-result"><b>获得宠物</b><p>${[
            pet.race,
            petElements ? `属性 ${petElements}` : '',
            pet.skillSlots != null ? `技能栏 ${pet.skillSlots}` : '',
            Array.isArray(pet.growth) ? `档位 ${pet.growth.join(' / ')}` : ''
          ].filter(Boolean).map(value => escapeHtml(value)).join(' · ')}</p></div>` : '';
          const tradeable = rewardItem.tradeable ?? properties.stallTradeable ?? properties.tradeable;
          const rules = [
            tradeable === true ? '可交易' : tradeable === false ? '不可交易' : '',
            properties.variableStats || properties.statsVariable || properties.valuesVariable ? '数值浮动' : '',
            properties.droppedResult === '消失' || properties.disappearsWhenDropped ? '丢地消失' : ''
          ].filter(Boolean);
          const resolvedName = rewardItem.displayName || rewardItem.identifiedName || rewardItem.appraisalResult || rewardItem.identifiedAs || rewardItem.name;
          const displayName = typeof resolvedName === 'string' ? resolvedName : rewardItem.name;
          const unidentifiedName = rewardItem.unidentifiedName
            || (displayName !== rewardItem.name && /[?？]/.test(rewardItem.name) ? rewardItem.name : '');
          return `<section class="acquisition-item" data-reward-name="${escapeHtml(rewardItem.name)}" data-reward-version="${escapeHtml(versionKey)}" data-reward-tier="${escapeHtml(tierKey)}"><h4>${formatTaskText(`【${displayName}】`)}</h4>
            ${costHtml}
            ${rewardItem.quantity != null ? `<p><b>数量</b> ${escapeHtml(plainRange(rewardItem.quantity))}</p>` : ''}
            ${resultHtml}
            ${unidentifiedName ? `<p><b>未鉴定名称</b> ${formatTaskText(`【${unidentifiedName}】`)}</p>` : ''}
            ${useText ? `<p><b>用途</b> ${formatTaskText(String(useText))}</p>` : ''}
            ${petHtml}
            ${!sharedSourceNames.has(rewardItem.name) && (sourceLabelsByName.get(rewardItem.name) || []).length > 1 ? `<p class="reward-source-list"><b>取得方式</b> ${(sourceLabelsByName.get(rewardItem.name) || []).map(label => escapeHtml(label)).join('；')}</p>` : ''}
            ${attributes.length ? `<div class="enemy-meta reward-attributes">${attributes.map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div>` : ''}
            ${rules.length ? `<p class="reward-rule">${rules.map(rule => escapeHtml(rule)).join(' · ')}</p>` : ''}
            ${rewardItem.addedAt || rewardItem.valuesStatus ? `<p class="reward-rule">${[rewardItem.addedAt ? `${rewardItem.addedAt} 新增` : '', rewardItem.valuesStatus || ''].filter(Boolean).map(value => escapeHtml(value)).join(' · ')}</p>` : ''}
            ${knowledgeHtml}
            ${renderPresentationFacts(rewardItem.presentationItemFacts)}
            ${renderAlternateRewardFacts(rewardItem, sourceItemsByName.get(rewardItem.name))}
            ${equipmentArchiveHtml}
            ${properties.title ? `<p class="versioned-reward-title"><b>称号效果</b> ${escapeHtml(properties.title)}</p>` : ''}
            ${variants.length ? `<div class="versioned-reward-effects"><b>型号效果</b><ul>${variants.map(variant => {
              if (typeof variant === 'string') return `<li>${escapeHtml(variant)}</li>`;
              const variantProperties = { ...variant, ...(variant.properties || {}) };
              const skill = variant.effect?.skill || variant.skill || (Array.isArray(variant.skills) ? variant.skills.join('、') : '');
              const reduction = variant.effect?.mpCostReductionPercent
                ?? variant.effect?.manaCostReductionPercent
                ?? variant.mpCostReductionPercent
                ?? variant.mpReductionPercent;
              const change = variant.effect?.manaCostChangePercent;
              const elementText = variant.elements && typeof variant.elements === 'object'
                ? `属性 ${Object.entries(variant.elements).map(([name, value]) => `${name}${value}`).join('／')}`
                : '';
              const answers = Array.isArray(variant.answers) ? variant.answers.join('、') : variant.answers;
              const variantStats = [
                ...statLabels.map(([key, label]) => variantProperties[key] == null ? '' : `${label} ${signedRange(variantProperties[key])}`),
                variantProperties.durability != null ? `耐久 ${plainRange(variantProperties.durability)}` : '',
                variantProperties.logoutBehavior ? `登出${variantProperties.logoutBehavior}` : '',
                elementText,
                Array.isArray(variant.baseStats) ? `档位 ${variant.baseStats.join(' / ')}` : '',
                variant.destination ? `传送至${variant.destination}` : '',
                variant.quantity != null ? `数量 ${variant.quantity}` : '',
                answers ? `回答 ${answers}` : '',
                variant.equippedTitle ? `装备称号 ${variant.equippedTitle}` : ''
              ].filter(Boolean);
              const effectText = reduction != null
                ? `耗魔减少 ${reduction}%`
                : change != null
                  ? `耗魔 ${change >= 0 ? '+' : ''}${change}%`
                  : variant.effect?.text || variantStats.join('、');
              const variantLabel = variant.model || variant.name || '';
              const variantNote = variant.note || variant.officialBugCorrection || '';
              return `<li>${variantLabel ? `<strong>${escapeHtml(variantLabel)}</strong> ` : ''}${escapeHtml(skill)}${skill && effectText ? '：' : ''}${formatTaskText(effectText)}${variantNote ? `（${escapeHtml(variantNote)}）` : ''}</li>`;
            }).join('')}</ul></div>` : ''}
          </section>`;
        }).join('');
        return `<article class="acquisition-event-card"><header><div><span>${eventLabel}</span><b>${eventCountLabelFor(rewardEvent, rewardEvent.items.length)}</b></div></header>${renderPresentationFacts((rewardEvent.presentationFacts || []).map(row => ({...row,sourceEventId:rewardEvent.id})))}${extraSourcesHtml}<div class="acquisition-item-grid${compactItems ? ' compact-rewards' : ''}">${items}</div></article>`;
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
}

function renderQuest(quest, updateHash = true) {
  selectedQuestId = quest.id;
  input.value = quest.name;
  focusSnapshot = quest.name;
  editedSinceFocus = false;
  closeList();
  const series = quest.series ? QUEST_INDEX.filter(item => item.series === quest.series).sort((a,b) => a.order - b.order || a.name.localeCompare(b.name, 'zh-CN')) : [];
  const index = series.findIndex(item => item.id === quest.id);
  const requiredBy = QUEST_INDEX.filter(item => item.prerequisites.includes(quest.id));
  const seriesPrevious = quest.prerequisites.map(id => questById.get(id)).filter(item => item?.series === quest.series);
  const seriesNext = requiredBy.filter(item => item.series === quest.series);
  const structuredRecord = structuredQuestRecord(quest.id);
  const source = {name:`魔力百科｜${quest.name}`,url:structuredRecord.source.url};
  const guide = structuredGuide(structuredRecord);
  const keyItemsHtml = renderKeyItems(quest.id);
  const undocumentedBattleCount = structuredUndocumentedBattleCount(structuredRecord);
  const structuredVersionChanges = renderStructuredVersionChanges(structuredRecord);
  let bossSections = structuredBossSections(structuredRecord);
  // 同名标题只使用结构化敌人名称与等级消歧。
  const titleCount = {};
  bossSections.forEach(f => { titleCount[f.title] = (titleCount[f.title] || 0) + 1; });
  bossSections = bossSections.map(f => {
    if (titleCount[f.title] <= 1) return f;
    const firstEnemy = (f.enemies || [])[0] || {};
    const level = formatStructuredRange(firstEnemy.level ?? firstEnemy.levelRange ?? firstEnemy.levelApprox);
    return {...f, title: `${f.title}（${firstEnemy.name || '敌人'}${level ? `·Lv.${level}` : ''}）`};
  });
  const bossHtml = bossSections.map(fight => {
    const step = guide.steps.find(item => item.id === fight.stepId);
    const stepRef = step ? `对应第 ${step.order} 步` : '';
    const fightFacts = (fight.notes || []).map(note => String(note));
    const strategyItems = (fight.strategy || []).map(item => String(item ?? '').trim()).filter(Boolean);
    return `
    <article class="boss-fight">
      <div class="boss-heading"><span>${fight.kind}</span><h4>${formatTaskText(fight.title)}</h4>${stepRef ? `<em class="boss-step">${stepRef}</em>` : ''}</div>
      ${fight.sourceDetails?.heading ? `<p class="battle-origin">${formatTaskText(fight.sourceDetails.heading)}</p>` : ''}
      ${fight.sourceDetails?.overview?.text ? `<p class="battle-origin">${formatTaskText(fight.sourceDetails.overview.text)}</p>` : ''}
      ${fightFacts.length ? `<div class="battle-notes"><b>战斗说明</b><ul>${fightFacts.map(note => `<li>${formatTaskText(note)}</li>`).join('')}</ul></div>` : ''}
      ${(fight.sourceDetailGroups || [{source:fight.sourceDetails, renderedFields:fight.renderedSourceFields}]).map(group => renderStructuredFields(group.source, group.renderedFields, '区域／战斗补充资料')).join('')}
      <div class="enemy-list">${fight.enemies.map(renderEnemy).join('')}</div>
      ${strategyItems.length ? `<div class="strategy"><b>打法建议</b><ol>${strategyItems.map(item => `<li>${formatTaskText(item)}</li>`).join('')}</ol></div>` : ''}
    </article>`;
  }).join('');
  const chainHtml = series.length > 1 ? `
    <section class="chain-card">
      <div class="section-title"><span>系列任务</span><small>${quest.stageLabel ? `当前 ${quest.stageLabel}` : (quest.order ? `第 ${quest.order} 项` : `第 ${index + 1} 项`)} · 已收录 ${series.length} 项</small></div>
      <div class="chain-track">${series.map(item => `<button type="button" data-quest-id="${item.id}" class="chain-node ${item.id === quest.id ? 'current' : ''} ${item.optional ? 'optional' : ''}" title="${item.optional ? '支线／可选' : item.name}"><span>${item.stageLabel || item.order}</span><b>${item.name}</b><small>${item.prerequisites.length ? `前置 ${item.prerequisites.length} 项` : '未记录直接前置'}</small></button>`).join('')}</div>
      ${seriesPrevious.length || seriesNext.length ? `<div class="chain-neighbors">
        <div class="chain-direction"><b>直接前置</b><div class="chain-relation-list">${seriesPrevious.length ? seriesPrevious.map(item => relationButton(item.id, '← 前置')).join('') : '<div class="chain-edge">未记录本系列直接前置</div>'}</div></div>
        <div class="chain-direction"><b>直接后续</b><div class="chain-relation-list">${seriesNext.length ? seriesNext.map(item => relationButton(item.id, '后续 →')).join('') : '<div class="chain-edge">未记录本系列直接后续</div>'}</div></div>
      </div>` : '<p class="chain-hint">当前任务未记录本系列直接前后置。</p>'}
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
  detail.innerHTML = `
    <header class="detail-head">
      <div>
        <p class="eyebrow">${quest.series || quest.sourceCategory || quest.type || '独立任务'}</p>
        <h2>${quest.name}</h2>
        <p class="aliases">${quest.aliases.join(' · ')}</p>
      </div>
      <div class="detail-badges"><span>${quest.type}</span><span>${quest.level}</span><span>来源资料已整理</span></div>
    </header>
    ${quest.summary ? `<p class="summary">${formatTaskText(quest.summary)}</p>` : ''}
    ${chainHtml}
    ${otherPrerequisites.length || otherDownstream.length ? relationHtml : ''}
    ${trainingHtml ? `<div class="detail-tabs" role="tablist" aria-label="任务内容切换">
      <button type="button" class="active" role="tab" aria-selected="true" data-detail-tab="task">完整任务流程</button>
      <button type="button" role="tab" aria-selected="false" data-detail-tab="training">练级路线</button>
    </div><div data-detail-panel="task"><div class="task-flow-content">` : ''}
    <section class="guide-card">
      <div class="section-title"><span>任务内容</span><small>关键流程摘要</small></div>
      <div class="guide-layout">
        <div class="guide-meta">
          <div><span>起点</span><b>${formatTaskText(guide.start)}</b></div>
          ${guide.conditions.length ? `<div><span>条件</span><ul>${guide.conditions.map(item => `<li>${formatTaskText(item)}</li>`).join('')}</ul></div>` : ''}
        </div>
        ${renderQuestSteps(quest.id, guide.steps, trainingMarkers)}
      </div>
      ${guide.notes.length ? `<div class="quest-notes"><b>全局注意事项</b><div class="note-groups">${renderQuestNotes(guide.notes)}</div></div>` : ''}
    </section>
    ${keyItemsHtml}
    ${bossSections.length || structuredVersionChanges ? `<section class="boss-card">
      <div class="section-title"><span>战斗与区域魔物</span><small>${bossSections.length ? bossSectionSummary(quest.id, bossSections) : (undocumentedBattleCount ? '原攻略未单列' : '无首领战')}</small></div>
      ${structuredVersionChanges}
      <div class="boss-list">${bossHtml}</div>
    </section>` : ''}
    <section class="rewards-card">
      <div class="section-title"><span>道具获取与战斗掉落</span><small>获得方式、掉落与成果统一汇总</small></div>
      ${renderVersionedRewards(structuredRecord) || '<p class="none-note">原攻略未记录可核验的道具获取、战斗掉落或称号成果。</p>'}
    </section>
    <section class="source-card"><div><b>核验来源</b><p>正文以此处列出的核验来源为准；存在历史版本差异时，不混入当前流程。</p></div><a href="${source.url}" target="_blank" rel="noreferrer">${source.name} ↗</a></section>
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

document.querySelector('#recordCount').textContent = `${QUEST_INDEX.length} 个任务`;
const hashQuest = new URLSearchParams(location.hash.slice(1)).get('quest');
if (hashQuest && questById.has(hashQuest)) renderQuest(questById.get(hashQuest), false);
