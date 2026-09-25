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

curate('catalog-301d6321-7cc8-4ed1-878c-9b7f0749dc5e', '就职厨师', {
  startLocation: '里谢里雅堡1楼厨房（103.21）', requirements: [],
  relations: { prerequisites: [], itemSources: [v([4], { item: '回忆的项链', sourceQuest: '就职武器/防具修理工' })], references: [v([9], { type: 'story', target: '就职厨师任务剧情对话' })] },
  steps: [
    step('step-1', 1, '与料理长米其巴（8.6）对话，选择“是”，获得【水果蕃茄】。', [1], [], [output('水果蕃茄', 1)]),
    step('step-2', 2, '前往伊尔村巴侬的家，与伊尔村的祭司（9.6）对话，交出【水果蕃茄】，获得【匆忙写下的信】。', [2], [input('水果蕃茄', 2)], [output('匆忙写下的信', 2)]),
    step('step-3', 3, '前往法兰城竞技场与新嫁娘艾莉佳（51.13）对话，交出【匆忙写下的信】，获得【流行的项链】。', [3, 4], [input('匆忙写下的信', 3)], [output('流行的项链', 3)], { notes: [v([4], { text: '回忆的项链可替代流行的项链。' })] }),
    step('step-4', 4, '前往科特利亚酒吧与服务生春美（17.12）对话，交出【流行的项链】或【回忆的项链】，获得【自豪的食谱】。', [5], [input('流行的项链', 5, { alternativeGroup: 'necklace' }), input('回忆的项链', 5, { alternativeGroup: 'necklace' })], [output('自豪的食谱', 5)]),
    step('step-5', 5, '与酒吧的主人（22.13）对话，交出【自豪的食谱】，获得【厨师推荐信】。', [6], [input('自豪的食谱', 6)], [output('厨师推荐信', 6)]),
    step('step-6', 6, '前往伊尔村旧金山酒吧，持有【厨师推荐信】与厨师印普德（15.4）对话，就职厨师，任务完结。', [7], [input('厨师推荐信', 7, { action: 'hold', consumed: false })])
  ],
  outcomes: { titles: [], careers: [v([7], { career: '厨师', action: 'employment' })], skills: [v([8], { name: '料理', learningLocation: '里谢里雅堡1楼厨房（104.21）见习厨师特歇（12.6）', cost: { amount: 100, unit: 'G' }, optional: true })] },
  lineTypes: ['step', 'step', 'step', 'alternative-item-source', 'step', 'step', 'step', 'skill-learning', 'reference']
});

curate('catalog-f88ac321-ff2b-496f-88cb-7c8372cc5f68', '就职药剂师', {
  startLocation: '圣拉鲁卡村医院（37.50）', requirements: [],
  relations: { prerequisites: [], itemSources: [v([5], { item: '水果蕃茄', sourceQuest: '就职厨师' })], references: [v([9], { type: 'story', target: '就职药剂师（寻找莫洛草）任务剧情对话' })] },
  steps: [
    step('step-1', 1, '与罗山人（9.5）对话，选择“是”，获得【给山男的信】。', [1], [], [output('给山男的信', 1)]),
    step('step-2', 2, '前往山男的家，与山男哈葛利特（9.3）对话，交出【给山男的信】，获得【梦露草】。', [2], [input('给山男的信', 2)], [output('梦露草', 2)]),
    step('step-3', 3, '前往法兰城贝蒂的家，与农夫贝蒂（16.18）对话，交出【梦露草】，获得【高级蕃茄】。', [3], [input('梦露草', 3)], [output('高级蕃茄', 3)]),
    step('step-4', 4, '返回山男的家，交出【高级蕃茄】或【水果蕃茄】，获得【莫洛草】。使用水果蕃茄时可省略第1至第3步。', [4, 5], [input('高级蕃茄', 4, { alternativeGroup: 'tomato' }), input('水果蕃茄', 5, { alternativeGroup: 'tomato' })], [output('莫洛草', 4)]),
    step('step-5', 5, '前往圣拉鲁卡村医院，与看护实习生德拉格（8.4）对话，交出【莫洛草】，获得【药剂师推荐信】。', [6], [input('莫洛草', 6)], [output('药剂师推荐信', 6)]),
    step('step-6', 6, '前往医院2楼，持有【药剂师推荐信】与药剂师柯尼（12.5）对话，就职药剂师，任务完结。', [7], [input('药剂师推荐信', 7, { action: 'hold', consumed: false })])
  ],
  outcomes: { titles: [], careers: [v([7], { career: '药剂师', action: 'employment' })], skills: [v([8], { name: '制药', learningLocation: '法兰城城西医院见习药剂师吉可（12.5）', cost: { amount: 100, unit: 'G' }, optional: true })] },
  lineTypes: ['step', 'step', 'step', 'step', 'alternative-route', 'step', 'step', 'skill-learning', 'reference']
});

{
  const prizes = [
    ri('christmas-prize-booster-herb', '特级布斯特药草', [7]), ri('christmas-prize-meteor-ticket', '流星山丘传送券', [7]), ri('christmas-prize-lectar-ticket', '雷克塔尔镇传送券', [7]), ri('christmas-prize-akerufa-ticket', '阿凯鲁法村传送券', [7]),
    ri('christmas-prize-goral-ticket', '哥拉尔镇传送券', [8]), ri('christmas-prize-ice-clock', '爱丝波波打卡器', [8]), ri('christmas-prize-snow-clock', '丝诺波波打卡器', [8]), ri('christmas-prize-white-clock', '雪儿波波打卡器', [8]),
    ri('christmas-prize-ice-essence', '爱丝波波的精华', [9]), ri('christmas-prize-snow-essence', '丝诺波波的精华', [9]), ri('christmas-prize-white-essence', '雪儿波波的精华', [9]), ri('christmas-prize-christmas-essence', '圣诞波波的精华', [9])
  ];
  curate('catalog-1a596ee7-0e79-4aed-81b1-a9db93f7eb11', '圣诞袜子', {
    startLocation: '里谢里雅堡见习裁缝师（44.84）', requirements: [v([2], { type: 'inventory-absence', items: ['圣诞袜', '圣诞铃铛'], appliesToStep: 'step-1' })],
    steps: [
      step('step-1', 1, '与见习裁缝师（44.84）对话，选择“是”，获得【圣诞袜】。持有圣诞袜或圣诞铃铛时不能再次领取。', [1, 2], [], [output('圣诞袜', 1)]),
      step('step-2', 2, '调查法兰城（41.77）圣诞树，选择“是”，交出【圣诞袜】，获得【圣诞铃铛】。', [3], [input('圣诞袜', 3)], [output('圣诞铃铛', 3)]),
      step('step-3', 3, '等待23小时后再次调查圣诞树，交出【圣诞铃铛】，获得【装满礼物的圣诞袜】。', [4], [input('圣诞铃铛', 4)], [output('装满礼物的圣诞袜', 4)], { waitAfterPreviousStep: { hours: 23 } }),
      step('step-4', 4, '双击【装满礼物的圣诞袜】，随机获得一种奖品，任务完结。', [5, 6, 7, 8, 9], [input('装满礼物的圣诞袜', 5, { action: 'use', consumed: true })], [output('随机奖品', 5, { acquisition: 'random-one' })])
    ],
    rewardEvents: [re('reward-christmas-stocking-pool', 'reward-pool', [5, 6, 7, 8, 9], prizes, { step: 'step-4', selection: 'random-one' })],
    lineTypes: ['step', 'blocking-condition', 'step', 'delayed-step', 'step', 'reward-heading', 'reward-list', 'reward-list', 'reward-list']
  });
}

curate('catalog-56571dad-fbbb-4c50-b254-82738e5e185d', '剑术大师的试炼！奥义·连击习得', {
  startLocation: '法兰城镜中之影（160.173）',
  requirements: [v([1, 3, 4], { type: 'career-and-level', career: '剑士（含见习剑士）', minimumLevel: 70 }), v([5], { type: 'line-availability', unavailableLine: 10, condition: 'PK大赛期间' })],
  relations: { prerequisites: [], itemSources: [], references: [v([2], { type: 'title-source', title: '被迷惑的人', sourceQuest: '愚人之镜中世界', availability: '不再开放' }), v([10], { type: 'skill-reference', target: '奥义·连击' })] },
  steps: [
    step('step-1', 1, '等级不低于Lv.70的剑士与镜中之影对话，按是否拥有“被迷惑的人”称号支付魔币，传送至镜中世界。', [1, 2, 3, 4, 5], [input('魔币', 1, { quantity: null, amountByCondition: [{ condition: '拥有称号“被迷惑的人”', amount: 9900 }, { condition: '否则', amount: 99900 }], unit: 'G' })]),
    step('step-2', 2, '通过固定迷宫抵达镜中世界，与复古连击剑术大师（8.13）对话，交出100G学习【奥义·连击】，任务完结。', [6, 7, 8, 9, 10], [input('金币', 9, { quantity: 100, unit: 'G' })])
  ],
  encounters: [v([6], { id: 'encounter-mirror-world', location: '镜中世界固定迷宫', enemies: ['血腥之刃', '杀龙之刃', '火焰之刃', '烈风之刃'], level: 98, count: { min: 4, max: 5 }, actions: 1, skills: ['连击'], modifiers: ['必杀修正'] })],
  media: [v([8], { type: 'route-map', text: '来源原文在此处标注镜中世界行走路线地图。' })],
  outcomes: { titles: [], careers: [], skills: [v([9, 10], { name: '奥义·连击', learningCost: { amount: 100, unit: 'G' }, careerRestriction: '剑士', unusableAfterCareerChange: true })] },
  flowNotes: [v([7], { text: '镜中世界地图内可以接收宠物邮件。' })],
  lineTypes: ['step', 'fee-rule', 'requirement-note', 'requirement', 'availability-note', 'encounter-area', 'map-rule', 'media', 'step', 'skill-detail']
});

{
  const battle = v([5, 6], { id: 'battle-optional-oznak', order: 1, kind: 'optional-boss-battle', title: '杀熊者欧兹那克', triggerStep: 'step-4', rewards: [], overview: v([5], { text: '选择“是”进入战斗；胜利无奖品，失败也可继续任务。' }), enemies: { 'enemy-1': v([6], { id: 'enemy-1', name: '杀熊者欧兹那克', level: { min: 120, max: 120 }, hp: { min: 90000, max: 90000, approximate: true }, count: 1, raw: 'Lv.120杀熊者欧兹那克，血量约90000' }), 'enemy-2': v([6], { id: 'enemy-2', name: '穴熊', level: { min: 100, max: 100 }, hp: { min: 13000, max: 13000, approximate: true }, count: 9, raw: 'Lv.100穴熊*9，血量约13000' }) } });
  curate('catalog-6fe9fca4-5a78-483c-883f-cc54ad4d7dd8', '久违的重逢', {
    startLocation: '法兰城西医院见习护士米内鲁帕', requirements: [],
    steps: [
      step('step-1', 1, '与法兰城西医院见习护士米内鲁帕对话，选择“是”，传送至哈巴鲁东边洞穴地下2楼。', [1]),
      step('step-2', 2, '与欧兹那克（17.17）对话；此步可以省略。', [2]),
      step('step-3', 3, '击倒洞穴中遭遇的史莱姆，随机取得【绿色果冻】；收集9个后交给欧兹那克，获得【欧兹那克的战斧】。', [3], [input('绿色果冻', 3, { quantity: 9 })], [output('绿色果冻', 3, { acquisition: 'random-drop', quantity: 9, allowsSameNameExchange: true }), output('欧兹那克的战斧', 3)]),
      step('step-4', 4, '再与欧兹那克对话：选择“否”返回法兰城并由米内鲁帕传送至索奇亚海底洞窟地下2楼；选择“是”则进入可选战斗。', [4, 5, 6], [], [], { choices: [{ value: '否', result: '继续主流程并传送' }, { value: '是', result: '进入可选战斗' }] }),
      step('step-5', 5, '与欧兹尼克（27.21）对话，获得【欧兹尼克的新戒指】。', [7], [], [output('欧兹尼克的新戒指', 7)]),
      step('step-6', 6, '返回法兰城西医院，交出【欧兹那克的战斧】和【欧兹尼克的新戒指】，获得【致母亲的信】。', [8], [input('欧兹那克的战斧', 8), input('欧兹尼克的新戒指', 8)], [output('致母亲的信', 8)]),
      step('step-7', 7, '前往奇利村民家与米内鲁帕的母亲（12.6）对话，交出【致母亲的信】，获得【慈母的围巾】和称号“久违的重逢”，任务完结。', [9, 10], [input('致母亲的信', 9)], [output('慈母的围巾', 9)])
    ],
    battles: { 'battle-optional-oznak': battle },
    rewardEvents: [re('reward-mothers-scarf', 'quest-completion', [9, 10], [ri('mothers-scarf', '慈母的围巾', [9, 10], { entityType: 'equipment', properties: { level: 3, category: '头带', life: 155, durability: 200, valuesFluctuate: true, tradeable: false, dropBehavior: '丢地消失' } })], { step: 'step-7' })],
    outcomes: { titles: [v([9], { name: '久违的重逢', acquisition: 'quest-completion' })], careers: [], skills: [] },
    lineTypes: ['step', 'optional-step', 'collection-and-exchange', 'choice-step', 'optional-battle-note', 'enemy-summary', 'step', 'step', 'step', 'reward-detail']
  });
}

curate('catalog-81bfbcc2-e4f6-45ba-94ac-11f4ec5a45e0', '就职猎人', {
  startLocation: '伊尔村猎人亚烈格尔（48.76）', requirements: [],
  steps: [
    step('step-1', 1, '与猎人亚烈格尔（48.76）对话，免费习得【狩猎体验】；该技能占3个技能栏。', [1, 2]),
    step('step-2', 2, '在芙蕾雅岛指定区域使用【狩猎体验】，随机取得【传说的鹿皮】。', [3, 4, 5], [], [output('传说的鹿皮', 3, { acquisition: 'random-gathering', properties: { tradeable: false, logoutBehavior: '消失' } })], { notes: [v([5], { text: '来源称芙蕾雅岛（654.247）取得几率较高。' })] }),
    step('step-3', 3, '不要登出，步行返回伊尔村，与败家子葛达尔夫（49.77）对话，交出1张【传说的鹿皮】，获得【猎人推荐信】。', [6], [input('传说的鹿皮', 6)], [output('猎人推荐信', 6)]),
    step('step-4', 4, '前往伊尔村装备店与猎人强提（13.16）对话，就职猎人，任务完结。', [7])
  ],
  outcomes: { titles: [], careers: [v([7], { career: '猎人', action: 'employment' })], skills: [v([1, 2], { name: '狩猎体验', cost: { amount: 0, unit: 'G' }, skillSlotCost: 3, role: 'quest-skill' }), v([8, 9, 10], { name: '狩猎', learningLocation: '法兰城东门外猎人拉修（472~500.198~220）', cost: { amount: 100, unit: 'G' }, note: '找不到NPC时可换线寻找' })] },
  lineTypes: ['step', 'skill-detail', 'collection-event', 'item-detail', 'probability-note', 'step', 'step', 'skill-heading', 'skill-learning', 'skill-note']
});

curate('catalog-3368793f-3777-4950-baf2-e555e682b203', '前往东岛', {
  startLocation: '尼维尔海村战备物资运输站（29.70）',
  requirements: [v([2], { type: 'career-rank', career: '士兵', minimumRank: '王宫' }), v([4], { type: 'inventory-absence', item: '希望水晶', appliesToStep: 'step-2' }), v([5], { type: 'time-window', value: '白天', appliesToStep: 'step-3' })],
  steps: [
    step('step-1', 1, '与士兵梅莒派对话；此步可以跳过。', [1]),
    step('step-2', 2, '王宫或以上阶段士兵前往克瑞村酒吧，与军官史卜力（16.4）对话，获得【军官手谕】。持有希望水晶时无法获得。', [2, 3, 4], [], [output('军官手谕', 2, { properties: { droppable: false, tradeable: false, bankable: false, petMailable: false, logoutBehavior: '消失' } })]),
    step('step-3', 3, '白天返回尼维尔海村，持有【军官手谕】与押船官梵吉尔（37.75）对话，全队传送上船。手谕不会消耗，可反复使用直至登出。', [5, 7], [input('军官手谕', 5, { action: 'hold', consumed: false })]),
    step('step-4', 4, '与船上的押船官梵吉尔（19.15）对话下船，抵达雷欧娜村，任务完结。', [6])
  ],
  flowNotes: [v([8], { type: 'teleporter-condition', text: '雷欧娜村传送石要求战斗系50级，或生产系3转25级。' }), v([9], { type: 'location', text: '亚诺曼城传送交通管理中心位于尤金尼亚堡内（73.54）。' })],
  media: [v([10], { type: 'map', text: '亚诺曼城传送交通管理中心示意图。' })],
  lineTypes: ['optional-step', 'step', 'item-detail', 'blocking-condition', 'step', 'step', 'item-use', 'teleporter-condition', 'location-note', 'media']
});

{
  const battle = v([2, 3, 6], { id: 'battle-sequence-1', order: 1, kind: 'consecutive-battles', title: '毕安札五连战', triggerStep: 'step-2', sequenceCount: 5, overview: v([2, 3, 6], { text: '输入准确口令“罗珊娜很想你”进入五连战。' }), enemies: { 'enemy-1': v([6], { id: 'enemy-1', name: '幽灵', level: { min: 15, max: 18 }, count: { min: 1, max: 6 }, raw: '五连战；魔物为Lv.15~18幽灵、漂浮炸弹*1~6' }), 'enemy-2': v([6], { id: 'enemy-2', name: '漂浮炸弹', level: { min: 15, max: 18 }, count: { min: 1, max: 6 }, raw: '五连战；魔物为Lv.15~18幽灵、漂浮炸弹*1~6' }) } });
  curate('catalog-16efe9c5-4436-48ac-a3eb-292d496af1e3', '毕安札的使命', {
    startLocation: '法兰城毕安札的家（132.132）', requirements: [v([9], { type: 'completed-quest', quest: '毕安札的送礼' })],
    relations: { prerequisites: [v([9], { quest: '毕安札的送礼', relation: 'required-for-final-dialogue-and-reward' })], itemSources: [], references: [v([4], { type: 'route', targetQuest: '毕安扎的送礼' }), v([11], { type: 'test-reference', target: '【怀旧服】狂战腕轮、星光鞋、无尽思念，幸运值测试' })] },
    steps: [
      step('step-1', 1, '前往毕安札的家与罗珊娜（12.7）对话；此步可以跳过。', [1]),
      step('step-2', 2, '进入城内地下随机迷宫，找到随机出现的毕安札并输入“罗珊娜很想你”，进入五连战。', [2, 3, 4, 5, 6]),
      step('step-3', 3, '战斗胜利后传送至毕安札的家，与毕安札（11.7）对话，获得【无尽思念】和称号“阿比安吉”，任务完结。', [7, 8, 9, 10, 11], [], [output('无尽思念', 7)], { notes: [v([8], { type: 'failure-condition', text: '离开毕安札的家会传送回法兰城，任务中断并需重做。' })] })
    ],
    encounters: [v([5], { id: 'encounter-city-underground', location: '城内的地下迷宫', randomMaze: true, approximateFloors: 11, enemies: ['幽灵', '漂浮炸弹'], level: { min: 9, max: 16 } })],
    battles: { 'battle-sequence-1': battle },
    rewardEvents: [re('reward-endless-longing', 'quest-completion', [7, 10, 11], [ri('endless-longing', '无尽思念', [7, 10, 11], { entityType: 'equipment', properties: { level: 3, category: '项链', durability: 350, attack: 10, defense: 8, agility: 5, resistance: { 遗忘: 20 }, critical: 5, accuracy: 5, magicAttack: 8, luck: 1, luckEvidence: '来源引用的实测资料', tradeable: true, bankable: true, droppable: true } })], { step: 'step-3' })],
    outcomes: { titles: [v([7], { name: '阿比安吉', acquisition: 'quest-completion' })], careers: [], skills: [] },
    lineTypes: ['optional-step', 'battle-trigger', 'password-note', 'reference', 'encounter-area', 'battle-overview', 'step', 'failure-condition', 'prerequisite', 'reward-detail', 'test-evidence']
  });
}

{
  const pool = [
    ri('autumn-lottery-original-sin', '原罪之魔精华', [6]), ri('autumn-lottery-fortune-cat', '招财猫精华', [6]), ri('autumn-lottery-scarf-rabbit', '围巾兔精华', [7]), ri('autumn-lottery-christmas-elf', '圣诞精灵精华', [7]),
    ri('autumn-lottery-gem8', 'Lv.8各色宝石', [9]), ...['哥拉尔镇', '阿凯鲁法村', '雷克塔尔镇', '流星山丘'].map((place, i) => ri(`autumn-lottery-ticket-${i + 1}`, `${place}传送券`, [9])),
    ri('autumn-lottery-mouse-egg', '鼠王惊奇蛋', [10]), ri('autumn-lottery-coin', '阿尔卡迪亚古钱', [10]), ri('autumn-lottery-super-herb', '超神药草', [11], { properties: { skillExperience: 500 } }), ri('autumn-lottery-skill-certificate', '技能学习证', [11], { serverAvailability: { 双子服: false } })
  ];
  curate('catalog-34557a81-855f-4b21-9ff1-a3928883a947', '金秋大乐透', {
    startLocation: '亚诺曼城金秋礼盒贩售员（137.137）', requirements: [],
    steps: [step('step-1', 1, '与金秋礼盒贩售员（137.137）对话，交出800G购买【金秋大乐透礼包】。', [1, 3], [input('金币', 1, { quantity: 800, unit: 'G' })], [output('金秋大乐透礼包', 1)], { notes: [v([3], { type: 'safety-warning', text: '在2、3线购买时注意与NPC重叠的骗子摊位。' })] }), step('step-2', 2, '双击【金秋大乐透礼包】，随机获得一种奖品，活动完结。', [2, 4, 5, 6, 7, 8, 9, 10, 11], [input('金秋大乐透礼包', 2, { action: 'use', consumed: true })], [output('随机奖品', 2, { acquisition: 'random-one' })])],
    rewardEvents: [re('reward-autumn-lottery-pool', 'reward-pool', [4, 5, 6, 7, 8, 9, 10, 11], pool, { step: 'step-2', selection: 'random-one' })],
    lineTypes: ['purchase', 'open-container', 'safety-warning', 'reward-heading', 'reward-category', 'reward-list', 'reward-list', 'reward-category', 'reward-list', 'reward-list', 'reward-list']
  });
}

{
  const pool = [
    ri('autumn-box-otchi-heart', '欧特奇美拉之心', [6], { entityType: 'pet-modification-item', properties: { result: '改造欧特奇美拉', petProfile: { race: '飞行系', elements: { 火: 2, 风: 8 }, skillSlots: 10, baseStats: [37, 45, 15, 18, 10] } } }),
    ri('autumn-box-mutant-otchi', '变种欧特奇美拉', [7], { entityType: 'pet', properties: { race: '飞行系', elements: { 火: 3, 风: 7 }, skillSlots: 10, baseStats: [30, 10, 15, 28, 42] } }),
    ri('autumn-box-gem8', 'Lv.8各色宝石', [9]), ri('autumn-box-gem9', 'Lv.9各色宝石', [9]), ri('autumn-box-mouse-egg', '鼠王惊奇蛋', [10]), ri('autumn-box-repair-ticket', '完全修理券', [10]), ri('autumn-box-magic-herb', '神奇的药草', [11], { properties: { skillExperience: 200 } }), ri('autumn-box-skill-certificate', '技能学习证', [11])
  ];
  curate('catalog-ac27c8ae-5a2c-4c7c-9803-39484b045b60', '金秋礼盒', {
    startLocation: '亚诺曼城金秋礼盒贩售员（131.131）', requirements: [],
    steps: [step('step-1', 1, '与金秋礼盒贩售员（131.131）对话，交出800G购买【金秋礼盒】。', [1, 3], [input('金币', 1, { quantity: 800, unit: 'G' })], [output('金秋礼盒', 1)], { notes: [v([3], { type: 'safety-warning', text: '在2、3线购买时注意与NPC重叠的骗子摊位。' })] }), step('step-2', 2, '双击【金秋礼盒】，随机获得一种奖品，活动完结。', [2, 4, 5, 6, 7, 8, 9, 10, 11], [input('金秋礼盒', 2, { action: 'use', consumed: true })], [output('随机奖品', 2, { acquisition: 'random-one' })])],
    rewardEvents: [re('reward-autumn-box-pool', 'reward-pool', [4, 5, 6, 7, 8, 9, 10, 11], pool, { step: 'step-2', selection: 'random-one' })],
    lineTypes: ['purchase', 'open-container', 'safety-warning', 'reward-heading', 'reward-category', 'reward-list', 'reward-list', 'reward-category', 'reward-list', 'reward-list', 'reward-list']
  });
}

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第四批 10 条任务的逐行语义核验。');
