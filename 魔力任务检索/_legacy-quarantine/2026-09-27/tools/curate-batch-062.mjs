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

curate('catalog-74d3cde2-4627-4f32-9ff6-e953983668f8', '路见不平', {
  startLocation: '法兰城安其摩酒吧（102.131）',
  requirements: [],
  relations: { prerequisites: [], itemSources: [], references: [v([5], { type: 'route-reference', targetQuest: '杀熊者欧兹那克', purpose: '到哈巴鲁东边洞穴地下二楼修女琳达处' })] },
  steps: [
    step('step-1', 1, '可选：在安其摩酒吧与酩酊大醉的男人（9.20）对话。', [1], [], [], { optional: true }),
    step('step-2', 2, '与酒店主人（21.12）对话，获得【酒店主人的委托】。', [2], [], [output('酒店主人的委托', 2)]),
    step('step-3', 3, '进入法兰城大圣堂后台，与僧侣特伦（37.26）对话，交出【酒店主人的委托】，获得【老师的信】。', [3], [input('酒店主人的委托', 3)], [output('老师的信', 3)]),
    step('step-4', 4, '到哈巴鲁东边洞穴地下二楼，在杀熊者欧兹那克后方与修女琳达（22.7）对话，交出【老师的信】，获得【药草囊】。', [4, 5], [input('老师的信', 4)], [output('药草囊', 4)]),
    step('step-5', 5, '返回大圣堂后台与僧侣特伦对话，交出【药草囊】，获得【醒酒药汤】。', [6], [input('药草囊', 6)], [output('醒酒药汤', 6)]),
    step('step-6', 6, '在安其摩酒吧向酩酊大醉的男人交出【醒酒药汤】，获得【玛莎的照片】。', [7], [input('醒酒药汤', 7)], [output('玛莎的照片', 7)]),
    step('step-7', 7, '可选：前往圣拉鲁卡村与村长萨巴普对话。', [8], [], [], { optional: true }),
    step('step-8', 8, '调查圣拉鲁卡村（39.43）传送石，进入约12层的巢穴上层随机迷宫。', [9, 10, 11, 12, 13]),
    step('step-9', 9, '由上层底部黄色传送石进入巢穴中部，在三个传送石中选择唯一真传送石；假路线底层与武装骷髅确认后返回中部，真路线底层有栅栏并通往约5~7层的巢穴下层。', [14, 15, 16, 17, 18, 19, 20, 21]),
    step('step-10', 10, '穿过下层到巢穴底部，与BOSS对话，迎战巢穴武装守卫及随从。', [22, 23, 24, 25, 26]),
    step('step-11', 11, '胜利后调查石门（16.9）进入秘密石台，与麦卡恩（21.12）对话，进入第二场战斗。', [27, 28, 29, 30, 31]),
    step('step-12', 12, '战胜麦卡恩后与玛莎对话，交出【玛莎的照片】，获得【玛莎的信】并传送出巢穴。', [32], [input('玛莎的照片', 32)], [output('玛莎的信', 32)]),
    step('step-13', 13, '返回安其摩酒吧向酩酊大醉的男人交出【玛莎的信】，获得称号“爱情捍卫者”，任务完结。', [33], [input('玛莎的信', 33)])
  ],
  encounters: [
    v([10, 11, 12, 13], { id: 'nest-upper', location: '巢穴上层', maze: '随机迷宫', floorsApprox: 12, enemies: [{ name: '巢穴行尸（丧尸）', level: { min: 41, max: 44 }, count: { min: 0, max: 4 } }, { name: '巢穴飞虫（独角仙）', level: { min: 41, max: 44 }, count: { min: 0, max: 4 } }, { name: '巢穴粘液怪（布丁史莱姆）', level: { min: 41, max: 44 }, count: { min: 0, max: 4 } }] }),
    v([18, 19, 20, 21], { id: 'nest-lower', location: '巢穴下层', maze: '随机迷宫', floors: { min: 5, max: 7 }, enemies: [{ name: '巢穴石像怪（石像怪）', level: { min: 45, max: 47 }, count: { min: 0, max: 4 } }, { name: '巢穴捕捉者（水蜘蛛）', level: { min: 45, max: 47 }, count: { min: 0, max: 4 } }, { name: '巢穴卫兵（血骷髅）', level: { min: 45, max: 47 }, count: { min: 0, max: 4 } }] })
  ],
  battles: {
    'armed-guard': v([22, 23, 24, 25, 26], { id: 'armed-guard', enemies: [
      foe([24], '巢穴武装守卫（武装骷髅）', 'Lv.50巢穴武装守卫（武装骷髅），2动，血量约5500；技能：攻击、诸刃、即死魔法（出现几率不高）', { level: 50, count: 1, actionCount: 2, hpApprox: 5500, skills: ['攻击', '诸刃', '即死魔法（出现几率不高）'] }),
      foe([25], '巢穴捕捉者（水蜘蛛）', 'Lv.45巢穴捕捉者（水蜘蛛）*2，1动，血量约1500；技能：攻击、防御、冰冻魔法', { level: 45, count: 2, actionCount: 1, hpApprox: 1500, skills: ['攻击', '防御', '冰冻魔法'] }),
      foe([26], '巢穴卫兵（血骷髅）', 'Lv.45巢穴卫兵（血骷髅）*2，1动，血量约2500；技能：攻击、防御、诸刃、气功弹', { level: 45, count: 2, actionCount: 1, hpApprox: 2500, skills: ['攻击', '防御', '诸刃', '气功弹'] })
    ] }),
    'mckaen': v([27, 28, 29, 30, 31], { id: 'mckaen', enemies: [
      foe([29], '麦卡恩', 'Lv.55麦卡恩，2动，血量约10000；技能：攻击、防御、圣盾、乾坤一掷、连击、气功弹、全体即死、混乱攻击（对自己的喽啰攻击）', { level: 55, count: 1, actionCount: 2, hpApprox: 10000, skills: ['攻击', '防御', '圣盾', '乾坤一掷', '连击', '气功弹', '全体即死', '混乱攻击（对自己的喽啰攻击）'] }),
      foe([30], '巢穴武装守卫（武装骷髅）', 'Lv.50巢穴武装守卫（武装骷髅）*2，1动，血量约4500；技能：攻击、防御、诸刃、即死魔法（出现几率不高）', { level: 50, count: 2, actionCount: 1, hpApprox: 4500, skills: ['攻击', '防御', '诸刃', '即死魔法（出现几率不高）'] }),
      foe([31], '巢穴卫兵（血骷髅）', 'Lv.50巢穴卫兵（血骷髅）*2，1动，血量约2500；技能：攻击、吸血攻击', { level: 50, count: 2, actionCount: 1, hpApprox: 2500, skills: ['攻击', '吸血攻击'] })
    ] })
  },
  outcomes: { titles: [v([33], { name: '爱情捍卫者', condition: '交出玛莎的信' })], careers: [], skills: [] },
  lineTypes: ['optional-step', 'item-acquisition', 'exchange-step', 'exchange-step', 'route-reference', 'exchange-step', 'exchange-step', 'optional-step', 'maze-entry', 'maze-heading', 'encounter-row', 'encounter-row', 'encounter-row', 'maze-route', 'portal-rule', 'false-route', 'true-route', 'maze-heading', 'encounter-row', 'encounter-row', 'encounter-row', 'battle-step', 'battle-heading', 'battle-enemy', 'battle-enemy', 'battle-enemy', 'battle-step', 'battle-heading', 'battle-enemy', 'battle-enemy', 'battle-enemy', 'exchange-exit', 'completion-title']
});

const pest2018 = [
  { id: 'strange-herb', name: '奇怪的草药', line: 8, cost: 20, properties: { stackLimit: 99, skillExperience: 100 } },
  { id: 'broken-pickaxe', name: '坏掉的矿工锄', line: 9, cost: 20, properties: { useEffect: '造型随机变更为哥布林并开启工作时间' } },
  { id: 'perfect-helmet', name: '十全十美安全帽', line: 10, cost: 40, properties: { injuryBlocks: 10 } },
  { id: 'cave-dragon-design', name: '穴龙设计图A~E之一', line: 11, lines: [11, 12], cost: 80, properties: { selection: 'choose-one', variants: ['A', 'B', 'C', 'D', 'E'], resultPet: { name: '活泼的穴龙', elements: { 地: 70, 风: 30 }, growth: [38, 41, 21, 16, 9], skillSlots: 9, race: '龙系' } } },
  { id: 'earth-minotaur-fragment', name: '大地牛头怪碎片', line: 13, cost: 99, properties: { stackLimit: 30, combineQuantity: 30, combineResult: '大地牛头怪精华' } }
];
const pest2018Steps = pest2018.map((entry, index) => step(`reward-2018-${entry.id}`, 3 + index, `2018年版：交出${entry.cost}个【害虫】，兑换【${entry.name}】。`, entry.lines || [entry.line], [input('害虫', entry.line, { quantity: entry.cost })], [output(entry.name, entry.line)], { version: '2018' }));

curate('catalog-32dcdac8-557e-4f06-80aa-6c0877a2a6d5', '实验室除虫', {
  startLocation: '法兰城工作招募者（93.62）',
  requirements: [v([2], { type: 'gathering-skill', minimumLevel: 5, appliesTo: '在三处对应地块采集土块或害虫', eligibleProfessions: '拥有Lv.5采集技能的职业' })],
  relations: { prerequisites: [], itemSources: [v([2, 3], { item: '土块', source: '研究所三处对应地块', stackLimit: 20, use: '暂无用处', dropBehavior: '丢地消失' }), v([2, 4], { item: '害虫', source: '研究所三处对应地块', stackLimit: 999, tradeable: true })], references: [] },
  steps: [
    step('step-1', 1, '与法兰城工作招募者（93.62）对话选“是”，进入研究所。', [1]),
    step('step-2', 2, '拥有Lv.5采集技能的职业可在三处对应地块采集【土块】或【害虫】；土块暂无用途，害虫用于兑换。', [2, 3, 4], [], [output('土块', 2, { acquisition: 'gathering-result' }), output('害虫', 2, { acquisition: 'gathering-result' })]),
    ...pest2018Steps,
    step('reward-2017-box', 8, '2017年版：向工作奖励兑换员交出40个【害虫】，获得【劳动报酬】。', [14, 15], [input('害虫', 15, { quantity: 40 })], [output('劳动报酬（2017年版）', 15)], { version: '2017' }),
    step('reward-2017-open', 9, '双击2017年版劳动报酬，随机获得该版本奖池中的一种奖品。来源未给出概率。', [16, 17, 18, 19, 20, 21, 22, 23, 24, 25], [input('劳动报酬（2017年版）', 16, { action: 'open' })], [output('2017年版奖品之一', 16, { acquisition: 'random-pool' })], { version: '2017' }),
    step('reward-2016-pool', 10, '2016年版奖池包含猎豹蜥蜴设计图A~E、十全十美安全帽、两种草药、坏掉的矿工锄和大地牛头怪精华；来源本段未重述兑换成本或开启方式，不套用2017年的40害虫规则。', [26, 27, 28, 29, 30, 31, 32, 33, 34], [], [output('2016年版奖品之一', 26, { acquisition: 'historical-random-pool' })], { version: '2016', acquisitionMethodUnspecified: true })
  ],
  rewardEvents: [
    rewardEvent('pest-exchange-2018', 'exchange-recipe', [5, 6, 7, 8, 9, 10, 11, 12, 13], pest2018.map((entry) => resultItem(entry.id, entry.name, entry.lines || [entry.line], { cost: { item: '害虫', quantity: entry.cost }, properties: entry.properties })), { versionLabel: '2018年版', npc: '工作奖励兑换员（75.41）', selection: 'direct-choice' }),
    rewardEvent('pest-pool-2017', 'random-container', [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25], [resultItem('pool-2017', '2017年版奖品之一', [16, 17, 18, 19, 20, 21, 22, 23, 24, 25], { entityType: 'random-pool', cost: { item: '害虫', quantity: 40 }, container: '劳动报酬', variants: [
      { name: '穴龙设计图', sourceLines: [19, 20], properties: { resultPet: { name: '活泼的穴龙', elements: { 地: 70, 风: 30 }, growth: [38, 41, 21, 16, 9], skillSlots: 9, race: '龙系' } } },
      { name: '十全十美安全帽', sourceLines: [21], properties: { level: 1, category: '头盔', durability: 200, injuryBlocks: 10 } },
      { name: '奇怪的草药', sourceLines: [22], properties: { skillExperience: 100 } },
      { name: '很奇怪的草药', sourceLines: [23], properties: { skillExperience: 200 } },
      { name: '坏掉的矿工锄', sourceLines: [24], properties: { useEffect: '造型随机变更为哥布林并开启工作时间' } },
      { name: '大地牛头怪精华', sourceLines: [25], properties: { useEffect: '获得Lv.1大地牛头怪' } }
    ], probability: 'unspecified' })], { versionLabel: '2017年版' }),
    rewardEvent('pest-pool-2016', 'historical-reward-pool', [26, 27, 28, 29, 30, 31, 32, 33, 34], [resultItem('pool-2016', '2016年版奖品之一', [26, 27, 28, 29, 30, 31, 32, 33, 34], { entityType: 'random-pool', acquisitionMethod: 'source-unspecified', variants: [
      { name: '猎豹蜥蜴设计图A~E', sourceLines: [28, 29], properties: { selection: 'random', resultPet: { name: '改造猎豹蜥蜴', elements: { 火: 20, 风: 80 }, growth: [33, 43, 18, 23, 8], skillSlots: 9, race: '龙系' } } },
      { name: '十全十美安全帽', sourceLines: [30], properties: { injuryBlocks: 10 } },
      { name: '奇怪的草药', sourceLines: [31], properties: { skillExperience: 100 } },
      { name: '很奇怪的草药', sourceLines: [32], properties: { skillExperience: 200 } },
      { name: '坏掉的矿工锄', sourceLines: [33], properties: { useEffect: '造型随机变更为哥布林并开启工作时间' } },
      { name: '大地牛头怪精华', sourceLines: [34], properties: { useEffect: '获得Lv.1大地牛头怪' } }
    ] })], { versionLabel: '2016年版', acquisitionMethodUnspecified: true })
  ],
  versionChanges: [v([6, 14, 17, 26], { versions: ['2018', '2017', '2016'], note: '三个版本的兑换方式与奖池分开保存；未跨版本补全来源未写的成本、概率或属性。' })],
  lineTypes: ['entry-step', 'gathering-rule', 'item-detail', 'item-detail', 'exchange-rule', 'version-heading', 'table-heading', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'pet-detail', 'exchange-row', 'history-heading', 'historical-exchange', 'container-open', 'version-heading', 'table-heading', 'reward-row', 'pet-detail', 'reward-row', 'reward-row', 'reward-row', 'reward-row', 'reward-row', 'version-heading', 'table-heading', 'reward-row', 'pet-detail', 'reward-row', 'reward-row', 'reward-row', 'reward-row', 'reward-row']
});

const donationRecipes = [
  { id: 'wood-low', items: ['琵琶木', '赤松', '朴'], quantity: 60, crystals: 1, line: 6 },
  { id: 'wood-high', items: ['朴', '杉', '丝柏'], quantity: 60, crystals: 3, line: 7 },
  { id: 'food-high', items: ['咖喱块', '霜降牛肉', '米'], quantity: 40, crystals: 3, line: 8 },
  { id: 'food-low', items: ['海苔', '姜', '米'], quantity: 40, crystals: 1, line: 9 },
  { id: 'ore-high', items: ['幻之钢', '幻之银', '勒格耐席鉧'], quantity: 60, crystals: 3, line: 10, category: '矿石' },
  { id: 'ore-low', items: ['金', '白金', '幻之钢'], quantity: 60, crystals: 1, line: 11, category: '矿石' },
  { id: 'herb-low', items: ['桃木', '番红花', '百里香'], quantity: 60, crystals: 1, line: 12 },
  { id: 'herb-high', items: ['百里香', '瞿麦', '茴香'], quantity: 60, crystals: 3, line: 13 },
  { id: 'gold', items: ['魔币'], quantity: 10000, crystals: 3, line: 14, currency: 'G' }
];
const donationSteps = donationRecipes.map((recipe, index) => step(`donate-${recipe.id}`, 2 + index, `选择该行任一物资：交出${recipe.quantity}${recipe.currency || '个'}【${recipe.items.join('／')}】中的一种，获得${recipe.crystals}个【元素结晶】。`, [3, 4, 5, recipe.line], [input(`${recipe.items.join('／')}之一`, recipe.line, { quantity: recipe.quantity, alternatives: recipe.items, entityType: recipe.currency ? 'currency' : 'item', currency: recipe.currency })], [output('元素结晶', recipe.line, { quantity: recipe.crystals })], { exchangeRecipe: true }));

const hallRewards = [
  { id: 'pet-design', name: '宠物设计图（随机1张）', line: 19, cost: 25, properties: { selection: 'random-one', variants: ['寒冰翼龙设计图', '僵尸设计图', '绿色口臭鬼设计图', '扫把蝙蝠设计图'] } },
  { id: 'gem-bag', name: '宝石袋', line: 20, cost: 25, properties: { contents: 'Lv.8各色宝石', exactSelection: 'source-unspecified' } },
  { id: 'courage-necklace', name: '勇气项链', line: 21, cost: 30, properties: { level: 6, category: '项链', durability: 200, attack: 20, defense: 15, accuracy: 3, dodge: 3, hp: 100, stallTradeable: true, statsVariable: true } },
  { id: 'courage-ring', name: '勇气之戒', line: 22, cost: 30, properties: { level: 6, category: '戒指', durability: 200, attack: 15, defense: 13, critical: 3, counter: 3, accuracy: 3, dodge: 3, hp: 50, stallTradeable: true, statsVariable: true } },
  { id: 'wisdom-necklace', name: '智慧项链', line: 23, cost: 30, properties: { level: 6, category: '项链', durability: 200, defense: 15, spirit: 3, recovery: 3, hp: 50, mp: 50, magicAttack: 30, stallTradeable: true, statsVariable: true } },
  { id: 'wisdom-ring', name: '智慧之戒', line: 24, cost: 30, properties: { level: 6, category: '戒指', durability: 200, defense: 11, spirit: 3, recovery: 3, hp: 25, mp: 50, magicAttack: 27, stallTradeable: true, statsVariable: true } },
  { id: 'four-element-crystal', name: '四属性元素水晶', line: 25, cost: 35, properties: { hp: 25, mp: 25, durability: 150, tradeable: false, dropBehavior: '丢地消失' } },
  { id: 'courage-crystal-necklace', name: '勇气结晶项链', line: 26, cost: 50, properties: { level: 8, category: '项链', durability: 250, attack: 30, defense: 25, accuracy: 5, dodge: 5, hp: 150, stallTradeable: true, statsVariable: true } },
  { id: 'courage-crystal-ring', name: '勇气结晶戒指', line: 27, cost: 50, properties: { level: 8, category: '戒指', durability: 250, attack: 35, defense: 25, critical: 5, counter: 5, accuracy: 5, dodge: 5, hp: 100, stallTradeable: true, statsVariable: true } },
  { id: 'wisdom-crystal-necklace', name: '智慧结晶项链', line: 28, cost: 50, properties: { level: 8, category: '项链', durability: 250, defense: 25, spirit: 5, recovery: 5, hp: 75, mp: 100, magicAttack: 45, stallTradeable: true, statsVariable: true } },
  { id: 'wisdom-crystal-ring', name: '智慧结晶之戒', line: 29, cost: 50, properties: { level: 8, category: '戒指', durability: 250, defense: 25, spirit: 8, recovery: 8, hp: 50, mp: 75, magicAttack: 50, stallTradeable: true, statsVariable: true } },
  { id: 'martial-soul', name: '武圣之魂', line: 30, cost: 100, properties: { level: 8, category: '护身符', durability: 150, attack: 45, critical: 22, magicResistance: 20, stallTradeable: true, statsVariable: true } },
  { id: 'spirit-essence', name: '精灵之魄', line: 31, cost: 100, properties: { level: 8, category: '护身符', durability: 150, defense: 20, agility: 35, magicAttack: 30, stallTradeable: true, statsVariable: true } },
  ...['超强陨石魔法', '超强冰冻魔法', '超强火焰魔法', '超强风刃魔法'].map((spell, index) => ({ id: `nether-spirit-${index + 1}`, name: `幽冥的精灵之魄（${spell}）`, line: 32 + index, cost: 120, properties: { displayName: '幽冥的精灵之魄', level: 9, category: '护身符', durability: 150, defense: 20, agility: 35, magicAttack: 35, stallTradeable: true, equippedEffect: `${spell}耗魔减少10%` } }))
];
const hallRewardSteps = hallRewards.map((entry, index) => step(`hall-${entry.id}`, 12 + index, `在荣耀大厅交出${entry.cost}个【元素结晶】，兑换【${entry.name}】。`, [17, 18, entry.line], [input('元素结晶', entry.line, { quantity: entry.cost })], [output(entry.name, entry.line)], { exchangeRecipe: true }));

curate('catalog-dbb14d32-dff5-49ca-aed1-47c7c3d1fdc7', '军需捐献', {
  startLocation: '法兰城里谢里雅堡物资仓库传送者（56.82）',
  requirements: [v([2], { type: 'cooldown', startsAfterAcquisition: '捐献说明书', initialWaitHours: 23, repeatIntervalHours: 23, appliesTo: '捐献物资兑换元素结晶' })],
  relations: { prerequisites: [], itemSources: [], references: [] },
  steps: [
    step('step-1', 1, '与里谢里雅堡物资仓库传送者（56.82）对话选“是”，获得【捐献说明书】并传送到物资仓库。取得说明书23小时后方可首次捐献，之后每23小时仅能捐献一次。', [1, 2], [], [output('捐献说明书', 1)]),
    ...donationSteps,
    step('enter-hall', 11, '与里谢里雅堡荣耀之厅传送者（52.82）对话进入荣耀大厅。大厅可随意进入，查看奖品无需元素结晶。', [15, 16]),
    ...hallRewardSteps
  ],
  rewardEvents: [
    rewardEvent('supply-donation-recipes', 'exchange-recipe', [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], donationRecipes.map((recipe) => resultItem(`crystal-${recipe.id}`, `元素结晶×${recipe.crystals}（${recipe.items.join('／')}之一）`, [recipe.line], { role: 'process-currency', inputs: { oneOf: recipe.items, quantity: recipe.quantity, currency: recipe.currency }, outputQuantity: recipe.crystals })), { cooldownHours: 23 }),
    rewardEvent('glory-hall-exchanges', 'exchange-recipe', [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35], hallRewards.map((entry) => resultItem(entry.id, entry.name, [entry.line], { cost: { item: '元素结晶', quantity: entry.cost }, entityType: entry.line >= 21 ? 'equipment' : 'item', properties: entry.properties })), { location: '荣耀大厅', viewingRequiresCurrency: false })
  ],
  lineTypes: ['manual-acquisition-teleport', 'cooldown-rule', 'donation-rule', 'donation-heading', 'table-heading', 'donation-row', 'donation-row', 'donation-row', 'donation-row', 'donation-row', 'donation-row', 'donation-row', 'donation-row', 'donation-row', 'hall-entry', 'free-view-rule', 'exchange-heading', 'table-heading', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row']
});

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第六十二批3条任务的逐行语义核验。');
