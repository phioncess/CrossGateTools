import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dom = new JSDOM(html, { url: 'https://local.test/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
const runtimeErrors = [];
window.addEventListener('error', event => runtimeErrors.push(event.error || new Error(event.message)));
let lastScrolledQuestId = null;
window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() { lastScrolledQuestId = this.dataset?.questId || null; };

const scripts = [...window.document.querySelectorAll('script[src]')].map(script => {
  const filename = script.getAttribute('src');
  const localFilename = filename.replace(/[?#].*$/, '');
  return `${fs.readFileSync(path.join(root, localFilename), 'utf8')}\n//# sourceURL=${filename}`;
});
for (const legacyFile of ['runtime-data.js', 'data.js', 'catalog.js', 'career-quests.js', 'enhancements.js', 'normalize.js', 'reward-catalog.js', 'structured-rewards.js']) {
  if ([...window.document.querySelectorAll('script[src]')].some(script => script.getAttribute('src').replace(/[?#].*$/, '') === legacyFile)) {
    throw new Error(`页面运行时仍加载旧任务事实文件: ${legacyFile}`);
  }
}
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
if (/\.enemy-card\s*\{[^}]*display\s*:\s*flex[^}]*flex-direction\s*:\s*column/.test(stylesSource) || /\.enemy-skills\s*\{[^}]*margin-top\s*:\s*auto/.test(stylesSource)) {
  throw new Error('敌人卡片仍会把技能区强制推到卡片底部');
}
for (const forbiddenSymbol of ['QUEST_GUIDES','REWARD_GUIDES','BOSS_GUIDES','STRUCTURED_REWARD_GUIDES','catalogBattles','organizeGuide','stepActionLabels','normalizeEnemyEntries','parseEnemyOverview']) {
  if (appSource.includes(forbiddenSymbol)) throw new Error(`app.js 仍含旧运行时或正文解析逻辑: ${forbiddenSymbol}`);
}
window.eval(scripts.join('\n'));
// Structured special effects must survive rendering, including scoped race changes.
for (const [item, expected] of [
  [{properties:{raceChange:'飞行系'}}, ['种族变为飞行系']],
  [{properties:{raceChange:{to:'野兽系',scope:'仅改变被攻击时的种族'}}}, ['种族变为野兽系','仅改变被攻击时的种族']],
  [{properties:{skillEffect:{skill:'连击',mpReductionPercent:25},equipRestriction:'忍者'}}, ['连击耗魔减少25%','装备限制','忍者']]
]) {
  const markup = window.renderRewardKnowledge(item);
  for (const text of expected) if (!markup.includes(text)) throw new Error(`奖励特殊属性遗漏: ${text}`);
}
const sourceDocumentAreaCount = Object.values(window.SOURCE_DOCUMENTS || {}).reduce((sum, document) => sum + (document.areas || []).length, 0);
if (sourceDocumentAreaCount !== 0) throw new Error('source-documents.js 仍包含绕过统一任务数据的业务文本');
if (window.formatTaskText(undefined) !== '') throw new Error('统一文本格式化入口会泄漏 undefined');
if (window.formatTaskText('取得证明后') !== '取得证明后') throw new Error('普通正文仍被道具名称子串误标');

const input = window.document.querySelector('#questSearch');
const options = window.document.querySelector('#questOptions');
const search = value => {
  input.focus();
  input.value = value;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  return [...options.querySelectorAll('[data-quest-id]')];
};

let results = search('卡赛迪博士宠物研究计划');
results[0]?.click();
const cassidyDetail = window.document.querySelector('#questDetail')?.textContent || '';
const cassidyChoices = [...window.document.querySelectorAll('.step-choice-details')];
if (cassidyChoices.length !== 2 || !cassidyChoices[0].textContent.includes('随机获得其中 1 项') || !cassidyChoices[0].textContent.includes('神奇的药草')) {
  throw new Error('卡赛迪任务的分支结果没有按用户可读语义展示');
}
if (cassidyDetail.includes('reward-weak-cat-exit-pool') || cassidyDetail.includes('reward-strong-cat-exit-pool')) {
  throw new Error('卡赛迪任务仍向页面泄漏内部奖励事件 ID');
}
const cassidyRewardHeaders = [...window.document.querySelectorAll('.acquisition-event-card header')].map(header => header.textContent);
if (!cassidyRewardHeaders.some(text => text.includes('流程第 3 步') && text.includes('随机获得 1 项（奖池共 5 项）'))
  || !cassidyRewardHeaders.some(text => text.includes('流程第 5 步') && text.includes('获得其中 1 项（共 2 项）'))) {
  throw new Error('卡赛迪任务奖励池没有标明实际取得数量');
}

results = search('地狱的回响');
results[0]?.click();
if (!window.document.querySelector('#questDetail')?.textContent.includes('通往地狱的道路为随机迷宫')) {
  throw new Error('迁移后的区域资料没有从 QUEST_DATA.sourceSupplements 渲染');
}

results = search('shilaimu');
if (!results[0]?.textContent.includes('史莱姆的回忆')) throw new Error('全拼搜索没有将史莱姆任务排在首位');

results = search('slmdhy');
if (!results[0]?.textContent.includes('史莱姆的回忆')) throw new Error('首字母搜索没有将史莱姆任务排在首位');
results[0]?.click();
const iceFirst = window.document.querySelector('.training-path.first')?.textContent || '';
const iceRepeat = window.document.querySelector('.training-path.quick')?.textContent || '';
if (!iceFirst.includes('第6步') || !iceFirst.includes('手电筒')) throw new Error('冰树首次路线未对齐结构化流程第6步取手电筒');
if (!iceRepeat.includes('小拓') || !iceRepeat.includes('客房下的裂缝')) throw new Error('冰树重复进入路线不完整');
const iceKeyItems = window.document.querySelector('.key-items-card')?.textContent || '';
if (!iceKeyItems.includes('手电筒') || !iceKeyItems.includes('冰树') || !iceKeyItems.includes('流程第 6 步取得')) throw new Error('手电筒没有标明重复冰树路线用途');
const iceRewards = window.document.querySelector('.rewards-card')?.textContent || '';
if (iceRewards.includes('【手电筒】')) throw new Error('纯流程关键道具手电筒仍在下方道具获取区重复展示');
const magnifierCard = [...window.document.querySelectorAll('.acquisition-item')].find(card => card.textContent.includes('放大镜'));
if (!/精神\s*\+3[~～]\+9/.test(magnifierCard?.textContent || '') || /血量约|技能：|魔物：|随机迷宫/.test(magnifierCard.textContent)) throw new Error('放大镜属性卡缺少结构化型号属性或混入战斗、路线资料');

results = search('失翼之龙');
results[0]?.click();
const dragonChain = window.document.querySelector('.chain-card');
const dragonRelations = window.document.querySelector('.relation-grid');
const dragonTabs = window.document.querySelector('.detail-tabs');
if (!dragonChain || !dragonTabs || !(dragonChain.compareDocumentPosition(dragonTabs) & window.Node.DOCUMENT_POSITION_FOLLOWING)) throw new Error('系列关系链没有放在任务页签之前');
if (!dragonRelations || !(dragonChain.compareDocumentPosition(dragonRelations) & window.Node.DOCUMENT_POSITION_FOLLOWING) || !(dragonRelations.compareDocumentPosition(dragonTabs) & window.Node.DOCUMENT_POSITION_FOLLOWING)) throw new Error('前置任务与后续索引没有放在系列关系链和任务页签之间');
if (dragonRelations.textContent.includes('盲目之龙')) throw new Error('系列内直接前置在链外前置任务中重复展示');
if (!dragonRelations.textContent.includes('链外')) throw new Error('前置任务与后续索引没有标明链外关系口径');
if (!window.document.querySelector('[data-detail-tab="task"]')?.classList.contains('active')) throw new Error('任务流程不是默认激活页签');
if (window.document.querySelector('[data-detail-panel="task"]')?.hidden) throw new Error('任务流程默认被隐藏');
if (!window.document.querySelector('[data-detail-panel="training"]')?.hidden) throw new Error('练级路线默认没有隐藏');

results = search('被夺走的贡品');
results[0]?.click();
const tributePaths = [...window.document.querySelectorAll('.training-path')];
if (tributePaths.length !== 1) throw new Error(`贡品之路没有快速入口，应只显示1条路线，实际为 ${tributePaths.length}`);
if (!tributePaths[0].textContent.includes('第5步') || !tributePaths[0].textContent.includes('海盗水晶')) throw new Error('贡品首次路线未对齐任务第5步');
window.document.querySelector('[data-detail-tab="task"]')?.click();
const tributeMarker = [...window.document.querySelectorAll('.training-entry-step')].find(step => step.textContent.includes('贡品之路'));
if (!tributeMarker?.textContent.includes('第5步')) throw new Error('贡品练级入口未在完整任务第5步中标出');
const tributeBossText = window.document.querySelector('.boss-card')?.textContent || '';
if (!tributeBossText.includes('海贼的巢穴')) throw new Error('被夺走的贡品缺少区域遭遇资料');
for (const sourceFact of ['敏捷的守卫', '勇猛的守卫', '血量约2000', '丧失心智的头目', '血量约7000', '血量约1400', '不抗毒', '吸血攻击']) {
  if (!tributeBossText.includes(sourceFact)) throw new Error(`被夺走的贡品缺少原攻略战斗资料：${sourceFact}`);
}

results = search('niuguidenixi');
results[0]?.click();
if (!window.document.querySelector('.detail-head h2')?.textContent.includes('牛鬼的逆袭')) throw new Error('练级关联补录任务无法打开');
if (!window.document.querySelector('.training-routes')?.textContent.includes('峡之洞窟')) throw new Error('补录任务缺少练级路线');

results = search('沉默的诺利');
results[0]?.click();
if (!window.document.querySelector('.detail-head h2')?.textContent.includes('沉默之龙')) throw new Error('NPC/俗称没有归并到正式任务“沉默之龙”');
if (/待核验|尚未核验|请先查看/.test(window.document.querySelector('#questDetail')?.textContent || '')) throw new Error('沉默之龙仍显示占位内容');

results = search('牛场物语');
results[0]?.click();
if (!window.document.querySelector('.detail-head h2')?.textContent.includes('亚诺曼阅兵仪式事件')) throw new Error('牛场物语没有归并到正式任务');
const cattleFirst = window.document.querySelector('.training-path.first')?.textContent || '';
const cattleQuick = window.document.querySelector('.training-path.quick')?.textContent || '';
if (!cattleFirst.includes('第5步') || !cattleFirst.includes('空间裂隙水晶')) throw new Error('牛场首次路线未对齐第5步');
if (!cattleQuick.includes('750G')) throw new Error('牛场快速重复路线不完整');

results = search('魔龙德拉贡');
results[0]?.click();
const dragonGuideText = window.document.querySelector('.guide-card')?.textContent || '';
const dragonBossText = window.document.querySelector('.boss-card')?.textContent || '';
const dragonRewardText = window.document.querySelector('.rewards-card')?.textContent || '';
for (const text of ['密语支线', '手机支线', '碎裂的艾斯潘之石']) {
  if (!dragonGuideText.includes(text)) throw new Error(`魔龙任务内容缺少来源文字: ${text}`);
}
for (const text of ['魔龙德拉贡', 'Lv.80', '17000', '大地之怒', '合击', '二动W站位', '海盗', 'Lv.45']) {
  if (!dragonBossText.includes(text)) throw new Error(`魔龙战斗区缺少来源文字: ${text}`);
}
for (const text of ['艾斯潘头饰', '攻击 +8～+10', '分离的恋人']) {
  if (!dragonRewardText.includes(text)) throw new Error(`魔龙奖励区缺少来源文字: ${text}`);
}
const dragonRecord = window.QUEST_DATA.quests['catalog-071a62df-299d-49ec-be9e-b6390e768bc9'];
if (dragonRecord.flow.steps.length !== 14 || dragonRecord.flow.steps[6].id !== 'sealed-cave' || dragonRecord.flow.steps[11].id !== 'return-reward') {
  throw new Error('魔龙主线未恢复原攻略12步或练级入口步骤错位');
}
for (const text of ['11.14','31.9','36.12','10.7','12.11','195.176','20.22','68.41','72.77','15.11','34.21','72.76','64.40','9.13','56.13','103.102','51.46','64.47','66.41','94.48','22.8','物品栏或银行','第9步','2026.05.23','从第1步重接','纪念羽毛','村落传送券']) {
  if (!dragonGuideText.includes(text)) throw new Error(`魔龙路线事实遗漏: ${text}`);
}
for (const text of ['艾斯潘之石','碎裂的艾斯潘之石','攻击+10%','耐久-20%','注销时消失','不可交易','手机','收不到讯号','可爱水手服','假发']) {
  if (!dragonRewardText.includes(text)) throw new Error(`魔龙有价值道具事实遗漏: ${text}`);
}
for (const [name, price] of [['可爱水手服','500'],['假发','200']]) {
  const card = [...window.document.querySelectorAll('.acquisition-item')].find(card => card.querySelector('h4')?.textContent.includes(name));
  if (!card || ![...card.querySelectorAll('.reward-fact-list>div')].some(row => row.querySelector('dt')?.textContent === '价格（G）' && row.querySelector('dd')?.textContent.trim() === price)) throw new Error(`魔龙购买价格遗漏或归属错误: ${name}`);
}
if (window.document.querySelectorAll('.step-route').length !== 3 || dragonGuideText.includes('此步可选')) throw new Error('魔龙支线未分组或仍重复可选元数据');
if (dragonRewardText.includes('不推测第三种物品')) throw new Error('魔龙奖励区泄漏整理过程');
const dragonSkills = dragonRecord.versions.common.tiers.common.battles.dragon.enemies[0].skills;
if (dragonSkills.filter(skill => skill.startsWith('连击')).length !== 1) throw new Error('魔龙连击技能重复');

results = search('白之意志');
const rememberedQuest = results.find(option => option.textContent.includes('白之意志、黑之意志'));
rememberedQuest?.click();
if (!rememberedQuest) throw new Error('未找到用于下拉定位测试的任务');
lastScrolledQuestId = null;
window.document.querySelector('#comboToggle')?.click();
const currentOption = window.document.querySelector('#questOptions [data-current="true"]');
if (currentOption?.dataset.questId !== rememberedQuest.dataset.questId) throw new Error('重新展开下拉后没有保留当前选中任务');
if (lastScrolledQuestId !== rememberedQuest.dataset.questId) throw new Error('重新展开下拉后没有滚动到当前选中任务');
window.document.querySelector('#comboToggle')?.click();

results = search('lubaadejimu');
results[0]?.click();
const cards = [...window.document.querySelectorAll('.training-route-card')];
if (cards.length !== 4) throw new Error(`路霸阿德基姆应有 4 条练级路线，实际为 ${cards.length}`);
if (window.document.querySelector('#quickLinks')) throw new Error('快捷标签红框区域仍存在');

results = search('中秋节赏月公园');
results[0]?.click();
if (window.document.querySelector('.chain-card')) throw new Error('独立限时活动被错误显示为系列关系链');
const moonRewardText = window.document.querySelector('.rewards-card')?.textContent || '';
for (const itemName of ['兔子王的胡萝卜', '巧克力月饼', '蛋黄月饼', '新口味五仁月饼']) {
  if (!moonRewardText.includes(itemName)) throw new Error(`中秋节赏月公园的道具获取缺少：${itemName}`);
}
const moonAcquisitionCards = [...window.document.querySelectorAll('.acquisition-event-card')];
if (moonAcquisitionCards.length !== 2) throw new Error(`中秋节赏月公园应解构为2次获得事件，实际为 ${moonAcquisitionCards.length}`);
const cakeCard = moonAcquisitionCards.find(card => card.textContent.includes('巧克力月饼'));
if (!cakeCard || !['蛋黄月饼', '新口味五仁月饼'].every(name => cakeCard.textContent.includes(name))) throw new Error('三种月饼没有归入同一次获得事件');
for (const effect of ['恢复生命值250点', '恢复魔法值200点', '随机增加技能经验值200点']) {
  if (!cakeCard.textContent.includes(effect)) throw new Error(`月饼结构化说明缺少：${effect}`);
}
const cakeAction = '前往法兰城（95.83）处与中秋节工作员对话';
if (cakeCard.textContent.includes(cakeAction)) throw new Error('下方道具卡重复复制了上方任务步骤');
if (!cakeCard.textContent.includes('流程第 3 步')) throw new Error('月饼道具卡缺少流程定位');
const moonGuideText = window.document.querySelector('.guide-card')?.textContent || '';
for (const effect of ['恢复生命值250点', '恢复魔法值200点', '随机增加技能经验值200点']) {
  if (moonGuideText.includes(effect)) throw new Error(`道具效果在任务流程与道具区重复：${effect}`);
}
if (moonGuideText.includes('不可叠加、可交易')) throw new Error('胡萝卜属性在任务流程与道具区重复');
if (!window.document.querySelector('.detail-head .eyebrow')?.textContent.includes('临时活动/任务')) throw new Error('独立活动移除伪系列后丢失了来源分类');

results = search('国庆中秋双节活动');
results[0]?.click();
const festivalGuideText = window.document.querySelector('.guide-card')?.textContent || '';
const festivalRewardText = window.document.querySelector('.rewards-card')?.textContent || '';
if (!festivalGuideText.includes('物资调配单')) throw new Error('任务道具没有保留在上方任务流程');
if (festivalRewardText.includes('物资调配单')) throw new Error('任务道具被错误列入下方道具获取区');

results = search('异次元试验场');
results[0]?.click();
const dimensionalRewards = window.document.querySelector('.rewards-card');
if (!dimensionalRewards?.querySelector('.structured-reward-list')) throw new Error('异次元试验场未使用新结构奖励排版');
if (dimensionalRewards.querySelectorAll('.acquisition-event-card').length !== 3) throw new Error('异次元试验场奖励事件未按流程、兑换与额外成果分组');
if (dimensionalRewards.querySelectorAll('.structured-reward-list .acquisition-item').length !== 10) throw new Error('异次元试验场结构化奖励项目数量不完整');
for (const exchange of ['20 个积分卡', '100 个积分卡', '45 个积分卡', '50 个积分卡']) {
  if (!dimensionalRewards.textContent.includes(exchange)) throw new Error(`异次元试验场积分兑换缺少：${exchange}`);
}
const pointsCard = [...dimensionalRewards.querySelectorAll('.acquisition-item')].find(card => card.querySelector('h4')?.textContent.trim() === '【积分卡】');
if (pointsCard) throw new Error('积分卡兑换货币仍被错误渲染成奖励资料卡');
const redEyeCard = [...dimensionalRewards.querySelectorAll('.acquisition-item')].find(card => card.querySelector('h4')?.textContent.includes('全视之眼（红）'));
if (!redEyeCard?.textContent.includes('攻击 +25') || !redEyeCard.textContent.includes('45 个积分卡')) throw new Error('全视之眼（红）的属性或兑换成本未独立归属');
const dimensionalGuide = window.document.querySelector('.guide-card')?.textContent || '';
if (!dimensionalGuide.includes('首次击败第五层BOSS')) throw new Error('异次元试验场上方流程丢失首次通关取得步骤');
for (const leakedDetail of ['名称积分卡所需数量备注', '攻击+25', '敏捷+10 精神+16', '丧尸设计图包20']) {
  if (dimensionalGuide.includes(leakedDetail)) throw new Error(`异次元试验场结构化资料仍泄漏到上方流程: ${leakedDetail}`);
}

results = search('无限试炼之元素');
results[0]?.click();
const elementalRewards = window.document.querySelector('.rewards-card');
if (!elementalRewards?.querySelector('.structured-reward-list')) throw new Error('无限试炼之元素未使用结构化兑换表');
if (elementalRewards.querySelectorAll('.structured-reward-list .acquisition-item').length !== 14) throw new Error('无限试炼之元素兑换项目数量不完整');
const trialRewardText = elementalRewards.textContent || '';
for (const expected of ['25 个元素结晶', '寒冰翼龙设计图', '等级 6', '攻击 +20', '命中 +3', '生命 +100', '120 个元素结晶', '超强风刃魔法：耗魔减少 10%']) {
  if (!trialRewardText.includes(expected)) throw new Error(`无限试炼之元素结构化兑换资料缺少：${expected}`);
}
const elementCrystalCards = [...elementalRewards.querySelectorAll('.acquisition-item')].filter(card => card.querySelector('h4')?.textContent.includes('元素结晶'));
if (elementCrystalCards.length) throw new Error('元素结晶兑换货币仍被错误渲染成兑换奖励卡');

results = search('异次元杀阵');
results[0]?.click();
const killArrayBosses = [...window.document.querySelectorAll('.boss-fight')];
if (killArrayBosses.length !== 10) throw new Error(`异次元杀阵应展示5段迷宫魔物与5场BOSS，实际为 ${killArrayBosses.length}`);
const killArrayText = window.document.querySelector('#questDetail')?.textContent || '';
for (const expected of ['1～9层 · 随机迷宫', '强盗', '10层 BOSS', '被遗弃的小蝙蝠', '20层 BOSS', '机动铁骑', '30层 BOSS', '冈的残影', '40层 BOSS', '独眼的岩怪', '50层 BOSS', '激昂的神格里雍']) {
  if (!killArrayText.includes(expected)) throw new Error(`异次元杀阵缺少迷宫或BOSS资料：${expected}`);
}
const killArrayRewards = window.document.querySelector('.rewards-card');
const killArrayRewardNames = [...killArrayRewards.querySelectorAll('.structured-reward-list .acquisition-item h4')].map(node => node.textContent.trim());
if (killArrayRewardNames.length !== 8 || new Set(killArrayRewardNames).size !== 8) throw new Error('异次元杀阵同名奖励未合并或兑换项目缺失');
for (const expected of ['首次通关随机获得；60 个积分点数卡兑换', '攻击 +26', '精神 +17', '80 个积分点数卡', '双击重置人物点数', '亚成年黄金龙', '属性 火30／风70', '档位 25 / 9 / 13 / 33 / 45']) {
  if (!killArrayRewards.textContent.includes(expected)) throw new Error(`异次元杀阵奖励资料缺少：${expected}`);
}

results = search('新村1');
results[0]?.click();
const attackedShipText = window.document.querySelector('#questDetail')?.textContent || '';
for (const expected of ['受袭的商船', '可抵达莎莲娜岛', '不可重做', '名人堂2楼（47.49）', '管理员（57.87）', '告示牌，进入受损商船', '（322.500）', '（82.27）', '（650.314）', '船长（33.26）']) {
  if (!attackedShipText.includes(expected)) throw new Error(`新村1路线缺少或坐标错误：${expected}`);
}
for (const expected of ['约5分钟后与管理员对话', '约5分钟后与商船上的船长', '两处“约5分钟后”', '未说明精确起算点']) {
  if (!attackedShipText.includes(expected)) throw new Error(`新村1等待信息不完整：${expected}`);
}
for (const forbidden of ['52.61', '46.49', '双子服', '等待满5分钟', '合计至少10分钟', '取得【证明】后']) {
  if (attackedShipText.includes(forbidden)) throw new Error(`新村1仍混入旧版或推断内容：${forbidden}`);
}
const attackedShipSteps = [...window.document.querySelectorAll('.quest-steps li')];
if (attackedShipSteps[6]?.querySelector('.step-item-action')) throw new Error('新村1战斗等待步骤仍被正文关键字误标为道具动作');
if (window.document.querySelector('.boss-card .actions-none')) throw new Error('新村1 BOSS仍显示无意义的行动次数“未记录”');
if (window.document.querySelector('.boss-card .item-tag')?.textContent.includes('黑暗鸟人')) throw new Error('黑暗鸟人仍被误标为道具');
const attackedShipBossText = window.document.querySelector('.boss-card')?.textContent || '';
for (const legacyBossFact of ['属性：地50', '不抗咒', '技能攻击防御']) {
  if (attackedShipBossText.includes(legacyBossFact)) throw new Error(`新村1 BOSS仍混入旧版目录数据：${legacyBossFact}`);
}
const attackedShipSource = window.document.querySelector('.source-card a')?.href || '';
if (!attackedShipSource.includes('b763b5eb-7835-423b-967d-f4a5c9bada60')) throw new Error('新村1仍链接旧版来源');

results = search('新村2');
results[0]?.click();
const northernIcefieldText = window.document.querySelector('#questDetail')?.textContent || '';
for (const expected of ['登陆北方冰原', '里谢里雅堡（52.61）', '2楼尽头房间（46.49）', '管理官（57.87）', '金牛服的管理官位于里谢里雅堡中庭', '双子服位于名人堂门口北边', '等待约5分钟后再与管理员对话', '等待约2分钟后与船长（44.25）', '等待2分钟后下船']) {
  if (!northernIcefieldText.includes(expected)) throw new Error(`新村2路线缺少坐标或等待信息：${expected}`);
}

results = search('半山1');
results[0]?.click();
if (window.document.querySelectorAll('.chain-card .chain-node').length !== 9) throw new Error('真实的半山系列关系链未被保留');

results = search('死神的降临');
results[0]?.click();
const rainKeyItems = window.document.querySelector('.key-items-card')?.textContent || '';
if (!rainKeyItems.includes('冥界之雨') || !rainKeyItems.includes('死与新生')) throw new Error('冥界之雨没有标明后续任务用途');
const rainRewards = window.document.querySelector('.rewards-card')?.textContent || '';
if (rainRewards.includes('冥界之雨')) throw new Error('纯流程关键道具冥界之雨仍在下方道具获取区重复展示');

results = search('六曜之塔');
results[0]?.click();
const sixTowerRewards = window.document.querySelector('.rewards-card')?.textContent || '';
const dragonSoulCards = [...window.document.querySelectorAll('.structured-reward-list .acquisition-item')].filter(card => card.querySelector('h4')?.textContent.includes('老龙之魂'));
if (dragonSoulCards.length !== 1) throw new Error(`六曜之塔的老龙之魂应合并为1张物品资料卡，实际为 ${dragonSoulCards.length}`);
if (!['流程第 3 步', '流程第 8 步', '耐久 2', '不可交易'].every(text => dragonSoulCards[0].textContent.includes(text))) throw new Error('老龙之魂的来源或属性没有完成字段化重组');
if (/杀龙之刃|血量约|HP≈|技能：|六曜4楼开始分/.test(dragonSoulCards[0].textContent)) throw new Error('老龙之魂物品卡仍混入战斗或路线原文');
if (!sixTowerRewards.includes('天空之枪') || sixTowerRewards.includes('攻击 160')) throw new Error('六曜之塔未按现行来源展示天空之枪，或仍混入旧装备属性');
if (sixTowerRewards.includes('原攻略掉落说明') && sixTowerRewards.includes('野队一般不使用')) throw new Error('精灵的水镜仍被误列为战斗掉落');
const sixTowerKeyNames = [...window.document.querySelectorAll('.key-item-card>header h3')].map(node => node.textContent);
if (sixTowerKeyNames.some(name => name.includes('空间裂隙水晶'))) throw new Error('其他任务取得的空间裂隙水晶被误判为六曜之塔产出');

results = search('娜蕾希亚的宝藏');
results[0]?.click();
for (const itemName of ['魔界风水盘', '乐于助人的奖章']) {
  const itemCard = [...window.document.querySelectorAll('.acquisition-item')].find(card => card.querySelector('h4')?.textContent.includes(itemName));
  const eventCard = itemCard?.closest('.acquisition-event-card');
  if (!itemCard || !eventCard) throw new Error(`娜蕾希亚的宝藏缺少物品资料：${itemName}`);
  if (!eventCard.querySelector('header span')?.textContent.includes('流程第 8 步')) throw new Error(`${itemName}没有归入结构化流程奖励事件`);
}

results = search('2021~2026勇气max强化版');
results[0]?.click();
if (!window.document.querySelector('.detail-head h2')?.textContent.includes('勇气max')) throw new Error('勇气max 别名无法定位到正式任务');
const courageSummary = window.document.querySelector('#questDetail > .summary')?.textContent || '';
if (courageSummary !== window.QUEST_DATA.quests['catalog-0504a6b1-500a-47a0-982a-70a6b36cca6b'].metadata.summary) throw new Error('勇气max 页首摘要未直接读取结构化字段');
const courageSteps = window.document.querySelectorAll('.guide-card .quest-steps > li');
if (courageSteps.length !== 3) throw new Error(`勇气max 主流程应为3步，实际为 ${courageSteps.length}`);
const courageGuide = window.document.querySelector('.guide-card')?.textContent || '';
if (!courageGuide.includes('付5000G进入1阶') || !courageGuide.includes('再次对话，传送至勇气训练所')) throw new Error('勇气max 第2步补充信息不完整');
if (/[-=—－_]{20,}/.test(courageGuide)) throw new Error('勇气max 仍把原文分隔线显示成步骤补充');
const courageStart = window.document.querySelector('.guide-meta>div:first-child')?.textContent || '';
if (/得到【招募信息】|双击可获得消息/.test(courageStart)) throw new Error('勇气max 起点仍与第1步重复展示完整取得动作');
const courageNotes = window.document.querySelector('.guide-card .quest-notes')?.textContent || '';
for (const leaked of ['2026打法参考', '2024第4战', '名称：水之残影']) {
  if (courageNotes.includes(leaked)) throw new Error(`勇气max 的版本资料仍泄漏到全局注意事项：${leaked}`);
}
const courageBosses = window.document.querySelector('.boss-card')?.textContent || '';
for (const expected of ['2024', '2026', '2021～2022', '恶即斩的克罗卡涅', 'Lv.105']) {
  if (!courageBosses.includes(expected)) throw new Error(`勇气max 结构化战斗区缺少：${expected}`);
}
const courageBossTitles = [...window.document.querySelectorAll('.boss-card .boss-heading h4')].map(node => node.textContent);
if (courageBossTitles.some(title => title.includes('2阶 · ：树海四斗神加强版') || title.includes('BOSS战信息：（by：Level.1）（皆为2动；仅供参考）'))) {
  throw new Error('勇气max 仍把来源栏文字或错误前导标点显示成战斗标题');
}
if (!courageBosses.includes('BOSS战信息：（by：Level.1）（皆为2动；仅供参考）')) throw new Error('勇气max 数据源中的战斗说明被静默丢弃');
for (const expected of ['2阶 · 树海四斗神加强版', '2阶 · 第4关 · 回来报仇的吉拉与四残影', '回来报仇的吉拉（连击）Lv.100 2动', '水之残影Lv.120 2动', '螳螂Lv.100～120 2动', '土之斗神Lv.99 2动']) {
  if (!courageBosses.replace(/\s+/g, '').includes(expected.replace(/\s+/g, ''))) throw new Error(`勇气max 战斗资料缺少完整标题、等级或行动次数：${expected}`);
}
const courageRewards = window.document.querySelector('.rewards-card')?.textContent || '';
for (const expected of ['2024', '2025', '2026', '1阶', '2阶']) {
  if (!courageRewards.includes(expected)) throw new Error(`勇气max 版本奖励区缺少：${expected}`);
}
const courageRewardSections = [...window.document.querySelectorAll('.rewards-card .reward-subsection')];
const courageRewardAccordions = [...window.document.querySelectorAll('.rewards-card .reward-accordion')];
if (courageRewardAccordions.length !== courageRewardSections.length || courageRewardAccordions.length !== 6) throw new Error('勇气max 奖励没有全部使用版本折叠排版');
if (!courageRewardAccordions[0].open || courageRewardAccordions.slice(1).some(section => section.open)) throw new Error('勇气max 应仅默认展开最新版本奖励');
if (!courageRewardAccordions[0].querySelector('summary')?.textContent.includes('2026 · 2阶')) throw new Error('勇气max 最新奖励分组没有置于首位');
const courageTier1 = courageRewardSections.find(section => section.querySelector('h3')?.textContent.includes('2021～2022 · 1阶'));
const courageTier2 = courageRewardSections.find(section => section.querySelector('h3')?.textContent.includes('2021～2022 · 2阶'));
const courageTier1Pool = [...(courageTier1?.querySelectorAll('.acquisition-event-card') || [])].find(card => card.querySelector('header span')?.textContent.includes('随机奖池'));
const courageTier2Pool = [...(courageTier2?.querySelectorAll('.acquisition-event-card') || [])].find(card => card.querySelector('header span')?.textContent.includes('随机奖池'));
if (!courageTier1Pool?.querySelector('header b')?.textContent.includes('4 项道具') || !['9C装备核心材料', '梦幻想签名专辑', '小护士家庭号', '魔力之泉'].every(name => courageTier1Pool.textContent.includes(name))) {
  throw new Error('勇气max 2021～2022·1阶奖池被跨档位去重或归组错误');
}
if (!courageTier2Pool?.querySelector('header b')?.textContent.includes('10 项道具') || !['9C装备核心材料', '阿夏芙之杖', '天空之枪', '帕鲁凯斯之斧', '村正', 'Lv.10各种宝石', '梦幻想签名专辑', '金刚不坏安全帽·改', '运气ΜΑΧ', '雾风的精华'].every(name => courageTier2Pool.textContent.includes(name))) {
  throw new Error('勇气max 2021～2022·2阶奖池被跨档位去重或归组错误');
}
const courageRewardCards = [...window.document.querySelectorAll('.rewards-card .acquisition-item')];
const cardsNamed = name => courageRewardCards.filter(card => card.querySelector(':scope > h4')?.textContent.includes(name));
const latestRewardCard = name => [...courageRewardAccordions[0].querySelectorAll('.acquisition-item')].find(card => card.querySelector(':scope > h4')?.textContent.includes(name));
for (const [name, expectedFacts] of [
  ['光辉之心', ['10C', '合成任意一种光辉', '青龙的庇护', '资料来源']],
  ['骷髅战士改造图', ['宠物改造图', 'Lv.1改造骷髅战士', '不死系', '体27／攻43／防24／敏17／魔14', '魔力百科·改造骷髅战士']],
  ['10紫、10骑宝石', ['完美的紫水晶', '完美的骑士宝石', '武器：防御+80、攻击+10%', '未说明两者同时获得还是随机其一']],
  ['时间水晶 Lv1', ['恢复1小时工作时间', '不可交易', '魔力常用词解释']],
  ['奇怪的药草', ['技能经验', '+100', '每组叠加', '99 个']],
  ['技能学习证', ['随机传送至某一技能学习房间', '可习得技能', '洁净魔法', '云群的祈祷']],
  ['闪光飞鹰精华', ['Lv.1闪光飞鹰', '飞行系', '水50／风50', '体22／攻35／防13／敏48／魔7']],
  ['纯白冰淇淋招待券', ['任意等级纯白吓人箱', 'Lv.1纯白冰淇淋吓人箱', '金属系', '技能栏9 格']],
  ['极运MAX', ['Lv.1安泊之蕊', '植物系', '总档125D', '命中+10']]
]) {
  const card = latestRewardCard(name);
  if (!card || !expectedFacts.every(text => card.textContent.includes(text))) throw new Error(`勇气max 2026奖励道具资料不完整：${name}`);
  if (!card.querySelector('.reward-reference-list a[target="_blank"][rel~="noopener"]')) throw new Error(`勇气max 2026奖励缺少可追溯百科来源：${name}`);
}
for (const card of cardsNamed('村正')) {
  if (!['Lv.8', '剑类', '攻击 240', '耐久 300', '奥义·连击耗魔减少100%', '属性来源：魔力装备档案/index.html'].every(text => card.textContent.includes(text))) {
    throw new Error('勇气max 的村正没有展示装备档案属性');
  }
}
const skySpearCard = cardsNamed('天空之枪')[0];
if (!skySpearCard || !['攻击 160', '命中 40', '反击 6', '耐久 300'].every(text => skySpearCard.textContent.includes(text))) {
  throw new Error('勇气max 的天空之枪没有展示完整装备属性');
}
const ashafCard = cardsNamed('阿夏芙之杖')[0];
if (!ashafCard || !['阿夏芙之杖（地）', '阿夏芙之杖（风）', '阿夏芙之杖（火）', '阿夏芙之杖（水）', '魔攻 290', '超强冰冻魔法技能耗魔减少10%'].every(text => ashafCard.textContent.includes(text))) {
  throw new Error('勇气max 的阿夏芙之杖四种型号没有按装备档案展示');
}
if (/强化围巾兔|天使之翼/.test(courageBosses)) throw new Error('勇气max 的宠物奖励被渲染成敌人卡');
for (const enemyName of window.document.querySelectorAll('.boss-card .enemy-card header>b')) {
  if (/^(?:技能\s*[：:]?|[、，,]|(?:强力|超强).*(?:魔法|攻击)|大地之怒)/.test(enemyName.textContent.trim())) {
    throw new Error(`勇气max 技能续行仍被渲染成敌人卡：${enemyName.textContent.trim()}`);
  }
}
if ([...window.document.querySelectorAll('.boss-card .enemy-card header>b')].some(node => /2种随机/.test(node.textContent))) throw new Error('勇气max 2026 战斗概述仍显示成敌人卡');
if (![...window.document.querySelectorAll('.version-change-list')].some(node => node.textContent.includes('第5关调整'))) throw new Error('勇气max 2026 第5关调整没有独立展示');
if (courageRewards.includes('原文未列独立物品名')) throw new Error('勇气max 奖励仍生成匿名物品卡');
const albumCard = [...window.document.querySelectorAll('.rewards-card .acquisition-event-card')].find(card => card.textContent.includes('梦幻想白金唱片Ⅰ号-Ⅹ号'));
if (!albumCard || !['等级 6', '种类 护身符', '攻击 +10～+15', '称号效果', 'Ⅰ 补血魔法：耗魔 -15%', 'Ⅹ 混乱攻击：耗魔 -15%'].every(text => albumCard.textContent.includes(text))) {
  throw new Error('勇气max 梦幻想白金唱片未按物品、属性和型号效果重组展示');
}

results = search('新手训练');
results[0]?.click();
const trialWeaponCard = [...window.document.querySelectorAll('.rewards-card .acquisition-item')].find(card => card.textContent.includes('试用平民武器之一'));
const trialWeaponText = trialWeaponCard?.textContent || '';
if (!trialWeaponCard || ![
  '武器试用券 · 消耗 1 点耐久',
  '试用平民剑 攻击 +18、耐久 2、登出消失',
  '试用平民斧 攻击 +22、防御 -1、敏捷 -5、必杀 +18、耐久 2、登出消失',
  '试用平民枪 攻击 +15、反击 +6、命中 +3、耐久 2、登出消失',
  '试用平民杖 攻击 +5、精神 +10、魔攻 +8、耐久 2、登出消失'
].every(text => trialWeaponText.includes(text))) {
  throw new Error('新手训练的试用平民武器名称、属性或兑换耐久未正确展示');
}
if ([...trialWeaponCard.querySelectorAll('.versioned-reward-effects li')].some(item => !item.textContent.trim())) {
  throw new Error('新手训练的试用平民武器仍生成空白型号项目');
}

results = search('霞之洞窟');
results[0]?.click();
const glassEarringCard = [...window.document.querySelectorAll('.rewards-card .acquisition-item')].find(card => card.querySelector('h4')?.textContent.includes('玻璃耳环'));
const glassEarringText = glassEarringCard?.textContent || '';
if (!glassEarringCard || !['未鉴定名称 【耳饰？】', '等级 1', '种类 耳环', '魅力 +20', '耐久 50', '可交易'].every(text => glassEarringText.includes(text))) {
  throw new Error('霞之洞窟没有按鉴定前后名称及完整属性展示玻璃耳环');
}

results = search('追击');
results.find(option => option.dataset.questId === 'catalog-f1b868b5-03dc-43c4-a547-c5db346a2e80')?.click();
const pursuitFightTitles = [...window.document.querySelectorAll('.boss-heading h4')].map(node => node.textContent.trim());
if (!['改造火焰牛鬼', '阿鲁巴斯'].every(title => pursuitFightTitles.includes(title)) || pursuitFightTitles.some(title => title.includes('undefined'))) {
  throw new Error(`追击的无标题战斗或等级消歧显示错误：${pursuitFightTitles.join('、')}`);
}

results = search('亚留特的守护');
results.find(option => option.dataset.questId === 'bagua-1')?.click();
const baguaFightText = window.document.querySelector('.boss-card')?.textContent || '';
for (const expected of [
  '战斗与区域魔物', '流浪狗的聚集地', '被激怒的流浪狗（地狱看门犬）', 'Lv.70', '数量 1～4',
  '随机迷宫', '约层数', '12～18', '有宝箱', '否', '在流浪狗窝点与艮对话',
  '艮之影', 'Lv.95', '血量约20000', '邪魔系', '属性：全30', '抗咒',
  '攻击', '圣盾', '中毒魔法LV10', '超强陨石魔法LV7', '战栗袭心LV4', '气功弹LV5',
  '乾坤一掷', '气功弹EX（魔法值<10%时追加）'
]) {
  if (!baguaFightText.includes(expected)) throw new Error(`亚留特的守护没有完整显示数据源字段：${expected}`);
}
if (baguaFightText.includes('原攻略未提供敌人参数')) throw new Error('亚留特的守护仍错误显示敌人参数缺失');

results = search('维诺亚牛的守护');
results.find(option => option.dataset.questId === 'bagua-2')?.click();
const kunFightText = window.document.querySelector('.boss-card')?.textContent || '';
for (const expected of ['坤之意志', 'Lv.80', '2动', '血量约20000', '邪魔系', '属性：全25', '火焰魔法LV10', '强力火焰魔法LV9', '超强火焰魔法LV10', '火焰的祈祷LV4', '火焰的祈祷LV10', '脱下装备首饰合击']) {
  if (!kunFightText.includes(expected)) throw new Error(`维诺亚牛的守护没有完整显示原攻略战斗资料：${expected}`);
}
const kunFightCards = [...window.document.querySelectorAll('.boss-fight')];
const kunFightTitles = kunFightCards.map(card => card.querySelector('.boss-heading h4')?.textContent.trim() || '');
if (!['连续战斗 · 第1场', '连续战斗 · 第2场'].every(title => kunFightTitles.includes(title))) {
  throw new Error(`维诺亚牛的守护没有按数据源拆分两场连续战斗：${kunFightTitles.join('、')}`);
}
const kunFirstFight = kunFightCards.find(card => card.querySelector('.boss-heading h4')?.textContent.trim() === '连续战斗 · 第1场')?.textContent || '';
const kunSecondFight = kunFightCards.find(card => card.querySelector('.boss-heading h4')?.textContent.trim() === '连续战斗 · 第2场')?.textContent || '';
if (!['试作型牛鬼', '试作型腐尸', '僵尸'].every(name => kunFirstFight.includes(name)) || !kunSecondFight.includes('坤之意志')) {
  throw new Error('维诺亚牛的守护连续两战的敌人归属与数据源不一致');
}
if ([...window.document.querySelectorAll('.structured-source-details dt')].some(node => /consecutive\s*battles/i.test(node.textContent))) {
  throw new Error('维诺亚牛的守护页面仍泄漏 consecutiveBattles 内部字段名');
}

results = search('奇利的诱拐事件');
results.find(option => option.dataset.questId === 'xuanwu-pre')?.click();
const abductionFightText = window.document.querySelector('.boss-card')?.textContent || '';
for (const expected of [
  '小怪数量', '随机', '召唤条件', '场上单位少于5时召唤4个腐尸或僵尸',
  '自爆条件', '血量低于50%', '我方有满血单位',
  '有群攻且等级高可全杀，否则先单点最终决战型牛鬼'
]) {
  if (!abductionFightText.includes(expected)) throw new Error(`奇利的诱拐事件没有按数据源语义显示战斗字段：${expected}`);
}
if ([...window.document.querySelectorAll('.boss-card dt')].some(node => node.textContent.trim() === '补充信息')) {
  throw new Error('奇利的诱拐事件仍使用无语义“补充信息”标签');
}

results = search('玄武之境');
results.find(option => option.dataset.questId === 'xuanwu')?.click();
const xuanwuFightText = window.document.querySelector('.boss-card')?.textContent || '';
for (const expected of ['迪次郎', 'Lv.39', '血量约1000', '攻击', '防御', '圣盾', '玄武', 'Lv.120', '不抗石化']) {
  if (!xuanwuFightText.includes(expected)) throw new Error(`玄武之境没有完整显示原攻略战斗资料：${expected}`);
}
if (/not-resistant|\bresistant\b/.test(xuanwuFightText)) throw new Error('玄武之境仍向页面泄漏内部抗性枚举值');
const abyssFight = [...window.document.querySelectorAll('.boss-fight')].find(card => card.querySelector('.boss-heading h4')?.textContent.trim() === '玄武之渊');
const abyssChangeLog = abyssFight?.querySelector('[data-source-field="changeLog"]')?.textContent || '';
for (const expected of ['日期', '2024-04-17', '变更前魔物数量', '2～7', '变更后魔物数量', '4～7', '约经验倍率', '1.25']) {
  if (!abyssChangeLog.includes(expected)) throw new Error(`玄武之渊变更记录没有正确显示数据源字段：${expected}`);
}
if (abyssChangeLog.includes('补充信息')) throw new Error('玄武之渊变更记录仍使用无语义标签');

results = search('周期性贩卖设计图NPC');
results.find(option => option.dataset.questId === 'catalog-6eff36c7-723a-4e75-90be-992bfab3bb58')?.click();
const periodicOffers = [...window.document.querySelectorAll('.rewards-card .periodic-offer')];
if (periodicOffers.length !== 46) throw new Error(`周期商店应展示46条上架记录，实际为 ${periodicOffers.length}`);
for (const expected of [
  ['神盾设计图', '2026-07-29', 'A~E', '100,000G／张', '改造神盾', '23 / 8 / 28 / 20 / 46'],
  ['海底龟设计图', '2026-05-27', 'A~D', '125,000G／张', '苏卡达龟', '40 / 43 / 17 / 16 / 9'],
  ['烟雾设计图', '2026-03-25', 'A~D', '125,000G／张', '湿气', '23 / 13 / 7 / 40 / 42'],
  ['赤熊设计图', '2026-01-21', 'A~D', '125,000G／张', '枫焰熊', '39 / 41 / 19 / 17 / 9']
]) {
  const card = periodicOffers.find(item => item.textContent.includes(expected[0]));
  if (!card || !expected.every(text => card.textContent.includes(text))) throw new Error(`周期商店上架记录缺失或字段不完整：${expected[0]}`);
}

const allQuestIds = search('').map(option => option.dataset.questId);
const structuredValues = value => Array.isArray(value) ? value : Object.values(value || {});
const genericSupplementFields = new Map();
const renderedStructuredBattleCount = record => Object.values(record.versions || {}).reduce((versionTotal, version) => versionTotal + Object.values(version.tiers || {}).reduce((tierTotal, tier) => {
  const encounterCount = structuredValues(tier.encounters).filter(encounter => structuredValues(encounter.enemies).length).length;
  return tierTotal + encounterCount + Object.values(tier.battles || {}).reduce((battleTotal, battle) => {
    const randomBranches = structuredValues(battle.randomOneOf);
    if (randomBranches.length) return battleTotal + randomBranches.filter(branch => structuredValues(Array.isArray(branch) ? branch : branch?.enemies).length).length;
    const consecutiveCount = Number(battle.consecutiveBattles || 0);
    const enemies = structuredValues(battle.enemies);
    if (consecutiveCount > 1 && enemies.some(enemy => Number(enemy?.battle) > 0)) {
      return battleTotal + Array.from({length:consecutiveCount}, (_, index) => index + 1)
        .filter(battleNumber => enemies.some(enemy => Number(enemy?.battle) === battleNumber)).length;
    }
    const rounds = structuredValues(battle.rounds);
    if (rounds.length) return battleTotal + rounds.filter(round => structuredValues(round?.enemies).length).length;
    return battleTotal + (enemies.length ? 1 : 0);
  }, 0);
}, 0), 0);
for (const questId of allQuestIds) {
  const option = search('').find(item => item.dataset.questId === questId);
  option?.click();
  const detailText = window.document.querySelector('#questDetail')?.textContent || '';
  const title = window.document.querySelector('.detail-head h2')?.textContent || questId;
  if (window.document.querySelector('.summary')?.textContent.includes('怀旧服任务（已关闭）；怀旧服任务（已关闭）')) throw new Error(`活动摘要重复关闭状态: ${title}`);
  const structuredRecord = window.QUEST_DATA?.quests?.[questId];
  if (structuredRecord?.verification?.status !== 'verified') throw new Error(`任务没有使用已核验结构化记录: ${title}`);
  if (/完整任务流程尚待核验|请先查看“练级路线”|关系已收录 · 详情待核验/.test(detailText)) throw new Error(`任务仍显示空壳页: ${title}`);
  if (/\bundefined\b/.test(detailText)) {
    const undefinedAt = detailText.indexOf('undefined');
    throw new Error(`任务页面泄漏未定义值: ${title} -> ${detailText.slice(Math.max(0, undefinedAt - 60), undefinedAt + 80)}`);
  }
  if (/not-resistant|\bresistant\b/.test(detailText)) throw new Error(`任务页面泄漏内部抗性枚举值: ${title}`);
  if (detailText.includes('道具服')) throw new Error(`任务页面仍显示道具服资料: ${title}`);
  const genericDetails = [...window.document.querySelectorAll('.structured-source-details')].find(node => node.textContent.includes('补充信息'));
  if (genericDetails) {
    const compactDetails = genericDetails.textContent.replace(/\s+/g, ' ').trim();
    const genericAt = compactDetails.indexOf('补充信息');
    throw new Error(`结构化资料仍包含无语义标签: ${title} -> ${compactDetails.slice(Math.max(0, genericAt - 180), genericAt + 260)}`);
  }
  if ([...window.document.querySelectorAll('.rewards-card .acquisition-event-card header>em')].some(node => /(?:来源\s*)?第\s*\d+(?:\s*、\s*\d+)*\s*行/.test(node.textContent))) {
    throw new Error(`奖励区仍向玩家显示内部来源行号: ${title}`);
  }
  for (const label of window.document.querySelectorAll('.structured-source-details dt')) {
    if (/^[A-Za-z][A-Za-z\s_-]*$/.test(label.textContent.trim())) throw new Error(`页面泄漏内部数据字段名: ${title} -> ${label.textContent.trim()}`);
    if (label.textContent.trim() === '补充信息') {
      const field = label.closest('[data-source-field]')?.dataset.sourceField || '(unknown)';
      if (!genericSupplementFields.has(field)) genericSupplementFields.set(field, title);
    }
  }
  window.document.querySelector('[data-detail-tab="task"]')?.click();
  if (window.document.querySelector('[data-source-field="battleRef"], [data-source-field="battleRefs"], [data-source-field="allowsIntermediateOutputThenInput"]')) {
    throw new Error(`流程泄漏内部引用或校验开关: ${title}`);
  }
  const renderedSteps = [...window.document.querySelectorAll('.quest-steps > li')];
  if (window.document.querySelector('.boss-fight [data-source-field="key"], .boss-fight [data-source-field="heading"], .boss-fight [data-source-field="headings"]')) throw new Error(`战斗包装字段泄漏: ${title}`);
  if ([...window.document.querySelectorAll('.guide-meta>div')].some(card => !card.querySelector('b') && !card.querySelector('li'))) throw new Error(`流程空条件卡: ${title}`);
  if (!renderedSteps.length) throw new Error(`任务没有流程步骤: ${title}`);
  if (renderedSteps.length !== structuredRecord.flow.steps.length) throw new Error(`结构化流程步骤数量不一致: ${title}`);
  const coreStepFields = new Set(['id','order','text','route','branch','notes','inputs','outputs','choices','quiz','commands','operations','branchGroups','afterOperations','battleRef','battleRefs','allowsIntermediateOutputThenInput','sourceLines','verification','presentationFacts','presentationInteractions','presentationSections','equipmentRefs','duplicateSourceLines']);
  structuredRecord.flow.steps.forEach((step, stepIndex) => {
    const renderedSupplementFields = new Set([...renderedSteps[stepIndex].querySelectorAll('[data-source-field], [data-fact-key], [data-step-field]')].map(node => node.dataset.sourceField || node.dataset.factKey || node.dataset.stepField));
    ['rewardEventRefs','rewardEventRef','rewardPool'].forEach(key => renderedSupplementFields.add(key));
    if (renderedSteps[stepIndex].querySelector('[data-fact-key="rewardEventRefs"]')) throw new Error(`流程重复展开奖励奖池: ${title}/${step.id}`);
    if (step.optional === true && step.branch) {
      if (renderedSteps[stepIndex].closest('.step-route')?.querySelector('h4')?.textContent !== step.branch) throw new Error(`可选支线分组标题遗漏: ${title}/${step.id}`);
      renderedSupplementFields.add('optional');
    }
    if (renderedSteps[stepIndex].querySelector('[data-fact-key^="inputs-"], [data-fact-key^="outputs-"]')) throw new Error(`流程重复展开输入输出元数据: ${title} -> ${step.id}`);
    for (const fact of step.presentationFacts || []) {
      const factNode = [...renderedSteps[stepIndex].querySelectorAll('[data-fact-key]')].find(node => node.dataset.factKey === fact.key);
      if (!factNode?.textContent.includes(fact.text)) throw new Error(`步骤语义字段未完整展示: ${title} -> ${step.id}.${fact.key}`);
    }
    if (renderedSupplementFields.has('rewardEventRefs')) ['rewardEventRef','rewardPool'].forEach(key => renderedSupplementFields.add(key));
    for (const section of step.presentationSections || []) {
      const node = [...renderedSteps[stepIndex].querySelectorAll('[data-step-field]')].find(node => node.dataset.stepField === section.key);
      if (!node) throw new Error(`流程独立资料未展示: ${title} -> ${step.id}.${section.key}`);
      for (const row of section.rows || []) if (!node.textContent.includes(row.label) || !node.textContent.includes(row.text)) throw new Error(`流程表格资料遗漏: ${title} -> ${step.id}.${section.key}`);
    }
    const actionLabels = [...renderedSteps[stepIndex].querySelectorAll('.step-actions .step-item-action')].map(node => node.textContent);
    if (Boolean(step.commands?.length) !== actionLabels.includes('输入文字')) throw new Error(`输入文字标签与数据不一致: ${title} / ${step.id}`);
    const operations = [...renderedSteps[stepIndex].querySelectorAll('.step-operations > li')];
    if (operations.length !== (step.operations || []).length + (step.afterOperations || []).length + (step.branchGroups || []).reduce((sum, group) => sum + group.operations.length, 0)) throw new Error(`操作列表遗漏: ${title} / ${step.id}`);
    for (const field of Object.keys(step).filter(key => !coreStepFields.has(key))) {
      if (!renderedSupplementFields.has(field)) throw new Error(`步骤数据源字段未展示: ${title} -> ${step.id}.${field}`);
    }
  });
  if (structuredRecord.id === 'catalog-81bfbcc2-e4f6-45ba-94ac-11f4ec5a45e0') {
    if (renderedSteps.length !== 4) throw new Error('猎人主流程步骤漂移');
    const texts = renderedSteps.map(step => step.textContent);
    if (!texts[0].includes('学习技能') || !texts[0].includes('3个技能栏')) throw new Error('狩猎体验技能说明遗漏');
    if (!texts[1].includes('使用技能') || texts[1].includes('使用道具') || texts[1].includes('道具要求')) throw new Error('狩猎体验仍误作道具');
    for (const coordinate of ['（654.247）','（652.228）']) if (!texts[1].includes(coordinate)) throw new Error('猎人采集坐标遗漏');
    if (!texts[1].includes('不可交易') || !texts[1].includes('登出后消失')) throw new Error('鹿皮生命周期说明遗漏');
    if (!texts[2].includes('步行返回') || !texts[2].includes('不要登出')) throw new Error('猎人交付安全条件遗漏');
    if (!texts[3].includes('（35.25）') || !texts[3].includes('（13.16）') || !texts[3].includes('就职')) throw new Error('猎人就职坐标遗漏');
    if (renderedSteps.slice(0,2).some(step => [...step.querySelectorAll('.item-tag')].some(tag => tag.textContent.includes('狩猎体验')))) throw new Error('技能仍使用物品标记');
    const section = window.document.querySelector('.guide-appendix .guide-section');
    for (const fact of ['（486.199）','X=472～500','Y=198～220','100G','换线']) if (!section?.textContent.includes(fact)) throw new Error(`正式狩猎学习资料遗漏: ${fact}`);
  }
  if (structuredRecord.id === 'catalog-12cc7fb2-f639-4a9b-8627-4b66ead3bf9d') {
    // 对原文逐步核查坐标、输入口令与取得/交出道具，避免“原文存在”掩盖流程遗漏。
    const rawLines = new Map(structuredRecord.source.rawLines.map(line => [line.line, line.text]));
    structuredRecord.flow.steps.forEach((step, index) => {
      const text = renderedSteps[index].textContent;
      for (const line of step.sourceLines) {
        const raw = rawLines.get(line) || '';
        const coordinates = raw.match(/（\d+\.\d+）/g) || [];
        for (const coordinate of coordinates) {
          if (!text.includes(coordinate)) throw new Error(`忍者流程遗漏原文坐标: ${step.id} / 来源${line} / ${coordinate}`);
        }
        const commands = [...raw.matchAll(/输入“([^”]+)”/g)].map(match => match[1]);
        for (const command of commands) {
          if (!text.includes(command)) throw new Error(`忍者流程遗漏输入口令: ${step.id} / 来源${line} / ${command}`);
        }
      }
    });
    for (const index of [17,18,32]) {
      const branches = [...renderedSteps[index].querySelectorAll('.step-branch')];
      if (branches.length !== 2) throw new Error('忍者互斥路线未分段');
      if (branches.some(branch => !branch.querySelector('h5') || !branch.querySelector('ol'))) throw new Error('忍者分支缺少标题或独立操作列表');
      if (!branches[1].querySelector('h5 em')) throw new Error('忍者推荐路线未标记');
    }
    if (renderedSteps.some(step => [...step.querySelectorAll('.step-operations > li')].some(node => /^[⑴⑵]|^[（(][12][）)](?:战斗|行走|钥匙)/.test(node.textContent.trim())))) throw new Error('路线标题仍误列为操作');
    if (renderedSteps.length !== 35) throw new Error('忍者主流程没有重建为独立步骤');
    const rewardCards = [...window.document.querySelectorAll('.acquisition-item')];
    const ringCard = rewardCards.find(card => card.querySelector('h4')?.textContent.includes('岚的戒指'));
    const legacyCard = rewardCards.find(card => card.querySelector('h4')?.textContent.includes('岚的传承'));
    const mindCard = rewardCards.find(card => card.querySelector('h4')?.textContent.includes('心头灭却'));
    if (!ringCard?.textContent.includes('种族变为飞行系')) throw new Error('岚的戒指未展示具体种族变化');
    if (!legacyCard?.textContent.includes('连击耗魔减少25%')) throw new Error('岚的传承未展示连击减魔');
    if (!mindCard?.textContent.includes('装备限制忍者')) throw new Error('心头灭却未展示忍者装备限制');
    for (const card of [ringCard, legacyCard, mindCard]) {
      if (card.querySelectorAll('.reward-fact-list dt').length && [...card.querySelectorAll('.reward-fact-list dt')].some(node => ['等级','耐久','交易'].includes(node.textContent))) throw new Error('奖励基础属性仍重复显示');
      if ((card.textContent.match(/可交易/g) || []).length !== 1) throw new Error('奖励交易规则重复或遗漏');
      if (!card.closest('.compact-rewards')) throw new Error('短奖励资料未采用紧凑条目');
    }
    if (ringCard.querySelector('.reward-source-list')) throw new Error('共同额外来源仍在道具内重复');
    const extraSources = window.document.querySelector('.reward-extra-sources');
    if (!extraSources?.textContent.includes('岚的戒指') || !extraSources.textContent.includes('流程第 34 步')) throw new Error('共同额外来源遗漏对应道具或步骤');
    const expectedImageCounts = new Map([[18,3],[19,4],[21,1],[33,4]]);
    const sourceImages = structuredRecord.sourceSupplements?.images || [];
    if (sourceImages.length !== 12 || new Set(sourceImages.map(image => image.src)).size !== 8) throw new Error('忍者来源附图映射不完整');
    for (const [step, count] of expectedImageCounts) {
      const renderedImages = [...renderedSteps[step - 1].querySelectorAll('.source-images img')];
      if (renderedImages.length !== count) throw new Error(`忍者第${step}步路线图遗漏`);
      for (const image of renderedImages) if (!fs.existsSync(path.join(root,image.getAttribute('src')))) throw new Error('忍者路线图文件缺失');
    }

    for (const step of structuredRecord.flow.steps) {
      if ((step.operations || []).length || step.afterOperations?.length) throw new Error('忍者独立操作仍塞入顶层分组');
    }
    const labels = index => [...renderedSteps[index].querySelectorAll('.step-actions em')].map(node => node.textContent).join(',');
    if (labels(6) !== '输入文字' || labels(7) !== '取得道具,输入文字' || labels(8) !== '消耗道具') throw new Error('调查毒药的三步标签混用');
    if (window.document.querySelectorAll('.step-quiz tbody tr').length !== 20) throw new Error('忍者昼夜题库未完整展示20题');
    if (!renderedSteps[30].querySelector('.step-quiz') || !renderedSteps[31].textContent.includes('忍者公会会长')) throw new Error('答题与就职未拆成独立步骤');
    if (renderedSteps.some(step => /原攻略第\d+步/.test(step.textContent))) throw new Error('忍者流程含人为来源编号前缀');
    if (renderedSteps[30].querySelector('.structured-source-details')) throw new Error('忍者题库仍进入数据源补充');
    const sections = [...window.document.querySelectorAll('.guide-appendix .guide-section')];
    if (sections.length !== 3) throw new Error('辅助路线仍混入主步骤或遗漏');
    for (const [index, section] of structuredRecord.flow.sections.entries()) {
      const text = sections[index].textContent;
      for (const line of section.sourceLines) {
        for (const coordinate of rawLines.get(line)?.match(/（\d+\.\d+）/g) || []) {
          if (!text.includes(coordinate)) throw new Error(`辅助路线遗漏坐标: ${section.title}/${coordinate}`);
        }
      }
    }
    const battle = structuredRecord.versions.common.tiers.common.battles.meiz;
    if (battle.enemies.some(enemy => enemy.actionCount !== 2) || !window.document.querySelector('.boss-card')?.textContent.includes('召唤梅兹×4')) {
      throw new Error('梅兹二动或召唤条件遗漏');
    }
    const exchange = structuredRecord.rewardEvents.find(event => event.id === 'book-reward');
    if (exchange.items.some(item => item.properties?.level === 3 && item.name.startsWith('心头灭却'))) throw new Error('安丹兑换奖池串入另一分支心头灭却');
  }
  if (window.document.querySelector('.guide-meta')?.textContent.includes('[object Object]')) throw new Error(`结构化起点未正确渲染: ${title}`);
  const summaryText = window.document.querySelector('#questDetail > .summary')?.textContent || '';
  if (summaryText !== (structuredRecord.metadata?.summary || '')) throw new Error(`页首摘要未直接读取结构化字段: ${title}`);
  const structuredBattleCount = renderedStructuredBattleCount(structuredRecord);
  if (window.document.querySelectorAll('.boss-fight').length !== structuredBattleCount) throw new Error(`结构化战斗数量不一致: ${title}`);
  for (const fight of window.document.querySelectorAll('.boss-fight')) {
    if (!fight.querySelector('.enemy-card')) throw new Error(`页面生成了没有敌人实体的空战斗卡: ${title}`);
    const fightTitle = fight.querySelector('.boss-heading h4')?.textContent.trim() || '';
    if (/^(?:战斗\s+)?[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(fightTitle) || /(?:^| · )[a-z0-9]+(?:-[a-z0-9]+)+(?:$| · )/i.test(fightTitle)) {
      throw new Error(`页面泄漏内部战斗键: ${title} -> ${fightTitle}`);
    }
  }
  if (window.document.querySelector('.boss-card .no-enemy-record') || /原攻略未提供敌人参数|原攻略未单列 BOSS 数据/.test(window.document.querySelector('.boss-card')?.textContent || '')) {
    throw new Error(`页面仍显示空战斗占位内容: ${title}`);
  }
  for (const rewardGroup of window.document.querySelectorAll('.rewards-card .reward-subsection')) {
    if (rewardGroup.querySelector('.periodic-offer')) continue;
    const groupNames = [...rewardGroup.querySelectorAll('.acquisition-item h4 .item-tag')].map(node => node.textContent.trim());
    if (new Set(groupNames).size !== groupNames.length) throw new Error(`同一版本或档位内生成了重复道具卡: ${title}`);
  }
  const rewardText = window.document.querySelector('.rewards-card')?.textContent || '';
  const leakedRewardValue = rewardText.match(/\[object Object\]|\bnull\b/);
  if (leakedRewardValue) {
    throw new Error(`奖励区泄漏未格式化的数据值: ${title} -> ${rewardText.slice(Math.max(0, leakedRewardValue.index - 60), leakedRewardValue.index + 100).replace(/\s+/g, ' ')}`);
  }
  if ([...window.document.querySelectorAll('.rewards-card li')].some(node => !node.textContent.trim())) {
    throw new Error(`奖励区生成空白列表项: ${title}`);
  }
  const renderedRewardNames = new Set([...window.document.querySelectorAll('.rewards-card .acquisition-item h4')].map(node => node.textContent.replace(/[【】]/g, '').trim()));
  const rewardCardsWithScope = [...window.document.querySelectorAll('.rewards-card .acquisition-item[data-reward-name]')];
  for (const event of structuredRecord.rewardEvents || []) {
    const cards = rewardCardsWithScope.filter(card => card.dataset.rewardVersion === (event.version || 'common') && card.dataset.rewardTier === (event.tier || 'common'));
    for (const item of event.items.filter(item => item.role === 'valuable-result')) {
      const ownedCards = cards.filter(card => card.dataset.rewardName === item.name);
      for (const fact of [...(item.presentationFacts || []),...(item.presentationItemFacts || [])]) {
        const nodes = ownedCards.flatMap(card => [...card.querySelectorAll('[data-fact-key]')]);
        if (!nodes.some(node => node.dataset.factKey === fact.key && node.textContent.includes(fact.text))) throw new Error(`道具结构字段漏显或归属错误: ${title} / ${event.id} / ${item.name}.${fact.key}`);
        for (const section of fact.sections || []) {
          const sectionNodes = ownedCards.flatMap(card => [...card.querySelectorAll(`[data-step-field="${section.key}"]`)]);
          for (const row of section.rows || []) if (!sectionNodes.some(node => [...node.querySelectorAll('tbody tr')].some(tr => tr.querySelector('th')?.textContent === row.label && tr.querySelector('td')?.textContent === row.text))) throw new Error(`配方分组遗漏或归属错误: ${title} / ${item.name}.${section.key}.${row.label}`);
        }
        if (fact.questId && !ownedCards.some(card => card.querySelector(`[data-quest-id="${fact.questId}"]`))) throw new Error(`道具用途任务跳转缺失: ${title} / ${item.name}`);
      }
    }
    const eventNodes = [...window.document.querySelectorAll('[data-fact-event]')].filter(node => node.dataset.factEvent === event.id);
    if (eventNodes.some(node => node.closest('.acquisition-item'))) throw new Error(`共同事件规则仍复制到道具卡: ${title} / ${event.id}`);
    for (const fact of event.presentationFacts || []) if (eventNodes.filter(node => node.dataset.factKey === fact.key).length > 1) throw new Error(`共同事件规则重复展示: ${title} / ${event.id}.${fact.key}`);
    for (const fact of event.presentationFacts || []) {
      if (!event.items.some(item => item.role === 'valuable-result')) continue;
      // A fact identical to the primary source may share its existing event header;
      // a differing fact must remain marked with its own event evidence.
      if (!eventNodes.some(node => node.dataset.factKey === fact.key && node.textContent.includes(fact.text))) {
        const sameFact = cards.some(card => card.closest('.reward-subsection')?.textContent.includes(fact.text));
        if (!sameFact) throw new Error(`获得事件条件遗漏: ${title} / ${event.id}.${fact.key}`);
      }
    }
  }
  for (const rewardItem of (structuredRecord.rewardEvents || []).flatMap(event => event.items || []).filter(item => item.role === 'valuable-result' && !(item.purchase && item.resultPet))) {
    const resolvedName = rewardItem.displayName || rewardItem.identifiedName || rewardItem.appraisalResult || rewardItem.identifiedAs || rewardItem.name;
    if (typeof resolvedName === 'string' && !renderedRewardNames.has(resolvedName)) {
      throw new Error(`鉴定后或规范道具名未展示: ${title} -> ${resolvedName}`);
    }
  }
  for (const note of window.document.querySelectorAll('.acquisition-item li')) {
    if (note.closest('.periodic-offer')) continue;
    if (/(?:随机迷宫|固定地图|迷宫约?\d+层|魔物[为：:]|血量约|技能[：:]|\d+\s*动(?:，|,))/.test(note.textContent)) {
      throw new Error(`道具属性卡混入路线或战斗资料: ${title} -> ${note.textContent.slice(0, 80)}`);
    }
  }
}

results = search('王宫食堂'); results[0]?.click();
const kitchenText = window.document.querySelector('#questDetail').textContent;
const cookingRows = [...window.document.querySelectorAll('[data-step-field="inputs"] tbody tr')];
for (const [dish,time] of [['蛋包饭','1～2'],['亲子丼','1～3'],['寿喜锅','10～15'],['魅惑的哈密瓜面包','2～7'],['醋饭寿司','5～7'],['鳖料理','1～2'],['鱼翅汤','2～3']]) {
  if (!cookingRows.some(row => row.querySelector('th')?.textContent === dish && row.querySelector('td')?.textContent === time)) throw new Error(`王宫食堂料理时间归属错误: ${dish}`);
}
if (kitchenText.includes('failure') || ![...window.document.querySelectorAll('.step-route > h4')].some(title => title.textContent === '不合格厨师路线')) throw new Error('王宫食堂失败路线标题错误');
for (const text of ['（111.148）','（72.104）','制作后经过时间（分钟）','蛋包饭','1～2','10～15','料理技能耗魔减少（%）','10']) if (!kitchenText.includes(text)) throw new Error(`王宫食堂结构事实遗漏: ${text}`);
const seasoningCards = [...window.document.querySelectorAll('[data-reward-name="味精"]')];
if (seasoningCards.length !== 1 || !seasoningCards[0].textContent.includes('额外回复10点魔力')) throw new Error('味精多来源合并遗漏独立用途或生成重复卡');
if (kitchenText.includes('step-2-or-tomato')) throw new Error('王宫食堂失效引用泄漏');
results = search('娜蕾希亚的邀请'); results[0]?.click();
const memoryCard = window.document.querySelector('[data-reward-name="被支配的记忆"]');
if (memoryCard?.querySelector('[data-fact-key="reusable"]')?.textContent !== '可重复使用') throw new Error('可重复使用规则仍显示布尔字段');
const recipeCard = window.document.querySelector('[data-reward-name="头目帽子的制法"]');
if (recipeCard?.querySelectorAll('[data-step-field="recipe-materials"] tbody tr').length !== 4 || !recipeCard?.querySelector('[data-step-field="recipe-result"]')?.textContent.includes('头目帽子')) throw new Error('头目帽子配方材料/成品分组错误');
if (!memoryCard || !memoryCard.textContent.includes('传送至头目的房间前') || !memoryCard.textContent.includes('不可交易')) throw new Error('可重复传送道具未保留用途和规则');
const memoryKey = window.document.querySelector('.key-items-card');
if (!memoryKey?.textContent.includes('被支配的记忆') || !memoryKey.textContent.includes('重复任务路线') || !memoryKey.textContent.includes('完成后')) throw new Error('被支配的记忆重复路线未进入关键道具去向');
if (window.document.querySelector('.detail-badges').textContent.includes('已核验')) throw new Error('页面仍用整理标记声称资料已通过实际验收');
results = search('2023暑期特别活动'); results[0]?.click();
const summerPointsProbability = window.document.querySelector('[data-reward-name="天梯赛积分"] [data-fact-key="probabilityApprox"]')?.textContent;
if (!summerPointsProbability?.includes('概率（%）：16') || summerPointsProbability.includes('减少比例')) throw new Error('2023暑期奖励概率误标为减少比例或遗漏16%');

if (genericSupplementFields.size) {
  throw new Error(`页面仍使用无语义“补充信息”标签：${[...genericSupplementFields].map(([field, title]) => `${field}（${title}）`).join('、')}`);
}
if (runtimeErrors.length) throw runtimeErrors[0];
console.log(`DOM verified: ${allQuestIds.length} task pages, remembered dropdown position, canonical aliases, route splitting, step markers, tribute, ice-tree, cattle-field, and pinyin search.`);
window.close();
