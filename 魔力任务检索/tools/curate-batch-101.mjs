import fs from 'node:fs';
const dataPath=new URL('../data-src/quests.json',import.meta.url);const database=JSON.parse(fs.readFileSync(dataPath,'utf8'));
const v=(l,x={})=>({...x,sourceLines:l,verification:{status:'verified',method:'manual-semantic-review'}});const input=(item,line,x={})=>v([line],{item,quantity:1,action:'hand-over',...x});const output=(item,line,x={})=>v([line],{item,quantity:1,acquisition:'guaranteed',...x});const step=(id,order,text,lines,inputs=[],outputs=[],x={})=>v(lines,{id,order,text,inputs,outputs,notes:[],...x});const ri=(id,name,lines,x={})=>v(lines,{id,name,role:'valuable-result',...x});const re=(id,kind,lines,items,x={})=>v(lines,{id,version:'common',tier:'common',kind,items,...x});const foe=(lines,name,raw,x={})=>v(lines,{name,raw,role:'enemy',...x});const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
function lineTypes(n,groups){const a=Array(n);for(const [type,lines] of groups)for(const line of lines)a[line-1]=type;const m=a.flatMap((x,i)=>x?[]:[i+1]);if(m.length)throw new Error(`缺少行类型 ${m}`);return a;}
function battle(id,sequence,lines,enemies,x={}){return v(lines,{id,sequence,enemies,...x});}
function version(key,label,battles,lines,changes=[]){return {key,label,changes,tiers:{common:v(lines,{key:'common',label:'通用',order:0,battles,encounters:[],media:[],notes:[]})}};}
function gateEnemies(lines,element,names,levels,hps,skills){return names.map((name,i)=>foe([lines[i]],name,`${levels[i] ? `Lv.${levels[i]} ` : ''}${name}，血量约${hps[i]}`,{level:levels[i]||null,hpApprox:hps[i],elements:element[i]||null,skills:skills[i]||[]}));}
const id='catalog-c77cbb11-123f-4d0f-9c6d-528364eccecf';const q=database.quests[id];if(!q||q.name!=='永远')throw new Error('任务不匹配');
const nostalgicGates={
 giant: battle('giant-gate',1,range(10,13),gateEnemies([11,12,13],[{earth:100},{earth:70,wind:30},{earth:100}],['死神','武装骷髅*2','大地翼龙*2'],[85,80,null],[8000,2800,2800],[['攻击','防御','即死魔法','超强陨石魔法','超强石化魔法'],['攻击','防御','吸血攻击','昏睡攻击'],['攻击','防御','毒性攻击','陨石魔法','强力陨石魔法']])),
 ice: battle('ice-gate',2,range(23,31),gateEnemies([24,25,26],[{water:100},{earth:30,water:70},{water:100}],['死神','地狱骷髅*2','寒冰翼龙*2'],[85,80,null],[8000,2800,2800],[['攻击','防御','即死魔法','超强冰冻魔法','超强昏睡魔法'],['攻击','防御','吸血攻击','乾坤一掷'],['攻击','防御','混乱攻击','强力昏睡魔法']]),{followUpEncounter:v([31],{enemy:'海盗骷髅',rareLevel1:true})}),
 fire: battle('fire-gate',3,range(37,40),gateEnemies([38,39,40],[{fire:100},{water:30,fire:70},{fire:100}],['死神','血骷髅*2','火焰翼龙*2'],[85,80,null],[8000,2800,2800],[['攻击','防御','即死魔法','超强火焰魔法','超强中毒魔法'],['攻击','防御','吸血攻击','酒醉攻击'],['攻击','防御','混乱攻击','强力中毒魔法']])),
 wind: battle('wind-gate',4,range(50,53),gateEnemies([51,52,53],[{wind:100},{fire:30,wind:70},{wind:100}],['死神','骷髅战士*2','烈风翼龙*2'],[85,80,null],[8000,2800,2800],[['攻击','防御','即死魔法','超强风刃魔法','超强酒醉魔法'],['攻击','防御','吸血攻击','昏睡攻击'],['攻击','防御','石化攻击','强力酒醉魔法']]))
};
const longGates={
 giant:battle('giant-gate-long',1,range(14,17),gateEnemies([15,16,17],[null,null,null],['死神','武装骷髅*2','大地翼龙*2'],[135,130,130],[12000,4500,4500],[['攻击','防御','即死魔法'],[],[]])),
 ice:battle('ice-gate-long',2,range(27,30),gateEnemies([28,29,30],[null,null,null],['死神','地狱骷髅*2','寒冰翼龙*2'],[135,130,130],[12000,4500,4500],[['攻击','防御','即死魔法'],[],[]])),
 fire:battle('fire-gate-long',3,range(41,44),gateEnemies([42,43,44],[null,null,null],['死神','血骷髅*2','火焰翼龙*2'],[135,130,130],[12000,4500,4500],[['攻击','防御','即死魔法'],[],[]])),
 wind:battle('wind-gate-long',4,range(54,57),gateEnemies([55,56,57],[null,null,null],['死神','骷髅战士*2','烈风翼龙*2'],[135,130,130],[12000,4500,4500],[['攻击','防御','即死魔法'],[],[]]))
};
const nostalgiaFinal={};
const finalSpecs=[
 ['final-1',1,range(101,105),[foe(range(102,104),'阿鲁巴斯','Lv.90阿鲁巴斯，血量约10000，全属性30',{level:90,hpApprox:10000,elements:'all-30',skills:['攻击','防御','恢复魔法','单体即死','超强混乱魔法']})]],
 ['final-2',2,range(106,114),['左','中','右'].map((p,i)=>foe([107+i,110,111+i],`阿鲁巴斯（${p}）`,'Lv.90阿鲁巴斯，血量约10000，全属性30',{level:90,hpApprox:10000,elements:'all-30',skills:i===0?['攻击','防御','超强中毒魔法','强力冰冻魔法']:i===1?['攻击','防御','超强睡眠魔法','超强补血魔法']:['攻击','防御','诸刃','超强混乱魔法']}))],
 ['final-3',3,range(115,127),range(1,5).map((n,i)=>foe([116+i,121,122+i],`阿鲁巴斯${n}`,'Lv.90阿鲁巴斯，血量约5000，全属性30',{level:90,hpApprox:5000,elements:'all-30'}))],
 ['final-4',4,range(128,142),range(1,10).map((n,i)=>foe([129+(i>4?1:0),131,132+i],`阿鲁巴斯${n}`,'Lv.90阿鲁巴斯，血量约3000，全属性30',{level:90,hpApprox:3000,elements:'all-30'}))],
 ['final-5',5,range(143,148),[foe(range(144,147),'阿鲁巴斯','Lv.100阿鲁巴斯，血量约20000，全属性30',{level:100,hpApprox:20000,elements:'all-30',skills:['攻击','防御','超强风刃魔法','超强冰冻魔法','超强酒醉魔法','超强即死魔法','超强混乱魔法']})]]
];
for(const [bid,seq,lines,enemies] of finalSpecs)nostalgiaFinal[bid]=battle(bid,seq,lines,enemies,{consecutive:true});
const longFinal={};
const longFinalRanges=[[150,154],[155,163],[164,176],[177,191],[192,196]];
const longCounts=[1,3,5,10,1],longHp=[13000,10000,8000,4200,30000];
for(let i=0;i<5;i++){const lines=range(...longFinalRanges[i]);const enemies=range(1,longCounts[i]).map(n=>foe(lines,`阿鲁巴斯${longCounts[i]>1?n:''}`,`Lv.140阿鲁巴斯，血量约${longHp[i]}`,{level:140,hpApprox:longHp[i]}));longFinal[`final-${i+1}-long`]=battle(`final-${i+1}-long`,i+1,lines,enemies,{consecutive:true});}
const steps=[
 step('enter-asfa',1,'清晨或白天在法兰城冒险者旅馆持有炽热的生命之光，与赫顿摩尔对话进入约14层的阿斯法地下迷宫。',[1,2,3,4],[input('炽热的生命之光',1,{action:'possess',sourceQuest:'追击'})]),
 step('giant-certificate',2,'经阿斯法密室进入两层巨石之牢狱，击倒迷宫魔物随机收集10个巨石之证。',[5,6,7,8],[],[output('巨石之证',7,{quantity:10,acquisition:'random-battle-drop',droppable:true})]),
 step('giant-gate',3,'队长交出10个巨石之证，与看守者战斗，胜后进入寒冰之牢狱。',[9,...range(10,18)],[input('巨石之证',9,{quantity:10})],[],{battleRefs:['giant-gate','giant-gate-long']}),
 step('ice-certificate',4,'在两层寒冰之牢狱击倒魔物随机收集10个寒冰之证。',[19,20,21],[],[output('寒冰之证',20,{quantity:10,acquisition:'random-battle-drop',droppable:true})]),
 step('ice-gate',5,'队长交出10个寒冰之证，与看守者战斗；随后可能遭遇海盗骷髅连战，胜后进入烈焰之牢狱。',[22,...range(23,32)],[input('寒冰之证',22,{quantity:10})],[],{battleRefs:['ice-gate','ice-gate-long']}),
 step('fire-certificate',6,'在两层烈焰之牢狱击倒魔物随机收集10个烈焰之证。',[33,34,35],[],[output('烈焰之证',34,{quantity:10,acquisition:'random-battle-drop',droppable:true})]),
 step('fire-gate',7,'队长交出10个烈焰之证，与看守者战斗，胜后进入暴风之牢狱。',[36,...range(37,45)],[input('烈焰之证',36,{quantity:10})],[],{battleRefs:['fire-gate','fire-gate-long']}),
 step('wind-certificate',8,'在两层暴风之牢狱击倒魔物随机收集10个暴风之证。',[46,47,48],[],[output('暴风之证',47,{quantity:10,acquisition:'random-battle-drop',droppable:true})]),
 step('wind-gate',9,'队长交出10个暴风之证，与看守者战斗，胜后进入阿斯法地下实验室。',[49,...range(50,58)],[input('暴风之证',49,{quantity:10})],[],{battleRefs:['wind-gate','wind-gate-long']}),
 step('choose-labyrinth',10,'调查三个随机对应的石雕进入约20层的实验室密道；错误密道需原路返回。地图57094取真实之镜，57095为宝藏密匙支线，57096通主线最终BOSS。',[58,59,60,61,62,63,64,65,66,67,68,69]),
 step('true-mirror',11,'在实验室密道①找到赫顿摩尔取得真实之镜并自动出迷宫；持镜才可由密道③进入阿斯法实验室。',[70,71,72,76,77,78],[],[output('真实之镜',71,{role:'process-item'})]),
 step('treasure-key-branch',12,'全队持宝藏密匙进入囚室重组队，队长取得并装备耐久2的飘渺的生命之光，分五场挑战；完成后交出该光，调查亡者之骨取得神界秘宝。',[73,74,75,...range(79,86)],[input('宝藏密匙',80,{action:'possess',scope:'all-party',sourceQuest:'追击'}),input('飘渺的生命之光',85)],[output('飘渺的生命之光',80,{durability:2}),output('神界秘宝',86)],{battleRefs:['branch-five-battles'],allowsIntermediateOutputThenInput:true}),
 step('final-five-battles',13,'持真实之镜抵达阿斯法实验基地，与阿鲁巴斯进行五连战。',[98,99,...range(100,196)],[input('真实之镜',77,{action:'possess'})],[],{battleRefs:[...range(1,5).flatMap(n=>[`final-${n}`,`final-${n}-long`])]}),
 step('complete',14,'胜后与凯特对话交出炽热的生命之光：怀旧服首次获称号并回城，再次完成改获闪耀贝壳；时长服直接获闪耀贝壳且无称号。',[197,198,199,200,201],[input('炽热的生命之光',197)],[output('我们是永远的朋友',198,{entityType:'title',conditional:'怀旧服首次完成'}),output('闪耀贝壳',199,{conditional:'时长服，或怀旧服已拥有称号时'})],{rewardEventRefs:['completion-title','completion-shell']}),
 step('shell-use',15,'双击闪耀贝壳，随机获得Lv.1翼龙或1至5个魂之碎片。',[202],[input('闪耀贝壳',202,{action:'consume'})],[output('Lv.1翼龙',202,{acquisition:'random'}),output('魂之碎片',202,{quantity:{min:1,max:5},acquisition:'random'})]),
 step('branch-settlement',16,'完成主线后交出神界秘宝，取得5个魂之碎片；魂之碎片可按10、50或100个兑换对应奖励。',[87,...range(88,97)],[input('神界秘宝',87),input('魂之碎片',89,{quantity:'10/50/100',conditional:'兑换'})],[output('魂之碎片',87,{quantity:5}),output('再生灵药',89,{acquisition:'random-or-fixed-by-tier'}),output('Lv.1翼龙',89,{acquisition:'random-or-fixed-by-tier'}),output('翼龙设计图A~E',89,{acquisition:'random'})],{allowsIntermediateOutputThenInput:true})
];
q.schemaVersion=2;q.verification={status:'verified',method:'manual-semantic-review',reviewedSourceRanges:[[1,202]],note:'全部202行原文已逐条核验，四牢狱门禁、三密道分支、双服战斗、支线和奖励已拆分。'};
q.requirements={conditions:[v([1],{type:'time-window',allowed:['清晨','白天']}),v([1,197],{type:'required-item',item:'炽热的生命之光',sourceQuest:'追击'}),v([9,22,36,49],{type:'leader-gate',items:[{item:'巨石之证',quantity:10},{item:'寒冰之证',quantity:10},{item:'烈焰之证',quantity:10},{item:'暴风之证',quantity:10}]}),v([74,75,80],{type:'optional-branch-gate',item:'宝藏密匙',scope:'all-party',sourceQuest:'追击'}),v([77,78],{type:'main-route-gate',item:'真实之镜'})]};
q.relations={prerequisites:[v([2],{quest:'追击',relation:'item-source',item:'炽热的生命之光'})],itemSources:[v([75],{item:'宝藏密匙',quest:'追击'}),v([71],{item:'真实之镜',step:'true-mirror'})],references:[]};
q.flow={start:v([1],{stepId:'enter-asfa',location:'法兰城冒险者旅馆1楼（17.14）'}),steps,notes:[v([64,65,66],{text:'迷宫刷新后密道编号保持；可按地图编号辨认。'})]};
q.versions={common:version('common','通用',{'branch-five-battles':battle('branch-five-battles',0,range(81,85),[],{count:5,consecutive:false,restBetween:true})},range(1,202)),怀旧服:version('怀旧服','怀旧服',{...nostalgicGates,...nostalgiaFinal},[...range(10,13),...range(23,31),...range(37,40),...range(50,53),...range(100,148)],[]),其他服:version('其他服','时长服',{...longGates,...longFinal},[...range(14,17),...range(27,30),...range(41,44),...range(54,57),...range(149,196)],[])};
q.rewardEvents=[
 re('branch-light','quest-progress',[80,81,84,85],[ri('ethereal-life-light','飘渺的生命之光',[80,81,84,85],{entityType:'equippable-quest-item',durability:2,requiredEquipped:true,consumedAfterFiveBattles:true})]),
 re('soul-fragment-source','quest-completion',[87,202],[ri('soul-fragment','魂之碎片',[87,202],{quantitySources:[{quantity:5,source:'神界秘宝结算'},{quantity:{min:1,max:5},source:'闪耀贝壳随机结果'}],use:'兑换奖励'})]),
 re('soul-fragment-exchange','reward-pool',range(88,97),[ri('soul-exchange-10','10碎片随机奖池',[89],{cost:{item:'魂之碎片',quantity:10},randomOneOf:['再生灵药','Lv.1翼龙','翼龙设计图A~E']}),ri('soul-exchange-50','Lv.1翼龙',[90],{cost:{item:'魂之碎片',quantity:50},guaranteed:true}),ri('soul-exchange-100','再生灵药',[91,92,93,94,95,96,97],{cost:{item:'魂之碎片',quantity:100},tradeable:false,npcSchedule:[{time:'清晨',coordinate:'164.53'},{time:'白昼',coordinate:'83.139'},{time:'黄昏',coordinate:'162.151'},{time:'黑夜',coordinate:'89.51'}]})]),
 re('completion-title','quest-completion',[197,198,200,201],[ri('forever-friends-title','我们是永远的朋友',[198,200],{entityType:'title',server:'怀旧服',condition:'首次完成；已有称号时不再获得'})]),
 re('completion-shell','quest-completion',[199,200,201,202],[ri('shining-shell','闪耀贝壳',[199,200,201,202],{entityType:'consumable-container',serverRules:{其他服:'完成主线获得',怀旧服:'已有“我们是永远的朋友”称号后再次完成获得'},randomOneOf:[{item:'Lv.1翼龙'},{item:'魂之碎片',quantity:{min:1,max:5}}]})])
];
q.outcomes={titles:[v([198,200],{name:'我们是永远的朋友',server:'怀旧服',condition:'首次完成'})],careers:[],skills:[]};
q.segments=q.source.rawLines.map((r,i)=>v([r.line],{line:r.line,text:r.text,type:lineTypes(202,[['source-detail',range(1,202)],['route-step',[1,5,9,18,22,32,36,45,49,58,71,80,81,85,86,87,98,197,198,199,200,201,202]],['requirement',[2,8,21,35,48,74,75,77,78,84]],['maze-detail',[3,4,6,7,19,20,33,34,46,47,59,60,61,62,63,64,65,66,67,68,69,70,72,73,76]],['battle-detail',[...range(10,17),...range(23,31),...range(37,44),...range(50,57),...range(82,83),...range(99,196)]],['reward-detail',range(88,97)]])[i]}));
q.itemEvents={inputs:steps.flatMap(s=>s.inputs.map(e=>({...e,step:s.id,version:'common',tier:'common'}))),acquisitions:steps.flatMap(s=>s.outputs.map(e=>({...e,step:s.id,version:'common',tier:'common'})))};delete q.legacy;
fs.writeFileSync(dataPath,JSON.stringify(database,null,2)+'\n','utf8');console.log('Curated batch 101: 永远');
