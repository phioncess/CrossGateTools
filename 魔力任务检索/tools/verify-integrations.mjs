import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const context = { console };
context.globalThis = context;
vm.createContext(context);
for (const file of ['quest-data.js', 'training-routes.js', 'generated-integrations.js', 'structured-integrations.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
const structuredRecords = Object.values(context.QUEST_DATA?.quests || {});
const quests = structuredRecords.map(record => ({
  id:record.id,
  name:record.name,
  aliases:record.aliases || [],
  series:record.presentation?.series || '',
  sourceCategory:record.presentation?.sourceCategory || record.metadata?.category || '',
  type:record.presentation?.type || record.metadata?.category || '任务',
  sourceUrl:record.source?.url || '',
  flow:record.flow
}));
const routes = context.TRAINING_ROUTES;
const routeIndex = context.TRAINING_ROUTE_INDEX;
const pinyinIndex = context.PINYIN_INDEX;
const entryTasksByRoute = context.TRAINING_ENTRY_TASKS;
const routeDetails = context.TRAINING_ROUTE_DETAILS;
const keyItemGuides = context.KEY_ITEM_GUIDES || {};
const normalize = value => String(value || '').toLowerCase().replace(/[\s·・—_\-（）()《》【】\[\]\/]/g, '');

const questByName = new Map(quests.map(quest => [quest.name, quest]));
const categoryOnlySeries = new Set(['临时活动/任务', '怀旧服其他自制任务', '经典任务', '职业就职任务', '职业晋阶任务', '未分类任务']);
const misclassifiedSeries = quests.filter(quest => categoryOnlySeries.has(quest.series));
if (misclassifiedSeries.length) {
  throw new Error(`任务分类被误作系列关系: ${misclassifiedSeries.slice(0, 12).map(quest => quest.name).join(', ')}`);
}
for (const record of structuredRecords) {
  const stepIds = new Set((record.flow?.steps || []).map(step => step.id));
  const acquisitions = record.itemEvents?.acquisitions || [];
  const inputs = record.itemEvents?.inputs || [];
  if (acquisitions.some(event => !event.item || !event.step || !stepIds.has(event.step))) {
    throw new Error(`结构化获得事件缺少道具或有效步骤: ${record.name}`);
  }
  if (inputs.some(event => !event.item || !event.step || !stepIds.has(event.step))) {
    throw new Error(`结构化输入事件缺少道具或有效步骤: ${record.name}`);
  }
  for (const step of record.flow?.steps || []) {
    for (const output of step.outputs || []) {
      if (!acquisitions.some(event => event.step === step.id && event.item === output.item)) {
        throw new Error(`步骤输出未进入结构化获得事件: ${record.name} / ${step.id} / ${output.item}`);
      }
    }
    for (const input of step.inputs || []) {
      if (!inputs.some(event => event.step === step.id && event.item === input.item)) {
        throw new Error(`步骤输入未进入结构化输入事件: ${record.name} / ${step.id} / ${input.item}`);
      }
    }
  }
  for (const rewardEvent of record.rewardEvents || []) {
    const allowsNoItems = rewardEvent.kind === 'probability-table' && rewardEvent.oddsPercent && Object.keys(rewardEvent.oddsPercent).length;
    if (!rewardEvent.id || !rewardEvent.kind || (!(rewardEvent.items || []).length && !allowsNoItems)) throw new Error(`结构化奖励事件不完整: ${record.name}`);
    if (rewardEvent.items.some(item => !item.name || !item.role)) throw new Error(`结构化奖励物品字段不完整: ${record.name}`);
  }
}
for (const [questId, entries] of Object.entries(keyItemGuides)) {
  if (!quests.some(quest => quest.id === questId)) throw new Error(`关键道具来源任务不存在: ${questId}`);
  for (const entry of entries) {
    if (!entry.name || (!entry.questUses?.length && !entry.trainingUses?.length && !entry.repeatUses?.length)) throw new Error(`关键道具去向不完整: ${questId}`);
    if ((entry.repeatUses || []).some(use => !quests.some(quest => quest.id === use.questId))) throw new Error(`关键道具重复任务不存在: ${entry.name}`);
    if ((entry.questUses || []).some(use => !quests.some(quest => quest.id === use.questId))) throw new Error(`关键道具后续任务不存在: ${entry.name}`);
  }
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
const questSourceIds = new Set(quests.map(quest => sourceId(quest.sourceUrl)).filter(Boolean));
const missingEmployment = employmentLinks.filter(link => !questSourceIds.has(link.id));
if (missingEmployment.length) {
  throw new Error(`职业就职任务未入库: ${missingEmployment.map(link => `${link.profession} -> ${link.label}`).join(', ')}`);
}
const fighterEmployment = questByName.get('就职格斗士');
if (!fighterEmployment?.aliases?.includes('狮子洞') || fighterEmployment.flow?.steps?.length < 7) {
  throw new Error('就职格斗士任务缺少狮子洞别名或完整主流程');
}
const undocumented = quests.filter(quest => !quest.flow?.steps?.length);
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
    if (routeStep && quest.flow.steps.length < routeStep) {
      throw new Error(`练级入口超出任务步骤: ${route.name} -> ${taskName} 第${routeStep}步，正文仅${quest.flow.steps.length}步`);
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
if (!html.includes('structured-integrations.js')) throw new Error('未加载结构化跨任务关系生成器');
for (const legacyFile of ['runtime-data.js', 'data.js', 'catalog.js', 'career-quests.js', 'enhancements.js', 'normalize.js', 'reward-catalog.js', 'structured-rewards.js']) {
  const scriptSources = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(match => match[1].replace(/[?#].*$/, '').replace(/\\/g, '/').split('/').pop());
  if (scriptSources.includes(legacyFile)) throw new Error(`运行时仍加载旧任务事实文件: ${legacyFile}`);
}

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
