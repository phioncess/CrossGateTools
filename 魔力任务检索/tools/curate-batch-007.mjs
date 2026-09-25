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
  q.versions = { common: { key: 'common', label: '通用', changes: [], tiers: { common: { key: 'common', label: '通用', order: 0, battles: c.battles || {}, encounters: c.encounters || [], media: c.media || [], notes: [] } } } };
  q.rewardEvents = c.rewardEvents || [];
  q.outcomes = c.outcomes || { titles: [], careers: [], skills: [] };
  q.exchangeRecipes = c.exchangeRecipes || [];
  q.segments = q.source.rawLines.map((raw, i) => v([raw.line], { line: raw.line, text: raw.text, type: c.lineTypes[i] }));
  q.itemEvents = { inputs: c.steps.flatMap(s => s.inputs.map(e => ({ ...e, step: s.id, version: 'common', tier: 'common' }))), acquisitions: c.steps.flatMap(s => s.outputs.map(e => ({ ...e, step: s.id, version: 'common', tier: 'common' }))) };
  delete q.legacy;
}

curate('catalog-9cdba7d5-eae8-45d3-a361-60513bbb5d7b', '哥布林的绿头盔', {
  startLocation: '法兰城拿潘食品店（217.52）', requirements: [],
  relations: { prerequisites: [], itemSources: [], references: [v([9], { type: 'story', target: '哥布林的绿头盔任务剧情对话' })] },
  steps: [
    step('step-1', 1, '与爱头盔的波月（15.5）对话了解任务；此步可以跳过。', [1]),
    step('step-2', 2, '在芙蕾雅指定区域击倒哥布林，随机取得【绿头盔】；哥布林之家内的哥布林不会掉落。', [2, 3, 4], [], [output('绿头盔', 2, { acquisition: 'random-drop' })]),
    step('step-3', 3, '返回拿潘食品店与波月对话，交出【绿头盔】，获得【全套面包招待券】。', [5], [input('绿头盔', 5)], [output('全套面包招待券', 5)]),
    step('step-4', 4, '再次与波月对话，交出【全套面包招待券】和60G，获得16个【小麦粉】、10个【牛奶】和5个【盐】，任务完结。', [6, 7, 8], [input('全套面包招待券', 6), input('金币', 6, { quantity: 60, unit: 'G' })], [output('小麦粉', 7, { quantity: 16 }), output('牛奶', 7, { quantity: 10 }), output('盐', 7, { quantity: 5 })])
  ],
  rewardEvents: [
    re('green-helmet-drop', 'battle-drop', [2, 3, 4], [ri('green-helmet', '绿头盔', [2, 4], { entityType: 'equipment', properties: { level: 1, category: '头盔', durability: { min: 5, max: 10 }, defense: 1, agility: { min: -3, max: -2 }, charm: { min: -10, max: -5 }, tradeable: false, shopPrice: { amount: 1, unit: 'G' } } })], { step: 'step-2' }),
    re('bread-materials', 'quest-completion', [7, 8], [ri('wheat-flour', '小麦粉', [7, 8], { quantity: 16, use: '制作面包' }), ri('milk', '牛奶', [7, 8], { quantity: 10, use: '制作面包' }), ri('salt', '盐', [7, 8], { quantity: 5, use: '制作面包' })], { step: 'step-4' })
  ],
  flowNotes: [v([10, 11], { type: 'known-bug', text: '绿头盔位于物品栏第二栏时无法兑换招待券。' }), v([10, 12], { type: 'known-bug', text: '装备绿头盔时，在银行不能双击物品取出。' })],
  lineTypes: ['optional-step', 'collection-event', 'drop-exclusion', 'item-detail', 'step', 'step', 'step-continuation', 'item-use', 'reference', 'bug-heading', 'known-bug', 'known-bug']
});

{
  const recipes = [
    re('gem-exchange-clock', 'exchange-recipe', [7], [ri('gem-clock', '打卡器', [7], { properties: { use: '开启或关闭工作时间' } })], { inputs: { A型凭证: 10, B型凭证: 5 } }),
    re('gem-exchange-carrot', 'exchange-recipe', [8], [ri('rabbit-king-carrot', '兔子王的胡萝卜', [8], { properties: { use: '造型临时变更为围巾兔，并开启或关闭工作时间' } })], { inputs: { A型凭证: 15, B型凭证: 7 } }),
    ...[['liberius-beer', '李贝留斯啤酒', '李贝留斯'], ['baros-beer', '巴洛斯啤酒', '巴洛斯'], ['akasi-beer', '阿卡斯啤酒', '阿卡斯'], ['fliboro-beer', '佛利波罗啤酒', '佛利波罗']].map((entry, index) => re(`gem-exchange-${entry[0]}`, 'exchange-recipe', [9 + index], [ri(entry[0], entry[1], [9 + index], { properties: { use: `造型临时变更为${entry[2]}` } })], { inputs: { A型凭证: 20, B型凭证: 15 } }))
  ];
  curate('catalog-38b4e347-5453-48f9-a561-d9e4baaa83f8', '流浪的宝石商人', {
    startLocation: '法兰城凯蒂夫人的店门口流浪的宝石商人（194.72）', requirements: [],
    steps: [
      step('step-1', 1, '与流浪的宝石商人（194.72）对话，进入宝石商人的宝库。', [1]),
      step('step-2', 2, '向A型或B型宝石回收器交出对应的Lv.8宝石，按1:1获得对应凭证。A型接受石榴石、黄宝石、蓝宝石；B型接受绿宝石、冒险宝石；紫水晶和骑士宝石不接受。', [2, 4], [input('Lv.8宝石', 2, { acceptedByMachine: { A型: ['石榴石', '黄宝石', '蓝宝石'], B型: ['绿宝石', '冒险宝石'] }, excluded: ['紫水晶', '骑士宝石'] })], [output('A型/B型凭证', 2, { conversionRatio: '1:1' })]),
      step('step-3', 3, '使用A型或B型凭证兑换机，按兑换表消耗对应数量的凭证取得奖品，任务完结。', [3, 5, 6, 7, 8, 9, 10, 11, 12])
    ],
    rewardEvents: recipes, exchangeRecipes: recipes.map(event => event.id),
    lineTypes: ['step', 'conversion', 'exchange-step', 'conversion-mapping', 'exchange-heading', 'table-header', 'exchange-recipe', 'exchange-recipe', 'exchange-recipe', 'exchange-recipe', 'exchange-recipe', 'exchange-recipe']
  });
}

{
  const battles = {
    'battle-lotus': v([6, 7, 8, 9], { id: 'battle-lotus', order: 1, kind: 'route-battle', routeItem: '莲蓉月饼', title: '欧兹那克（莲蓉路线）', triggerStep: 'step-5', overview: v([6, 9], { text: '持莲蓉月饼与欧兹那克对话进入战斗；来源未列该路线BOSS等级。' }), enemies: { 'enemy-1': v([6], { id: 'enemy-1', name: '欧兹那克', level: null, hp: null, count: 1, raw: '持有【月饼】与欧兹那克对话，进入战斗' }) } }),
    'battle-five-nut': v([6, 10], { id: 'battle-five-nut', order: 2, kind: 'route-battle', routeItem: '五仁月饼', title: '欧兹那克（五仁路线）', triggerStep: 'step-5', overview: v([10], { text: '五仁月饼路线进入Lv.40 BOSS战。' }), enemies: { 'enemy-1': v([10], { id: 'enemy-1', name: '欧兹那克', level: { min: 40, max: 40 }, hp: null, count: 1, raw: '交出【五仁月饼】进入Lv40BOSS战' }) } }),
    'battle-bear-meat': v([6, 11], { id: 'battle-bear-meat', order: 3, kind: 'route-battle', routeItem: '熊肉月饼', title: '欧兹那克（熊肉路线）', triggerStep: 'step-5', overview: v([11], { text: '熊肉月饼路线进入Lv.120 BOSS战。' }), enemies: { 'enemy-1': v([11], { id: 'enemy-1', name: '欧兹那克', level: { min: 120, max: 120 }, hp: null, count: 1, raw: '交出【熊肉月饼】进入Lv120BOSS战' }) } })
  };
  curate('catalog-f5a898e6-40b4-40db-b58c-ff675d452786', '欧兹那克的“月饼节”', {
    startLocation: '圣拉鲁卡村向恩（30.53）', requirements: [],
    steps: [
      step('step-1', 1, '与向恩（30.53）对话，选择“是”，获得【鬼的标志（新）】。', [1], [], [output('鬼的标志（新）', 1)]),
      step('step-2', 2, '找到村中4个孩子，分别取得对应证明；再与向恩对话，得知三种月饼路线。', [2], [], [output('4个孩子的证明', 2, { quantity: 4, sourceNamesUnspecified: true })]),
      step('step-3', 3, '输入“莲蓉月饼”“五仁月饼”或“熊肉月饼”，交出此前获得的任务道具，取得对应月饼。', [3, 4], [input('鬼的标志（新）', 3), input('4个孩子的证明', 3, { quantity: 4 })], [output('月饼', 3, { variants: ['莲蓉月饼', '五仁月饼', '熊肉月饼'] })]),
      step('step-4', 4, '持有任意一种月饼与向恩对话，传送至哈巴鲁东边洞穴地下2楼。', [5], [input('月饼', 5, { action: 'hold', consumed: false })]),
      step('step-5', 5, '持有月饼与欧兹那克对话，按月饼种类进入对应战斗。', [6, 8, 9, 10, 11]),
      step('step-6', 6, '战斗胜利后与欧兹那克对话，按路线取得奖励并传送回法兰城，任务完结。', [7, 8, 9, 10, 11, 12], [input('月饼', 7, { variants: ['莲蓉月饼', '五仁月饼', '熊肉月饼'] })], [output('路线奖励', 7, { variantByInput: { 莲蓉月饼: '莲蓉蛋黄月饼', 五仁月饼: '斧形饰物', 熊肉月饼: '永久称号“？？级人物”' } })])
    ], battles,
    rewardEvents: [re('mooncake-route-rewards', 'reward-pool', [9, 10, 11, 12], [ri('lotus-yolk-mooncake', '莲蓉蛋黄月饼', [9]), ri('axe-shaped-ornament', '斧形饰物', [10, 12], { entityType: 'equipment', properties: { level: 5, category: '护身符', attack: { min: 20, max: 23 }, defense: -7, agility: -5, spirit: 5, magicAttack: 10, evasion: 5, critical: 8, magicResistance: 20, charm: -10, durability: { min: 150, max: 200 }, tradeable: false, petMailable: false, droppable: false, stackable: false, bankable: false, equippedTitle: '战斧斗士(伪)' } })], { selection: 'by-route' })],
    outcomes: { titles: [v([11], { name: '？？级人物', permanent: true, acquisition: '熊肉月饼路线战斗胜利' }), v([12], { name: '战斧斗士(伪)', acquisition: '装备斧形饰物' })], careers: [], skills: [] },
    lineTypes: ['step', 'collection-event', 'route-selection', 'route-advice', 'step', 'battle-trigger', 'step', 'route-heading', 'route-reward', 'route-battle-reward', 'route-battle-title', 'reward-detail']
  });
}

{
  const battle = v([5, 6, 7, 8, 9], { id: 'battle-1', order: 1, kind: 'boss-battle', title: '楀与随机出现的震', triggerStep: 'step-4', overview: v([5, 9], { text: '与楀（22.55）对话进入战斗；震随机出现。' }), enemies: { 'enemy-1': v([7], { id: 'enemy-1', name: '楀', level: { min: 70, max: 70 }, hp: { min: 15000, max: 15000, approximate: true }, count: 1, elements: { 地: 30, 水: 30, 火: 30, 风: 30 }, skills: ['恢复魔法（只给自己放）', '强力昏睡魔法', '圣盾E1', '攻击无效（震在时追加）'], raw: '楀：Lv.70，血量约15000，属性：全30' }), 'enemy-2': v([8, 9], { id: 'enemy-2', name: '震', level: { min: 95, max: 95 }, hp: { min: 26000, max: 26000, approximate: true }, count: { min: 0, max: 1 }, appearance: 'random', elements: { 地: 30, 水: 30, 火: 30, 风: 50 }, skills: ['诛刃V', '混乱攻击EX', '吸血攻击（李贝留斯）', '圣盾E1', '战栗袭心LV.10'], raw: '震：Lv.95，血量约26000，属性：地/水/火30风50；随机出现' }) } });
  curate('catalog-5499b375-f050-466f-8137-719b27a058b5', '闪现的“恶”龙', {
    startLocation: '加纳村离（72.70）', requirements: [],
    steps: [
      step('step-1', 1, '与加纳村离（72.70）对话，获得【风水盘】。', [1], [], [output('风水盘', 1)]),
      step('step-2', 2, '前往鲶鱼洞窟地底湖，与大鲶鱼大人（39.32）对话，进入大鲶鱼口内。', [2]),
      step('step-3', 3, '依次通过胃袋、大肠，进入小肠。', [3, 4]),
      step('step-4', 4, '找到楀（22.55）并对话进入战斗；震可能随机加入。', [5, 6, 7, 8, 9]),
      step('step-5', 5, '战斗胜利后，队伍中随机一人获得【楀珠】。', [10], [], [output('楀珠', 10, { acquisition: 'random-party-member' })]),
      step('step-6', 6, '持有【楀珠】的队员与震（47.64）对话，交出楀珠，全队传送至鲶鱼洞窟地底湖。', [11], [input('楀珠', 11)]),
      step('step-7', 7, '前往地底湖（38.34）与离对话，获得称号“来自【震】的挑战”，传送到索奇亚，任务结束。', [12])
    ],
    encounters: [v([4], { id: 'encounter-catfish', locations: ['鲶鱼大王的口内', '胃袋', '大肠', '小肠'], enemyLevel: { min: 53, max: 55 }, enemies: ['蓝色口臭鬼', '布丁史莱姆'] })], battles: { 'battle-1': battle },
    outcomes: { titles: [v([12], { name: '来自【震】的挑战', acquisition: 'quest-completion' })], careers: [], skills: [] },
    lineTypes: ['step', 'step', 'step', 'encounter-area', 'battle-trigger', 'battle-heading', 'enemy', 'enemy', 'random-enemy-note', 'step', 'step', 'step']
  });
}

{
  const recipes = [
    re('bug-exchange-herb', 'exchange-recipe', [8], [ri('strange-herb', '奇怪的草药', [8], { properties: { skillExperience: 100, tradeable: true } })], { inputs: [{ item: '春季的害虫', quantity: 20 }] }),
    re('bug-exchange-pickaxe', 'exchange-recipe', [9], [ri('broken-miner-pickaxe', '坏掉的矿工锄', [9], { properties: { use: '造型变更为随机哥布林并开启工作时间', tradeable: true } })], { inputs: [{ item: '春季的害虫', quantity: 20 }] }),
    re('bug-exchange-helmet', 'exchange-recipe', [10], [ri('perfect-safety-helmet', '十全十美安全帽', [10], { properties: { effect: '可抵挡受伤10次', tradeable: true } })], { inputs: [{ item: '春季的害虫', quantity: 40 }] }),
    re('bug-exchange-demon-grass-plan', 'exchange-recipe', [11], [ri('demon-grass-plan-series', '妖草设计图A—E', [11], { entityType: 'item-series', variants: ['A', 'B', 'C', 'D', 'E'], selection: 'choose-one', properties: { tradeable: true, resultPet: { name: '贝拉多娜草', totalGrade: 125, baseStats: { 血: 25, 攻: 12, 防: 29, 敏: 17, 魔: 42 }, race: '植物系', elements: { 地: 80, 水: 20 }, skillSlots: 8 } } })], { inputs: [{ item: '春季的害虫', quantity: 80 }] }),
    re('bug-exchange-earth-minotaur-fragment', 'exchange-recipe', [12], [ri('earth-minotaur-fragment', '大地牛头怪碎片', [12], { properties: { tradeable: true, combineRequirement: 30, combineResult: '大地牛头怪精华' } })], { inputs: [{ item: '春季的害虫', quantity: 99 }], outputQuantity: 'source-unspecified' })
  ];
  curate('catalog-2bd311b6-2e44-428a-9533-98f8134268dd', '实验室春季除虫', {
    startLocation: '法兰城工作招募者（93.62）', requirements: [v([2], { type: 'gathering-skill-level', minimumLevel: 5 })],
    steps: [
      step('step-1', 1, '与工作招募者（93.62）对话，选择“是”，进入研究所。', [1]),
      step('step-2', 2, '拥有Lv.5采集技能的职业在三处对应地块采集，可取得【土块】或【春季的害虫】。', [2, 3, 4], [], [output('土块', 2, { acquisition: 'gathering', properties: { stackSize: 20, use: '暂无用处', dropBehavior: '丢地消失' } }), output('春季的害虫', 2, { acquisition: 'gathering', properties: { stackSize: 999, tradeable: false } })]),
      step('step-3', 3, '持有相应数量的【春季的害虫】与工作奖励兑换员（75.41）对话，按兑换表取得奖品，任务完结。', [5, 6, 7, 8, 9, 10, 11, 12])
    ],
    rewardEvents: recipes, exchangeRecipes: recipes.map(event => event.id),
    lineTypes: ['step', 'collection-event', 'item-detail', 'item-detail', 'exchange-step', 'reward-rule', 'table-header', 'exchange-recipe', 'exchange-recipe', 'exchange-recipe', 'exchange-recipe', 'exchange-recipe']
  });
}

curate('half-5', '小岛之谜', {
  startLocation: '里谢里雅堡2楼图书馆阿斯提亚祭司（27.15）',
  requirements: [v([1], { type: 'completed-quest', quest: '圣鸟之谜' }), v([2], { type: 'title', title: '保守秘密的人' }), v([7], { type: 'title-absence', title: '背叛者', reason: '已有该称号时不能重解本任务' })],
  relations: { prerequisites: [v([1], { quest: '圣鸟之谜', relation: 'required' })], itemSources: [], references: [v([7], { type: 'next-quest-item', quest: '地狱的回响', item: '锄头' }), v([12], { type: 'story', target: '半山系列任务剧情对话' })] },
  steps: [
    step('step-1', 1, '与阿斯提亚祭司（27.15）对话，获得【阿斯提亚锥形水晶】。若已有“背叛者”称号则不能重解，并改为获得半山6任务道具【锄头】。', [3, 7], [], [output('阿斯提亚锥形水晶', 3, { condition: '没有“背叛者”称号' }), output('锄头', 7, { condition: '已有“背叛者”称号', belongsToQuest: '地狱的回响' })]),
    step('step-2', 2, '双击【阿斯提亚锥形水晶】传送至小岛，从（64.45）黄色传送石进入通往山顶的路。', [4], [input('阿斯提亚锥形水晶', 4, { action: 'use', consumed: false })]),
    step('step-3', 3, '通过随机迷宫进入圣鸟之巢，与圣鸟的子嗣（14.11）对话进入圣山之巅。', [5, 8, 9]),
    step('step-4', 4, '与阿鲁卡那斯（23.22）对话，交出【阿斯提亚锥形水晶】，获得称号“背叛者”并传送回法兰城，任务完结。', [6], [input('阿斯提亚锥形水晶', 6)])
  ],
  encounters: [v([8, 9], { id: 'encounter-mountain-road', location: '通往山顶的路随机迷宫', floors: 19, enemyLevel: { min: 9, max: 15 }, enemies: ['狂奔鸟', '托罗帝鸟', '火焰啄木鸟', '岩地跑者'], fixedEnemyCount: 1, halfMountainEncounter: false })],
  flowNotes: [v([10], { type: 'post-completion-transport', npc: '法兰城西门外阿鲁卡（398.168）', cost: { amount: 800, unit: 'G' }, destination: '小岛' }), v([11], { type: 'alternate-transport-condition', title: '死神', destination: '小岛' })],
  outcomes: { titles: [v([6], { name: '背叛者', acquisition: 'quest-completion' })], careers: [], skills: [] },
  lineTypes: ['prerequisite', 'requirement', 'step', 'step', 'step', 'step', 'gate-and-alternate-output', 'encounter-area', 'encounter-rule', 'post-completion-service', 'alternate-condition', 'reference']
});

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第七批 6 条任务的逐行语义核验。');
