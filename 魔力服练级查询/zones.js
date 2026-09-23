// 非热门练级点也纳入查询。等级以普通遭遇为主，BOSS等级写在备注中。
const MONSTER_ZONES = [
  {name:"龟裂的地下道",region:"法兰城",category:"城内隐藏地图",mobs:[1,2],monsters:"史莱姆、液态史莱姆",route:"法兰城修理工波利的家（95,49）→ 左上床边隐藏楼梯进入。",tasks:"无",difficulty:1,reliability:"medium",evidence:["maps","sinaTable"]},
  {name:"国营24坑道",region:"芙蕾雅",category:"固定洞窟",mobs:[1,5],monsters:"大蝙蝠、火蜘蛛",route:"法兰城东医院购买止痛药 → 公会换通行证 → 西门外国营24坑道。",tasks:"通行证",difficulty:2,reliability:"medium",evidence:["sinaTable"]},
  {name:"哥布林之家",region:"芙蕾雅",category:"随机洞窟",mobs:[4,10],monsters:"哥布林、红帽哥布林",route:"法兰城出城 → 芙蕾雅岛（437,308）进入。",tasks:"无",difficulty:2,reliability:"medium",evidence:["sinaTable"]},
  {name:"哈巴鲁东边洞窟前段",region:"芙蕾雅",category:"固定洞窟",mobs:[7,10],monsters:"火蜘蛛、史莱姆",route:"法兰东门出城 → 芙蕾雅岛（670,223）进入。",tasks:"无",difficulty:2,reliability:"medium",evidence:["sinaTable"]},
  {name:"牛鬼的洞窟",region:"芙蕾雅",category:"夜间随机洞窟",mobs:[9,14],monsters:"土蜘蛛、哥布林、红帽哥布林、盗贼",route:"法兰东门出城 → 芙蕾雅岛（655,184）附近，夜间寻找入口。",tasks:"夜间",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"海贼的洞窟",region:"亚留特周边",category:"任务洞窟",mobs:[11,17],monsters:"海蝙蝠、盗贼、海盗",route:"法兰 → 亚留特方向 → 区域（549,43）进入。",tasks:"白天及3样任务道具",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"奇怪的洞窟",region:"亚留特周边",category:"随机洞窟",mobs:[16,22],monsters:"地狱看门犬、僵尸、腐尸",route:"法兰 → 亚留特村 → 村外左侧（541,40）附近入口。",tasks:"无",difficulty:2,reliability:"medium",evidence:["sinaTable","forumGuide"]},
  {name:"谜之迷宫",region:"芙蕾雅",category:"白天随机迷宫",mobs:[11,15],monsters:"虎人、猫妖",route:"法兰出城 → 芙蕾雅岛（675,135）附近，白天寻找随机入口。",tasks:"白天",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"霞之洞窟",region:"伊尔周边",category:"白天随机洞窟",mobs:[3,12],monsters:"水果蝙蝠、宝贝炸弹",route:"法兰 → 伊尔村附近（690,285），白天寻找入口。",tasks:"白天",difficulty:2,reliability:"medium",evidence:["sinaTable"]},
  {name:"竞技场迷宫",region:"法兰城",category:"城内时段地图",mobs:[5,9],monsters:"大蝙蝠、迷你蝙蝠、漂浮炸弹",route:"法兰竞技场 → 左侧休息室 → 早上与士兵对话进入。",tasks:"早上开放",difficulty:1,reliability:"medium",evidence:["maps","sinaTable"]},
  {name:"暖炉之底",region:"法兰城",category:"任务地下道",mobs:[14,18],monsters:"僵尸、幽灵、史莱姆、幻影",route:"法兰旅馆领取调查请求信 → 旅馆外房后（107,30）进入。",tasks:"调查请求信；夜间",difficulty:2,reliability:"medium",evidence:["maps","sinaTable"],notes:"资料另记亡灵骑士BOSS约Lv.25。"},
  {name:"镜中豪宅",region:"法兰城",category:"任务地图",mobs:[20,24],monsters:"宝石鼠、水蓝鸟魔",route:"先取得咒器·红念珠 → 法兰豪宅（96,148）→ 厨房垃圾桶 → 地下绕行进入镜子。",tasks:"咒术师路线及红念珠",difficulty:5,reliability:"medium",evidence:["maps","sinaTable"]},
  {name:"圣拉鲁卡仓库",region:"圣拉鲁卡",category:"生产系地图",mobs:[10,12],monsters:"土蜘蛛、火蜘蛛",route:"法兰 → 圣拉鲁卡村装备店（32,70）→ 与搬运工波克波可（14,3）对话。",tasks:"生产系Lv.15以上",difficulty:2,reliability:"medium",evidence:["sinaTable"]},
  {name:"黑暗医生躲藏的家",region:"芙蕾雅",category:"随机任务地图",mobs:[6,9],monsters:"大蝙蝠、僵尸、腐尸",route:"法兰 → 魔女之间附近寻找随机出现入口。",tasks:"无",difficulty:3,reliability:"low",evidence:["sinaTable"]},
  {name:"维诺亚域",region:"维诺亚周边",category:"城外区域",mobs:[10,15],monsters:"妖草、异型蜂、红帽哥布林、黄色口臭鬼、盗贼",route:"法兰南门方向 → 维诺亚洞窟 → 抵达维诺亚村外区域。",tasks:"战斗系通常Lv.20；生产系可用3级职业物品",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"乌克兰域",region:"乌克兰周边",category:"任务区域",mobs:[14,16],monsters:"虎头蜂、异型蜂",route:"法兰 → 按忍者任务路线进入乌克兰区域。",tasks:"忍者任务路线",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"深绿的山道",region:"米内葛尔岛",category:"随机迷宫",mobs:[17,29],monsters:"树精、死亡树精、妖草、绿色口臭鬼、水蓝菇",count:"1～10",countStatus:"verified",route:"法兰 → 伊尔村乘船至阿凯鲁法村 → 南门出村向东南 → 山谷（290,436）进入。",tasks:"无",difficulty:4,reliability:"high",evidence:["deepGreen","deepGreenRoute","forumGuide"],notes:"等级随楼层上升；遇敌率很低，资料完整但当前通常不推荐作为高效率练级点。"},
  {name:"布满青苔的洞窟",region:"维诺亚周边",category:"随机洞窟",mobs:[17,26],monsters:"史莱姆、巨蝙蝠、异型蜂、土蜘蛛",route:"法兰 → 维诺亚村 → 村外北侧（380,353）进入。",tasks:"通常建议Lv.25以上",difficulty:3,reliability:"medium",evidence:["maps","sinaTable"],notes:"资料记载树精长老BOSS。"},
  {name:"黑暗医生的洞窟",region:"维诺亚村",category:"夜间任务洞窟",mobs:[17,23],monsters:"僵尸、腐尸、大蝙蝠",route:"法兰 → 维诺亚村 → 夜间从村内左下房屋后玄关进入。",tasks:"黑暗医生任务；夜间",difficulty:3,reliability:"medium",evidence:["maps","sinaTable"],notes:"试作型腐尸/牛鬼BOSS约Lv.40。"},
  {name:"黑色的祈祷",region:"索奇亚海底",category:"任务迷宫",mobs:[19,22],monsters:"血腥之刃、鬼灵",route:"法兰 → 维诺亚 → 旧海底地下2层 → 调查奇怪岩石（35,7）。",tasks:"巫师任务道具",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"忍者之家",region:"乌克兰",category:"任务地图",mobs:[16,23],monsters:"史莱姆、果冻史莱姆、忍猫、忍鼠、忍犬",route:"法兰 → 按忍者任务路线进入忍者之家。",tasks:"忍者任务",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"乌克兰井下",region:"乌克兰",category:"任务地下道",mobs:[18,20],monsters:"黄金螃蟹、致命螳螂",route:"法兰 → 按忍者任务路线抵达井下。",tasks:"忍者任务",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"奇利域",region:"索奇亚岛",category:"城外区域",mobs:[15,18],monsters:"火焰鼠、小恶魔、山贼、盗贼、螳螂、印地安仙人掌",route:"法兰 → 维诺亚 → 旧海底 → 持欧兹尼克戒指通过 → 奇利村周边。",tasks:"海底通行戒指；生产系部分例外",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"加纳域",region:"索奇亚岛",category:"城外区域",mobs:[16,22],monsters:"蓝蝎、黄蝎、武术仙人掌、兔耳仙人掌、铁剪螃蟹、狠毒鸟人、海盗、山贼、盗贼",route:"法兰 → 奇利方向 → 穿过洪恩大风洞 → 加纳村周边。",tasks:"需先抵达索奇亚岛",difficulty:5,reliability:"medium",evidence:["sinaTable"]},
  {name:"阿鲁巴斯洞窟",region:"奇利周边",category:"夜间随机洞窟",mobs:[18,22],monsters:"僵尸、腐尸、食尸鬼",route:"奇利村北侧山区（216,222）与守门腐尸相关入口。",tasks:"夜间",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"流星山丘",region:"奇利周边",category:"夜间任务地图",mobs:[18,22],monsters:"大地鼠、火焰鼠、土蜘蛛、火蜘蛛",route:"奇利村西北 → 流星山丘（202,235）。",tasks:"夜间；至少2人",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"洪恩大风洞",region:"索奇亚岛",category:"固定洞窟",mobs:[18,22],monsters:"赤目螳螂、水蜘蛛",route:"奇利区域 → 索奇亚（353,334）进入，是前往加纳的通道。",tasks:"需抵达索奇亚岛",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"罗连斯研究塔",region:"索奇亚沙漠",category:"任务高塔",mobs:[18,24],monsters:"骷髅战士、蜥蜴斗士",route:"索奇亚沙漠东600、南300附近 → 与古代装束NPC对话进入没落村庄路线。",tasks:"神眼；建议Lv.30以上",difficulty:5,reliability:"medium",evidence:["sinaTable"]},
  {name:"沙漠之祠",region:"索奇亚岛",category:"随机迷宫",mobs:[25,31],monsters:"木乃伊、杀手蝎",route:"索奇亚区域东570～640、南300～400范围寻找随机入口。",tasks:"无",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"鲶鱼洞窟",region:"加纳周边",category:"固定洞窟",mobs:[23,27],monsters:"红蝎、地龙蜥、蓝色口臭鬼、布丁史莱姆",route:"加纳村西南（626,209）进入。",tasks:"需抵达加纳",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"沙尘之洞",region:"索奇亚遗迹",category:"任务迷宫",mobs:[24,28],monsters:"地狱骷髅、风蜘蛛",route:"里谢里雅堡（48,50）取古代文明字典 → 索奇亚遗迹（624,362）由士兵队长调查进入。",tasks:"正职士兵带队",difficulty:5,reliability:"medium",evidence:["sinaTable"]},
  {name:"杰诺瓦域",region:"莎莲娜岛",category:"城外区域",mobs:[23,28],monsters:"火焰哥布林、蔓陀罗草、惨白树精、杀人蜂",route:"法兰 → 圣拉鲁卡方向 → 莎莲娜海底洞窟 → 杰诺瓦村周边。",tasks:"战斗系通常Lv.40；其他职业条件不同",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"蒂娜域",region:"莎莲娜岛",category:"城外区域",mobs:[27,31],monsters:"惨白树精、死亡树精、兔耳蝙蝠、水晶螃蟹、死灰螳螂",route:"杰诺瓦村北门出发 → 沿路前往蒂娜村周边。",tasks:"需先通过莎莲娜海底洞窟",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"夜之蒂娜村",region:"蒂娜村",category:"夜间城内遭遇",mobs:[31,34],monsters:"血骷髅、死灵、海盗",route:"法兰 → 蒂娜村 → 夜间按海贼指挥部任务触发。",tasks:"海贼指挥部任务；夜间",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"阿巴尼斯域",region:"莎莲娜岛",category:"城外区域",mobs:[31,33],monsters:"北极熊、烈风鸟人",route:"法兰 → 杰诺瓦方向 → 通过地下道抵达阿巴尼斯村周边。",tasks:"需先通过莎莲娜海底洞窟",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"莎莲娜海底洞窟",region:"莎莲娜通道",category:"固定洞窟",mobs:[25,27],monsters:"绿色口臭鬼、果冻史莱姆",route:"法兰西侧区域 → 芙蕾雅岛（200,163）进入。",tasks:"战斗系通常Lv.40；生产系/通行证有不同条件",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"贝兹雷姆迷宫",region:"莎莲娜岛",category:"随机迷宫",mobs:[34,36],monsters:"大炸弹、大地翼龙",route:"莎莲娜岛（135,334）进入。",tasks:"通常Lv.40以上",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"阿斯提亚参道",region:"莎莲娜岛",category:"任务固定地图",mobs:[33,35],monsters:"赤目黑熊、人魔草",route:"莎莲娜岛（260,360）进入参道。",tasks:"战斗系击倒神兽；生产系资深",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"斋戒",region:"阿斯提亚",category:"任务迷宫",mobs:[36,38],monsters:"武装骷髅、火焰之刃、亡灵、冰怪",route:"穿过参道 → 阿斯提亚镇 → 神殿大厅与祭司对话，男女路线分开。",tasks:"开启者试炼路线",difficulty:5,reliability:"medium",evidence:["sinaTable"]},
  {name:"通往阿巴尼斯的地下道",region:"莎莲娜岛",category:"固定地下道",mobs:[34,36],monsters:"恶魔猫、胖蝙蝠",route:"莎莲娜岛（235,338）进入，是通往阿巴尼斯的路线。",tasks:"需抵达莎莲娜岛",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"海贼指挥部",region:"蒂娜周边",category:"任务地图",mobs:[31,34],monsters:"土蜘蛛、血骷髅、死灵、海盗",route:"法兰 → 蒂娜村 → 按海贼指挥部任务路线进入。",tasks:"海贼指挥部任务",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"前往冰冻大陆的洞穴",region:"莎莲娜岛",category:"任务洞窟",mobs:[35,37],monsters:"猫人、扫把蝙蝠",route:"莎莲娜任务路线 → 通过洞穴前往冰冻大陆。",tasks:"王宫阶级及传说中的勇者称号",difficulty:5,reliability:"medium",evidence:["sinaTable"]},
  {name:"青龙的洞窟",region:"魔法大学",category:"校内洞窟",mobs:[23,28],monsters:"巨蝙蝠、寒冰翼龙、恶梦鼠、骷髅战士",route:"魔法大学东北（106,54）进入。",tasks:"需抵达魔法大学",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"科学家的牢房",region:"魔法大学",category:"任务地下道",mobs:[19,21],monsters:"史莱姆、液态史莱姆、果冻史莱姆、布丁史莱姆",route:"魔法大学实验室（133,49）进入。",tasks:"任务路线；资料记载Lv.40以上",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"诅咒的迷宫全层",region:"阿巴尼斯周边",category:"大型任务迷宫",mobs:[38,55],monsters:"地狱猎犬、大地翼龙、罗刹、血腥之刃、蜥蜴斗士、猎豹蜥蜴、迷你石像怪、宝贝炸弹、幽灵、凶暴仙人掌",route:"阿巴尼斯村向西 → 鼓动的石碑（54,162）→ 进入60层迷宫。",tasks:"王宫阶级及传说中的勇者称号",difficulty:5,reliability:"medium",evidence:["sinaTable","oldGuide"]},
  {name:"积雪的山道全段",region:"阿巴尼斯周边",category:"随机山道",mobs:[39,45],monsters:"地狱妖犬、丧尸",route:"法兰 → 阿巴尼斯村 → 村外西侧山道入口。",tasks:"需抵达阿巴尼斯",difficulty:3,reliability:"medium",evidence:["sinaTable","oldGuide"]},
  {name:"冰之洞窟",region:"佛利波罗岛",category:"固定洞窟",mobs:[57,59],monsters:"妖狐、黑暗鸟人",route:"击败依代 → 与神官（15,5）对话传送佛利波罗岛 → 东北（97,166）进入。",tasks:"开启者及依代路线",difficulty:5,reliability:"medium",evidence:["sinaTable","oldGuide"]},
  {name:"冰雪的牢城",region:"佛利波罗岛",category:"大型任务地图",mobs:[46,62],monsters:"堕天使、恶魔、幻影、旋律影子、暗影、阴影、大地鼠、火焰鼠",route:"佛利波罗岛（174,103）进入。",tasks:"佛利波罗/BBA任务路线",difficulty:5,reliability:"medium",evidence:["sinaTable"]},
  {name:"亚诺曼域",region:"亚诺曼王国",category:"城外区域",mobs:[5,22],monsters:"小恶魔、死亡蜂、螳螂、蓝色口臭鬼、史莱姆、狠毒鸟人、杀人螳螂、冰冷树精、山贼、树精、惨白树精",route:"法兰城传送点 → 亚诺曼城 → 出城。",tasks:"生产系通常Lv.25；战斗系通常Lv.40才可出城",difficulty:2,reliability:"medium",evidence:["sinaTable"]},
  {name:"尼维尔海域",region:"亚诺曼王国",category:"城外区域",mobs:[7,24],monsters:"小蝙蝠、绿色口臭鬼、武术仙人掌、赤熊、红色口臭鬼、火焰鼠、哥布林、赤目螳螂",route:"亚诺曼城出城向右 → 前往尼维尔海村方向。",tasks:"需抵达亚诺曼",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"摩顿域",region:"亚诺曼王国",category:"城外区域",mobs:[12,17],monsters:"赤目螳螂、蓝色口臭鬼、山贼、海盗、树精、惨白树精",route:"亚诺曼村外向右下 → 穿过通往摩顿村的通道。",tasks:"需抵达亚诺曼",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"克瑞域",region:"亚诺曼王国",category:"城外区域",mobs:[14,22],monsters:"冰冷树精、山贼",route:"亚诺曼东门 → 左上进入立葛曲洞 → 出洞后抵达。",tasks:"需抵达亚诺曼",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"雷欧娜海滩",region:"东岛",category:"城外区域",mobs:[61,65],monsters:"巨蝙蝠、蜥蜴斗士",route:"完成前往东岛任务 → 雷欧娜村东门外（404,94）附近。",tasks:"前往东岛或偷闲的船长",difficulty:5,reliability:"medium",evidence:["sinaTable","oldGuide"]},
  {name:"里欧波多洞窟全段",region:"亚诺曼城外",category:"大型随机洞窟",mobs:[20,50],monsters:"哥布林、红帽哥布林、虎人、地狱看门犬、水果蝙蝠、漂浮炸弹、宝贝炸弹、火焰哥布林",route:"亚诺曼城西门外 → 与路霸对话 → 进入洞窟。",tasks:"消失的歌手任务路线",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"翠格墓园",region:"亚诺曼城外",category:"任务场景",mobs:[20,24],monsters:"僵尸、骷髅战士、幽灵",route:"亚诺曼城外（34,27），穿越时空任务场景。",tasks:"穿越时空任务",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"通往摩顿村的通道",region:"亚诺曼城外",category:"固定通道",mobs:[24,27],monsters:"大地鼠、土蜘蛛、火蜘蛛、大炸弹",route:"亚诺曼城外（365,548）进入。",tasks:"需抵达亚诺曼",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"利利可洞窟",region:"摩顿村",category:"随机洞窟",mobs:[31,35],monsters:"大地鼠、土蜘蛛、火蜘蛛、大炸弹",route:"摩顿村通道（365,548）→ 进入传送水晶。",tasks:"流浪乐师任务路线",difficulty:4,reliability:"medium",evidence:["sinaTable"]},
  {name:"立葛曲洞",region:"德威特岛",category:"固定通道",mobs:[28,32],monsters:"红蝎、杀手蝎",route:"亚诺曼城外德威特岛（377,87）进入，是前往克瑞村通道。",tasks:"需抵达亚诺曼",difficulty:3,reliability:"medium",evidence:["sinaTable"]},
  {name:"贝利斯遗迹",region:"亚诺曼王国",category:"任务遗迹",mobs:[31,50],monsters:"血骷髅、大蝙蝠",route:"湖中央遗迹 → 与（313,166）官兵对话进入。",tasks:"巴克达的情报",difficulty:5,reliability:"medium",evidence:["sinaTable"]}
];

MONSTER_ZONES.forEach(zone => {
  zone.modes = ["browse"];
  zone.count ??= "待核验";
  zone.countStatus ??= "pending";
  zone.crystal ??= "属性建议待核验";
  zone.aliases ??= `${zone.region} · ${zone.category}`;
  zone.notes ??= "该地点用于怪物等级分布查询，不代表适合当前等级练级。";
});

const deepGreenZone = MONSTER_ZONES.find(zone => zone.name === "深绿的山道");
deepGreenZone.modes = ["browse", "level"];
deepGreenZone.player = [12, 25];
deepGreenZone.crystal = "风地";
