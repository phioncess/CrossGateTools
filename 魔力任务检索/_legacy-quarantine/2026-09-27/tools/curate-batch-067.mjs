import fs from 'node:fs';

const dataPath = new URL('../data-src/quests.json', import.meta.url);
const database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const v = (sourceLines, value = {}) => ({ ...value, sourceLines, verification: { status: 'verified', method: 'manual-semantic-review' } });
const input = (item, line, value = {}) => v([line], { item, quantity: 1, action: 'hand-over', ...value });
const output = (item, line, value = {}) => v([line], { item, quantity: 1, acquisition: 'guaranteed', ...value });
const step = (id, order, text, sourceLines, inputs = [], outputs = [], value = {}) => v(sourceLines, { id, order, text, inputs, outputs, notes: [], ...value });
const resultItem = (id, name, sourceLines, value = {}) => v(sourceLines, { id, name, role: 'valuable-result', ...value });
const rewardEvent = (id, kind, sourceLines, items, value = {}) => v(sourceLines, { id, version: 'common', tier: 'common', kind, items, ...value });

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
  quest.itemEvents = { inputs: content.steps.flatMap((entry) => entry.inputs.map((event) => ({ ...event, step: entry.id, version: 'common', tier: 'common' }))), acquisitions: content.steps.flatMap((entry) => entry.outputs.map((event) => ({ ...event, step: entry.id, version: 'common', tier: 'common' }))) };
  delete quest.legacy;
}

const defenseBattles = [
  { id: 'yier', region: '芙蕾雅岛', location: '伊尔村外（691.339）', level: 20, line: 6, detailLine: 7, waves: ['树精', '黄蜂', '史莱姆', '盗贼'], drop: '盗贼之斧', max: 2 },
  { id: 'shaluluka', region: '芙蕾雅岛', location: '圣拉鲁卡村外（146.225）', level: 20, line: 8, detailLine: 9, extraLines: [10], waves: ['迷你蝙蝠', '哥布林', '液态史莱姆', '大地鼠'], drop: '大地鼠之石', max: 2 },
  { id: 'yalute', region: '芙蕾雅岛', location: '亚留特村外（595.67）', level: 20, line: 11, detailLine: 12, waves: ['僵尸', '腐尸', '鸟人', '冰冷树精'], drop: '寒冰', max: 3 },
  { id: 'weinuoya', region: '芙蕾雅岛', location: '维诺亚村外（326.517）', level: 20, line: 13, detailLine: 14, waves: ['黄色口臭鬼', '虎头蜂', '异型蜂', '妖草'], drop: '妖草之链', max: 2 },
  { id: 'qili', region: '索奇亚岛', location: '奇利村外（246.331）', level: 40, line: 16, detailLine: 17, waves: ['火焰鼠', '小恶魔', '印第安仙人掌', '盗贼', '山贼', '螳螂'], drop: '螳螂之心', max: 2 },
  { id: 'jiana', region: '索奇亚岛', location: '加纳村外（719.88）', level: 40, line: 18, detailLine: 19, waves: ['兔耳仙人掌', '武术仙人掌', '狠毒鸟人', '铁剪螃蟹', '黄蝎', '蓝蝎'], drop: '沙砾', max: 2 },
  { id: 'jienuowa', region: '莎莲娜岛', location: '杰诺瓦村外（215.447）', level: 70, line: 21, detailLine: 22, waves: ['惨败树精', '死亡蜂', '幻歌妖', '风龙蜥', '地狱妖犬'], drop: '妖犬之眼', max: 3 },
  { id: 'dina', region: '莎莲娜岛', location: '蒂娜村外（603.320）', level: 70, line: 23, detailLine: 24, waves: ['血骷髅', '死灵', '死灰螳螂', '死亡树精', '海贼'], drop: '海贼之帽', max: 3 },
  { id: 'abanisi', region: '莎莲娜岛', location: '阿巴尼斯村外（225.138）', level: 70, line: 25, detailLine: 26, waves: ['北极熊', '烈风鸟人', '丧尸', '地狱妖犬', '人魔草'], drop: '人魔草之心', max: 2 }
];
const defenseBattleSteps = defenseBattles.map((entry, index) => step(`battle-${entry.id}`, 2 + index, `在${entry.location}与围攻村子的魔物对话，连续挑战${entry.waves.length}场（每场10只Lv.${entry.level}魔物），依次为${entry.waves.join('→')}；胜利后随机获得0~${entry.max}个【${entry.drop}】。同岛战斗顺序可打乱。`, [entry.line, entry.detailLine, ...(entry.extraLines || [])], [], [output(entry.drop, entry.line, { acquisition: 'random-quantity', quantity: { min: 0, max: entry.max }, properties: { canDropOnGround: true } })], { region: entry.region, chainedBattles: entry.waves.length, enemiesPerBattle: 10 }));
const defenseTiers = [
  { id: 'tier-4', phrase: '四级支援者', line: 30, inputs: ['盗贼之斧', '大地鼠之石', '寒冰', '妖草之链'], pool: ['曼陀罗草的皮', '火焰之魂（材料）', '风龙蜥的甲壳', '妖草的血'] },
  { id: 'tier-3', phrase: '三级支援者', line: 31, inputs: ['螳螂之心', '沙砾'], pool: ['曼陀罗草的皮', '火焰之魂（材料）', '风龙蜥的甲壳', '妖草的血', '奇怪的壶（B级）'] },
  { id: 'tier-2', phrase: '二级支援者', line: 32, inputs: ['妖犬之眼', '海贼之帽', '人魔草之心'], pool: ['曼陀罗草的皮', '火焰之魂（材料）', '风龙蜥的甲壳', '妖草的血', '奇怪的壶（A级）'] },
  { id: 'tier-1', phrase: '一级支援者', line: 33, inputs: defenseBattles.map((entry) => entry.drop), pool: ['曼陀罗草的皮×2', '火焰之魂（材料）×2', '风龙蜥的甲壳×2', '妖草的血×2', '国王奖章', '奇怪的壶（S级）'] }
];
const defenseTierSteps = defenseTiers.map((tier, index) => step(`exchange-${tier.id}`, 11 + index, `在勇者募集处输入“${tier.phrase}”，交出${tier.inputs.map((name) => `【${name}】`).join('、')}各1个，从该档奖池随机获得一种奖品。`, [27, 28, 29, tier.line], tier.inputs.map((name) => input(name, tier.line)), [output(`${tier.phrase}随机奖品之一`, tier.line, { acquisition: 'random-pool', variants: tier.pool }), ...tier.pool.map((name) => output(name, tier.line, { acquisition: 'random-one-of-pool', pool: tier.phrase }))], { tier: tier.phrase, groupedRandomPool: true }));

curate('catalog-8ab92da5-7d42-443d-8bc6-0f288ff19289', '法尔尼亚保卫战', {
  startLocation: '各村外围攻村子的魔物', requirements: [], relations: { prerequisites: [], itemSources: [], references: [] },
  steps: [step('optional-board', 1, '可选：调查里谢里雅堡（29.80）勇者募集处、悬赏公告栏了解任务。所有战斗均为连战且每场10只；岛屿决定魔物等级，战斗掉落物均可丢地。', [1, 2, 3, 4], [], [], { optional: true }), ...defenseBattleSteps, ...defenseTierSteps],
  battles: Object.fromEntries(defenseBattles.map((entry) => [entry.id, v([entry.line, entry.detailLine, ...(entry.extraLines || [])], { id: entry.id, region: entry.region, location: entry.location, orderFlexibleWithinRegion: true, enemyLevel: entry.level, enemiesPerWave: 10, waves: entry.waves.map((name, index) => ({ order: index + 1, enemy: name })), drop: { item: entry.drop, quantity: { min: 0, max: entry.max }, acquisition: 'random' } })])),
  rewardEvents: [
    ...defenseTiers.map((tier) => rewardEvent(tier.id, 'random-exchange-pool', [27, 28, 29, tier.line], [resultItem(`${tier.id}-pool`, `${tier.phrase}随机奖品之一`, [tier.line], { entityType: 'random-pool', password: tier.phrase, cost: tier.inputs.map((item) => ({ item, quantity: 1 })), variants: tier.pool })], { step: `exchange-${tier.id}` })),
    rewardEvent('strange-pot-results', 'container-results', [34, 35, 36, 37, 38, 39], [resultItem('pot-b', '奇怪的壶（B级）', [34, 36], { entityType: 'random-pet-container', variants: ['Lv.1幽灵', 'Lv.1虎头蜂'] }), resultItem('pot-a', '奇怪的壶（A级）', [34, 37], { entityType: 'random-pet-container', variants: ['Lv.1赤熊', 'Lv.1火龙蜥'] }), resultItem('pot-s', '奇怪的壶（S级）', [34, 38, 39], { entityType: 'server-random-pool', serverVariants: { 金牛服: ['Lv.1烈风哥布林', 'Lv.1泰坦巨人', 'Lv.1盗贼'], '牧羊/双子服': ['烈风哥布林设计图A~E之一', 'Lv.1泰坦巨人', 'Lv.1盗贼'] } })]),
    rewardEvent('king-medal', 'exchange-pool-item', [33, 40], [resultItem('king-medal', '国王奖章', [33, 40], { entityType: 'equipment', properties: { level: 4, category: '护身符', durability: 200, defense: 10, spirit: 3, critical: 3, statsVariable: true, equippedTitle: '法兰一级支援者' } })])
  ],
  outcomes: { titles: [v([40], { name: '法兰一级支援者', condition: '装备国王奖章' })], careers: [], skills: [] },
  lineTypes: ['optional-board', 'battle-global-rule', 'region-level-rule', 'drop-rule', 'region-heading', 'battle-drop', 'battle-sequence', 'battle-drop', 'battle-sequence', 'duplicate-drop-note', 'battle-drop', 'battle-sequence', 'battle-drop', 'battle-sequence', 'region-heading', 'battle-drop', 'battle-sequence', 'battle-drop', 'battle-sequence', 'region-heading', 'battle-drop', 'battle-sequence', 'battle-drop', 'battle-sequence', 'battle-drop', 'battle-sequence', 'exchange-rule', 'reward-heading', 'table-heading', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'container-rule', 'table-heading', 'container-row', 'container-row', 'container-row', 'server-container-row', 'equipment-detail']
});

curate('catalog-c2a80e27-0c91-4196-bcc0-46ed72f12007', '菲鲁瑟团长拯救计划', {
  startLocation: '柯马特依村后勤员丝丽（50.88）',
  requirements: [
    v([2, 3, 24, 28, 29], { type: 'title', title: '解放者', sourceQuest: '失翼之龙', action: '需在柯马特依村交任务' }),
    v([4, 29], { type: 'held-item', item: '贝尼恰斯教团许可', purpose: '柯马特依村通行证', sourceQuest: '踏足诺斯菲拉特' }),
    v([5, 10, 24, 30], { type: 'title', title: '来自【坎】的肯定', sourceQuest: '玄武之境' }),
    v([7, 11, 14], { type: 'material-set', items: [{ item: '阿巴尼斯哈密瓜', quantity: 3 }, { item: '魔法红萝卜', quantity: 20 }, { item: '永久冰石', quantity: 5 }], updatedOn: '2024-01-17', previousPermanentIceQuantity: 20 }),
    v([12, 16, 18], { type: 'wait', durationMinutes: 20, repeatableWithAnotherMaterialSet: true })
  ],
  relations: { prerequisites: [v([3], { quest: '失翼之龙', relation: 'title-prerequisite', title: '解放者' }), v([4], { quest: '踏足诺斯菲拉特', relation: 'item-prerequisite', item: '贝尼恰斯教团许可' }), v([5], { quest: '玄武之境', relation: 'title-prerequisite', title: '来自【坎】的肯定' })], itemSources: [v([8, 13], { item: '丝丽的材料包', sourceQuest: '许愿钱箱', version: '2024', contents: [{ item: '阿巴尼斯哈密瓜', quantity: 3 }, { item: '魔法红萝卜', quantity: 20 }, { item: '永久冰石', quantity: 5 }] })], references: [] },
  steps: [
    step('optional-briefing', 1, '可选：在法兰城（166.153）与联络员依迪耶特对话，了解材料需求。旧说明曾写永久冰石20个，2024年1月17日后为5个。', [6, 7, 14, 32, 33], [], [], { optional: true }),
    step('open-material-pack', 2, '可选：若持2024版《许愿钱箱》奖品【丝丽的材料包】，双击后一次取得3个阿巴尼斯哈密瓜、20个魔法红萝卜、5个永久冰石，再按正常流程交付。', [8, 13], [input('丝丽的材料包', 8, { action: 'open' })], [output('阿巴尼斯哈密瓜', 8, { quantity: 3 }), output('魔法红萝卜', 8, { quantity: 20 }), output('永久冰石', 8, { quantity: 5 })], { optional: true }),
    step('deliver-materials', 3, '坐船到柯马特依村，在满足“解放者”、贝尼恰斯教团许可及“来自【坎】的肯定”条件后，向后勤员丝丽（50.88）交出3个哈密瓜、20个红萝卜、5个永久冰石，获得不可交易且注销时消失的【丝丽的手套】，开始20分钟等待。', [1, 2, 3, 4, 5, 9, 10, 11, 12, 14, 15, 28, 29, 30, 31, 34, 35], [input('阿巴尼斯哈密瓜', 12, { quantity: 3 }), input('魔法红萝卜', 12, { quantity: 20 }), input('永久冰石', 12, { quantity: 5 })], [output('丝丽的手套', 12)]),
    step('collect-package', 4, '等待20分钟后向丝丽交出【丝丽的手套】，同一次获得不可交易、登出不消失的【菲鲁瑟的物资包】与【玄武秘术卷轴】。若仍持另一套完整材料，可重新交付、等待并重复领取。', [16, 17, 18, 19, 24, 25, 36, 37], [input('丝丽的手套', 16)], [output('菲鲁瑟的物资包', 16), output('玄武秘术卷轴', 16)], { repeatable: true }),
    step('teleport', 5, '双击【玄武秘术卷轴】，单人传送至玄武之境水晶内部。该票不要求职业3转；当前资料写每组5张，旧段落称叠加数不详，采用更新且更具体的5张并保留冲突。', [17, 20, 37, 38], [input('玄武秘术卷轴', 20, { action: 'double-click-use' })]),
    step('completion', 6, '与玄武之境内菲鲁瑟团长（32.25）对话，交出【菲鲁瑟的物资包】，获得不可交易的Lv.8【庇护的头带】，任务完结。装备后取得称号“正义的朋友”。', [21, 22, 23, 38, 39], [input('菲鲁瑟的物资包', 21)], [output('庇护的头带', 21)]),
    step('source-credits', 7, '资料致谢行仅作为来源署名，不生成任务步骤或奖励。', [26, 27, 40], [], [], { referenceOnly: true })
  ],
  rewardEvents: [rewardEvent('xuanwu-flight-ticket', 'timed-exchange', [16, 17, 18, 19, 36, 37], [resultItem('xuanwu-scroll', '玄武秘术卷轴', [16, 17, 19, 36, 37], { entityType: 'usable-item', properties: { useEffect: '单人传送至玄武之境水晶内部', thirdPromotionRequired: false, stackLimit: 5, tradeable: false, persistsOnLogout: true }, sourceConflict: '旧段落称具体叠加数不详' })], { step: 'collect-package', waitMinutes: 20, repeatable: true, groupedAcquisitionAlsoContainsProcessItem: '菲鲁瑟的物资包' }), rewardEvent('protection-headband', 'quest-completion', [21, 22, 23, 38, 39], [resultItem('protection-headband', '庇护的头带', [21, 22, 23, 38, 39], { entityType: 'equipment', properties: { level: 8, category: '头带', durability: 100, attack: 10, defense: 15, critical: 8, magicResistance: 20, tradeable: false, equippedTitle: '正义的朋友' } })], { step: 'completion' })],
  outcomes: { titles: [v([23], { name: '正义的朋友', condition: '装备庇护的头带' })], careers: [], skills: [] },
  versionChanges: [v([8, 14, 33], { date: '2024-01-17', changes: ['永久冰石需求由20个降为5个', '可由2024版丝丽的材料包一次取得整套物资'] })],
  lineTypes: ['prerequisite-heading', 'prerequisite', 'title-source', 'permit-source', 'title-source', 'optional-briefing', 'material-list', 'material-pack', 'route-step', 'title-gate', 'material-gate', 'material-exchange', 'pack-use', 'version-change', 'item-detail', 'timed-exchange', 'ticket-detail', 'repeat-rule', 'item-persistence', 'ticket-use', 'completion-exchange', 'equipment-detail', 'equipment-title', 'updated-title-gate', 'time-cost-note', 'source-credit', 'separator', 'duplicate-heading', 'duplicate-prerequisite', 'duplicate-title-gate', 'failure-note', 'old-briefing', 'version-change', 'duplicate-route', 'duplicate-material-exchange', 'duplicate-timed-exchange', 'source-conflict', 'duplicate-completion', 'duplicate-equipment-detail', 'source-credit']
});

curate('catalog-707923ad-f151-474d-85bf-bddf687723ad', '询问之地', {
  startLocation: '黑之记忆或白之记忆双击入口',
  requirements: [v([18, 38], { type: 'held-item', item: '世界之心', consumedAt: '最终龙的使者', purpose: '根据问答获得意志' })],
  relations: { prerequisites: [v([3], { quest: '深渊', relation: 'item-prerequisite', item: '黑之记忆' }), v([23], { quest: '永久冻土', relation: 'item-prerequisite', item: '白之记忆' })], itemSources: [v([3], { item: '黑之记忆', sourceQuest: '深渊' }), v([23], { item: '白之记忆', sourceQuest: '永久冻土' })], references: [v([20, 40], { type: 'story-reference', title: '龙族的纷争系列任务剧情对话', series: '龙族的纷争系列' })] },
  steps: [
    step('black-entry', 1, '黑路线：双击【黑之记忆】选“是”，交出后传送到黑之祭坛；与龙的使者（16.25）对话到光明与黑暗祭坛。', [1, 2, 3, 4], [input('黑之记忆', 2, { action: 'double-click-submit' })], [], { route: '黑之记忆' }),
    step('black-recover-memory', 2, '黑路线可选返回：持【世界之心】与龙的使者（24.17）对话选“是”，重新获得【黑之记忆】并传回召唤之间。', [5], [input('世界之心', 5, { action: 'hold', consumed: false })], [output('黑之记忆', 5)], { route: '黑之记忆', optional: true, abortsCurrentRun: true }),
    step('black-soul', 3, '调查龙之像（59.70）选“是”，获得【浑沌之魂】并传送到玄关。可双击交出浑沌之魂返回玄关，作为放弃携带该魂的分支。', [6, 7], [], [output('浑沌之魂', 6)], { route: '黑之记忆' }),
    step('black-abandon-soul', 4, '可选：双击并交出【浑沌之魂】，传送回玄关。', [7], [input('浑沌之魂', 7, { action: 'double-click-submit' })], [], { route: '黑之记忆', optional: true }),
    step('black-maze', 5, '经玄关黄色传送石（18.39）进入40层询问之地。迷宫会随机触发多次连战；重置后依入口楼层传到1、10、20或30楼。', [8, 9, 10, 11, 12, 13], [], [], { route: '黑之记忆' }),
    step('black-questions', 6, '黑路线依次在10、20、30楼向“生病的人”“虫群或被征召者”“杀人者或治理者”作答：全选“是”对应白之意志；“否、是、否”对应黑之意志；其他组合对应迷惑之意志。', [14, 15, 16, 17], [], [], { route: '黑之记忆', choices: { 白之意志: ['是', '是', '是'], 黑之意志: ['否', '是', '否'], 迷惑之意志: '其他组合' } }),
    step('black-completion', 7, '到询问处与龙的使者（13.15）对话，交出【世界之心】，按答案获得对应意志并传送到召唤之间。若浑沌之魂仍在身上，此时一并交出。', [18, 19, 20], [input('世界之心', 18), input('浑沌之魂', 19, { optional: true, condition: '仍持有' })], [output('黑路线对应意志', 18, { acquisition: 'choice-result', variants: ['白之意志', '黑之意志', '迷惑之意志'] })], { route: '黑之记忆' }),
    step('white-entry', 8, '白路线：双击【白之记忆】选“是”，交出后传送到白之祭坛；与龙的使者（25.23）对话到光明与黑暗祭坛。', [21, 22, 23, 24], [input('白之记忆', 22, { action: 'double-click-submit' })], [], { route: '白之记忆' }),
    step('white-recover-memory', 9, '白路线可选返回：持【世界之心】与龙的使者（21.27）对话选“是”，重新获得【白之记忆】并传回召唤之间。', [25], [input('世界之心', 25, { action: 'hold', consumed: false })], [output('白之记忆', 25)], { route: '白之记忆', optional: true, abortsCurrentRun: true }),
    step('white-soul', 10, '调查龙之像（60.55）选“是”，获得【秩序之魂】并传送到玄关。', [26], [], [output('秩序之魂', 26)], { route: '白之记忆' }),
    step('white-abandon-soul', 11, '可选：双击并交出【秩序之魂】，传送回玄关。', [27], [input('秩序之魂', 27, { action: 'double-click-submit' })], [], { route: '白之记忆', optional: true }),
    step('white-maze', 12, '经玄关黄色传送石（18.15）进入40层询问之地；迷宫参数与黑路线相同。', [28, 29, 30, 31, 32, 33], [], [], { route: '白之记忆' }),
    step('white-questions', 13, '白路线依次在10、20、30楼向“生病的人”“泛滥的洪水或被征召者”“杀人者或治理者”作答：全选“是”对应白之意志；全选“否”对应黑之意志；其他组合对应迷惑之意志。', [34, 35, 36, 37], [], [], { route: '白之记忆', choices: { 白之意志: ['是', '是', '是'], 黑之意志: ['否', '否', '否'], 迷惑之意志: '其他组合' } }),
    step('white-completion', 14, '到询问处与龙的使者（13.15）对话，交出【世界之心】，按答案获得对应意志并传送到召唤之间。若秩序之魂仍在身上，此时一并交出。', [38, 39, 40], [input('世界之心', 38), input('秩序之魂', 39, { optional: true, condition: '仍持有' })], [output('白路线对应意志', 38, { acquisition: 'choice-result', variants: ['白之意志', '黑之意志', '迷惑之意志'] })], { route: '白之记忆' })
  ],
  encounters: [v([9, 10, 11, 12, 13, 29, 30, 31, 32, 33], { id: 'land-of-inquiry', location: '询问之地', maze: '随机迷宫', floors: 40, refreshHoursApprox: 4, mapSizeRange: ['30*30', '100*100'], treasureChestCount: 4, maxEncounterCount: 10, enemies: [{ names: ['地龙蜥', '水龙蜥', '火龙蜥', '风龙蜥', '蜥蜴战士', '猎豹蜥蜴', '蜥蜴武士', '蜥蜴斗士'], level: { min: 60, max: 64 } }], randomMultiBattles: true, resetEntryFloors: [1, 10, 20, 30] })],
  rewardEvents: [rewardEvent('black-route-will', 'choice-result', [14, 15, 16, 17, 18, 19], [resultItem('black-route-result', '黑路线对应意志', [15, 16, 17, 18], { entityType: 'key-item-variant', variants: [{ name: '白之意志', answers: ['是', '是', '是'] }, { name: '黑之意志', answers: ['否', '是', '否'] }, { name: '迷惑之意志', answers: '其他组合' }] })], { route: '黑之记忆', step: 'black-completion' }), rewardEvent('white-route-will', 'choice-result', [34, 35, 36, 37, 38, 39], [resultItem('white-route-result', '白路线对应意志', [35, 36, 37, 38], { entityType: 'key-item-variant', variants: [{ name: '白之意志', answers: ['是', '是', '是'] }, { name: '黑之意志', answers: ['否', '否', '否'] }, { name: '迷惑之意志', answers: '其他组合' }] })], { route: '白之记忆', step: 'white-completion' })],
  lineTypes: ['route-heading', 'memory-entry', 'item-source', 'teleport-step', 'memory-recovery', 'soul-acquisition', 'soul-abandon', 'maze-entry', 'maze-detail', 'maze-metadata', 'maze-metadata', 'maze-encounter', 'multi-battle-rule', 'question-step', 'choice-result', 'choice-result', 'choice-result', 'completion-choice-result', 'optional-soul-consumption', 'story-reference', 'route-heading', 'memory-entry', 'item-source', 'teleport-step', 'memory-recovery', 'soul-acquisition', 'soul-abandon', 'maze-entry', 'maze-detail', 'maze-metadata', 'maze-metadata', 'maze-encounter', 'multi-battle-rule', 'question-step', 'choice-result', 'choice-result', 'choice-result', 'completion-choice-result', 'optional-soul-consumption', 'story-reference']
});

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第六十七批3条任务的逐行语义核验。');
