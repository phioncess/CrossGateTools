import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(toolsDir, '..');
const sourceDir = path.join(projectDir, 'data-src');
const sourcePath = path.join(sourceDir, 'quests.json');
const outputPath = path.join(projectDir, 'quest-data.js');
const reportPath = path.join(projectDir, 'structured-data-report.json');

const clean = value => String(value ?? '')
  .replace(/\u200b/g, '')
  .replace(/\u00a0/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .trim();

const unique = values => [...new Set(values.filter(Boolean))];
const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));
function writeText(filename, content) {
  try {
    if (fs.existsSync(filename) && fs.readFileSync(filename, 'utf8') === content) return;
  } catch {
    // 文件可能正被同步程序短暂占用，交给下面的有限重试处理。
  }
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      fs.writeFileSync(filename, content, 'utf8');
      return;
    } catch (error) {
      if (!['EBUSY', 'EPERM', 'UNKNOWN'].includes(error.code) || attempt === 12) throw error;
      Atomics.wait(sleepBuffer, 0, 0, attempt * 50);
    }
  }
}
const cnNumber = value => {
  if (/^\d+$/.test(value)) return Number(value);
  const digits = {一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};
  if (value.length === 1) return digits[value] || null;
  if (value.startsWith('十')) return 10 + (digits[value[1]] || 0);
  if (value.endsWith('十')) return (digits[value[0]] || 0) * 10;
  if (value.includes('十')) return (digits[value[0]] || 0) * 10 + (digits[value[2]] || 0);
  return null;
};

function loadRuntime() {
  const html = fs.readFileSync(path.join(projectDir, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'https://local.test/', runScripts: 'outside-only' });
  const filenames = [
    'data.js', 'catalog.js', 'career-quests.js', 'enhancements.js',
    'generated-integrations.js', 'source-documents.js', 'normalize.js',
    'reward-catalog.js', 'structured-rewards.js'
  ];
  const scripts = filenames.map(filename => fs.readFileSync(path.join(projectDir, filename), 'utf8'));
  scripts.push(`globalThis.__STRUCTURE_INPUT__ = {
    quests: QUESTS,
    guides: QUEST_GUIDES,
    bosses: BOSS_GUIDES,
    rewards: REWARD_GUIDES,
    sources: SOURCES,
    catalogDetails: typeof CATALOG_DETAILS === 'undefined' ? {} : CATALOG_DETAILS
  };`);
  dom.window.eval(scripts.join('\n'));
  return JSON.parse(JSON.stringify(dom.window.__STRUCTURE_INPUT__));
}

function versionInfo(line) {
  const text = clean(line);
  // 年份只有出现在段首（可带“1阶/2阶”前缀）时才建立版本上下文。
  // 敌人血量、伤害区间和技能说明中的数字绝不能被当作年份。
  const headingPrefix = /^(?:[◆◇※]\s*)?(?:(?:[一二两12])\s*阶\s*[-—－]?\s*)?20\d{2}/;
  if (!headingPrefix.test(text)) return null;
  if (/(?:HP|血量|伤害|攻击|防御|敏捷|回复)\s*(?:约|≈|[：:])?\s*20\d{2}/i.test(text)) return null;
  const range = text.match(/(20\d{2})\s*(?:[／/~～至-]|年到)\s*(?:(20)?(\d{2,4}))/);
  if (range) {
    const end = range[3].length === 2 ? `${range[2] || range[1].slice(0, 2)}${range[3]}` : range[3];
    return { key: `${range[1]}-${end}`, label: `${range[1]}～${end}` };
  }
  const before = text.match(/(20\d{2})\s*(?:以及)?以前版本/);
  if (before) return { key: `through-${before[1]}`, label: `${before[1]}及以前` };
  const years = [...text.matchAll(/20\d{2}/g)].map(match => match[0]);
  if (!years.length) return null;
  const headingLike = text.length <= 30 || /版本|更新|调整|攻略|打法|奖品|奖励|BOSS|战斗/.test(text);
  if (!headingLike) return null;
  return { key: unique(years).join('-'), label: unique(years).join('／') };
}

function tierInfo(line) {
  const text = clean(line).replace(/^[◆◇※]\s*/, '');
  const match = text.match(/^(?:(?:20\d{2}(?:年|版)?)[-—－：:]?\s*)?([一二两12])\s*阶(?:\s*(?:[-—－：:]|$)|胜利后|部分)/)
    || text.match(/^(?:\d+[.、]\s*)?(?:BOSS|Boss|boss|奖品|奖励|战斗)(?:部分|调整)?[-—－：:]?\s*([一二两12])\s*阶/);
  if (!match) return null;
  const order = cnNumber(match[1]);
  return order ? { key: `tier-${order}`, label: `${order}阶`, order } : null;
}

function isSeparator(line) {
  return /^(?:[-=—－_·•*＊]){5,}$/.test(clean(line).replace(/\s+/g, ''));
}

function isSkillLine(line, previousType) {
  const text = clean(line);
  if (/^技能\s*[：:]?/.test(text)) return true;
  if (previousType !== 'skills') return false;
  if (/(?:名称|种族|属性)\s*[：:]?/i.test(text)
    || /(?:HP|血量)\s*(?:约|≈|[：:])?\s*\d{3,}(?!\s*%)/i.test(text)) return false;
  return /(?:攻击|防御|魔法|乾坤|诸刃|阳炎|圣盾|战栗|明镜|连击|反击|崩击|气功弹|大地之怒|召唤|暗杀|护卫|恢复|补血|吸血)/.test(text);
}

function parseSkillNames(line) {
  return unique(clean(line)
    .replace(/^技能\s*[：:]?\s*/, '')
    .replace(/^[、，,；;]+\s*/, '')
    .split(/[；;、，,]/)
    .map(clean));
}

function battleInfo(line) {
  const text = clean(line).replace(/^[◆◇※]\s*/, '');
  // 只把段首的“第 N 战/关”当标题；“两连战第一场”是说明，不能跳回并合并到 battle-1。
  const numbered = text.match(/^(?:20\d{2}\s*)?(?:战斗\s*)?第\s*([一二两三四五六七八九十\d]+)\s*(?:战|场|关)/);
  const explicit = /(?:BOSS|Boss|boss)?\s*(?:战斗信息|战斗资料|首领资料|BOSS数据)/.test(text);
  if (!numbered && !explicit) return null;
  const order = numbered ? cnNumber(numbered[1]) : null;
  const after = text
    .replace(/^.*?第\s*[一二两三四五六七八九十\d]+\s*(?:战|场|关)\s*(?:[—－-]+)?\s*/, '')
    .replace(/^.*?(?:战斗信息|战斗资料|首领资料|BOSS数据)\s*[：:]?\s*/, '')
    .replace(/^BOSS出自《[^》]+》(?:任务)?[，,]?\s*/, '')
    .replace(/[：:]$/, '')
    .trim();
  const title = /^(?:BOSS)?战斗信息/.test(after) ? '' : after;
  return { order, title: title || (order ? `第${order}战` : '战斗资料') };
}

function versionChangeInfo(line) {
  const text = clean(line);
  const marker = text.match(/^[⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽①②③④⑤⑥⑦⑧⑨⑩]\s*(.+)$/);
  if (!marker) return null;
  const target = marker[1].match(/第\s*(\d+)\s*关/)?.[1]
    || marker[1].match(/第\s*([一二两三四五六七八九十]+)\s*关/)?.[1];
  return { type: 'battle-adjustment', targetBattleOrder: target ? cnNumber(target) : null, text: marker[1] };
}

function isFalseStep(line) {
  return /^(?:\d+|[一二三四五六七八九十]+)[.、．]\s*(?:BOSS|Boss|boss|奖品|奖励|战斗|调整|版本|说明|攻略|打法)/.test(clean(line));
}

function stepInfo(line) {
  const text = clean(line);
  if (isFalseStep(text)) return null;
  const match = text.match(/^(?:步骤\s*)?[（(]?(\d{1,3})(?:[*＊]{1,2})?[）).、．]\s*(.*)$/)
    || text.match(/^([一二三四五六七八九十]{1,3})[、.．]\s*(.*)$/);
  if (!match) return null;
  return { order: cnNumber(match[1]), text: clean(match[2]) || text };
}

function headingType(line) {
  const text = clean(line).replace(/^[◆◇※]\s*/, '');
  if (/^(?:奖品|奖励)(?:说明|列表|内容|道具|部分|调整)?(?:[-—－].*)?[：:]?$/.test(text)
    || /^(?:20\d{2}(?:[\/～~]\d{2,4})?版)?(?:奖品|奖励)(?:说明|列表|内容|道具|部分|调整)?[：:]?$/.test(text)
    || /版(?:奖品|奖励)[：:]?$/.test(text)
    || /^(?:\d+|[一二三四五六七八九十]+)[.、．]\s*(?:奖品|奖励)/.test(text)) return 'rewards';
  if (/^(?:物品|道具)(?:说明|资料|属性|部分)[：:]?$/.test(text)) return 'items';
  if (/^(?:打法|攻略)(?:建议|参考)?[：:]?$/.test(text) || /(?:春节攻略|文字版)[：:]?$/.test(text)) return 'strategy';
  if (/^(?:视频|视频版|参考视频|视频攻略)[：:]?$/.test(text)) return 'media';
  if (/^(?:战斗|BOSS)(?:部分|资料|信息|数据)?/.test(text)
    || /^(?:\d+|[一二三四五六七八九十]+)[.、．]\s*BOSS/.test(text)) return 'battles';
  return null;
}

function itemNames(line) {
  return unique([...clean(line).matchAll(/【([^】]+)】/g)].map(match => clean(match[1])));
}

function parseAttributes(text) {
  const result = {};
  const all = text.match(/(?:属性[：:]?\s*)?全(?:属性)?\s*(\d{1,3})/);
  if (all) result.all = Number(all[1]);
  for (const [name, key] of [['地','earth'],['水','water'],['火','fire'],['风','wind']]) {
    const match = text.match(new RegExp(`${name}\\s*(\\d{1,3})`));
    if (match) result[key] = Number(match[1]);
  }
  return result;
}

function splitSkillListTopLevel(text, separators = new Set(['；', ';', '、', '，', ','])) {
  const parts = [];
  let current = '';
  let depth = 0;
  for (const character of String(text || '')) {
    if (character === '(' || character === '（' || character === '[' || character === '【') depth += 1;
    if (character === ')' || character === '）' || character === ']' || character === '】') depth = Math.max(0, depth - 1);
    if (depth === 0 && separators.has(character)) {
      const value = clean(current);
      if (value) parts.push(value);
      current = '';
    } else {
      current += character;
    }
  }
  const value = clean(current);
  if (value) parts.push(value);
  return parts;
}

function parseEnemy(line, sourceLine) {
  const raw = clean(line).replace(/；；/g, '；');
  const compactTable = raw.match(/^([^\d]{1,24}?)(\d{3,6})(全\d+|(?:地|水|火|风)\d+(?:(?:地|水|火|风)\d+)*)(邪魔系|人形系|不死系|飞行系|野兽系|龙系|植物系|昆虫系|特殊系|金属系|精灵系)(不抗|抗)?$/);
  const levelMatch = raw.match(/(?:等级\s*[：:]?\s*|[Ll][Vv]|[Vv])[.．]?\s*(\d+)(?:\s*[~～-]\s*(\d+))?/i);
  const hpMatch = raw.match(/(?:HP|血量)\s*(?:约|≈|[：:])?\s*(\d+)(?:\s*[~～-]\s*(\d+))?/i);
  const moveMatch = raw.match(/([一二两三四五六七八九十\d]+(?:\s*[~～-]\s*[一二两三四五六七八九十\d]+)?)\s*动/);
  const raceMatch = raw.match(/(邪魔系|人形系|不死系|飞行系|野兽系|龙系|植物系|昆虫系|特殊系|金属系|精灵系)/);
  const countMatch = raw.match(/[×xX*]\s*(\d+)/);
  const skillSplit = raw.split(/(?:[；;，,]\s*)?技能(?:[（(][^）)]*[）)])?[：:]/);
  const overview = skillSplit.shift() || raw;
  const skills = unique(splitSkillListTopLevel(skillSplit.join('；')));
  let name = overview
    .replace(/(?:[Ll][Vv]|[Vv])[.．]?\s*\d+(?:\s*[~～-]\s*\d+)?/ig, '')
    .replace(/(?:HP|血量)\s*(?:约|≈|[：:])?\s*\d+(?:\s*[~～-]\s*\d+)?/ig, '')
    .replace(/[（(]?[一二两三四五六七八九十\d]+(?:\s*[~～-]\s*[一二两三四五六七八九十\d]+)?\s*动[）)]?/g, '')
    .split(/[，,；;｜]/)[0]
    .replace(/^[：:\s]+|[：:\s]+$/g, '')
    .replace(/[×xX*]\s*\d+\s*$/, '')
    .trim();
  const labeledName = raw.match(/名称[：:]\s*([^；;，,]+)/)?.[1];
  if (labeledName) name = clean(labeledName);
  if (compactTable) name = clean(compactTable[1]);
  name = name.replace(/^第[一二两三四五六七八九十\d]+战\s*/, '').trim();
  const compactElements = compactTable ? parseAttributes(compactTable[3]) : null;
  return {
    id: '', name: name || '敌人资料',
    level: levelMatch ? { min: Number(levelMatch[1]), max: Number(levelMatch[2] || levelMatch[1]) } : null,
    hp: hpMatch ? { min: Number(hpMatch[1]), max: Number(hpMatch[2] || hpMatch[1]), approximate: /约|≈/.test(hpMatch[0]) }
      : compactTable ? { min:Number(compactTable[2]), max:Number(compactTable[2]), approximate:true } : null,
    count: countMatch ? Number(countMatch[1]) : 1,
    actions: moveMatch ? clean(moveMatch[1]).replace('两', '二') : null,
    race: raceMatch?.[1] || compactTable?.[4] || null,
    resistance: /不抗咒|不抗$/.test(raw) ? 'not-resistant' : /抗咒|抗$/.test(raw) ? 'resistant' : null,
    elements: compactElements || parseAttributes(raw), skills, raw, sourceLines: [sourceLine]
  };
}

function isEnemyLine(line, inBattle) {
  const text = clean(line);
  if (/^(?:备注|注|说明)\s*[：:]/.test(text)) return false;
  if (/双击获得\s*[Ll][Vv][.．]?\s*\d+/i.test(text)) return false;
  if (/(?:[Ll][Vv]|[Vv])[.．]?\s*\d+/i.test(text)) {
    if (inBattle) {
      return /^(?:[Ll][Vv]|[Vv])[.．]?\s*\d+/i.test(text)
        || /(?:HP|血量|种族|属性|邪魔系|人形系|不死系|飞行系|野兽系|\d+\s*动)/i.test(text);
    }
    // 战斗标题缺失时，仅凭“Lv.”不足以建立敌人；宠物奖励也包含等级、种族和属性。
    // 自动补建战斗必须同时出现血量与战斗技能/行动信息。
    return /(?:HP|血量)/i.test(text) && /(?:技能[：:]|\d动|抗咒|不抗咒)/.test(text);
  }
  if (!inBattle) return false;
  return /名称[：:].*(?:HP|血量)/.test(text)
    || /^[^\d]{1,24}?\d{3,6}(?:全\d+|(?:地|水|火|风)\d+)+(?:邪魔系|人形系|不死系|飞行系|野兽系|龙系|植物系|昆虫系|特殊系|金属系|精灵系)(?:不抗|抗)?$/.test(text);
}

function rewardKind(line) {
  if (/随机|概率|几率|机率|可能|掉落/.test(line)) return 'chance';
  if (/兑换|换得|换取/.test(line)) return 'exchange';
  return 'guaranteed';
}

function splitTopLevel(text, delimiter = '、') {
  const values = [];
  let current = '';
  let depth = 0;
  for (const char of text) {
    if ('（('.includes(char)) depth += 1;
    if ('）)'.includes(char)) depth = Math.max(0, depth - 1);
    if (char === delimiter && depth === 0) {
      if (clean(current)) values.push(clean(current));
      current = '';
    } else current += char;
  }
  if (clean(current)) values.push(clean(current));
  return values;
}

function cleanRewardName(value) {
  return clean(value)
    .replace(/^[◆◇※]\s*/, '')
    .replace(/^【|】$/g, '')
    .replace(/[（(].*$/, '')
    .replace(/(?:\*|[xX])?\d+(?:瓶|个|根|张|组|枚|份)$/, '')
    .replace(/[，,。；;：:！!]+$/, '')
    .trim();
}

function rewardNamesFromList(text) {
  return unique(splitTopLevel(text.replace(/[，,]\s*$/, ''))
    .map(cleanRewardName)
    .filter(name => name && name.length <= 40 && !/^(?:奖品|奖励|能力部分|耗魔变化部分|备注|说明)$/.test(name)));
}

function structureRewardRecords(rawRewards, tierNotes) {
  const records = [];
  let current = null;
  const addRecord = (entry, names, details = [], layout = 'item') => {
    current = {
      id: `reward-${records.length + 1}`,
      kind: entry.kind,
      items: unique(names),
      details: details.filter(Boolean),
      sourceLines: [...entry.sourceLines],
      layout
    };
    records.push(current);
    return current;
  };
  const append = (entry, details = [entry.text]) => {
    if (!current) {
      tierNotes.push({ type: 'reward-note', text: entry.text, sourceLines: entry.sourceLines });
      return;
    }
    current.details.push(...details.filter(Boolean));
    current.sourceLines = unique([...current.sourceLines, ...entry.sourceLines]);
  };

  for (const entry of rawRewards) {
    let text = clean(entry.text);
    if (!text || isSeparator(text)) continue;
    if (/^(?:\d+[.、]\s*)?(?:奖品|奖励)(?:调整|说明|列表|内容|道具|部分)?(?:[-—－].*)?[：:]?$/.test(text)
      || /^(?:目前收集到的奖品是这些|还有啥么？?|还有增加什么就不知道了。?)$/.test(text)) {
      tierNotes.push({ type: 'reward-note', text, sourceLines: entry.sourceLines });
      continue;
    }

    const tierInline = text.match(/^[一二两12]\s*阶\s*[：:]\s*(.+)$/);
    if (tierInline) text = clean(tierInline[1]);

    if (/^(?:①|②|③|④|⑤|⑴|⑵|⑶|⑷|⑸|⑹|⑺|⑻|⑼|⑽|称号|能力部分|耗魔变化部分|用以|目前可开出|（|\(|飞行系|总档次|好像|似乎)/.test(text)) {
      append(entry, [text]);
      continue;
    }

    const labeled = text.match(/^[◆◇※]?\s*(?:【([^】]+)】|([^（(：:]{2,50}))[：:]\s*(.*)$/);
    const label = cleanRewardName(labeled?.[1] || labeled?.[2] || '');
    if (labeled && label && !/^(?:能力部分|耗魔变化部分|备注|说明|奖品|奖励)$/.test(label)) {
      addRecord(entry, [label], labeled[3] ? [clean(labeled[3])] : []);
      continue;
    }

    const numbered = text.match(/^\d+[.、]\s*(.+)$/);
    if (numbered) {
      const numberedBody = numbered[1].replace(/[！!]{2,}.*$/, '').replace(/战斗完随机掉落.*$/, '');
      const name = cleanRewardName(numberedBody);
      const detail = clean(numbered[1].slice(name.length).replace(/^[：:]\s*/, ''));
      if (name) addRecord(entry, [name], detail && detail !== name ? [detail] : []);
      else append(entry);
      continue;
    }

    const chanceName = text.match(/(?:掉落|获得)\s*【?([^】，。；;]+?(?:精华|结晶|券|图|蛋))】?(?:[，。；;！!]|$)/)?.[1];
    if (chanceName) {
      addRecord(entry, [cleanRewardName(chanceName)], [text], 'drop');
      continue;
    }

    const dashed = text.match(/^(.{2,30}?)[-—－]{2,}(.+)$/);
    if (dashed) {
      if (/^精华$/.test(clean(dashed[1]))) {
        const names = rewardNamesFromList(dashed[2]);
        if (names.length) addRecord(entry, names, [text], 'list');
        else append(entry);
      } else addRecord(entry, [cleanRewardName(dashed[1])], [clean(dashed[2])]);
      continue;
    }

    const bracketNames = itemNames(text);
    if (bracketNames.length) {
      if (current && /^(?:目前可开出|双击获得|（|\()/.test(text)) append(entry);
      else addRecord(entry, bracketNames, [text]);
      continue;
    }

    const listNames = rewardNamesFromList(text);
    if (text.includes('、') && listNames.length > 1) {
      if (current?.layout === 'list' && entry.sourceLines[0] === Math.max(...current.sourceLines) + 1) {
        current.items = unique([...current.items, ...listNames]);
        current.details.push(text);
        current.sourceLines = unique([...current.sourceLines, ...entry.sourceLines]);
      } else addRecord(entry, listNames, [text], 'list');
      continue;
    }

    const simpleName = cleanRewardName(text.split(/\s{2,}/)[0]);
    if (simpleName && simpleName.length <= 36 && !/[。；;]/.test(simpleName)) addRecord(entry, [simpleName], simpleName === text ? [] : [text]);
    else append(entry);
  }
  return records.map(record => {
    const attributes = {};
    const effects = [];
    const descriptions = [];
    let title = null;
    for (const detail of record.details) {
      const level = detail.match(/等级\s*(\d+)/)?.[1];
      const category = detail.match(/种类[：:]\s*([^；;，,]+)/)?.[1];
      const attack = detail.match(/攻击\s*\+\s*(\d+)\s*[~～-]\s*\+?(\d+)/);
      const defense = detail.match(/防御\s*\+\s*(\d+)\s*[~～-]\s*\+?(\d+)/);
      const recovery = detail.match(/回复\s*\+\s*(\d+)\s*[~～-]\s*\+?(\d+)/);
      const durability = detail.match(/耐久(?:约)?\s*(\d+)\s*[~～-]\s*(\d+)/);
      const titleMatch = detail.match(/称号[“「『]([^”」』]+)[”」』]/);
      const variant = detail.match(/^[⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽]?\s*([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+)[：:]\s*(.+?)-\s*(\d+)%\s*(.*)$/);
      if (level) attributes.level = Number(level);
      if (category) attributes.category = clean(category);
      if (attack) attributes.attack = { min:Number(attack[1]), max:Number(attack[2]) };
      if (defense) attributes.defense = { min:Number(defense[1]), max:Number(defense[2]) };
      if (recovery) attributes.recovery = { min:Number(recovery[1]), max:Number(recovery[2]) };
      if (durability) attributes.durability = { min:Number(durability[1]), max:Number(durability[2]), approximate:true };
      if (titleMatch) title = clean(titleMatch[1]);
      if (variant) effects.push({ variant:variant[1], skill:clean(variant[2]), reductionPercent:Number(variant[3]), note:clean(variant[4]) || null });
      const parsed = level || category || attack || defense || recovery || durability || titleMatch || variant;
      if (!parsed) descriptions.push(detail);
      else if (/部分技能耗魔减少/.test(detail)) descriptions.push('部分技能耗魔减少约10%或15%');
    }
    return { ...record, attributes, title, effects, details: descriptions };
  });
}

function classifyQuest(quest, guide, legacyBosses, legacyRewards, rawDetail) {
  const sourceLines = rawDetail?.sourceLines?.length
    ? rawDetail.sourceLines.map(clean)
    : unique([...(guide.conditions || []), ...(guide.steps || []), ...(guide.notes || [])].flatMap(value => clean(value).split('\n')));
  const versions = {};
  const flowSteps = [];
  const commonNotes = [];
  const sections = [];
  const acquisitions = [];
  const inputs = [];
  let version = { key: 'common', label: '通用' };
  let tier = { key: 'common', label: '通用阶段', order: null };
  let section = 'general';
  let battle = null;
  let activeChange = null;
  let activeStep = null;
  let autoBattle = 0;

  const ensureVersion = value => versions[value.key] ||= { key: value.key, label: value.label, changes: [], tiers: {} };
  const ensureTier = () => {
    const versionNode = ensureVersion(version);
    return versionNode.tiers[tier.key] ||= { key: tier.key, label: tier.label, order: tier.order, battles: {}, rewards: [], notes: [], items: [], media: [] };
  };
  const beginBattle = (info, sourceLine, heading) => {
    const tierNode = ensureTier();
    const order = info.order || ++autoBattle;
    autoBattle = Math.max(autoBattle, order);
    const base = `battle-${order}`;
    if (info.order && tierNode.battles[base]) {
      battle = tierNode.battles[base];
      battle.headings ||= [];
      battle.headings.push({ text: heading, sourceLines: [sourceLine] });
      battle.sourceLines.push(sourceLine);
      if (/^第\d+战$|^战斗资料$/.test(battle.title) && info.title) battle.title = info.title;
      section = 'battles';
      activeStep = null;
      return;
    }
    let key = base;
    let suffix = 2;
    while (tierNode.battles[key]) key = `${base}-${suffix++}`;
    battle = tierNode.battles[key] = {
      id: `${version.key}:${tier.key}:${key}`,
      key, order, title: info.title || `第${order}战`, heading,
      headings: [{ text: heading, sourceLines: [sourceLine] }],
      enemies: {}, strategy: [], notes: [], sourceLines: [sourceLine]
    };
    section = 'battles';
    activeStep = null;
  };

  sourceLines.forEach((original, index) => {
    const line = clean(original);
    const sourceLine = index + 1;
    if (!line) return;
    const nextVersion = versionInfo(line);
    const nextTier = tierInfo(line);
    const nextBattle = battleInfo(line);
    const nextSection = headingType(line);
    const nextChange = version.key !== 'common' ? versionChangeInfo(line) : null;
    const rewardMarker = /(?:奖励|奖品)(?:说明|内容|道具)?[：:]|随机(?:掉落|获得)|有几率(?:掉落|获得)|概率(?:掉落|获得)|必定掉落|双击获得\s*[Ll][Vv][.．]?\s*\d+/i.test(line);

    if (nextVersion) {
      const versionChanged = nextVersion.key !== version.key;
      version = nextVersion;
      if (versionChanged) {
        tier = { key: 'common', label: '通用阶段', order: null };
        section = 'general';
      }
      ensureVersion(version);
      battle = null;
      activeChange = null;
      activeStep = null;
    }
    if (nextTier) {
      tier = nextTier;
      ensureTier();
      battle = null;
      activeChange = null;
      activeStep = null;
    }
    if (nextSection) {
      section = nextSection;
      if (nextSection !== 'battles') battle = null;
      activeStep = null;
    }
    if (nextChange) {
      activeChange = { id: `change-${ensureVersion(version).changes.length + 1}`, ...nextChange, details: [], sourceLines: [sourceLine] };
      ensureVersion(version).changes.push(activeChange);
      battle = null;
      section = 'battles';
      activeStep = null;
    }
    if (rewardMarker && !nextBattle) {
      section = 'rewards';
      battle = null;
      activeStep = null;
    }
    if (nextTier && section === 'rewards') {
      const inlineReward = clean(line.replace(/^.*?[一二两12]\s*阶\s*[：:]?\s*/, ''));
      if (inlineReward) {
        ensureTier().rewards.push({
          id: `reward-${ensureTier().rewards.length + 1}`,
          kind: rewardKind(line), text: line, items: itemNames(line), sourceLines: [sourceLine]
        });
      }
    }
    const extendsCurrentBattle = nextBattle && !nextBattle.order && battle && !Object.keys(battle.enemies).length;
    if (extendsCurrentBattle) {
      battle.sourceLines.push(sourceLine);
      if (nextBattle.title && nextBattle.title !== '战斗资料') battle.notes.push({ text: nextBattle.title, sourceLines: [sourceLine] });
      section = 'battles';
    } else if (nextBattle) {
      beginBattle(nextBattle, sourceLine, line);
      activeChange = null;
    }

    const segment = {
      line: sourceLine, text: line, version: version.key, tier: tier.key,
      type: nextBattle ? 'battle-heading' : nextChange ? 'version-change' : nextVersion ? 'version-heading' : nextTier ? 'tier-heading' : nextSection ? 'section-heading' : 'note'
    };

    if (!nextBattle && !nextChange && !nextVersion && !nextTier && !nextSection) {
      const step = stepInfo(line);
      const isRewardLine = rewardMarker;
      if (isRewardLine) {
        section = 'rewards';
        battle = null;
        activeStep = null;
      }
      if (isSeparator(line)) {
        segment.type = 'separator';
      } else if (step && version.key === 'common' && section === 'general') {
        activeStep = { id: `step-${step.order || flowSteps.length + 1}`, order: step.order || flowSteps.length + 1, text: step.text, sourceLines: [sourceLine], inputs: [], outputs: [], notes: [] };
        flowSteps.push(activeStep);
        battle = null;
        segment.type = 'step';
      } else if (/^(?:◆|◇)?\s*打法(?:建议|参考)?[：:]?/.test(line) || section === 'strategy') {
        const value = clean(line.replace(/^(?:◆|◇)?\s*打法(?:建议|参考)?[：:]?\s*/, ''));
        if (battle && value) battle.strategy.push({ text: value, sourceLines: [sourceLine] });
        else ensureTier().notes.push({ type: 'strategy', text: value || line, sourceLines: [sourceLine] });
        segment.type = 'strategy';
      } else if (activeChange && !battle && section === 'battles') {
        activeChange.details.push({ text: line, sourceLines: [sourceLine] });
        activeChange.sourceLines.push(sourceLine);
        segment.type = 'version-change-detail';
      } else if (battle && Object.keys(battle.enemies).length && isSkillLine(line, sections.at(-1)?.type)) {
        const enemy = Object.values(battle.enemies).at(-1);
        enemy.skills = unique([...enemy.skills, ...parseSkillNames(line)]);
        enemy.raw += `；${line}`;
        enemy.sourceLines.push(sourceLine);
        battle.sourceLines.push(sourceLine);
        segment.type = 'skills';
      } else if (isEnemyLine(line, section === 'battles')) {
        if (!battle) beginBattle({ order: null, title: '战斗资料' }, sourceLine, '由敌人资料建立');
        const enemy = parseEnemy(line, sourceLine);
        const duplicate = Object.values(battle.enemies).find(item => item.name === enemy.name
          && item.level?.min === enemy.level?.min && item.hp?.min === enemy.hp?.min && item.raw.replace(/\s+/g, '') === enemy.raw.replace(/\s+/g, ''));
        if (duplicate) {
          duplicate.skills = unique([...(duplicate.skills || []), ...(enemy.skills || [])]);
          duplicate.sourceLines = unique([...(duplicate.sourceLines || []), sourceLine]);
        } else {
          const enemyBase = `enemy-${Object.keys(battle.enemies).length + 1}`;
          enemy.id = `${battle.id}:${enemyBase}`;
          battle.enemies[enemyBase] = enemy;
        }
        battle.sourceLines.push(sourceLine);
        segment.type = 'enemy';
      } else if (section === 'rewards' || isRewardLine) {
        const entry = { id: `reward-${ensureTier().rewards.length + 1}`, kind: rewardKind(line), text: line, items: itemNames(line), sourceLines: [sourceLine] };
        ensureTier().rewards.push(entry);
        segment.type = 'reward';
      } else if (section === 'items' || /^【[^】]+】/.test(line)) {
        ensureTier().items.push({ text: line, items: itemNames(line), sourceLines: [sourceLine] });
        segment.type = 'item';
      } else if (section === 'media' || /^https?:\/\//.test(line) || /视频版/.test(line)) {
        ensureTier().media.push({ text: line, sourceLines: [sourceLine] });
        segment.type = 'media';
      } else if (battle) {
        battle.notes.push({ text: line, sourceLines: [sourceLine] });
        battle.sourceLines.push(sourceLine);
        segment.type = 'battle-note';
      } else if (activeStep && version.key === 'common') {
        activeStep.notes.push({ text: line, sourceLines: [sourceLine] });
        segment.type = 'step-note';
      } else if (version.key === 'common') {
        commonNotes.push({ text: line, sourceLines: [sourceLine] });
      } else {
        ensureTier().notes.push({ type: 'note', text: line, sourceLines: [sourceLine] });
      }
    }

    sections.push(segment);

    const names = itemNames(line);
    if (/交出|提交|消耗|需要|持有|准备/.test(line)) {
      names.forEach(name => inputs.push({ item: name, step: activeStep?.id || null, version: version.key, tier: tier.key, sourceLines: [sourceLine] }));
    }
    if (/获得|取得|领取|掉落|换得|换取|兑换得到|购买/.test(line)) {
      names.forEach(name => acquisitions.push({ item: name, kind: rewardKind(line), step: activeStep?.id || null, version: version.key, tier: tier.key, sourceLines: [sourceLine] }));
    }
  });

  for (const versionNode of Object.values(versions)) {
    for (const tierNode of Object.values(versionNode.tiers)) {
      tierNode.rewards = structureRewardRecords(tierNode.rewards, tierNode.notes);
    }
  }

  if (!flowSteps.length) {
    (guide.steps || []).forEach((text, index) => flowSteps.push({ id:`step-${index + 1}`, order:index + 1, text:clean(text), sourceLines:[], inputs:[], outputs:[], notes:[] }));
  }
  for (const step of flowSteps) {
    step.inputs = inputs.filter(item => item.step === step.id);
    step.outputs = acquisitions.filter(item => item.step === step.id);
  }

  return {
    schemaVersion: 1,
    id: quest.id,
    name: quest.name,
    aliases: quest.aliases || [],
    metadata: {
      category: quest.sourceCategory || quest.type || '', level: quest.level || '', availability: quest.availability || 'available',
      summary: quest.summary || '', repeatable: rawDetail?.info?.['可否重做'] || null
    },
    source: {
      key: quest.source || '', url: quest.sourceUrl || '',
      localFiles: ['data.js', 'catalog.js', 'enhancements.js', 'career-quests.js', 'reward-catalog.js', 'source-documents.js'],
      lineCount: sourceLines.length,
      rawLines: sourceLines.map((text, index) => ({ line:index + 1, text }))
    },
    relations: { prerequisites: quest.prerequisites || [] },
    requirements: { text: guide.conditions || [] },
    flow: { start: guide.start || flowSteps[0]?.text || '', steps: flowSteps, notes: commonNotes },
    versions,
    itemEvents: { inputs, acquisitions },
    segments: sections,
    legacy: { bosses: legacyBosses || [], rewards: legacyRewards || {guaranteed:[],chance:[],related:[]} }
  };
}

function validateQuest(record) {
  const errors = [];
  const sourceLineCount = record.source.rawLines.length;
  if (!record.id || !record.name) errors.push('missing identity');
  if (!record.flow.steps.length) errors.push('missing flow steps');
  if (record.segments.length !== sourceLineCount) errors.push('source line classification incomplete');
  const ids = new Set();
  for (const version of Object.values(record.versions)) {
    for (const tier of Object.values(version.tiers)) {
      for (const battle of Object.values(tier.battles)) {
        if (ids.has(battle.id)) errors.push(`duplicate battle id: ${battle.id}`);
        ids.add(battle.id);
        for (const enemy of Object.values(battle.enemies)) {
          if (!enemy.raw) errors.push(`enemy missing raw evidence: ${enemy.id}`);
        }
      }
    }
  }
  return errors;
}

if (fs.existsSync(sourcePath)) {
  const existingDatabase = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const curatedQuest = Object.values(existingDatabase.quests || {}).find(quest =>
    quest.schemaVersion > 1 || quest.verification?.method === 'manual-semantic-review'
  );
  if (curatedQuest) {
    const existingQuests = Object.values(existingDatabase.quests || {});
    const report = {
      schemaVersion: existingDatabase.schemaVersion,
      questCount: existingQuests.length,
      sourceLineCount: existingQuests.reduce((sum, quest) => sum + (quest.source?.rawLines?.length || 0), 0),
      segmentCount: existingQuests.reduce((sum, quest) => sum + (quest.segments?.length || 0), 0),
      versionedQuestCount: existingQuests.filter(quest => Object.keys(quest.versions || {}).some(key => key !== 'common')).length,
      battleCount: 0,
      enemyCount: 0,
      verifiedQuestCount: existingQuests.filter(quest => quest.verification?.status === 'verified').length,
      errors: []
    };
    for (const quest of existingQuests) for (const version of Object.values(quest.versions || {})) for (const tier of Object.values(version.tiers || {})) {
      report.battleCount += Object.keys(tier.battles || {}).length;
      report.enemyCount += Object.values(tier.battles || {}).reduce((sum, battle) => sum + Object.keys(battle.enemies || {}).length, 0);
    }
    writeText(outputPath, `// 自动生成：权威来源为 data-src/quests.json。\nglobalThis.QUEST_DATA = ${JSON.stringify(existingDatabase)};\n`);
    writeText(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ mode: 'publish-curated-data', sourcePath, outputPath, reportPath, ...report }, null, 2));
    process.exit(0);
  }
}

const runtime = loadRuntime();
fs.mkdirSync(sourceDir, { recursive: true });
const records = {};
const report = { schemaVersion: 1, questCount: 0, sourceLineCount: 0, segmentCount: 0, versionedQuestCount: 0, battleCount: 0, enemyCount: 0, errors: [] };

for (const quest of runtime.quests) {
  const guide = runtime.guides[quest.id] || { start:'', conditions:[], steps:[], notes:[] };
  const record = classifyQuest(quest, guide, runtime.bosses[quest.id], runtime.rewards[quest.id], runtime.catalogDetails[quest.id]);
  const errors = validateQuest(record);
  if (errors.length) report.errors.push({ id:quest.id, name:quest.name, errors });
  records[quest.id] = record;
  report.questCount += 1;
  report.sourceLineCount += record.source.rawLines.length;
  report.segmentCount += record.segments.length;
  if (Object.keys(record.versions).some(key => key !== 'common')) report.versionedQuestCount += 1;
  for (const version of Object.values(record.versions)) for (const tier of Object.values(version.tiers)) {
    report.battleCount += Object.keys(tier.battles).length;
    report.enemyCount += Object.values(tier.battles).reduce((sum, battle) => sum + Object.keys(battle.enemies).length, 0);
  }
}

const database = { schemaVersion: 1, quests: records };
writeText(sourcePath, `${JSON.stringify(database, null, 2)}\n`);
writeText(outputPath, `// 自动生成：权威来源为 data-src/quests.json。\nglobalThis.QUEST_DATA = ${JSON.stringify(database)};\n`);
writeText(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (report.errors.length) throw new Error(`结构化数据校验失败：${report.errors.length} 个任务存在问题`);
console.log(JSON.stringify({ sourcePath, outputPath, reportPath, ...report }, null, 2));
