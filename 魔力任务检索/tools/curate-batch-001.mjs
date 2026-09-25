import fs from 'node:fs';

const dataPath = new URL('../data-src/quests.json', import.meta.url);
const database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const checkQuest = (id, name) => {
  const quest = database.quests[id];
  if (!quest || quest.name !== name) throw new Error(`任务不匹配：${id} / ${name}`);
  return quest;
};

const evidence = (sourceLines, value = {}) => ({
  ...value,
  sourceLines,
  verification: { status: 'verified', method: 'manual-semantic-review' }
});

const input = (item, line, extra = {}) => evidence([line], {
  item,
  quantity: 1,
  action: 'hand-over',
  ...extra
});

const output = (item, line, extra = {}) => evidence([line], {
  item,
  quantity: 1,
  acquisition: 'guaranteed',
  ...extra
});

const step = (id, order, text, sourceLines, inputs = [], outputs = [], extra = {}) => evidence(sourceLines, {
  id,
  order,
  text,
  inputs,
  outputs,
  notes: [],
  ...extra
});

const rewardItem = (id, name, sourceLines, extra = {}) => evidence(sourceLines, {
  id,
  name,
  role: 'valuable-result',
  ...extra
});

const rewardEvent = (id, kind, sourceLines, items, extra = {}) => evidence(sourceLines, {
  id,
  version: 'common',
  tier: 'common',
  kind,
  items,
  ...extra
});

const emptyVersion = battles => ({
  common: {
    key: 'common',
    label: '通用',
    changes: [],
    tiers: {
      common: {
        key: 'common',
        label: '通用',
        order: 0,
        battles,
        notes: [],
        media: []
      }
    }
  }
});

const finalizeQuest = (quest, config) => {
  const lineCount = quest.source.lineCount;
  if (config.lineTypes.length !== lineCount) throw new Error(`${quest.name} 的逐行类型数量不一致`);

  quest.schemaVersion = 2;
  quest.verification = {
    status: 'verified',
    method: 'manual-semantic-review',
    reviewedSourceRanges: [[1, lineCount]],
    note: '全部原文行已逐条核验。'
  };
  quest.requirements = { conditions: config.requirements || [] };
  quest.relations = config.relations || { prerequisites: [], itemSources: [], references: [] };
  quest.flow = {
    start: evidence(config.steps[0].sourceLines, {
      stepId: config.steps[0].id,
      location: config.startLocation
    }),
    steps: config.steps,
    notes: config.flowNotes || []
  };
  quest.versions = emptyVersion(config.battles || {});
  quest.rewardEvents = config.rewardEvents || [];
  quest.outcomes = config.outcomes || { titles: [], careers: [] };
  quest.segments = quest.source.rawLines.map((rawLine, index) => evidence([rawLine.line], {
    line: rawLine.line,
    text: rawLine.text,
    type: config.lineTypes[index]
  }));
  quest.itemEvents = {
    inputs: config.steps.flatMap(currentStep => currentStep.inputs.map(event => ({
      ...event,
      step: currentStep.id,
      version: 'common',
      tier: 'common'
    }))),
    acquisitions: config.steps.flatMap(currentStep => currentStep.outputs.map(event => ({
      ...event,
      step: currentStep.id,
      version: 'common',
      tier: 'common'
    })))
  };
  delete quest.legacy;
};

{
  const quest = checkQuest('catalog-72fd79b1-bd2a-447e-a06c-a0e17c42cb24', '隔世主人');
  finalizeQuest(quest, {
    startLocation: '任意地点（双击阿努比斯量产型；此步可省略）',
    requirements: [
      evidence([3], { type: 'held-item', item: '阿努比斯量产型', quantity: 1 }),
      evidence([3], { type: 'held-item', item: '奥利哈钢条', quantity: 1 })
    ],
    relations: {
      prerequisites: [],
      itemSources: [evidence([2], { item: '阿努比斯量产型', sourceQuest: '出来度假的狂战将军——深海区' })],
      references: []
    },
    steps: [
      step('step-1', 1, '双击【阿努比斯量产型】获悉情报；此步可以省略。', [1], [input('阿努比斯量产型', 1, { action: 'use', consumed: false })]),
      step('step-2', 2, '前往加纳村考古学者之家（60.50），与考古学家吉村（10.4）对话并选择“是”。', [3], [
        input('阿努比斯量产型', 3),
        input('奥利哈钢条', 3)
      ], [output('Lv.1阿努比斯量产型', 3)])
    ],
    rewardEvents: [
      rewardEvent('reward-pet-anubis-mass-production', 'quest-completion', [3, 4], [
        rewardItem('pet-anubis-mass-production', 'Lv.1阿努比斯量产型', [3, 4], {
          entityType: 'pet',
          properties: { race: '金属系', skillSlots: 8, elements: { 风: 20, 地: 80 }, baseStats: [40, 36, 27, 13, 10] }
        })
      ], { step: 'step-2' })
    ],
    outcomes: { titles: [evidence([3], { name: '隔世主人', acquisition: 'quest-completion' })], careers: [] },
    lineTypes: ['optional-step', 'item-source', 'step', 'reward-detail']
  });
}

{
  const quest = checkQuest('catalog-381647ad-348f-420a-992d-10407e1b3078', '真中的请求');
  const cards = ['迷你蝙蝠的卡片', '史莱姆的卡片', '哥布林的卡片', '火蜘蛛的卡片'];
  finalizeQuest(quest, {
    startLocation: '法兰城研究家真中的家（192.171）',
    requirements: [],
    steps: [
      step('step-1', 1, '前往法兰城研究家真中的家（192.171），与魔族研究家真中（14.14）对话；此步可以跳过。', [1]),
      step('step-2', 2, '收集四种指定怪物卡片。', [2], [], cards.map(name => output(name, 2, { acquisition: 'collect-source-unspecified' }))),
      step('step-3', 3, '与魔族研究家真中对话，交出四种卡片，获得2张【卡片？】，任务完结。', [3], cards.map(name => input(name, 3)), [output('卡片？', 3, { quantity: 2 })])
    ],
    rewardEvents: [
      rewardEvent('reward-random-seal-cards', 'quest-completion', [3, 4], [
        rewardItem('random-seal-card', '卡片？', [3, 4], {
          quantity: 2,
          properties: { afterAppraisal: '随机种族的封印卡' }
        })
      ], { step: 'step-3' })
    ],
    lineTypes: ['optional-step', 'step', 'step', 'reward-detail']
  });
}

{
  const quest = checkQuest('catalog-cf145d14-888d-4016-97f3-4d7d85338bb8', '吹横笛的名师');
  finalizeQuest(quest, {
    startLocation: '夜晚的魔法大学内部音乐室（76.30）',
    requirements: [evidence([1], { type: 'time-window', value: '夜晚', appliesToStep: 'step-1' }), evidence([3], { type: 'time-window', value: '清晨、白天或黄昏', appliesToStep: 'step-3' })],
    relations: { prerequisites: [], itemSources: [], references: [evidence([5], { type: 'story', target: '吹横笛的名师任务剧情对话' })] },
    steps: [
      step('step-1', 1, '夜晚前往魔法大学内部音乐室（76.30），与幽灵（24.10）对话切换地图。', [1]),
      step('step-2', 2, '与米德瓦（24.10）对话，获得【调音器】。', [2], [], [output('调音器', 2)]),
      step('step-3', 3, '在清晨、白天或黄昏返回音乐室，与夏贝特老师（24.10）对话，交出【调音器】，获得【夏贝特之笛】，任务完结。', [3], [input('调音器', 3)], [output('夏贝特之笛', 3)])
    ],
    rewardEvents: [
      rewardEvent('reward-shabet-flute', 'quest-completion', [3, 4], [
        rewardItem('shabet-flute', '夏贝特之笛', [3, 4], { entityType: 'equipment', properties: { level: 1, category: '乐器', defense: 2, durability: 200, tradeable: true, equippedTitle: '吹横笛的名师' } })
      ], { step: 'step-3' })
    ],
    outcomes: { titles: [evidence([4], { name: '吹横笛的名师', acquisition: 'equip-item', item: '夏贝特之笛' })], careers: [] },
    lineTypes: ['step', 'step', 'step', 'reward-detail', 'reference']
  });
}

{
  const quest = checkQuest('catalog-f8bb9a27-dd62-488e-94ca-5ce5b09462d7', '来自异界的袭击');
  const battle = evidence([2, 3], {
    id: 'battle-sequence-1',
    order: 1,
    kind: 'consecutive-battles',
    title: '十连战',
    triggerStep: 'step-2',
    sequenceCount: 10,
    replenishment: 'source-unspecified',
    overview: evidence([3], { text: '共十场连续战斗；每场魔物皆为Lv.1肉鸡。' }),
    enemies: {
      'enemy-1': evidence([3], { id: 'enemy-1', name: '肉鸡', level: { min: 1, max: 1 }, count: null, raw: '战斗为十连战；每战魔物皆为Lv.1肉鸡' })
    }
  });
  finalizeQuest(quest, {
    startLocation: '法兰城GM的全息影像（86.81）',
    requirements: [],
    steps: [
      step('step-1', 1, '前往法兰城与GM的全息影像（86.81）对话，选择“是”传送至异界？。', [1]),
      step('step-2', 2, '与迪迪欧艾斯（21.16）对话，进入十连战。', [2, 3]),
      step('step-3', 3, '战斗胜利后与受伤的管理员（19.17）对话，获得【时间水晶Lv.4】和称号“心胸广阔的人”，任务完结。', [4], [], [output('时间水晶Lv.4', 4)])
    ],
    battles: { 'battle-sequence-1': battle },
    rewardEvents: [
      rewardEvent('reward-time-crystal-lv4', 'quest-completion', [4, 5], [
        rewardItem('time-crystal-lv4', '时间水晶Lv.4', [4, 5], { properties: { tradeable: false } })
      ], { step: 'step-3' })
    ],
    outcomes: { titles: [evidence([4], { name: '心胸广阔的人', acquisition: 'quest-completion' })], careers: [] },
    lineTypes: ['step', 'battle-trigger', 'battle-overview', 'step', 'reward-detail']
  });
}

{
  const quest = checkQuest('catalog-29bb47fe-7390-4213-9e61-05af44cc4f65', '情比金坚');
  finalizeQuest(quest, {
    startLocation: '法兰城大圣堂旁会场引导员（161.29）',
    requirements: [evidence([2], { type: 'held-item-age', item: '结婚戒指', minimumAgeDays: 7 })],
    relations: { prerequisites: [], itemSources: [evidence([3], { item: '结婚戒指', sourceQuest: '凤凰的羽毛' })], references: [] },
    steps: [
      step('step-1', 1, '与法兰城大圣堂旁会场引导员（161.29）对话，选择“是”进入庆典会场。', [1]),
      step('step-2', 2, '持有7日以上的【结婚戒指】与牧师（44.44）对话，交出戒指并获得【情比金坚戒】，任务完结。', [2], [input('结婚戒指', 2, { minimumAgeDays: 7 })], [output('情比金坚戒', 2)])
    ],
    rewardEvents: [
      rewardEvent('reward-love-ring', 'quest-completion', [2, 4, 5], [
        rewardItem('love-ring', '情比金坚戒', [2, 4, 5], { entityType: 'equipment', properties: { level: 1, category: '戒指', durability: 100, resistance: { 石化: 5 }, critical: 5, accuracy: 5, tradeable: true, equippedTitle: '被幸福包围的人' } })
      ], { step: 'step-2' })
    ],
    outcomes: { titles: [evidence([5], { name: '被幸福包围的人', acquisition: 'equip-item', item: '情比金坚戒' })], careers: [] },
    lineTypes: ['step', 'step', 'item-source', 'reward-detail', 'reward-detail']
  });
}

{
  const quest = checkQuest('catalog-42c08c53-4021-46a5-a613-6b21c21a3126', '香草店内的友情');
  finalizeQuest(quest, {
    startLocation: '法兰城里玲香料店（216.158）',
    requirements: [],
    relations: { prerequisites: [], itemSources: [], references: [evidence([5], { type: 'story', target: '香草店内的友情任务剧情对话' })] },
    steps: [
      step('step-1', 1, '与招牌侍女莉莉露（7.7）对话，选择“是”获得【友情香草】。', [1], [], [output('友情香草', 1)]),
      step('step-2', 2, '前往里谢里雅堡2楼图书室，与书虫米雪儿（22.12）对话，交出【友情香草】，获得【友情的悲剧】。', [2], [input('友情香草', 2)], [output('友情的悲剧', 2)]),
      step('step-3', 3, '返回里玲香料店与莉莉露对话，交出【友情的悲剧】，获得【全套香料优待卷】。', [3], [input('友情的悲剧', 3)], [output('全套香料优待卷', 3)]),
      step('step-4', 4, '持有【全套香料优待卷】与莉莉露对话，交出20G和优待卷，获得10个【苹果薄荷】，任务完结。', [4], [input('金币', 4, { quantity: 20, unit: 'G' }), input('全套香料优待卷', 4)], [output('苹果薄荷', 4, { quantity: 10 })])
    ],
    rewardEvents: [
      rewardEvent('reward-apple-mint', 'quest-completion', [4], [rewardItem('apple-mint', '苹果薄荷', [4], { quantity: 10 })], { step: 'step-4' })
    ],
    lineTypes: ['step', 'step', 'step', 'step', 'reference']
  });
}

{
  const quest = checkQuest('catalog-379f1dc2-461e-4bc4-a002-1a8126dc302c', '就职士兵');
  finalizeQuest(quest, {
    startLocation: '法兰城士兵长欧里（156.102）',
    requirements: [],
    steps: [
      step('step-1', 1, '与法兰城士兵长欧里（156.102）对话了解任务；此步可以跳过。', [1]),
      step('step-2', 2, '在芙蕾雅（472.316）、（440.304）附近等区域击倒哥布林或红帽哥布林，随机取得10个【绿头盔】或1个【红头盔】。', [2, 3, 4], [], [
        output('绿头盔', 2, { quantity: 10, acquisition: 'random-drop', alternativeGroup: 'helmet-requirement' }),
        output('红头盔', 2, { quantity: 1, acquisition: 'random-drop', alternativeGroup: 'helmet-requirement' })
      ], { notes: [evidence([3], { text: '哥布林之家内的哥布林不会掉落相关头盔。' }), evidence([4], { text: '绿头盔和红头盔均不可交易。' })] }),
      step('step-3', 3, '返回与士兵长欧里对话，交出10个【绿头盔】或1个【红头盔】，获得【士兵推荐信】。', [5], [
        input('绿头盔', 5, { quantity: 10, alternativeGroup: 'helmet-requirement' }),
        input('红头盔', 5, { quantity: 1, alternativeGroup: 'helmet-requirement' })
      ], [output('士兵推荐信', 5)]),
      step('step-4', 4, '前往里谢里雅堡1楼与近卫士兵长（81.22）对话，就职士兵，任务完结。', [6])
    ],
    outcomes: { titles: [], careers: [evidence([6], { career: '士兵', action: 'employment' })] },
    lineTypes: ['optional-step', 'step', 'step-note', 'item-detail', 'step', 'step']
  });
}

{
  const quest = checkQuest('legacy-bear', '杀熊者欧兹那克');
  const battle = evidence([3], {
    id: 'battle-1',
    order: 1,
    kind: 'boss-battle',
    title: '杀熊者欧兹那克',
    triggerStep: 'step-2',
    overview: evidence([3], { text: '与杀熊者欧兹那克对话进入战斗。' }),
    enemies: { 'enemy-1': evidence([3], { id: 'enemy-1', name: '杀熊者欧兹那克', level: null, hp: null, count: 1, raw: '与杀熊者欧兹那克（17,17）对话进入战斗。' }) }
  });
  finalizeQuest(quest, {
    startLocation: '哈巴鲁东边洞穴地下2楼',
    requirements: [],
    steps: [
      step('step-1', 1, '进入哈巴鲁东边洞穴并前往地下2楼。', [2]),
      step('step-2', 2, '与杀熊者欧兹那克（17,17）对话进入战斗。', [3]),
      step('step-3', 3, '战斗胜利后，队伍中随机1人获得【欧兹那克的戒指】。', [4], [], [output('欧兹那克的戒指', 4, { acquisition: 'random-party-member' })]),
      step('step-4', 4, '队长持有戒指时可调查（9,9）处床，进入小房间阅读日记。', [5], [input('欧兹那克的戒指', 5, { action: 'hold', consumed: false })])
    ],
    battles: { 'battle-1': battle },
    rewardEvents: [rewardEvent('reward-oznak-ring', 'battle-reward', [4], [rewardItem('oznak-ring', '欧兹那克的戒指', [4], { acquisition: 'random-party-member' })], { step: 'step-3' })],
    flowNotes: [evidence([6], { type: 'alternate-route', text: '游民和生产系可向矿工尤达彭交500G传送到熊男后方。' })],
    lineTypes: ['requirement', 'step', 'battle-trigger', 'reward-event', 'optional-step', 'alternate-route']
  });
}

{
  const quest = checkQuest('catalog-20c4fb22-b84a-4d87-8297-108eef068186', '神秘联络员');
  finalizeQuest(quest, {
    startLocation: '法兰城安其摩酒吧（102.131）',
    requirements: [],
    relations: { prerequisites: [], itemSources: [], references: [evidence([5], { type: 'reward-reference', targets: ['寶箱設定(參考)', '宝箱奖品资料'] }), evidence([6], { type: 'story', target: '神秘联络员任务剧情对话' })] },
    steps: [
      step('step-1', 1, '前往法兰城安其摩酒吧（102.131），从（19.6）进入酒吧里面。', [1]),
      step('step-2', 2, '从（21.1）进入客房。', [2]),
      step('step-3', 3, '与联络员A（8.2）对话，输入“头目万岁”，选择“是”并交出100G，获得10把【铜钥匙】，任务完结。', [3], [input('金币', 3, { quantity: 100, unit: 'G' })], [output('铜钥匙', 3, { quantity: 10 })])
    ],
    rewardEvents: [rewardEvent('reward-copper-keys', 'quest-completion', [3, 4], [rewardItem('copper-key', '铜钥匙', [3, 4], { quantity: 10, properties: { use: '开启随机迷宫中出现的普通宝箱' } })], { step: 'step-3' })],
    lineTypes: ['step', 'step', 'step', 'reward-detail', 'reference', 'reference']
  });
}

{
  const quest = checkQuest('catalog-2850124b-3e59-44f5-ab50-59d14ee1a3b5', '永恒的白马王子');
  finalizeQuest(quest, {
    startLocation: '夜晚的亚诺曼城爱情之树广场',
    requirements: [evidence([1], { type: 'time-window', value: '夜晚', appliesToStep: 'step-1' })],
    steps: [
      step('step-1', 1, '夜晚前往亚诺曼城爱情之树广场，与少女蒂克铃（77.103）对话，获得【寻找白马王子的请求】。', [1], [], [output('寻找白马王子的请求', 1)]),
      step('step-2', 2, '前往克里特大教堂右边与小孩罗林普（204.66）对话，交出1个【面包】，获得【白马棒棒糖】。', [2], [input('面包', 2)], [output('白马棒棒糖', 2)]),
      step('step-3', 3, '返回与少女蒂克铃对话，交出【白马棒棒糖】，获得【手环？】，任务完结。', [3], [input('白马棒棒糖', 3)], [output('手环？', 3)])
    ],
    rewardEvents: [
      rewardEvent('reward-starlight-bracelet', 'quest-completion', [3, 4, 5, 6], [
        rewardItem('starlight-bracelet', '手环？', [3, 4, 5, 6], {
          entityType: 'equipment',
          identifiedName: '带着星光的手环',
          properties: { level: 1, category: '手环', durability: 10, charm: 1, dropBehavior: '丢地消失', tradeable: false, bankable: false, equippedTitle: '永恒的白马王子' }
        })
      ], { step: 'step-3' })
    ],
    outcomes: { titles: [evidence([6], { name: '永恒的白马王子', acquisition: 'equip-item', item: '带着星光的手环' })], careers: [] },
    lineTypes: ['step', 'step', 'step', 'reward-detail', 'reward-detail', 'reward-detail']
  });
}

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log('已完成第一批 10 条任务的逐行语义核验。');
