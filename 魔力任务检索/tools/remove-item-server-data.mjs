import fs from 'node:fs';
import path from 'node:path';
import { questRecordsDir } from './quest-database.mjs';

const ITEM_SERVER = '道具服';

function isItemServerOnly(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.server === ITEM_SERVER || value.version === ITEM_SERVER) return true;
  for (const key of ['servers', 'serverScope']) {
    if (Array.isArray(value[key]) && value[key].length > 0 && value[key].every(server => server === ITEM_SERVER)) return true;
  }
  const text = String(value.text || '').trim();
  return /^(?:仅)?道具服(?:补充)?[：:]/.test(text) || /^仅道具服可用/.test(text);
}

function normalizeServerText(value) {
  const exact = new Map([
    ['胜利后在开启者之间向布鲁梅尔取得称号“开启者”并回圣餐之间。战斗有一定几率掉落魔族水晶；道具服另可随机得破损的刀刃。', '胜利后在开启者之间向布鲁梅尔取得称号“开启者”并回圣餐之间。战斗有一定几率掉落魔族水晶。'],
    ['男性护士属于服务器/付费外观绕行：怀旧服只能支付4990点把角色外形变为女性后就职；道具服可先用女性角色就职再付费改男性，也可在时长服先就职侦探、用变装变为女性，或在道具服使用商城女性角色变身卡。该段不是普通主线步骤。', '男性护士属于服务器/付费外观绕行：怀旧服只能支付4990点把角色外形变为女性后就职；时长服可先就职侦探、用变装变为女性。该段不是普通主线步骤。'],
    ['可选：与法兰城东医院实习生塔欧（11.6）对话，可反复取得【医学全书】。该护身符仅医师使用时提高治疗成功率，道具服的提高几率有削弱。', '可选：与法兰城东医院实习生塔欧（11.6）对话，可反复取得【医学全书】。该护身符仅医师使用时提高治疗成功率。'],
    ['资料补充：再生之饰来自《贪婪之心》，怀旧服对医生的治疗成功率提升大于医学全书，但同时装备时会被医学全书覆盖；道具服效果未知。', '资料补充：再生之饰来自《贪婪之心》，怀旧服对医生的治疗成功率提升大于医学全书，但同时装备时会被医学全书覆盖。'],
    ['逐层击败黑龙族BOSS到中层；怀旧服Lv.100，道具服Lv.160。', '逐层击败黑龙族BOSS到中层；怀旧服Lv.100。'],
    ['逐层击败白龙族BOSS到中层；怀旧服Lv.100，道具服Lv.160。', '逐层击败白龙族BOSS到中层；怀旧服Lv.100。'],
    ['修正：命中+20，反击+60，闪躲-80。怀旧服版本跟道具服不同，总档多5', '修正：命中+20，反击+60，闪躲-80。'],
    ['抽奖分支：在里谢里雅堡（48.60）向元宵节商贩支付1000G购买【元宵礼包】；道具服价格为100G。', '抽奖分支：在里谢里雅堡（48.60）向元宵节商贩支付1000G购买【元宵礼包】。'],
    ['1000G或道具服100G', '1000G'],
    ['向神秘人（24.16）支付服务器对应费用并选择“是”，进入暗殿武道会。2024版怀旧服3000G、道具服100000G。与每层BOSS对话战斗，胜利自动传送到下一层。来源另称2024版BOSS等级提升为怀旧95~120、道具130~160；详细表仍列原始Lv.80~120，二者分别保存。', '向神秘人（24.16）支付3000G并选择“是”，进入暗殿武道会。与每层BOSS对话战斗，胜利自动传送到下一层。来源另称2024版怀旧服BOSS等级提升为Lv.95~120；详细表仍列原始Lv.80~120，两种说法分别保存。'],
    ['战斗胜利后切换到叹息森林，队伍随机一人获得【艾里克的大剑】；道具服另有概率随机获得【磨刀石】。', '战斗胜利后切换到叹息森林，队伍随机一人获得【艾里克的大剑】。'],
    ['鉴定师鉴定料理/药水，或修理师修复装备；成功后向第二回主考官交成品，全队进入合格房。开光料理增加遇敌、开光药水降低遇敌，仅道具服全域生效。', '鉴定师鉴定料理/药水，或修理师修复装备；成功后向第二回主考官交成品，全队进入合格房。'],
    ['与反抗军（35.21）对话选“是”传送，再从（42.21）黄色传送石进入罗连斯研究塔。入塔会收走指定类别物品；道具服持驱魔香或诱魔香无法通过。', '与反抗军（35.21）对话选“是”传送，再从（42.21）黄色传送石进入罗连斯研究塔。入塔会收走指定类别物品。'],
    ['从米诺基亚镇东门绕山到库鲁克斯岛（591.840）。本任务仅怀旧服开放；道具服的9C配方和核心材料来自商城。', '从米诺基亚镇东门绕山到库鲁克斯岛（591.840）。本任务仅怀旧服开放。'],
    ['从法兰城西门到芙蕾雅岛（201.165）与士兵卡夏平对话，按职业、等级或通行证条件进入莎莲娜海底洞窟。怀旧服可用蒂娜村/阿巴尼斯村传送券，道具服可购买万能传送卷替代徒步。', '从法兰城西门到芙蕾雅岛（201.165）与士兵卡夏平对话，按职业、等级或通行证条件进入莎莲娜海底洞窟。怀旧服可用蒂娜村/阿巴尼斯村传送券。'],
    ['怀旧服可用技能学习证学习巫师得意技；道具服可花5000点兑换技能屋通行证，但仍受等级、职业与所列排除技能限制。', '怀旧服可用技能学习证学习巫师得意技。'],
    ['胜利后随机掉落魔族的水晶、誓言之证；道具服另增刀的饰物。传教士、巫师会进入各自技能房，其他职业场景不同。', '胜利后随机掉落魔族的水晶、誓言之证。传教士、巫师会进入各自技能房，其他职业场景不同。'],
    ['未携带且未装备任何武器时，与地精诺姆（17.17）对话，交出土、水、炎、风四属性乐谱各1，经过传送石进入树海。怀旧服必须恰好一套，任何额外单张或整套都会阻止进入；道具服无此套数限制。', '未携带且未装备任何武器时，与地精诺姆（17.17）对话，交出土、水、炎、风四属性乐谱各1，经过传送石进入树海。怀旧服必须恰好一套，任何额外单张或整套都会阻止进入。'],
    ['Lv.100死神的仆从，血量约10000（道具服血量约16000），邪魔系，属性：全25；技能：攻击、防御、超强即死魔法', 'Lv.100死神的仆从，血量约10000，邪魔系，属性：全25；技能：攻击、防御、超强即死魔法']
  ]);
  const rewritten = exact.get(value) || value;
  return rewritten
    .replaceAll('怀旧服/道具服/时长服', '怀旧服/时长服')
    .replaceAll('怀旧/道具服/时长服', '怀旧服/时长服')
    .replaceAll('怀旧、时长、道具服', '怀旧服、时长服')
    .replaceAll('怀旧、道具、时长服', '怀旧服、时长服')
    .replaceAll('怀旧服、时长服、道具服', '怀旧服、时长服')
    .replaceAll('怀旧服、道具服、时长服', '怀旧服、时长服')
    .replaceAll('怀旧/道具服', '怀旧服')
    .replaceAll('怀旧服/道具服', '怀旧服')
    .replaceAll('怀旧、道具服', '怀旧服')
    .replaceAll('怀旧服与道具服', '怀旧服')
    .replaceAll('时长/道具服', '时长服')
    .replaceAll('时长服/道具服', '时长服')
    .replaceAll('时长、道具服', '时长服')
    .replaceAll('时长服、道具服', '时长服')
    .replaceAll('时长服与道具服', '时长服')
    .replaceAll('道具服/时长服', '时长服')
    .replaceAll('道具服、时长服', '时长服')
    .replaceAll('道具服与时长服', '时长服')
    .replace(/([（(][^）)]*?怀旧服[^）)]*?)[；，,]道具服(?:为)?[^）)]*(?=[）)])/g, '$1');
}

function prune(value) {
  if (typeof value === 'string') return normalizeServerText(value);
  if (Array.isArray(value)) {
    return value
      .filter(entry => entry !== ITEM_SERVER && !(typeof entry === 'string' && entry.startsWith(ITEM_SERVER)) && !isItemServerOnly(entry))
      .map(prune);
  }
  if (!value || typeof value !== 'object') return value;

  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === ITEM_SERVER) continue;
    const normalizedKey = normalizeServerText(key);
    const normalizedEntry = prune(entry);
    if (normalizedKey in result && Array.isArray(result[normalizedKey]) && Array.isArray(normalizedEntry)) {
      result[normalizedKey].push(...normalizedEntry);
    } else {
      result[normalizedKey] = normalizedEntry;
    }
  }
  return result;
}

function collectRuntimeMentions(quest) {
  const mentions = [];
  function visit(value, fieldPath) {
    if (typeof value === 'string') {
      if (value.includes(ITEM_SERVER)) mentions.push(`${fieldPath}: ${value}`);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${fieldPath}[${index}]`));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, entry] of Object.entries(value)) {
      const childPath = fieldPath ? `${fieldPath}.${key}` : key;
      if (childPath === 'source.rawLines' || childPath === 'segments') continue;
      if (key.includes(ITEM_SERVER)) mentions.push(`${childPath}: <字段名>`);
      visit(entry, childPath);
    }
  }
  visit(quest, '');
  return mentions;
}

const files = fs.readdirSync(questRecordsDir).filter(file => file.endsWith('.json')).sort();
const pending = [];
let changed = 0;

for (const file of files) {
  const filename = path.join(questRecordsDir, file);
  const original = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const cleaned = prune(original);
  const stepIds = new Set((cleaned.flow?.steps || []).map(step => step.id));
  for (const eventType of ['inputs', 'acquisitions']) {
    if (Array.isArray(cleaned.itemEvents?.[eventType])) {
      cleaned.itemEvents[eventType] = cleaned.itemEvents[eventType].filter(event => stepIds.has(event.step));
    }
  }
  if (Array.isArray(cleaned.rewardEvents)) {
    cleaned.rewardEvents = cleaned.rewardEvents.filter(event => (event.items || []).length > 0
      || (event.kind === 'probability-table' && event.oddsPercent && Object.keys(event.oddsPercent).length));
    const rewardEventIds = new Set(cleaned.rewardEvents.map(event => event.id));
    for (const step of cleaned.flow?.steps || []) {
      if (Array.isArray(step.rewardEventRefs)) step.rewardEventRefs = step.rewardEventRefs.filter(id => rewardEventIds.has(id));
    }
  }
  // 原始攻略行与逐行归类用于证据回溯，不属于页面展示数据，必须原样保留。
  cleaned.source.rawLines = original.source.rawLines;
  cleaned.segments = original.segments;
  const mentions = collectRuntimeMentions(cleaned);
  if (mentions.length) pending.push({ file, mentions });
  const output = `${JSON.stringify(cleaned, null, 2)}\n`;
  if (output !== fs.readFileSync(filename, 'utf8')) {
    fs.writeFileSync(filename, output, 'utf8');
    changed += 1;
  }
}

if (pending.length) {
  console.error(JSON.stringify(pending, null, 2));
  throw new Error(`${pending.length} 个任务仍含道具服展示信息，请逐条改写后重跑。`);
}

console.log(JSON.stringify({ questCount: files.length, changedFiles: changed, preservedEvidence: ['source.rawLines', 'segments'] }, null, 2));
