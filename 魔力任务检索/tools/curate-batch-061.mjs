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

curate('catalog-67f0f8c8-1540-432e-a690-3a03b34adf28', '秘密组织的邀请', {
  startLocation: '柯马特依村草料？（41.61）',
  requirements: [
    v([1, 2], { type: 'route-career', route: '非忍者', condition: '职业不是忍者', requiresCompletedBattle: { quest: '地下竞技场', opponent: '艾谢巴特', weightClass: '重量级', skippedClasses: ['轻量级', '羽量级'] } }),
    v([30, 31], { type: 'route-career', route: '忍者', condition: '职业为忍者', skips: '地下竞技场前置、诺斯菲拉特四场证明战' }),
    v([3, 25, 27, 31], { type: 'time-window', value: '夜晚', sourceCaveat: '原文实测称部分情况下白天也可能操作，原因不明，疑似BUG' }),
    v([23], { type: 'forced-solo-battle', appliesTo: '四名人才训练部队成员' })
  ],
  relations: {
    prerequisites: [v([2], { quest: '地下竞技场', relation: 'route-specific-prerequisite', route: '非忍者', requiredOpponent: '重量级艾谢巴特' })],
    itemSources: [],
    references: [
      v([2], { type: 'strategy-reference', title: '地下竞技场', url: 'https://www.molibaike.com/Article/Detail/7e41fda8-b9ff-45b5-9ed4-a48f4e590fd5' }),
      v([4, 32], { type: 'route-reference', targetQuest: '踏足诺斯菲拉特', purpose: '柯马特依村抵达方法' })
    ]
  },
  steps: [
    step('non-ninja-prerequisite', 1, '非忍者路线先完成《地下竞技场》中重量级艾谢巴特战；轻量级、羽量级无需挑战。', [1, 2], [], [], { route: '非忍者' }),
    step('enter-nosferatu', 2, '夜晚在柯马特依村调查草料？（41.61），选“是”传送至诺斯菲拉特。原文说明夜晚限制可能因未知BUG在白天也有效，不把白天写成稳定规则。', [3, 4, 9, 10], [], [], { route: '非忍者', sourceUncertainty: '夜晚限制偶发失效' }),
    step('optional-aixebart', 3, '在草料？处选“否”会进入Lv.95铁拳·艾谢巴特测试战；来源明确不建议尝试，该战不是进入诺斯菲拉特的正常选项。', [5, 6, 7, 8], [], [], { route: '非忍者', optional: true }),
    step('four-proofs', 4, '在诺斯菲拉特依次寻找四名外形非人型的人才训练部队成员。每次对话都会解散队伍并进入单人战斗；分别胜利后取得【胜利证明I】、【胜利证明II】、【胜利证明III】、【胜利证明IV】。', [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], [], [output('胜利证明I', 15), output('胜利证明II', 17), output('胜利证明III', 19), output('胜利证明IV', 21)], { route: '非忍者', groupedAcquisition: false }),
    step('healer', 5, '可选：夜晚在诺斯菲拉特（758.74）找暗部医疗部队成员补充生命与魔力；服务不是资深治疗。', [24, 25], [], [], { route: '非忍者', optional: true }),
    step('return-village', 6, '集齐四张胜利证明后，从诺斯菲拉特（802.74）返回正常的柯马特依村；也可登出后重新坐船前往。', [26], [input('胜利证明I', 26, { action: 'hold', consumed: false }), input('胜利证明II', 26, { action: 'hold', consumed: false }), input('胜利证明III', 26, { action: 'hold', consumed: false }), input('胜利证明IV', 26, { action: 'hold', consumed: false })], [], { route: '非忍者' }),
    step('non-ninja-completion', 7, '夜晚与草料？（41.61）对话，交出四张胜利证明，同一次获得【组织图复刻版】和称号“暗部第七部队成员”，任务完结。', [27, 28, 29], [input('胜利证明I', 27), input('胜利证明II', 27), input('胜利证明III', 27), input('胜利证明IV', 27)], [output('组织图复刻版', 28)], { route: '非忍者' }),
    step('ninja-completion', 8, '忍者路线无需证明：夜晚直接调查柯马特依村草料？（41.61）选“是”，获得【组织图复刻版】和称号“暗部第七部队成员”，任务完结。', [30, 31, 32], [], [output('组织图复刻版', 31)], { route: '忍者' })
  ],
  battles: {
    'optional-iron-fist': v([5, 6, 7, 8], { id: 'optional-iron-fist', optional: true, choice: '否', enemies: [foe([6, 7, 8], '铁拳·艾谢巴特', 'Lv.95铁拳·艾谢巴特（测试）：HP≈45000，MP≈43000，100闪100命中，二次行动（吃不吃咒未测试）。技能：明镜止水10（战栗至140魔放不出），气功蛋10（伤害800暴击1000，战栗至70魔放不出），奥义连击·舞（血量低于50%追加，伤害400+，不耗魔）', { level: 95, hpApprox: 45000, mpApprox: 43000, dodge: 100, accuracy: 100, actionCount: 2, curseResistance: 'untested', skills: ['明镜止水10（战栗至140魔放不出）', '气功蛋10（伤害800、暴击1000，战栗至70魔放不出）', '奥义连击·舞（HP低于50%追加，伤害400+，不耗魔）'] })] }),
    'training-members': v([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], { id: 'training-members', forcedSolo: true, battles: [
      v([14, 15], { order: 1, location: '诺斯菲拉特（770.82）', appearance: '石头', reward: '胜利证明I', enemies: [foe([14, 15], '人才训练部队成员I', '（770.82）（石头）Lv.79，二动，血量约6000；技能：诸刃、连击', { level: 79, hpApprox: 6000, actionCount: 2, skills: ['诸刃', '连击'] })] }),
      v([16, 17], { order: 2, location: '诺斯菲拉特（758.85）', appearance: '石头', reward: '胜利证明II', enemies: [foe([16, 17], '人才训练部队成员II', '（758.85）（石头）Lv.79，二动，血量约5500；技能：乾坤一掷、乱射', { level: 79, hpApprox: 5500, actionCount: 2, skills: ['乾坤一掷', '乱射'] })] }),
      v([18, 19], { order: 3, location: '诺斯菲拉特（732.122）', appearance: '树', reward: '胜利证明III', enemies: [foe([18, 19], '人才训练部队成员III', '（732.122）（树）Lv.79，二动，血量约7500；技能：乾坤一掷、战栗袭心', { level: 79, hpApprox: 7500, actionCount: 2, skills: ['乾坤一掷', '战栗袭心'] })] }),
      v([20, 21], { order: 4, location: '诺斯菲拉特（716.92）', appearance: '石头', reward: '胜利证明IV', enemies: [foe([20, 21], '人才训练部队成员IV', '（716.92）（石头）Lv.79，二动，血量约6500；技能：乾坤一掷、连击、阳炎', { level: 79, hpApprox: 6500, actionCount: 2, skills: ['乾坤一掷', '连击', '阳炎'] })] })
    ] })
  },
  rewardEvents: [rewardEvent('organization-chart', 'route-completion', [27, 28, 29, 30, 31], [resultItem('organization-chart-copy', '组织图复刻版', [28, 29, 31], { entityType: 'usable-item', properties: { useEffect: '双击查看组织详情' } })], { routes: ['非忍者', '忍者'] })],
  outcomes: { titles: [v([28, 31], { name: '暗部第七部队成员', routes: ['非忍者', '忍者'] })], careers: [], skills: [] },
  flowNotes: [v([9, 10], { type: 'source-bug-caveat', text: '所有“夜晚”限制可能在部分情况下失效；原因未知，不能据此宣布白天稳定开放。' })],
  lineTypes: ['route-heading', 'route-prerequisite', 'night-route-step', 'route-reference', 'optional-battle-choice', 'battle-enemy', 'battle-skill', 'battle-skill', 'bug-caveat', 'bug-caveat', 'four-battle-step', 'location-heading', 'table-heading', 'battle-row', 'battle-row-continuation', 'battle-row', 'battle-row-continuation', 'battle-row', 'battle-row-continuation', 'battle-row', 'battle-row-continuation', 'appearance-note', 'solo-battle-rule', 'service-location', 'night-service', 'return-step', 'completion-exchange', 'reward-title', 'item-use', 'route-heading', 'direct-completion', 'route-reference']
});

curate('catalog-b51b5154-cd9b-405a-97e9-c33a64e47447', '砂漠之祠', {
  startLocation: '加纳村南门外索奇亚沙漠黄色传送石',
  requirements: [v([27, 28], { type: 'return-method', value: '步行返回加纳村', warning: '登出会使相关任务道具消失' })],
  relations: { prerequisites: [], itemSources: [], references: [] },
  steps: [
    step('step-1', 1, '从加纳村南门进入索奇亚沙漠，在约（570~640.300~400）区域寻找随机黄色传送石；可按来源给出的折线坐标搜索。进入5层随机迷宫砂漠之祠。', [1, 2, 3, 4, 5, 6, 7, 8]),
    step('random-general', 2, '砂漠之祠内可能随机遭遇狂战将军。', [9, 10, 11], [], [], { optional: true, randomEncounter: true }),
    step('step-2', 3, '穿过砂漠之祠到沙漠之庙地下6楼，由（14.13）上楼进入固定迷宫沙漠之庙。庙内还会随机遭遇同规格狂战将军。', [12, 13, 14, 15]),
    step('step-3', 4, '调查宝箱（42.19）选“是”，获得【古代王族的血壶】。', [16], [], [output('古代王族的血壶', 16)]),
    step('step-4', 5, '与天空的看守者（12.32）对话，交出第一个【古代王族的血壶】，通过栅栏。', [17], [input('古代王族的血壶', 17)]),
    step('step-5', 6, '由（12.37）下楼，调查宝箱（11.8）选“是”，获得【古代莎草制绷带】。', [18], [], [output('古代莎草制绷带', 18)]),
    step('step-6', 7, '由（10.11）上楼，持有【古代莎草制绷带】与天空的看守者对话，通过栅栏；此处只持有、不消耗。', [19], [input('古代莎草制绷带', 19, { action: 'hold', consumed: false })]),
    step('step-7', 8, '再次调查宝箱（42.19）选“是”，获得用于最终交付的第二个【古代王族的血壶】。', [20], [], [output('古代王族的血壶', 20)]),
    step('step-8', 9, '与大地的看守者（66.24）对话，交出【古代莎草制绷带】，通过栅栏。', [21], [input('古代莎草制绷带', 21)]),
    step('step-9', 10, '由（66.33）下楼，与小庙的看守者（19.19）对话，通过栅栏。', [22]),
    step('step-10', 11, '调查石碑（17.41）选“是”，获得【古文书】。', [23], [], [output('古文书', 23)]),
    step('step-11', 12, '再次与小庙的看守者对话，通过栅栏。原文未明确写古文书为门禁或被消耗，因此不补写输入。', [24]),
    step('step-12', 13, '由（34.12）上楼，再由（73.30）下楼。', [25]),
    step('step-13', 14, '调查宝箱（16.4）选“是”，获得【泛红光的古代石】。', [26], [], [output('泛红光的古代石', 26)]),
    step('step-14', 15, '必须步行返回加纳村民家（60.50）。与考古学家吉村对话，交出第二个古代王族的血壶、泛红光的古代石和古文书，获得未鉴定的【宝石？】；登出会使相关任务道具消失。', [27, 28], [input('古代王族的血壶', 27), input('泛红光的古代石', 27), input('古文书', 27)], [output('宝石？', 27)]),
    step('appraise-gem', 16, '鉴定【宝石？】后成为Lv.4宝石【砂漠的红星】。武器、防具附加范围与未测试的幸运值按原文保留。', [29, 30, 31, 32], [input('宝石？', 29, { action: 'appraise' })], [output('砂漠的红星', 29)])
  ],
  encounters: [
    v([6, 7, 8], { id: 'desert-shrine-maze', location: '砂漠之祠', maze: '随机迷宫', floors: 5, refreshHoursApprox: 6, mapSizeRange: ['50*50', '90*90'], treasureChestCount: 1, enemies: [{ name: '杀手蝎', level: { min: 25, max: 27 } }, { name: '木乃伊', level: { min: 25, max: 27 } }] }),
    v([13], { id: 'desert-temple', location: '沙漠之庙', maze: '固定迷宫', enemies: [{ name: '杀手蝎', level: { min: 32, max: 36 } }] })
  ],
  battles: {
    'berserk-general-random': v([9, 10, 11, 14], { id: 'berserk-general-random', randomEncounter: true, locations: ['砂漠之祠', '沙漠之庙'], sourceSaysSameStatsInTemple: true, enemies: [foe([10, 11], '狂战将军', 'Lv.25~32狂战将军，血量约2500，邪魔系，属性：水70地30；技能：攻击、乾坤一掷、崩击、圣盾、经验吸收（只降低1000经验值不会掉级别）、即死魔法', { level: { min: 25, max: 32 }, hpApprox: 2500, race: '邪魔系', elements: { 水: 70, 地: 30 }, skills: ['攻击', '乾坤一掷', '崩击', '圣盾', '经验吸收（仅降低1000经验值、不掉级）', '即死魔法'] })] })
  },
  rewardEvents: [rewardEvent('desert-red-star', 'quest-completion', [27, 28, 29, 30, 31], [resultItem('desert-red-star', '砂漠的红星', [29, 30, 31], { entityType: 'gem', unidentifiedName: '宝石？', properties: { level: 4, weapon: { critical: { min: -1, max: 5 }, counter: { min: -1, max: 5 }, durabilityPercent: { min: -15, max: -5 }, luck: { min: -1, max: 0, untested: true } }, armor: { accuracy: { min: -1, max: 3 }, dodge: { min: -1, max: 3 }, durabilityPercent: { min: -10, max: 0 }, luck: { min: -1, max: 0, untested: true } }, sourceRaw: ['加武器上，必杀-1~~+5，反击-1~~+5，耐久-15%~-5%，幸运0~-1（未测试）', '加防具上，命中-1~~+3，闪躲-1~~+3，耐久-10~0%，幸运0~-1（未测试）'] } })], { step: 'appraise-gem' })],
  lineTypes: ['maze-entry', 'search-area', 'search-guide-heading', 'search-route', 'search-route', 'maze-detail', 'maze-encounter', 'maze-metadata', 'random-battle-heading', 'battle-enemy', 'battle-skill', 'route-step', 'fixed-maze-detail', 'repeated-random-battle', 'route-heading', 'item-acquisition', 'gate-exchange', 'item-acquisition', 'held-item-gate', 'item-acquisition', 'gate-exchange', 'gate-step', 'item-acquisition', 'gate-step', 'route-step', 'item-acquisition', 'completion-exchange', 'logout-warning', 'appraisal-result', 'gem-property', 'gem-property', 'tips-heading']
});

curate('catalog-36248880-c7d5-42a1-9458-eaee084117aa', '邪灵鸟人', {
  startLocation: '法兰城里谢里雅堡赫顿摩尔（34.70）',
  requirements: [
    v([3], { type: 'required-title', title: '开启者' }),
    v([4], { type: 'forbidden-title-by-server', title: '传说中的勇者', servers: ['怀旧服'], exemptServers: ['道具服', '时长服'] }),
    v([5], { type: 'forbidden-state', anyOf: [{ heldItemsAll: ['生命的羁绊', '火焰之羽', '风之手环', '晶莹的冰晶'] }, { previouslyExchangedItem: '黑暗之心' }], effect: '无法获得灵魂晶石' }),
    v([6], { type: 'forbidden-inventory-combination', condition: '同时持有四个不同属性的元素之证', effect: '无法获得灵魂晶石' }),
    v([7], { type: 'forbidden-inventory-combination', condition: '同时持有两个或以上同属性元素之证', workaround: '将元素之证丢地或交易给他人', effect: '无法获得灵魂晶石' })
  ],
  relations: {
    prerequisites: [],
    itemSources: [],
    references: [
      v([4], { type: 'title-source', title: '传说中的勇者', sourceQuest: '传说中的勇者', seriesLabel: '七宗罪7' }),
      v([8], { type: 'series-planning', series: '七宗罪系列', advice: '重解系列时，先取得足够元素之证，再完成《传说中的勇者》' }),
      v([31], { type: 'story-reference', title: '七宗罪系列任务剧情对话' }),
      v([32], { type: 'strategy-reference', title: '七宗罪系列任务BOSS战打法心得' })
    ]
  },
  steps: [
    step('step-1', 1, '满足接取条件后，在里谢里雅堡与赫顿摩尔（34.70）对话选“是”，获得【灵魂晶石】。来源列出的五类阻断条件均在门禁字段保存。', [1, 2, 3, 4, 5, 6, 7, 8], [], [output('灵魂晶石', 1)]),
    step('step-2', 2, '从杰诺瓦镇西门前往莎莲娜岛（150.334），与贝兹雷姆神殿附近的赫顿式神对话，进入固定迷宫贝兹雷姆小道。', [9, 10, 11, 12]),
    step('step-3', 3, '穿过贝兹雷姆小道到色欲之殿，与邪灵鸟人（14.14）对话战斗；怀旧服与时长/道具服使用不同等级和血量。', [13, 14, 15, 16, 17, 18, 19]),
    step('step-4', 4, '战胜邪灵鸟人后调查红色传送石（14.4），进入暗房。', [20]),
    step('step-5', 5, '与堕落僧侣梅鲁（11.11）对话战斗；怀旧服与时长/道具服使用不同等级和血量。', [21, 22, 23, 24, 25, 26, 27]),
    step('step-6', 6, '战斗胜利后再次与梅鲁对话，交出【灵魂晶石】，随机获得水、火、风、地四种【元素之证】之一，任务完结。原文此处写“灵魂之石”，按首步同一道具归一但保留源名。', [28, 29, 30], [input('灵魂晶石', 28, { sourceName: '灵魂之石' })], [output('四种属性元素之证之一', 28, { acquisition: 'random-one-of-four', variants: ['水元素之证', '火元素之证', '风元素之证', '地元素之证'] })])
  ],
  encounters: [v([11], { id: 'beizileimu-path', location: '贝兹雷姆小道', maze: '固定迷宫', enemies: ['大炸弹', '大地翼龙'], levelsByServer: { 怀旧服: 40, 时长服: 90, 道具服: 90 }, experienceAvailableOnHighLevelServers: true })],
  battles: {
    'evil-birdman': v([13, 14, 15, 16, 17, 18, 19], { id: 'evil-birdman', enemies: [
      foe([15, 16], '邪灵鸟人', 'Lv.50邪灵鸟人，血量约6000，邪魔系，属性：火60风60，不抗咒；技能：攻击、防御、风刃魔法、超强风刃魔法、超强混乱魔法', { servers: ['怀旧服'], level: 50, hpApprox: 6000, race: '邪魔系', elements: { 火: 60, 风: 60 }, curseResistance: false, skills: ['攻击', '防御', '风刃魔法', '超强风刃魔法', '超强混乱魔法'] }),
      foe([18, 19], '邪灵鸟人', 'Lv.100邪灵鸟人，血量约13000，邪魔系，属性：火60风60，不抗咒；技能：攻击、防御、风刃魔法、超强风刃魔法、超强混乱魔法', { servers: ['时长服', '道具服'], level: 100, hpApprox: 13000, race: '邪魔系', elements: { 火: 60, 风: 60 }, curseResistance: false, skills: ['攻击', '防御', '风刃魔法', '超强风刃魔法', '超强混乱魔法'] })
    ] }),
    'fallen-monk-meru': v([21, 22, 23, 24, 25, 26, 27], { id: 'fallen-monk-meru', enemies: [
      foe([23, 24], '堕落僧侣梅鲁', 'Lv.55堕落僧侣梅鲁，血量约10000，邪魔系，属性：全40，不抗咒；技能：攻击、防御、阳炎、乾坤一掷、冰冻魔法、超强冰冻魔法、补血魔法、恢复魔法', { servers: ['怀旧服'], level: 55, hpApprox: 10000, race: '邪魔系', elements: '全40', curseResistance: false, skills: ['攻击', '防御', '阳炎', '乾坤一掷', '冰冻魔法', '超强冰冻魔法', '补血魔法', '恢复魔法'] }),
      foe([26, 27], '堕落僧侣梅鲁', 'Lv.105堕落僧侣梅鲁，血量约15000，邪魔系，属性：全40，不抗咒；技能：攻击、防御、阳炎、乾坤一掷、冰冻魔法、超强冰冻魔法、补血魔法、恢复魔法', { servers: ['时长服', '道具服'], level: 105, hpApprox: 15000, race: '邪魔系', elements: '全40', curseResistance: false, skills: ['攻击', '防御', '阳炎', '乾坤一掷', '冰冻魔法', '超强冰冻魔法', '补血魔法', '恢复魔法'] })
    ] })
  },
  rewardEvents: [rewardEvent('element-proof', 'quest-completion', [28, 30], [resultItem('element-proof-random', '四种属性元素之证之一', [28, 30], { entityType: 'item-variant', displayName: '元素之证（四种属性之一）', selection: 'random-one-of-four', variants: ['水元素之证', '火元素之证', '风元素之证', '地元素之证'], properties: { tradeable: true } })], { step: 'step-6' })],
  versionChanges: [v([11, 14, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 27], { servers: { 怀旧服: { mazeEnemyLevel: 40, evilBirdman: { level: 50, hpApprox: 6000 }, meru: { level: 55, hpApprox: 10000 } }, 时长服: { mazeEnemyLevel: 90, evilBirdman: { level: 100, hpApprox: 13000 }, meru: { level: 105, hpApprox: 15000 } }, 道具服: { mazeEnemyLevel: 90, evilBirdman: { level: 100, hpApprox: 13000 }, meru: { level: 105, hpApprox: 15000 } } } })],
  lineTypes: ['gated-acquisition', 'gate-heading', 'required-title', 'server-title-block', 'item-state-block', 'inventory-block', 'inventory-block', 'series-planning-note', 'maze-entry', 'location-note', 'versioned-maze-encounter', 'route-heading', 'battle-step', 'server-battle-heading', 'battle-enemy', 'battle-skill', 'server-battle-heading', 'battle-enemy', 'battle-skill', 'route-step', 'battle-step', 'server-battle-heading', 'battle-enemy', 'battle-skill', 'server-battle-heading', 'battle-enemy', 'battle-skill', 'completion-random-exchange', 'exit-route', 'reward-variants', 'story-reference', 'strategy-reference']
});

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第六十一批3条任务的逐行语义核验。');
