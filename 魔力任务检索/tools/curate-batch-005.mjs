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

curate('catalog-667e6a16-5836-4348-9cde-f333f6f47ea7', '就职传教士', {
  startLocation: '法兰城大圣堂礼拜堂', requirements: [],
  relations: { prerequisites: [], itemSources: [], references: [v([9], { type: 'skill-source', skill: '超强补血魔法', sourceQuest: '挑战神兽' }), v([11], { type: 'server-skill-reference', target: '怀旧服【技能学习证】详情' })] },
  steps: [
    step('step-1', 1, '从法兰城（154.29）进入大圣堂入口，经（14.7）抵达礼拜堂。', [1]),
    step('step-2', 2, '从礼拜堂（23.0）进入大圣堂里面。', [2]),
    step('step-3', 3, '与作相性测验的托特（16.11）对话，所有选项均选择“是”，获得【僧侣适性检查合格证】。', [3], [], [output('僧侣适性检查合格证', 3)]),
    step('step-4', 4, '持有【僧侣适性检查合格证】与大僧侣拉马隆（17.9）对话，就职传教士，任务完结。', [4], [input('僧侣适性检查合格证', 4, { action: 'hold', consumed: false })])
  ],
  outcomes: { titles: [], careers: [v([4], { career: '传教士', action: 'employment' })], skills: [v([5, 6], { name: '补血魔法', careerRestriction: '传教士', accessNpc: '僧侣特雷因（14.6）', teacher: '僧侣法马斯（14.10）', cost: { amount: 100, unit: 'G' } }), v([5, 7], { name: '强力补血魔法', careerRestriction: '传教士', accessNpc: '僧侣特雷因（14.6）', teacher: '僧侣菲欧雷（19.12）', cost: { amount: 100, unit: 'G' } }), v([8, 9], { name: '超强补血魔法', minimumCareerRank: '1转传教', sourceQuest: '挑战神兽' }), v([8, 10], { name: '气绝回复', careerRestriction: null, teacher: '亚留特村神官理贾（42.72）' }), v([11], { names: '传教士4种得意技', server: '怀旧服', acquisition: '技能学习证', careerRestriction: null })] },
  lineTypes: ['step', 'step', 'step', 'step', 'skill-access', 'skill-learning', 'skill-learning', 'skill-heading', 'skill-reference', 'skill-learning', 'server-rule']
});

curate('catalog-2400f3a1-171b-49b3-89f0-c591d4db87df', '就职鉴定师', {
  startLocation: '法兰城凯蒂夫人的店（196.78）', requirements: [],
  relations: { prerequisites: [], itemSources: [], references: [v([11], { type: 'price-reference', target: '鉴定价格相关资料' })] },
  steps: [
    step('step-1', 1, '与鉴定师马尔弗（13.9）对话，获得【钙矿】。', [1], [], [output('钙矿', 1)]),
    step('step-2', 2, '前往国营第24坑道地下1楼，与矿工毕夫鲁（35.7）对话，交出【钙矿】，获得【给山男的信？】。', [2], [input('钙矿', 2)], [output('给山男的信？', 2)]),
    step('step-3', 3, '前往山男的家与山男哈葛利特（9.3）对话，交出信，获得【梦露草】。', [3], [input('给山男的信？', 3, { sourceNameInStep: '给山男的信' })], [output('梦露草', 3)]),
    step('step-4', 4, '返回国营第24坑道与矿工毕夫鲁对话，交出【梦露草】，获得【给葛利玛的信？】。', [4], [input('梦露草', 4)], [output('给葛利玛的信？', 4)]),
    step('step-5', 5, '前往葛利玛的家与矿工葛利玛（13.13）对话，交出信，获得【有关矿石成分的笔记】。', [5], [input('给葛利玛的信？', 5, { sourceNameInStep: '给葛利玛的信' })], [output('有关矿石成分的笔记', 5)]),
    step('step-6', 6, '返回凯蒂夫人的店，与鉴定师马尔弗对话，输入“钙”，交出笔记，获得【鉴定师推荐信】。', [6], [input('有关矿石成分的笔记', 6)], [output('鉴定师推荐信', 6)]),
    step('step-7', 7, '前往强哥杂货店，持有【鉴定师推荐信】与鉴定师巴姆可（12.9）对话，就职鉴定师，任务完结。', [7], [input('鉴定师推荐信', 7, { action: 'hold', consumed: false })])
  ],
  outcomes: { titles: [], careers: [v([7], { career: '鉴定师', action: 'employment' })], skills: [v([8, 9], { name: '鉴定', teacher: '凯蒂夫人的店鉴定士达人恰拉（17.14）', cost: { amount: 100, unit: 'G' }, skillSlotCost: 2 })] },
  flowNotes: [v([10, 11], { type: 'npc-service', npc: '凯蒂夫人（17.12）', service: '付费鉴定物品', priceReference: '鉴定价格相关资料' })],
  lineTypes: ['step', 'step', 'step', 'step', 'step', 'step', 'step', 'skill-heading', 'skill-learning', 'npc-service', 'reference']
});

{
  const weakChoice = re('reward-weak-cat-exit-pool', 'reward-pool', [6], ['神奇的药草', '魔族的水晶', '誓言之证', '黑钥匙', '白钥匙'].map((name, i) => ri(`weak-cat-exit-${i + 1}`, name, [6], { selection: 'random-one' })), { step: 'step-3', choice: '否', selection: 'random-one' });
  const strongChoice = re('reward-strong-cat-exit-pool', 'reward-pool', [8], ['翻腾的海洋之心', '燃烧的火焰之魂', '璀璨的精灵石臂环', '武圣的臂环', '耀阳花精华'].map((name, i) => ri(`strong-cat-exit-${i + 1}`, name, [8], { selection: 'random-one' })), { step: 'step-4', choice: '否', selection: 'random-one' });
  curate('catalog-47d07778-2380-4413-8411-8cce5f4eff12', '卡赛迪博士宠物研究计划', {
    startLocation: '法兰城废弃的仓库（192.178）卡赛迪宠物研究所', requirements: [v([3], { type: 'pet-slot-absence', pets: ['虚弱的猫妖', '强壮的猫妖', '进化的猫妖'], appliesToStep: 'step-2' }), v([4], { type: 'server-availability', server: '双子服务器', available: false })],
    steps: [
      step('step-1', 1, '从法兰城废弃的仓库（192.178）经（35.21）楼梯进入卡赛迪宠物研究所。', [1]),
      step('step-2', 2, '与研究员（26.24）对话，选择“是”并交出5000G，购买1只Lv.1虚弱的猫妖。', [2, 3, 4], [input('金币', 2, { quantity: 5000, unit: 'G' })], [output('Lv.1虚弱的猫妖', 2, { entityType: 'pet' })]),
      step('step-3', 3, '将虚弱的猫妖练到Lv.20后与研究员对话：选择“是”交出猫妖和10000G，获得Lv.20强壮的猫妖；选择“否”交出猫妖并随机获得一种材料。', [5, 6], [input('Lv.20虚弱的猫妖', 5, { entityType: 'pet' })], [], { choices: [v([5], { value: '是', additionalInput: { item: '金币', quantity: 10000, unit: 'G' }, output: 'Lv.20强壮的猫妖' }), v([6], { value: '否', rewardEvent: 'reward-weak-cat-exit-pool' })] }),
      step('step-4', 4, '将强壮的猫妖练到Lv.40后与研究员对话：选择“是”交出猫妖和15000G，获得Lv.40进化的猫妖；选择“否”交出猫妖并随机获得一种材料。', [7, 8], [input('Lv.40强壮的猫妖', 7, { entityType: 'pet' })], [], { choices: [v([7], { value: '是', additionalInput: { item: '金币', quantity: 15000, unit: 'G' }, output: 'Lv.40进化的猫妖' }), v([8], { value: '否', rewardEvent: 'reward-strong-cat-exit-pool' })] }),
      step('step-5', 5, '将进化的猫妖练到Lv.60后交给研究员，获得【魔法黑猫的精华】或【卡赛迪表彰徽章】，任务完结。', [9, 10, 11], [input('Lv.60进化的猫妖', 9, { entityType: 'pet' })], [output('魔法黑猫的精华或卡赛迪表彰徽章', 9, { acquisition: 'one-of-two' })])
    ],
    rewardEvents: [weakChoice, strongChoice, re('reward-cassidy-final', 'reward-pool', [9, 10, 11], [ri('magic-black-cat-essence', '魔法黑猫的精华', [9, 11], { properties: { use: '双击获得Lv.1魔法黑猫' } }), ri('cassidy-medal', '卡赛迪表彰徽章', [9, 10], { entityType: 'equipment', properties: { level: 9, category: '护身符', durability: 180, attack: 25, spirit: 5, recovery: 10, resistance: { 毒: 10, 昏睡: 10, 石化: 10, 酒醉: 10, 混乱: 10, 遗忘: 10 }, critical: 12, accuracy: 15, evasion: 10, magicResistance: 30, effects: [{ skill: '明镜止水', manaCostChangePercent: -50 }] } })], { step: 'step-5', selection: 'one-of-two' })],
    lineTypes: ['step', 'purchase', 'blocking-condition', 'server-rule', 'choice-step', 'choice-reward', 'choice-step', 'choice-reward', 'step', 'reward-detail', 'reward-detail']
  });
}

curate('catalog-429e0890-a308-47d8-aa7a-7d8a91b4454e', '商贸都市', {
  startLocation: '西尔维村旅馆2楼联络官（44.16）', requirements: [],
  steps: [
    step('step-1', 1, '与联络官（44.16）对话，获得【联络信】。本任务不要求新村2的冒险者徽章；已可使用新村传送石却无法接任务时，表示任务已完成。', [1, 2, 3], [], [output('联络信', 1)]),
    step('step-2', 2, '离开西尔维村，从玛塔塔平原（304.95）进入远古地下水脉。', [4]),
    step('step-3', 3, '经（41.37）楼梯抵达雷克亚克平原，再前往（108.164）抵达斯特隆海姆。', [5, 6]),
    step('step-4', 4, '前往议事厅与探险队队长（10.4）对话，交出【联络信】完成任务；若同时交出可选的【冒险者徽章】，获得【先遣队徽章】。', [7, 8, 9, 10], [input('联络信', 7), input('冒险者徽章', 7, { optional: true })], [output('先遣队徽章', 7, { conditionalOnInput: '冒险者徽章' })])
  ],
  media: [v([6], { type: 'route-map', text: '前往斯特隆海姆城行走路线。' }), v([11], { type: 'map', text: '斯特隆海姆城地图。' })],
  rewardEvents: [re('reward-expedition-medal', 'conditional-quest-reward', [7, 8, 9, 10], [ri('expedition-medal', '先遣队徽章', [7, 9, 10], { entityType: 'equipment', properties: { level: 4, category: '护身符', durability: 100, agility: 10, recovery: 10, critical: 5, accuracy: 10, life: 50, tradeable: false, dropBehavior: '丢地消失', requiredForLaterQuest: false } })], { step: 'step-4', condition: '交出冒险者徽章' })],
  lineTypes: ['step', 'clarification', 'completion-detection', 'step', 'step', 'media', 'step', 'optional-input-rule', 'reward-role', 'reward-detail', 'media']
});

{
  const battle = v([5, 6, 7], { id: 'battle-1', order: 1, kind: 'boss-battle', title: '飞翼女酋长', triggerStep: 'step-3', overview: v([5], { text: '与飞翼女酋长对话进入战斗。' }), enemies: { 'enemy-1': v([6], { id: 'enemy-1', name: '飞翼女酋长', level: { min: 55, max: 55 }, count: 1, skills: ['超强风刃魔法', '乾坤一掷'], raw: 'Lv.55飞翼女酋长；技能：超强风刃魔法、乾坤一掷' }), 'enemy-2': v([7], { id: 'enemy-2', name: '飞翼护卫', level: { min: 50, max: 50 }, count: 4, raw: 'Lv.50飞翼护卫*4' }) } });
  curate('catalog-4c03bd23-6dd3-4c1f-a283-e387b3b33975', '谁说女子不如男', {
    startLocation: '里谢里雅堡2楼谒见之间漂亮的少女（12.5）', requirements: [v([2, 3], { type: 'entry-gender', rule: '女性可对话进入；男性需与女性组队并由女性带领进入' }), v([10], { type: 'daily-limit', count: 1, period: 'day' })],
    steps: [
      step('step-1', 1, '与漂亮的少女（12.5）对话，获得【参赛证明】；领取无性别限制。', [1], [], [output('参赛证明', 1)]),
      step('step-2', 2, '前往米内葛尔岛，由女性角色与女战士（562.340）对话进入半边天；男性需由女性队友带领。', [2, 3, 4]),
      step('step-3', 3, '通过随机迷宫到达底部，与飞翼女酋长对话进入战斗。', [5, 6, 7]),
      step('step-4', 4, '战斗胜利后与无名的公主骑士对话，交出【参赛证明】，获得【比赛奖章】。', [8], [input('参赛证明', 8)], [output('比赛奖章', 8)]),
      step('step-5', 5, '返回谒见之间与漂亮的少女对话，交出【比赛奖章】，随机获得【漂亮的鞋子】或【漂亮的长靴】，任务完结。', [9, 10, 11], [input('比赛奖章', 9)], [output('漂亮的鞋子或漂亮的长靴', 9, { acquisition: 'random-one' })])
    ],
    encounters: [v([4], { id: 'encounter-half-sky', location: '半边天随机迷宫', approximateFloors: 9, enemyLevel: { min: 40, max: 41 }, enemies: ['强壮的妖狐', '柔弱的水精', '飞翔的鸟人'] })], battles: { 'battle-1': battle },
    rewardEvents: [re('reward-pretty-footwear', 'reward-pool', [9, 11], [ri('pretty-shoes', '漂亮的鞋子', [9, 11], { entityType: 'equipment', properties: { valuesFluctuate: true } }), ri('pretty-boots', '漂亮的长靴', [9, 11], { entityType: 'equipment', properties: { valuesFluctuate: true } })], { step: 'step-5', selection: 'random-one' })],
    lineTypes: ['step', 'entry-rule', 'entry-rule', 'encounter-area', 'battle-trigger', 'enemy', 'enemy', 'step', 'step', 'daily-limit', 'reward-detail']
  });
}

function curateChristmas(id, name, clockName, herbName, ticketPlaces, essenceName, elements, stats) {
  const pool = [
    ri(`${id}-clock`, clockName, [8], { properties: { use: `造型变更为${clockName.replace('打卡器', '')}并开启工作时间`, tradeable: true, stackable: true } }),
    ri(`${id}-herb`, herbName, [9], { properties: { skillExperience: 200, tradeable: false, dropBehavior: '丢地消失' } }),
    ...ticketPlaces.map((place, index) => ri(`${id}-ticket-${index + 1}`, `${place}传送券`, [10], { properties: { destination: place, tradeable: true, stackable: true } })),
    ri(`${id}-essence`, essenceName, [11], { properties: { use: `获得1只Lv.1${essenceName.replace('的精华', '')}`, petProfile: { race: '特殊系', skillSlots: 10, elements, baseStats: stats } } })
  ];
  curate(id, name, {
    startLocation: '里谢里雅堡见习裁缝师（43.83）', requirements: [v([3], { type: 'inventory-limit', item: '圣诞袜', maximum: 1 }), v([3], { type: 'inventory-absence', item: '圣诞铃铛', appliesToStep: 'step-1' })],
    steps: [
      step('step-1', 1, '与见习裁缝师（43.83）对话，交出300G，获得【圣诞袜】。', [1, 3], [input('金币', 1, { quantity: 300, unit: 'G' })], [output('圣诞袜', 1)]),
      step('step-2', 2, '调查圣诞树（41.78），选择“是”，交出【圣诞袜】，获得【圣诞铃铛】。', [2], [input('圣诞袜', 2)], [output('圣诞铃铛', 2)]),
      step('step-3', 3, '等待23小时后调查圣诞树，交出【圣诞铃铛】，获得【装满礼物的圣诞袜】。', [4], [input('圣诞铃铛', 4)], [output('装满礼物的圣诞袜', 4)], { waitAfterPreviousStep: { hours: 23 } }),
      step('step-4', 4, '双击【装满礼物的圣诞袜】，随机获得一种奖品，任务完结。', [5, 6, 7, 8, 9, 10, 11], [input('装满礼物的圣诞袜', 5, { action: 'use', consumed: true })], [output('随机奖品', 5, { acquisition: 'random-one' })])
    ],
    rewardEvents: [re(`${id}-reward-pool`, 'reward-pool', [6, 7, 8, 9, 10, 11], pool, { step: 'step-4', selection: 'random-one' })],
    lineTypes: ['purchase', 'step', 'inventory-rule', 'delayed-step', 'open-container', 'reward-heading', 'table-header', 'reward-row', 'reward-row', 'reward-row', 'reward-row']
  });
}

curateChristmas('catalog-91ded1eb-84a1-4b15-9762-8bbbae8a34cc', '圣诞节的礼物', '爱丝波波打卡器', '特级布斯特药草', ['哥拉尔镇', '阿凯鲁法村', '雷克塔尔镇', '流星山丘'], '爱丝波波的精华', { 地: 50, 风: 50 }, [35, 35, 20, 18, 12]);
curateChristmas('catalog-d9ef080b-da0f-4858-871a-ea2a040b0862', '圣诞老人的礼物', '丝诺波波打卡器', '特技布斯特药草', ['哥拉尔镇', '阿凯鲁法村', '雷克塔尔镇', '流星山丘'], '丝诺波波的精华', { 地: 50, 水: 50 }, [34, 35, 18, 19, 14]);
curateChristmas('catalog-6e57cad7-b272-444d-b286-76e3bdb6d7d5', '圣诞礼物', '雪儿波波打卡器', '特技布斯特药草', ['哥拉尔镇', '阿凯鲁法村', '雷克塔尔镇'], '雪儿波波的精华', { 水: 50, 火: 50 }, [35, 34, 19, 18, 14]);

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第五批 8 条任务的逐行语义核验。');
