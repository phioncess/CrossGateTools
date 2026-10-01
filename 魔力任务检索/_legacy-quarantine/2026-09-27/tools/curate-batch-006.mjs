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
  q.segments = q.source.rawLines.map((raw, i) => v([raw.line], { line: raw.line, text: raw.text, type: c.lineTypes[i] }));
  q.itemEvents = { inputs: c.steps.flatMap(s => s.inputs.map(e => ({ ...e, step: s.id, version: 'common', tier: 'common' }))), acquisitions: c.steps.flatMap(s => s.outputs.map(e => ({ ...e, step: s.id, version: 'common', tier: 'common' }))) };
  delete q.legacy;
}

{
  const battle = v([7], { id: 'battle-1', order: 1, kind: 'boss-battle', title: '海神', triggerStep: 'step-6', overview: v([7], { text: '与海神（22.16）对话进入战斗；来源未列敌人等级、血量和技能。' }), enemies: { 'enemy-1': v([7], { id: 'enemy-1', name: '海神', level: null, hp: null, count: 1, raw: '与海神（22.16）对话进入战斗' }) } });
  curate('catalog-01e5177f-05dc-4daf-b25b-3a3671053a97', '水之都', {
    startLocation: '雷克塔尔镇加蒙神官（83.80）', requirements: [v([9], { type: 'held-item-alternative', alternatives: ['非常优良的紫水晶', '非常优良的骑士宝石'], itemLevel: 8, appliesToStep: 'step-8' })],
    steps: [
      step('step-1', 1, '与加蒙神官（83.80）对话，选择“是”并交出500G，获得【贝尼恰斯教团许可】。', [1], [input('金币', 1, { quantity: 500, unit: 'G' })], [output('贝尼恰斯教团许可', 1)]),
      step('step-2', 2, '前往港湾管理处，与往诺斯菲拉特的港湾管理人员（29.23）对话，交出许可，获得【特效解毒剂】并传送至冲破迷雾号。', [2], [input('贝尼恰斯教团许可', 2)], [output('特效解毒剂', 2)]),
      step('step-3', 3, '等待3分钟后与冲破迷雾号水手（45.21）对话，交出【特效解毒剂】，传送至水之都。', [3], [input('特效解毒剂', 3)], [], { waitBeforeStep: { minutes: 3 } }),
      step('step-4', 4, '前往村长的家，与村长恰恰（8.7）对话，获得【提供氧气的怪鱼】。', [4], [], [output('提供氧气的怪鱼', 4)]),
      step('step-5', 5, '离开村长的家，与水之都（56.7）的强壮渔夫对话，经蓝色传送石进入迷雾之海随机迷宫。', [5, 6]),
      step('step-6', 6, '通过迷雾之海抵达海神祭坛，与海神（22.16）对话进入战斗。', [7]),
      step('step-7', 7, '战斗胜利后与海神对话，交出【提供氧气的怪鱼】，获得【海洋之心原石】和【海神的祝福】，传送回水之都。', [8, 11], [input('提供氧气的怪鱼', 8)], [output('海洋之心原石', 8), output('海神的祝福', 8)]),
      step('step-8', 8, '持有Lv.8非常优良的紫水晶或骑士宝石，与村长恰恰对话，交出宝石和【海洋之心原石】，获得【海洋之心宝石】及称号“和鱼接过吻的人”，任务完结。', [9, 10], [input('Lv.8宝石', 9, { alternatives: ['非常优良的紫水晶', '非常优良的骑士宝石'] }), input('海洋之心原石', 9)], [output('海洋之心宝石', 9)])
    ],
    encounters: [v([6], { id: 'encounter-misty-sea', location: '迷雾之海随机迷宫', approximateFloors: 18, minimumEnemyLevel: 50, enemies: ['水龙蜥', '颚牙'] })], battles: { 'battle-1': battle },
    rewardEvents: [
      re('reward-sea-god-blessing', 'battle-reward', [8, 11], [ri('sea-god-blessing', '海神的祝福', [8, 11], { entityType: 'equipment', properties: { level: 8, category: '护身符', durability: 200, attack: 26, agility: 6, spirit: 6, critical: 11, accuracy: 11, magicAttack: 11, effect: '装备后偷袭几率上升', titleAcquisition: { action: '装备时与称号管理NPC对话', title: '海洋之心' } } })], { step: 'step-7' }),
      re('reward-ocean-heart-gem', 'quest-completion', [9, 10], [ri('ocean-heart-gem', '海洋之心宝石', [9, 10], { properties: { level: 8, category: '武器/防具宝石', socketEffects: { accuracy: 8, counter: -8 } } })], { step: 'step-8' })
    ],
    outcomes: { titles: [v([9], { name: '和鱼接过吻的人', acquisition: 'quest-completion' }), v([11], { name: '海洋之心', acquisition: '装备海神的祝福时与称号管理NPC对话' })], careers: [], skills: [] },
    lineTypes: ['step', 'step', 'delayed-step', 'step', 'step', 'encounter-area', 'battle-trigger', 'step', 'step', 'reward-detail', 'reward-detail']
  });
}

curate('catalog-bd3fd666-a504-402c-802d-dca6103d0c86', '霞之洞窟', {
  startLocation: '伊尔村外随机黄色传送石', requirements: [],
  relations: { prerequisites: [], itemSources: [], references: [v([2], { type: 'tool-reference', item: '锥形水晶', target: '锥形水晶使用指南' }), v([11], { type: 'story', target: '霞之洞窟任务剧情对话' })] },
  steps: [
    step('step-1', 1, '在伊尔村外芙蕾雅（586~699.248~322）范围寻找随机出现的黄色传送石。', [1, 2]),
    step('step-2', 2, '进入霞之洞窟，寻找随机出现的旅行商人巴鲁斯，选择“是”获得【写有线索的纸条】。', [3, 4, 5, 6], [], [output('写有线索的纸条', 3)]),
    step('step-3', 3, '到达最下层与旅行商人巴洛克（14.6）对话，选择“是”并交出纸条，获得【耳饰？】，随后全队传送至芙蕾雅岛。对话前应解散队伍，避免仅一人取得耳饰后全队被传送。', [7, 8, 9, 10], [input('写有线索的纸条', 7)], [output('耳饰？', 7)])
  ],
  encounters: [v([4, 5, 6], { id: 'encounter-misty-cave', location: '霞之洞窟随机迷宫', floors: 10, refreshTimeHours: 2, refreshTimeApproximate: true, mapSize: { min: '40*40', max: '80*80' }, chestCount: 3, enemyLevel: { min: 3, max: 13 }, enemies: ['宝贝炸弹', '水果蝙蝠'], maximumEnemyCount: 7 })],
  rewardEvents: [re('reward-glass-earring', 'quest-completion', [7, 9, 10], [ri('glass-earring', '耳饰？', [7, 9, 10], { entityType: 'equipment', identifiedName: '玻璃耳环', properties: { level: 1, category: '耳环', durability: 50, charm: 20, tradeable: true } })], { step: 'step-3' })],
  lineTypes: ['step', 'reference', 'step', 'encounter-area', 'encounter-detail', 'encounter-detail', 'step', 'party-warning', 'reward-detail', 'reward-detail', 'reference']
});

{
  const battle = v([4, 5, 6, 7], { id: 'battle-1', order: 1, kind: 'boss-battle', title: '接头人', triggerStep: 'step-3', overview: v([4, 5], { text: '与藏身处接头人（11.5）对话进入战斗。' }), enemies: { 'enemy-1': v([6], { id: 'enemy-1', name: '接头人', level: { min: 60, max: 60 }, hp: { min: 12000, max: 12000, approximate: true }, count: 1, actions: 2, skills: ['攻击', '防御', '阳炎', '攻击反弹', '强力冰冻魔法', '强力风刃魔法', '超强混乱魔法'], raw: 'Lv.60接头人，2动，血量约12000' }), 'enemy-2': v([7], { id: 'enemy-2', name: '破坏狂', level: { min: 45, max: 45 }, hp: { min: 2000, max: 2000, approximate: true }, count: 9, actions: 1, elements: { 地: 50, 水: 50 }, skills: ['攻击', '防御', '诸刃', '酒醉攻击'], raw: 'Lv.45破坏狂*9，1动，血量约2000，属性：地50水50' }) } });
  curate('catalog-0a2e29e2-41b8-4958-9534-23cba322e7c9', '寻迹', {
    startLocation: '里谢里雅堡2楼王室安全顾问（52.23）', requirements: [v([2], { type: 'time-window', value: '黄昏或夜晚', appliesToStep: 'step-2' })],
    relations: { prerequisites: [], itemSources: [], references: [v([11], { type: 'story', target: '法兰王国的暗流系列任务剧情对话' })] },
    steps: [
      step('step-1', 1, '与王室安全顾问（52.23）对话，获得【迷彩麻布】。', [1], [], [output('迷彩麻布', 1)]),
      step('step-2', 2, '黄昏或夜晚调查维诺亚村外（373.489）的树，交出【迷彩麻布】，传送至隐秘之路，再从（45.39）黄色传送石进入秘密通道。', [2, 3], [input('迷彩麻布', 2)]),
      step('step-3', 3, '通过随机迷宫抵达藏身处，与接头人（11.5）对话进入战斗。', [4, 5, 6, 7]),
      step('step-4', 4, '战斗胜利后调查名册？（11.12），选择“是”，获得【成员名册】。', [8], [], [output('成员名册', 8)]),
      step('step-5', 5, '返回与王室安全顾问对话，交出【成员名册】，获得【禁卫勋章】，任务完结。', [9, 10], [input('成员名册', 9)], [output('禁卫勋章', 9)])
    ],
    encounters: [v([3], { id: 'encounter-secret-passage', location: '秘密通道随机迷宫', approximateFloors: { min: 12, max: 16 }, enemyLevel: { min: 38, max: 54 }, enemies: ['盗贼', '破坏狂'] })], battles: { 'battle-1': battle },
    rewardEvents: [re('reward-guard-medal', 'quest-completion', [9, 10], [ri('guard-medal', '禁卫勋章', [9, 10], { entityType: 'equipment', properties: { level: 3, category: '护身符', durability: 300, defense: { min: 45, max: 54 }, spirit: { min: 5, max: 8 }, life: { min: 194, max: 233 }, valuesFluctuate: true, tradeable: false, effects: [{ skill: '攻击吸收', manaCostChangePercent: -50 }], equippedTitle: '法兰禁卫队精英' } })], { step: 'step-5' })],
    outcomes: { titles: [v([10], { name: '法兰禁卫队精英', acquisition: 'equip-item', item: '禁卫勋章' })], careers: [], skills: [] },
    lineTypes: ['step', 'step', 'encounter-area', 'battle-trigger', 'battle-heading', 'enemy', 'enemy', 'step', 'step', 'reward-detail', 'reference']
  });
}

{
  const smallBagPool = re('reward-small-magic-bag-pool', 'reward-pool', [8, 9], [ri('magic-herb', '神奇的香草', [8, 9], { properties: { use: '随机增加50点技能经验' } }), ri('magic-potion', '神奇药水', [8, 9], { properties: { lifeRecovery: 15, approximate: true, cooldown: false } }), ri('super-magic-potion', '超级神奇药水', [8, 9], { properties: { magicRecovery: 70, approximate: true, cooldown: false } })], { selection: 'random-one', openedFrom: '小号神奇包袱' });
  curate('catalog-7f01b5cf-335d-48d9-b91f-c68d52315ad8', '祖传秘方', {
    startLocation: '法兰城三名秘方持有人（顺序不限）', requirements: [],
    steps: [
      step('step-1', 1, '向大师兄豆豆（15.16）交出50G，获得【秘方1】。', [1, 2], [input('金币', 1, { quantity: 50, unit: 'G' })], [output('秘方1', 1)], { sequenceOrderRequired: false }),
      step('step-2', 2, '向南门喷泉附近的二师姐妮妮（152.165）交出50G，获得【秘方2】。', [3, 4], [input('金币', 3, { quantity: 50, unit: 'G' })], [output('秘方2', 3)], { sequenceOrderRequired: false }),
      step('step-3', 3, '向拿潘食品店外的三师弟小丸子（214.48）交出50G，获得【秘方3】。', [5, 6], [input('金币', 5, { quantity: 50, unit: 'G' })], [output('秘方3', 5)], { sequenceOrderRequired: false }),
      step('step-4', 4, '向旅行商团老师（148.129）交出200G和三份秘方，获得【智者徽章】、【神奇包袱】及称号“冤大头”，任务完结。', [7, 8, 9, 11], [input('金币', 7, { quantity: 200, unit: 'G' }), input('秘方1', 7), input('秘方2', 7), input('秘方3', 7)], [output('智者徽章', 7), output('神奇包袱', 7)]),
      step('step-5', 5, '完成任务一次后，可直接向旅行商团老师购买【小号神奇包袱】，无需再次收集秘方；来源未列购买价格。', [10], [], [output('小号神奇包袱', 10, { acquisition: 'purchase-price-unspecified' })], { optional: true, repeatable: true })
    ],
    rewardEvents: [re('reward-secret-recipe-completion', 'quest-completion', [7, 8], [ri('wise-medal', '智者徽章', [7]), ri('magic-bundle', '神奇包袱', [7, 8], { properties: { transformationChain: ['双击获得中号神奇包袱', '双击中号神奇包袱获得小号神奇包袱', '双击小号神奇包袱随机获得一种奖品'] } })], { step: 'step-4' }), smallBagPool],
    outcomes: { titles: [v([7, 11], { name: '冤大头', acquisition: 'quest-completion', issue: '更换装备后登出会消失；与阿蒙对话可再次获得；来源推测为BUG' })], careers: [], skills: [] },
    lineTypes: ['purchase', 'order-rule', 'purchase', 'location-note', 'purchase', 'location-note', 'step', 'item-lifecycle', 'reward-detail', 'repeat-purchase', 'title-issue']
  });
}

{
  const designs = ri('pardoned-turkey-design-series', '待宰的火鸡设计图A—E', [8, 10, 11], { entityType: 'item-series', variants: ['A', 'B', 'C', 'D', 'E'], properties: { use: '与任意等级待宰的火鸡交给裘瑟贝（195.67）改造为Lv.1被特赦的火鸡' } });
  curate('catalog-73d7cc1a-04aa-4394-814f-eccdb88dad54', '被特赦的火鸡', {
    startLocation: '里谢里雅堡1楼右侧厨房大地之母（4.7）', requirements: [v([9], { type: 'inventory-maximum', item: '美味火鸡', maximumExclusive: 3, appliesToStep: 'step-3' })],
    steps: [
      step('step-1', 1, '与大地之母（4.7）对话，获得【不明兑换券】；兑换券登出消失，后续需步行。', [1, 2], [], [output('不明兑换券', 1, { properties: { logoutBehavior: '消失' } })]),
      step('step-2', 2, '在伊尔村附近森林寻找随机位置的灵异人，交出【不明兑换券】，获得【感恩节兑换券】；该券登出消失。', [5, 6, 7], [input('不明兑换券', 5)], [output('感恩节兑换券', 5, { properties: { logoutBehavior: '消失' } })]),
      step('step-3', 3, '返回大地之母处交出【感恩节兑换券】，随机获得设计图A—E、不明物体？或美味火鸡之一。', [8, 9, 10, 11, 12], [input('感恩节兑换券', 8)], [output('随机奖品', 8, { acquisition: 'random-one' })])
    ],
    encounters: [v([3, 4], { id: 'encounter-butcher-turkey', location: '芙蕾雅大陆随机遭遇', enemy: { name: '待宰的火鸡', level: { min: 1, max: 4 } }, drops: [{ item: '待宰的火鸡的卡片', kind: 'chance', properties: { cardLevel: 3, cardRarity: '普卡', enablesCapture: true } }, { item: '美味火鸡', kind: 'chance', properties: { magicRecovery: 200, stackLimit: 3, dropBehavior: '丢地消失' } }] })],
    rewardEvents: [re('reward-pardoned-turkey-pool', 'reward-pool', [8, 10, 11, 12], [designs, ri('unknown-object-turkey', '不明物体？', [8, 10], { properties: { level: 5, afterAppraisal: '随机一张待宰的火鸡设计图A—E' } }), ri('delicious-turkey', '美味火鸡', [8, 9], { properties: { magicRecovery: 200, stackLimit: 3, dropBehavior: '丢地消失' } })], { step: 'step-3', selection: 'random-one' })],
    outcomes: { titles: [], careers: [], skills: [], pets: [v([11, 12], { name: 'Lv.1被特赦的火鸡', acquisition: '宠物改造', petProfile: { race: '飞行系', elements: { 水: 3, 火: 7 }, skillSlots: 9, baseStats: { 体: 25, 力: 40, 防: 18, 敏: 25, 魔: 12 }, totalGrade: 120 } })] },
    lineTypes: ['step', 'item-detail', 'encounter-drop', 'card-detail', 'step', 'item-detail', 'location-note', 'step', 'blocking-condition', 'reward-detail', 'item-use', 'pet-detail']
  });
}

{
  const battle = v([7, 8], { id: 'battle-1', order: 1, kind: 'boss-battle', title: '偷懒的山贼', triggerStep: 'step-5', overview: v([7], { text: '与偷懒的山贼（250.490）对话进入战斗。' }), enemies: { 'enemy-1': v([8], { id: 'enemy-1', name: '偷懒的山贼', level: { min: 40, max: 40 }, hp: { min: 2500, max: 2500, approximate: true }, count: 1, skills: ['攻击', '防御', '气功弹', '诸刃'], raw: 'Lv40偷懒的山贼，血量约2500；技能：攻击、防御、气功弹、诸刃' }) } });
  curate('catalog-3bd6ff97-73be-41c6-8ecf-03f7ec18e09a', '法兰王国的暗流', {
    startLocation: '里谢里雅堡2楼王室安全顾问（52.23）', requirements: [],
    relations: { prerequisites: [], itemSources: [], references: [v([3], { type: 'route', targetQuest: '就职忍者', destination: '乌克兰村' }), v([12], { type: 'story', target: '法兰王国的暗流系列任务剧情对话' })] },
    steps: [
      step('step-1', 1, '与王室安全顾问（52.23）对话，选择“是”，获得【协查通告】。', [1], [], [output('协查通告', 1)]),
      step('step-2', 2, '前往乌克兰村村长家门口，调查木桶（70.31）并输入“驱雾”了解情报。', [2, 3]),
      step('step-3', 3, '前往维诺亚村，调查出口附近大树（66.45）并输入“驱雾”了解情报。', [4]),
      step('step-4', 4, '从芙蕾雅岛（299.538）进入维诺亚海底洞窟并通过固定地图。', [5, 6]),
      step('step-5', 5, '通过洞窟后与偷懒的山贼（250.490）对话进入战斗。', [7, 8]),
      step('step-6', 6, '战斗胜利后再次与偷懒的山贼对话，变更场景。', [9]),
      step('step-7', 7, '与法兰禁卫队长（17.27）对话，交出【协查通告】，获得【犯人的口供】。', [10], [input('协查通告', 10)], [output('犯人的口供', 10)]),
      step('step-8', 8, '返回与王室安全顾问对话，交出【犯人的口供】，任务完结。', [11], [input('犯人的口供', 11)])
    ],
    encounters: [v([6], { id: 'encounter-vinoy-undersea', location: '维诺亚海底洞窟固定地图', floors: 3, enemyLevel: { min: 26, max: 27 }, enemies: ['水龙蜥', '蜥蜴战士'] })], battles: { 'battle-1': battle },
    lineTypes: ['step', 'step', 'reference', 'step', 'step', 'encounter-area', 'battle-trigger', 'enemy', 'step', 'step', 'step', 'reference']
  });
}

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第六批 6 条任务的逐行语义核验。');
