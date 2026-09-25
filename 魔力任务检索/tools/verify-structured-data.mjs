import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data-src', 'quests.json'), 'utf8'));
const quests = Object.values(data.quests || {});
const fail = message => { throw new Error(message); };

if (data.schemaVersion !== 1) fail(`不支持的数据库容器版本：${data.schemaVersion}`);
if (quests.length !== 319) fail(`任务数量应为 319，实际为 ${quests.length}`);

const questIds = new Set();
for (const quest of quests) {
  if (!quest.id || questIds.has(quest.id)) fail(`任务 ID 缺失或重复：${quest.id || quest.name}`);
  questIds.add(quest.id);
  if (!quest.source?.key || (!quest.source?.url && !quest.source?.localFiles?.length)) fail(`任务缺少可回溯来源：${quest.name}`);
  if (quest.source.lineCount !== quest.source.rawLines.length) fail(`原文行数不一致：${quest.name}`);
  for (const sourceLine of quest.source.rawLines) {
    if (!Number.isInteger(sourceLine.line) || sourceLine.line < 1 || sourceLine.line > quest.source.lineCount) fail(`原文行号越界：${quest.name} -> ${sourceLine.line}`);
  }

  const battleIds = new Set();
  for (const [versionKey, version] of Object.entries(quest.versions || {})) {
    if (versionKey !== 'common' && !/^(?:20\d{2}(?:-20\d{2})?|through-20\d{2}|怀旧服|道具服|其他服)$/.test(versionKey)) fail(`版本键不合规：${quest.name} -> ${versionKey}`);
    for (const tier of Object.values(version.tiers || {})) {
      for (const battle of Object.values(tier.battles || {})) {
        if (battleIds.has(battle.id)) fail(`战斗 ID 重复：${quest.name} -> ${battle.id}`);
        battleIds.add(battle.id);
        for (const enemy of Object.values(battle.enemies || {})) {
          if (!enemy.raw || !enemy.sourceLines?.length) fail(`敌人缺少原文证据：${quest.name} -> ${enemy.name}`);
          if (/双击获得\s*Lv[.．]?\s*1/i.test(enemy.raw)) fail(`宠物奖励误判为敌人：${quest.name} -> ${enemy.raw}`);
          if (/^(?:技能\s*[：:]?|[、，,]|备注\s*[：:]|(?:强力|超强).*(?:魔法|攻击)|大地之怒)/.test(enemy.name)) fail(`技能行误判为敌人：${quest.name} -> ${enemy.raw}`);
        }
      }
    }
  }
}

const assertQuestEvidence = (quest, entity, label) => {
  if (!entity.sourceLines?.length) fail(`${quest.name}：${label} 缺少原文证据行`);
  for (const line of entity.sourceLines) {
    if (!Number.isInteger(line) || line < 1 || line > quest.source.lineCount) fail(`${quest.name}：${label} 的原文证据行越界：${line}`);
  }
  if (entity.verification?.status !== 'verified') fail(`${quest.name}：${label} 未标记人工核验状态`);
};

for (const quest of quests.filter(entry => entry.verification?.status === 'verified')) {
  if (quest.schemaVersion !== 2) fail(`${quest.name}：已核验任务没有使用语义数据模型`);
  if (quest.verification?.method !== 'manual-semantic-review') fail(`${quest.name}：已核验状态不是来自逐条语义复核`);
  if (quest.legacy) fail(`${quest.name}：已核验任务仍保留旧批量派生数据`);
  if (quest.verification.reviewedSourceRanges?.length !== 1
    || quest.verification.reviewedSourceRanges[0][0] !== 1
    || quest.verification.reviewedSourceRanges[0][1] !== quest.source.lineCount) {
    fail(`${quest.name}：已核验任务没有覆盖全部原文行`);
  }
  const businessSourceLines = quest.source.rawLines.filter(sourceLine => !/^[-=]{8,}$/.test(String(sourceLine.text || '').trim()));
  if (quest.segments?.length !== quest.source.lineCount && quest.segments?.length !== businessSourceLines.length) fail(`${quest.name}：逐行语义索引未覆盖全部业务原文`);
  const segmentLines = new Set(quest.segments.map(segment => segment.line));
  if (businessSourceLines.some(sourceLine => !segmentLines.has(sourceLine.line))) fail(`${quest.name}：逐行语义索引存在缺行`);
  if (typeof quest.flow?.start === 'string' || !quest.flow?.start?.stepId) fail(`${quest.name}：起点仍复制完整步骤或缺少步骤引用`);

  const outputNames = new Set();
  for (const currentStep of quest.flow.steps || []) {
    assertQuestEvidence(quest, currentStep, `步骤 ${currentStep.id}`);
    const inputNames = new Set();
    for (const currentInput of currentStep.inputs || []) {
      assertQuestEvidence(quest, currentInput, `步骤 ${currentStep.id} 输入 ${currentInput.item}`);
      inputNames.add(currentInput.item);
    }
    for (const currentOutput of currentStep.outputs || []) {
      assertQuestEvidence(quest, currentOutput, `步骤 ${currentStep.id} 输出 ${currentOutput.item}`);
      if (inputNames.has(currentOutput.item) && !currentOutput.allowsSameNameExchange && !currentStep.allowsIntermediateOutputThenInput) {
        fail(`${quest.name}：步骤 ${currentStep.id} 把同一道具同时列为输入和输出：${currentOutput.item}`);
      }
      outputNames.add(currentOutput.item);
      if (currentOutput.unidentifiedName) outputNames.add(currentOutput.unidentifiedName);
    }
  }
  for (const segment of quest.segments) assertQuestEvidence(quest, segment, `原文行 ${segment.line}`);

  const rewardIds = new Set();
  const rewardItemIds = new Set();
  for (const currentEvent of quest.rewardEvents || []) {
    if (!currentEvent.id || rewardIds.has(currentEvent.id)) fail(`${quest.name}：奖励事件 ID 缺失或重复：${currentEvent.id}`);
    rewardIds.add(currentEvent.id);
    assertQuestEvidence(quest, currentEvent, `奖励事件 ${currentEvent.id}`);
    for (const currentItem of currentEvent.items || []) {
      if (!currentItem.id || rewardItemIds.has(currentItem.id)) fail(`${quest.name}：奖励物品 ID 缺失或重复：${currentItem.id}`);
      rewardItemIds.add(currentItem.id);
      assertQuestEvidence(quest, currentItem, `奖励物品 ${currentItem.id}`);
      if (!currentItem.name || /原文未列独立物品名/.test(currentItem.name)) fail(`${quest.name}：存在匿名奖励物品`);
      if (currentItem.role === 'process-item') fail(`${quest.name}：纯流程道具被重复列入奖励：${currentItem.name}`);
      if (!outputNames.has(currentItem.name) && !outputNames.has(currentItem.unidentifiedName) && !['battle-drop', 'exchange-recipe', 'transformation-recipe', 'reward-pool'].includes(currentEvent.kind)) {
        fail(`${quest.name}：奖励物品没有对应获得事件：${currentItem.name}`);
      }
    }
  }
}

const courage = data.quests['catalog-0504a6b1-500a-47a0-982a-70a6b36cca6b'];
if (!courage || courage.name !== '勇气max') fail('未找到“勇气max”结构化记录');
if (courage.schemaVersion !== 2) fail('勇气max 尚未迁移到逐行语义核验模型');
if (courage.verification?.status !== 'verified') fail('勇气max 尚未完成全文核验');

const courage2026Pool = courage.rewardEvents?.find(event => event.id === 'reward-2026-tier2-pool');
for (const itemName of ['光辉之心', '骷髅战士改造图', '10紫、10骑宝石', '时间水晶 Lv1', '奇怪的药草', '技能学习证', '闪光飞鹰精华', '纯白冰淇淋招待券', '极运MAX']) {
  const rewardItem = courage2026Pool?.items?.find(item => item.name === itemName);
  if (!rewardItem?.properties || !rewardItem.references?.every(reference => reference.label && /^https:\/\//.test(reference.url))) fail(`勇气max 2026奖励缺少结构化道具资料或百科来源：${itemName}`);
}

const assertEvidence = (entity, label) => {
  if (!entity.sourceLines?.length) fail(`${label} 缺少原文证据行`);
  for (const line of entity.sourceLines) {
    if (!Number.isInteger(line) || line < 1 || line > courage.source.lineCount) fail(`${label} 的原文证据行越界：${line}`);
  }
  if (entity.verification?.status !== 'verified') fail(`${label} 未标记人工核验状态`);
};

if (courage.flow.steps.length !== 3) fail(`勇气max 主流程应为 3 步，实际为 ${courage.flow.steps.length}`);
if (typeof courage.flow.start === 'string' || courage.flow.start?.stepId !== 'step-1') fail('勇气max 起点仍复制完整步骤，或没有引用第1步');
for (const step of courage.flow.steps) {
  assertEvidence(step, `勇气max ${step.id}`);
  for (const input of step.inputs || []) assertEvidence(input, `勇气max ${step.id} 输入 ${input.item}`);
  for (const output of step.outputs || []) assertEvidence(output, `勇气max ${step.id} 输出 ${output.item}`);
}
const step2 = courage.flow.steps.find(step => step.id === 'step-2');
const step3 = courage.flow.steps.find(step => step.id === 'step-3');
if (step2.outputs.some(output => output.item === '招募信息')) fail('勇气max 第2步把交出道具误列为输出');
if (step2.inputs.some(input => input.item === '参加训练证明LV1/LV2')) fail('勇气max 第2步把获得的证明误列为输入');
if (step3.outputs.length) fail('勇气max 第3步把交出的证明误列为获得结果');
if (!step3.rewardEventRefs?.length) fail('勇气max 第3步没有关联版本奖励事件');

const separators = (courage.segments || []).filter(segment => /^[-=]{8,}$/.test(String(segment.text || '').trim()));
if (separators.length) fail('勇气max 分隔线仍进入业务分段');

for (const version of ['2024', '2025', '2026', '2021-2022', 'through-2023']) {
  if (!courage.versions[version]) fail(`勇气max 缺少版本分组：${version}`);
}
if (courage.versions['2024'].changes.length) fail('勇气max 2024奖励属性仍被误归为战斗调整');
if (courage.versions['2025'].inheritsFrom?.battles !== '2024') fail('勇气max 2025战斗继承关系缺失');
if (courage.versions['2026'].inheritsFrom?.battles !== '2025') fail('勇气max 2026战斗继承关系缺失');

const changes2026 = courage.versions['2026'].changes;
for (const change of changes2026) assertEvidence(change, `勇气max 2026调整 ${change.id}`);
if (!changes2026.some(change => change.targetBattleOrder === 4 && change.type === 'battle-replacement')) fail('勇气max 2026第4关替换没有结构化');
if (!changes2026.some(change => change.targetBattleOrder === 5 && change.type === 'battle-adjustment')) fail('勇气max 2026第5关调整没有结构化');

const battle2026 = courage.versions['2026'].tiers['tier-2'].battles['battle-4'];
const enemies2026 = Object.values(battle2026?.enemies || {});
if (!battle2026 || enemies2026.length !== 6) fail('勇气max 2026第4关实际敌人应为2种吉拉资料加4种残影资料');
if (battle2026.title !== '第4关 · 回来报仇的吉拉与四残影') fail('勇气max 2026第4关仍使用来源栏标题代替战斗标题');
if (!battle2026.overview?.roster?.[0]?.alternatives?.length) fail('勇气max 2026第4关随机吉拉阵容概述缺失');
if (enemies2026.some(enemy => /2种随机|出自《时空穿梭者》/.test(enemy.raw))) fail('勇气max 2026战斗概述仍被误判为敌人');
for (const enemy of enemies2026) {
  if (enemy.verification?.status !== 'verified') fail(`勇气max 2026敌人未人工核验：${enemy.name}`);
  const expectedLevel = /吉拉/.test(enemy.name) ? 100 : 120;
  if (enemy.level?.min !== expectedLevel || enemy.level?.max !== expectedLevel || enemy.actions !== 2) {
    fail(`勇气max 2026敌人等级或行动次数缺失：${enemy.name}`);
  }
}

const courageBattle2024 = courage.versions['2024'].tiers['tier-2'].battles;
if (courageBattle2024['battle-2'].title !== '树海四斗神加强版') fail('勇气max 2024树海四斗神标题仍带有错误前导标点');
if (Object.values(courageBattle2024['battle-2'].enemies).some(enemy => enemy.actions !== 2)) fail('勇气max 2024树海四斗神未继承“皆为2动”');
if (Object.values(courageBattle2024['battle-3'].enemies).some(enemy => enemy.level?.min !== 100 || enemy.level?.max !== 120 || enemy.actions !== 2)) {
  fail('勇气max 2024百人道场敌人未继承“Lv.100～120随机、皆为2动”');
}
if (Object.values(courage.versions['2021-2022'].tiers['tier-1'].battles['battle-4'].enemies).some(enemy => enemy.actions !== 2)) {
  fail('勇气max 2021～2022树海四斗神未继承“皆为2动”');
}
const unbalancedCourageSkills = [];
const collectUnbalancedSkills = value => {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const entry of value) collectUnbalancedSkills(entry);
    return;
  }
  if (Array.isArray(value.skills)) {
    for (const skill of value.skills) {
      if ((skill.match(/[（(]/g) || []).length !== (skill.match(/[）)]/g) || []).length) unbalancedCourageSkills.push(skill);
    }
  }
  for (const nested of Object.values(value)) collectUnbalancedSkills(nested);
};
collectUnbalancedSkills(courage.versions);
if (unbalancedCourageSkills.length) fail(`勇气max 技能条件被括号内标点拆断：${unbalancedCourageSkills.join('｜')}`);

const rewardEventIds = new Set();
const rewardItemIds = new Set();
for (const rewardEvent of courage.rewardEvents || []) {
  if (!rewardEvent.id || rewardEventIds.has(rewardEvent.id)) fail(`勇气max 奖励事件 ID 缺失或重复：${rewardEvent.id}`);
  rewardEventIds.add(rewardEvent.id);
  assertEvidence(rewardEvent, `勇气max 奖励事件 ${rewardEvent.id}`);
  if (!rewardEvent.items?.length) fail(`勇气max 奖励事件没有物品实体：${rewardEvent.id}`);
  for (const rewardItem of rewardEvent.items) {
    if (!rewardItem.id || rewardItemIds.has(rewardItem.id)) fail(`勇气max 奖励物品 ID 缺失或重复：${rewardItem.id}`);
    rewardItemIds.add(rewardItem.id);
    assertEvidence(rewardItem, `勇气max 奖励物品 ${rewardItem.id}`);
    if (!rewardItem.name || /原文未列独立物品名/.test(rewardItem.name)) fail(`勇气max 仍有匿名奖励物品：${rewardItem.id}`);
  }
}

const album = courage.rewardEvents.flatMap(rewardEvent => rewardEvent.items).find(rewardItem => rewardItem.id === 'reward-2024-platinum-record-series');
if (!album || album.entityType !== 'item-series' || album.properties.level !== 6 || album.properties.category !== '护身符' || album.variants.length !== 10) {
  fail('勇气max 梦幻想白金唱片没有解构为一个物品系列、公共属性和10个型号效果');
}
for (const variant of album.variants) assertEvidence(variant, `勇气max 梦幻想白金唱片${variant.model}号`);

const courageRewardItems = courage.rewardEvents.flatMap(rewardEvent => rewardEvent.items);
const assertEquipmentArchive = (rewardId, expectedName, expectedStats, expectedCount = 1) => {
  const rewardItem = courageRewardItems.find(item => item.id === rewardId);
  const archive = rewardItem?.equipmentArchive;
  if (!archive || archive.sourceFile !== '魔力装备档案/index.html' || archive.entries?.length !== expectedCount) {
    fail(`勇气max 奖励没有关联装备档案：${rewardId}`);
  }
  const entry = archive.entries.find(candidate => candidate.name === expectedName);
  if (!entry) fail(`勇气max 奖励缺少装备型号：${expectedName}`);
  for (const [stat, value] of Object.entries(expectedStats)) {
    if (entry.stats?.[stat]?.min !== value || entry.stats?.[stat]?.max !== value) {
      fail(`勇气max ${expectedName} 的${stat}属性未按装备档案写入`);
    }
  }
};
assertEquipmentArchive('reward-2024-muramasa', '村正', { attack: 240, durability: 300 });
assertEquipmentArchive('reward-2024-sky-spear', '天空之枪', { attack: 160, hit: 40, counter: 6, durability: 300 });
assertEquipmentArchive('reward-2024-parukes-axe', '帕鲁凯斯之斧', { attack: 250, critical: 18, durability: 300 });
assertEquipmentArchive('reward-2025-safety-helmet', '金刚不坏安全帽·改', { magic: 100, defense: 32, dodge: 6, durability: 500 });
assertEquipmentArchive('reward-2021-2022-tier2-ashaf-staff', '阿夏芙之杖（地）', { magic: 50, attack: 10, spirit: 55, magicAttack: 290, durability: 300 }, 4);

const verifiedCount = quests.filter(quest => quest.verification?.status === 'verified').length;
const inProgressCount = quests.filter(quest => quest.verification?.status === 'in-progress').length;
const unverifiedCount = quests.filter(quest => quest.verification?.status === 'unverified').length;
console.log(`Structured data verified: ${quests.length} tasks; verified=${verifiedCount}, in-progress=${inProgressCount}, unverified=${unverifiedCount}; 已核验区段通过语义归属、证据和实体边界检查。`);
