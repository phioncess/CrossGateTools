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

curate('catalog-7f0f0623-3f40-49b3-9f74-6edd2c93a568', '树精长老的末日', {
  startLocation: '维诺亚村医院佣兵艾里克（7.5）',
  requirements: [
    v([1, 6], { type: 'per-party-member-item', item: '火把', acquisition: '每名队员分别选择“是”领取', consumedAt: '树精长老战斗入口' }),
    v([2], { type: 'quest-start-blocking-items', anyHeld: ['贤者的戒指', '艾里克的大剑', '生命之花'], resolution: '丢弃后再接任务' }),
    v([30], { type: 'profession-state', condition: '当前职业此前已经交出过生命之花时不能再次交出' })
  ],
  relations: { prerequisites: [], itemSources: [], references: [v([19], { type: 'item-use-reference', item: '磨刀石', targetQuest: '重铸村雨丸', server: '道具服' })] },
  steps: [
    step('step-1', 1, '每名队员在维诺亚村医院与佣兵艾里克（7.5）对话选“是”，各自获得【火把】。持贤者的戒指、艾里克的大剑或生命之花时不能接取，需先丢弃。', [1, 2], [], [output('火把', 1)]),
    step('step-2', 2, '从维诺亚村北行，经芙蕾雅岛（370.400）到（380.353），进入约8层的布满青苔的洞窟。', [3, 4, 5]),
    step('step-3', 3, '穿过迷宫到叹息之森林，由队伍一人与树精长老（29.13）对话，全员各交出【火把】后进入战斗。', [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], [input('火把', 6, { scope: 'each-party-member' })]),
    step('step-4', 4, '战斗胜利后切换到叹息森林，队伍随机一人获得【艾里克的大剑】；道具服另有概率随机获得【磨刀石】。', [18, 19], [], [output('艾里克的大剑', 18, { acquisition: 'random-party-member' }), output('磨刀石', 19, { acquisition: 'chance', servers: ['道具服'] })]),
    step('main-sapling-normal', 5, '主线路线：未持艾里克大剑的队员与年轻树精（26.12）对话获得【树苗？】；得到大剑的队员可先丢弃大剑，再以同一路线取得树苗。', [20, 21, 22, 23], [], [output('树苗？', 20)], { route: '主线' }),
    step('main-sapling-sword', 6, '主线替代路线：持艾里克的大剑与上方年轻树精（32.12）对话，交出大剑并选择“否”，获得【树苗？】。', [24], [input('艾里克的大剑', 24)], [output('树苗？', 24)], { route: '主线', alternate: true }),
    step('branch-sword', 7, '支线入口：持艾里克的大剑与上方年轻树精对话并选择“是”，获得未鉴定的【剑？】；鉴定后仍为【艾里克的大剑】，并放弃主线。', [25, 33, 34], [input('艾里克的大剑', 25)], [output('剑？', 25)], { route: '支线', abandonsRoute: '主线' }),
    step('main-appraise', 8, '主线路线：在凯蒂夫人的店向凯蒂夫人（15.12）交出30G，把不可交易的【树苗？】鉴定为【生命之花】。也可由具备鉴定技能的角色自行鉴定。', [26, 27, 28], [input('树苗？', 26, { action: 'appraise' }), input('30G', 26, { entityType: 'currency', amount: 30, currency: 'G' })], [output('生命之花', 26)], { route: '主线' }),
    step('main-completion', 9, '主线路线：与维诺亚村长卡丹（16.7）对话选“是”，交出【生命之花】，完成任务。生产系可由此取得一转晋阶资格；当前职业已经交过则不能再次交付。转职后1~4转需重做晋阶任务，5转只需一次。', [29, 30, 31, 32], [input('生命之花', 29)], [], { route: '主线' }),
    step('branch-appraise', 10, '支线路线：鉴定【剑？】后得到【艾里克的大剑】。来源未写鉴定费用或地点。', [25], [input('剑？', 25, { action: 'appraise', costUnspecified: true })], [output('艾里克的大剑', 25)], { route: '支线' }),
    step('branch-completion', 11, '支线路线：返回维诺亚村医院，把【艾里克的大剑】交给佣兵艾里克，获得不可交易、丢地消失的【贤者的戒指】。', [33, 34, 35, 36], [input('艾里克的大剑', 35)], [output('贤者的戒指', 35)], { route: '支线' })
  ],
  encounters: [v([4, 5], { id: 'mossy-cave', location: '布满青苔的洞窟', maze: '随机迷宫', floorsApprox: 8, enemies: [{ name: '巨蝙蝠', level: { min: 17, max: 19 }, elements: { 风: 70, 火: 30 } }, { name: '史莱姆', level: { min: 17, max: 19 }, elements: { 地: 90, 风: 10 } }] })],
  battles: {
    'elder-treant': v([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], { id: 'elder-treant', enemies: [
      foe([9, 10, 11], '树精长老', '树精长老，数量1，行动2次，Lv.35，预估血量2500，地70水30，邪魔系，抗咒；技能：攻击、圣盾、超强陨石魔法、超强冰冻魔法、强力补血魔法（血量<25%时追加）、召唤异型蜂*2或者土蜘蛛*2（喽啰<4只时追加）', { count: 1, actionCount: 2, level: 35, hpApprox: 2500, elements: { 地: 70, 水: 30 }, race: '邪魔系', curseResistance: true, skills: ['攻击', '圣盾', '超强陨石魔法', '超强冰冻魔法', '强力补血魔法（HP<25%时追加）', '召唤异型蜂×2或土蜘蛛×2（喽啰少于4只时追加）'] }),
      foe([13, 14], '异型蜂', '异型蜂，数量2~3，行动1次，Lv.24~26，预估血量400，火50风50，昆虫系，不抗咒；技能：攻击、攻击（血少者）、诸刃', { count: { min: 2, max: 3 }, actionCount: 1, level: { min: 24, max: 26 }, hpApprox: 400, elements: { 火: 50, 风: 50 }, race: '昆虫系', curseResistance: false, skills: ['攻击', '攻击（血少者）', '诸刃'] }),
      foe([16, 17], '土蜘蛛', '土蜘蛛，数量2~3，行动1次，Lv.24~26，预估血量500，地100，昆虫系，不抗咒；技能：攻击、攻击（血多者）、防御、毒性攻击、昏睡攻击', { count: { min: 2, max: 3 }, actionCount: 1, level: { min: 24, max: 26 }, hpApprox: 500, elements: { 地: 100 }, race: '昆虫系', curseResistance: false, skills: ['攻击', '攻击（血多者）', '防御', '毒性攻击', '昏睡攻击'] })
    ] })
  },
  rewardEvents: [
    rewardEvent('eric-greatsword', 'battle-drop', [18, 20, 21, 22, 23, 24, 25, 34, 35], [resultItem('eric-greatsword', '艾里克的大剑', [18, 25, 34, 35], { entityType: 'equipment', recipient: 'random-one-party-member', propertiesUnspecified: true, lifecycle: ['主线可丢弃', '主线可交给年轻树精换树苗', '支线交给艾里克换贤者的戒指'] })], { step: 'step-4' }),
    rewardEvent('sage-ring', 'side-quest-completion', [33, 34, 35, 36], [resultItem('sage-ring', '贤者的戒指', [35, 36], { entityType: 'equipment', properties: { level: 3, category: '戒指', durability: { min: 130, max: 150 }, agility: { min: 3, max: 5 }, spirit: { min: 3, max: 5 }, tradeable: false, dropBehavior: '丢地消失' } })], { step: 'branch-completion', mutuallyExclusiveWith: '主线完成' })
  ],
  outcomes: { titles: [], careers: [v([29, 30, 31, 32], { type: 'rank-qualification', professionGroup: '生产系', rank: 1, repeatRules: { ranks1To4: '转职后需重新完成晋阶任务', rank5: '仅需完成一次' } })], skills: [] },
  lineTypes: ['per-member-acquisition', 'start-item-block', 'maze-entry', 'maze-detail', 'maze-encounter', 'party-exchange-battle', 'battle-heading', 'battle-table-heading', 'battle-enemy', 'battle-skill', 'battle-skill', 'battle-table-heading', 'battle-enemy', 'battle-skill', 'battle-table-heading', 'battle-enemy', 'battle-skill', 'random-party-acquisition', 'server-drop', 'main-item-acquisition', 'sword-holder-route', 'route-heading', 'main-drop-route', 'main-exchange-route', 'side-route-choice', 'appraisal-exchange', 'item-warning', 'item-trade-rule', 'main-completion', 'profession-repeat-block', 'rank-repeat-rule', 'rank-outcome', 'side-route-heading', 'side-route-acquisition', 'side-completion', 'equipment-detail']
});

curate('catalog-fbb571a2-e5f2-4aaa-847c-0d304584fd48', '消亡之地', {
  startLocation: '法兰城露塔（95.83）',
  requirements: [
    v([4], { type: 'time-window', value: '白天', purpose: '调查破败石碑' }),
    v([4, 6], { type: 'per-party-member-item', item: '神眼', tradeable: false, source: '击倒角笛大风洞内水蜘蛛', consumedAt: '破败石碑' }),
    v([9, 10], { type: 'synchronized-party-choice', choices: ['否（白之契路线）', '是（黑之契路线）'], warning: '选择不同会使队伍分流，后续无法同行' }),
    v([24], { type: 'repeat-lock', item: '白之契', effect: '持有时任务不可重解' }),
    v([36], { type: 'repeat-lock', item: '黑之契', effect: '持有时任务不可重解' })
  ],
  relations: {
    prerequisites: [],
    itemSources: [v([6], { item: '神眼', sourceEnemy: '水蜘蛛', location: '角笛大风洞', tradeable: false })],
    references: [v([3], { type: 'route-reference', targetQuest: '索奇亚古文明调查', purpose: '哈贝鲁村抵达方法' }), v([11], { type: 'story-reference', title: '黑与白的漩涡系列任务剧情对话', series: '黑与白的漩涡系列' })]
  },
  steps: [
    step('step-1', 1, '在法兰城与露塔（95.83）对话，获得【破旧的纸条】。', [1], [], [output('破旧的纸条', 1)]),
    step('step-2', 2, '前往哈贝鲁村与桑德（44.47）对话，交出【破旧的纸条】，获得【桑德的指引】。抵达方式参考《索奇亚古文明调查》。', [2, 3], [input('破旧的纸条', 2)], [output('桑德的指引', 2)]),
    step('step-3', 3, '白天在索奇亚岛（400.254）调查角笛大风洞外、靠加纳村一侧的破败石碑。每名队员交出不可交易的【神眼】与【桑德的指引】，传送到过去的柯马特依村。', [4, 5, 6], [input('神眼', 4, { scope: 'each-party-member' }), input('桑德的指引', 4, { scope: 'each-party-member' })]),
    step('step-4', 4, '与里克（49.56）对话，传送到残破的牢房。', [7]),
    step('route-choice', 5, '与克劳姆（36.20）对话作路线选择。任一成员选“否”会让整队进入白路线战斗；选“是”的成员会单独传送到诺斯菲拉特。全队应事先统一选择，避免分流。野队砍龙练级时来源推荐白路线。', [8, 9, 10, 11, 12]),
    step('white-battle', 6, '白之契路线：选择“否”，与克劳姆及细胞分裂战斗。', [13, 14, 15, 16, 17, 18, 19, 20, 21], [], [], { route: '白之契' }),
    step('white-reward', 7, '白路线胜利后到时空裂缝，与白龙使者（9.7）对话，获得后续所需【白之契】，并传送到索奇亚岛。', [22, 24], [], [output('白之契', 22)], { route: '白之契' }),
    step('white-completion', 8, '返回法兰城与露塔对话，白路线任务完结。持白之契时不可重解。', [23, 24], [input('白之契', 23, { action: 'hold', consumed: false })], [], { route: '白之契' }),
    step('black-entry', 9, '黑之契路线：选择“是”，单独传送到诺斯菲拉特。', [25, 26], [], [], { route: '黑之契' }),
    step('black-battle', 10, '与教团神官（785.68）对话，迎战教团神官及教团守卫。', [27, 28, 29, 30, 31, 32, 33], [], [], { route: '黑之契' }),
    step('black-reward', 11, '黑路线胜利后到时空裂缝，与黑龙使者（9.7）对话，获得后续所需【黑之契】，并传送到索奇亚岛。', [34, 36], [], [output('黑之契', 34)], { route: '黑之契' }),
    step('black-completion', 12, '返回法兰城与露塔对话，黑路线任务完结。持黑之契时不可重解。', [35, 36], [input('黑之契', 35, { action: 'hold', consumed: false })], [], { route: '黑之契' })
  ],
  battles: {
    'white-contract': v([14, 15, 16, 17, 18, 19, 20, 21], { id: 'white-contract', route: '白之契', strategy: v([18], { text: '先清召唤喽啰，战栗BOSS至无法使用明镜后再合击。' }), enemies: [
      foe([16], '克劳姆', 'Lv.85克劳姆，血量约15000，不死系，属性：地70水30，抗咒；技能：诸刃、乾坤一掷、连击、圣盾、明镜止水、召唤细胞分裂（仅战斗开始时召唤）', { servers: ['怀旧服'], level: 85, hpApprox: 15000, race: '不死系', elements: { 地: 70, 水: 30 }, curseResistance: true, skills: ['诸刃', '乾坤一掷', '连击', '圣盾', '明镜止水', '召唤细胞分裂（仅开战时）'] }),
      foe([17], '细胞分裂', 'Lv.80细胞分裂*2，血量约8000，不死系，属性：地70水30，不抗咒；技能：乾坤一掷、连击、诸刃、自爆（全体伤害；击倒克劳姆后追加）', { servers: ['怀旧服'], level: 80, count: 2, hpApprox: 8000, race: '不死系', elements: { 地: 70, 水: 30 }, curseResistance: false, skills: ['乾坤一掷', '连击', '诸刃', '自爆（克劳姆被击倒后追加，全体伤害）'] }),
      foe([20], '克劳姆', 'Lv.85克劳姆，血量约30000，不死系，属性：地70水30，抗咒；技能：诸刃、乾坤一掷、连击、圣盾、明镜止水、召唤细胞分裂（仅战斗开始时召唤）', { servers: ['道具服'], level: 85, hpApprox: 30000, race: '不死系', elements: { 地: 70, 水: 30 }, curseResistance: true, skills: ['诸刃', '乾坤一掷', '连击', '圣盾', '明镜止水', '召唤细胞分裂（仅开战时）'] }),
      foe([21], '细胞分裂', 'Lv.150细胞分裂*2，血量约15000，不死系，属性：地70水30，不抗咒；技能：乾坤一掷、连击、诸刃、自爆（全体伤害；击倒克劳姆后追加）', { servers: ['道具服'], level: 150, count: 2, hpApprox: 15000, race: '不死系', elements: { 地: 70, 水: 30 }, curseResistance: false, skills: ['乾坤一掷', '连击', '诸刃', '自爆（克劳姆被击倒后追加，全体伤害）'] })
    ] }),
    'black-contract': v([27, 28, 29, 30, 31, 32, 33], { id: 'black-contract', route: '黑之契', enemies: [
      foe([29], '教团神官', 'Lv.85教团神官，血量约18000，邪魔系，属性：地30水70，抗咒；技能：攻击、防御、圣盾、四属性超强攻击魔法、超强中毒魔法、超强补血魔法、召唤教团守卫（仅战斗开始时召唤）', { servers: ['怀旧服'], level: 85, hpApprox: 18000, race: '邪魔系', elements: { 地: 30, 水: 70 }, curseResistance: true, skills: ['攻击', '防御', '圣盾', '四属性超强攻击魔法', '超强中毒魔法', '超强补血魔法', '召唤教团守卫（仅开战时）'] }),
      foe([30], '教团守卫', 'Lv.80教团守卫*2，血量约8000，邪魔系，属性：地30水70，不抗咒；技能：攻击、防御、四属性强力攻击魔法、强力昏睡魔法', { servers: ['怀旧服'], level: 80, count: 2, hpApprox: 8000, race: '邪魔系', elements: { 地: 30, 水: 70 }, curseResistance: false, skills: ['攻击', '防御', '四属性强力攻击魔法', '强力昏睡魔法'] }),
      foe([32], '教团神官', 'Lv.155教团神官，血量约30000，邪魔系，属性：地30水70，抗咒；技能：攻击、防御、圣盾、四属性超强攻击魔法、超强中毒魔法、超强补血魔法、召唤教团守卫（仅战斗开始时召唤）', { servers: ['道具服'], level: 155, hpApprox: 30000, race: '邪魔系', elements: { 地: 30, 水: 70 }, curseResistance: true, skills: ['攻击', '防御', '圣盾', '四属性超强攻击魔法', '超强中毒魔法', '超强补血魔法', '召唤教团守卫（仅开战时）'] }),
      foe([33], '教团守卫', 'Lv.150教团守卫*2，血量约15000，邪魔系，属性：地30水70，不抗咒；技能：攻击、防御、四属性强力攻击魔法、强力昏睡魔法', { servers: ['道具服'], level: 150, count: 2, hpApprox: 15000, race: '邪魔系', elements: { 地: 30, 水: 70 }, curseResistance: false, skills: ['攻击', '防御', '四属性强力攻击魔法', '强力昏睡魔法'] })
    ] })
  },
  rewardEvents: [
    rewardEvent('white-contract-item', 'route-completion', [22, 23, 24], [resultItem('white-contract', '白之契', [22, 24], { entityType: 'key-item', futureUse: '后续任务', repeatLock: true, warning: '勿丢弃' })], { route: '白之契', step: 'white-reward' }),
    rewardEvent('black-contract-item', 'route-completion', [34, 35, 36], [resultItem('black-contract', '黑之契', [34, 36], { entityType: 'key-item', futureUse: '后续任务', repeatLock: true, warning: '勿丢弃' })], { route: '黑之契', step: 'black-reward' })
  ],
  versionChanges: [v([15, 16, 17, 19, 20, 21, 28, 29, 30, 31, 32, 33], { servers: ['怀旧服', '道具服'], note: '两条路线的敌人等级与血量按服务器分别保存。' })],
  lineTypes: ['item-acquisition', 'exchange-step', 'route-reference', 'day-party-exchange', 'location-note', 'item-source', 'teleport-step', 'route-choice', 'party-choice-warning', 'choice-resolution', 'story-reference', 'route-recommendation', 'route-heading', 'route-battle-choice', 'server-battle-heading', 'battle-enemy', 'battle-enemy', 'strategy-note', 'server-battle-heading', 'battle-enemy', 'battle-enemy', 'route-reward', 'route-completion', 'future-item-warning', 'route-heading', 'route-teleport', 'battle-step', 'server-battle-heading', 'battle-enemy', 'battle-enemy', 'server-battle-heading', 'battle-enemy', 'battle-enemy', 'route-reward', 'route-completion', 'future-item-warning']
});

const trialExchangeItems = [
  resultItem('zombie-design-pack', '丧尸设计图包', [16, 17], { cost: { item: '积分卡', quantity: 20 }, entityType: 'random-design', selection: 'random-one', resultPet: { name: '变异丧尸', race: '不死系', skillSlots: 9, elements: { 水: 70, 火: 30 }, growth: [40, 38, 17, 15, 15] } }),
  resultItem('gem-box-10', '宝石箱', [18], { cost: { item: '积分卡', quantity: 100 }, entityType: 'random-container', contents: '随机颜色Lv.10宝石', specialChance: 'Lv.10海洋之心宝石', probability: 'unspecified' }),
  resultItem('all-seeing-eye-red', '全视之眼（红）', [19, 20, 21], { cost: { item: '积分卡', quantity: 45 }, entityType: 'equipment', properties: { suitableFor: '物理系', level: 10, category: '护身符', durability: 100, attack: 25, agility: 10, recovery: 15, critical: 12, counter: 12, accuracy: 17, hp: 200, mp: 150, magicResistance: 35, tradeable: false } }),
  resultItem('all-seeing-eye-blue', '全视之眼（蓝）', [22, 23, 24], { cost: { item: '积分卡', quantity: 45 }, entityType: 'equipment', properties: { suitableFor: '魔法系', level: 10, category: '护身符', durability: 100, agility: 10, spirit: 16, recovery: 15, critical: 12, dodge: 17, hp: 200, mp: 150, magicAttack: 17, magicResistance: 20, tradeable: false } }),
  resultItem('ancient-whistle', '古代的哨子', [25, 26], { cost: { item: '积分卡', quantity: 50 }, entityType: 'usable-item', useEffect: '获得1只Lv.1火焰翼龙', petSlotWarning: '宠物栏满时双击，道具消失且不会获得宠物' })
];

curate('catalog-fb37687d-fe7c-431a-8d6c-2264608334f0', '异次元试验场', {
  startLocation: '法兰城奈亚拉（133.155）',
  requirements: [v([26], { type: 'pet-slot', minimumFreeSlots: 1, appliesToItemUse: '古代的哨子', failure: '道具消失且不获得宠物' })],
  relations: { prerequisites: [], itemSources: [], references: [] },
  steps: [
    step('entry', 1, '第三、第四次版本：与法兰城奈亚拉（133.155）对话进入异次元试验场，经黄色传送石（22.16）开始挑战；休息室（26.8）可治疗和补给。', [1, 2, 3], [], [], { versions: ['第三次', '第四次'] }),
    step('stage-1', 2, '穿过第一段9层随机迷宫并击败第一层BOSS，获得通往第二层的【钥匙】和1张【积分卡】；双击交出钥匙进入下一阶段。', [4, 5, 6], [], [output('钥匙（通往第二层）', 6), output('积分卡', 6, { quantity: 1 })]),
    step('stage-2', 3, '双击交出通往第二层的钥匙，穿过第二段9层随机迷宫并击败BOSS，获得通往第三层的钥匙和2张积分卡。', [4, 7], [input('钥匙（通往第二层）', 7, { action: 'double-click-submit' })], [output('钥匙（通往第三层）', 7), output('积分卡', 7, { quantity: 2 })]),
    step('stage-3', 4, '双击交出通往第三层的钥匙，穿过第三段9层随机迷宫并击败BOSS，获得通往第四层的钥匙和3张积分卡。', [4, 8], [input('钥匙（通往第三层）', 8, { action: 'double-click-submit' })], [output('钥匙（通往第四层）', 8), output('积分卡', 8, { quantity: 3 })]),
    step('stage-4', 5, '双击交出通往第四层的钥匙，穿过第四段9层随机迷宫并击败BOSS，获得通往第五层的钥匙和6张积分卡。', [4, 9], [input('钥匙（通往第四层）', 9, { action: 'double-click-submit' })], [output('钥匙（通往第五层）', 9), output('积分卡', 9, { quantity: 6 })]),
    step('stage-5-first', 6, '首次击败第五层BOSS：交出通往第五层的钥匙后，随机获得红或蓝【全视之眼】之一、8张【积分卡】、随机1张【丧尸设计图】，并取得称号“深远的黑暗”。', [4, 10], [input('钥匙（通往第五层）', 10, { action: 'double-click-submit' })], [output('全视之眼（红或蓝）', 10, { acquisition: 'random-one-of-two', variants: ['全视之眼（红）', '全视之眼（蓝）'] }), output('积分卡', 10, { quantity: 8 }), output('丧尸设计图（随机1张）', 10, { acquisition: 'random-one' })], { clearType: 'first' }),
    step('stage-5-repeat', 7, '第二次及以后击败第五层BOSS，只获得8张积分卡和随机1张丧尸设计图；来源未列全视之眼或称号。', [11], [input('钥匙（通往第五层）', 11, { action: 'double-click-submit' })], [output('积分卡', 11, { quantity: 8 }), output('丧尸设计图（随机1张）', 11, { acquisition: 'random-one' })], { clearType: 'repeat' }),
    step('exchange-zombie', 8, '向荷特普（20.13）交出20张积分卡，兑换【丧尸设计图包】，随机取得一张用于改造为变异丧尸的设计图。', [12, 13, 14, 15, 16, 17], [input('积分卡', 16, { quantity: 20 })], [output('丧尸设计图包', 16)]),
    step('exchange-gem', 9, '交出100张积分卡兑换【宝石箱】，开启后获得随机颜色Lv.10宝石，并有未注明概率的机会得到Lv.10海洋之心宝石。', [18], [input('积分卡', 18, { quantity: 100 })], [output('宝石箱', 18)]),
    step('exchange-red-eye', 10, '交出45张积分卡兑换不可交易的物理系护身符【全视之眼（红）】。', [19, 20, 21], [input('积分卡', 20, { quantity: 45 })], [output('全视之眼（红）', 20)]),
    step('exchange-blue-eye', 11, '交出45张积分卡兑换不可交易的魔法系护身符【全视之眼（蓝）】。', [22, 23, 24], [input('积分卡', 23, { quantity: 45 })], [output('全视之眼（蓝）', 23)]),
    step('exchange-whistle', 12, '交出50张积分卡兑换【古代的哨子】。双击可获得Lv.1火焰翼龙；宠物栏满时道具仍会消失且不会获得宠物。', [25, 26], [input('积分卡', 25, { quantity: 50 })], [output('古代的哨子', 25)]),
    step('old-second', 13, '旧版第二次：流程与第三次一致，但丧尸设计图部分改为异型蜂设计图；Lv.9宝石箱开启后获得任意颜色Lv.9宝石，并有机会得到Lv.9海洋之心，其余奖品不变。来源未列具体替换比例或概率。', [27, 28, 29, 30, 31], [], [], { version: '第二次' }),
    step('old-first', 14, '旧版第一次：流程大致与第三次一致但共7层；最终获得【身体的一部分？】、【诺斯菲拉特通行证】和称号“绝影”。', [32, 33, 34], [], [output('身体的一部分？', 34), output('诺斯菲拉特通行证', 34)], { version: '第一次' }),
    step('old-first-appraise', 15, '鉴定【身体的一部分？】后，随机成为豪克爱犬的牙、毛、眼或爪之一。', [35], [input('身体的一部分？', 35, { action: 'appraise' })], [output('豪克爱犬身体部件之一', 35, { acquisition: 'random-one-of-four', variants: ['豪克爱犬的牙', '豪克爱犬的毛', '豪克爱犬的眼', '豪克爱犬的爪'] })]),
    step('old-first-pet-exchange', 16, '集齐豪克爱犬的牙、毛、眼、爪并持有1级地狱妖犬，与裘瑟贝（195.67）交换1只Lv.1改造地狱妖犬。', [36], [input('豪克爱犬的牙', 36), input('豪克爱犬的毛', 36), input('豪克爱犬的眼', 36), input('豪克爱犬的爪', 36), input('1级地狱妖犬', 36)], [output('Lv.1改造地狱妖犬', 36, { entityType: 'pet' })], { version: '第一次' })
  ],
  encounters: [v([4, 6, 7, 8, 9, 10], { id: 'third-fourth-trial', versions: ['第三次', '第四次'], stages: 5, randomMazeFloorsPerStage: 9, bossDetails: '原文仅说明每阶段有BOSS战，未提供敌人名称、等级、数量、血量或技能。' })],
  rewardEvents: [
    rewardEvent('first-final-clear', 'first-clear', [10], [resultItem('first-eye', '全视之眼（红或蓝）', [10], { entityType: 'equipment-random', variants: ['全视之眼（红）', '全视之眼（蓝）'], selection: 'random-one' }), resultItem('first-zombie-design', '丧尸设计图（随机1张）', [10], { entityType: 'random-design' })], { step: 'stage-5-first', additionalCurrency: { item: '积分卡', quantity: 8 } }),
    rewardEvent('repeat-final-clear', 'repeat-clear', [11], [resultItem('repeat-zombie-design', '丧尸设计图（随机1张）', [11], { entityType: 'random-design' })], { step: 'stage-5-repeat', additionalCurrency: { item: '积分卡', quantity: 8 } }),
    rewardEvent('trial-card-exchanges', 'exchange-recipe', [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26], trialExchangeItems, { npc: '荷特普（20.13）' }),
    rewardEvent('old-first-rewards', 'historical-version', [32, 33, 34, 35, 36], [resultItem('old-body-part', '豪克爱犬身体部件之一', [34, 35], { entityType: 'item-variant', unidentifiedName: '身体的一部分？', variants: ['豪克爱犬的牙', '豪克爱犬的毛', '豪克爱犬的眼', '豪克爱犬的爪'] }), resultItem('old-pass', '诺斯菲拉特通行证', [34], { entityType: 'key-item' }), resultItem('old-hellhound', 'Lv.1改造地狱妖犬', [36], { entityType: 'pet', exchangeInputs: ['豪克爱犬的牙', '豪克爱犬的毛', '豪克爱犬的眼', '豪克爱犬的爪', '1级地狱妖犬'] })], { versionLabel: '第一次' })
  ],
  outcomes: { titles: [v([10], { name: '深远的黑暗', version: '第三次/第四次', condition: '首次击败第五层BOSS' }), v([34], { name: '绝影', version: '第一次', condition: '完成7层旧版最终挑战' })], careers: [], skills: [] },
  versionChanges: [
    v([1, 2, 4, 10, 11], { versions: ['第三次', '第四次'], stages: 5, floorsPerStage: 9 }),
    v([27, 28, 29, 30, 31], { version: '第二次', flowComparedTo: '第三次', changes: ['部分丧尸设计图改为异型蜂设计图', 'Lv.9宝石箱开启为任意颜色Lv.9宝石，概率含Lv.9海洋之心'], unchangedRewards: '其余奖品保持不变' }),
    v([32, 33, 34, 35, 36], { version: '第一次', stages: 7, finalRewards: ['身体的一部分？', '诺斯菲拉特通行证', '称号“绝影”'] })
  ],
  lineTypes: ['version-heading', 'entry-step', 'service-note', 'stage-rule', 'score-heading', 'stage-reward', 'stage-reward', 'stage-reward', 'stage-reward', 'first-clear-reward', 'repeat-clear-reward', 'exchange-npc', 'exchange-heading', 'table-heading', 'table-heading', 'exchange-row', 'pet-detail', 'exchange-row', 'exchange-row', 'equipment-detail', 'equipment-detail', 'exchange-row', 'equipment-detail', 'equipment-detail', 'exchange-row', 'pet-slot-warning', 'old-version-heading', 'version-heading', 'version-comparison', 'reward-change', 'reward-change', 'version-heading', 'version-comparison', 'old-final-reward', 'appraisal-variants', 'pet-exchange']
});

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第六十三批3条任务的逐行语义核验。');
