import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const context = { console };
context.globalThis = context;
vm.createContext(context);
for (const file of ['data.js', 'catalog.js', 'career-quests.js', 'enhancements.js', 'generated-integrations.js', 'normalize.js', 'structured-rewards.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
vm.runInContext('globalThis.__QUESTS__ = QUESTS; globalThis.__ROUTES__ = TRAINING_ROUTES; globalThis.__GUIDES__ = QUEST_GUIDES; globalThis.__REWARDS__ = REWARD_GUIDES;', context);

const quests = context.__QUESTS__;
const routes = context.__ROUTES__;
const guides = context.__GUIDES__;
const rewards = context.__REWARDS__;
const routeIndex = context.TRAINING_ROUTE_INDEX;
const pinyinIndex = context.PINYIN_INDEX;
const entryTasksByRoute = context.TRAINING_ENTRY_TASKS;
const routeDetails = context.TRAINING_ROUTE_DETAILS;
const keyItemGuides = context.KEY_ITEM_GUIDES || {};
const structuredRewards = context.STRUCTURED_REWARD_GUIDES || {};
const normalize = value => String(value || '').toLowerCase().replace(/[\s·・—_\-（）()《》【】\[\]\/]/g, '');

const questByName = new Map(quests.map(quest => [quest.name, quest]));
const categoryOnlySeries = new Set(['临时活动/任务', '怀旧服其他自制任务', '经典任务', '职业就职任务', '职业晋阶任务', '未分类任务']);
const misclassifiedSeries = quests.filter(quest => categoryOnlySeries.has(quest.series));
if (misclassifiedSeries.length) {
  throw new Error(`任务分类被误作系列关系: ${misclassifiedSeries.slice(0, 12).map(quest => quest.name).join(', ')}`);
}
for (const quest of quests) {
  const acquisitions = rewards[quest.id]?.acquisitions || [];
  const eventKey = event => event.action
    ? `action:${event.action.replace(/\s+/g, '')}`
    : `details:${(event.items || []).map(item => item.name).sort().join('|')}`;
  const duplicateActions = acquisitions.filter((event, index) => acquisitions.findIndex(candidate => eventKey(candidate) === eventKey(event)) !== index);
  if (duplicateActions.length) throw new Error(`道具获得事件重复: ${quest.name}`);
  if (acquisitions.some(event => {
    const invalidDetails = !event.action && (event.stepNumber || event.label !== '属性 / 用途' || event.items?.some(item => !item.notes?.length));
    return invalidDetails || !event.items?.length || event.items.some(item => !item.name || !['task','reward'].includes(item.role));
  })) {
    throw new Error(`道具获得事件结构不完整: ${quest.name}`);
  }
  if (acquisitions.some(event => event.items.some(item => /^(?:奖品|奖励|物品|道具)$/.test(item.name) && !item.unresolved))) {
    throw new Error(`原攻略未列明的泛称奖品没有标记待核验: ${quest.name}`);
  }
  const steps = guides[quest.id]?.steps || [];
  if (steps.some(step => /(?:获得|取得|得到|领取|掉落|鉴定后为)[^。；]{0,80}【[^】]+】/.test(step)) && !acquisitions.length) {
    throw new Error(`任务步骤存在道具输出但未生成获得事件: ${quest.name}`);
  }
}
for (const [questId, entries] of Object.entries(keyItemGuides)) {
  if (!quests.some(quest => quest.id === questId)) throw new Error(`关键道具来源任务不存在: ${questId}`);
  for (const entry of entries) {
    if (!entry.name || (!entry.questUses?.length && !entry.trainingUses?.length)) throw new Error(`关键道具去向不完整: ${questId}`);
    if ((entry.questUses || []).some(use => !quests.some(quest => quest.id === use.questId))) throw new Error(`关键道具后续任务不存在: ${entry.name}`);
  }
}
for (const [questId, data] of Object.entries(structuredRewards)) {
  if (!quests.some(quest => quest.id === questId)) throw new Error(`结构化奖励对应任务不存在: ${questId}`);
  if (!data.replaceGenericAcquisitions) throw new Error(`结构化奖励未禁止通用段落卡回退: ${questId}`);
  if (!(data.acquisitionEvents || []).length || !(data.itemDetails || []).length) throw new Error(`结构化奖励缺少获得事件或物品资料: ${questId}`);
  for (const event of data.acquisitionEvents) {
    if (!event.source || !event.certainty || !(event.rewards || []).length) throw new Error(`获得事件字段不完整: ${questId}`);
    if (event.rewards.some(reward => !reward.name || !reward.quantity)) throw new Error(`获得事件缺少道具名或数量: ${questId}`);
  }
  const detailNames = data.itemDetails.map(item => item.name);
  if (new Set(detailNames).size !== detailNames.length) throw new Error(`物品资料重复: ${questId}`);
  if (data.itemDetails.some(item => !item.kind || !item.sources?.length || !item.facts?.length)) throw new Error(`物品资料字段不完整: ${questId}`);
  if ((data.exchanges || []).some(item => !item.cost || !item.name || !item.result)) throw new Error(`兑换表字段不完整: ${questId}`);
  if ((data.versions || []).some(version => !version.name || !version.facts?.length)) throw new Error(`版本差异字段不完整: ${questId}`);
}
const dimensionalId = questByName.get('异次元试验场')?.id;
const dimensionalPoints = rewards[dimensionalId]?.acquisitions
  ?.flatMap(event => event.items || [])
  .find(item => item.name === '积分卡');
if (!structuredRewards[dimensionalId]?.replaceGenericAcquisitions && (dimensionalPoints?.notes || []).some(note => /全视之眼|旧版异次元试验场|第一次|第二次/.test(note))) {
  throw new Error('通用解析仍将其他道具属性或版本段落挂在积分卡下');
}
const dragonQuest = questByName.get('魔龙德拉贡');
const dragonTrainingKeys = (keyItemGuides[dragonQuest?.id] || [])
  .filter(entry => entry.trainingUses?.length)
  .map(entry => entry.name);
if (dragonTrainingKeys.includes('啤酒') || dragonTrainingKeys.includes('船票') || !dragonTrainingKeys.includes('剩下的地图块')) {
  throw new Error(`沉封之窟保留道具关系错误: ${dragonTrainingKeys.join('、')}`);
}
const sourceId = url => String(url || '').match(/\/Mission\/Detail\/([^?/#]+)/i)?.[1] || '';
const careerContext = { window: {} };
vm.createContext(careerContext);
vm.runInContext(fs.readFileSync(path.resolve(root, '..', '魔力职业', 'data.js'), 'utf8'), careerContext);
const employmentLinks = careerContext.window.CAREER_DATA.professions.flatMap(profession =>
  (profession.employment?.links || []).map(link => ({ profession: profession.name, label: link.label, id: sourceId(link.url) }))
);
const questSourceIds = new Set(quests.map(quest => quest.sourceId || sourceId(quest.sourceUrl) || sourceId(context.SOURCES?.[quest.source]?.url)).filter(Boolean));
const missingEmployment = employmentLinks.filter(link => !questSourceIds.has(link.id));
if (missingEmployment.length) {
  throw new Error(`职业就职任务未入库: ${missingEmployment.map(link => `${link.profession} -> ${link.label}`).join(', ')}`);
}
const fighterEmployment = questByName.get('就职格斗士');
if (!fighterEmployment?.aliases?.includes('狮子洞') || guides[fighterEmployment.id]?.steps?.length < 7) {
  throw new Error('就职格斗士任务缺少狮子洞别名或完整主流程');
}
const undocumented = quests.filter(quest => quest.detailStatus === 'index-only' || !guides[quest.id]?.steps?.length);
if (undocumented.length) throw new Error(`仍有空壳任务页: ${undocumented.map(quest => quest.name).join(', ')}`);
for (const fakeName of ['沉默的诺利', '盲目的艾汀', '失忆的杜瓦', '牛场物语']) {
  if (questByName.has(fakeName)) throw new Error(`俗称或 NPC 被错误建立为正式任务: ${fakeName}`);
}
for (const [canonical, alias] of [['沉默之龙','沉默的诺利'],['盲目之龙','盲目的艾汀'],['失翼之龙','失忆的杜瓦'],['亚诺曼阅兵仪式事件','牛场物语']]) {
  if (!questByName.get(canonical)?.aliases?.includes(alias)) throw new Error(`正式任务缺少检索别名: ${canonical} <- ${alias}`);
}
for (const route of routeIndex) {
  const details = routeDetails[route.name];
  if (!details?.firstTime || !details?.checkpoint) throw new Error(`练级路线未对齐首次路线: ${route.name}`);
  if (details.quick === true && !details.repeat) throw new Error(`快速重复路线缺少说明: ${route.name}`);
  if (/待核验|尚未|未导入|不伪造|请查看/.test(`${details.checkpoint} ${details.firstTime} ${details.repeat || ''}`)) {
    throw new Error(`练级路线仍含占位说明: ${route.name}`);
  }
  const entryTasks = entryTasksByRoute[route.name];
  if (!entryTasks?.length) throw new Error(`练级点未指定实际入口任务: ${route.name}`);
  for (const taskName of entryTasks) {
    const quest = questByName.get(taskName);
    if (!quest) throw new Error(`练级关联任务未入库: ${taskName}`);
    const routeStep = details.stepsByTask?.[taskName] ?? details.step;
    if (routeStep && guides[quest.id].steps.length < routeStep) {
      throw new Error(`练级入口超出任务步骤: ${route.name} -> ${taskName} 第${routeStep}步，正文仅${guides[quest.id].steps.length}步`);
    }
    const list = (routes[taskName] ||= []);
    const incomingNames = [route.name, ...(route.aliases || [])].map(normalize).filter(Boolean);
    const duplicate = list.some(item => {
      const existingNames = [item.name, ...(item.aliases || [])].map(normalize).filter(Boolean);
      return existingNames.some(existing => incomingNames.some(incoming => existing.includes(incoming) || incoming.includes(existing)));
    });
    if (!duplicate) list.push(route);
  }
}

const missingRoutes = [...new Set(Object.values(entryTasksByRoute).flat())].filter(taskName => !routes[taskName]?.length);
if (missingRoutes.length) throw new Error(`未生成练级卡片: ${missingRoutes.join(', ')}`);

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

function score(quest, rawQuery) {
  const query = normalize(rawQuery);
  const fields = [quest.name, ...quest.aliases, quest.series, quest.sourceCategory, quest.type, quest.initials, ...(pinyinIndex[quest.id] || [])].map(normalize).filter(Boolean);
  return fields.reduce((best, field) => field === query ? Math.max(best, 120)
    : field.startsWith(query) ? Math.max(best, 95 - field.length + query.length)
    : field.includes(query) ? Math.max(best, 75 - field.indexOf(query))
    : Math.max(best, subsequenceScore(query, field)), -1);
}

const cases = [
  ['shilaimu', '史莱姆的回忆'],
  ['slmdhy', '史莱姆的回忆'],
  ['molongdelagong', '魔龙德拉贡'],
  ['chenfeng', '魔龙德拉贡'],
  ['niuguidenixi', '牛鬼的逆袭'],
  ['gedoushijiuzhi', '就职格斗士'],
  ['格斗就职', '就职格斗士']
];
for (const [query, expected] of cases) {
  const winner = [...quests].sort((a, b) => score(b, query) - score(a, query))[0];
  if (winner.name !== expected || score(winner, query) < 0) throw new Error(`拼音检索失败: ${query} -> ${winner.name}`);
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (html.includes('id="quickLinks"')) throw new Error('快捷标签区域仍存在');
if (!html.includes('generated-integrations.js')) throw new Error('未加载生成索引');

const tribute = routeDetails['贡品之路'];
if (tribute.step !== 5 || tribute.quick === true || !tribute.firstTime.includes('海盗水晶')) {
  throw new Error('贡品之路没有正确对齐《被夺走的贡品》第5步');
}

const alignedRoutes = {
  '内心世界':5,
  '雪山':1,
  '巴洛斯岛':5,
  '峡之洞窟（地下）':9,
  '悠远之所':3,
  '莎莲娜海底洞窟练宠区':1,
  '沙尘之洞练级区':3,
  '深绿的山道':4
};
for (const [routeName, step] of Object.entries(alignedRoutes)) {
  if (routeDetails[routeName]?.step !== step) throw new Error(`练级入口步数未对齐: ${routeName} 应为第${step}步`);
}

console.log(`Verified ${quests.length} tasks, ${routeIndex.length} leveling places, ${Object.keys(routes).length} entry-task pages, and ${cases.length} pinyin searches.`);
