import fs from 'node:fs';

const dataPath = new URL('../data-src/quests.json', import.meta.url);
const database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const v = (lines, value = {}) => ({ ...value, sourceLines: lines, verification: { status: 'verified', method: 'manual-semantic-review' } });
const input = (item, line, extra = {}) => v([line], { item, quantity: 1, action: 'hand-over', ...extra });
const output = (item, line, extra = {}) => v([line], { item, quantity: 1, acquisition: 'guaranteed', ...extra });
const step = (id, order, text, lines, inputs = [], outputs = [], extra = {}) => v(lines, { id, order, text, inputs, outputs, notes: [], ...extra });
const ri = (id, name, lines, extra = {}) => v(lines, { id, name, role: 'valuable-result', ...extra });
const re = (id, kind, lines, items, extra = {}) => v(lines, { id, version: 'common', tier: 'common', kind, items, ...extra });

function curate(id, name, c) {
  const q = database.quests[id];
  if (!q || q.name !== name) throw new Error(`任务不匹配：${id} / ${name}`);
  if (c.lineTypes.length !== q.source.lineCount) throw new Error(`${name} 行类型数量错误`);
  q.schemaVersion = 2;
  q.verification = { status: 'verified', method: 'manual-semantic-review', reviewedSourceRanges: [[1, q.source.lineCount]], note: '全部原文行已逐条核验。' };
  q.requirements = { conditions: c.requirements || [] };
  q.relations = c.relations || { prerequisites: [], itemSources: [], references: [] };
  q.flow = { start: v(c.steps[0].sourceLines, { stepId: c.steps[0].id, location: c.startLocation }), steps: c.steps, notes: c.flowNotes || [] };
  q.versions = { common: { key: 'common', label: '通用', changes: [], tiers: { common: { key: 'common', label: '通用', order: 0, battles: c.battles || {}, encounters: c.encounters || [], notes: [], media: [] } } } };
  q.rewardEvents = c.rewardEvents || [];
  q.outcomes = c.outcomes || { titles: [], careers: [], skills: [] };
  q.exchangeRecipes = c.exchangeRecipes || [];
  q.segments = q.source.rawLines.map((raw, i) => v([raw.line], { line: raw.line, text: raw.text, type: c.lineTypes[i] }));
  q.itemEvents = {
    inputs: c.steps.flatMap(s => s.inputs.map(e => ({ ...e, step: s.id, version: 'common', tier: 'common' }))),
    acquisitions: c.steps.flatMap(s => s.outputs.map(e => ({ ...e, step: s.id, version: 'common', tier: 'common' })))
  };
  delete q.legacy;
}

curate('catalog-b2ab4900-405e-444a-81b1-8da8257cd440', '送给爱狗的朋友', {
  startLocation: '法兰城孤儿看守者（171.25）',
  requirements: [v([1], { type: 'held-pet', pet: 'Lv.1地狱看门犬', quantity: 1 })],
  relations: { prerequisites: [], itemSources: [v([2], { item: 'Lv.1地狱看门犬', sourceDescription: '持有Lv.20或以上地狱看门犬时，可在亚留特村基墨（48.37）处兑换' })], references: [] },
  steps: [
    step('step-1', 1, '与法兰城孤儿看守者（171.25）对话，交出Lv.1地狱看门犬，获得【丢失处示意图】。', [1, 2], [input('Lv.1地狱看门犬', 1, { entityType: 'pet' })], [output('丢失处示意图', 1)]),
    step('step-2', 2, '前往亚留特村外，在（670.140）附近寻找红色传送石，进入流浪狗聚集地并通过随机迷宫。', [3, 4]),
    step('step-3', 3, '到达流浪狗窝点后调查丢失的狗粮（23.17），交出示意图，获得【一罐狗粮】。', [5], [input('丢失处示意图', 5, { sourceSpellingVariant: '丢失出示意图' })], [output('一罐狗粮', 5)]),
    step('step-4', 4, '返回法兰城与孤儿看守者对话，交出【一罐狗粮】，获得【宠物手术工具】和永久称号“喜爱狗狗的人”，任务完结。', [6], [input('一罐狗粮', 6)], [output('宠物手术工具', 6)])
  ],
  encounters: [v([4], { id: 'encounter-stray-dog-maze', location: '流浪狗聚集地随机迷宫', approximateFloors: 14, enemies: [{ name: '被激怒的流浪狗', level: 70, count: { min: 1, max: 4 } }], battleExperience: false, skillExperience: true })],
  rewardEvents: [re('reward-pet-surgery-tools', 'quest-completion', [6, 7, 8], [ri('pet-surgery-tools', '宠物手术工具', [6, 7, 8], { properties: { tradeable: true, use: { location: '法兰城裘瑟贝（195.66）', additionalInput: 'Lv.1地狱看门犬', result: 'Lv.1冥府守门狗' } } })], { step: 'step-4' })],
  outcomes: { titles: [v([6], { name: '喜爱狗狗的人', permanent: true, acquisition: 'quest-completion' })], careers: [], skills: [] },
  lineTypes: ['step', 'item-source', 'step', 'encounter-area', 'step', 'step', 'reward-detail', 'item-use']
});

curate('catalog-f670182f-856f-46d5-b332-97f5efd0b275', '坠落的星辰', {
  startLocation: '法兰城天文狂热者（114.95）',
  requirements: [v([2], { type: 'profession-and-skill', variants: [{ profession: '矿工', location: '海贼的矿山' }, { profession: '猎人', location: '海贼的岛屿' }, { profession: '樵夫', location: '海贼的森林' }], minimumJobSkillLevel: 5 })],
  relations: { prerequisites: [], itemSources: [], references: [v([3], { type: 'route', targetQuest: '海贼的宝地', locations: ['海贼的矿山', '海贼的岛屿', '海贼的森林'] })] },
  steps: [
    step('step-1', 1, '前往法兰城与天文狂热者（114.95）对话，选择“是”；此步可以跳过。', [1]),
    step('step-2', 2, '矿工、猎人、樵夫分别在指定地点使用不低于Lv.5的本职技能，取得【星辰的碎片】。', [2, 3, 4], [], [output('星辰的碎片', 2, { acquisition: 'profession-gathering', quantity: null })], { notes: [v([4], { text: '星辰的碎片不可交易，丢地消失。' })] }),
    step('step-3', 3, '集齐20个【星辰的碎片】后与天文狂热者对话，交出碎片，获得【星光波动鞋】，任务完结。', [5, 6], [input('星辰的碎片', 5, { quantity: 20 })], [output('星光波动鞋', 5)]),
    step('step-4', 4, '持有【星光波动鞋】时，可再次与天文狂热者对话，交出20个【星辰的碎片】，获得【十全十美安全帽】。', [7, 8], [input('星辰的碎片', 7, { quantity: 20 }), input('星光波动鞋', 7, { action: 'hold', consumed: false })], [output('十全十美安全帽', 7)], { optional: true, repeatability: 'source-unspecified' })
  ],
  rewardEvents: [
    re('reward-starlight-wave-shoes', 'quest-completion', [5, 6], [ri('starlight-wave-shoes', '星光波动鞋', [5, 6], { entityType: 'equipment', properties: { level: 2, category: '鞋', durability: 300, magic: 300, luck: '提高（原文未给数值）', tradeable: false, dropBehavior: '丢地消失', titleAcquisition: { action: '装备后与管理称号的NPC对话', title: '舞动的星光' } } })], { step: 'step-3' }),
    re('reward-perfect-helmet', 'optional-exchange', [7, 8], [ri('perfect-helmet', '十全十美安全帽', [7, 8], { entityType: 'equipment', properties: { level: 1, category: '头盔', durability: 200, effect: '可抵挡受伤' } })], { step: 'step-4' })
  ],
  outcomes: { titles: [v([6], { name: '舞动的星光', acquisition: '装备星光波动鞋后与管理称号的NPC对话' })], careers: [], skills: [] },
  lineTypes: ['optional-step', 'collection-event', 'reference', 'item-detail', 'step', 'reward-detail', 'optional-exchange', 'reward-detail']
});

{
  const cards = ['魔', '力', '宝', '贝', '贺', '新', '春'];
  const bossSources = ['露比（巫师袭击事件）', '法尔肯（没落的村庄）', '树精长老（树精长老的末日）', '试作型牛鬼（捉迷藏的铁人）', '改造僵尸（挑战僵尸王）', '牛鬼（牛鬼任务）'];
  const recipes = [
    re('exchange-all-seven-cards', 'exchange-recipe', [5], ['水蓝鼠', '杀人螳螂', '巨人', '虎头蜂'].map((name, i) => ri(`new-year-pet-${i + 1}`, `Lv.1${name}`, [5], { selection: 'random-one' })), { inputs: cards.map(name => ({ item: `「${name}」`, quantity: 1 })), selection: 'random-one' }),
    re('exchange-six-cards', 'exchange-recipe', [6], ['己丑年特制安全帽', '己丑年特制耳环', '己丑年特制手镯', '己丑年特制护身符'].map((name, i) => ri(`new-year-equipment-${i + 1}`, name, [6], { selection: 'random-one' })), { inputs: ['魔', '力', '宝', '贝', '新', '春'].map(name => ({ item: `「${name}」`, quantity: 1 })), selection: 'random-one' }),
    re('exchange-five-cards', 'exchange-recipe', [7], [ri('random-gem', '随机宝石', [7], { quantity: 1 })], { inputs: [{ group: 'fixed', items: ['「魔」', '「力」', '「宝」', '「贝」'] }, { group: 'choose-one', items: ['「贺」', '「新」', '「春」'] }] }),
    re('exchange-four-cards', 'exchange-recipe', [8], [ri('random-rebirth-seed', '随机“重来的种子”', [8], { quantity: 1 })], { inputs: ['魔', '力', '宝', '贝'].map(name => ({ item: `「${name}」`, quantity: 1 })) }),
    re('exchange-three-cards', 'exchange-recipe', [9], ['生命力回复药200', '炒面', '随机生产系采集品'].map((name, i) => ri(`new-year-supply-${i + 1}`, name, [9], { selection: 'random-one', quantity: name === '随机生产系采集品' ? 1 : 1, unit: name === '随机生产系采集品' ? '组' : name === '炒面' ? '个' : '瓶' })), { inputs: [{ group: 'choose-three-distinct', items: ['「魔」', '「力」', '「宝」', '「贝」'] }], selection: 'random-one' })
  ];
  curate('catalog-9b864ff3-b6e4-4749-9e9f-31afbe452308', '2009己丑年春节任务（怀旧版）', {
    startLocation: '六个指定BOSS的战斗地点',
    requirements: [],
    steps: [
      step('step-1', 1, '击倒指定BOSS，有一定几率取得七种新年福卡之一；七种卡分别为“魔、力、宝、贝、贺、新、春”。', [1, 2, 3], [], [output('新年福卡（七字之一）', 1, { acquisition: 'chance', variants: cards.map(name => `「${name}」`), sourceBosses: bossSources })]),
      step('step-2', 2, '收集指定组合后，前往法兰城旅馆2楼与新年福卡兑奖员兑换相应奖励。', [1, 4, 5, 6, 7, 8, 9])
    ],
    rewardEvents: recipes,
    exchangeRecipes: recipes.map(event => event.id),
    lineTypes: ['collection-and-exchange-overview', 'boss-heading', 'boss-list', 'reward-heading', 'exchange-recipe', 'exchange-recipe', 'exchange-recipe', 'exchange-recipe', 'exchange-recipe']
  });
}

{
  const battle = v([4, 5], { id: 'battle-1', order: 1, kind: 'optional-boss-battle', title: '牛鬼', triggerStep: 'step-3', overview: v([4, 5], { text: '携带新鲜的粽子与牛鬼对话可进入战斗；来源说明理论上可跳过。' }), enemies: { 'enemy-1': v([4], { id: 'enemy-1', name: '牛鬼', level: null, hp: null, count: 1, raw: '携带【新鲜的粽子】与牛鬼对话进入战斗' }) } });
  curate('catalog-c19ea9c3-1647-4af3-a6c9-c39800600c9d', '被掳走的大使', {
    startLocation: '法兰城东医院附近阿蒙旁的法兰消息员',
    requirements: [v([2], { type: 'time-window', value: '夜晚', appliesToStep: 'step-2' }), v([2], { type: 'quest-progress', quest: '牛鬼讨伐', extent: '完成可进入牛洞宝物库所需的部分进度' }), v([8], { type: 'inventory-absence', item: '迷你龙舟', appliesToStep: 'step-4' })],
    relations: { prerequisites: [v([2], { quest: '牛鬼讨伐', relation: 'partial-progress-required-for-access' })], itemSources: [], references: [] },
    steps: [
      step('step-1', 1, '与法兰消息员对话，得知特使被掳走的信息；此步可以跳过。', [1]),
      step('step-2', 2, '夜晚前往牛洞宝物库，与受伤的特使（23,10）对话，获得【新鲜的粽子】。', [2, 3], [], [output('新鲜的粽子', 2, { properties: { dropBehavior: '不可丢地', tradeable: false, petMailable: false } })]),
      step('step-3', 3, '携带【新鲜的粽子】与牛鬼对话，可进入战斗；此步理论上可以跳过，胜利后获得【牛鬼杀】并传出洞窟。', [4, 5], [input('新鲜的粽子', 4, { action: 'hold', consumed: false })], [output('牛鬼杀', 5, { acquisition: 'battle-victory' })], { optional: true }),
      step('step-4', 4, '前往阿凯鲁法村与卡洛尔（60,173）对话，交出【新鲜的粽子】，获得称号“神灵庇佑的人”和【迷你龙舟】，任务完结。', [6, 7, 8, 9], [input('新鲜的粽子', 6)], [output('迷你龙舟', 6)], { notes: [v([7], { type: 'route', text: '推荐使用阿凯鲁法村传送券整队传送。' }), v([8], { type: 'blocking-condition', text: '物品栏已有迷你龙舟时不能完成此步。' })] })
    ],
    battles: { 'battle-1': battle },
    rewardEvents: [
      re('reward-oni-slayer', 'battle-drop', [5], [ri('oni-slayer', '牛鬼杀', [5])], { step: 'step-3' }),
      re('reward-mini-dragon-boat', 'quest-completion', [6, 9], [ri('mini-dragon-boat', '迷你龙舟', [6, 9], { entityType: 'equipment', properties: { level: 6, category: '护身符', durability: 200, attack: 15, agility: 15, critical: 5, evasion: 5, life: 50, magic: 50, effects: [{ skill: '气功弹', manaCostChangePercent: -15 }], tradeable: true, droppable: true, petMailable: true } })], { step: 'step-4' })
    ],
    outcomes: { titles: [v([6], { name: '神灵庇佑的人', acquisition: 'quest-completion' })], careers: [], skills: [] },
    lineTypes: ['optional-step', 'step-and-requirement', 'item-detail', 'optional-battle-trigger', 'battle-reward', 'step', 'route', 'blocking-condition', 'reward-detail']
  });
}

curate('catalog-54cba72f-ece4-4273-bf3a-ab2ebaa0c79b', '丢失的刻印', {
  startLocation: '法兰城GM的影分身（137,132）',
  requirements: [],
  steps: [
    step('step-1', 1, '与GM的影分身（137,132）对话了解任务；此步可以跳过。', [1]),
    step('step-2', 2, '分别在四个地点战斗取得“国、庆、快、乐”四个道具；四件道具均不可交易。', [2, 3, 4, 5, 6], [], [output('「国」', 3, { acquisition: 'battle-drop', location: '索奇亚海底洞窟' }), output('「庆」', 4, { acquisition: 'battle-drop', location: '马斯的内心世界（包含水晶内）' }), output('「快」', 5, { acquisition: 'battle-drop', location: '巴洛斯岛（砍牛）' }), output('「乐」', 6, { acquisition: 'battle-drop', location: '半山腰' })]),
    step('step-3', 3, '集齐四个刻印后返回GM的影分身处，交出“国、庆、快、乐”，获得【怨灵的结晶】。每个角色仅可完成一次。', [7, 8, 9], [input('「国」', 7), input('「庆」', 7), input('「快」', 7), input('「乐」', 7)], [output('怨灵的结晶', 8)], { repeatability: 'once-per-character' })
  ],
  rewardEvents: [re('reward-wraith-crystal', 'quest-completion', [8, 9], [ri('wraith-crystal', '怨灵的结晶', [8, 9], { properties: { tradeable: true, use: '双击获得Lv.1怨灵', petProfile: { name: '怨灵', appearance: '死灵“绿鬼”形象', race: '不死系', skillSlots: 9, elements: { 地: 70, 水: 30 }, totalGrade: 125, baseStats: { 血: 25, 攻: 11, 防: 21, 敏: 22, 魔: 46 } } } })], { step: 'step-3' })],
  lineTypes: ['optional-step', 'collection-overview', 'collection-source', 'collection-source', 'collection-source', 'collection-source', 'step', 'reward-detail', 'reward-detail']
});

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第三批 5 条任务的逐行语义核验。');
