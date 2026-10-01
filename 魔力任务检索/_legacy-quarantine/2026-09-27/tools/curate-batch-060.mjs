import fs from 'node:fs';

const dataPath = new URL('../data-src/quests.json', import.meta.url);
const database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const v = (sourceLines, value = {}) => ({ ...value, sourceLines, verification: { status: 'verified', method: 'manual-semantic-review' } });
const input = (item, line, value = {}) => v([line], { item, quantity: 1, action: 'hand-over', ...value });
const output = (item, line, value = {}) => v([line], { item, quantity: 1, acquisition: 'guaranteed', ...value });
const step = (id, order, text, sourceLines, inputs = [], outputs = [], value = {}) => v(sourceLines, { id, order, text, inputs, outputs, notes: [], ...value });
const resultItem = (id, name, sourceLines, value = {}) => v(sourceLines, { id, name, role: 'valuable-result', ...value });
const rewardEvent = (id, kind, sourceLines, items, value = {}) => v(sourceLines, { id, version: 'common', tier: 'common', kind, items, ...value });
const foe = (sourceLines, name, raw, value = {}) => v(sourceLines, { name, raw, role: 'enemy', ...value });

function curate(id, name, content) {
  const quest = database.quests[id];
  if (!quest || quest.name !== name) throw new Error(`任务不匹配：${id}/${name}`);
  if (content.lineTypes.length !== quest.source.lineCount) throw new Error(`${name}行类型错误：${content.lineTypes.length}/${quest.source.lineCount}`);
  quest.schemaVersion = 2;
  quest.verification = { status: 'verified', method: 'manual-semantic-review', reviewedSourceRanges: [[1, quest.source.lineCount]], note: '全部原文行已逐条核验。' };
  quest.requirements = { conditions: content.requirements || [] };
  quest.relations = content.relations || { prerequisites: [], itemSources: [], references: [] };
  quest.flow = { start: v(content.steps[0].sourceLines, { stepId: content.steps[0].id, location: content.startLocation }), steps: content.steps, notes: content.flowNotes || [] };
  quest.versions = { common: { key: 'common', label: '通用', changes: content.versionChanges || [], tiers: { common: { key: 'common', label: '通用', order: 0, battles: content.battles || {}, encounters: content.encounters || [], media: content.media || [], notes: content.versionNotes || [] } } } };
  quest.rewardEvents = content.rewardEvents || [];
  quest.outcomes = content.outcomes || { titles: [], careers: [], skills: [] };
  quest.segments = quest.source.rawLines.map((row, index) => v([row.line], { line: row.line, text: row.text, type: content.lineTypes[index] }));
  quest.itemEvents = {
    inputs: content.steps.flatMap((entry) => entry.inputs.map((event) => ({ ...event, step: entry.id, version: 'common', tier: 'common' }))),
    acquisitions: content.steps.flatMap((entry) => entry.outputs.map((event) => ({ ...event, step: entry.id, version: 'common', tier: 'common' })))
  };
  delete quest.legacy;
}

curate('catalog-852a62b0-331f-47aa-a304-117ebfaf2236', '深海历险', {
  startLocation: '斯特隆海姆城资料库（45.33）',
  requirements: [
    v([3], { type: 'time-window', values: ['傍晚', '夜晚'], purpose: '进入海岛秘境' }),
    v([18], { type: 'time-window', values: ['黄昏', '夜晚'], purpose: '进入海盗秘境' }),
    v([3], { type: 'held-item', item: '调查笔记', consumed: false }),
    v([2], { type: 'optional-side-quest', note: '若只为前往矿山小镇烧技能，可跳过本任务，完成新村6即可。' })
  ],
  relations: {
    prerequisites: [],
    itemSources: [],
    references: [
      v([10], { type: 'article-reference', title: '怀旧服刷声望方法', purpose: '水蜘蛛声望数值' }),
      v([27, 28, 29, 30], { type: 'item-unlock', item: '避水珠', unlocks: '海岛秘境无极漩涡与Lv.1巨鳌螃蟹捕捉点' })
    ]
  },
  steps: [
    step('step-1', 1, '进入斯特隆海姆城资料库，与民俗学者八云松（23.11）对话，获得【调查笔记】。', [1, 2], [], [output('调查笔记', 1)]),
    step('step-2', 2, '傍晚或夜晚持有调查笔记，与悠闲的渔夫（22.42）对话，进入海岛秘境。', [3], [input('调查笔记', 3, { action: 'hold', consumed: false })]),
    step('step-3', 3, '与水蜘蛛（28.55）对话战斗。只刷声望可止步于此；胜利后向前一步再退回一步可返回水蜘蛛面前。完成过本任务后仍可重新取得调查笔记来刷声望。', [4, 5, 6, 7, 8, 9, 10, 11], [], [], { repeatableBattle: true }),
    step('step-4', 4, '战胜水蜘蛛后与乌龟贤者（34.36）对话，获得【公主的求助信】，再由（29.28）传送石进入约6层的海底隧道。', [12, 13], [], [output('公主的求助信', 12)]),
    step('step-5', 5, '穿过海底隧道到螃蟹将军的领地，向铁蟹将军（26.11）交出【公主的求助信】，获得【军情信】并传送出迷宫。原文在交付处省略了“的”字，按同一物品归一。', [14], [input('公主的求助信', 14, { sourceName: '公主求助信' })], [output('军情信', 14)]),
    step('step-6', 6, '与乌龟贤者（34.36）对话，交出【军情信】，获得【龟贤者的信物】。', [15], [input('军情信', 15)], [output('龟贤者的信物', 15)]),
    step('step-7', 7, '返回斯特隆海姆城资料室，与民俗学者八云松对话。', [16]),
    step('step-8', 8, '前往西尔维村与豪爽的渔夫（56.60）对话，交出【龟贤者的信物】，获得【碧水珠】。', [17], [input('龟贤者的信物', 17)], [output('碧水珠', 17)]),
    step('step-9', 9, '黄昏至夜晚返回斯特隆海姆城，与悠闲的渔夫（22.42）对话，进入海盗秘境。', [18]),
    step('step-10', 10, '与水蜘蛛（28.55）战斗；胜利后与乌龟贤者（69.13）对话，进入原文写作“宫殿？”的地点。来源未确认地点名，保留问号。', [19], [], [], { sourceUncertainty: '宫殿？' }),
    step('step-11', 11, '与三头海邪龙对话，进入蛟龙与四只水蜘蛛的战斗。', [20, 21, 22, 23]),
    step('step-12', 12, '战斗胜利后与乌龟贤者对话，交出【调查笔记】与【碧水珠】，同一次获得【海族谢礼】与【给渔夫的谢礼】。', [24], [input('调查笔记', 24), input('碧水珠', 24)], [output('海族谢礼', 24), output('给渔夫的谢礼', 24)]),
    step('step-13', 13, '返回斯特隆海姆城资料库，与民俗学者八云松（23.11）对话，交出【海族谢礼】，获得【避水珠】。原文交付处多了“的”字，按同一物品归一。', [25, 26, 27, 28, 29, 30], [input('海族谢礼', 25, { sourceName: '海族的谢礼' })], [output('避水珠', 25)]),
    step('step-14', 14, '返回西尔维村与豪爽的渔夫对话，交出【给渔夫的谢礼】，获得【蛋包饭】，任务完结。', [31], [input('给渔夫的谢礼', 31)], [output('蛋包饭', 31)])
  ],
  battles: {
    'water-spider': v([4, 5, 6, 7, 8, 9, 10, 11], { id: 'water-spider', step: 'step-3', enemies: [foe([6], '水蜘蛛', '水蜘蛛，Lv.45*4，血量约800，技能：攻击、防御、混乱攻击、冰雹魔法', { level: 45, count: 4, hpApprox: 800, skills: ['攻击', '防御', '混乱攻击', '冰雹魔法'] })], repeatableForReputation: true }),
    'sea-dragon': v([20, 21, 22, 23], { id: 'sea-dragon', step: 'step-11', enemies: [foe([22], '蛟龙', 'Lv.50蛟龙，血量约10000；技能：攻击、防御、强力冰冻魔法、石化攻击、诸刃', { level: 50, hpApprox: 10000, skills: ['攻击', '防御', '强力冰冻魔法', '石化攻击', '诸刃'] }), foe([23], '水蜘蛛', 'Lv.45水蜘蛛*4，血量约900；技能：攻击、防御、连击', { level: 45, count: 4, hpApprox: 900, skills: ['攻击', '防御', '连击'] })] })
  },
  rewardEvents: [
    rewardEvent('water-repelling-pearl', 'quest-reward', [25, 26, 27, 28, 29, 30], [resultItem('water-repelling-pearl', '避水珠', [25, 26, 27, 28, 29, 30], { entityType: 'equipment', properties: { level: 4, category: '护身符', tradeable: false, durability: 100, critical: 8, accuracy: 15, statsVariable: true }, unlocks: '无极漩涡及Lv.1巨鳌螃蟹捕捉点' })], { step: 'step-13' }),
    rewardEvent('omelet-rice', 'quest-completion', [31], [resultItem('omelet-rice', '蛋包饭', [31], { entityType: 'item' })], { step: 'step-14' })
  ],
  lineTypes: ['step', 'route-note', 'time-item-gate', 'battle-step', 'battle-heading', 'battle-enemy', 'reputation-heading', 'optional-stop-note', 'repeat-route-note', 'article-reference', 'repeat-acquisition-note', 'step-acquisition', 'maze-note', 'exchange-step', 'exchange-step', 'step', 'exchange-step', 'time-gate-step', 'battle-route-step', 'battle-step', 'battle-heading', 'battle-enemy', 'battle-enemy', 'grouped-exchange-step', 'exchange-step', 'equipment-detail', 'item-unlock', 'route-note', 'maze-note', 'capture-note', 'exchange-completion']
});

curate('catalog-fd811af5-19cd-4cc0-a9e6-bf70a1331368', '捉迷藏的铁人', {
  startLocation: '维诺亚村一郎（47.52）',
  requirements: [
    v([1, 3, 27], { type: 'time-window', values: ['白天', '黄昏', '清晨'], purpose: '一郎与村内小孩出现/对话' }),
    v([3], { type: 'equipped-item', item: '鬼的标志（Lv.1）', purpose: '寻找三名小孩' }),
    v([10, 19], { type: 'all-party-members-item', item: '笔记', purpose: '进入试作型牛鬼战斗' }),
    v([11], { type: 'time-window', values: ['夜晚'], purpose: '由玄关进入怪医生的家' })
  ],
  relations: { prerequisites: [], itemSources: [], references: [v([31], { type: 'story-reference', title: '捉迷藏的铁人任务剧情对话' })] },
  steps: [
    step('step-1', 1, '白天、黄昏或清晨与维诺亚村一郎（47.52）对话选“是”，获得不可交易的Lv.1手环【鬼的标志】；装备后取得称号“捉迷藏的铁人”。', [1, 2], [], [output('鬼的标志（Lv.1）', 1)]),
    step('step-2', 2, '装备Lv.1鬼的标志，在规定时段分别找到忽达巴、小白和阿三，同一次路线取得【鸟的羽毛】、【黑色的碎石头】、【壁虎干】。', [3, 4, 5, 6, 7, 8], [input('鬼的标志（Lv.1）', 3, { action: 'equip', consumed: false })], [output('鸟的羽毛', 6), output('黑色的碎石头', 7), output('壁虎干', 8)], { locations: [{ npc: '忽达巴', coordinateRange: '（61~66.50）', item: '鸟的羽毛', sourceLines: [6] }, { npc: '小白', coordinateRange: '（41~46.29~34）', item: '黑色的碎石头', sourceLines: [7] }, { npc: '阿三', coordinateRange: '（31~37.65~67）', item: '壁虎干', sourceLines: [8] }] }),
    step('step-3', 3, '集齐三件小孩道具后与一郎对话选“是”，每名队员各获得【笔记】。原文未说三件道具在此交出，故只作为持有门禁，不记消耗。', [9, 10], [input('鸟的羽毛', 9, { action: 'hold', consumed: false }), input('黑色的碎石头', 9, { action: 'hold', consumed: false }), input('壁虎干', 9, { action: 'hold', consumed: false })], [output('笔记', 9)]),
    step('step-4', 4, '夜晚持有【笔记】调查玄关（25.46）选“是”，进入怪医生的家。', [11], [input('笔记', 11, { action: 'hold', consumed: false })]),
    step('step-5', 5, '经地下室进入随机7~8层的黑暗医生洞窟；迷宫刷新约4小时、地图50×50至100×100、无宝箱，魔物为Lv.18~20腐尸、僵尸、大蝙蝠，最多8只。', [12, 13, 14, 15, 16]),
    step('step-6', 6, '击倒迷宫内随机出现的多个试作型腐尸，有概率取得【小根的剑】、【小根的帽子】、【小根的上衣】或【小根的帆布鞋】。四件物品属于同一随机掉落事件，不保证全部取得。', [17], [], [output('小根的剑', 17, { acquisition: 'chance' }), output('小根的帽子', 17, { acquisition: 'chance' }), output('小根的上衣', 17, { acquisition: 'chance' }), output('小根的帆布鞋', 17, { acquisition: 'chance' })], { optional: true, groupedAcquisition: true }),
    step('step-7', 7, '到黑暗医生研究所与试作型牛鬼（23.31）对话；队伍所有成员均须持有笔记，交出各自笔记后进入战斗。', [18, 19, 20, 21, 22, 23], [input('笔记', 18)]),
    step('step-8', 8, '战斗胜利后可与根萨斯（22.32）对话，选择性交出已取得的小根装备；此步可省略，来源未写交出后的回报。', [24], [input('小根装备之一', 24, { action: 'optional-hand-over', quantity: '0~4', acceptedItems: ['小根的剑', '小根的帽子', '小根的上衣', '小根的帆布鞋'] })], [], { optional: true, resultUnspecified: true }),
    step('step-9', 9, '经小道与密医希巴（40.23）对话，获得【黑暗医学指南书】，再从（23.6）楼梯返回维诺亚村。', [25, 26], [], [output('黑暗医学指南书', 25)]),
    step('step-10', 10, '白天、黄昏或清晨与一郎（47.52）对话选“是”，交出三件小孩道具、Lv.1鬼的标志及黑暗医学指南书，获得未鉴定的【没有用的东西？】，任务完结。', [27, 28], [input('黑色的碎石头', 28), input('鸟的羽毛', 28), input('壁虎干', 28), input('鬼的标志（Lv.1）', 28, { sourceName: '鬼的标志' }), input('黑暗医学指南书', 28)], [output('没有用的东西？', 28)]),
    step('step-11', 11, '鉴定【没有用的东西？】后成为可交易的Lv.4手环【鬼的标志】，装备后取得称号“捉迷藏超强铁人”。', [29, 30], [input('没有用的东西？', 29, { action: 'appraise' })], [output('鬼的标志（Lv.4）', 29)])
  ],
  battles: {
    'prototype-minotaur': v([18, 19, 20, 21, 22, 23], { id: 'prototype-minotaur', step: 'step-7', enemies: [
      foe([21], '试作型牛鬼', 'Lv.40试作型牛鬼，2动，血量约2500，邪魔系，属性：全30，抗咒；技能：攻击、防御、崩击、乾坤一掷、明镜止水（HP<25%时追加）、装备破坏（HP<25%时追加）', { level: 40, count: 1, actionCount: 2, hpApprox: 2500, race: '邪魔系', elements: '全30', curseResistance: true, skills: ['攻击', '防御', '崩击', '乾坤一掷', '明镜止水（HP<25%时追加）', '装备破坏（HP<25%时追加）'] }),
      foe([22], '试作型腐尸', 'Lv.28~30试作型腐尸*4，2动，血量约1100，不死系，属性：地60水40，不抗咒；技能：攻击、攻击（HP多者）、防御、酒醉攻击、自爆（HP<50%时追加）', { level: { min: 28, max: 30 }, count: 4, actionCount: 2, hpApprox: 1100, race: '不死系', elements: { 地: 60, 水: 40 }, curseResistance: false, skills: ['攻击', '攻击（HP多者）', '防御', '酒醉攻击', '自爆（HP<50%时追加）'] }),
      foe([23], '僵尸', 'Lv.24~26僵尸*5，血量约600，不死系，属性：风60地40，不抗咒；技能：攻击、攻击（HP少者）、吸血攻击、诸刃', { level: { min: 24, max: 26 }, count: 5, hpApprox: 600, race: '不死系', elements: { 风: 60, 地: 40 }, curseResistance: false, skills: ['攻击', '攻击（HP少者）', '吸血攻击', '诸刃'] })
    ] })
  },
  rewardEvents: [
    rewardEvent('starter-mark', 'quest-item-equipment', [1, 2], [resultItem('hide-seek-mark-lv1', '鬼的标志（Lv.1）', [1, 2], { entityType: 'equipment', properties: { level: 1, category: '手环', durability: { min: 100, max: 120 }, tradeable: false, equippedTitle: '捉迷藏的铁人' } })], { step: 'step-1' }),
    rewardEvent('prototype-zombie-drops', 'battle-drop', [17], [resultItem('small-root-equipment-set', '小根装备（随机）', [17], { entityType: 'equipment-set', acquisition: 'chance', variants: ['小根的剑', '小根的帽子', '小根的上衣', '小根的帆布鞋'], propertiesUnspecified: true })], { step: 'step-6', groupedAcquisition: true }),
    rewardEvent('final-mark', 'quest-completion', [28, 29, 30], [resultItem('hide-seek-mark-lv4', '鬼的标志（Lv.4）', [28, 29, 30], { entityType: 'equipment', unidentifiedName: '没有用的东西？', properties: { level: 4, category: '手环', durability: { min: 150, max: 180 }, charm: { min: 1, max: 3 }, tradeable: true, equippedTitle: '捉迷藏超强铁人' } })], { step: 'step-11' })
  ],
  outcomes: { titles: [v([2], { name: '捉迷藏的铁人', condition: '装备Lv.1鬼的标志' }), v([30], { name: '捉迷藏超强铁人', condition: '装备Lv.4鬼的标志' })], careers: [], skills: [] },
  lineTypes: ['time-step-acquisition', 'equipment-detail', 'equipment-gated-collection', 'location-note', 'table-heading', 'collection-row', 'collection-row', 'collection-row', 'held-items-acquisition', 'party-item-gate', 'night-item-gate', 'route-step', 'maze-note', 'maze-note', 'maze-note', 'maze-encounter', 'grouped-random-drop', 'party-item-battle-entry', 'party-item-gate', 'battle-heading', 'battle-enemy', 'battle-enemy', 'battle-enemy', 'optional-hand-over', 'item-acquisition', 'route-step', 'time-step', 'completion-exchange', 'appraisal-result', 'equipment-detail', 'story-reference']
});

curate('catalog-99d0eada-e5eb-4ad9-af87-4e24fa6df010', '加纳的蝎子克星', {
  startLocation: '加纳村离（72.70）',
  requirements: [v([30, 31, 32], { type: 'title-reward-items', items: ['增效毒蝎血清', '泛红光的古代石'], rule: '无两件道具者可陪打，但不能取得称号' })],
  relations: { prerequisites: [], itemSources: [v([4], { item: '红蝎毒', location: '加纳村外鲶鱼洞窟（626.209）', acquisition: '低掉率' }), v([5], { item: '黄蝎毒', location: '加纳村外索奇亚（525.348）', acquisition: '低掉率' }), v([6], { item: '蓝蝎毒', location: '加纳村外索奇亚（582.327）', acquisition: '低掉率' }), v([7], { items: ['蓝蝎毒', '黄蝎毒'], location: '加纳村外索奇亚（582.327）附近', acquisition: '混合出没点、低掉率' })], references: [] },
  steps: [
    step('step-1', 1, '前往加纳村（72.70）与离对话，获得【蝎毒血清】。', [1], [], [output('蝎毒血清', 1)]),
    step('step-2', 2, '在指定地点分别击倒蝎类魔物，低概率收集【红蝎毒】、【黄蝎毒】、【蓝蝎毒】。这是取得事件，不是交付输入；黄蝎毒和蓝蝎毒另有混点。', [2, 3, 4, 5, 6, 7], [], [output('红蝎毒', 4, { acquisition: 'chance-drop' }), output('黄蝎毒', 5, { acquisition: 'chance-drop' }), output('蓝蝎毒', 6, { acquisition: 'chance-drop' })], { groupedAcquisition: false }),
    step('step-3', 3, '回到加纳村（72.70），每人交出红、黄、蓝三种蝎毒，获得【增效毒蝎血清】。', [8], [input('红蝎毒', 8), input('黄蝎毒', 8), input('蓝蝎毒', 8)], [output('增效毒蝎血清', 8)]),
    step('step-4', 4, '从加纳村南门进入索奇亚沙漠，在约（570~640.300~400）区域寻找随机黄色传送石，进入5层随机迷宫砂漠之祠，再到沙漠之庙地下6楼并由（14.13）上楼。来源给出的折线搜索坐标仅作找石路线。', [9, 10, 11, 12, 13, 14, 15, 16]),
    step('step-5', 5, '调查宝箱（42.19）选“是”，获得【古代王族的血壶】。', [17], [], [output('古代王族的血壶', 17)]),
    step('step-6', 6, '与天空的看守者（12.32）对话，交出【古代王族的血壶】，通过栅栏。', [18], [input('古代王族的血壶', 18)]),
    step('step-7', 7, '由（12.37）下楼，调查宝箱（11.8）选“是”，获得【古代莎草制绷带】。', [19], [], [output('古代莎草制绷带', 19)]),
    step('step-8', 8, '由（10.11）上楼，持有【古代莎草制绷带】与天空的看守者对话通过栅栏；此处只要求持有，不消耗。', [20], [input('古代莎草制绷带', 20, { action: 'hold', consumed: false })]),
    step('step-9', 9, '再次调查宝箱（42.19）选“是”，获得第二个【古代王族的血壶】。来源后文未写该血壶的用途，不擅自补交付。', [21], [], [output('古代王族的血壶', 21)], { sourceFollowupUnspecified: true }),
    step('step-10', 10, '与大地的看守者（66.24）对话，交出【古代莎草制绷带】，通过栅栏。', [22], [input('古代莎草制绷带', 22)]),
    step('step-11', 11, '由（34.12）上楼，再由（73.30）下楼。', [23]),
    step('step-12', 12, '调查宝箱（16.4）选“是”，获得【泛红光的古代石】。', [24], [], [output('泛红光的古代石', 24)]),
    step('step-13', 13, '持有【增效毒蝎血清】和【泛红光的古代石】返回沙漠之庙地下6层，与离（12.10）对话，进入狂战将军战斗。无道具的陪打角色也可参战，但不能取得最终称号。', [25, 26, 27, 28, 29, 30], [input('增效毒蝎血清', 25, { action: 'hold', consumed: false }), input('泛红光的古代石', 25, { action: 'hold', consumed: false })]),
    step('step-14', 14, '战斗胜利后与离对话，交出【泛红光的古代石】与【增效毒蝎血清】，获得称号“来自【离】的赞许”，传送至索奇亚并完成任务。', [31, 32], [input('泛红光的古代石', 31), input('增效毒蝎血清', 31)])
  ],
  battles: {
    'berserk-general': v([25, 26, 27, 28, 29, 30], { id: 'berserk-general', step: 'step-13', enemies: [foe([27, 28], '狂战将军', 'LV.100狂战将军，血量约20000，邪魔系，全属性40；技能：攻击、乾坤一掷EX（10魔）、恢复魔法LV3、即死魔法LV3（10魔）、魔法封印LV5（7回合）、EXP抽取魔法LV10、戒骄戒躁', { level: 100, count: 1, hpApprox: 20000, race: '邪魔系', elements: '全40', skills: ['攻击', '乾坤一掷EX（10魔）', '恢复魔法LV3', '即死魔法LV3（10魔）', '魔法封印LV5（7回合）', 'EXP抽取魔法LV10', '戒骄戒躁'] })], strategy: v([29], { text: '战栗BOSS：人物10级战栗显示8以内、宠物V级战栗显示6以内；重点限制乾坤一掷EX与即死魔法。' }) })
  },
  outcomes: { titles: [v([30, 31, 32], { name: '来自【离】的赞许', condition: '战斗后交出泛红光的古代石与增效毒蝎血清；陪打无道具者不获得' })], careers: [], skills: [] },
  lineTypes: ['step-acquisition', 'collection-step', 'collection-heading', 'item-source', 'item-source', 'item-source', 'mixed-item-source', 'exchange-step', 'route-step', 'route-step', 'search-area-note', 'search-guide-heading', 'search-route-note', 'search-route-note', 'maze-note', 'fixed-maze-note', 'step-acquisition', 'gate-exchange', 'step-acquisition', 'held-item-gate', 'step-acquisition', 'gate-exchange', 'route-step', 'step-acquisition', 'item-gated-battle-entry', 'battle-heading', 'battle-enemy', 'battle-enemy-continuation', 'strategy-note', 'reward-gate-note', 'completion-exchange', 'title-outcome']
});

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第六十批3条任务的逐行语义核验。');
