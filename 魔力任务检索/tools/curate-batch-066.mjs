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
  quest.itemEvents = { inputs: content.steps.flatMap((entry) => entry.inputs.map((event) => ({ ...event, step: entry.id, version: 'common', tier: 'common' }))), acquisitions: content.steps.flatMap((entry) => entry.outputs.map((event) => ({ ...event, step: entry.id, version: 'common', tier: 'common' }))) };
  delete quest.legacy;
}

curate('catalog-1f6ad2e5-f69c-4f3f-aeb3-3424bcbc2237', '沉睡的精灵', {
  startLocation: '亚诺曼城商人卡斯楚的家二楼',
  requirements: [
    v([1, 2], { type: 'career-gate', action: '领取调查委托书', allowed: '战斗系', excluded: ['医生', '护士'], repeatable: true }),
    v([4], { type: 'area-access', routes: [{ careers: ['医生', '护士'], minimumLevel: 40, access: '可离开亚诺曼城' }, { professionGroup: '生产系', minimumLevel: 25, minimumPromotion: 2, access: '可传送摩顿村' }] }),
    v([5, 9, 11], { type: 'career-gate', action: '医疗职业主线', allowed: ['医生', '护士'] }),
    v([21], { type: 'completion-boss', requiredBoss: '恶', optionalBoss: '善' })
  ],
  relations: { prerequisites: [], itemSources: [], references: [] },
  steps: [
    step('get-commission', 1, '战斗系且非医生、护士的角色与女佣爱尔玛（20.20）对话选“是”，可反复领取丢地不消失的【调查委托书】，并整队传送至亚诺曼城。', [1, 2], [], [output('调查委托书', 1, { repeatable: true, properties: { dropBehavior: '丢地不消失' } })]),
    step('reach-meibo', 2, '前往摩顿村梅博的家（52.33），由（6.16）进入。Lv.40医生/护士可出亚诺曼；Lv.25且2转的生产系可传送摩顿村。', [3, 4]),
    step('medical-entry', 3, '医生或护士持调查委托书与赖姆（11.7）对话，交出委托书传送到梅博房间；再与总管梅博（13.5）对话选“是”，获得【给马斯少爷的信】并返回梅博家。可在此暂停组队。', [5, 6, 7, 8], [input('调查委托书', 5)], [output('给马斯少爷的信', 6)]),
    step('enter-mind-room', 4, '步行或使用村落传送石返回亚诺曼城；登出会使信消失。医生或护士持【给马斯少爷的信】与爱尔玛对话，传送到马斯少爷房间。', [8, 9], [input('给马斯少爷的信', 9, { action: 'hold', consumed: false })]),
    step('non-medical-ending', 5, '非医生、护士与爱尔玛对话选“否”，获得10G并直接结束任务。', [10], [], [output('10G', 10, { entityType: 'currency', amount: 10, currency: 'G' })], { alternateEnding: true }),
    step('enter-inner-world', 6, '医生或护士与马斯少爷（8.4）对话，交出【给马斯少爷的信】，进入马斯内心世界外层。上述带入流程可重复。', [11, 12, 13, 14, 15], [input('给马斯少爷的信', 11)]),
    step('optional-books', 7, '可选：调查地面随机出现的“恒常变化、元素力量、万物之源、理性主义”取得四本同名书。来源明确：时长服与怀旧服当前因BUG无法取得、对象无形象但可对话；其他服务器是否正常未明确保证。', [16, 17], [], [output('恒常变化', 16, { acquisition: 'ground-interaction', unavailableOn: ['时长服', '怀旧服'] }), output('元素力量', 16, { acquisition: 'ground-interaction', unavailableOn: ['时长服', '怀旧服'] }), output('万物之源', 16, { acquisition: 'ground-interaction', unavailableOn: ['时长服', '怀旧服'] }), output('理性主义', 16, { acquisition: 'ground-interaction', unavailableOn: ['时长服', '怀旧服'] })], { optional: true, bugAffected: true }),
    step('find-bosses', 8, '经黄色传送石进入3层随机迷宫，寻找随机出现的BOSS善与恶。恶必须击倒才能完成；善可提前挑战取得额外奖品。', [18, 19, 20, 21]),
    step('good-battle', 9, '可选：与善对话，迎战善和9只小天使。', [22, 23, 24, 25], [], [], { optional: true }),
    step('good-rewards', 10, '战胜善后，队伍随机一人获得未鉴定【矿石？（善）】；每名队员可取得多个直接显示或未鉴定的铜剑。', [26, 27, 28, 29], [], [output('矿石？（善）', 26, { acquisition: 'random-party-member' }), output('铜剑', 26, { quantity: 'multiple', scope: 'each-party-member' }), output('单手剑？', 26, { quantity: 'multiple', scope: 'each-party-member' })]),
    step('evil-battle', 11, '与恶对话，迎战恶和9只小恶魔。', [30, 31, 32, 33]),
    step('evil-rewards', 12, '战胜恶后，队伍随机一人获得未鉴定【矿石？（恶）】；每名队员可取得多个直接显示或未鉴定的铜剑，并传送回马斯房间。原文“随机获得一人”属重复文字，按随机一人保存。', [34, 35, 36], [], [output('矿石？（恶）', 34, { acquisition: 'random-party-member' }), output('铜剑', 34, { quantity: 'multiple', scope: 'each-party-member' }), output('单手剑？', 34, { quantity: 'multiple', scope: 'each-party-member' })]),
    step('appraise-good', 13, '鉴定善战掉落的矿石后成为【安提史利普】；鉴定【单手剑？】后成为【铜剑】。', [27, 28, 29], [input('矿石？（善）', 27, { action: 'appraise' }), input('单手剑？', 29, { action: 'appraise' })], [output('安提史利普', 27), output('铜剑', 29)]),
    step('appraise-evil', 14, '鉴定恶战掉落的矿石后成为【安提肯飞斯】。', [35, 36], [input('矿石？（恶）', 35, { action: 'appraise' })], [output('安提肯飞斯', 35)]),
    step('book-ending', 15, '若成功取得四本书，与马斯对话并交出【万物之源】、【理性主义】、【元素力量】、【恒常变化】，获得未鉴定【矿石？（哲学）】，任务完结。怀旧服因BUG无法取得该矿石，对话后仅传送到卡斯楚家二楼；时长服虽无法取得书，但来源未单独说明最终对话行为。', [37, 38, 39], [input('万物之源', 37), input('理性主义', 37), input('元素力量', 37), input('恒常变化', 37)], [output('矿石？（哲学）', 37, { unavailableOn: ['怀旧服'] })], { unavailableOn: ['怀旧服'] }),
    step('appraise-philosophy', 16, '鉴定哲学路线矿石后，随机成为【菲尼纳斯】或【达克纳力】，两者装备后均取得称号“对哲学感兴趣的人”。', [38], [input('矿石？（哲学）', 38, { action: 'appraise' })], [output('菲尼纳斯或达克纳力', 38, { acquisition: 'random-one-of-two', variants: ['菲尼纳斯', '达克纳力'] })])
  ],
  encounters: [v([13, 14, 15], { id: 'inner-world-outer', location: '马斯的内心世界（外层）', maze: '固定地图', enemies: [{ name: '迷惑（小石像怪）', level: { min: 32, max: 39 }, race: '飞行系', elements: { 地: 50, 水: 50 }, skills: ['攻击', '防御', '混乱攻击', '逃跑'] }, { name: '愤怒（使魔）', level: { min: 32, max: 39 }, race: '飞行系', elements: { 火: 70, 风: 30 }, skills: ['攻击', '火焰魔法', '什么都不做'] }] }), v([19, 20], { id: 'inner-world-random', location: '黄色传送石内的马斯内心世界', maze: '随机迷宫', floors: 3, refreshHours: 4, mapSizeRange: ['50*50', '60*60'], treasureChestCount: 3, sourceFloorLevelsRaw: ['1层Lv.29~33', '1层Lv.32~36', '1层Lv.34~38'], sourceAmbiguity: '三段均标为1层，不擅自改成1/2/3层' })],
  battles: { good: v([22, 23, 24, 25], { id: 'good', optional: true, enemies: [foe([24], '善', 'Lv.40~49善，血量约4500；技能：攻击、防御、连击（小天使低于4只追加）、昏睡攻击', { level: { min: 40, max: 49 }, hpApprox: 4500, skills: ['攻击', '防御', '连击（小天使少于4只时追加）', '昏睡攻击'] }), foe([25], '小天使', 'Lv.40~49小天使*9，血量约2000；技能：攻击、防御、连击', { level: { min: 40, max: 49 }, count: 9, hpApprox: 2000, skills: ['攻击', '防御', '连击'] })] }), evil: v([30, 31, 32, 33], { id: 'evil', requiredForCompletion: true, enemies: [foe([32], '恶', 'Lv.40~55恶，血量约5500；技能：攻击、防御、昏睡攻击、超强昏睡魔法（小恶魔全部被击倒后追加）', { level: { min: 40, max: 55 }, hpApprox: 5500, skills: ['攻击', '防御', '昏睡攻击', '超强昏睡魔法（小恶魔全灭后追加）'] }), foe([33], '小恶魔', 'Lv.51小恶魔*9，血量约2000；技能：攻击、防御、遗忘攻击', { level: 51, count: 9, hpApprox: 2000, skills: ['攻击', '防御', '遗忘攻击'] })] }) },
  rewardEvents: [rewardEvent('good-boss-rewards', 'battle-drop', [26, 27, 28, 29], [resultItem('anti-sleep', '安提史利普', [26, 27, 28], { entityType: 'equipment', unidentifiedName: '矿石？（善）', recipient: 'random-one-party-member', properties: { level: 4, category: '护身符', sleepResistance: { min: 5, max: 10 }, durability: { min: 150, max: 200 }, tradeable: true, npcSalePrice: 700, currency: 'G', equippedTitle: '内心迷茫的人' } }), resultItem('copper-sword', '铜剑', [26, 29], { entityType: 'equipment', unidentifiedName: '单手剑？', recipient: 'each-party-member-multiple', properties: { level: 1, category: '单手剑', attack: { min: 8, max: 12 }, durability: 300, tradeable: true } })]), rewardEvent('evil-boss-rewards', 'battle-drop', [34, 35, 36], [resultItem('anti-confusion', '安提肯飞斯', [34, 35, 36], { entityType: 'equipment', unidentifiedName: '矿石？（恶）', recipient: 'random-one-party-member', properties: { level: 4, category: '护身符', confusionResistance: { min: 5, max: 10 }, durability: { min: 150, max: 200 }, tradeable: true, npcSalePrice: 700, currency: 'G', equippedTitle: '心灵的解放者' } }), resultItem('copper-sword-evil', '铜剑', [34], { entityType: 'equipment', recipient: 'each-party-member-multiple', properties: { level: 1, category: '单手剑', attack: { min: 8, max: 12 }, durability: 300, tradeable: true } })]), rewardEvent('philosophy-item', 'optional-completion', [37, 38, 39], [resultItem('philosophy-random', '菲尼纳斯或达克纳力', [37, 38], { entityType: 'equipment-variant', variants: ['菲尼纳斯', '达克纳力'], equippedTitle: '对哲学感兴趣的人', propertiesUnspecified: true, unavailableOn: ['怀旧服'] })])],
  outcomes: { titles: [v([27, 28], { name: '内心迷茫的人', condition: '装备安提史利普' }), v([35, 36], { name: '心灵的解放者', condition: '装备安提肯飞斯' }), v([38], { name: '对哲学感兴趣的人', condition: '装备菲尼纳斯或达克纳力' })], careers: [], skills: [] },
  versionChanges: [v([17, 39], { bug: '四书获取', unavailableOn: ['时长服', '怀旧服'], nostalgicCompletionBehavior: '与马斯对话后传送，不获得哲学矿石' })],
  lineTypes: ['career-acquisition', 'career-rule', 'route-step', 'career-access', 'medical-exchange', 'item-acquisition', 'pause-note', 'logout-warning', 'medical-teleport', 'alternate-ending', 'exchange-entry', 'repeat-rule', 'encounter-detail', 'enemy-detail', 'enemy-detail', 'optional-collection', 'bug-note', 'maze-boss-search', 'maze-detail', 'ambiguous-floor-levels', 'required-boss-rule', 'battle-step', 'battle-heading', 'battle-enemy', 'battle-enemy', 'battle-reward', 'appraisal-result', 'equipment-detail', 'appraisal-result', 'battle-step', 'battle-heading', 'battle-enemy', 'battle-enemy', 'battle-reward', 'appraisal-result', 'equipment-detail', 'optional-exchange', 'appraisal-variants', 'version-bug-ending']
});

curate('catalog-07d86d14-75a1-40bf-9b61-a58c683764e3', '凤凰之翼', {
  startLocation: '赤凤：阿凯鲁法村夏娜；青凤：哥拉尔镇拉吉乌斯', requirements: [],
  relations: { prerequisites: [], itemSources: [], references: [v([18], { type: 'repeat-route', item: '柴刀', acquisition: '玉米', reward: '赤凤之翼×3' }), v([37], { type: 'repeat-route', item: '潜水小刀', acquisition: '泽蟹', reward: '青凤之翼×3' })] },
  steps: [
    step('red-portrait', 1, '赤凤路线：在阿凯鲁法村民家与夏娜（14.5）对话选“是”，获得【波姆的肖像画】。', [1, 2], [], [output('波姆的肖像画', 2)], { route: '赤凤之翼' }),
    step('red-shirt-dirty', 2, '穿过布朗山17层随机迷宫到山顶，向波姆（31.33）交出肖像画，获得【脏掉的衬衫】。', [3, 4, 5, 6, 7, 8], [input('波姆的肖像画', 3)], [output('脏掉的衬衫', 3)], { route: '赤凤之翼' }),
    step('red-shirt-clean', 3, '返回夏娜处交出【脏掉的衬衫】，获得【干净的衬衫】。', [9], [input('脏掉的衬衫', 9)], [output('干净的衬衫', 9)], { route: '赤凤之翼' }),
    step('red-machete', 4, '返回布朗山山顶向波姆交出【干净的衬衫】，获得可保留用于重复路线的【柴刀】。', [10], [input('干净的衬衫', 10)], [output('柴刀', 10)], { route: '赤凤之翼' }),
    step('red-reimuru', 5, '到库鲁克斯岛（331.361）进入雷姆尔山新道（地图名雷姆尔山），穿过17层随机迷宫。', [11, 12, 13, 14, 15], [], [], { route: '赤凤之翼' }),
    step('red-corn', 6, '到1000公尺，持有【柴刀】调查田地（53.44），获得【玉米】；柴刀不消耗。', [16, 18], [input('柴刀', 16, { action: 'hold', consumed: false })], [output('玉米', 16)], { route: '赤凤之翼', repeatable: true }),
    step('red-wing', 7, '返回布朗山山顶向赤凰（32.35）交出【玉米】，获得3个【赤凤之翼】。之后可凭保留的柴刀重复取玉米，跳过1~4步。', [17, 18, 19, 20], [input('玉米', 17)], [output('赤凤之翼', 17, { quantity: 3 })], { route: '赤凤之翼', repeatable: true }),
    step('blue-portrait', 8, '青凤路线：在哥拉尔镇民家与生物学者拉吉乌斯（9.10）对话，获得【蕾莉的肖像画】。', [21, 22], [], [output('蕾莉的肖像画', 22)], { route: '青凤之翼' }),
    step('blue-shell', 9, '穿过雷姆尔山17层随机迷宫到山顶，向蕾莉（56.24）交出肖像画，获得【人鱼贝】。', [23, 24, 25, 26, 27, 28], [input('蕾莉的肖像画', 28)], [output('人鱼贝', 28)], { route: '青凤之翼' }),
    step('blue-sketchbook', 10, '返回哥拉尔镇向拉吉乌斯交出【人鱼贝】，获得【涂鸦簿】。', [29], [input('人鱼贝', 29)], [output('涂鸦簿', 29)], { route: '青凤之翼' }),
    step('blue-knife', 11, '返回雷姆尔山山顶向蕾莉交出【涂鸦簿】，获得可保留用于重复路线的【潜水小刀】。', [30], [input('涂鸦簿', 30)], [output('潜水小刀', 30)], { route: '青凤之翼' }),
    step('blue-crab', 12, '穿过布朗山到1000公尺，持有【潜水小刀】调查池塘（26.70），获得【泽蟹】；潜水小刀不消耗。', [31, 32, 33, 34, 35, 37], [input('潜水小刀', 31, { action: 'hold', consumed: false })], [output('泽蟹', 31)], { route: '青凤之翼', repeatable: true }),
    step('blue-wing', 13, '返回雷姆尔山山顶向青凤交出【泽蟹】，获得3个【青凤之翼】。之后可凭保留的潜水小刀重复取泽蟹，跳过1~5步。', [36, 37, 38, 39], [input('泽蟹', 36)], [output('青凤之翼', 36, { quantity: 3 })], { route: '青凤之翼', repeatable: true })
  ],
  encounters: [v([4, 5, 6, 7, 8, 32, 33, 34, 35], { id: 'brown-mountain-small', location: '布朗山（小）', maze: '随机迷宫', floors: 17, layout: { lower: '100M~900M（9层）', middle: '1000M', upper: '1100M~1700M（7层）' }, refreshHoursApprox: 4, mapSizeRange: ['40*40', '60*60'], treasureChestCount: 3, encounters: [{ area: '下9层', enemies: ['杀人螳螂', '蔓陀罗草'], level: { min: 30, max: 33 }, maxCount: 4 }, { area: '上7层', enemies: ['杀人螳螂', '蔓陀罗草'], level: { min: 33, max: 35 }, maxCount: 8 }] }), v([12, 13, 14, 15, 24, 25, 26, 27], { id: 'reimuru-mountain-small', location: '雷姆尔山（小）', maze: '随机迷宫', floors: 17, layout: { lower: '100M~900M（9层）', middle: '1000M', upper: '1100M~1700M（7层）' }, refreshHoursApprox: 4, mapSizeRange: ['40*40', '60*60'], treasureChestCount: 3, encounters: [{ area: '下9层', enemies: ['虎头蜂', '火焰啄木鸟'], level: { min: 28, max: 31 }, maxCount: 4 }, { area: '上7层', enemies: ['虎头蜂', '火焰啄木鸟'], level: { min: 31, max: 33 }, maxCount: 8 }] })],
  rewardEvents: [rewardEvent('red-wing', 'repeatable-exchange', [17, 18, 19, 20], [resultItem('red-phoenix-wing', '赤凤之翼', [17, 19, 20], { entityType: 'usable-item', quantity: 3, properties: { useLocation: '阿凯鲁法村', useEffect: '传送至哥拉尔镇', consumedOnUse: true, tradeable: true, stackLimit: 3 } })], { step: 'red-wing', repeatTool: '柴刀' }), rewardEvent('blue-wing', 'repeatable-exchange', [36, 37, 38, 39], [resultItem('blue-phoenix-wing', '青凤之翼', [36, 38, 39], { entityType: 'usable-item', quantity: 3, properties: { useLocation: '哥拉尔镇', useEffect: '传送至阿凯鲁法村', consumedOnUse: true, tradeable: true, stackLimit: 3 } })], { step: 'blue-wing', repeatTool: '潜水小刀' }), rewardEvent('repeat-tools', 'route-tool', [10, 16, 18, 30, 31, 37], [resultItem('machete', '柴刀', [10, 16, 18], { entityType: 'key-item', futureUse: '重复取得玉米并兑换赤凤之翼', consumed: false }), resultItem('diving-knife', '潜水小刀', [30, 31, 37], { entityType: 'key-item', futureUse: '重复取得泽蟹并兑换青凤之翼', consumed: false })])],
  lineTypes: ['route-heading', 'item-acquisition', 'exchange-step', 'maze-detail', 'maze-metadata', 'maze-metadata', 'encounter-row', 'encounter-row', 'exchange-step', 'exchange-step', 'maze-entry', 'maze-detail', 'maze-metadata', 'encounter-row', 'encounter-row', 'held-tool-acquisition', 'completion-exchange', 'repeat-route', 'item-use', 'item-detail', 'route-heading', 'item-acquisition', 'maze-entry', 'maze-detail', 'maze-metadata', 'encounter-row', 'encounter-row', 'exchange-step', 'exchange-step', 'exchange-step', 'held-tool-acquisition', 'maze-detail', 'maze-metadata', 'encounter-row', 'encounter-row', 'completion-exchange', 'repeat-route', 'item-use', 'item-detail']
});

curate('catalog-cc7a68e7-8731-4d60-9064-08fb3c6b2770', '改造僵尸', {
  startLocation: '亚留特村外随机黄色传送石',
  requirements: [v([9, 12], { type: 'per-party-member-item', item: '实验药', purpose: '进入改造僵尸最终战', consumedAt: '改造僵尸' }), v([10], { type: 'item-block', heldItem: '牢房的钥匙', effect: '无法从米内鲁帕取得实验药' }), v([30], { type: 'level-range', min: 45, max: 160, appliesTo: '地狱看门犬支线直接遇到Lv.20地狱看门犬' })],
  relations: { prerequisites: [], itemSources: [v([8, 34], { item: '实验药', sourceNpc: '无照护士米内鲁帕', location: '奇怪的洞窟', blockedByHeldItem: '牢房的钥匙' })], references: [v([21], { type: 'future-use', item: '贪欲的罪书', targetQuest: '最后的真相', series: '兰国/艾国勋章系列一等勋章' }), v([24], { type: 'versioned-shop-reference', item: '设计图？', servers: ['时长服', '道具服'], targetQuest: '宠物改造计划I' }), v([27], { type: 'story-reference', title: '改造僵尸任务剧情对话' })] },
  steps: [
    step('enter-cave', 1, '在亚留特村外（527~546.35~39）附近寻找随机黄色传送石，进入10~12层奇怪的洞窟。', [1, 2, 3, 4, 5, 6, 7]),
    step('get-drug', 2, '在洞窟寻找随机出现的无照护士米内鲁帕，获得【实验药】。全队每人都需持有；持【牢房的钥匙】时无法取得。', [8, 9, 10], [], [output('实验药', 8)]),
    step('reach-lab', 3, '到迷宫底层寻找上楼楼梯，进入阿鲁巴斯实验所。', [11]),
    step('zombie-battle', 4, '全队持实验药与改造僵尸（21.18）对话，各自交出实验药进入战斗。', [12, 13, 14, 15, 16, 17], [input('实验药', 12, { scope: 'each-party-member' })]),
    step('post-battle', 5, '战斗胜利后切换场景，并有未注明概率随机获得【贪欲的罪书】。', [18, 19, 20, 21], [], [output('贪欲的罪书', 18, { acquisition: 'chance', probability: 'unspecified' })]),
    step('learn-meditation', 6, '可选：向赛辛（18.17）交出100G，学习格斗士得意技“明镜止水”。', [22, 23], [input('100G', 22, { entityType: 'currency', amount: 100, currency: 'G' })], [], { optional: true }),
    step('design-reference', 7, '时长服、道具服可购买【设计图？】，具体取得方式属于《宠物改造计划I》，不写成本或结果到本任务。', [24], [], [], { referenceOnly: true }),
    step('completion', 8, '与密医阿鲁巴斯（16.16）对话，获得【牢房的钥匙】；由后门（15.13）和楼梯（16.3）离开研究所，任务完结。取得钥匙后会阻断再次领取实验药，因此遗物丝巾支线宜在此前完成。', [25, 26, 27], [], [output('牢房的钥匙', 25)]),
    step('hellhound-battle', 9, '地狱看门犬支线：寻找洞窟内随机地狱看门犬并进入战斗。Lv.45~160角色可直接遇到Lv.20地狱看门犬。', [28, 29, 30], [], [], { branch: '地狱看门犬' }),
    step('hellhound-seal', 10, '在战斗中封印地狱看门犬，成功后将其等级提升至Lv.20或以上。', [31], [], [output('Lv.20以上地狱看门犬', 31, { entityType: 'pet', acquisition: 'seal-and-level' })], { branch: '地狱看门犬' }),
    step('hellhound-exchange', 11, '返回亚留特村，持Lv.20或以上地狱看门犬与基墨（48.37）对话，交换Lv.1地狱看门犬。', [32], [input('Lv.20以上地狱看门犬', 32, { entityType: 'pet' })], [output('Lv.1地狱看门犬', 32, { entityType: 'pet' })], { branch: '地狱看门犬' }),
    step('scarf-drug', 12, '遗物丝巾支线：在取得牢房钥匙前，从米内鲁帕处取得【实验药】。', [33, 34], [], [output('实验药', 34)], { branch: '遗物「丝巾」' }),
    step('scarf-battle', 13, '寻找洞窟内随机出现的“人类？”，持实验药对话进入Lv.22腐尸战斗；来源未写实验药在此交出，故只记持有。胜利后获得【遗物「丝巾」】。', [35, 36, 37], [input('实验药', 35, { action: 'hold', consumed: false })], [output('遗物「丝巾」', 35)], { branch: '遗物「丝巾」' }),
    step('scarf-completion', 14, '返回亚留特村南席的家（31.54），向南希（14.10）交出【遗物「丝巾」】，支线完结；来源明确无奖品。', [38, 39], [input('遗物「丝巾」', 38)], [], { branch: '遗物「丝巾」', noReward: true })
  ],
  encounters: [v([2, 3, 4, 5, 6, 7], { id: 'strange-cave', location: '奇怪的洞窟', maze: '随机迷宫', floors: { min: 10, max: 12 }, refreshHoursApprox: 4, mapSize: '60*60', treasureChestCount: 6, maxEncounterCount: 8, enemies: [{ name: '地狱看门犬', level: { min: 16, max: 19 }, hpApprox: 400, race: '野兽系', elements: { 火: 60, 水: 40 }, curseResistance: false, skills: ['攻击', '防御', '连击'] }, { name: '僵尸', level: { min: 16, max: 19 }, hpApprox: 400, race: '不死系', elements: { 地: 40, 风: 60 }, curseResistance: false, skills: ['攻击', '诸刃', '什么都不做', '攻击（敌方随机；低几率）'] }, { name: '腐尸', level: { min: 16, max: 19 }, hpApprox: 450, race: '不死系', elements: { 地: 60, 水: 40 }, curseResistance: false, skills: ['攻击', '防御', '酒醉攻击'] }] })],
  battles: { 'modified-zombie': v([12, 13, 14, 15, 16, 17], { id: 'modified-zombie', enemies: [foe([14, 15], '改造僵尸', 'Lv.35改造僵尸，2动，血量约1800，邪魔系，属性：地40风60，抗咒；技能：攻击、防御、诸刃、吸血攻击、明镜止水（血量<25%追加）、自爆（全体伤害；血量<50%追加）', { level: 35, count: 1, actionCount: 2, hpApprox: 1800, race: '邪魔系', elements: { 地: 40, 风: 60 }, curseResistance: true, skills: ['攻击', '防御', '诸刃', '吸血攻击', '明镜止水（HP<25%追加）', '自爆（HP<50%追加，全体伤害）'] }), foe([16], '僵尸', 'Lv.23~25僵尸，血量约600，不死系，属性：地40风60，不抗咒；技能：攻击、防御、诸刃、吸血攻击、明镜止水（血量<25%追加）', { level: { min: 23, max: 25 }, count: 1, hpApprox: 600, race: '不死系', elements: { 地: 40, 风: 60 }, curseResistance: false, skills: ['攻击', '防御', '诸刃', '吸血攻击', '明镜止水（HP<25%追加）'] }), foe([17], '腐尸', 'Lv.23~25腐尸*2，血量约600，不死系，属性：地60水40，不抗咒；技能：攻击（我方血少者）、攻击、防御、酒醉攻击、明镜止水、崩击', { level: { min: 23, max: 25 }, count: 2, hpApprox: 600, race: '不死系', elements: { 地: 60, 水: 40 }, curseResistance: false, skills: ['攻击（我方血少者）', '攻击', '防御', '酒醉攻击', '明镜止水', '崩击'] })] }), 'scarf-zombie': v([35, 36, 37], { id: 'scarf-zombie', branch: '遗物「丝巾」', enemies: [foe([37], '腐尸', 'Lv.22腐尸，血量约540，不死系；技能：攻击、诸刃、什么都不做', { level: 22, hpApprox: 540, race: '不死系', skills: ['攻击', '诸刃', '什么都不做'] })] }) },
  rewardEvents: [rewardEvent('greed-book', 'battle-drop', [18, 19, 20, 21], [resultItem('greed-sin-book', '贪欲的罪书', [18, 20, 21], { entityType: 'equipment', acquisition: 'chance', probability: 'unspecified', properties: { level: 2, category: '护身符', counter: 4, durability: 100, tradeable: true }, collectionRole: '七本罪书之一', futureUse: '《最后的真相》必要道具之一' })], { step: 'post-battle' }), rewardEvent('hellhound-exchange', 'side-quest-exchange', [28, 29, 30, 31, 32], [resultItem('hellhound-level-reset', 'Lv.1地狱看门犬', [32], { entityType: 'pet', cost: { pet: 'Lv.20或以上地狱看门犬' } })], { step: 'hellhound-exchange' })],
  outcomes: { titles: [], careers: [], skills: [v([22, 23], { name: '明镜止水', cost: 100, currency: 'G', favoredProfession: '格斗士', teacher: '赛辛（18.17）' })] },
  lineTypes: ['maze-entry', 'maze-detail', 'maze-metadata', 'maze-encounter', 'enemy-detail', 'enemy-detail', 'enemy-detail', 'item-acquisition', 'party-item-gate', 'item-block', 'route-step', 'party-exchange-battle', 'battle-heading', 'battle-enemy', 'battle-skill', 'battle-enemy', 'battle-enemy', 'chance-drop', 'drop-heading', 'equipment-detail', 'future-use', 'skill-learning', 'skill-note', 'versioned-reference', 'key-acquisition', 'exit-completion', 'story-reference', 'branch-heading', 'branch-battle', 'level-rule', 'capture-rule', 'pet-exchange', 'branch-heading', 'item-acquisition', 'held-item-battle', 'battle-heading', 'battle-enemy', 'branch-completion', 'no-reward-note']
});

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第六十六批3条任务的逐行语义核验。');
