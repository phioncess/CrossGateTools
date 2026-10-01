// 独立补充数据，不会被职业资料 build.mjs 重建覆盖。
window.CAREER_POINTS_DATA = {
  scope: '怀旧服 · 任务/练级参考 · 1～120级模拟',
  attributes: ['体力', '力量', '强度', '速度', '魔法'],
  rules: { initial: 30, perLevel: 4, singleFraction: 0.5, minLevel: 1, maxLevel: 120 },
  sources: [
    { title: '魔力百科：怀旧服120级加点参考（伊人）', url: 'https://molibaike.cn/index/newbie/2312.html' },
    { title: '新浪：初始点数与单项上限', url: 'https://games.sina.com.cn/o/z/cross/2006-08-11/1513247926.shtml' },
    { title: '新浪：每级4点BP', url: 'https://games.sina.com.cn/z/cross/2004-03-14/115606.shtml' }
  ],
  note: '原攻略只提供120级配点，且注明为个人见解。各级推荐由工具按目标比例逐点分配、受单项上限约束推算，不是原攻略逐级方案；不含装备、种子与面板属性。模拟范围1～120级不代表服务器等级上限。',
  profiles: [
    { career: '弓箭手', mode: '任务/练级', target: [133,253,0,120,0], image: '弓箭手加点来源.png' },
    { career: '格斗士', mode: '练级', target: [113,253,0,140,0], image: '格斗士加点来源.png' },
    { career: '格斗士', mode: '任务', target: [138,228,0,140,0], image: '格斗士加点来源.png' },
    { career: '剑士', mode: '任务', target: [190,186,0,130,0], image: '剑士加点来源.png' },
    { career: '骑士', mode: '练级', target: [103,253,0,150,0], image: '骑士加点来源.png' },
    { career: '骑士', mode: '任务·体速', target: [253,0,0,253,0], image: '骑士加点来源.png' },
    { career: '骑士', mode: '任务·体力', target: [240,146,0,120,0], image: '骑士加点来源.png' },
    { career: '忍者', mode: '任务/练级', target: [253,0,100,153,0], image: '忍者加点来源.png' },
    { career: '士兵', mode: '练级', target: [156,240,0,110,0], image: '士兵加点来源.png' },
    { career: '士兵', mode: '任务', target: [253,0,0,140,113], image: '士兵加点来源.png' },
    { career: '魔术师', mode: '练级', target: [0,0,0,253,253], image: '魔术师加点来源.png' },
    { career: '魔术师', mode: '任务', target: [123,0,0,130,253], image: '魔术师加点来源.png' },
    { career: '传教士', mode: '任务/练级', target: [253,0,0,130,123], image: '传教士加点来源.png' },
    { career: '巫师', mode: '任务/练级', target: [253,0,0,140,113], image: '巫师加点来源.png' },
    { career: '战斧斗士', mode: '练级', target: [153,253,0,100,0], image: '战斧斗士加点来源.png' },
    { career: '战斧斗士', mode: '任务·速度120', target: [253,133,0,120,0], image: '战斧斗士加点来源.png' },
    { career: '战斧斗士', mode: '任务·速度150', target: [253,103,0,150,0], image: '战斧斗士加点来源.png' },
    { career: '咒术师', mode: '任务/练级', target: [253,0,0,150,103], image: '咒术师加点来源.png' }
  ]
};
