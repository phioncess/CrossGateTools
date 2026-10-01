// 对包含奖励表、兑换表或多版本差异的任务进行人工核验后的结构化重组。
// 展示层只读取字段，不得再把原攻略整段文本挂到某一件道具下。
globalThis.STRUCTURED_REWARD_GUIDES = {
  'catalog-fb37687d-fe7c-431a-8d6c-2264608334f0': {
    replaceGenericAcquisitions: true,
    acquisitionEvents: [
      {
        stepNumber: 2,
        source: '第一至第四层 BOSS 战胜利后',
        certainty: '固定获得',
        rewards: [
          {name:'钥匙', quantity:'每层 1 把', note:'用于开启下一阶段，属于流程道具'},
          {name:'积分卡', quantity:'第1/2/3/4层分别为 1 / 2 / 3 / 6 张', note:'可累计兑换奖励'}
        ]
      },
      {
        stepNumber: 3,
        source: '第五层 BOSS 战胜利后',
        certainty: '固定与随机奖励并存',
        rewards: [
          {name:'全视之眼（红）／全视之眼（蓝）', quantity:'二者之一', note:'最终装备奖励'},
          {name:'积分卡', quantity:'8 张'},
          {name:'丧尸设计图', quantity:'随机 1 张'},
          {name:'称号“深远的黑暗”', quantity:'1 项'}
        ]
      }
    ],
    itemDetails: [
      {
        name:'积分卡', kind:'兑换货币',
        sources:['各阶段 BOSS 胜利奖励'],
        facts:['在异次元试验场与荷特普（20,13）兑换奖励']
      },
      {
        name:'全视之眼（红）', kind:'Lv.10 护身符',
        sources:['第五层最终奖励（二选一）','45 张积分卡兑换'],
        facts:['适合物理系','攻击 +25','敏捷 +10','回复 +15','必杀 +12','反击 +12','命中 +17','生命 +200','魔力 +150','抗魔 +35','耐久 100','不可交易']
      },
      {
        name:'全视之眼（蓝）', kind:'Lv.10 护身符',
        sources:['第五层最终奖励（二选一）','45 张积分卡兑换'],
        facts:['适合魔法系','敏捷 +10','精神 +16','回复 +15','必杀 +12','闪躲 +17','生命 +200','魔力 +150','魔攻 +17','抗魔 +20','耐久 100','不可交易']
      },
      {
        name:'丧尸设计图', kind:'改造设计图',
        sources:['第五层 BOSS 胜利后随机 1 张'],
        facts:['用于改造为变异丧尸','不死系','9 个技能栏','属性：水 7 / 火 3','原攻略档位记录：40 / 38 / 17 / 15 / 15（未标注排列顺序）']
      }
    ],
    exchanges: [
      {cost:'20 张积分卡', name:'丧尸设计图包', result:'随机获得 1 张丧尸设计图'},
      {cost:'100 张积分卡', name:'宝石箱', result:'随机颜色 Lv.10 宝石；有几率获得 Lv.10 海洋之心宝石'},
      {cost:'45 张积分卡', name:'全视之眼（红）', result:'物理系 Lv.10 护身符，属性见物品资料'},
      {cost:'45 张积分卡', name:'全视之眼（蓝）', result:'魔法系 Lv.10 护身符，属性见物品资料'},
      {cost:'50 张积分卡', name:'古代的哨子', result:'双击获得 1 只 Lv.1 火焰翼龙；宠物栏已满时使用，道具消失且不会获得宠物'}
    ],
    versions: [
      {
        name:'第二次版本',
        facts:['流程与后续版本一致','丧尸设计图奖励改为异型蜂设计图','宝石箱为 Lv.9，开启后随机获得任意颜色 Lv.9 宝石，并有几率获得 Lv.9 海洋之心宝石']
      },
      {
        name:'第一次版本',
        facts:['共 7 层','最终奖励：【身体的一部分？】、【诺斯菲拉特通行证】、称号“绝影”','【身体的一部分？】鉴定后为豪克爱犬的牙、毛、眼、爪之一','集齐牙、毛、眼、爪并携带 1 级地狱妖犬，可与裘瑟贝（195,67）兑换 1 只 Lv.1 改造地狱妖犬']
      }
    ]
  },
  'catalog-ea811a83-8f76-4186-b1dc-73494b57061c': {
    replaceGenericAcquisitions: true,
    suppressCombatDrops: ['精灵的水镜'],
    keyItemExclusions: ['空间裂隙水晶'],
    acquisitionEvents: [
      {
        stepNumber: 5,
        source: '六曜之塔 1 楼与受伤的龙对话',
        certainty: '明确获得',
        rewards: [
          {name:'老龙之魂', quantity:'每名队员 1 个', note:'主流程使用'}
        ]
      },
      {
        stepNumber: 11,
        source: '再次前往六曜之塔，与受伤的龙对话',
        certainty: '明确获得',
        rewards: [
          {name:'老龙之魂', quantity:'1 个', note:'支线路线使用'}
        ]
      }
    ],
    itemDetails: [
      {
        name:'老龙之魂', kind:'Lv.8 护身符 / 流程装备',
        sources:['主流程第 5 步：六曜之塔 1 楼与受伤的龙对话','支线第 11 步：再次与受伤的龙对话'],
        facts:['耐久 2','不可交易','必须装备后由持有者与相应楼层 BOSS 对话触发战斗','主流程只需保留至少 1 个至第 10 层；支线战斗胜利后耐久增加 2 点']
      }
    ],
    exchanges: [],
    versions: []
  }
};
