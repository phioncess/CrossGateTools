import fs from 'node:fs';
const dataPath = new URL('../data-src/quests.json', import.meta.url);
const database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const v=(l,x={})=>({...x,sourceLines:l,verification:{status:'verified',method:'manual-semantic-review'}});
const input=(item,line,x={})=>v([line],{item,quantity:1,action:'hand-over',...x});
const output=(item,line,x={})=>v([line],{item,quantity:1,acquisition:'guaranteed',...x});
const step=(id,order,text,lines,inputs=[],outputs=[],x={})=>v(lines,{id,order,text,inputs,outputs,notes:[],...x});
const ri=(id,name,lines,x={})=>v(lines,{id,name,role:'valuable-result',...x});
const re=(id,kind,lines,items,x={})=>v(lines,{id,version:'common',tier:'common',kind,items,...x});
function curate(id,name,c){const q=database.quests[id];if(!q||q.name!==name)throw new Error(`任务不匹配：${id}/${name}`);if(c.lineTypes.length!==q.source.lineCount)throw new Error(`${name}行类型错误`);q.schemaVersion=2;q.verification={status:'verified',method:'manual-semantic-review',reviewedSourceRanges:[[1,q.source.lineCount]],note:'全部原文行已逐条核验。'};q.requirements={conditions:c.requirements||[]};q.relations=c.relations||{prerequisites:[],itemSources:[],references:[]};q.flow={start:v(c.steps[0].sourceLines,{stepId:c.steps[0].id,location:c.startLocation}),steps:c.steps,notes:c.flowNotes||[]};q.versions={common:{key:'common',label:'通用',changes:[],tiers:{common:{key:'common',label:'通用',order:0,battles:c.battles||{},encounters:c.encounters||[],media:c.media||[],notes:[]}}}};q.rewardEvents=c.rewardEvents||[];q.outcomes=c.outcomes||{titles:[],careers:[],skills:[]};q.segments=q.source.rawLines.map((r,i)=>v([r.line],{line:r.line,text:r.text,type:c.lineTypes[i]}));q.itemEvents={inputs:c.steps.flatMap(s=>s.inputs.map(e=>({...e,step:s.id,version:'common',tier:'common'}))),acquisitions:c.steps.flatMap(s=>s.outputs.map(e=>({...e,step:s.id,version:'common',tier:'common'})))};delete q.legacy;}

curate('catalog-5961ff25-9c23-4e6e-b7c9-dfd2851a470c','寻找雷兹',{
 startLocation:'伊尔村医院猎人柯萨裘（21.11）',requirements:[v([11],{type:'inventory-absence',item:'旅行干粮',reason:'持有时不可重解'})],relations:{prerequisites:[],itemSources:[],references:[v([6],{type:'known-issue-reference',target:'采集設定(參考)',item:'雷兹打猎用的弓'}),v([12],{type:'story',target:'寻找雷兹任务剧情对话'})]},
 steps:[step('step-1',1,'与猎人柯萨裘（21.11）对话，选择“是”，获得【雷兹的肖像画】。',[1],[],[output('雷兹的肖像画',1,{properties:{tradeable:false}})]),step('step-2',2,'与亚留特村猎人雷兹（47.47）对话：选择“是”交出肖像画，获得【雷兹的信】和【弓？】并继续；选择“否”交出肖像画后任务直接结束。',[2,3,4,5,6,7,8],[input('雷兹的肖像画',2)],[output('雷兹的信',3,{condition:'choice=yes'}),output('弓？',3,{condition:'choice=yes'})],{choices:[v([3],{value:'是',outputs:['雷兹的信','弓？'],continues:true}),v([7],{value:'否',outputs:[],endsQuest:true})]}),step('step-3',3,'返回伊尔村医院与柯萨裘对话，交出【雷兹的信】和【弓？】，获得【旅行干粮】，任务完结。',[9,10,11],[input('雷兹的信',9),input('弓？',9)],[output('旅行干粮',9)])],
 rewardEvents:[re('reward-rez-bow','branch-reward',[3,4,5,6],[ri('rez-hunting-bow','弓？',[3,4,5,6],{entityType:'equipment',identifiedName:'雷兹打猎用的弓',properties:{level:1,category:'弓',durability:100,attack:1,tradeable:false,knownIssue:'对采集技能无效；来源备注推测为参数设置错误'}})],{step:'step-2',choice:'是'}),re('reward-travel-rations','quest-completion',[9,10],[ri('travel-rations','旅行干粮',[9,10],{properties:{level:1,category:'料理',magicRecovery:15,tradeable:false,droppable:true,bankable:true}})],{step:'step-3'})],
 lineTypes:['step','choice-step','choice-branch','reward-detail','reward-detail','known-issue','choice-branch','item-detail','step','reward-detail','gate','reference']
});

{
 const battle=v([6,7],{id:'battle-1',order:1,kind:'boss-battle',title:'亡者之影',triggerStep:'step-6',overview:v([6],{text:'与亡者之影（30.10）对话进入战斗。'}),enemies:{'enemy-1':v([7],{id:'enemy-1',name:'亡者之影',level:{min:20,max:20},hp:{min:4000,max:4000,approximate:true},count:1,skills:['连击','冰冻魔法'],raw:'Lv.20亡者之影，血量约4000；技能：连击、冰冻魔法'})}});
 curate('catalog-c21783e0-f0a6-4589-9593-51ae13f6e618','愚人之镜中世界',{
  startLocation:'法兰城豪宅管家（95.148）',requirements:[v([2,3,4],{type:'time-window',value:'夜晚',appliesToSteps:['step-2','step-3','step-4']})],
  steps:[step('step-1',1,'与豪宅管家（95.148）对话，获得【线索一】。',[1],[],[output('线索一',1)]),step('step-2',2,'夜晚与伊尔村幽灵盗贼（54.90）对话，交出【线索一】，获得【线索二】。',[2],[input('线索一',2)],[output('线索二',2)]),step('step-3',3,'夜晚与亚留特村惊慌的鬼灵（36.81）对话，交出【线索二】，获得【线索三】。',[3],[input('线索二',3)],[output('线索三',3)]),step('step-4',4,'夜晚与圣拉鲁卡村亡灵语研究者（41.35）对话，交出【线索三】，获得【亡灵语手册】。',[4],[input('线索三',4)],[output('亡灵语手册',4)]),step('step-5',5,'持有【亡灵语手册】再次与研究者对话，传送至墓地。',[5],[input('亡灵语手册',5,{action:'hold',consumed:false})]),step('step-6',6,'与亡者之影（30.10）对话进入战斗。',[6,7]),step('step-7',7,'战斗胜利后与亡者之影对话，交出【亡灵语手册】，获得【愚人之镜】。',[8,9],[input('亡灵语手册',8)],[output('愚人之镜',8)]),step('step-8',8,'双击【愚人之镜】，选择“是”并交出镜子，传送至镜中世界。',[10,11],[input('愚人之镜',10,{action:'use',consumed:true})]),step('step-9',9,'通过镜中世界固定迷宫，与复古连击剑术大师（8.13）对话，获得称号“被迷惑的人”，任务完结。',[12])],
  battles:{'battle-1':battle},encounters:[v([11],{id:'encounter-mirror-world',location:'镜中世界固定迷宫',enemyLevel:{min:45,max:47},enemies:[{name:'真？',appearance:'小石像怪'},{name:'伪？',appearance:'迷你石像怪'}]})],
  rewardEvents:[re('reward-fools-mirror','battle-reward',[8,9,10],[ri('fools-mirror','愚人之镜',[8,9,10],{properties:{use:'双击并选择“是”后交出，传送至镜中世界',titleEvent:{location:'法兰城（140.27）处50000金币',condition:'持有愚人之镜',result:'与称号管理NPC对话获得“以为捡到钱的人”'}}})],{step:'step-7'})],outcomes:{titles:[v([9],{name:'以为捡到钱的人',acquisition:'持有愚人之镜时调查50000金币后与称号管理NPC对话'}),v([12],{name:'被迷惑的人',acquisition:'quest-completion'})],careers:[],skills:[]},
  lineTypes:['step','step','step','step','step','battle-trigger','enemy','step','title-event','step','encounter-area','step']
 });
}

curate('catalog-93ec8553-3656-44cb-aac6-939b238e2f37','就职矿工',{
 startLocation:'圣拉鲁卡村赛谢利亚酒吧募集矿工的洛伊（16.10）',requirements:[],relations:{prerequisites:[],itemSources:[v([13],{item:'矿山钥匙',sourceQuest:'矿工的安全帽',use:'国营24坑道地下3楼必要物品'})],references:[]},
 steps:[step('step-1',1,'向募集矿工的洛伊学习免费技能【挖矿体验】，再到国营第24坑道地下1楼挖掘20个【铜】；已有20个铜时可跳过采集。',[1,2,3,4,5],[],[output('铜',2,{quantity:20,acquisition:'mining',alternateSource:{server:'时道服',location:'艾夏岛武器工房负一层',unitPrice:{amount:50,unit:'G'}}})]),step('step-2',2,'持有20个【铜】与毕夫鲁之家那尔薇（8.3）对话，获得【便当？】；原文未说明铜是否交出。',[6],[input('铜',6,{quantity:20,action:'hold',consumed:'source-unspecified'})],[output('便当？',6)]),step('step-3',3,'与矿工毕夫鲁（35.7）对话，交出【便当？】，获得【矿石？】和【有关矿石的纸条】。',[7],[input('便当？',7)],[output('矿石？',7),output('有关矿石的纸条',7)]),step('step-4',4,'与鉴定师马尔弗（13.9）对话，交出【矿石？】和纸条，获得【给那尔薇的信】。',[8],[input('矿石？',8),input('有关矿石的纸条',8)],[output('给那尔薇的信',8)]),step('step-5',5,'与那尔薇对话，交出【给那尔薇的信】，获得【饮料？】。',[9],[input('给那尔薇的信',9)],[output('饮料？',9)]),step('step-6',6,'与矿工毕夫鲁对话，交出【饮料？】，获得【矿工推荐信】。',[10],[input('饮料？',10)],[output('矿工推荐信',10)]),step('step-7',7,'前往圣拉鲁卡村村长家2楼与矿工吉拉瓦特（8.4）对话，就职矿工，任务完结。',[11])],
 outcomes:{titles:[],careers:[v([11],{career:'矿工',action:'employment'})],skills:[v([1,4],{name:'挖矿体验',cost:{amount:0,unit:'G'},skillSlotCost:3,availableTo:'游民亦可学习'}),v([12],{name:'挖掘',teacher:'法兰城基尔的家传说的矿工基尔',cost:{amount:100,unit:'G'}})]},
 lineTypes:['skill-and-step','collection-event','skip-rule','skill-detail','alternate-source','step','step','step','step','step','step','skill-learning','item-source']
});

curate('catalog-2efc1eb9-09f3-48fd-9274-447e9513b861','就职樵夫',{
 startLocation:'法兰城职业介绍所募集樵夫的阿空（8.11）',requirements:[],
 steps:[step('step-1',1,'向募集樵夫的阿空学习【伐木体验】，在法兰城东门外采集20个【孟宗竹】；已有20个时可跳过。',[1,2,3,4,5],[],[output('孟宗竹',2,{quantity:20,acquisition:'logging',properties:{tradeable:true}})]),step('step-2',2,'持有20个【孟宗竹】与艾文蛋糕店的艾文（12.5）对话，获得【手斧？】；原文未说明孟宗竹是否交出。',[6],[input('孟宗竹',6,{quantity:20,action:'hold',consumed:'source-unspecified'})],[output('手斧？',6)]),step('step-3',3,'清晨或白天与樵夫弗伦（106.191）对话，交出【手斧？】，获得【树苗？】。',[7],[input('手斧？',7)],[output('树苗？',7)]),step('step-4',4,'白天与种树的阿姆罗斯（134.36）对话，交出【树苗？】，获得【水色之花？】。',[8],[input('树苗？',8)],[output('水色之花？',8)]),step('step-5',5,'清晨或白天返回与弗伦对话，交出【水色之花？】，获得【木材？】。',[9],[input('水色之花？',9)],[output('木材？',9)]),step('step-6',6,'前往艾文蛋糕店与艾文对话，交出【木材？】，获得【艾文的饼干】。',[10],[input('木材？',10)],[output('艾文的饼干',10)]),step('step-7',7,'清晨或白天返回与弗伦对话，交出【艾文的饼干】，获得【樵夫推荐信】。',[11],[input('艾文的饼干',11)],[output('樵夫推荐信',11)]),step('step-8',8,'前往职业介绍所与樵夫荷拉巴斯（7.11）对话，就职樵夫，任务完结。',[12])],
 requirements:[v([7,9,11],{type:'time-window',value:'清晨或白天',appliesToSteps:['step-3','step-5','step-7']}),v([8],{type:'time-window',value:'白天',appliesToStep:'step-4'})],outcomes:{titles:[],careers:[v([12],{career:'樵夫',action:'employment'})],skills:[v([1],{name:'伐木体验',role:'quest-skill'}),v([13],{name:'伐木',teacher:'芙蕾雅岛山男的家山男波波思（10.7）',cost:{amount:100,unit:'G'}})]},
 lineTypes:['skill-learning','collection-event','skip-rule','item-detail','collection-location','step','step','step','step','step','step','step','skill-learning']
});

fs.writeFileSync(dataPath,`${JSON.stringify(database,null,2)}\n`);console.log('已完成第八批4条任务的逐行语义核验。');
