import fs from 'node:fs';

const dataPath = new URL('../data-src/quests.json', import.meta.url);
const database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const v = (lines, value = {}) => ({ ...value, sourceLines: lines, verification: { status: 'verified', method: 'manual-semantic-review' } });
const input = (item, line, extra = {}) => v([line], { item, quantity: 1, action: 'hand-over', ...extra });
const output = (item, line, extra = {}) => v([line], { item, quantity: 1, acquisition: 'guaranteed', ...extra });
const step = (id, order, text, lines, inputs = [], outputs = [], extra = {}) => v(lines, { id, order, text, inputs, outputs, notes: [], ...extra });
const rewardItem = (id, name, lines, extra = {}) => v(lines, { id, name, role: 'valuable-result', ...extra });
const rewardEvent = (id, kind, lines, items, extra = {}) => v(lines, { id, version: 'common', tier: 'common', kind, items, ...extra });

function curate(id, name, config) {
  const quest = database.quests[id];
  if (!quest || quest.name !== name) throw new Error(`任务不匹配：${id} / ${name}`);
  if (config.lineTypes.length !== quest.source.lineCount) throw new Error(`${name} 的逐行类型数量不一致`);
  quest.schemaVersion = 2;
  quest.verification = { status: 'verified', method: 'manual-semantic-review', reviewedSourceRanges: [[1, quest.source.lineCount]], note: '全部原文行已逐条核验。' };
  quest.requirements = { conditions: config.requirements || [] };
  quest.relations = config.relations || { prerequisites: [], itemSources: [], references: [] };
  quest.flow = { start: v(config.steps[0].sourceLines, { stepId: config.steps[0].id, location: config.startLocation }), steps: config.steps, notes: config.flowNotes || [] };
  quest.versions = { common: { key: 'common', label: '通用', changes: [], tiers: { common: { key: 'common', label: '通用', order: 0, battles: config.battles || {}, encounters: config.encounters || [], notes: [], media: [] } } } };
  quest.rewardEvents = config.rewardEvents || [];
  quest.outcomes = config.outcomes || { titles: [], careers: [], skills: [] };
  quest.segments = quest.source.rawLines.map((raw, index) => v([raw.line], { line: raw.line, text: raw.text, type: config.lineTypes[index] }));
  quest.itemEvents = {
    inputs: config.steps.flatMap(s => s.inputs.map(event => ({ ...event, step: s.id, version: 'common', tier: 'common' }))),
    acquisitions: config.steps.flatMap(s => s.outputs.map(event => ({ ...event, step: s.id, version: 'common', tier: 'common' })))
  };
  delete quest.legacy;
}

curate('catalog-5c1a30f3-3194-4e39-a84c-478aecd8386f', '劳动节奖章', {
  startLocation: '里谢里雅堡1楼劳动节专员（75.24）',
  requirements: [v([1], { type: 'held-item', item: '劳动节小奖牌', quantity: 300 })],
  relations: { prerequisites: [], itemSources: [v([2], { item: '劳动节小奖牌', sourceDescription: '此前会掉落邪灵水晶的地点', tradeable: true })], references: [] },
  steps: [
    step('step-1', 1, '在里谢里雅堡1楼（75.24）向劳动节专员交出300个【劳动节小奖牌】，兑换【劳动节奖章】，任务完结。', [1], [input('劳动节小奖牌', 1, { quantity: 300 })], [output('劳动节奖章', 1)])
  ],
  rewardEvents: [
    rewardEvent('reward-labor-day-medal', 'exchange', [1, 3, 4, 5, 6], [
      rewardItem('labor-day-medal', '劳动节奖章', [1, 3, 4, 5, 6], { entityType: 'equipment', properties: { level: 5, category: '护身符', durability: 200, attack: { min: 50, max: 55 }, agility: { min: 25, max: 30 }, spirit: { min: 15, max: 20 }, critical: { min: 12, max: 15 }, accuracy: { min: 17, max: 20 }, magic: { min: 160, max: 180 }, magicAttack: { min: 20, max: 25 }, valuesFluctuate: true, tradeable: true } })
    ], { step: 'step-1' })
  ],
  flowNotes: [v([7], { type: 'availability-note', text: '奖励兑换延后至5月26日关闭；来源未标明年份。' })],
  lineTypes: ['step', 'item-source', 'reward-heading', 'reward-detail', 'reward-detail', 'reward-detail', 'availability-note']
});

{
  const battle = v([5, 6], {
    id: 'battle-1', order: 1, kind: 'boss-battle', title: '青龙护卫', triggerStep: 'step-3',
    overview: v([5], { text: '与青龙护卫（24.22）对话进入战斗。' }),
    enemies: {
      'enemy-1': v([6], { id: 'enemy-1', name: '青龙护卫', count: { min: 1, max: 2 }, level: { min: 90, max: 90 }, hp: { min: 22000, max: 22000, approximate: false }, elements: { 地: 30, 水: 30, 火: 30, 风: 30 }, skills: ['混乱攻击E1', '吸血攻击（500血）', '诛刃V', '战栗袭心LV.10', '圣盾', '混乱魔法'], raw: '青龙护卫：数量1-2；LV.90；HP 22000；属性：全30；技能：混乱攻击E1，吸血攻击（500血），诛刃V、战栗袭心LV.10、圣盾、混乱魔法。' })
    }
  });
  curate('catalog-87ed579c-3fba-4516-91f9-4614862b5f36', '龙之穴', {
    startLocation: '雪山之顶（41.8）永久冻土入口',
    requirements: [v([2], { type: 'title', title: '来自【震】的挑战' })],
    relations: { prerequisites: [], itemSources: [], references: [v([2], { type: 'clarification', text: '不需要世界之心；入口应与“离”对话，来源特别说明是“鸡”，不是人魔草。' })] },
    steps: [
      step('step-1', 1, '前往雪山之顶，从（41.8）进入永久冻土，与“离”（10.21）对话进入永久冻土地下。', [1, 2]),
      step('step-2', 2, '通过（21.8）传送石迷宫，进入青龙居所。', [3, 4]),
      step('step-3', 3, '通过永久冻土后，在青龙居所与青龙护卫（24.22）对话进入战斗。', [5, 6]),
      step('step-4', 4, '战斗胜利后与震（24.22）对话，获得称号“青龙的邀约”，任务结束。', [7])
    ],
    encounters: [v([4], { id: 'encounter-permafrost', location: '永久冻土随机迷宫', floors: 36, enemyLevel: { min: 55, max: 63 }, enemies: ['水龙蜥', '蜥蜴战士', '风龙蜥', '蜥蜴武士'] })],
    battles: { 'battle-1': battle },
    outcomes: { titles: [v([7], { name: '青龙的邀约', acquisition: 'quest-completion' })], careers: [], skills: [] },
    lineTypes: ['step', 'requirement-and-clarification', 'step', 'encounter-area', 'battle-trigger', 'enemy', 'step']
  });
}

curate('catalog-166eca64-fa0c-464f-a103-77db0aaef893', '是个皇后的人才', {
  startLocation: '亚诺曼城外北方忠心仆人溥杰（324.317）',
  requirements: [],
  steps: [
    step('step-1', 1, '与忠心仆人溥杰（324.317）对话，获得【坏仆人的情报】。', [1], [], [output('坏仆人的情报', 1)]),
    step('step-2', 2, '前往亚诺曼城比利啤酒屋与醉汉阿达（20.16）对话，交出【坏仆人的情报】，获得【烈酒】。', [2], [input('坏仆人的情报', 2)], [output('烈酒', 2)]),
    step('step-3', 3, '前往克瑞村酒吧与坏仆人可古越（12.18）对话，交出【烈酒】，获得【洪刹的情报】。', [3], [input('烈酒', 3)], [output('洪刹的情报', 3)]),
    step('step-4', 4, '进入酒吧客房，与王子费侪（10.7）对话，交出【洪刹的情报】，获得【王子血染的脏手帕】。', [4], [input('洪刹的情报', 4)], [output('王子血染的脏手帕', 4)]),
    step('step-5', 5, '返回与溥杰对话，交出【王子血染的脏手帕】，获得【头饰？】，任务完结。', [5], [input('王子血染的脏手帕', 5)], [output('头饰？', 5)])
  ],
  rewardEvents: [
    rewardEvent('reward-prince-signed-accessory', 'quest-completion', [5, 6, 7], [
      rewardItem('prince-signed-accessory', '头饰？', [5, 6, 7], { entityType: 'equipment', identifiedName: '王子签名的发饰', properties: { level: 1, category: '乐器', charm: 2, durability: 20, tradeable: false, equippedTitle: '是个皇后的人才' } })
    ], { step: 'step-5' })
  ],
  outcomes: { titles: [v([7], { name: '是个皇后的人才', acquisition: 'equip-item', item: '王子签名的发饰' })], careers: [], skills: [] },
  lineTypes: ['step', 'step', 'step', 'step', 'step', 'reward-detail', 'reward-detail']
});

curate('catalog-d48f9124-01a9-478e-8897-70dc00be1f04', '爱情仪式', {
  startLocation: '法兰城情人节活动专员（233.126）',
  requirements: [v([2], { type: 'held-item', item: '流星耳环', quantity: 1 }), v([6], { type: 'cross-gender-proof', text: '男性角色持有爱的证明（女）；女性角色持有爱的证明（男）。' })],
  relations: { prerequisites: [], itemSources: [v([3], { item: '流星耳环', sourceQuest: '流星山丘' })], references: [] },
  steps: [
    step('step-1', 1, '与法兰城情人节活动专员（233.126）对话。', [1]),
    step('step-2', 2, '持有【流星耳环】时，在庆典会场与活动专员（35.25）对话，交出耳环，按角色性别获得对应【爱的证明】。', [2, 4, 5, 8], [input('流星耳环', 2)], [output('爱的证明（男）/（女）', 2, { variantByCharacterGender: { 男: '爱的证明（男）', 女: '爱的证明（女）' }, tradeable: true, repeatableForEachHeldInput: true })]),
    step('step-3', 3, '持有异性版本的【爱的证明】与庆典会场活动专员对话，交出证明，获得对应称号和【爱情之力】，任务完结。', [6, 7], [input('爱的证明（男）/（女）', 6, { requiredOppositeGenderVariant: true })], [output('爱情之力', 6)])
  ],
  rewardEvents: [rewardEvent('reward-power-of-love', 'quest-completion', [6], [rewardItem('power-of-love', '爱情之力', [6], { properties: { sourceDoesNotDescribeEffect: true } })], { step: 'step-3' })],
  outcomes: { titles: [v([6, 7], { variants: { 男: '她的男神', 女: '他的女神' }, acquisition: 'quest-completion' })], careers: [], skills: [] },
  lineTypes: ['step', 'step', 'item-source', 'variant-rule', 'item-detail', 'step', 'title-detail', 'repeatability-note']
});

curate('catalog-deebc7b2-2b3e-48f6-8f80-4bf96e1c8906', '暗黑骑士', {
  startLocation: '法兰城大圣堂地下仓库',
  requirements: [v([1], { type: 'career', career: '近卫骑士' }), v([1], { type: 'title', title: '死神' })],
  relations: { prerequisites: [], itemSources: [], references: [v([3], { type: 'title-source', title: '死神', sourceQuest: '死与新生' })] },
  steps: [
    step('step-1', 1, '前往法兰城大圣堂地下仓库，与快被净化的黑魂（37.26）对话，选择“是”，获得【暗黑之枪】并传送至法兰城（193.191）。', [1, 2], [], [output('暗黑之枪', 1)], { notes: [v([2], { type: 'route', text: '从大圣堂入口（5.14）进入通往地下楼梯的房间，再经（16.13）楼梯进入地下仓库。' })] }),
    step('step-2', 2, '持有【暗黑之枪】与塞西尔.哈威（195.191）对话，选择“是”并交出枪，获得称号“暗黑骑士”后传送至？？？。', [4, 5, 6], [input('暗黑之枪', 4)], [], { notes: [v([5], { text: '获得称号后职业仍为骑士，装备和技能上限不变。' }), v([6], { text: '称号仅限近卫骑士持有；后续转为其他职业时同步失去。' })] }),
    step('step-3', 3, '在？？？内可分别向克莱斯和阿基斯付费学习技能。', [7, 8], [], [], { serviceOptions: [v([8], { npc: '克莱斯（24.22）', cost: { amount: 10000, unit: 'G' }, result: { type: 'skill', name: '吸血攻击' } }), v([8], { npc: '阿基斯（26.19）', cost: { amount: 5000, unit: 'G' }, result: { type: 'skill', name: '暗黑骑士之力' } })], notes: [v([7], { type: 'reentry', text: '离开？？？后，可在法兰城（193.191）与塞西尔.哈威对话再次进入。' })] })
  ],
  outcomes: { titles: [v([4, 5, 6], { name: '暗黑骑士', acquisition: 'step-2', careerRestriction: '近卫骑士', lostOnCareerChange: true })], careers: [], skills: [v([8], { name: '吸血攻击', cost: { amount: 10000, unit: 'G' } }), v([8], { name: '暗黑骑士之力', cost: { amount: 5000, unit: 'G' } })] },
  lineTypes: ['step', 'route', 'reference', 'step', 'title-detail', 'title-restriction', 'reentry-note', 'skill-learning']
});

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第二批 5 条任务的逐行语义核验。');
