// 怀旧服练级指南补充数据。
// 本文件只补充/修正 data.js 与 zones.js，避免重复维护基础资料。
(function applyLevelingGuideSupplement() {
  SOURCES.levelGuide = {
    name: "魔力百科｜怀旧服练级地点指南",
    url: "https://www.molibaike.com/Page/Detail/ba563819-8462-4c5c-aca0-0ecda638ddb1"
  };

  const byName = new Map(PLACES.map(place => [place.name, place]));
  const update = (name, values) => Object.assign(byName.get(name), values);
  const add = place => {
    if (byName.has(place.name)) return;
    const complete = Object.assign({
      modes: ["level"], count: "待核验", countStatus: "pending",
      source: "levelGuide", levelScope: "全区域等级范围"
    }, place);
    PLACES.push(complete);
    byName.set(complete.name, complete);
  };

  update("内心世界外层", {
    name: "内心世界",
    aliases: "内心 · 外层 · 水晶内1～3层",
    player: [20, 40], mobs: [29, 39], levelScope: "随区域变化",
    levelBands: [
      {label:"水晶内1层", mobs:[29,33], route:"优先选择水晶内1层。"},
      {label:"外层", mobs:[32,39], route:"外层为固定地图。"},
      {label:"水晶内2层", mobs:[32,36], route:"进入水晶内2层。"},
      {label:"水晶内3层", mobs:[34,38], route:"进入水晶内3层。"}
    ],
    notes:"怪物等级按外层和水晶内层分别记录；推荐会依据当前人物等级选择更合适的区域。"
  });
  update("雪山", {
    mobs:[39,46], levelScope:"随区域变化",
    levelBands:[
      {label:"积雪的山路",mobs:[39,42],route:"在积雪的山路练级。"},
      {label:"雪山之顶",mobs:[44,46],route:"抵达山顶后在小屋附近练级。"}
    ]
  });
  update("坎那贝拉村门口", {mobs:[40,44], monsters:"树精、翠绿菇、海底龟、异型蜂", levelScope:"全区域等级范围"});
  update("炎之洞窟", {mobs:[40,50], monsters:"罗刹、地狱猎犬", crystal:"任意", levelScope:"全区域等级范围", notes:"45级可进入；Lv.40～50为洞窟全区域记录，不表示每层怪物等级相同。"});
  update("水之洞窟", {mobs:[54,61], crystal:"任意", levelScope:"全区域等级范围"});
  update("兰国第五等勋章路线", {
    aliases:"五等勋章 · 大树 · 兰五/艾五", mobs:[66,68], levelScope:"随区域变化",
    levelBands:[
      {label:"地下1层",mobs:[66,66],route:"大树地下1层固定为Lv.66。"},
      {label:"大树主区域",mobs:[67,68],route:"在大树主区域练级。"}
    ]
  });

  add({name:"沉封之窟",aliases:"沉封 · 魔龙德拉贡练级点",player:[23,40],mobs:[28,39],monsters:"哥布林、烈风哥布林",crystal:"火风",route:"热带密林（72,77）奇怪洞窟大门 → 输入“艾斯潘蓝沙” → 沉封之窟。",tasks:"《魔龙德拉贡》推进至可进入沉封之窟",difficulty:4,reliability:"high",notes:"约8层；冷门练级点，比内心相对安全。"});
  add({name:"莎莲娜东方洞窟",aliases:"东方洞窟 · 前往冰冻大陆的洞穴",player:[30,40],mobs:[35,37],monsters:"猫人、扫把蝙蝠",crystal:"火 / 水火强袭",route:"蒂娜村北门 → 莎莲娜岛（528,209）与克里斯多夫祭司对话。",tasks:"2转且拥有“开启者”称号；关联《冰雪的牢城》",difficulty:4,reliability:"high",audience:"宠物／生产系"});
  add({name:"峡之洞窟（地下）",aliases:"牛鬼的逆袭 · 峡洞",player:[37,50],mobs:[42,46],monsters:"鬼灵、巨狼",crystal:"水",route:"按《牛鬼的逆袭》推进至第9步抵达地下练级区。",tasks:"每队准备一个赖光的头盔；《牛鬼的逆袭》任务中",difficulty:5,reliability:"high"});
  add({name:"远古地下水脉",aliases:"新村4水脉",player:[43,50],mobs:[48,50],monsters:"土蜘蛛、铁钳螃蟹",crystal:"地风",count:"2～8",countStatus:"verified",route:"西尔维村沿河向北 →（304,95）进入远古地下水脉。",tasks:"完成新大陆系列1～3；《商贸都市》路线",difficulty:4,reliability:"high"});
  add({name:"悠远之所",aliases:"改精2 · 四精的祝福",player:[50,65],mobs:[49,59],monsters:"大炸弹、液态史莱姆、烈风翼龙、地龙蜥",crystal:"火 / 火风",count:"6或10",countStatus:"verified",route:"按《四精的祝福》推进至悠远之所，不必完成全部任务。",tasks:"完成《镇抚四方》",difficulty:5,reliability:"high"});
  add({name:"新城外",aliases:"雷克亚克平原 · 新城门口",player:[47,60],mobs:[51,53],monsters:"蓝色口臭鬼、虎头蜂",crystal:"风地",count:"1～10",countStatus:"verified",route:"西尔维村 → 远古地下水脉 → 雷克亚克平原（108,164）新城门口。",tasks:"完成新大陆系列1～3；《商贸都市》路线",difficulty:5,reliability:"high"});
  add({name:"大雷",aliases:"雷姆尔山旧道",player:[50,60],mobs:[47,51],monsters:"火焰啄木鸟、虎头蜂",crystal:"水火",route:"哥拉尔镇外（331,361），人物Lv.50以上进入大雷区域。",tasks:"Lv.50以上",difficulty:3,reliability:"high"});
  add({name:"阿凯鲁法村外",aliases:"阿凯村外",player:[1,10],mobs:[11,13],monsters:"水蓝菇、迷你石像怪",crystal:"风地",count:"最多4",countStatus:"verified",route:"使用阿凯鲁法传送券或乘船抵达阿凯鲁法村后出村。",tasks:"无；怀旧服无法定居",difficulty:3,reliability:"high"});
  add({name:"亚留特村外",aliases:"亚村外",player:[5,11],mobs:[9,13],monsters:"冰冷树精、鸟人",crystal:"风地",route:"法兰东门 → 哈巴鲁东边洞穴 → 亚留特村外。",tasks:"Lv.12可使用亚留特传送石",difficulty:2,reliability:"high"});
  add({name:"南恰拉山第1通道",aliases:"南恰拉1",player:[10,20],mobs:[18,20],monsters:"鬼灵、顽皮炸弹",crystal:"纯水",count:"最多8",countStatus:"verified",route:"阿凯鲁法村外（283,457），沿米内葛尔岛海岸线抵达。",tasks:"参考《路霸阿德基姆》",difficulty:4,reliability:"high"});
  add({name:"南恰拉山第2通道",aliases:"南恰拉2",player:[16,25],mobs:[21,23],monsters:"武装骷髅、巨牙",crystal:"纯地 / 地水",count:"最多10",countStatus:"verified",route:"经第1通道，再由米内葛尔岛（314,399）入口进入。",tasks:"参考《路霸阿德基姆》",difficulty:4,reliability:"high"});
  add({name:"里欧波多洞窟练宠区",aliases:"里洞 · 里欧波多洞窟",player:[10,20],mobs:[20,24],monsters:"虎人、地狱看门犬、宝贝炸弹、水果蝙蝠",crystal:"风地",count:"最多10",countStatus:"verified",route:"亚诺曼西门外（129,295）→ 交300G → 黄色传送石。",tasks:"人物Lv.25前不能出城，主要由高等级角色带宠",difficulty:3,reliability:"high",audience:"宠物"});
  add({name:"莎莲娜海底洞窟练宠区",aliases:"莎莲娜海底",player:[20,25],mobs:[25,27],monsters:"绿色口臭鬼、果冻史莱姆",crystal:"任意",route:"按莎莲娜海底路线进入。",tasks:"生产系需伪造的通行证；医生/护士Lv.25可进入",difficulty:4,reliability:"high",audience:"宠物／生产系"});
  add({name:"沙尘之洞练级区",aliases:"沙尘之洞",player:[20,25],mobs:[24,29],monsters:"风蜘蛛、地狱骷髅",crystal:"地",route:"按《沙尘之洞》任务路线进入。",tasks:"正职及以上士兵带队",difficulty:4,reliability:"high"});
  add({name:"风之洞窟练级区",aliases:"风洞 · 风之洞窟",player:[20,30],mobs:[26,30],monsters:"虎人、战猫、迷你石像怪、漂浮炸弹、黄蜂、风蜘蛛",crystal:"任意",route:"奇利村东南（369,351）进入；10层与20层为固定练级层。",tasks:"战斗系及医生护士Lv.30；游民/其他生产系无限制",difficulty:4,reliability:"high",audience:"游民／生产系／宠物",levelScope:"随楼层变化",levelBands:[{label:"随机层",mobs:[26,29],route:"随机迷宫楼层。"},{label:"10层／20层",mobs:[30,30],route:"10层黄蜂、20层风蜘蛛，数量多且较弱。"}]});
  add({name:"六等勋章·地下遗迹",aliases:"六等地下遗迹 · 兰六/艾六",player:[40,55],mobs:[44,49],monsters:"粉红菇、山贼",crystal:"地水",count:"2～7",countStatus:"verified",route:"在《暗杀犯追迹》任务途中进入地下遗迹。",tasks:"完成八等、七等勋章任务",difficulty:5,reliability:"high"});
  add({name:"鲁米那斯村外",aliases:"鲁村外",player:[45,50],mobs:[45,46],monsters:"口袋龙、地狱看门犬",crystal:"火风",route:"从哥拉尔镇步行前往鲁米那斯村后出村。",tasks:"鲁村无传送石",difficulty:4,reliability:"high"});
  add({name:"米诺基亚镇外",aliases:"米村外",player:[45,50],mobs:[46,47],monsters:"赤目螳螂、烟雾",crystal:"火风",route:"开通后可从哥拉尔传送前往米诺基亚镇。",tasks:"《沉默之龙》第一步；战斗系Lv.45/生产系Lv.25可用传送石",difficulty:4,reliability:"high"});
  add({name:"六等勋章·动物实验室",aliases:"动物实验室 · 兰六/艾六",player:[60,70],mobs:[65,65],monsters:"猫妖、虎人",crystal:"任意",route:"《暗杀犯追迹》中击败小豆后选择“否”，进入动物实验室。",tasks:"完成八等、七等勋章任务",difficulty:5,reliability:"high"});

  const deepGreen = MONSTER_ZONES.find(zone => zone.name === "深绿的山道");
  Object.assign(deepGreen, {
    modes:["browse","level"], player:[12,25], crystal:"风地", source:"levelGuide",
    aliases:"深绿 · 深绿山道", levelScope:"随高度逐级变化",
    levelBands:Array.from({length:13}, (_, index) => ({
      label:`${(index + 1) * 100}M`, mobs:[17 + index, 17 + index],
      route:`前往深绿的山道 ${(index + 1) * 100}M。`
    }))
  });

  const iceCave = MONSTER_ZONES.find(zone => zone.name === "冰之洞窟");
  Object.assign(iceCave, {modes:["browse","level"],player:[54,70],crystal:"水火",source:"levelGuide",aliases:"冰洞 · 冰之洞窟",levelScope:"全区域等级范围"});
  const beach = MONSTER_ZONES.find(zone => zone.name === "雷欧娜海滩");
  Object.assign(beach, {modes:["browse","level"],player:[60,70],crystal:"任意",source:"levelGuide",aliases:"沙滩 · 雷欧娜海滩",levelScope:"全区域等级范围",audience:"敏魔"});

  // 去掉到达路线后，单独保存“进入条件来自哪个任务”，避免只显示称号/道具而没有出处。
  const prerequisites = {
    "灵堂": {relatedTasks:["城内的地下迷宫"], requirements:"无须完成任务；人物Lv.10以上，清晨或黄昏进入。"},
    "内心世界": {relatedTasks:["沉睡的精灵"], requirements:"由2转资深医生或护士带队付费进入；并非要求队员完成该任务。"},
    "路霸后": {relatedTasks:["路霸阿德基姆"], requirements:"队伍中至少一人持有该任务取得的【大地的结晶】，否则需要进行两连战。"},
    "雪山": {relatedTasks:["积雪的山路"], requirements:"练级点位于任务关联地图；建议先开阿巴尼斯传送。"},
    "坎那贝拉村门口": {relatedTasks:["路霸阿德基姆"], requirements:"完成开村路线或使用可用的传送方式抵达坎村。"},
    "西尔维村门口": {relatedTasks:["受袭的商船","登陆北方冰原","遇难的渔夫"], requirements:"完成新大陆系列1～3，开放西尔维村路线。"},
    "贡品之路": {relatedTasks:["被夺走的贡品"], requirements:"练级点在贡品任务路线中；蒂娜传送通常要求人物Lv.45。"},
    "雷克塔尔镇外": {relatedTasks:["踏足诺斯菲拉特","重拾勇气的掘地族"], requirements:"可走任务开通路线；使用雷克塔尔镇传送券时可不走完整任务链。"},
    "炎之洞窟": {relatedTasks:["炎之洞窟"], requirements:"人物Lv.45以上，从维诺亚村外进入。"},
    "诅咒迷宫31～40层": {relatedTasks:["诅咒的迷宫"], requirements:"限定2转职业；击败前三个守关BOSS并取得【圣诏之三】后进入31～40层。"},
    "冰树": {relatedTasks:["史莱姆的回忆"], requirements:"队伍中一人持有该任务取得的【手电筒】即可，不要求完成任务后续。"},
    "水之洞窟": {relatedTasks:["水之洞窟"], requirements:"人物Lv.60以上可进入；练级不要求完成水之斗神流程。"},
    "巴洛斯岛": {relatedTasks:["开启者","冰雪的牢城","风鸣之塔","牛场物语"], requirements:"完成BBA相关前置，并通过《牛场物语》取得【空间裂隙水晶】。"},
    "兰国第五等勋章路线": {relatedTasks:["商队的袭击","人鱼之泪","暗杀犯追迹","返魂之珠"], requirements:"先完成八、七、六等勋章；练级点位于五等勋章任务的大树区域。"},
    "半山": {relatedTasks:["彷徨的亡灵","亡者之镇","圣鸟之谜","小岛之谜"], requirements:"完成半山1、2、3、5并取得“背叛者”称号。"},
    "砍狗": {relatedTasks:["被夺走的贡品","泰格利的烦恼","丧失心智的海盗","蒂娜沉船遗迹"], requirements:"完成系列前三部，并在《蒂娜沉船遗迹》中取得【绿色三棱石】。"},
    "兰一 / 艾一": {relatedTasks:["商队的袭击","人鱼之泪","暗杀犯追迹","返魂之珠","哥拉尔的晚宴","天帝之证","沉默的诺利","盲目的艾汀","失忆的杜瓦"], requirements:"完成八等至三等勋章及三项追加任务，同时持有【隶属的项链】。"},
    "柯村": {relatedTasks:["开启者","冰雪的牢城","风鸣之塔","六曜之塔","踏足诺斯菲拉特","重拾勇气的掘地族"], requirements:"完成龙之沙漏系列1～4取得“解放者”，再取得【贝尼恰斯教团许可】；永久路线建议完成掘地族任务。"},
    "砍龙": {relatedTasks:["冰雪的牢城","风鸣之塔","深渊","消亡之地","抉择之刻","白之意志、黑之意志"], requirements:"需2转、拥有“解放者”称号，并完成对应黑白龙路线取得进入凭证。"},
    "玄武之渊": {relatedTasks:["亚留特的守护","维诺亚牛的守护","奇利的诱拐事件","玄武之境"], requirements:"常规路线需“玄武的邀约”、3转并在《玄武之境》推进到第8步；玄武秘术卷轴可单人直飞。"},
    "沉封之窟": {relatedTasks:["魔龙德拉贡"], requirements:"任务推进到第7步，输入“艾斯潘蓝沙”进入；不必完成BOSS战。"},
    "莎莲娜东方洞窟": {relatedTasks:["开启者","冰雪的牢城"], requirements:"当前职业2转且拥有“开启者”称号；在《冰雪的牢城》第1步进入。"},
    "峡之洞窟（地下）": {relatedTasks:["牛鬼讨伐","牛鬼的逆袭"], requirements:"每队准备一个《牛鬼讨伐》取得的【赖光的头盔】，再将《牛鬼的逆袭》推进到第9步。"},
    "远古地下水脉": {relatedTasks:["受袭的商船","登陆北方冰原","遇难的渔夫","商贸都市"], requirements:"完成新大陆系列1～3；在《商贸都市》第2步进入。"},
    "悠远之所": {relatedTasks:["镇抚四方","四精的祝福"], requirements:"完成《镇抚四方》，再将《四精的祝福》推进到悠远之所；不必完成后续。"},
    "新城外": {relatedTasks:["受袭的商船","登陆北方冰原","遇难的渔夫","商贸都市"], requirements:"完成新大陆系列1～3；按《商贸都市》路线穿过远古地下水脉。"},
    "南恰拉山第1通道": {relatedTasks:["路霸阿德基姆"], requirements:"通道本身无任务完成要求；任务页提供相关开村与区域路线。"},
    "南恰拉山第2通道": {relatedTasks:["路霸阿德基姆"], requirements:"通道本身无任务完成要求；需先经过第1通道。"},
    "莎莲娜海底洞窟练宠区": {relatedTasks:["就职咒术师"], requirements:"生产系需该任务第1步取得的【伪造的通行证】；医生、护士人物Lv.25可进入。"},
    "沙尘之洞练级区": {relatedTasks:["沙尘之洞"], requirements:"需要正职及以上士兵带队进入。"},
    "风之洞窟练级区": {relatedTasks:["风之洞窟"], requirements:"战斗系、医生、护士需人物Lv.30；游民和其他生产系无等级限制。"},
    "六等勋章·地下遗迹": {relatedTasks:["商队的袭击","人鱼之泪","暗杀犯追迹"], requirements:"完成八等、七等勋章；在《暗杀犯追迹》第2步进入地下遗迹。"},
    "米诺基亚镇外": {relatedTasks:["沉默之龙"], requirements:"开通与传送条件见任务第1步备注；战斗系Lv.45、生产系Lv.25可用传送石。"},
    "六等勋章·动物实验室": {relatedTasks:["商队的袭击","人鱼之泪","暗杀犯追迹"], requirements:"完成八等、七等勋章；在《暗杀犯追迹》击败小豆后选择“否”。"},
    "深绿的山道": {relatedTasks:["再生花园"], requirements:"无须完成任务即可进入；《再生花园》仅为关联任务。"},
    "冰之洞窟": {relatedTasks:["开启者","冰雪的牢城"], requirements:"当前职业2转且拥有“开启者”称号，在《冰雪的牢城》中击败依代后进入。"},
    "雷欧娜海滩": {relatedTasks:["前往东岛","偷闲的船长"], requirements:"完成其中一个任务以开通雷欧娜村传送路线。"}
  };
  [...PLACES, ...MONSTER_ZONES].forEach(place => Object.assign(place, prerequisites[place.name] || {}));
})();
