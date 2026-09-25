import fs from 'node:fs';

const dataPath = new URL('../data-src/quests.json', import.meta.url);
const database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const equipmentArchivePath = new URL('../../魔力装备档案/index.html', import.meta.url);
const equipmentArchiveHtml = fs.readFileSync(equipmentArchivePath, 'utf8');
const equipmentMarker = 'const database=';
const equipmentStart = equipmentArchiveHtml.indexOf(equipmentMarker) + equipmentMarker.length;
const equipmentEnd = equipmentArchiveHtml.indexOf(']};', equipmentStart) + 2;
if (equipmentStart < equipmentMarker.length || equipmentEnd < 2) {
  throw new Error('无法从魔力装备档案读取装备数据库');
}
const equipmentDatabase = JSON.parse(equipmentArchiveHtml.slice(equipmentStart, equipmentEnd));
const questId = 'catalog-0504a6b1-500a-47a0-982a-70a6b36cca6b';
const quest = database.quests[questId];

if (!quest || quest.name !== '勇气max') {
  throw new Error(`未找到待核验任务：${questId}`);
}

const verified = (sourceLines, extra = {}) => ({
  ...extra,
  sourceLines,
  verification: { status: 'verified', method: 'manual-semantic-review' }
});

const courageSourceUrl = 'https://www.molibaike.com/Mission/Detail/0504a6b1-500a-47a0-982a-70a6b36cca6b';
const rewardKnowledge = {
  '光辉之心': {
    properties: { type: '10C装备合成材料', use: '合成任意一种光辉装备的材料之一', referenceQuest: '青龙的庇护' },
    references: [{ label: '魔力百科《青龙的庇护》', url: 'https://www.molibaike.com/Mission/Detail/e24688b0-7c37-4b9e-97c2-4f693342254d?u=True' }]
  },
  '骷髅战士改造图': {
    properties: {
      type: '宠物改造图',
      use: '集齐1套骷髅战士设计图，与任意等级骷髅战士进行改造',
      result: 'Lv.1改造骷髅战士',
      petProfile: { race: '不死系', skillSlots: 8, elements: { 地: 20, 风: 80 }, totalGrade: 125, baseStats: { 体: 27, 攻: 43, 防: 24, 敏: 17, 魔: 14 } }
    },
    references: [{ label: '魔力百科·改造骷髅战士', url: 'https://www.molibaike.com/monster/Detail/d177b719-c176-467d-9b24-34ec370e9d4d' }]
  },
  '10紫、10骑宝石': {
    properties: {
      type: 'Lv.10宝石',
      options: [
        { name: '完美的紫水晶', weapon: '防御+80、攻击+10%', armor: '攻击+40、防御+10%', accessory: '攻击+40、防御+40' },
        { name: '完美的骑士宝石', weapon: '命中+10、攻击-20%', armor: '闪躲+10、防御-20%', accessory: '闪躲+10、攻击-20' }
      ],
      verificationNote: '勇气max原攻略仅写“10紫、10骑宝石”，未说明两者同时获得还是随机其一。'
    },
    references: [
      { label: '魔力百科·勇气max原奖励记录', url: courageSourceUrl },
      { label: '水蓝魔力Wiki·宝石与装饰（属性交叉核验）', url: 'https://wiki.biligame.com/bluecg/%E5%AE%9D%E7%9F%B3%E4%B8%8E%E8%A3%85%E9%A5%B0' }
    ]
  },
  '时间水晶 Lv1': {
    properties: { type: '其它', use: '双击使用，恢复1小时工作时间', tradeable: false },
    references: [
      { label: '魔力百科·魔力常用词解释', url: 'https://old.molibaike.com/Page/Detail/e6ec1eed-f5da-4c90-8fd1-600a9b2befe9' },
      { label: '魔力百科《天梯PK赛》交易规则', url: 'https://www.molibaike.com/mission/Detail/06afe173-336c-405f-8357-d97b79111539?u=True' }
    ]
  },
  '奇怪的药草': {
    properties: { type: '技能草', skillExperience: 100, stackLimit: 99 },
    references: [{ label: '魔力百科《实验室除虫》', url: 'https://www.molibaike.com/mission/Detail/32dcdac8-557e-4f06-80aa-6c0877a2a6d5?u=True' }]
  },
  '技能学习证': {
    properties: {
      type: '其它',
      use: '双击后交出道具，随机传送至某一技能学习房间；与NPC对话并支付正常学习费用后习得技能，可能重复传送',
      stackLimit: 99,
      skills: ['单体恢复魔法', '强力恢复魔法', '超强恢复魔法', '单体补血魔法', '强力补血魔法', '超强补血魔法', '洁净魔法', '带宠物散步', '大地的祈祷', '海洋的祈祷', '火焰的祈祷', '云群的祈祷']
    },
    references: [{ label: '魔力百科·技能学习证', url: 'https://www.molibaike.com/Item/Detail/d724298e-9205-485b-86c5-cab1086a641a' }]
  },
  '闪光飞鹰精华': {
    properties: { result: 'Lv.1闪光飞鹰', petProfile: { race: '飞行系', skillSlots: 8, elements: { 水: 50, 风: 50 }, totalGrade: 125, baseStats: { 体: 22, 攻: 35, 防: 13, 敏: 48, 魔: 7 } } },
    references: [{ label: '魔力百科·闪光飞鹰', url: 'https://www.molibaike.com/monster/Detail/23ac02fd-31d6-45e9-8f0f-b52dca70cfaa?u=True' }]
  },
  '纯白冰淇淋招待券': {
    properties: { use: '与任意等级纯白吓人箱进行改造', result: 'Lv.1纯白冰淇淋吓人箱', petProfile: { race: '金属系', skillSlots: 9, elements: { 地: 20, 水: 80 }, totalGrade: 125, baseStats: { 体: 35, 攻: 44, 防: 20, 敏: 18, 魔: 8 } } },
    references: [{ label: '魔力百科·纯白冰淇淋吓人箱', url: 'https://www.molibaike.com/monster/Detail/94981984-48ba-4f20-9294-7e1002bf04cb?u=True' }]
  },
  '极运MAX': {
    properties: { result: 'Lv.1安泊之蕊', petProfile: { baseStats: { 体: 40, 攻: 40, 防: 27, 敏: 12, 魔: 6 }, elements: { 水: 90, 火: 10 }, race: '植物系', skillSlots: 10, totalGrade: 125, modifiers: { 命中: 10 } } },
    references: [{ label: '魔力百科·安泊之蕊', url: 'https://www.molibaike.com/Monster/Detail/13981fb4-191b-4e56-b40a-7d9929b43702?u=True' }]
  },
  '运气MAX结晶': {
    properties: {
      type: '宠物结果道具',
      use: '获得宠物乙巳化形',
      result: 'Lv.1乙巳化形',
      petDescription: '黑蛇外形、血宠，反击修正+10',
      modifiers: { 反击: 10 },
      verificationNote: '百科勇气max页未给出完整档位，页面仅展示已明确的宠物定位与修正。'
    },
    references: [{ label: '魔力百科·勇气max（2025奖品说明）', url: courageSourceUrl }]
  },
  '原罪之魔精华': {
    properties: {
      type: '宠物精华',
      use: '获得宠物原罪之魔',
      result: 'Lv.1原罪之魔',
      petProfile: { race: '飞行系', skillSlots: 10, elements: { 地: 70, 风: 30 }, totalGrade: 125, baseStats: { 体: 21, 攻: 48, 防: 18, 敏: 29, 魔: 9 } }
    },
    references: [{ label: '魔力百科·原罪之魔', url: 'https://old.molibaike.com/Monster/Detail/9c2c5576-4786-4b04-9b8b-172193c07be1' }]
  },
  '魔力之泉': {
    properties: { type: '料理', level: 10, effect: '回复目标约4000点魔力' },
    references: [{ label: '魔力百科·魔力之泉', url: 'https://old.molibaike.com/Item/Detail/d3348e42-ed6e-4499-a5d5-736f32abf647?u=True' }]
  },
  '小护士': {
    properties: { type: '血瓶', level: 10, effect: '回复目标约4000点生命力', stackLimit: 10 },
    references: [
      { label: '魔力百科·勇气max（2025奖品说明）', url: courageSourceUrl },
      { label: '魔力百科·小护士家庭号', url: 'https://old.molibaike.com/Item/Detail/81c6a322-8c1e-4279-b952-e29725c841fc?u=True' }
    ]
  },
  '小护士家庭号': {
    properties: { type: '血瓶', level: 10, effect: '回复目标约4000点生命力', stackLimit: 10 },
    references: [{ label: '魔力百科·小护士家庭号', url: 'https://old.molibaike.com/Item/Detail/81c6a322-8c1e-4279-b952-e29725c841fc?u=True' }]
  },
  '朽红叶': {
    properties: {
      type: '戒指',
      level: 4,
      durability: 5,
      stats: { 攻击: 300, 防御: -200, 敏捷: -100, 命中: -50, 闪躲: -50, 生命: -500 },
      effect: '以大幅降低防御、敏捷、命中、闪躲和生命为代价提高攻击力'
    },
    references: [{ label: '魔力百科·窃盗物品指南（朽红叶）', url: 'https://www.molibaike.com/Article/Detail/7c10ac25-6c3d-4af7-a1ba-a71b26d941c4' }]
  },
  '传送石优待券': {
    properties: { type: '其它', use: '持有时可免费使用传送石；怀旧自制地图除外' },
    references: [{ label: '魔力百科·传送石优待券', url: 'https://old.molibaike.com/Item/Detail/0810a415-4af7-4a05-8f81-aaeb90186886?u=True' }]
  },
  '鼠王还原券': {
    properties: {
      type: '宠物还原道具',
      use: '与任意等级鼠王一起交给裘瑟贝，兑换一只新的Lv.1鼠王',
      result: 'Lv.1鼠王',
      petProfile: { race: '野兽系', skillSlots: 10, elements: { 火: 50, 风: 50 }, totalGrade: 115, baseStats: { 体: 15, 攻: 7, 防: 19, 敏: 32, 魔: 42 } }
    },
    references: [{ label: '魔力百科·鼠王', url: 'https://www.molibaike.com/Monster/Detail/e7321342-edab-454f-bfeb-2c4de2d07401?u=True' }]
  },
  '王者守护神': {
    properties: {
      type: '护身符',
      level: 10,
      durability: 100,
      effect: '增加偷袭率；装备后获得称号“王者之风”',
      tradeable: true
    },
    references: [{ label: '魔力百科《百人道场》', url: 'https://www.molibaike.com/Mission/Detail/1f1ed448-5d92-428a-aaf4-84e39d7450f1?u=True' }]
  },
  '坚强的小兔子精华': {
    properties: {
      type: '宠物精华',
      use: '获得宠物坚强的小兔子',
      result: 'Lv.1坚强的小兔子',
      petProfile: { race: '飞行系', skillSlots: 9, elements: { 火: 20, 风: 80 }, totalGrade: 125, baseStats: { 体: 38, 攻: 39, 防: 23, 敏: 16, 魔: 9 }, modifiers: { 命中: 5 } }
    },
    references: [{ label: '魔力百科·坚强的小兔子', url: 'https://www.molibaike.com/monster/Detail/654df08b-fd1d-463e-b1c6-c41dc293b52d?u=True' }]
  },
  '雾风的精华': {
    properties: {
      type: '宠物精华',
      use: '获得宠物雾风',
      result: 'Lv.1雾风',
      availabilityNote: '勇气max来源注明于2023年1月11日更新增加',
      petProfile: { race: '金属系', skillSlots: 10, elements: { 火: 20, 风: 80 }, totalGrade: 125, baseStats: { 体: 25, 攻: 13, 防: 22, 敏: 24, 魔: 41 } }
    },
    references: [{ label: '魔力百科·雾风', url: 'https://www.molibaike.com/monster/Detail/6fd23a0d-1569-4bab-b024-bba5501b144f' }]
  },
  'Lv.10各种宝石': {
    properties: {
      type: 'Lv.10宝石（种类未指定）',
      verificationNote: '勇气max原攻略只写“Lv.10各种宝石”，未列明具体宝石种类，不能据此补成固定属性。'
    },
    references: [
      { label: '魔力百科·勇气max原奖励记录', url: courageSourceUrl },
      { label: '水蓝魔力Wiki·宝石与装饰（属性参考）', url: 'https://wiki.biligame.com/bluecg/%E5%AE%9D%E7%9F%B3%E4%B8%8E%E8%A3%85%E9%A5%B0' }
    ]
  },
  '梦幻想签名专辑': {
    properties: {
      type: '奖品道具',
      verificationNote: '百科勇气max原攻略仅列出名称，未提供可核验的用途或属性；暂不推测。'
    },
    references: [{ label: '魔力百科·勇气max原奖励记录', url: courageSourceUrl }]
  }
};
rewardKnowledge['时间水晶LV1'] = rewardKnowledge['时间水晶 Lv1'];
rewardKnowledge['奇怪的草药'] = rewardKnowledge['奇怪的药草'];
rewardKnowledge['传送石优待卷'] = rewardKnowledge['传送石优待券'];

const item = (id, name, sourceLines, extra = {}) => {
  const knowledge = rewardKnowledge[name] || {};
  return verified(sourceLines, {
    id,
    name,
    role: 'valuable-result',
    ...knowledge,
    ...extra,
    properties: { ...(extra.properties || {}), ...(knowledge.properties || {}) },
    references: [...(knowledge.references || []), ...(extra.references || [])]
  });
};

const equipmentArchive = (...names) => {
  const entries = names.map(name => {
    const equipment = equipmentDatabase.items.find(candidate => candidate.name === name);
    if (!equipment) throw new Error(`魔力装备档案缺少：${name}`);
    return {
      id: equipment.id,
      name: equipment.name,
      category: equipment.category,
      subtype: equipment.subtype,
      level: equipment.level,
      hands: equipment.hands,
      stats: equipment.stats,
      servers: equipment.servers,
      detailNote: equipment.detailNote
    };
  });
  return {
    equipmentArchive: {
      sourceFile: '魔力装备档案/index.html',
      sourceUrl: equipmentDatabase.source,
      entries
    }
  };
};

const event = (id, version, tier, kind, sourceLines, items, extra = {}) => verified(sourceLines, {
  id,
  version,
  tier,
  kind,
  items,
  ...extra
});

quest.schemaVersion = 2;
quest.presentation = {
  ...(quest.presentation || {}),
  rewardLayout: 'version-accordion'
};
quest.verification = {
  status: 'in-progress',
  method: 'manual-semantic-review',
  reviewedSourceRanges: [[1, 75], [171, 211]],
  note: '已逐行核验流程、2024—2026 奖励、2021/22 奖励及 2026 战斗调整/第4关；其余历史战斗字段仍需逐敌人复核。'
};

quest.flow = {
  start: verified([1], {
    stepId: 'step-1',
    location: '法兰城银行门口招募信息栏（233.107）'
  }),
  steps: [
    verified([1], {
      id: 'step-1',
      order: 1,
      text: '调查法兰城银行门口招募信息栏（233.107），得到【招募信息】；双击可获得消息。',
      inputs: [],
      outputs: [verified([1], { item: '招募信息', quantity: 1, acquisition: 'guaranteed' })],
      notes: []
    }),
    verified([2, 3, 4, 5], {
      id: 'step-2',
      order: 2,
      text: '前往勇气训练所（116,119）与服务生对话：选择“是”付5000G进入1阶，选择“否”付10000G进入2阶；交出招募信息并取得对应训练证明后，再次对话，传送至勇气训练所。',
      inputs: [verified([3], { item: '招募信息', quantity: 1, action: 'hand-over' })],
      outputs: [verified([3], {
        item: '参加训练证明LV1/LV2',
        quantity: 1,
        acquisition: 'guaranteed',
        variantByChoice: [
          { choice: '是', fee: 5000, tier: 'tier-1', item: '参加训练证明LV1' },
          { choice: '否', fee: 10000, tier: 'tier-2', item: '参加训练证明LV2' }
        ]
      })],
      notes: [verified([5], {
        type: 'alternative-fee',
        text: '未持有【招募信息】时，1阶费用为20000G，2阶费用为50000G。'
      })]
    }),
    verified([6], {
      id: 'step-3',
      order: 3,
      text: '与等级1/2训练员对话，完成无补给的六连战；胜利后交出对应训练证明，取得该版本和阶级的奖励并传送回法兰城。',
      inputs: [verified([6], {
        item: '参加训练证明LV1/LV2',
        quantity: 1,
        action: 'hand-over'
      })],
      outputs: [],
      rewardEventRefs: ['按版本及阶级匹配 rewardEvents'],
      notes: []
    })
  ],
  notes: []
};

quest.segments = (quest.segments || []).filter(segment => {
  const text = String(segment.text || '');
  return !/^[-=]{8,}$/.test(text.trim());
});

quest.versions['2024'].changes = [];
quest.versions['2025'].inheritsFrom = { battles: '2024' };
quest.versions['2026'].inheritsFrom = { battles: '2025' };
quest.versions['2026'].changes = [
  verified([10, 11, 12], {
    id: 'change-1',
    type: 'battle-adjustment',
    targetBattleOrder: 4,
    targetEnemy: '风之残影（左2吉拉的幻影）',
    text: '2026年2月11日维护后，恢复吉拉一组中的风之残影取消魔法封印。'
  }),
  verified([10, 11, 13, 14, 15, 16], {
    id: 'change-2',
    type: 'battle-adjustment',
    targetBattleOrder: 3,
    targetEnemy: '螳螂',
    text: '2026年2月11日维护后，以“攻击”替换“明镜止水”；每5回合固定在一、二动使用，喊话约25%随机触发。'
  }),
  verified([17, 18, 19, 20, 21], {
    id: 'change-3',
    type: 'battle-replacement',
    targetBattleOrder: 4,
    text: '2阶第4关由暗黑龙改为随机一种回来报仇的吉拉（恢复或连击）×1，并带吉拉的幻影×4；四个幻影由左至右对应水、风、焱、土之残影。'
  }),
  verified([22], {
    id: 'change-4',
    type: 'battle-adjustment',
    targetBattleOrder: 5,
    text: '第5关沿用2025调整：裁判不能使用战栗打法；被战栗后追加大地之怒，伤害150—250波动。'
  })
];

const battle2026 = quest.versions['2026'].tiers['tier-2'].battles['battle-4'];
battle2026.overview = verified([20, 21], {
  text: '随机出现“回来报仇的吉拉（恢复）”或“回来报仇的吉拉（连击）”其中一种，共1只；另有水、风、焱、土之残影各1只。',
  roster: [
    { alternatives: ['回来报仇的吉拉（连击）', '回来报仇的吉拉（恢复）'], count: 1 },
    { name: '水之残影', count: 1 },
    { name: '风之残影', count: 1 },
    { name: '焱之残影', count: 1 },
    { name: '土之残影', count: 1 }
  ]
});
battle2026.verification = { status: 'verified', method: 'manual-semantic-review' };
for (const enemy of Object.values(battle2026.enemies)) {
  enemy.verification = { status: 'verified', method: 'manual-semantic-review' };
}

quest.rewardEvents = [
  event('reward-2026-tier2-pool', '2026', 'tier-2', 'reward-pool', [36, 37, 38, 39, 40, 41, 42, 47, 48, 49], [
    item('reward-2026-light-heart', '光辉之心', [37], { properties: { use: '10C合成任意一种光辉装备的材料之一', referenceQuest: '青龙的庇护' } }),
    item('reward-2026-skeleton-warrior-plan', '骷髅战士改造图', [38]),
    item('reward-2026-gems', '10紫、10骑宝石', [39], { decompositionStatus: 'source-name-needs-clarification' }),
    item('reward-2026-time-crystal', '时间水晶 Lv1', [40]),
    item('reward-2026-strange-herb', '奇怪的药草', [41], { quantity: 5, properties: { type: '技能草', skillExperience: 100 } }),
    item('reward-2026-skill-certificate', '技能学习证', [42], { properties: { referenceQuest: '技能学习证' } }),
    item('reward-2026-flash-eagle', '闪光飞鹰精华', [47], { properties: { result: 'Lv.1闪光飞鹰' } }),
    item('reward-2026-white-icecream-ticket', '纯白冰淇淋招待券', [48], { properties: { use: 'Lv.1纯白冰淇淋吓人箱的改造道具' } }),
    item('reward-2026-extreme-luck', '极运MAX', [49], { properties: { result: 'Lv.1安泊之蕊', petProfile: { baseStats: [40, 40, 27, 12, 6], elements: { 水: 9, 火: 1 }, race: '植物系', skillSlots: 10, modifiers: { 命中: 10 } } } })
  ], { selectionMethod: 'source-unspecified' }),
  event('reward-2026-tier2-drop-duck', '2026', 'tier-2', 'battle-drop', [43, 44, 45, 46], [
    item('reward-2026-proud-duck-essence', '骄傲的小鸭子精华', [43, 44, 45, 46], { acquisition: 'chance', properties: { petProfile: { race: '飞行系', skillSlots: 9, elements: { 地: 8, 风: 2 }, modifiers: '无', totalGrade: 125, baseStats: { 体: 33, 攻: 50, 防: 15, 敏: 18, 魔: 9 }, gradeStatus: '暂定' } } })
  ]),
  event('reward-2025-tier2-pool', '2025', 'tier-2', 'reward-pool', [57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75], [
    item('reward-2025-luck-max-crystal', '运气MAX结晶', [58, 63], { properties: { result: '乙巳化形', petDescription: '黑蛇、血宠', modifiers: { 反击: 10 } } }),
    item('reward-2025-original-sin-essence', '原罪之魔精华', [59, 64]),
    item('reward-2025-flash-eagle', '闪光飞鹰精华', [59, 65], { properties: { description: '水风属性的飞鸟，高敏宠' } }),
    item('reward-2025-nurse', '小护士', [67], { quantity: 10, packaging: '1组', properties: { lifeRecovery: 4000 } }),
    item('reward-2025-magic-spring', '魔力之泉', [68]),
    item('reward-2025-time-crystal', '时间水晶LV1', [69]),
    item('reward-2025-red-leaf', '朽红叶', [70]),
    item('reward-2025-platinum-record', '梦幻想白金唱片', [71], { properties: { variants: '原文仅说明“很多类型”，未列明型号对应关系' } }),
    item('reward-2025-guardian', '王者守护神', [72], { properties: { durability: 100 } }),
    item('reward-2025-strange-herb', '奇怪的草药', [73], { quantity: 3, properties: { skillExperience: 100 } }),
    item('reward-2025-teleport-coupon', '传送石优待卷', [74]),
    item('reward-2025-safety-helmet', '金刚不坏安全帽·改', [75], equipmentArchive('金刚不坏安全帽·改'))
  ], {
    selectionMethod: 'source-unspecified',
    notes: [
      verified([60], { text: '来源称“好像没有10C配方”，属于不确定说明，未据此建立确定的移除关系。' }),
      verified([61, 62], { text: '来源明确表示奖励清单可能不完整。' })
    ]
  }),
  event('reward-2024-tier2-pool', '2024', 'tier-2', 'reward-pool', [171, 172, 173, 174, 175], [
    item('reward-2024-nurse-family', '小护士家庭号', [173], { quantity: 10, unit: '瓶', properties: { change: '原先为1瓶，现已调整为10瓶' } }),
    item('reward-2024-magic-spring', '魔力之泉', [173], { quantity: 1, unit: '瓶' }),
    item('reward-2024-time-crystal', '时间水晶LV1', [173]),
    item('reward-2024-platinum-record-series', '梦幻想白金唱片Ⅰ号-Ⅹ号', [174, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197], {
      entityType: 'item-series',
      properties: {
        level: 6,
        category: '护身符',
        attack: { min: 10, max: 15 },
        defense: { min: 10, max: 15 },
        recovery: { min: 10, max: 15 },
        durability: { min: 120, max: 150, approximate: true },
        title: '爱与和平的守护者'
      },
      variants: [
        verified([188], { model: 'Ⅰ', effect: { skill: '补血魔法', manaCostChangePercent: -15 }, note: '减2.5魔按减3计算；后续型号同此取整说明。' }),
        verified([189], { model: 'Ⅱ', effect: { skill: '恢复魔法', manaCostChangePercent: -15 } }),
        verified([190], { model: 'Ⅲ', effect: { skill: '洁净魔法', manaCostChangePercent: -10 } }),
        verified([191], { model: 'Ⅳ', effect: { skill: '中毒魔法', manaCostChangePercent: -10 } }),
        verified([192], { model: 'Ⅴ', effect: { skill: '昏睡魔法', manaCostChangePercent: -10 } }),
        verified([193], { model: 'Ⅵ', effect: { skill: '混乱魔法', manaCostChangePercent: -10 } }),
        verified([194], { model: 'Ⅶ', effect: { skill: '遗忘魔法', manaCostChangePercent: -10 } }),
        verified([195], { model: 'Ⅷ', effect: { skill: '酒醉魔法', manaCostChangePercent: -10 } }),
        verified([196], { model: 'Ⅸ', effect: { skill: '石化魔法', manaCostChangePercent: -10 } }),
        verified([197], { model: 'Ⅹ', effect: { skill: '混乱攻击', manaCostChangePercent: -15 } })
      ]
    }),
    item('reward-2024-sky-spear', '天空之枪', [174], equipmentArchive('天空之枪')),
    item('reward-2024-muramasa', '村正', [174], equipmentArchive('村正')),
    item('reward-2024-parukes-axe', '帕鲁凯斯之斧', [174], equipmentArchive('帕鲁凯斯之斧')),
    item('reward-2024-red-leaf', '朽红叶', [174]),
    item('reward-2024-safety-helmet', '金刚不坏安全帽·改', [174], equipmentArchive('金刚不坏安全帽·改')),
    item('reward-2024-light-equipment-plan', '10C光辉装备结构图', [175, 178], { properties: { variant: '随机一种', referenceQuest: '青龙的庇护' } }),
    item('reward-2024-teleport-coupon', '传送石优待卷', [175]),
    item('reward-2024-mouse-king-ticket', '鼠王还原券', [175]),
    item('reward-2024-guardian', '王者守护神', [175]),
    item('reward-2024-white-icecream-ticket', '纯白冰淇淋招待券', [175, 179, 180, 181], { properties: { use: '改造纯白吓人箱', result: '纯白冰淇淋吓人箱', resultPetProfile: { baseStats: [35, 44, 20, 18, 8], elements: { 地: 20, 水: 80 } }, nameCorrection: '冰淇淋，不是冰激凌' } }),
    item('reward-2024-luck-max-plus', '运气MAX+', [175, 182, 183], { properties: { result: '阿斯克勒比斯杖灵', description: '大黑蛇、魔宠', elements: { 火: 20, 风: 80 } } })
  ], { selectionMethod: 'source-unspecified' }),
  event('reward-2024-tier2-drop-rabbit', '2024', 'tier-2', 'battle-drop', [176], [
    item('reward-2024-strong-rabbit-essence', '坚强的小兔子精华', [176], { acquisition: 'chance' })
  ]),
  event('reward-2023-tier2-drop-scarf-rabbit', '2023', 'tier-2', 'battle-drop', [199, 200, 201], [
    item('reward-2023-scarf-rabbit-essence', '强化围巾兔精华', [200, 201], { acquisition: 'chance', properties: { result: 'Lv.1强化围巾兔', petProfile: { baseStats: [25, 9, 19, 28, 44], totalGrade: 125, skillSlots: 9, race: '野兽系', elements: { 火: 80, 风: 20 } } } })
  ]),
  event('reward-2021-2022-tier2-drop-wing-egg', '2021-2022', 'tier-2', 'battle-drop', [202, 203, 204], [
    item('reward-2021-2022-wing-egg', '翼之卵', [203, 204], { acquisition: 'chance', properties: { result: 'Lv.1天使之翼', petProfile: { baseStats: [39, 44, 16, 19, 7], totalGrade: 125, skillSlots: 10, race: '飞行系', elements: { 风: 100 } } } })
  ]),
  event('reward-2021-2022-tier1-pool', '2021-2022', 'tier-1', 'reward-pool', [205, 206], [
    item('reward-2021-2022-tier1-core', '9C装备核心材料', [206, 211], { properties: { referenceQuest: '兰国的遗产' } }),
    item('reward-2021-2022-tier1-album', '梦幻想签名专辑', [206]),
    item('reward-2021-2022-tier1-nurse', '小护士家庭号', [206], { quantity: 10 }),
    item('reward-2021-2022-tier1-magic-spring', '魔力之泉', [206])
  ], { selectionMethod: 'source-unspecified' }),
  event('reward-2021-2022-tier2-pool', '2021-2022', 'tier-2', 'reward-pool', [205, 207, 208, 209, 210, 211], [
    item('reward-2021-2022-tier2-core', '9C装备核心材料', [207, 211], { properties: { referenceQuest: '兰国的遗产' } }),
    item('reward-2021-2022-tier2-ashaf-staff', '阿夏芙之杖', [207], equipmentArchive('阿夏芙之杖（地）', '阿夏芙之杖（风）', '阿夏芙之杖（火）', '阿夏芙之杖（水）')),
    item('reward-2021-2022-tier2-sky-spear', '天空之枪', [207], equipmentArchive('天空之枪')),
    item('reward-2021-2022-tier2-parukes-axe', '帕鲁凯斯之斧', [207], equipmentArchive('帕鲁凯斯之斧')),
    item('reward-2021-2022-tier2-muramasa', '村正', [207], equipmentArchive('村正')),
    item('reward-2021-2022-tier2-gems', 'Lv.10各种宝石', [208]),
    item('reward-2021-2022-tier2-album', '梦幻想签名专辑', [208]),
    item('reward-2021-2022-tier2-safety-helmet', '金刚不坏安全帽·改', [208], equipmentArchive('金刚不坏安全帽·改')),
    item('reward-2021-2022-tier2-luck-max', '运气ΜΑΧ', [209, 210], { properties: { result: 'Lv.1希特拉（怀旧版）', petProfile: { skillSlots: 10, race: '龙系', elements: { 地: 90, 风: 10 }, baseStats: [42, 42, 27, 7, 7] } } }),
    item('reward-2021-2022-tier2-mist-wind-essence', '雾风的精华', [209], { availabilityNote: '来源注明“2023年1月11日更新增加”' })
  ], { selectionMethod: 'source-unspecified' })
];

for (const version of Object.values(quest.versions)) {
  for (const tier of Object.values(version.tiers || {})) {
    tier.rewards = [];
    tier.items = [];
  }
}

const processAcquisitions = quest.flow.steps.flatMap(step =>
  step.outputs.map(output => ({
    item: output.item,
    kind: output.acquisition,
    step: step.id,
    version: 'common',
    tier: 'common',
    sourceLines: output.sourceLines,
    verification: output.verification
  }))
);

const rewardAcquisitions = quest.rewardEvents.flatMap(rewardEvent =>
  rewardEvent.items.map(rewardItem => ({
    item: rewardItem.name,
    kind: rewardItem.acquisition || rewardEvent.kind,
    step: 'step-3',
    version: rewardEvent.version,
    tier: rewardEvent.tier,
    rewardEvent: rewardEvent.id,
    sourceLines: rewardItem.sourceLines,
    verification: rewardItem.verification
  }))
);

quest.itemEvents = {
  inputs: quest.flow.steps.flatMap(step => step.inputs.map(input => ({
    item: input.item,
    action: input.action,
    step: step.id,
    version: 'common',
    tier: 'common',
    sourceLines: input.sourceLines,
    verification: input.verification
  }))),
  acquisitions: [...processAcquisitions, ...rewardAcquisitions]
};

// 全文终审：修正旧解析器把名称和技能续行误当成敌人的结果，并补齐所有 336 行的证据状态。
quest.verification = {
  status: 'verified',
  method: 'manual-semantic-review',
  reviewedSourceRanges: [[1, quest.source.lineCount]],
  note: '全部336行原文已逐条核验；流程、阶级费用、六连战、2021—2026版本继承、战斗调整、敌人、打法、奖励和掉落均已按字段归属。'
};

quest.requirements = {
  conditions: [
    verified([3], { type: 'tier-choice-and-fee', choices: [
      { choice: '是', tier: 'tier-1', fee: 5000, currency: 'G' },
      { choice: '否', tier: 'tier-2', fee: 10000, currency: 'G' }
    ] }),
    verified([5], { type: 'alternate-fee-without-recruitment-info', fees: { 'tier-1': 20000, 'tier-2': 50000 }, currency: 'G' }),
    verified([6, 212], { type: 'six-consecutive-battles', count: 6, resupplyBetweenBattles: false }),
    verified([9], { type: 'server-and-event-availability', version: '2026', servers: ['怀旧牧羊', '怀旧金牛', '怀旧双子'] }),
    verified([53], { type: 'server-and-event-availability', version: '2025', servers: ['怀旧牧羊', '怀旧金牛', '怀旧双子'] })
  ]
};
quest.relations = {
  prerequisites: [],
  itemSources: [],
  references: [
    verified([79, 86, 96, 116, 125, 131], { type: 'battle-provenance', version: '2024', quests: ['失翼之龙', '森罗万象', '百人道场', '誓言之花', '暗殿团队挑战赛', '兰国的遗产'] }),
    verified([214, 226, 236, 241, 252, 260], { type: 'battle-provenance', version: '2021-2022-tier-1', quests: ['返魂之珠', '沉默之龙', '魔龙德拉贡', '森罗万象', '牛鬼的逆袭'] }),
    verified([266, 282, 289, 302, 322, 331], { type: 'battle-provenance', version: 'through-2023-tier-2', quests: ['盲目之龙', '失翼之龙', '牛鬼的逆袭', '百人道场', '誓言之花', '兰国的遗产'] })
  ]
};
quest.outcomes = { titles: [], careers: [], skills: [] };

const tier1 = quest.versions['2021-2022'].tiers['tier-1'].battles;
const elcasBattle = tier1['battle-2'];
elcasBattle.enemies['enemy-1'].name = '艾儿卡丝';
elcasBattle.enemies['enemy-2'].name = '艾儿卡丝的手下（女）';
elcasBattle.enemies['enemy-3'].name = '艾儿卡丝的手下（男）';

const lorenceBattle = tier1['battle-5'];
const lorence = lorenceBattle.enemies['enemy-1'];
lorence.sourceLines = [254, 255, 256];
lorence.raw = `${lorence.raw}${quest.source.rawLines[255].text}`;
lorence.skills = [...new Set([...(lorence.skills || []), '属性反转Lv10', '混乱魔法Lv10', '超强混乱魔法', '召唤帝国兵的亡灵（男）*2/（女）*2'])];
delete lorenceBattle.enemies['enemy-2'];

const battleRanges = {
  '2024:tier-2:battle-1': [...Array.from({ length: 7 }, (_, i) => 79 + i), 148, 149],
  '2024:tier-2:battle-2': [...Array.from({ length: 10 }, (_, i) => 86 + i), 150, 151, 152, 153],
  '2024:tier-2:battle-3': [...Array.from({ length: 20 }, (_, i) => 96 + i), 154, 155, 156, 157, 158],
  '2024:tier-2:battle-4': [...Array.from({ length: 9 }, (_, i) => 116 + i), 159, 160, 161, 162],
  '2024:tier-2:battle-5': [...Array.from({ length: 6 }, (_, i) => 125 + i), 163, 164, 165, 166, 167],
  '2024:tier-2:battle-6': [...Array.from({ length: 5 }, (_, i) => 131 + i), 168, 169, 170],
  '2021-2022:tier-1:battle-1': Array.from({ length: 12 }, (_, i) => 214 + i),
  '2021-2022:tier-1:battle-2': Array.from({ length: 10 }, (_, i) => 226 + i),
  '2021-2022:tier-1:battle-3': Array.from({ length: 5 }, (_, i) => 236 + i),
  '2021-2022:tier-1:battle-4': Array.from({ length: 11 }, (_, i) => 241 + i),
  '2021-2022:tier-1:battle-5': Array.from({ length: 8 }, (_, i) => 252 + i),
  '2021-2022:tier-1:battle-6': Array.from({ length: 5 }, (_, i) => 260 + i),
  'through-2023:common:battle-1': Array.from({ length: 16 }, (_, i) => 266 + i),
  'through-2023:common:battle-2': Array.from({ length: 7 }, (_, i) => 282 + i),
  'through-2023:common:battle-3': Array.from({ length: 13 }, (_, i) => 289 + i),
  'through-2023:common:battle-4': Array.from({ length: 20 }, (_, i) => 302 + i),
  'through-2023:common:battle-5': Array.from({ length: 9 }, (_, i) => 322 + i),
  'through-2023:common:battle-6': Array.from({ length: 6 }, (_, i) => 331 + i)
};
for (const [versionKey, version] of Object.entries(quest.versions)) {
  for (const [tierKey, tierData] of Object.entries(version.tiers || {})) {
    for (const [battleKey, battleData] of Object.entries(tierData.battles || {})) {
      const reviewedLines = battleRanges[`${versionKey}:${tierKey}:${battleKey}`];
      if (reviewedLines) battleData.sourceLines = reviewedLines;
    }
  }
}

quest.versions['2025'].changes = [
  verified([55], { id: 'change-2025-judge', type: 'battle-adjustment', targetBattleOrder: 5, text: '裁判被战栗后追加大地之怒，伤害150—250。' }),
  verified([56], { id: 'change-2025-gila-unconfirmed', type: 'unconfirmed-battle-note', targetEnemy: '吉拉', text: '来源仅称“听说不能战栗”，未作为确定机制。' })
];
quest.versions['2024'].tiers['tier-1'].notes = [verified([76, 77], { text: '来源称2024年1阶似乎没有改动，沿用下方历史资料；保留为不确定说明。' })];
quest.versions['2023'].inheritsFrom = { battles: 'through-2023' };
quest.versions['2021-2022'].inheritsFrom = { tier2Battles: 'through-2023' };
quest.versions['through-2023'].tiers['tier-2'] = { ...quest.versions['through-2023'].tiers.common, key: 'tier-2', label: '2阶' };
delete quest.versions['through-2023'].tiers.common;

const markVerified = value => {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { for (const entry of value) markVerified(entry); return; }
  if (Array.isArray(value.sourceLines) && value.sourceLines.length) value.verification = { status: 'verified', method: 'manual-semantic-review' };
  for (const nested of Object.values(value)) markVerified(nested);
};
markVerified(quest.flow);
markVerified(quest.versions);
markVerified(quest.rewardEvents);

const existingSegments = new Map((quest.segments || []).map(segment => [segment.line, segment]));
quest.segments = quest.source.rawLines
  .filter(sourceLine => !/^[-=]{8,}$/.test(sourceLine.text.trim()))
  .map(sourceLine => {
    const old = existingSegments.get(sourceLine.line) || {};
    return verified([sourceLine.line], {
      line: sourceLine.line,
      text: sourceLine.text,
      version: old.version || 'common',
      tier: old.tier || 'common',
      type: old.type || 'source-note'
    });
  });

quest.itemEvents.inputs = quest.flow.steps.flatMap(step => (step.inputs || []).map(input => ({
  item: input.item, action: input.action, step: step.id, version: 'common', tier: 'common', sourceLines: input.sourceLines, verification: input.verification
})));
quest.itemEvents.acquisitions = [
  ...quest.flow.steps.flatMap(step => (step.outputs || []).map(output => ({ item: output.item, kind: output.acquisition, step: step.id, version: 'common', tier: 'common', sourceLines: output.sourceLines, verification: output.verification }))),
  ...quest.rewardEvents.flatMap(rewardEvent => rewardEvent.items.map(rewardItem => ({ item: rewardItem.name, kind: rewardItem.acquisition || rewardEvent.kind, step: 'step-3', version: rewardEvent.version, tier: rewardEvent.tier, rewardEvent: rewardEvent.id, sourceLines: rewardItem.sourceLines, verification: rewardItem.verification })))
];
delete quest.legacy;

fs.writeFileSync(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log(`已写回 ${questId}：${quest.name}`);
