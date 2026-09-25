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

curate('catalog-e3493168-7be7-4193-a788-845db8a07e17', '传承使者', {
  startLocation: '加纳村酒吧（51.34）',
  requirements: [v([2], { type: 'currency', amount: 2000, currency: 'G', purpose: '换取基里安特的便条' }), v([7, 8], { type: 'time-window', value: '夜晚', appliesToRoute: '寻找古代人民进入没落的村庄' })],
  relations: { prerequisites: [], itemSources: [], references: [v([9], { type: 'route-reference', targetQuest: '没落的村庄', purpose: '古代人民出现区域' }), v([10], { type: 'shortcut-source', completedQuest: '冰雪的牢城', shortcut: '经阿斯提亚镇神殿直接进入没落的村庄' }), v([11], { type: 'route-reference', targetQuest: '风鸣之塔', purpose: '没落的村庄抵达方法' })] },
  steps: [
    step('step-1', 1, '在加纳村酒吧与女服务员（10.9）对话，获得【给基里安特的信】。', [1], [], [output('给基里安特的信', 1)]),
    step('step-2', 2, '与唉声叹气的男人（9.1）对话选“是”，交出2000G和【给基里安特的信】，获得【基里安特的便条】。', [2], [input('2000G', 2, { entityType: 'currency', amount: 2000, currency: 'G' }), input('给基里安特的信', 2)], [output('基里安特的便条', 2)]),
    step('step-3', 3, '与加纳村依莉（54.56）对话，交出【基里安特的便条】，获得【主人留下的便条】。', [3], [input('基里安特的便条', 3)], [output('主人留下的便条', 3)]),
    step('step-4', 4, '返回酒吧向唉声叹气的男人交出【主人留下的便条】，获得【给鲁耶利莲娜的信】。', [4], [input('主人留下的便条', 4)], [output('给鲁耶利莲娜的信', 4)]),
    step('step-5', 5, '到没落的村庄调查传送石（63.39），进入阴冷的地下裂隙，再由（25.25）黄色传送石进迷宫。普通路线需夜晚在三个索奇亚坐标范围内寻找随机古代人民；完成《冰雪的牢城》者可从阿斯提亚镇神殿直达。', [5, 6, 7, 8, 9, 10, 11]),
    step('step-6', 6, '依次穿过四组随机迷宫，每组约5层；由第5层黄色传送石到通道，再由通道（18.18）进入下一组。', [12, 13, 14, 15, 16, 17, 18, 19]),
    step('step-7', 7, '到地下裂隙最底层，与万年河童（58.62）对话战斗。底层固定地图会遇Lv.58~60巨狼、恶魔，全图另可随机遇Lv.1巨狼。', [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]),
    step('step-8', 8, '战斗胜利后与鲁耶利莲娜对话，交出【给鲁耶利莲娜的信】，同一次获得【女主人的信】和可交易的【传承者戒指】，并传送到没落的村庄。', [31, 32], [input('给鲁耶利莲娜的信', 31)], [output('女主人的信', 31), output('传承者戒指', 31)]),
    step('step-9', 9, '返回加纳村酒吧，与唉声叹气的男人（9.2）对话，交出【女主人的信】，同一次获得【钱袋】、未鉴定的【宝石？】和称号“法兰城义勇军”，任务完结。', [33, 34], [input('女主人的信', 33)], [output('钱袋', 33), output('宝石？', 33)]),
    step('appraise-gem', 10, '鉴定【宝石？】后成为Lv.6绿宝石。来源未写鉴定地点或费用。', [35], [input('宝石？', 35, { action: 'appraise' })], [output('Lv.6绿宝石', 35)]),
    step('map-tip', 11, '古代人民会在所列大范围内随机出现，同一时间可能有3个；示意图表示可能区域，不是固定坐标。', [36, 37, 38], [], [], { referenceOnly: true })
  ],
  encounters: [v([13, 14, 15, 16, 17, 18, 19], { id: 'cold-rift', location: '阴冷的地下裂隙', mazeGroups: [{ order: 1, floorsApprox: 5, enemies: ['巨狼', '恶魔'], level: { min: 48, max: 54 }, count: { min: 1, max: 6 } }, { order: 2, floorsApprox: 5, enemies: ['水晶螃蟹', '液态史莱姆'], level: { min: 48, max: 54 }, count: { min: 1, max: 6 } }, { order: 3, floorsApprox: 5, enemies: ['水龙蜥', '冰冷树精'], level: { min: 53, max: 58 }, count: { min: 1, max: 6 } }, { order: 4, floorsApprox: 5, enemies: ['火龙蜥', '木乃伊'], level: { min: 53, max: 59 }, count: { min: 1, max: 6 } }] })],
  battles: { 'ancient-kappa': v([20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], { id: 'ancient-kappa', formationRaw: [['地龙蜥', '铁剪螃蟹', '万年河童', '沼泽树精', '腐尸'], ['铁剪螃蟹', '沼泽树精', '腐尸', '地龙蜥', '沼泽树精']], strategy: v([30], { text: '优先清除石化几率高、血量低的沼泽树精。' }), enemies: [foe([25], '万年河童', 'Lv.70万年河童（2动），血量约10000；技能：攻击、防御、战栗袭心、吸血魔法、超强石化魔法、超强陨石魔法、暗杀', { level: 70, count: 1, actionCount: 2, hpApprox: 10000, skills: ['攻击', '防御', '战栗袭心', '吸血魔法', '超强石化魔法', '超强陨石魔法', '暗杀'] }), foe([26], '腐尸', 'Lv.55腐尸*2（1动），血量约为1000；技能：攻击、防御、气功弹', { level: 55, count: 2, actionCount: 1, hpApprox: 1000, skills: ['攻击', '防御', '气功弹'] }), foe([27], '铁剪螃蟹', 'Lv.55铁剪螃蟹*2（1动），血量约为1000；技能：攻击、防御、连击、吸血魔法、战栗袭心、酒醉魔法', { level: 55, count: 2, actionCount: 1, hpApprox: 1000, skills: ['攻击', '防御', '连击', '吸血魔法', '战栗袭心', '酒醉魔法'] }), foe([28], '沼泽树精', 'Lv.55沼泽树精*3（1动），血量约为1000；技能：攻击、防御、崩击、连击、石化魔法', { level: 55, count: 3, actionCount: 1, hpApprox: 1000, skills: ['攻击', '防御', '崩击', '连击', '石化魔法'] }), foe([29], '地龙蜥', 'Lv.55地龙蜥*2（1动），血量约为1000；技能：攻击、防御、崩击', { level: 55, count: 2, actionCount: 1, hpApprox: 1000, skills: ['攻击', '防御', '崩击'] })] }) },
  rewardEvents: [rewardEvent('inheritance-ring', 'battle-completion', [31, 32], [resultItem('inheritance-ring', '传承者戒指', [31, 32], { entityType: 'equipment', properties: { level: 6, category: '戒指', durability: 50, attack: 41, defense: 10, agility: 10, recovery: 10, resistances: { poison: 20, sleep: 20, petrify: 20, drunkenness: 20, confusion: 20, forgetfulness: 20 }, tradeable: true } })], { step: 'step-8' }), rewardEvent('final-bundle', 'quest-completion', [33, 34, 35], [resultItem('coin-purse', '钱袋', [33, 34], { entityType: 'usable-item', properties: { uses: 4, perUseResult: '随机数量阿尔卡迪亚古钱', quantityRange: 'source-unspecified' } }), resultItem('green-gem-6', 'Lv.6绿宝石', [33, 35], { entityType: 'gem', unidentifiedName: '宝石？' })], { step: 'step-9', groupedAcquisition: true })],
  outcomes: { titles: [v([33], { name: '法兰城义勇军', condition: '向酒吧男人交出女主人的信' })], careers: [], skills: [] },
  lineTypes: ['item-acquisition', 'currency-exchange', 'exchange-step', 'exchange-step', 'maze-entry', 'route-heading', 'time-route', 'route-step', 'quest-reference', 'shortcut-route', 'route-reference', 'maze-heading', 'maze-structure', 'encounter-heading', 'table-heading', 'encounter-row', 'encounter-row', 'encounter-row', 'encounter-row', 'battle-step', 'bottom-encounter', 'battle-heading', 'formation-row', 'formation-row', 'battle-enemy', 'battle-enemy', 'battle-enemy', 'battle-enemy', 'battle-enemy', 'strategy-note', 'grouped-exchange', 'equipment-detail', 'completion-bundle', 'item-use', 'appraisal-result', 'tips-heading', 'map-tip', 'map-tip']
});

const normalBattles = {
  怀旧服: [
    { name: '格拉托尼', line: 19, level: 65, hp: 8000, elements: '全40', skills: ['攻击', '乾坤一掷', '诸刃', '阳炎', '崩击', '连击', '毒性攻击', '战栗袭心'] },
    { name: '拉斯特', line: 20, level: 65, hp: 8000, elements: '全40', skills: ['攻击', '四属性单体攻击魔法', '攻击无效', '吸血魔法'] },
    { name: '拉斯', line: 21, level: 65, hp: 10000, elements: '全50', skills: ['攻击', '防御', '混乱攻击', '阳炎', '恢复魔法', '战栗袭心'] },
    { name: '斯洛斯', line: 22, level: 65, hp: 12000, elements: '全50', skills: ['攻击', '防御', '圣盾', '连击', '乾坤一掷', '吸血攻击', '崩击', '石化攻击', '阳炎'] }
  ],
  '时长/道具服': [
    { name: '格拉托尼', line: 24, level: 115, hp: 17000, elements: '全40', skills: ['攻击', '乾坤一掷', '诸刃', '阳炎', '崩击', '连击', '毒性攻击', '战栗袭心'] },
    { name: '拉斯特', line: 25, level: 115, hp: 17000, elements: '全40', skills: ['攻击', '四属性单体攻击魔法', '攻击无效', '吸血魔法'] },
    { name: '拉斯', line: 26, level: 115, hp: 18000, elements: '全50', skills: ['攻击', '防御', '暗杀', '混乱攻击', '阳炎', '恢复魔法', '战栗袭心'] },
    { name: '斯洛斯', line: 27, level: 115, hp: 20000, elements: '全50', skills: ['攻击', '防御', '圣盾', '连击', '乾坤一掷', '吸血攻击', '崩击', '石化攻击', '阳炎'] }
  ]
};
const legendaryEnemies = Object.entries(normalBattles).flatMap(([server, list]) => list.map((entry) => foe([entry.line], entry.name, `Lv.${entry.level}${entry.name}，血量约${entry.hp}，属性：${entry.elements}，不抗咒；技能：${entry.skills.join('、')}`, { servers: server === '怀旧服' ? ['怀旧服'] : ['时长服', '道具服'], mode: '普通版', level: entry.level, hpApprox: entry.hp, elements: entry.elements, curseResistance: false, skills: entry.skills })));
const weakenedVariants = Object.entries(normalBattles).flatMap(([server, list]) => list.map((entry) => v([17, entry.line], { name: entry.name, servers: server === '怀旧服' ? ['怀旧服'] : ['时长服', '道具服'], mode: '削弱版', level: entry.level, hpApprox: entry.hp / 2, elements: ['格拉托尼', '拉斯特'].includes(entry.name) ? '全50' : entry.elements, derivation: '来源明确：削弱版血量为普通版一半；格拉托尼、拉斯特属性由全40变为全50', skills: entry.skills })));

curate('catalog-94ad00de-2c70-45eb-a4bd-410ec12c958f', '传说中的勇者', {
  startLocation: '莎莲娜岛赫顿的式神（150.334）',
  requirements: [v([1, 7, 11], { type: 'four-item-set', items: ['生命的羁绊', '风之手环', '火焰之羽', '晶莹的冰晶'], heldForEntry: true, consumedAt: '堕落僧侣梅鲁' }), v([15, 38], { type: 'weakened-battle-item', item: '吉娜的魔法书', scope: 'party-leader', consumedAt: '拉斯', effect: '进入削弱版BOSS战' })],
  relations: { prerequisites: [v([2], { quest: '贪婪之心', relation: 'item-prerequisite', item: '生命的羁绊' }), v([3], { quest: '色欲的诱惑', relation: 'item-prerequisite', item: '风之手环' }), v([4], { quest: '消失的古都', relation: 'item-prerequisite', item: '火焰之羽' }), v([5], { quest: '隐藏的真相', relation: 'item-prerequisite', item: '晶莹的冰晶' })], itemSources: [v([2, 3, 4, 5], { items: [{ name: '生命的羁绊', quest: '贪婪之心' }, { name: '风之手环', quest: '色欲的诱惑' }, { name: '火焰之羽', quest: '消失的古都' }, { name: '晶莹的冰晶', quest: '隐藏的真相' }] })], references: [v([8], { type: 'map-reference', targetQuest: '邪灵鸟人', map: '贝兹雷姆小道', reloadRequired: true }), v([31], { type: 'story-reference', title: '七宗罪系列任务剧情对话', series: '七宗罪系列' }), v([32], { type: 'strategy-reference', title: '七宗罪系列任务BOSS战打法心得' }), v([37], { type: 'route-reference', targetQuest: '流星山丘', purpose: '流星山丘之顶抵达方式' })] },
  steps: [
    step('optional-intro', 1, '可选：持四件前置物品在里谢里雅堡与赫顿摩尔（34.70）对话。', [1, 2, 3, 4, 5], [input('四件前置物品', 1, { action: 'hold', consumed: false, items: ['生命的羁绊', '风之手环', '火焰之羽', '晶莹的冰晶'] })], [], { optional: true }),
    step('enter-path', 2, '在莎莲娜岛（150.334）持四件前置物品与赫顿式神对话，进入需重新读取的贝兹雷姆小道。', [6, 7, 8, 9], [input('四件前置物品', 7, { action: 'hold', consumed: false, items: ['生命的羁绊', '风之手环', '火焰之羽', '晶莹的冰晶'] })]),
    step('get-dark-heart', 3, '到色欲之殿，经红色传送石进入暗房；不要点后方楼梯。与梅鲁（11.11）对话，交出四件前置物品，获得【黑暗之心】并传送到莎莲娜岛。', [10, 11], [input('生命的羁绊', 11), input('风之手环', 11), input('火焰之羽', 11), input('晶莹的冰晶', 11)], [output('黑暗之心', 11)]),
    step('book-side-quest', 4, '可在消耗黑暗之心进入后续主线前完成支线：队中一人持黑暗之心到流星山丘之顶，与巫师小爱（30.25）对话，获得【吉娜的魔法书】。开战时仅队长需要持有。里谢里雅堡赫顿摩尔对话为可跳过提示步骤。', [33, 34, 35, 36, 37, 38], [input('黑暗之心', 36, { action: 'hold', consumed: false, scope: 'one-party-member' })], [output('吉娜的魔法书', 36)], { optional: true, timing: 'before step enter-unknown' }),
    step('enter-unknown', 5, '到索奇亚岛（470.380）调查黄色水晶石，交出【黑暗之心】，进入来源名称为“？？？”的区域。', [12], [input('黑暗之心', 12)]),
    step('collapsed-cave', 6, '经红色传送石（33.20）到约12层的塌方洞窟；腐尸、水蜘蛛在怀旧服为Lv.60，时长/道具服为Lv.110。', [13, 14]),
    step('boss-choice', 7, '到地窖与拉斯（20.16）对话。队长交出【吉娜的魔法书】进入削弱版；没有魔法书则进入普通版。削弱版每名BOSS血量为普通版一半，且格拉托尼、拉斯特属性由全40变为全50。', [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27], [input('吉娜的魔法书', 15, { scope: 'party-leader', branch: '削弱版', optional: true })]),
    step('completion', 8, '战斗胜利后与拉斯对话切换场景，再与赫顿摩尔（7.16）对话完成任务。怀旧服获得称号“传说中的勇者”；时长/道具服不获得称号。怀旧服持该称号时无法重解《邪灵鸟人》。', [28, 29, 30, 31, 32])
  ],
  encounters: [v([14], { id: 'collapsed-cave', location: '塌方的洞窟', maze: '随机迷宫', floorsApprox: 12, enemies: ['腐尸', '水蜘蛛'], levelsByServer: { 怀旧服: 60, 时长服: 110, 道具服: 110 } })],
  battles: { 'seven-sins-final': v([15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27], { id: 'seven-sins-final', modes: ['普通版', '削弱版'], enemies: legendaryEnemies, weakenedVariants }) },
  rewardEvents: [rewardEvent('gina-book', 'side-quest-result', [33, 34, 35, 36, 37, 38], [resultItem('gina-book', '吉娜的魔法书', [36, 38], { entityType: 'key-item', useEffect: '队长交出后进入削弱版最终战', timing: '取得黑暗之心后、交出黑暗之心进入？？？前' })], { step: 'book-side-quest' })],
  outcomes: { titles: [v([28, 29, 30], { name: '传说中的勇者', servers: ['怀旧服'], absentOnServers: ['时长服', '道具服'], sideEffect: '持有时无法重解邪灵鸟人' })], careers: [], skills: [] },
  versionChanges: [v([14, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30], { servers: ['怀旧服', '时长服', '道具服'], note: '迷宫等级、BOSS等级血量与最终称号按服务器分开保存。' })],
  lineTypes: ['optional-held-items', 'item-source', 'item-source', 'item-source', 'item-source', 'route-step', 'four-item-gate', 'map-reference', 'route-heading', 'route-warning', 'grouped-exchange', 'exchange-entry', 'route-step', 'versioned-maze', 'battle-mode-choice', 'item-source', 'mode-difference', 'server-battle-heading', 'battle-enemy', 'battle-enemy', 'battle-enemy', 'battle-enemy', 'server-battle-heading', 'battle-enemy', 'battle-enemy', 'battle-enemy', 'battle-enemy', 'versioned-title-completion', 'repeat-block', 'no-title-version', 'story-reference', 'strategy-reference', 'side-heading', 'optional-side-intro', 'item-source', 'side-item-acquisition', 'route-reference', 'leader-item-rule']
});

const apostleStages = [
  { stage: 1, location: '第一层（186.53）', line: 7, enemyLine: 9, rewardLine: 10, quantity: 1, enemy: '神之手的使徒（冰晶巨蛇）', level: 65, hp: 7000, skills: ['乾坤一掷', '诸刃', '强力冰冻魔法', '超强冰冻魔法', '超强火焰魔法'] },
  { stage: 2, location: '第二层（97.101）', line: 12, enemyLine: 14, rewardLine: 15, quantity: 2, enemy: '神之手的使徒（异界魔导士）', level: 70, hp: 10000, skills: ['乾坤一掷', '诸刃', '强力风刃魔法', '超强陨石魔法'] },
  { stage: 3, location: '第三层（132.39）', line: 17, enemyLine: 19, rewardLine: 20, quantity: 3, enemy: '神之手的使徒（紫色恶魔统领）', level: 80, hp: 12000, skills: ['乾坤一掷', '诸刃', '超强火焰魔法', '大地之怒'] },
  { stage: 4, location: '第四层（144.112）', line: 21, enemyLine: 23, rewardLine: 24, quantity: 4, enemy: '神之手的使徒（破晓）', level: 85, hp: 14000, skills: ['奥义·破碎', '强力风刃魔法'] },
  { stage: 5, location: '第五层（132.137）', line: 26, enemyLine: 28, rewardLine: 29, quantity: 6, enemy: '神之手的使徒（蓝色地狱三头犬）', level: 90, hp: 17000, skills: ['乾坤一掷', '奥义·破碎', '气功弹', '圣盾', '魔法封印', '大地之怒'] }
];
const apostleSteps = apostleStages.map((entry) => step(`stage-${entry.stage}`, entry.stage + 1, `在避难所${entry.location}与神之手的使徒对话战斗；胜利后在狭之间与格斯对话，获得${entry.quantity}个【贝黑莱特】${entry.stage < 5 ? `并传送至第${entry.stage + 1}层` : '、称号“对抗神的人”并传送回法兰城'}。`, [entry.line, entry.line + 1, entry.enemyLine, entry.rewardLine], [], [output('贝黑莱特', entry.rewardLine, { quantity: entry.quantity })]));
const apostleRewards = [
  { id: 'time-card', name: '使徒打卡器', line: 33, cost: 1, properties: { useEffect: '人物外观变更为马卡来粉怪并开启工作时间', endsOnLogout: true, stackableEffect: false } },
  { id: 'teleport-ticket', name: '哥拉尔传送券', line: 34, cost: 2, properties: { stackLimit: 50, useEffect: '全队成员传送至哥拉尔镇', outputQuantity: 1 } },
  { id: 'sacrifice', name: '祭品', line: 35, cost: 40, properties: { level: 8, category: '护身符', durability: 150, attack: 18, agility: 10, recovery: 8, critical: 10, counter: 10, accuracy: 13, hp: 100, mp: 100, magicAttack: 20, magicResistance: 40 } },
  { id: 'ice-wolf-fur', name: '冰原狼的毛', line: 36, cost: 50, properties: { useEffect: '获得Lv.1冰原狼' } },
  { id: 'gem-box-10', name: 'Lv.10宝石箱', line: 37, cost: 90, properties: { useEffect: '随机获得1颗Lv.10宝石' } },
  { id: 'ignis-crystal', name: '伊古尼斯龙水晶', line: 38, cost: 100, properties: { useEffect: '获得Lv.1炎龙伊古尼斯' } }
];
const apostleExchangeSteps = apostleRewards.map((entry, index) => step(`exchange-${entry.id}`, 7 + index, `向格里菲斯（46.56）交出${entry.cost}个【贝黑莱特】，兑换【${entry.name}】。`, [30, 31, 32, entry.line], [input('贝黑莱特', entry.line, { quantity: entry.cost })], [output(entry.name, entry.line)], { optional: true, repeatable: true }));

curate('catalog-99601e89-6ada-4538-8102-3d426d3add34', '神之手的使徒', {
  startLocation: '法兰城里谢里雅堡格斯（46.57）', requirements: [], relations: { prerequisites: [], itemSources: [], references: [] },
  steps: [step('entry', 1, '与里谢里雅堡格斯（46.57）对话，传送到5层固定迷宫法兰城避难所。每层击倒BOSS后进入下一层；各层普通魔物配置相同。', [1, 2, 3, 4, 5, 6]), ...apostleSteps, ...apostleExchangeSteps],
  encounters: [v([2, 3, 4, 5], { id: 'falan-shelter', location: '法兰城避难所', maze: '固定迷宫', floors: 5, progression: '每层BOSS胜利后传送下一层', repeatedEnemiesPerFloor: [{ name: '幽界亡灵（白色）', level: 65, count: 3, hpApprox: 950, skills: ['攻击', '防御', '风刃魔法', '强力风刃魔法'] }, { name: '幽界死灵（红色）', level: 65, count: 3, hpApprox: 900, skills: ['攻击', '防御', '乾坤一掷', '诸刃', '圣盾'] }] })],
  battles: Object.fromEntries(apostleStages.map((entry) => [`stage-${entry.stage}`, v([entry.line, entry.line + 1, entry.enemyLine], { id: `stage-${entry.stage}`, floor: entry.stage, enemies: [foe([entry.enemyLine], entry.enemy, `Lv.${entry.level}${entry.enemy}（2动），血量约${entry.hp}；技能：${entry.skills.join('、')}`, { level: entry.level, count: 1, actionCount: 2, hpApprox: entry.hp, skills: entry.skills })] })])),
  rewardEvents: [rewardEvent('behelit-exchanges', 'exchange-recipe', [30, 31, 32, 33, 34, 35, 36, 37, 38], apostleRewards.map((entry) => resultItem(entry.id, entry.name, [entry.line], { cost: { item: '贝黑莱特', quantity: entry.cost }, entityType: entry.line === 35 ? 'equipment' : 'usable-item', properties: entry.properties })), { npc: '格里菲斯（46.56）' })],
  outcomes: { titles: [v([29], { name: '对抗神的人', condition: '击败第五层使徒并与格斯对话' })], careers: [], skills: [] },
  flowNotes: [v([10, 11, 15, 20, 24, 29], { type: 'currency-acquisition-summary', item: '贝黑莱特', quantitiesByFloor: [1, 2, 3, 4, 6], totalPerFullClear: 16, properties: { stackable: true, tradeable: true, dropBehavior: '丢地不消失' } })],
  lineTypes: ['entry-step', 'maze-rule', 'encounter-heading', 'encounter-row', 'encounter-row', 'route-heading', 'battle-step', 'battle-heading', 'battle-enemy', 'stage-reward', 'item-detail', 'battle-step', 'battle-heading', 'battle-enemy', 'stage-reward', 'route-heading', 'battle-step', 'battle-heading', 'battle-enemy', 'stage-reward', 'battle-step', 'battle-heading', 'battle-enemy', 'stage-reward', 'route-heading', 'battle-step', 'battle-heading', 'battle-enemy', 'final-reward', 'exchange-rule', 'reward-heading', 'table-heading', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row', 'exchange-row']
});

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第六十五批3条任务的逐行语义核验。');
