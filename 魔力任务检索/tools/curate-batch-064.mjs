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

curate('catalog-68307ad9-6420-45be-87af-011d7116d7e6', '拜访炼金之馆', {
  startLocation: '夜晚加纳村船夫（90.73）',
  requirements: [
    v([1], { type: 'time-window', value: '夜晚', purpose: '由加纳村船夫传送至海岸' }),
    v([1, 3], { type: 'route-item', oneOf: ['联络信', '会员徽章'], purpose: '船夫传送至海岸' }),
    v([27, 31, 33, 34, 36], { type: 'branch-resource', item: '参观票', scope: '药剂/炼金支线每名参与者；炼气战斗只需队长具备', consumedAccordingToBranch: true })
  ],
  relations: {
    prerequisites: [],
    itemSources: [v([2], { item: '联络信', sourceQuest: '蔓延的邪恶' }), v([22], { item: '参观票', source: '炼金之馆接待员（86.27）', cost: { amount: 500, currency: 'G' }, quantity: 3 })],
    references: [v([24], { type: 'story-reference', title: '失落的炼金术系列任务剧情对话', series: '失落的炼金术系列' })]
  },
  steps: [
    step('step-1-letter', 1, '夜晚持【联络信】与加纳村船夫（90.73）对话，传送至海岸，再由（28.33）进入炼金之馆。持会员徽章也可使用船夫传送，但这只是通行替代，不据此跳过主线取证步骤。', [1, 2, 3], [input('联络信', 1, { action: 'hold', consumed: false })]),
    step('step-2', 2, '到炼金之馆2楼与大炼金师（66.27）对话，交出【联络信】，获得【通行证】。同层护士尤美儿（55.21）可回复生命与魔力。', [4, 5], [input('联络信', 4)], [output('通行证', 4)]),
    step('step-3', 3, '到1楼房间（22.5）与书库管理员（80.70）对话下楼，经（114.84）红色传送石进入9层随机迷宫试炼之路。持会员徽章与管理员对话可直接传送到地下书库；来源未说明此捷径可替代通行证交付，故只记导航捷径。', [6, 7, 8]),
    step('step-4', 4, '穿过试炼之路，在迷宫深处与堕落者（15.21）对话，进入四名堕落者战斗。', [9, 10, 11, 12, 13, 14]),
    step('step-5', 5, '战斗胜利后通过栅栏，由（10.2）进入地下书库。', [15]),
    step('step-6', 6, '调查目录管理者（23.32），交出【通行证】，获得【特殊资料】。', [16], [input('通行证', 16)], [output('特殊资料', 16)]),
    step('step-7', 7, '调查传送石（24.10）返回炼金之馆，再到2楼向大炼金师交出【特殊资料】，同一次获得【接待信】与后续任务道具【整理后的资料】。', [17, 18], [input('特殊资料', 17)], [output('接待信', 17), output('整理后的资料', 17)]),
    step('step-8', 8, '与接待员（86.27）对话，交出【接待信】，同一次获得【会员徽章】和3张【参观票】。会员徽章用于后续通行，参观票用于三类炼金体验支线。', [19, 20, 21, 23], [input('接待信', 19)], [output('会员徽章', 19), output('参观票', 19, { quantity: 3 })]),
    step('buy-tickets', 9, '可选：向接待员交出500G，购买3张【参观票】。', [22], [input('500G', 22, { entityType: 'currency', amount: 500, currency: 'G' })], [output('参观票', 22, { quantity: 3 })], { optional: true, repeatable: true }),
    step('potion-start', 10, '药剂大师支线：持参观票到1楼房间（5.10），与药剂大师（116.28）对话选“是”，交出1张参观票，获得【空的药剂瓶】。', [25, 26, 27], [input('参观票', 27)], [output('空的药剂瓶', 27)], { branch: '药剂大师' }),
    step('potion-fail', 11, '等待数分钟后与药剂大师对话。来源明确写“不会成功”，失败时交出【空的药剂瓶】，获得【炼金术残渣】，支线完结。', [28, 29], [input('空的药剂瓶', 28)], [output('炼金术残渣', 28)], { branch: '药剂大师', outcome: 'failure' }),
    step('alchemy-master', 12, '炼金大师支线：到1楼房间（5.20），持参观票与炼金大师（148.22）对话选“是”，交出参观票和纯银；成功时获得【幻之钢条】。来源未给成功率或失败结果。', [30, 31], [input('参观票', 31), input('纯银', 31)], [output('幻之钢条', 31, { acquisition: 'success-only', probability: 'unspecified' })], { branch: '炼金大师' }),
    step('qi-battle', 13, '炼气大师支线：到1楼房间（28.12）与炼气大师（48.75）对话选“是”，进入战斗。仅队长需要参观票。原文此处称队长“交出”参观票，但战后又写交出，存在消费时点冲突；数据把战前处理为出示门禁，战后按明确奖励交换消耗。', [32, 33, 34, 35], [input('参观票', 33, { action: 'present', consumed: false, scope: 'party-leader', sourceConflict: 'line 34 uses 交出; line 36 also consumes ticket' })], [], { branch: '炼气大师' }),
    step('qi-completion', 14, '战斗胜利后再次与炼气大师对话，交出队长的【参观票】，获得不可交易、丢地消失的【挑战者徽章】，并传送回1楼房间。', [36, 37], [input('参观票', 36, { scope: 'party-leader' })], [output('挑战者徽章', 36)], { branch: '炼气大师' })
  ],
  encounters: [v([8], { id: 'trial-road', location: '试炼之路', maze: '随机迷宫', floors: 9, enemies: [{ name: '魔甲守卫者（金怪）', level: { min: 60, max: 62 } }, { name: '战甲守卫者（银怪）', level: { min: 60, max: 62 } }] })],
  battles: {
    'fallen-ones': v([9, 10, 11, 12, 13, 14], { id: 'fallen-ones', enemies: [
      foe([11], '堕落者（传）', 'Lv.65堕落者（传），1动，血量约8000；技能：攻击、防御、补血魔法、超强风刃魔法、超强冰冻魔法', { level: 65, actionCount: 1, hpApprox: 8000, skills: ['攻击', '防御', '补血魔法', '超强风刃魔法', '超强冰冻魔法'] }),
      foe([12], '堕落者（弓）', 'Lv.65堕落者（弓），1动，血量约8000；技能：攻击、防御、乱射、阳炎', { level: 65, actionCount: 1, hpApprox: 8000, skills: ['攻击', '防御', '乱射', '阳炎'] }),
      foe([13], '堕落者（剑）', 'Lv.65堕落者（剑），1动，血量约8000；技能：攻击、防御、连击、诸刃', { level: 65, actionCount: 1, hpApprox: 8000, skills: ['攻击', '防御', '连击', '诸刃'] }),
      foe([14], '堕落者（斧）', 'Lv.65堕落者（斧），1动，血量约8000；技能：攻击、防御、诸刃、崩击、乾坤一掷', { level: 65, actionCount: 1, hpApprox: 8000, skills: ['攻击', '防御', '诸刃', '崩击', '乾坤一掷'] })
    ] }),
    'qi-master': v([33, 34, 35], { id: 'qi-master', branch: '炼气大师', enemies: [foe([35], '炼气大师', 'Lv.80炼气大师，血量约10000；技能：攻击、防御、气功弹、乾坤一掷、崩击', { level: 80, hpApprox: 10000, skills: ['攻击', '防御', '气功弹', '乾坤一掷', '崩击'] })] })
  },
  rewardEvents: [
    rewardEvent('organized-materials', 'quest-completion', [17, 18], [resultItem('organized-materials', '整理后的资料', [17, 18], { entityType: 'key-item', futureUse: '后续任务', warning: '勿丢弃' })], { step: 'step-7' }),
    rewardEvent('member-badge', 'quest-completion', [19, 20, 21], [resultItem('member-badge', '会员徽章', [19, 20, 21], { entityType: 'equipment', properties: { level: 1, category: '护身符', durability: 100, charm: 5 }, futureUse: '船夫传送至海岸、书库管理员传送至地下书库', warning: '勿丢弃' })], { step: 'step-8' }),
    rewardEvent('challenger-badge', 'side-quest-completion', [36, 37], [resultItem('challenger-badge', '挑战者徽章', [36, 37], { entityType: 'equipment', properties: { level: 1, category: '护身符', sourceStatLabel: '耐力', sourceStatValue: 100, charm: 5, equippedTitle: '吃我一发气功弹', tradeable: false, dropBehavior: '丢地消失' }, sourceAmbiguity: '原文写“耐力100”，不擅自改作耐久' })], { step: 'qi-completion' })
  ],
  outcomes: { titles: [v([37], { name: '吃我一发气功弹', condition: '装备挑战者徽章' })], careers: [], skills: [] },
  lineTypes: ['night-item-route', 'item-source', 'alternate-route-item', 'exchange-step', 'service-note', 'maze-entry', 'member-shortcut', 'maze-detail', 'battle-step', 'battle-heading', 'battle-enemy', 'battle-enemy', 'battle-enemy', 'battle-enemy', 'route-step', 'exchange-step', 'grouped-exchange', 'future-item-warning', 'grouped-exchange', 'equipment-detail', 'future-item-warning', 'ticket-purchase', 'ticket-use-note', 'story-reference', 'branch-heading', 'branch-heading', 'branch-exchange', 'branch-result', 'failure-certainty', 'branch-heading', 'branch-chance-exchange', 'branch-heading', 'branch-battle-entry', 'leader-ticket-rule', 'battle-enemy', 'branch-completion', 'equipment-detail']
});

const careers = [
  { name: '剑士', weapon: '平民剑', price: 400, line: 5, mentor: '剑士长迪索尔（18.10）', location: '法兰城竞技场（123.161）', mentorLine: 29 },
  { name: '战斧斗士', weapon: '平民斧', price: 600, line: 6, mentor: '超级斗士欧雷葛诺（20.22）', location: '法兰城竞技场后台（35.8）', mentorLine: 31 },
  { name: '骑士', weapon: '平民枪', price: 600, line: 7, mentor: '骑士团长亚涅特（11.4）', location: '里谢里雅堡2楼客房（67.71）', mentorLine: 30 },
  { name: '弓箭手', weapon: '平民弓', price: 400, line: 8, mentor: '弓箭手拉美莉诺（6.4）', location: '法兰城弓箭手公会（190.133）', mentorLine: 32 },
  { name: '饲养师', weapon: '平民回力标', price: 700, line: 9, mentor: '饲养师那可利（13.9）', location: '法兰城饲养师之家（122.36）', mentorLine: 37 },
  { name: '驯兽师', weapon: '平民小刀', price: 400, line: 10, mentor: '驯兽师方席（13.8）', location: '法兰城职业工会（73.60）', mentorLine: 36 },
  { name: '魔术师', weapon: '平民杖', price: 400, line: 11, mentor: '狄尔西雅达美（19.13）', location: '夜晚由法兰城西门外魔女之家神木进入', mentorLine: 33 }
];

curate('catalog-a9a88c4a-2de8-4100-b795-22864d494eda', '就职其他战斗系职业', {
  startLocation: '法兰城平民武器贩售处（150.122）',
  requirements: [
    v([1, 2, 3, 12, 22], { type: 'career-route', route: '首次就职', requirement: '装备目标职业对应武器类型；不强制使用平民武器' }),
    v([2, 23, 24], { type: 'career-route', route: '转职', requirement: '无需装备对应武器；向亚伦输入本任务内职业名称' }),
    v([25], { type: 'inventory-exclusion', condition: '物品栏已有本任务任一职业推荐信', effect: '不可再取得另一张或重复取得职业推荐信' }),
    v([34, 35], { type: 'time-password', career: '魔术师', time: '夜晚', target: '魔女之家外随机坐标神木', choice: '是', password: '魔术' })
  ],
  relations: { prerequisites: [], itemSources: [], references: [] },
  steps: [
    step('weapon-choice', 1, '首次就职者可在平民武器贩售处购买目标职业对应的不可交易武器；也可装备其他同类型武器。转职者跳过购买与装备步骤。', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [], [output('目标职业对应平民武器', 1, { acquisition: 'purchase-choice', variants: careers.map((entry) => ({ career: entry.name, item: entry.weapon, price: entry.price, currency: 'G', sourceLines: [entry.line] })), properties: { tradeable: false } })]),
    step('painkiller', 2, '到法兰城城东医院向药剂师波洛姆（16.35）支付3G，购买1瓶不可交易的【止痛药（特价品）】。', [13, 14], [input('3G', 14, { entityType: 'currency', amount: 3, currency: 'G' })], [output('止痛药（特价品）', 13)]),
    step('pass', 3, '在法兰城职业公会与安布伦（10.6）对话选“是”，交出【止痛药（特价品）】，获得【试炼洞穴通行证】。', [15], [input('止痛药（特价品）', 15)], [output('试炼洞穴通行证', 15)]),
    step('enter-cave', 4, '到法兰城西门外国营第24坑道（351.145），持通行证与哈鲁迪亚（9.14）对话通过栅栏，由（9.5）进入5层固定迷宫试炼之洞窟。', [16, 17, 19, 20], [input('试炼洞穴通行证', 17, { action: 'hold', consumed: false })]),
    step('abort-cave', 5, '可选退出：持通行证与法拉米亚（7.5）对话，选“确定”交出通行证，传送至栅栏外。', [18], [input('试炼洞穴通行证', 18)], [], { optional: true, abortsQuest: true }),
    step('employment-letter', 6, '首次就职路线：抵达大厅后装备目标职业对应武器，与波罗米亚（23.15）对话，交出通行证，获得与武器对应的【职业推荐信】。', [21, 22, 25], [input('试炼洞穴通行证', 22), input('目标职业对应武器', 22, { action: 'equip', consumed: false })], [output('目标职业推荐信', 22)], { route: '首次就职' }),
    step('transfer-letter', 7, '转职路线：抵达大厅后无需装备武器，与亚伦（24.12）对话并输入本任务所列职业名，交出通行证，获得对应【职业推荐信】。', [21, 23, 24, 25], [input('试炼洞穴通行证', 24)], [output('目标职业推荐信', 24)], { route: '转职' }),
    step('career-completion', 8, '携职业推荐信返回法兰城，找到目标职业导师并办理就职或转职。剑士、骑士、战斧斗士、弓箭手、驯兽师、饲养师的位置按表记录；魔术师须夜晚调查魔女之家外随机神木，选“是”并输入“魔术”进入。', [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37], [input('目标职业推荐信', 26)], [], { mentors: careers.map((entry) => ({ career: entry.name, location: entry.location, mentor: entry.mentor, sourceLines: entry.name === '魔术师' ? [33, 34, 35] : [entry.mentorLine] })) })
  ],
  encounters: [v([19], { id: 'trial-cave', location: '试炼之洞窟', maze: '固定迷宫', floors: 5, enemies: [{ name: '大蝙蝠', level: { min: 3, max: 5 } }, { name: '火蜘蛛', level: { min: 3, max: 5 } }] })],
  outcomes: { titles: [], careers: careers.map((entry) => v(entry.name === '魔术师' ? [26, 33, 34, 35] : [26, entry.mentorLine], { name: entry.name, recommendationLetter: `${entry.name}职业推荐信`, mentor: entry.mentor, location: entry.location })), skills: [] },
  lineTypes: ['weapon-purchase', 'transfer-skip', 'weapon-table-heading', 'table-heading', 'weapon-row', 'weapon-row', 'weapon-row', 'weapon-row', 'weapon-row', 'weapon-row', 'weapon-row', 'weapon-type-rule', 'item-purchase', 'item-detail', 'exchange-step', 'route-step', 'held-item-gate', 'abort-exchange', 'maze-detail', 'route-heading', 'route-step', 'employment-letter', 'transfer-letter', 'transfer-letter', 'duplicate-letter-block', 'career-completion', 'mentor-heading', 'table-heading', 'mentor-row', 'mentor-row', 'mentor-row', 'mentor-row', 'mentor-row', 'magic-entry-note', 'magic-password', 'mentor-row', 'mentor-row']
});

curate('catalog-b8e49b84-f330-4c3c-a3a8-05fbfc7bd968', '抉择之刻', {
  startLocation: '白路线：莎莲娜岛（335.132）；黑路线：莎莲娜岛（449.334）',
  requirements: [
    v([1, 8], { type: 'route-items', route: '白之契', heldItems: ['世界之心', '白之契'] }),
    v([1, 25], { type: 'route-items', route: '黑之契', heldItems: ['世界之心', '黑之契'] }),
    v([5], { type: 'repeat-reset', route: '白之契', discardItem: '白之约束' }),
    v([6], { type: 'repeat-reset', route: '黑之契', discardItem: '黑之约束' })
  ],
  relations: {
    prerequisites: [v([2], { quest: '消亡之地', relation: 'item-prerequisite', items: ['白之契', '黑之契'] }), v([3], { quest: '深渊', relation: 'item-prerequisite', item: '世界之心' })],
    itemSources: [v([2], { items: ['白之契', '黑之契'], sourceQuest: '消亡之地' }), v([3], { item: '世界之心', sourceQuest: '深渊' })],
    references: [v([4], { type: 'story-reference', title: '黑与白的漩涡系列任务剧情对话', series: '黑与白的漩涡系列' })]
  },
  steps: [
    step('route-select', 1, '持世界之心及白之契或黑之契，分别到对应龙使者处进入白、黑路线。重解白路线须先丢弃白之约束；重解黑路线须先丢弃黑之约束。', [1, 2, 3, 4, 5, 6], [], []),
    step('white-entry', 2, '白路线：从阿巴尼斯村到莎莲娜岛（335.132），持【世界之心】和【白之契】与龙的使者对话，进入固定迷宫秩序的甬道。原文写“白契约”，按同页统一为白之契。', [7, 8, 9, 10], [input('世界之心', 8, { action: 'hold', consumed: false }), input('白之契', 8, { action: 'hold', consumed: false, sourceName: '白契约' })], [], { route: '白之契' }),
    step('white-battle', 3, '穿过秩序的甬道到纯白之间，与白龙使者（24.15）对话选“是”，进入战斗。', [11, 13, 14, 15, 16, 17, 18, 19, 20], [], [], { route: '白之契' }),
    step('white-abandon', 4, '白路线无奖励结束分支：首次选“否”后再次出现选项，此时选“是”会交出【白之契】并直接结束任务，不进入战斗也不获得白之约束或坚毅的决心。', [12], [input('白之契', 12)], [], { route: '白之契', terminatesWithoutReward: true }),
    step('white-completion', 5, '战胜白龙使者后再次对话，交出【白之契】，同一次获得后续任务道具【白之约束】与不可交易护身符【坚毅的决心】，传送回法兰城并完成任务。', [21, 22, 23], [input('白之契', 21)], [output('白之约束', 21), output('坚毅的决心', 21)], { route: '白之契' }),
    step('black-entry', 6, '黑路线：从蒂娜村到莎莲娜岛（449.334），持【世界之心】和【黑之契】与龙的使者对话，进入20层随机迷宫混沌的甬道。', [24, 25, 26], [input('世界之心', 25, { action: 'hold', consumed: false }), input('黑之契', 25, { action: 'hold', consumed: false })], [], { route: '黑之契' }),
    step('black-battle', 7, '穿过混沌的甬道到漆黑之间，与黑龙使者（24.21）对话选“是”，进入战斗。', [27, 29, 30, 31, 32, 33, 34], [], [], { route: '黑之契' }),
    step('black-abandon', 8, '黑路线无奖励结束分支：首次选“否”后再次出现选项，此时选“是”会交出【黑之契】并直接结束任务，不进入战斗也不获得黑之约束或果敢的勇气。', [28], [input('黑之契', 28)], [], { route: '黑之契', terminatesWithoutReward: true }),
    step('black-completion', 9, '战胜黑龙使者后再次对话，交出【黑之契】，同一次获得后续任务道具【黑之约束】与不可交易护身符【果敢的勇气】，传送回法兰城并完成任务。', [35, 36, 37], [input('黑之契', 35)], [output('黑之约束', 35), output('果敢的勇气', 35)], { route: '黑之契' })
  ],
  encounters: [
    v([9, 10], { id: 'order-corridor', route: '白之契', location: '秩序的甬道', maze: '固定迷宫', enemies: ['地龙蜥', '火龙蜥', '蜥蜴斗士', '蜥蜴武士'], levelsByServer: { 怀旧服: 54, 道具服: { min: 125, max: 134 } } }),
    v([26], { id: 'chaos-corridor', route: '黑之契', location: '混沌的甬道', maze: '随机迷宫', floors: 20, enemies: ['地龙蜥', '火龙蜥', '蜥蜴斗士', '蜥蜴武士'], levelsByServer: { 怀旧服: 54, 道具服: { min: 125, max: 134 } } })
  ],
  battles: {
    'white-dragon-messenger': v([11, 13, 14, 15, 16, 17, 18, 19, 20], { id: 'white-dragon-messenger', route: '白之契', strategies: [v([16], { text: '收宠W站位，先清喽啰，再合击BOSS。' }), v([17], { text: '带宠先清喽啰，战栗BOSS至不会行动，再合击BOSS。原文“合计”按语境记为合击，但保留源行证据。' })], enemies: [
      foe([14], '白龙使者', 'Lv.80白龙使者，血量约13000，邪魔系，属性：全30，抗咒；技能：攻击、防御、气功弹、战栗袭心、超强风刃魔法、超强陨石魔法、超强恢复魔法、超强石化魔法', { servers: ['怀旧服'], level: 80, hpApprox: 13000, race: '邪魔系', elements: '全30', curseResistance: true, skills: ['攻击', '防御', '气功弹', '战栗袭心', '超强风刃魔法', '超强陨石魔法', '超强恢复魔法', '超强石化魔法'] }),
      foe([15], '丘比特', 'Lv.75丘比特*3~9，血量约2000，飞行系，属性：火50风50，抗咒；技能：攻击、防御、强力火焰魔法、超强昏睡魔法、超强恢复魔法、超强补血魔法', { servers: ['怀旧服'], level: 75, count: { min: 3, max: 9 }, hpApprox: 2000, race: '飞行系', elements: { 火: 50, 风: 50 }, curseResistance: true, skills: ['攻击', '防御', '强力火焰魔法', '超强昏睡魔法', '超强恢复魔法', '超强补血魔法'] }),
      foe([19], '白龙使者', 'Lv.150白龙使者，血量约25000，邪魔系，属性：全30，抗咒；技能：攻击、防御、气功弹、战栗袭心、超强风刃魔法、超强陨石魔法、超强恢复魔法、超强石化魔法', { servers: ['道具服'], level: 150, hpApprox: 25000, race: '邪魔系', elements: '全30', curseResistance: true, skills: ['攻击', '防御', '气功弹', '战栗袭心', '超强风刃魔法', '超强陨石魔法', '超强恢复魔法', '超强石化魔法'] }),
      foe([20], '丘比特', 'Lv.145丘比特*3~9，血量约4000，飞行系，属性：火50风50，抗咒；技能：攻击、防御、强力火焰魔法、超强昏睡魔法、超强恢复魔法、超强补血魔法', { servers: ['道具服'], level: 145, count: { min: 3, max: 9 }, hpApprox: 4000, race: '飞行系', elements: { 火: 50, 风: 50 }, curseResistance: true, skills: ['攻击', '防御', '强力火焰魔法', '超强昏睡魔法', '超强恢复魔法', '超强补血魔法'] })
    ] }),
    'black-dragon-messenger': v([27, 29, 30, 31, 32, 33, 34], { id: 'black-dragon-messenger', route: '黑之契', enemies: [
      foe([30], '黑龙使者', 'Lv.80黑龙使者，血量约13000，邪魔系，属性：全30，抗咒；技能：攻击、防御、气功弹、战栗袭心、超强火焰魔法、超强冰冻魔法、超强补血魔法、超强混乱魔法', { servers: ['怀旧服'], level: 80, hpApprox: 13000, race: '邪魔系', elements: '全30', curseResistance: true, skills: ['攻击', '防御', '气功弹', '战栗袭心', '超强火焰魔法', '超强冰冻魔法', '超强补血魔法', '超强混乱魔法'] }),
      foe([31], '小恶魔', 'Lv.75小恶魔*8~9，血量约2000，飞行系，属性：地70风30，抗咒；技能：攻击、防御、、强力陨石魔法、超强中毒魔法、超强恢复魔法', { servers: ['怀旧服'], level: 75, count: { min: 8, max: 9 }, hpApprox: 2000, race: '飞行系', elements: { 地: 70, 风: 30 }, curseResistance: true, skills: ['攻击', '防御', '强力陨石魔法', '超强中毒魔法', '超强恢复魔法'], sourceHasEmptySkillToken: true }),
      foe([33], '黑龙使者', 'Lv.150黑龙使者，血量约25000，邪魔系，属性：全30，抗咒；技能：攻击、防御、气功弹、战栗袭心、超强火焰魔法、超强冰冻魔法、超强补血魔法、超强混乱魔法', { servers: ['道具服'], level: 150, hpApprox: 25000, race: '邪魔系', elements: '全30', curseResistance: true, skills: ['攻击', '防御', '气功弹', '战栗袭心', '超强火焰魔法', '超强冰冻魔法', '超强补血魔法', '超强混乱魔法'] }),
      foe([34], '小恶魔', 'Lv.145小恶魔*8~9，血量约4000，飞行系，属性：地70风30，抗咒；技能：攻击、防御、强力陨石魔法、超强中毒魔法、超强恢复魔法', { servers: ['道具服'], level: 145, count: { min: 8, max: 9 }, hpApprox: 4000, race: '飞行系', elements: { 地: 70, 风: 30 }, curseResistance: true, skills: ['攻击', '防御', '强力陨石魔法', '超强中毒魔法', '超强恢复魔法'] })
    ] })
  },
  rewardEvents: [
    rewardEvent('white-route-results', 'route-completion', [21, 22, 23], [resultItem('white-restraint', '白之约束', [21, 22], { entityType: 'key-item', futureUse: '后续任务', warning: '勿丢弃' }), resultItem('firm-determination', '坚毅的决心', [21, 23], { entityType: 'equipment', properties: { level: 6, category: '护身符', durability: 100, attack: 20, defense: 20, agility: 15, critical: 3, counter: 3, accuracy: 3, dodge: 3, hp: 85, mp: 100, tradeable: false } })], { route: '白之契', step: 'white-completion', groupedAcquisition: true }),
    rewardEvent('black-route-results', 'route-completion', [35, 36, 37], [resultItem('black-restraint', '黑之约束', [35, 36], { entityType: 'key-item', futureUse: '后续任务', warning: '勿丢弃' }), resultItem('bold-courage', '果敢的勇气', [35, 37], { entityType: 'equipment', properties: { level: 6, category: '护身符', durability: 100, attack: 30, defense: 10, agility: 15, critical: 6, accuracy: 6, hp: 100, mp: 85, tradeable: false } })], { route: '黑之契', step: 'black-completion', groupedAcquisition: true })
  ],
  versionChanges: [v([9, 13, 14, 15, 18, 19, 20, 26, 29, 30, 31, 32, 33, 34], { servers: ['怀旧服', '道具服'], note: '甬道魔物与两场BOSS的等级、血量按服务器分别保存。' })],
  lineTypes: ['route-selection', 'item-source', 'item-source', 'story-reference', 'repeat-reset', 'repeat-reset', 'route-heading', 'route-entry', 'versioned-maze', 'route-heading', 'battle-choice', 'no-reward-termination', 'server-battle-heading', 'battle-enemy', 'battle-enemy', 'strategy-note', 'strategy-note', 'server-battle-heading', 'battle-enemy', 'battle-enemy', 'grouped-completion', 'future-item-warning', 'equipment-detail', 'route-heading', 'route-entry', 'versioned-maze', 'battle-choice', 'no-reward-termination', 'server-battle-heading', 'battle-enemy', 'battle-enemy', 'server-battle-heading', 'battle-enemy', 'battle-enemy', 'grouped-completion', 'future-item-warning', 'equipment-detail']
});

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第六十四批3条任务的逐行语义核验。');
