// ============================================================
// 数据源归一化层
// 在 data.js / catalog.js 之后、渲染层之前执行一次：
//  1) 奖励池归一化——爬取来源的异构条目（整句步骤复制 / 编号 blob /
//     迷宫场景资料 / 站外参考残片）统一重整为规范三池（必得/概率/补充）
//  2) 备注归一化——剔除指向站外攻略的参考残片（BOSS打法：参考《…》/图文版）
//  3) 战斗块归一化——把爬取时被合并进同一 enemies 数组的多场战斗
//     （"本体+小怪群"循环结构 / 同名本体重复出现）拆回独立战斗
// 此后渲染层拿到的即为一类数据，无需再逐条打补丁
// ============================================================
(function normalizeDataSources() {
  const STEP_HEAD = /^[0-9]+\s*[.．、]/;
  // 编号子项拆分：仅当编号后紧跟【（真正的"道具清单"型 blob），避免拆散正文里的①②引用
  const NUMBERED_SPLIT = /(?=[⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑①②③④⑤⑥⑦⑧⑨⑩⑪⑫]\s*【)/;

  const isReferenceJunk = text => /^◆?◇?\s*BOSS打法[：:]/.test(text)
    || /^图文版$/.test(text)
    || /^参考《[^》]+》$/.test(text);

  const isSceneInfo = text => /(迷宫刷新时间|地图大小范围|宝箱数量|为随机迷宫|固定迷宫|遇敌固定数量)/.test(text);

  function expandEntries(value) {
    const text = String(value || '')
      .replace(/^掉落物品说明[：:]\s*/, '')
      .replace(/^物品说明[：:]\s*/, '')
      .trim();
    if (!text) return [];
    if (NUMBERED_SPLIT.test(text)) {
      return text.split(NUMBERED_SPLIT)
        .map(part => part.replace(/^[⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑①②③④⑤⑥⑦⑧⑨⑩⑪⑫]\s*/, '').trim())
        .filter(Boolean);
    }
    return [text];
  }

  // 从句子里提取"获得/掉落"类奖励项，返回 {guaranteed:[], chance:[]}
  function extractGains(sentence) {
    const out = {guaranteed: [], chance: []};
    const gainRe = /(?:(随机|一定几率|有几率|几率|概率)[的地]?\s*)?(?:获得|得到|取得|掉落|奖励)([^。；]{0,80})/g;
    for (const match of sentence.matchAll(gainRe)) {
      const random = Boolean(match[1]) || /^(随机|几率|概率)/.test(String(match[2] || '').trim());
      const body = String(match[2] || '').trim();
      if (!body || (!/[【称号]/.test(body) && !/^Lv/i.test(body))) continue;
      body.split(/[，,、]/).map(token => token.trim()
        .replace(/并?传送至?[^，。；]*$/, '')
        .replace(/任务完结$/, '')
        .trim()).filter(Boolean).forEach(token => {
        const isItem = /【[^】]+】/.test(token);
        const isTitle = token.startsWith('称号') || /^“[^”]+”/.test(token);
        const isLv = /^Lv/i.test(token);
        if (!isItem && !isTitle && !isLv) return;
        if (isTitle && !token.startsWith('称号')) token = `称号${token}`;
        (random ? out.chance : out.guaranteed).push(token);
      });
    }
    return out;
  }

  const itemNames = text => [...String(text || '').matchAll(/【([^】]+)】/g)]
    .map(match => match[1].trim())
    .filter(Boolean);

  function compactAcquisitionAction(value, itemName) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    // 数据源文字必须完整保留；不再为了卡片长度截断取得方式。
    return text;
  }

  function logicalStepSegments(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return [];
    const starts = [];
    const marker = /(^|[\s。；：）】])(\d{1,3})[.．、]\s*(?=[^\d\s])/g;
    for (const match of text.matchAll(marker)) starts.push(match.index + match[1].length);
    if (!starts.length) return [text];
    const parts = [];
    if (starts[0] > 0) parts.push(text.slice(0, starts[0]).trim());
    starts.forEach((start, index) => parts.push(text.slice(start, starts[index + 1] ?? text.length).trim()));
    return parts.filter(Boolean);
  }

  function gainEvents(value, fallbackKind = 'guaranteed', stepNumber = null) {
    const events = [];
    for (const segment of logicalStepSegments(value)) {
      if (/无法获得|不能获得|未获得/.test(segment)) continue;
      const verbs = [...segment.matchAll(/(?:随机\s*)?(?:获得|取得|得到|领取|兑换(?!的)(?:获得|得到)?|购买|掉落|鉴定后为)/g)];
      verbs.forEach((verb, index) => {
        const sentenceStart = Math.max(segment.lastIndexOf('。', verb.index - 1), segment.lastIndexOf('※', verb.index - 1)) + 1;
        const battleInfoAt = segment.indexOf('战斗信息', verb.index);
        const stops = [segment.indexOf('。', verb.index), segment.indexOf('※', verb.index), battleInfoAt, verbs[index + 1]?.index ?? -1]
          .filter(position => position >= 0);
        const clauseEnd = stops.length ? Math.min(...stops) : segment.length;
        const sentenceStops = [segment.indexOf('。', verb.index), segment.indexOf('※', verb.index)]
          .filter(position => position >= 0)
          .map(position => position + 1);
        if (battleInfoAt >= 0) sentenceStops.push(battleInfoAt);
        const sentenceEnd = sentenceStops.length ? Math.min(...sentenceStops) : segment.length;
        const clause = segment.slice(verb.index, clauseEnd);
        // “装备后获得称号/技能/资格”描述的是现有物品效果，不是新的道具取得事件。
        if (/^(?:随机\s*)?获得\s*(?:【\s*)?(?:称号|技能|资格)/.test(clause)) return;
        const names = [...new Set([...clause.matchAll(/【([^】]+)】/g)]
          .filter(match => !/^\s*所需/.test(clause.slice(match.index + match[0].length)))
          .map(match => match[1].trim())
          .filter(name => name && !/(?:称号|技能|资格)/.test(name)))];
        if (!names.length) return;
        const random = /随机|概率|几率|机率|掉落/.test(`${segment.slice(Math.max(0, verb.index - 28), verb.index)}${verb[0]}`);
        events.push({
          kind: random ? 'chance' : fallbackKind,
          action: compactAcquisitionAction(segment.slice(sentenceStart, sentenceEnd).trim(), names[0]),
          stepNumber,
          names
        });
      });
    }
    return events;
  }

  // 将奖励字符串解构为“同一次获得事件 -> 多个道具 -> 各道具说明”。
  // 页面只能消费这里产出的结构，不能再从展示字符串临时猜测或复制步骤。
  function cleanAcquisitionItemFact(value) {
    const raw = String(value || '').trim();
    const boundary = raw.search(/(?:BOSS(?:战|打法|数据)|本次战斗|第[一二三四五六七八九十]+场战斗|战斗信息|任务剧情|称号要求更新|变更记录|(?:购买图纸|行走|前往.+?)路线[：:]|支线[：:])/i);
    return (boundary > 0 ? raw.slice(0, boundary) : raw).trim().replace(/[◇◆※]+$/, '').trim();
  }

  function isAcquisitionItemFact(value) {
    const text = cleanAcquisitionItemFact(value);
    if (!text) return false;
    // 路线、场景和战斗数据属于任务流程/BOSS 区，不能因为它们紧跟在物品标题后就挂进物品属性卡。
    if (/^(?:获得方法|到达方法|行走路线|战斗信息)[：:]?/.test(text) || /到达方法[：:]?/.test(text)) return false;
    if (/^奖品[：:]?(?:（随机获得）)?$/.test(text)) return false;
    if (/^(?:到|前往)[^。；]{0,80}(?:领取|获得|得到)【?(?:奖品|奖励)】?/.test(text)) return false;
    if (/(?:随机迷宫|固定地图|迷宫约?\d+层|魔物[为：:]|血量约|\bHP\b|技能[：:]|\d+\s*动(?:，|,)|通过（?\d+[.，,]\d+）?处(?:楼梯|门)|进入[^。；]{0,24}迷宫)/i.test(text)) return false;
    if (/^[⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽]/.test(text) && /(?:前往|通过|进入|到达|传送|调查|对话)/.test(text)) return false;
    return true;
  }

  function structureAcquisitions(result, guide) {
    const poolLabels = {guaranteed:'明确获得', chance:'随机获得', related:'补充获取'};
    const steps = (guide.steps || []).map(value => String(value || '').trim()).filter(Boolean);
    const notes = (guide.notes || []).map(value => String(value || '').replace(/^◆\s*/, '').trim()).filter(Boolean);
    const candidates = steps.flatMap((step, stepIndex) => gainEvents(step, 'guaranteed', stepIndex + 1));
    for (const pool of ['guaranteed', 'chance', 'related']) {
      for (const entry of (result[pool] || [])) {
        const parsed = gainEvents(entry, pool);
        if (parsed.length) {
          candidates.push(...parsed);
          continue;
        }
        const names = [...new Set(itemNames(entry))];
        if (!names.length || /交出|提交|持有|需要|所需材料/.test(entry)) continue;
        const sourceEvent = candidates.find(event => names.some(name => event.names.includes(name)));
        if (!sourceEvent && pool === 'related') continue;
        const sourceStep = steps
          .filter(step => names.some(name => step.includes(`【${name}】`)) && /获得|取得|得到|领取|兑换|奖励|掉落|鉴定后/.test(step))
          .sort((a, b) => a.length - b.length)[0];
        candidates.push({kind:pool, action:sourceEvent?.action || compactAcquisitionAction(sourceStep || entry, names[0]), stepNumber:sourceEvent?.stepNumber || null, names});
      }
    }
    const knownNames = [...new Set(candidates.flatMap(event => event.names))];
    if (!knownNames.length) return [];

    const detailByName = new Map(knownNames.map(name => [name, []]));
    let activeNames = [];
    notes.forEach(note => {
      const header = note.match(/^【([^】]+)】[：:]?\s*(.*)$/);
      if (header) {
        activeNames = knownNames.filter(name => name === header[1].trim());
        const tail = header[2].trim();
        const fact = cleanAcquisitionItemFact(tail);
        if (fact && !/^路线[：:]?$/.test(fact) && activeNames.length && isAcquisitionItemFact(fact)) activeNames.forEach(name => detailByName.get(name).push(fact));
        return;
      }
      if (isReferenceJunk(note) || /^(?:任务剧情|其它攻略)[：:]/.test(note)) {
        activeNames = [];
        return;
      }
      if (/路线[：:]?$/.test(note) || /^【[^】]+】路线/.test(note)) {
        activeNames = [];
        return;
      }
      // 表头、版本标题和奖励分段会结束上一件物品的说明作用域；禁止把后续整张表挂到前一件道具下。
      if (/^(?:名称.*(?:所需|备注)|奖品(?:说明|兑换)|旧版|第[一二三四五六七八九十]+次[：:]?|\d{4}(?:(?:[.\/-]\d{1,2}){1,2}(?:日)?更新[：:]?|[-年]|版)|.*版本[：:]?|[^：:]{1,24}[：:])$/.test(note)) {
        activeNames = [];
        return;
      }
      const fact = cleanAcquisitionItemFact(note);
      if (activeNames.length && fact && !/获得|取得|领取|兑换|任务完结/.test(fact) && isAcquisitionItemFact(fact)) {
        activeNames.forEach(name => detailByName.get(name).push(fact));
      }
    });

    const groups = new Map();
    const rank = {related:0, guaranteed:1, chance:2};
    candidates.forEach(candidate => {
      const key = candidate.action.replace(/\s+/g, '');
      if (!groups.has(key)) groups.set(key, {kind:candidate.kind, label:poolLabels[candidate.kind], action:candidate.action, stepNumber:candidate.stepNumber || null, conditions:[], items:[]});
      const group = groups.get(key);
      if (!group.stepNumber && candidate.stepNumber) group.stepNumber = candidate.stepNumber;
      if ((rank[candidate.kind] ?? 0) > (rank[group.kind] ?? 0)) {
        group.kind = candidate.kind;
        group.label = poolLabels[candidate.kind];
      }
      candidate.names.forEach(name => {
        if (!group.items.some(item => item.name === name)) {
          const unresolved = /^(?:奖品|奖励|物品|道具)$/.test(name);
          group.items.push({name, unresolved, notes:[...new Set(detailByName.get(name) || [])]});
        }
      });
    });

    for (const group of groups.values()) {
      const factKey = value => String(value || '').replace(/[◆◇※\s，,。；;：:（）()~～*]/g, '');
      const actionBody = String(group.action || '')
        .replace(/^◆?\s*【[^】]+】\s*/, '')
        .replace(/^[：:]\s*/, '')
        .trim();
      group.items.forEach(item => {
        item._actionRepeatsFacts = !group.stepNumber && Boolean(actionBody) && (item.notes || []).some(note => {
          const actionKey = factKey(actionBody);
          const noteKey = factKey(note);
          return actionKey && noteKey && (actionKey === noteKey || actionKey.includes(noteKey) || noteKey.includes(actionKey));
        });
      });
      const actionRepeatsFacts = group.items.length > 0 && group.items.every(item => item._actionRepeatsFacts);
      // 原攻略的“【物品】：属性/用途”行只能作为物品资料，不能同时冒充额外取得来源。
      if (!group.stepNumber && actionRepeatsFacts) {
        group.action = '';
        group.label = '属性 / 用途';
      }
      group.items.forEach(item => {
        item.notes = (item.notes || []).filter(note => isAcquisitionItemFact(note));
      });
      const groupNames = group.items.map(item => item.name);
      notes.forEach(note => {
        if (!/无法领取|每日|重置|不可交易|可交易|丢地消失|每次|限/.test(note)) return;
        const tokens = itemNames(note);
        if (tokens.some(token => groupNames.includes(token) || groupNames.some(name => name.includes(token)))) {
          if (!group.conditions.includes(note)) group.conditions.push(note);
        }
      });
      group.items.forEach(item => {
        const marker = `【${item.name}】`;
        const usedAsTask = steps.some(step => {
          let at = -1;
          while ((at = step.indexOf(marker, at + 1)) >= 0) {
            const before = step.slice(Math.max(0, at - 70), at);
            const lastTaskVerb = Math.max(...['交出','提交','交给','交付','收走','回收','持有','携带','出示','凭','使用'].map(verb => before.lastIndexOf(verb)));
            const lastGainVerb = Math.max(...['获得','取得','得到','领取','购买','掉落','鉴定后为'].map(verb => before.lastIndexOf(verb)));
            if (lastTaskVerb >= 0 && lastTaskVerb > lastGainVerb) return true;
            const after = step.slice(at + marker.length, at + marker.length + 36);
            if (/^[^。；\n]{0,24}(?:交给|提交|交出|换取|兑换)/.test(after)) return true;
          }
          return false;
        });
        const documentedOutcome = item.notes.length > 0;
        const closesTask = /任务(?:完结|结束|完成)/.test(group.action);
        const isFinalStep = Number(group.stepNumber) === steps.length;
        item.role = usedAsTask || (!documentedOutcome && !closesTask && !isFinalStep) ? 'task' : 'reward';
      });
    }
    // 一个原始段落可能同时描述“用 A 兑换 B”和 A 的用途。将与动作重复的 A
    // 拆成独立物品资料，避免 B 的取得方式再次复制到 A 的属性框上。
    const structuredGroups = [];
    for (const group of groups.values()) {
      const detailItems = group.items.filter(item => item._actionRepeatsFacts);
      const sourceItems = group.items.filter(item => !item._actionRepeatsFacts);
      detailItems.forEach(item => { delete item._actionRepeatsFacts; });
      sourceItems.forEach(item => { delete item._actionRepeatsFacts; });
      if (detailItems.length && sourceItems.length) {
        structuredGroups.push({...group, items:sourceItems});
        structuredGroups.push({...group, action:'', stepNumber:null, label:'属性 / 用途', items:detailItems});
      } else {
        structuredGroups.push({...group, items:detailItems.length ? detailItems : sourceItems});
      }
    }
    return structuredGroups;
  }

  // ---------- 奖励池归一化 ----------
  for (const questId of Object.keys(REWARD_GUIDES)) {
    const raw = REWARD_GUIDES[questId] || {};
    const guide = QUEST_GUIDES[questId] || {steps: [], notes: []};
    const guideText = [...(guide.steps || []), ...(guide.notes || [])].join('\n');
    const result = {guaranteed: [], chance: [], related: []};
    const push = (pool, text) => {
      const clean = String(text || '').trim();
      if (!clean) return;
      const key = clean.replace(/\s+/g, '');
      const bucket = result[pool];
      if (bucket.some(item => item.replace(/\s+/g, '') === key)) return;
      bucket.push(clean);
    };
    for (const pool of ['guaranteed', 'chance', 'related']) {
      for (const entry of (raw[pool] || [])) {
        for (const segment of expandEntries(entry)) {
          if (isReferenceJunk(segment)) continue;
          // 整句步骤复制：从句中提取奖励项，原句不保留
          const isStepCopy = STEP_HEAD.test(segment)
            && guideText.includes(segment.slice(0, Math.min(24, segment.length)).replace(/\s+$/, ''));
          if (isStepCopy) {
            // 流程中取得的中间物品不等于奖励。只从明确的任务收尾句提取最终成果；
            // 其余道具由展示层的“道具流转”统一呈现。
            if (/任务完结|任务完成|获得称号|取得称号/.test(segment)) {
              const gains = extractGains(segment);
              gains.guaranteed.forEach(item => push('guaranteed', item));
              gains.chance.forEach(item => push('chance', item));
            }
            continue;
          }
          // 纯迷宫场景资料（无道具信息）：挪到补充说明，不再混入概率掉落
          if (isSceneInfo(segment) && !/【/.test(segment)) {
            push('related', segment);
            continue;
          }
          push(pool, segment);
        }
      }
    }
    // 同池去重：裸道具名与同名属性描述并存时，保留描述条目
    for (const pool of ['guaranteed', 'chance', 'related']) {
      const namesWithDesc = new Set(result[pool]
        .map(item => String(item).match(/^【([^】]+)】[^：:]*[：:]/)?.[1])
        .filter(Boolean));
      result[pool] = result[pool].filter(item => {
        const bare = String(item).match(/^【([^】]+)】/);
        return !(bare && namesWithDesc.has(bare[1]) && !String(item).includes('：'));
      });
    }
    // 兜底：三池皆空时，从任务步骤收尾提取奖励（称号/掉落/获得）
    if (!result.guaranteed.length && !result.chance.length && !result.related.length) {
      for (const step of [...(guide.steps || [])].reverse()) {
        if (!/任务完结|获得|掉落|奖励/.test(step)) continue;
        const gains = extractGains(step);
        gains.guaranteed.forEach(item => push('guaranteed', item));
        gains.chance.forEach(item => push('chance', item));
        if (result.guaranteed.length || result.chance.length) break;
      }
    }
    result.acquisitions = structureAcquisitions(result, guide);
    REWARD_GUIDES[questId] = result;
  }

  // ---------- 关键道具去向 ----------
  // 只使用已经结构化的获得事件与本地任务/练级资料建立引用，不在渲染层猜测关系。
  globalThis.KEY_ITEM_GUIDES = {};
  const compactUseText = value => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length <= 180 ? text : `${text.slice(0, 177)}…`;
  };
  const normalizedKey = value => String(value || '').replace(/[\s·・—_\-（）()《》【】\[\]\/]/g, '');
  const requirementFor = (guide, itemName) => {
    const marker = `【${itemName}】`;
    const lines = [...(guide.conditions || []), ...(guide.steps || []), ...(guide.notes || [])].map(String);
    return lines.find(line => {
      let at = -1;
      while ((at = line.indexOf(marker, at + 1)) >= 0) {
        const before = line.slice(Math.max(0, at - 75), at);
        const after = line.slice(at + marker.length, at + marker.length + 45);
        if (/(?:持有|携带|需要|需有|准备|交出|提交|交给|使用|双击|装备|凭|保留)[^。；\n]{0,55}$/.test(before) || /^(?:是|为|可用于|用于|才能|方可|进入|换取|兑换)/.test(after)) return true;
      }
      return false;
    }) || '';
  };

  QUESTS.forEach(sourceQuest => {
    const acquired = (REWARD_GUIDES[sourceQuest.id]?.acquisitions || []).flatMap(event =>
      event.items.map(item => ({name:item.name, stepNumber:event.stepNumber || null}))
    );
    const uniqueAcquired = [...new Map(acquired.map(item => [item.name, item])).values()]
      .filter(item => item.name && !/^(?:奖品|奖励|物品|道具)$/.test(item.name));
    const entries = [];
    uniqueAcquired.forEach(item => {
      const questUses = QUESTS.filter(target => target.id !== sourceQuest.id).map(target => {
        const targetGuide = QUEST_GUIDES[target.id] || {};
        const targetText = [...(targetGuide.conditions || []), ...(targetGuide.steps || []), ...(targetGuide.notes || [])].join('\n');
        const related = (target.prerequisites || []).includes(sourceQuest.id)
          || (sourceQuest.series && target.series === sourceQuest.series && Number(target.order) > Number(sourceQuest.order))
          || targetText.includes(`《${sourceQuest.name}》`);
        if (!related) return null;
        const text = requirementFor(targetGuide, item.name);
        return text ? {questId:target.id, questName:target.name, text:compactUseText(text)} : null;
      }).filter(Boolean);

      const routeNames = new Set();
      Object.entries(globalThis.TRAINING_ENTRY_TASKS || {}).forEach(([routeName, taskNames]) => {
        if ((taskNames || []).includes(sourceQuest.name)) routeNames.add(routeName);
      });
      (globalThis.TRAINING_ROUTES?.[sourceQuest.name] || []).forEach(route => routeNames.add(route.name));
      const trainingUsesRaw = [...routeNames].map(routeName => {
        const match = Object.entries(globalThis.TRAINING_ROUTE_DETAILS || {}).find(([detailName]) => {
          const a = normalizedKey(detailName);
          const b = normalizedKey(routeName);
          return a === b || a.includes(b) || b.includes(a);
        });
        const detail = match?.[1];
        if (!detail) return null;
        const text = [detail.firstTime, detail.repeat, detail.checkpoint].filter(Boolean).join(' ');
        if (!text.includes(`【${item.name}】`) || (!detail.quick && !detail.repeat)) return null;
        const repeatText = String(detail.repeat || detail.firstTime || '');
        const markerAt = repeatText.indexOf(`【${item.name}】`);
        const before = markerAt >= 0 ? repeatText.slice(Math.max(0, markerAt - 45), markerAt) : '';
        // 用途动词必须直接修饰当前道具；若中间已经出现另一个【道具】，不能借用前面的“持有/使用”关系。
        if (!/(?:持有|保留|携带|使用|双击)[^【】。；\n]{0,32}$/.test(before)) return null;
        return {routeName:match[0], text:compactUseText(repeatText)};
      }).filter(Boolean);
      const trainingUses = [...new Map(trainingUsesRaw.map(use => [normalizedKey(use.routeName), use])).values()];

      if (questUses.length || trainingUses.length) entries.push({...item, questUses, trainingUses});
    });
    if (entries.length) globalThis.KEY_ITEM_GUIDES[sourceQuest.id] = entries;
  });

  // ---------- 备注归一化 ----------
  for (const questId of Object.keys(QUEST_GUIDES)) {
    const guide = QUEST_GUIDES[questId];
    if (!guide || !Array.isArray(guide.notes)) continue;
    const bossText = JSON.stringify(BOSS_GUIDES[questId] || []);
    guide.notes = guide.notes.filter(note => {
      const text = String(note).trim();
      if (isReferenceJunk(text)) return false;
      // BOSS 原始行已进入结构化战斗卡，不再在“补充说明”重复一次。
      if (/^(?:[Ll][Vv]|[Vv])[.．]?\s*\d+/.test(text) && bossText.includes(text.slice(0, Math.min(34, text.length)))) return false;
      return true;
    });
  }

  // ---------- 战斗块归一化：拆分被合并的多场战斗 ----------
  // 爬取源把连续的多场战斗压进一个 enemies 数组，特征结构：
  //   战斗 = 本体(完整敌人段，无群体系数) + 技能残片 + 小怪群(带 ×N/*N) + 残片
  // 拆分信号（三者其一）：
  //   A. 出现新"本体"，且当前段已同时具备 本体+小怪群 → 新战斗开始
  //   B. 同名敌人再次出现（含括号限定名；阿鲁巴斯分场、凯特普通/困难两版等）
  //   C. 独立标签行（"训练设施 第N层（坐标）…"、"伊姆尔森林（①）魔物："）
  // 尾段不含小怪群且由信号A产生时并回上一段（迷宫杂兵/场景资料不是新战斗）；
  // 不含任何完整敌人段的段也并回上一段（纯标签尾行）
  const SPLIT_SKIP_QUESTS = new Set([
    'catalog-ea811a83-8f76-4186-b1dc-73494b57061c', // 六曜之塔：渲染层按层定制切版
    'catalog-5a3faf19-bfba-4bfa-8d5e-8ae55bb50537'  // 风鸣之塔：按块序定制版式
  ]);

  function combatEntryInfo(text) {
    const s = String(text || '').trim();
    const lv = s.match(/^(?:[Ll][Vv]|[Vv])[.．]?\s*\d+(?:\s*[~～-]\s*\d+)?/);
    if (!lv) return null;                       // 无等级开头 → 残片/标签
    const rest = s.slice(lv[0].length);
    const head = rest.split(/[，,；;｜]/)[0].trim();
    if (!head || /^[（(]/.test(head)) return null; // "Lv.8、火焰魔法"类技能残片
    const preSkill = s.split(/技能[:：]/)[0];
    const isFull = /(?:血量约|HP约|HP≈|HP：|血量：|\d\s*动|邪魔系|属性)/.test(preSkill);
    if (!isFull) return null;                   // 无战斗参数 → 残片
    const kind = /[×*]\s*(?:\d+|∞)/.test(head) ? 'minion' : 'leader';
    const name = head.replace(/\s*[×*]\s*(?:\d+|∞)\s*$/, '').trim();
    return {kind, name};
  }

  // 独立标签行：短、无标点杂讯、带坐标或以冒号收尾（如"训练设施 第1层（33.21）中间试验官"）
  function labelEntry(text) {
    const s = String(text || '').trim();
    if (!s || s.length > 30 || /[，,；;◇]/.test(s) || /技能|魔法|攻击|刷新/.test(s)) return null;
    if (/^[（(][^）)]*[）)]$/.test(s)) return null;
    const ok = /[（(]\s*\d{1,3}\s*[.，,]\s*\d{1,3}\s*[）)]/.test(s) || /[：:]$/.test(s);
    return ok ? s.replace(/[：:]$/, '').trim() : null;
  }

  function splitMergedFights(block) {
    const enemies = (block.enemies || []).map(e => String(e || '').trim()).filter(Boolean);
    const segments = [];
    let cur = [];
    let hasLeader = false;
    let hasMinion = false;
    let mazeAfterMinion = false; // 迷宫场景资料出现在小怪群之后：其后"本体"是迷宫杂兵，不是新战斗
    let nextReason = '';
    const seenNames = new Set();
    const seenLeaders = new Set();
    const close = () => {
      segments.push({entries: cur, reason: nextReason});
      cur = [];
      hasLeader = hasMinion = false;
      mazeAfterMinion = false;
      seenNames.clear();
      seenLeaders.clear();
    };
    enemies.forEach(entry => {
      const info = combatEntryInfo(entry);
      const label = !info && labelEntry(entry);
      if (label && cur.length) { close(); nextReason = 'label'; }
      else if (info) {
        const patternSplit = info.kind === 'leader' && hasLeader && hasMinion && !mazeAfterMinion;
        // 同名去重只认"本体跟本体重复"：本体+同名小怪群是同一场（疯狂的鸟人+鸟人×4）
        const dupSplit = info.kind === 'leader' && seenLeaders.has(info.name);
        if (cur.length && (patternSplit || dupSplit)) { close(); nextReason = patternSplit ? 'pattern' : 'dup'; }
      }
      cur.push(entry);
      if (info) {
        if (info.kind === 'leader') { hasLeader = true; seenLeaders.add(info.name); }
        else hasMinion = true;
        seenNames.add(info.name);
      } else if (hasMinion && /为随机迷宫|迷宫刷新时间|地图大小范围|宝箱数量/.test(entry)) {
        mazeAfterMinion = true;
      }
    });
    if (cur.length) segments.push({entries: cur, reason: nextReason});
    const segHasEnemy = seg => seg.entries.some(e => Boolean(combatEntryInfo(e)));
    // 并回上一段：纯标签/残片段（无完整敌人）；
    // 以及"标签+单一小怪群"段（"召唤的分身：""喽啰："是上一场战斗的补充说明）
    while (segments.length > 1) {
      const last = segments[segments.length - 1];
      const minions = last.entries.map(combatEntryInfo).filter(x => x && x.kind === 'minion');
      const isAddendum = last.reason === 'label' && !minions.some(x => x.kind === 'leader')
        && new Set(minions.map(x => x.name)).size === 1;
      if (!segHasEnemy(last) || isAddendum) {
        segments.pop();
        segments[segments.length - 1].entries.push(...last.entries);
        continue;
      }
      break;
    }
    if (segments.length <= 1) return [block];
    const cleanTitle = String(block.title || '')
      .replace(/[（(]怀旧服[^）)]*[）)]/g, '')
      .replace(/(?:处)?对话(?:进入|战斗|开战)?$/, '')
      .replace(/关键战斗$/, '')
      .trim();
    return segments.map(seg => {
      const label = labelEntry(seg.entries[0]);
      if (label) return {...block, title: label, _stepTitle: block.title, enemies: seg.entries};
      const head = seg.entries.map(combatEntryInfo).find(Boolean);
      const name = head ? head.name : '';
      const title = name && !cleanTitle.includes(name) ? (cleanTitle ? `${cleanTitle}·${name}` : name) : (cleanTitle || name);
      return {...block, title, _stepTitle: block.title, enemies: seg.entries};
    });
  }

  for (const questId of Object.keys(BOSS_GUIDES)) {
    if (SPLIT_SKIP_QUESTS.has(questId)) continue;
    const blocks = BOSS_GUIDES[questId];
    if (!Array.isArray(blocks)) continue;
    BOSS_GUIDES[questId] = blocks.flatMap(block => block && Array.isArray(block.enemies) ? splitMergedFights(block) : [block]);
  }
})();

// 已核对原攻略位置：地下遗迹资料属于进入遗迹后的第2步，而非前往入口的第1步。
(function correctFinalTruthSourcePlacement() {
  const id = 'catalog-2f3e3775-65b3-409d-ae83-f76408f035e1';
  const source = typeof SOURCE_DOCUMENTS === 'undefined' ? null : SOURCE_DOCUMENTS[id];
  if (!source) return;
  (source.areas || []).forEach(area => {
    if (/地下遗迹/.test(area.text)) area.afterStep = 2;
  });
  (source.images || []).forEach(image => {
    if (/最后的真相 路线图/.test(image.caption)) image.caption = '地下遗迹行走路线';
  });
})();

// 一部分早期任务正文经过人工压缩重排，原网页的段落编号不能直接作为新版步骤号。
// 这里按实际“进入区域/开始行走”的步骤重新挂载区域资料与路线图，避免全部堆到文末。
(function correctCondensedQuestSourcePlacement() {
  if (typeof SOURCE_DOCUMENTS === 'undefined') return;
  const setArea = (id, matcher, afterStep) => {
    (SOURCE_DOCUMENTS[id]?.areas || []).forEach(area => {
      if (matcher.test(String(area.text))) area.afterStep = afterStep;
    });
  };
  const setImages = (id, afterStep, caption) => {
    (SOURCE_DOCUMENTS[id]?.images || []).forEach(image => {
      image.afterStep = afterStep;
      if (caption) image.caption = caption;
    });
  };

  setArea('half-2', /随机迷宫内魔物/, 4);
  setArea('half-3', /小岛为固定地图/, 3);
  setArea('half-3', /通往山顶的路|半山腰为固定地图/, 4);
  setArea('half-4', /通往山顶的路|两年前的半山腰/, 2);
  setArea('half-6', /通往地狱的道路/, 3);
  setArea('half-8', /通往地狱的道路/, 2);
  setArea('half-8', /冥界（表）/, 5);
  setImages('half-8', 6, '冥界之塔行走路线');
  setArea('half-9', /游荡之魂/, 1);
  setImages('dog-3', 4, '海贼洞窟行走路线');
  setArea('dog-4', /地狱妖犬的巢穴/, 4);
  setImages('catalog-620b83c8-bfc0-4017-a6ae-8515d59748bd', 1, '前往又小又暗的洞窟路线');
})();
