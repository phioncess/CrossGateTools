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
window.eval(scripts.join('\n'));
if (window.formatTaskText(undefined) !== '') throw new Error('统一文本格式化入口会泄漏 undefined');

const input = window.document.querySelector('#questSearch');
const options = window.document.querySelector('#questOptions');
const search = value => {
  input.focus();
  input.value = value;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  return [...options.querySelectorAll('[data-quest-id]')];
};

let results = search('shilaimu');
if (!results[0]?.textContent.includes('史莱姆的回忆')) throw new Error('全拼搜索没有将史莱姆任务排在首位');

results = search('slmdhy');
if (!results[0]?.textContent.includes('史莱姆的回忆')) throw new Error('首字母搜索没有将史莱姆任务排在首位');
results[0]?.click();
const iceFirst = window.document.querySelector('.training-path.first')?.textContent || '';
const iceRepeat = window.document.querySelector('.training-path.quick')?.textContent || '';
if (!iceFirst.includes('第11步') || !iceFirst.includes('手电筒')) throw new Error('冰树首次路线未明确停在第11步取手电筒');
if (!iceRepeat.includes('小拓') || !iceRepeat.includes('客房下的裂缝')) throw new Error('冰树重复进入路线不完整');
const iceKeyItems = window.document.querySelector('.key-items-card')?.textContent || '';
if (!iceKeyItems.includes('手电筒') || !iceKeyItems.includes('冰树') || !iceKeyItems.includes('流程第 11 步取得')) throw new Error('手电筒没有标明重复冰树路线用途');
const iceRewards = window.document.querySelector('.rewards-card')?.textContent || '';
if (iceRewards.includes('【手电筒】')) throw new Error('纯流程关键道具手电筒仍在下方道具获取区重复展示');
const magnifierCard = [...window.document.querySelectorAll('.acquisition-item')].find(card => card.textContent.includes('放大镜'));
if (!magnifierCard?.textContent.includes('精神+3~+9') || /血量约|技能：|魔物：|随机迷宫/.test(magnifierCard.textContent)) throw new Error('放大镜属性卡仍混入战斗或路线资料');

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
for (const text of ['密语支线', '手机支线', '2026.05.23更新', '碎裂的艾斯潘之石']) {
  if (!dragonGuideText.includes(text)) throw new Error(`魔龙任务内容缺少来源文字: ${text}`);
}
for (const text of ['魔龙德拉贡', 'Lv.80', '17000', '大地之怒', '合击', '二动W站位', '海盗', 'Lv.45']) {
  if (!dragonBossText.includes(text)) throw new Error(`魔龙战斗区缺少来源文字: ${text}`);
}
for (const text of ['艾斯潘头饰', '攻击 8～10', '分离的恋人']) {
  if (!dragonRewardText.includes(text)) throw new Error(`魔龙奖励区缺少来源文字: ${text}`);
}

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
if (!dimensionalRewards?.querySelector('.structured-rewards')) throw new Error('异次元试验场未使用结构化奖励排版');
if (dimensionalRewards.querySelector('.acquisition-event-card')) throw new Error('异次元试验场仍在展示未解构的通用道具卡');
if (dimensionalRewards.querySelectorAll('.structured-event-card').length !== 2) throw new Error('异次元试验场获得事件没有重组为两个流程来源');
if (dimensionalRewards.querySelectorAll('.structured-item-card').length !== 4) throw new Error('异次元试验场物品属性没有拆成独立资料卡');
if (dimensionalRewards.querySelectorAll('.exchange-row:not(.exchange-head)').length !== 5) throw new Error('异次元试验场积分兑换表项目不完整');
const pointsCard = [...dimensionalRewards.querySelectorAll('.structured-item-card')].find(card => card.textContent.includes('积分卡'));
if (!pointsCard || pointsCard.textContent.includes('全视之眼（红）') || pointsCard.textContent.includes('旧版异次元试验场')) throw new Error('积分卡仍混入其他道具属性或版本段落');
const redEyeCard = [...dimensionalRewards.querySelectorAll('.structured-item-card')].find(card => card.textContent.includes('全视之眼（红）'));
if (!redEyeCard?.textContent.includes('攻击 +25') || !redEyeCard.textContent.includes('45 张积分卡兑换')) throw new Error('全视之眼（红）的属性或来源未独立归属');
const dimensionalGuide = window.document.querySelector('.guide-card')?.textContent || '';
if (!dimensionalGuide.includes('首次击败第五层BOSS')) throw new Error('异次元试验场上方流程丢失首次通关取得步骤');
for (const leakedDetail of ['名称积分卡所需数量备注', '攻击+25', '敏捷+10 精神+16', '丧尸设计图包20']) {
  if (dimensionalGuide.includes(leakedDetail)) throw new Error(`异次元试验场结构化资料仍泄漏到上方流程: ${leakedDetail}`);
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
const dragonSoulCards = [...window.document.querySelectorAll('.structured-item-card')].filter(card => card.textContent.includes('老龙之魂'));
if (dragonSoulCards.length !== 1) throw new Error(`六曜之塔的老龙之魂应合并为1张物品资料卡，实际为 ${dragonSoulCards.length}`);
if (!['主流程第 5 步', '支线第 11 步', '耐久 2', '不可交易'].every(text => dragonSoulCards[0].textContent.includes(text))) throw new Error('老龙之魂的来源或属性没有完成字段化重组');
if (/杀龙之刃|血量约|HP≈|技能：|六曜4楼开始分/.test(dragonSoulCards[0].textContent)) throw new Error('老龙之魂物品卡仍混入战斗或路线原文');
if (window.document.querySelector('.rewards-card .acquisition-event-card')) throw new Error('六曜之塔仍展示未解构的通用道具卡');
if (!sixTowerRewards.includes('天空之枪') || !sixTowerRewards.includes('攻击 160')) throw new Error('六曜之塔战斗掉落装备缺少来源区或属性');
if (sixTowerRewards.includes('原攻略掉落说明') && sixTowerRewards.includes('野队一般不使用')) throw new Error('精灵的水镜仍被误列为战斗掉落');
const sixTowerKeyNames = [...window.document.querySelectorAll('.key-item-card>header h3')].map(node => node.textContent);
if (sixTowerKeyNames.some(name => name.includes('空间裂隙水晶'))) throw new Error('其他任务取得的空间裂隙水晶被误判为六曜之塔产出');

results = search('娜蕾希亚的宝藏');
results[0]?.click();
for (const itemName of ['魔界风水盘', '乐于助人的奖章']) {
  const itemCard = [...window.document.querySelectorAll('.acquisition-item')].find(card => card.querySelector('h4')?.textContent.includes(itemName));
  const eventCard = itemCard?.closest('.acquisition-event-card');
  if (!itemCard || !eventCard) throw new Error(`娜蕾希亚的宝藏缺少物品资料：${itemName}`);
  if (eventCard.querySelector('.acquisition-action')) throw new Error(`${itemName}的属性说明仍被误作额外取得方式`);
  if (!eventCard.querySelector('header span')?.textContent.includes('物品资料')) throw new Error(`${itemName}没有按物品资料展示`);
}

results = search('2021~2026勇气max强化版');
results[0]?.click();
if (!window.document.querySelector('.detail-head h2')?.textContent.includes('勇气max')) throw new Error('勇气max 别名无法定位到正式任务');
const courageSummary = window.document.querySelector('#questDetail > .summary')?.textContent || '';
if (/必要条件|怀旧服临时任务|以下仅展示怀旧服路线与参数/.test(courageSummary)) throw new Error('勇气max 页首仍重复展示条件或版本口径');
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
if (window.document.querySelector('.rewards-card .structured-reward-list .acquisition-sources')) throw new Error('版本奖励卡仍重复显示内部版本来源');
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

results = search('追击');
results.find(option => option.dataset.questId === 'catalog-f1b868b5-03dc-43c4-a547-c5db346a2e80')?.click();
const pursuitFightTitles = [...window.document.querySelectorAll('.boss-heading h4')].map(node => node.textContent.trim());
if (!['改造火焰牛鬼', '阿鲁巴斯'].every(title => pursuitFightTitles.includes(title)) || pursuitFightTitles.some(title => title.includes('undefined'))) {
  throw new Error(`追击的无标题战斗或等级消歧显示错误：${pursuitFightTitles.join('、')}`);
}

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
for (const questId of allQuestIds) {
  const option = search('').find(item => item.dataset.questId === questId);
  option?.click();
  const detailText = window.document.querySelector('#questDetail')?.textContent || '';
  const title = window.document.querySelector('.detail-head h2')?.textContent || questId;
  const structuredRecord = window.QUEST_DATA?.quests?.[questId];
  if (structuredRecord?.verification?.status !== 'verified') throw new Error(`任务没有使用已核验结构化记录: ${title}`);
  if (/完整任务流程尚待核验|请先查看“练级路线”|关系已收录 · 详情待核验/.test(detailText)) throw new Error(`任务仍显示空壳页: ${title}`);
  if (/\bundefined\b/.test(detailText)) {
    const undefinedAt = detailText.indexOf('undefined');
    throw new Error(`任务页面泄漏未定义值: ${title} -> ${detailText.slice(Math.max(0, undefinedAt - 60), undefinedAt + 80)}`);
  }
  if ([...window.document.querySelectorAll('.rewards-card .acquisition-event-card header>em, .rewards-card .acquisition-sources span')].some(node => /(?:来源\s*)?第\s*\d+(?:\s*、\s*\d+)*\s*行/.test(node.textContent))) {
    throw new Error(`奖励区仍向玩家显示内部来源行号: ${title}`);
  }
  window.document.querySelector('[data-detail-tab="task"]')?.click();
  const renderedSteps = window.document.querySelectorAll('.quest-steps > li');
  if (!renderedSteps.length) throw new Error(`任务没有流程步骤: ${title}`);
  if (renderedSteps.length !== structuredRecord.flow.steps.length) throw new Error(`结构化流程步骤数量不一致: ${title}`);
  if (window.document.querySelector('.guide-meta')?.textContent.includes('[object Object]')) throw new Error(`结构化起点未正确渲染: ${title}`);
  const structuredBattleCount = Object.values(structuredRecord.versions || {}).reduce((versionTotal, version) => versionTotal + Object.values(version.tiers || {}).reduce((tierTotal, tier) => tierTotal + Object.values(tier.battles || {}).reduce((battleTotal, battle) => battleTotal + (Array.isArray(battle.rounds) && battle.rounds.length ? battle.rounds.length : 1), 0), 0), 0);
  if (window.document.querySelectorAll('.boss-fight').length !== structuredBattleCount) throw new Error(`结构化战斗数量不一致: ${title}`);
  const acquisitionNames = [...window.document.querySelectorAll('.acquisition-item h4 .item-tag')].map(node => node.textContent.trim());
  for (const rewardGroup of window.document.querySelectorAll('.rewards-card .reward-subsection')) {
    if (rewardGroup.querySelector('.periodic-offer')) continue;
    const groupNames = [...rewardGroup.querySelectorAll('.acquisition-item h4 .item-tag')].map(node => node.textContent.trim());
    if (new Set(groupNames).size !== groupNames.length) throw new Error(`同一版本或档位内生成了重复道具卡: ${title}`);
  }
  const specializedNames = [...window.document.querySelectorAll('.archive-item-card h4 .item-tag, .drop-item-plain>strong .item-tag, .special-reward-list header b .item-tag')].map(node => node.textContent.trim());
  const duplicatedOutcome = acquisitionNames.find(name => specializedNames.includes(name));
  if (duplicatedOutcome) throw new Error(`道具成果在普通获取卡与装备/掉落卡重复: ${title} -> ${duplicatedOutcome}`);
  for (const eventCard of window.document.querySelectorAll('.acquisition-event-card')) {
    const action = eventCard.querySelector('.acquisition-action p')?.textContent.trim() || '';
    if (!action) continue;
    if (eventCard.querySelector('.acquisition-action>b')?.textContent.trim() !== '取得方式') throw new Error(`道具取得动作仍使用含混的“来源”标签: ${title}`);
    for (const item of eventCard.querySelectorAll('.acquisition-item')) {
      const itemName = item.querySelector('h4')?.textContent.trim() || '';
      const actionBody = action.replace(/^◆?\s*【[^】]+】\s*[：:]?\s*/, '').trim();
      const compact = value => value.replace(/[◆◇※\s，,。；;：:（）()~～*]/g, '');
      for (const note of item.querySelectorAll('li')) {
        const noteText = note.textContent.trim();
        if (actionBody && noteText && (compact(actionBody) === compact(noteText) || compact(actionBody).includes(compact(noteText)) || compact(noteText).includes(compact(actionBody)))) {
          throw new Error(`取得方式与物品说明重复: ${title} -> ${itemName}`);
        }
      }
    }
  }
  for (const note of window.document.querySelectorAll('.acquisition-item li')) {
    if (note.closest('.periodic-offer')) continue;
    if (/(?:随机迷宫|固定地图|迷宫约?\d+层|魔物[为：:]|血量约|技能[：:]|\d+\s*动(?:，|,))/.test(note.textContent)) {
      throw new Error(`道具属性卡混入路线或战斗资料: ${title} -> ${note.textContent.slice(0, 80)}`);
    }
  }
}

if (runtimeErrors.length) throw runtimeErrors[0];
console.log(`DOM verified: ${allQuestIds.length} task pages, remembered dropdown position, canonical aliases, route splitting, step markers, tribute, ice-tree, cattle-field, and pinyin search.`);
window.close();
