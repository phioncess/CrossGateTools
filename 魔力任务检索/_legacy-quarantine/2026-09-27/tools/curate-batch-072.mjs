import fs from 'node:fs';

const dataPath = new URL('../data-src/quests.json', import.meta.url);
const database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const v = (sourceLines, value = {}) => ({ ...value, sourceLines, verification: { status: 'verified', method: 'manual-semantic-review' } });
const input = (item, line, value = {}) => v([line], { item, quantity: 1, action: 'hand-over', ...value });
const output = (item, line, value = {}) => v([line], { item, quantity: 1, acquisition: 'guaranteed', ...value });
const step = (id, order, text, sourceLines, inputs = [], outputs = [], value = {}) => v(sourceLines, { id, order, text, inputs, outputs, notes: [], ...value });
const rewardItem = (id, name, sourceLines, value = {}) => v(sourceLines, { id, name, role: 'valuable-result', ...value });
const rewardEvent = (id, kind, sourceLines, items, value = {}) => v(sourceLines, { id, version: 'common', tier: 'common', kind, items, ...value });
const foe = (sourceLines, name, raw, value = {}) => v(sourceLines, { name, raw, role: 'enemy', ...value });

function curate(id, name, config) {
  const quest = database.quests[id];
  if (!quest || quest.name !== name) throw new Error(`任务不匹配：${id}/${name}`);
  if (config.lineTypes.length !== quest.source.lineCount) throw new Error(`${name}行类型错误：${config.lineTypes.length}/${quest.source.lineCount}`);
  quest.schemaVersion = 2;
  quest.verification = { status: 'verified', method: 'manual-semantic-review', reviewedSourceRanges: [[1, quest.source.lineCount]], note: '全部原文行已逐条核验。' };
  quest.requirements = { conditions: config.requirements || [] };
  quest.relations = config.relations || { prerequisites: [], itemSources: [], references: [] };
  quest.flow = { start: v(config.steps[0].sourceLines, { stepId: config.steps[0].id, location: config.startLocation }), steps: config.steps, notes: config.flowNotes || [] };
  quest.versions = config.versions || { common: { key: 'common', label: '通用', changes: config.versionChanges || [], tiers: { common: { key: 'common', label: '通用', order: 0, battles: config.battles || {}, encounters: config.encounters || [], media: config.media || [], notes: config.versionNotes || [] } } } };
  quest.rewardEvents = config.rewardEvents || [];
  quest.outcomes = config.outcomes || { titles: [], careers: [], skills: [] };
  quest.segments = quest.source.rawLines.map((rawLine, index) => v([rawLine.line], { line: rawLine.line, text: rawLine.text, type: config.lineTypes[index] }));
  quest.itemEvents = {
    inputs: config.steps.flatMap(currentStep => currentStep.inputs.map(event => ({ ...event, step: currentStep.id, version: currentStep.version || 'common', tier: currentStep.tier || 'common' }))),
    acquisitions: config.steps.flatMap(currentStep => currentStep.outputs.map(event => ({ ...event, step: currentStep.id, version: currentStep.version || 'common', tier: currentStep.tier || 'common' })))
  };
  delete quest.legacy;
}

const trialData = [
  { key: 'earth', name: '东方甲乙土', lines: [23, 24, 25, 26], mobs: ['石怪', '岩怪'], composition: [{ name: '岩怪', level: 55, count: 2 }, { name: '石怪', level: 55, count: 3 }], boss: '巨人', bossLine: 24, skills: ['攻击', '防御', '明镜止水（不耗魔）', '诸刃'], item: '古树之叶', itemLine: 25 },
  { key: 'fire', name: '南方丙丁火', lines: [27, 28, 29], mobs: ['地狱猎犬', '狠毒鸟人'], composition: [{ name: '地狱猎犬', level: 55, count: 2 }, { name: '狠毒鸟人', level: 55, count: 3 }], boss: '亚斯特拉巨神', bossLine: 28, skills: ['攻击', '防御', '乾坤一掷', '明镜止水（不耗魔）'], item: '幽冥火种', itemLine: 28 },
  { key: 'wind', name: '西方庚辛风', lines: [30, 31, 32], mobs: ['宝石鼠', '冥界死神'], composition: [{ name: '冥界死神', level: 55, count: 2 }, { name: '宝石鼠', level: 55, count: 3 }], boss: '泰坦巨人', bossLine: 31, skills: ['攻击', '防御', '阳炎', '单体补血魔法', '明镜止水（不耗魔）'], item: '沙尘颗粒', itemLine: 31 },
  { key: 'water', name: '北方壬癸水', lines: [33, 34, 35], mobs: ['液态史莱姆', '人魔草'], composition: [{ name: '液态史莱姆', level: 55, count: 2 }, { name: '人魔草', level: 55, count: 3 }], boss: '单眼巨人', bossLine: 34, skills: ['攻击', '防御', '乾坤一掷', '明镜止水（不耗魔）', '诸刃'], item: '冻源结晶', itemLine: 34 }
];

curate('catalog-7434f69a-8e12-4465-b7f4-29880ae2481b', '阿蒙的幻影', {
  startLocation: '法兰城阿蒙的幻影（229.83）',
  requirements: [
    v([1], { type: 'inventory-space', slots: 5 }),
    v([2], { type: 'time-window', periods: ['黄昏', '夜晚', '清晨'], appliesTo: '接取任务' }),
    v([4], { type: 'must-not-hold', item: '收集品清单', resolution: '丢弃旧有收集品清单后才能获得委托调查信' }),
    v([5], { type: 'post-completion-reset', afterQuest: '最后的洗礼', mustRedo: ['路见不平', '传承使者'] }),
    v([12, 13], { type: 'time-window', periods: ['黄昏', '夜晚'], appliesTo: '蒂娜村萨尔瓦洛出现；可白天传送后在村外等待' }),
    v([15], { type: 'maze-refresh', intervalHours: 1.5 }),
    v([19], { type: 'repeat-entry-reset', mustRedoThroughItem: '线索卡片6' })
  ],
  relations: {
    prerequisites: [
      v([5], { quest: '路见不平', questId: 'catalog-74d3cde2-4627-4f32-9ff6-e953983668f8', relation: 'required-after-final-baptism' }),
      v([5], { quest: '传承使者', questId: 'catalog-e3493168-7be7-4193-a788-845db8a07e17', relation: 'required-after-final-baptism' })
    ],
    itemSources: [],
    references: [v([20], { type: 'training-location-reference', target: '怀旧烧技能地点' }), v([42, 43], { type: 'future-use', item: '萨尔瓦洛的徽章', targetQuest: '龙之试炼', targetQuestId: 'catalog-23405bc3-dbb8-431b-a709-7e8cb885379b' })]
  },
  steps: [
    step('commission-letter', 1, '黄昏、夜晚或清晨与阿蒙的幻影对话，取得【委托调查信】。若持有旧的【收集品清单】，必须先丢弃；完成《最后的洗礼》后还需重新完成洗礼1、2。', [1, 2, 3, 4, 5], [input('收集品清单', 4, { action: 'discard-if-held', conditional: true })], [output('委托调查信', 2)]),
    step('clue-1', 2, '向冒险者旅馆门口爱说明的汉克（238.66）选“是”，交出委托调查信，获得【线索卡片1】。', [6], [input('委托调查信', 6)], [output('线索卡片1', 6)]),
    step('clue-2', 3, '调查法兰城大圣堂建筑背后（158.13）的树，交出线索卡片1，获得【线索卡片2】。', [7], [input('线索卡片1', 7)], [output('线索卡片2', 7)]),
    step('clue-3', 4, '与凯特（145.133）对话，交出线索卡片2，获得【线索卡片3】。', [8], [input('线索卡片2', 8)], [output('线索卡片3', 8)]),
    step('clue-4', 5, '到里谢里雅堡名人堂与GM17（11.12）对话，交出线索卡片3，获得【线索卡片4】。', [9], [input('线索卡片3', 9)], [output('线索卡片4', 9)]),
    step('clue-5', 6, '调查灵堂（13.52）发亮石像，交出线索卡片4，获得【线索卡片5】。', [10], [input('线索卡片4', 10)], [output('线索卡片5', 10)]),
    step('clue-6', 7, '返回汉克处交出线索卡片5，获得【线索卡片6】。', [11], [input('线索卡片5', 11)], [output('线索卡片6', 11)]),
    step('ruins-entry', 8, '黄昏或夜晚进入蒂娜村，与萨尔瓦洛（49.38）对话，交出线索卡片6，获得【收集品清单】并传送至幻之地底遗迹。', [12, 13], [input('线索卡片6', 12)], [output('收集品清单', 12)]),
    ...trialData.map((trial, index) => step(`maze-${trial.key}`, 9 + index, `通过${trial.name}10层随机迷宫，击败Lv.65${trial.boss}，取得【${trial.item}】。迷宫每1.5小时刷新；普通魔物为Lv.55，图鉴可战斗掉落但不能巧取。`, [14, 15, 21, 22, ...trial.lines], [], [output(trial.item, trial.itemLine)], { battleRef: `battle-${trial.key}` })),
    step('leave-ruins', 13, '集齐四种收集品后与幻之地底遗迹传送者（19.18）对话，传送至蒂娜村外。', [36, 37, 38], [], []),
    step('salvalo-letter', 14, '夜晚与蒂娜村萨尔瓦洛（49.38）对话，交出收集品清单及四种迷宫收集品，获得【给汉克的信】。', [39], [input('收集品清单', 39), input('古树之叶', 39), input('幽冥火种', 39), input('沙尘颗粒', 39), input('冻源结晶', 39)], [output('给汉克的信', 39)]),
    step('completion', 15, '回到冒险者旅馆门口向汉克交出给汉克的信，同一次获得【萨尔瓦洛的徽章】与【陨石碎片】，任务完结。', [40], [input('给汉克的信', 40)], [output('萨尔瓦洛的徽章', 40), output('陨石碎片', 40)]),
    step('meteor-fragment-battle', 16, '可选：持陨石碎片与汉克的助手（238.68）对话，交出碎片进入战斗，随机遭遇一只Lv.1鸟人、石怪、史莱姆或哥布林。', [46, 47, 48], [input('陨石碎片', 48)], [output('Lv.1鸟人', 48, { acquisition: 'random-one-of', entityType: 'pet' }), output('Lv.1石怪', 48, { acquisition: 'random-one-of', entityType: 'pet' }), output('Lv.1史莱姆', 48, { acquisition: 'random-one-of', entityType: 'pet' }), output('Lv.1哥布林', 48, { acquisition: 'random-one-of', entityType: 'pet' })], { optional: true })
  ],
  encounters: trialData.map(trial => v(trial.lines, { id: `maze-${trial.key}`, location: trial.name, mazeFloors: 10, refreshHours: 1.5, enemies: trial.composition })),
  battles: Object.fromEntries(trialData.map(trial => [`battle-${trial.key}`, v(trial.lines, { id: `battle-${trial.key}`, enemies: [foe([trial.bossLine], trial.boss, `Lv.65${trial.boss}，2动，血量约10000；技能：${trial.skills.join('、')}`, { level: 65, actionCount: 2, hpApprox: 10000, skills: trial.skills })], ordinaryEnemies: trial.composition })])),
  rewardEvents: [
    rewardEvent('completion-items', 'quest-completion', [40, 41, 42, 43, 44, 45, 46], [
      rewardItem('salvalo-badge', '萨尔瓦洛的徽章', [40, 41, 42, 43, 44, 45], { entityType: 'equipment', properties: { level: 8, category: '护身符', durability: 100, attack: 30, agility: 10, recovery: 10, critical: 5, accuracy: 5, dodge: 5, magic: 50, magicResistance: 15, tradeable: false, bankable: false, disappearsWhenDropped: true, equippedTitle: '法兰义勇军二等兵' }, futureUses: ['《龙之试炼》第一步', '完成《最后的洗礼》后可跳过本任务以刷洗礼的项链'] }),
      rewardItem('meteor-fragment', '陨石碎片', [40, 46], { entityType: 'key-item', properties: { tradeable: true }, use: '交给汉克的助手触发随机Lv.1宠物战' })
    ]),
    rewardEvent('meteor-pet', 'battle-drop', [47, 48], [
      rewardItem('meteor-birdman', 'Lv.1鸟人', [47, 48], { entityType: 'pet', selection: 'random-one-of' }),
      rewardItem('meteor-rock', 'Lv.1石怪', [47, 48], { entityType: 'pet', selection: 'random-one-of' }),
      rewardItem('meteor-slime', 'Lv.1史莱姆', [47, 48], { entityType: 'pet', selection: 'random-one-of' }),
      rewardItem('meteor-goblin', 'Lv.1哥布林', [47, 48], { entityType: 'pet', selection: 'random-one-of' })
    ], { cost: [{ item: '陨石碎片', quantity: 1 }] })
  ],
  outcomes: { titles: [v([45], { name: '法兰义勇军二等兵', condition: '装备萨尔瓦洛的徽章' })], careers: [], skills: [] },
  flowNotes: [v([16, 17, 18], { type: 'skill-training', location: '南方丙丁火', nurse: '非资深', safeMethod: '留一只狠毒鸟人可使其不动；烧护卫、反击、圣盾等无需行动技能时需逃跑结束，避免掉线回城' })],
  lineTypes: ['inventory-requirement', 'item-acquisition', 'route-advice', 'must-not-hold', 'post-completion-reset', 'exchange-step', 'exchange-step', 'exchange-step', 'exchange-step', 'exchange-step', 'exchange-step', 'exchange-teleport', 'time-gate-note', 'maze-overview', 'maze-refresh-rule', 'route-alias', 'training-note', 'training-warning', 'repeat-entry-rule', 'reference', 'table-heading', 'table-heading', 'maze-row', 'battle-enemy', 'item-acquisition', 'encounter-composition', 'maze-row', 'battle-enemy-and-item', 'encounter-composition', 'maze-row', 'battle-enemy-and-item', 'encounter-composition', 'maze-row', 'battle-enemy-and-item', 'encounter-composition', 'maze-note', 'facility-note', 'teleport-step', 'grouped-exchange', 'completion-exchange', 'item-heading', 'future-use', 'skip-rule', 'equipment-detail', 'equipment-restriction', 'item-detail', 'optional-item-use', 'random-pet-battle']
});

const warmChain = rewardItem('warm-chain', '温暖之链', [9, 10, 28, 29, 48], { entityType: 'equipment', properties: { stats: '浮动（原文未列范围）', tradeable: false, droppable: false, bankable: false, equippedTitle: '渺小的幸福' } });
const sorrowProof = rewardItem('sorrow-proof', '忧伤之证', [21, 22, 28, 29, 48], { entityType: 'equipment', properties: { stats: '浮动（原文未列范围）', tradeable: false, droppable: false, bankable: false, equippedTitle: '淡淡的忧伤' } });

curate('catalog-a4616b0d-814d-4fe6-83bf-927cdb4ca36f', '孤儿院走失宠物事件', {
  startLocation: '法兰城大圣堂外孤儿监护员奈尔（165.26）',
  requirements: [
    v([1, 11, 31], { type: 'route-choice', routes: ['温暖之链', '忧伤之证', '两路线同时完成'] }),
    v([24], { type: 'time-window', periods: ['黄昏', '夜晚'], appliesTo: '由美路线接取' }),
    v([18, 40], { type: 'party-state', action: '解散队伍', appliesTo: '进入研究室' }),
    v([28], { type: 'held-items', all: ['温暖之链', '忧伤之证', '有称号没数值'], appliesTo: '兑换有数值没称号' })
  ],
  relations: { prerequisites: [], itemSources: [], references: [v([29], { type: 'same-quest-route-reference', items: ['温暖之链', '忧伤之证'], routes: ['温暖之链路线', '忧伤之证路线'] })] },
  steps: [
    step('warm-photo', 1, '温暖路线：向奈尔领取【米雪儿的照片】。', [1, 2], [], [output('米雪儿的照片', 2)], { branch: '温暖之链' }),
    step('warm-food', 2, '在法兰城西门外找到米雪儿，选“是”交出照片，获得【穴龙喜欢的食物】。', [3], [input('米雪儿的照片', 3)], [output('穴龙喜欢的食物', 3)], { branch: '温暖之链' }),
    step('warm-battle', 3, '经阿凯鲁法村奇怪的树进入约5层随机迷宫，到藏匿之穴挑战Lv.40穴龙。', [4, 5, 6, 7], [], [], { branch: '温暖之链', battleRef: 'warm-hole-dragon' }),
    step('warm-note', 4, '胜利后向穴龙交出喜欢的食物，获得【穴龙的纸条】并传回阿凯鲁法村。', [8], [input('穴龙喜欢的食物', 8)], [output('穴龙的纸条', 8)], { branch: '温暖之链' }),
    step('warm-completion', 5, '回法兰城西门外向米雪儿交出穴龙纸条，获得【温暖之链】。', [9, 10], [input('穴龙的纸条', 9)], [output('温暖之链', 9)], { branch: '温暖之链' }),

    step('sorrow-photo', 6, '忧伤路线：向奈尔领取【米雪儿的照片】。', [11, 12], [], [output('米雪儿的照片', 12)], { branch: '忧伤之证' }),
    step('sorrow-letter', 7, '在法兰城西门外找到米雪儿，选“否”交出照片，获得【米雪儿的信】。', [13], [input('米雪儿的照片', 13)], [output('米雪儿的信', 13)], { branch: '忧伤之证' }),
    step('trainer-intel', 8, '返回奈尔处交付米雪儿的信，获得【驯兽师的情报】。原文写成再次交出“米雪儿的照片”，但该照片已在上一步交出且只获得米雪儿的信；按上下文解构为交信，并保留来源异文。', [14], [input('米雪儿的信', 14, { sourceWording: '米雪儿的照片', normalizedFromContext: true })], [output('驯兽师的情报', 14)], { branch: '忧伤之证', sourceConflict: true }),
    step('dragon-intel', 9, '到哥拉尔镇向驯兽师呜咪（111.81）交出驯兽师情报，获得【穴龙的情报】。', [15], [input('驯兽师的情报', 15)], [output('穴龙的情报', 15)], { branch: '忧伤之证' }),
    step('researcher-battle', 10, '经阿凯鲁法村奇怪的树进入约5层随机迷宫；在藏匿之穴与穴龙对话，解散队伍并传入研究室，挑战两名Lv.50魔物研究员。', [16, 17, 18, 19], [], [], { branch: '忧伤之证', battleRef: 'monster-researchers' }),
    step('dragon-letter', 11, '胜利后向穴龙交出穴龙情报，获得【穴龙的信】并传回阿凯鲁法村。', [20], [input('穴龙的情报', 20)], [output('穴龙的信', 20)], { branch: '忧伤之证' }),
    step('sorrow-completion', 12, '回法兰城西门外向米雪儿交出穴龙的信，获得【忧伤之证】。', [21, 22], [input('穴龙的信', 21)], [output('忧伤之证', 21)], { branch: '忧伤之证' }),

    step('yumi-letter', 13, '黄昏或夜晚与大圣堂外由美（165.26）对话选“是”，获得【由美的信】。', [23, 24], [], [output('由美的信', 24)], { branch: '有数值没称号' }),
    step('dragon-recipe', 14, '向哥拉尔镇驯兽师呜咪交出由美的信，获得【穴龙的食谱】。', [25], [input('由美的信', 25)], [output('穴龙的食谱', 25)], { branch: '有数值没称号' }),
    step('title-no-stats', 15, '向由美交出风属性水晶碎片5个、火属性水晶碎片5个及穴龙食谱，获得【有称号没数值】。', [26, 27], [input('风属性水晶碎片', 26, { quantity: 5 }), input('火属性水晶碎片', 26, { quantity: 5 }), input('穴龙的食谱', 26)], [output('有称号没数值', 26)], { branch: '有数值没称号' }),
    step('stats-no-title', 16, '同时持有温暖之链、忧伤之证、有称号没数值时与由美对话，三件全部用于兑换【有数值没称号】。', [28, 29, 30], [input('温暖之链', 28), input('忧伤之证', 28), input('有称号没数值', 28)], [output('有数值没称号', 28)], { branch: '有数值没称号' }),

    step('combined-route', 17, '同时解温暖与忧伤路线：按原文依次完成“领照片→选否得信→向奈尔交信得驯兽师情报→换穴龙情报→再次领照片→选是得食物→研究员战→换穴龙信→再进迷宫打穴龙→换纸条→依次领取忧伤之证与温暖之链”。各道具动作与上方两路线相同，仅顺序合并。', [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48], [], [], { branch: '两路线同时完成', sequence: ['sorrow-photo', 'sorrow-letter', 'trainer-intel', 'dragon-intel', 'warm-photo', 'warm-food', 'researcher-battle', 'dragon-letter', 'warm-battle', 'warm-note', 'sorrow-completion', 'warm-completion'], sourceConflict: { line: 34, sourceWording: '交出米雪儿的照片', normalizedMeaning: '交出米雪儿的信', reason: '照片已于前一步交出，所得物为米雪儿的信' } })
  ],
  encounters: [v([4, 5, 16, 17, 38, 39, 43, 44], { id: 'hidden-cave-entry', location: '阿凯鲁法村奇怪的树（92.176）', maze: '入口随机迷宫', floorsApprox: 5 })],
  battles: {
    'warm-hole-dragon': v([6, 7, 45, 46], { id: 'warm-hole-dragon', enemies: [foe([7, 46], '穴龙', 'Lv.40穴龙', { level: 40, count: 1 })] }),
    'monster-researchers': v([18, 19, 40, 41], { id: 'monster-researchers', partyMustDisband: true, enemies: [foe([19, 41], '魔物研究员', 'Lv.50魔物研究员*2', { level: 50, count: 2 })] })
  },
  rewardEvents: [
    rewardEvent('warm-chain-event', 'quest-completion', [9, 10, 28, 29, 48], [warmChain]),
    rewardEvent('sorrow-proof-event', 'quest-completion', [21, 22, 28, 29, 48], [sorrowProof]),
    rewardEvent('title-no-stats-event', 'quest-completion', [26, 27, 28], [rewardItem('title-no-stats', '有称号没数值', [26, 27, 28], { entityType: 'equipment', properties: { equippedTitle: '路过的好心人', stats: '无' } })]),
    rewardEvent('stats-no-title-event', 'quest-completion', [28, 29, 30], [rewardItem('stats-no-title', '有数值没称号', [28, 29, 30], { entityType: 'equipment', properties: { stats: '浮动（原文未列范围）', title: null, tradeable: true, droppable: true, bankable: true }, exchangeCost: ['温暖之链', '忧伤之证', '有称号没数值'] })])
  ],
  outcomes: { titles: [v([10], { name: '渺小的幸福', condition: '装备温暖之链' }), v([22], { name: '淡淡的忧伤', condition: '装备忧伤之证' }), v([27], { name: '路过的好心人', condition: '装备有称号没数值' })], careers: [], skills: [] },
  lineTypes: ['route-heading', 'item-acquisition', 'exchange-step', 'maze-entry', 'maze-detail', 'battle-step', 'battle-enemy', 'exchange-teleport', 'completion-exchange', 'equipment-detail', 'route-heading', 'item-acquisition', 'branch-exchange', 'source-conflict-exchange', 'exchange-step', 'maze-entry', 'maze-detail', 'party-gate-battle', 'battle-enemy', 'exchange-teleport', 'completion-exchange', 'equipment-detail', 'route-heading', 'time-gated-acquisition', 'exchange-step', 'grouped-exchange', 'equipment-detail', 'three-item-exchange', 'same-quest-reference', 'equipment-detail', 'combined-route-heading', 'item-acquisition', 'branch-exchange', 'source-conflict-exchange', 'exchange-step', 'item-acquisition', 'branch-exchange', 'maze-entry', 'maze-detail', 'party-gate-battle', 'battle-enemy', 'exchange-teleport', 'maze-entry', 'maze-detail', 'battle-step', 'battle-enemy', 'exchange-teleport', 'two-reward-completion']
});

const laborReward = (id, name, lines, value = {}) => rewardItem(id, name, lines, { entityType: 'item', ...value });
const pool = (id, version, lines, items, value = {}) => rewardEvent(id, 'reward-pool', lines, items, { version, selection: 'random', ...value });
const versionBlock = (key, label, changes = [], inheritsFrom = undefined) => ({ key, label, changes, ...(inheritsFrom ? { inheritsFrom } : {}), tiers: { common: { key: 'common', label: '通用', order: 0, battles: {}, encounters: [], media: [], notes: [] } } });

const laborSteps = [
  step('bag-drop', 1, '活动期间在已知可掉落的主要练级区击败魔物，有几率获得【劳动节福袋】；来源同时列出一组已知不可掉落地点。', [1, 2, 3], [], [output('劳动节福袋', 1, { acquisition: 'chance-drop', source: 'leveling-zone-monsters' })]),
  step('open-bag', 2, '双击一个劳动节福袋并消耗它，按当前年份的奖励池随机获得奖励，任务结束。福袋不可交易、丢地消失、最多叠加20。', [4, 5], [input('劳动节福袋', 4, { action: 'use', consumed: true })], [], { rewardEventRefs: ['labor-2026-pool', 'labor-2024-pool', 'labor-2023-pool'] }),
  step('use-meow-bell', 3, '2026年：若获得【喵喵铃铛】，双击消耗后获得Lv.1喜乐财喵喵。', [15, 16, 17, 18, 19], [input('喵喵铃铛', 16, { action: 'use', consumed: true })], [output('Lv.1喜乐财喵喵', 16, { entityType: 'pet' })], { version: '2026' }),
  step('replace-dragovit', 4, '2024/2025说明：奖励中的“德拉格维特精华”已因属性异常更换为【德拉格维特改】；已经持有德拉格维特的玩家可向法兰城裘瑟贝（195.67）更换。', [43, 44, 45], [input('德拉格维特', 45, { action: 'exchange-if-held', conditional: true })], [output('德拉格维特改', 44, { acquisition: 'reward-replacement' })], { version: '2024-2025', sourceCorrection: true })
];

const versions = {
  common: versionBlock('common', '通用'),
  '2026': versionBlock('2026', '2026', [v([6, 7, 8, 9, 10, 11, 12, 13, 14], { id: 'reward-pool-2026', type: 'reward-pool', note: '2026奖励池独立于往年保存' })]),
  '2025': versionBlock('2025', '2025', [v([20], { id: 'inherits-2024-rewards', type: 'reward-inheritance', from: '2024', note: '原文明确“同2024”' })], { rewards: '2024' }),
  '2024': versionBlock('2024', '2024', [v([21, 30, 43, 44, 45], { id: 'dragovit-replacement', type: 'reward-replacement', listedItem: '德拉格维特精华', replacementItem: '德拉格维特改', exchangeNpc: '裘瑟贝（195.67）' })]),
  '2023': versionBlock('2023', '2023')
};

curate('catalog-5c69c710-1653-4b0c-9b76-71151d153b8f', '劳动节特别活动', {
  startLocation: '活动期间的主要练级区',
  requirements: [v([1], { type: 'event-availability', event: '劳动节特别活动' })],
  relations: { prerequisites: [], itemSources: [], references: [v([46], { type: 'item-reference', item: '天梯积分卡', targetQuest: '天梯PK赛' })] },
  steps: laborSteps,
  versions,
  rewardEvents: [
    pool('labor-2026-pool', '2026', [6, 7, 8, 9, 10, 11, 12, 13, 14], [
      laborReward('2026-meow-bell', '喵喵铃铛', [7, 16], { use: '双击获得Lv.1喜乐财喵喵' }),
      laborReward('2026-cat-ears', '猫耳', [8]),
      laborReward('2026-oznik-gloves', '欧滋尼克的拳套', [9]),
      laborReward('2026-fire-unicorn-card', '火焰独角兽变身卡', [10]),
      laborReward('2026-unicorn-card', '独角兽变身卡', [11]),
      laborReward('2026-medal', '劳动节奖章', [12]),
      laborReward('2026-mouse-egg', '鼠王惊奇蛋', [13]),
      laborReward('2026-ladder-card', '天梯积分卡', [14], { properties: { tradeable: false } })
    ]),
    rewardEvent('meow-bell-result', 'transformation-recipe', [16, 17, 18], [rewardItem('joyful-fortune-cat', 'Lv.1喜乐财喵喵', [16, 17, 18], { entityType: 'pet', sourceItem: '喵喵铃铛', properties: { elements: { fire: 7, wind: 3 }, race: '特殊系', skillSlots: 9, correction: '无', growthGrades: [12, 14, 32, 23, 44] } })], { version: '2026' }),
    pool('labor-2024-pool', '2024', [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 43, 44, 45], [
      laborReward('2024-guardian', '王者守护神', [22]),
      laborReward('2024-medal', '劳动节奖章', [23, 32, 33, 34, 35], { entityType: 'equipment', properties: { level: 5, category: '护身符', durability: 200, attack: { min: 50, max: 55 }, agility: { min: 25, max: 30 }, spirit: { min: 15, max: 20 }, critical: { min: 12, max: 15 }, accuracy: { min: 17, max: 20 }, magic: { min: 160, max: 180 }, magicalAttack: { min: 20, max: 25 }, variableStats: true, tradeable: true } }),
      laborReward('2024-perfect-helmet', '十全十美安全帽', [24]),
      laborReward('2024-mantis-card', '致命螳螂变身卡', [25]),
      laborReward('2024-tomato-card', '番茄精灵变身卡', [26]),
      laborReward('2024-ladder-card', '天梯积分卡', [27, 46], { properties: { tradeable: false } }),
      laborReward('2024-mouse-egg', '鼠王惊奇蛋', [28, 36]),
      laborReward('2024-skill-certificate', '技能学习证', [29]),
      laborReward('2024-dragovit-revised', '德拉格维特改', [21, 30, 43, 44, 45], { replacementFor: '德拉格维特精华', correctionReason: '更正宠物德拉格维特属性异常' })
    ], { appliesToVersions: ['2024', '2025'] }),
    rewardEvent('mouse-king-egg-prizes', 'reward-pool', [31, 36, 37, 38, 39, 40, 41, 42], [
      laborReward('mouse-prize-1', 'Lv.1鼠王', [37], { prizeTier: 1, entityType: 'pet' }),
      laborReward('mouse-prize-2-card', '鼠王的卡片', [38], { prizeTier: 2, bundle: '二等奖' }),
      laborReward('mouse-prize-2-crystal', '水晶（纯属性）', [38], { prizeTier: 2, bundle: '二等奖' }),
      laborReward('mouse-prize-3', '鼠娃娃兑换券', [39], { prizeTier: 3 }),
      laborReward('mouse-prize-4-red-medicine', '试验红药水（150血）', [40], { prizeTier: 4, quantity: 3, bundle: '四等奖' }),
      laborReward('mouse-prize-4-taiyaki', '特制鲷鱼烧（150魔）', [40], { prizeTier: 4, quantity: 3, bundle: '四等奖' }),
      laborReward('mouse-prize-5-potion', '生命回复药（75）', [41], { prizeTier: 5, quantity: 3, bundle: '五等奖' }),
      laborReward('mouse-prize-5-bread', '面包', [41], { prizeTier: 5, quantity: 3, bundle: '五等奖' }),
      laborReward('mouse-prize-6-tomato', '蕃茄', [42], { prizeTier: 6, quantity: 20, distribution: '原文未说明整组获得或随机其一' }),
      laborReward('mouse-prize-6-hide', '鹿皮', [42], { prizeTier: 6, quantity: 20, distribution: '原文未说明整组获得或随机其一' }),
      laborReward('mouse-prize-6-egg', '鸡蛋', [42], { prizeTier: 6, quantity: 20, distribution: '原文未说明整组获得或随机其一' }),
      laborReward('mouse-prize-6-copper', '铜', [42], { prizeTier: 6, quantity: 20, distribution: '原文未说明整组获得或随机其一' }),
      laborReward('mouse-prize-6-mint', '苹果薄荷', [42], { prizeTier: 6, quantity: 20, distribution: '原文未说明整组获得或随机其一' }),
      laborReward('mouse-prize-6-wood', '印度轻木', [42], { prizeTier: 6, quantity: 20, distribution: '原文未说明整组获得或随机其一' }),
      laborReward('mouse-prize-6-seal-card', '封印卡（种族随机）', [42], { prizeTier: 6, quantity: 5, distribution: '原文未说明整组获得或随机其一' })
    ], { version: '2024-2025', sourceItem: '鼠王惊奇蛋', prizeTiers: 6 }),
    pool('labor-2023-pool', '2023', [47, 48], [
      laborReward('2023-ladder-card', '天梯积分卡', [48]),
      laborReward('2023-mouse-egg', '鼠王惊奇蛋', [48]),
      laborReward('2023-skill-certificate', '技能学习证', [48]),
      laborReward('2023-perfect-helmet-revised', '十全十美安全帽·改（10次）', [48]),
      laborReward('2023-medal', '劳动节奖章', [48]),
      laborReward('2023-red-joker-egg', '红魔乔卡之卵', [48])
    ])
  ],
  flowNotes: [
    v([2], { type: 'known-drop-locations', locations: ['坎村', '雷村', '冰树', '砍牛', '半山', '玄武', '新城（斯特隆海姆城）', '新村新城之间的山洞', '矿村'] }),
    v([3], { type: 'known-no-drop-locations', locations: ['海底', '新海底', '小雷', '内心', '杰村', '蒂娜', '贡品', '雪山', '柯村', '新村', '米村', '鲁村'] })
  ],
  lineTypes: ['chance-drop-rule', 'known-drop-locations', 'known-no-drop-locations', 'item-use', 'item-properties', 'version-heading', 'reward-item', 'reward-item', 'reward-item', 'reward-item', 'reward-item', 'reward-item', 'reward-item', 'reward-item', 'version-detail-heading', 'item-use-result', 'pet-detail', 'pet-growth-detail', 'media-heading', 'version-inheritance', 'version-heading', 'reward-item', 'reward-item', 'reward-item', 'reward-item', 'reward-item', 'reward-item', 'reward-item', 'reward-item', 'reward-item-replaced', 'version-detail-heading', 'item-heading', 'equipment-detail', 'equipment-stats', 'equipment-properties', 'item-use-heading', 'prize-tier', 'prize-tier', 'prize-tier', 'prize-tier', 'prize-tier', 'prize-tier', 'correction-heading', 'reward-replacement', 'replacement-exchange', 'item-reference', 'version-heading', 'reward-list']
});

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第七十二批3条任务的逐行语义核验。');
