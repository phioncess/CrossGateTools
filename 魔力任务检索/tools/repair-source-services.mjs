import fs from 'node:fs';
import path from 'node:path';
import {loadQuestDatabase,questRecordsDir,projectDir} from './quest-database.mjs';
import {validateQuestV3} from './quest-schema-v3.mjs';
const db=loadQuestDatabase(),changes=[];
const evidence=lines=>({sourceLines:lines,verification:{status:'verified',method:'manual-source-service-decomposition'}});
function quest(name){const q=Object.values(db.quests).find(q=>q.name===name);if(!q)throw Error(name);return q;}
function save(q){validateQuestV3(q);fs.writeFileSync(path.join(questRecordsDir,`${q.id}.json`),JSON.stringify(q,null,2)+'\n');}
function supplement(name,id,text,lines,points=[]){
 const q=quest(name);if(q.flow.steps.some(s=>s.id===id))return;
 const step={id,order:Math.max(...q.flow.steps.map(s=>s.order))+1,text,inputs:[],outputs:[],notes:[],optional:true,postCompletion:true,branch:'可选技能与服务',...evidence(lines)};
 if(points.length)step.routePoints=points.map(([name,coordinate,line])=>({name,coordinate,...evidence([line])}));
 q.flow.steps.push(step);
 for(const line of lines){const segment=q.segments.find(s=>s.line===line);if(segment){segment.bindings||=[];segment.bindings.push({kind:'flow',target:`flow.steps.${q.flow.steps.length-1}`});}}
 changes.push({quest:q.name,step:id,text,sourceLines:lines});save(q);
}
supplement('就职鉴定师','optional-appraisal-services','可前往法兰城凯蒂夫人的店，向鉴定士达人恰拉交100G学习【鉴定】，占2个技能栏；凯蒂夫人另提供付费鉴定服务，原攻略未列具体服务费用。',[9,10],[['法兰城凯蒂夫人的店','196.78',9],['鉴定士达人恰拉','17.14',9],['凯蒂夫人（鉴定服务）','17.12',10]]);
supplement('就职樵夫','optional-logging-skill','可前往法兰城东门外芙蕾雅岛山男的家，向山男波波思交100G学习【伐木】。',[13],[['山男的家','509.153',13],['山男波波思','10.7',13]]);
supplement('就职厨师','optional-cooking-skill','可前往里谢里雅堡1楼厨房，向见习厨师特歇交100G学习【料理】。',[8],[['里谢里雅堡1楼厨房','104.21',8],['见习厨师特歇','12.6',8]]);
supplement('就职矿工','optional-mining-skill','可前往法兰城基尔的家，向传说的矿工基尔交100G学习【挖掘】。',[12],[['法兰城基尔的家','200.132',12]]);
supplement('就职药剂师','optional-pharmacy-skill','可前往法兰城城西医院，向见习药剂师吉可交100G学习【制药】。',[8],[['法兰城城西医院','82.84',8],['见习药剂师吉可','12.5',8]]);
supplement('就职传教士','optional-healing-skills','仅限传教士向僧侣特雷因选“是”传入大圣堂里面。向僧侣法马斯交100G可学【补血魔法】；向僧侣菲欧雷交100G可学【强力补血魔法】。',[5,6,7],[['僧侣特雷因（传入）','14.6',5],['僧侣法马斯（补血魔法）','14.10',6],['僧侣菲欧雷（强力补血魔法）','19.12',7]]);
supplement('就职传教士','optional-revive-skill','亚留特村神官理贾教授【气绝回复】，不限职业。原攻略这一行未列费用。',[10],[['亚留特村神官理贾','42.72',10]]);
supplement('开启者','optional-gender-recognition','组队前可按怀旧服原攻略调整性别识别：冒险者旅馆1楼NPC出售【露比限时变身卡】，50000G，7天内不限次数使用，不可交易、不可重复购买。【露比变身卡】可从临时任务或玩家购买，限一次性使用。官网“更换特殊形象”服务原攻略记为800点/7天或3000点/30天。非人物角色变色卡会使圣坛流程无法继续；蝴蝶结、假发、水手服等饰品不能改变本任务的性别识别。',[6,7,8,9,10,11,12,13,14,15],[['冒险者旅馆1楼出售NPC','23.7',8]]);
for(const [name,line] of [['亡者之镇',21],['圣鸟之谜',15]])supplement(name,'optional-island-pet-magic','怀旧服可在小岛向爱走丢的普夫学习9级宠物魔法；原攻略此处未列各魔法名称和费用。',[line],[['小岛爱走丢的普夫','52.74',line]]);
{
 const q=quest('风鸣之塔'),step=q.flow.steps.find(s=>s.id==='feather-sidequest');
 if(!step.routePoints?.some(p=>p.coordinate==='11.32')){
  step.routePoints||=[];step.routePoints.push(...[['6楼守护者（西侧）','11.32',52],['6楼守护者（东侧）','89.32',59]].map(([name,coordinate,line])=>({name:name.replace(/（[东西]侧）/,'（任选其一）'),coordinate,...evidence([line])})));
  step.sourceLines.push(52,59);changes.push({quest:q.name,step:step.id,sourceLines:[52,59]});save(q);
 }
}
{
 const q=quest('就职武器/防具类制造师'),step=q.flow.steps.find(s=>s.id==='gathering-skills');
 step.text='分别向对应导师学习伐木体验、挖掘体验、狩猎体验（游民也可学），再到对应采集地点收集孟宗竹、铜、鹿皮各20个。';
 q.flow.steps.find(s=>s.id==='employment').text='进入圣拉鲁卡村装备品店地下工房，携对应推荐信向职业导师就职，再向技能导师学习对应制造技能。';
 if(!step.teachers){
  step.teachers=[
   {skill:'伐木体验',teacher:'募集樵夫的阿空',location:'法兰城（195.50）职业介绍所（8.11）',...evidence([2,3,4])},
   {skill:'挖掘体验',teacher:'募集矿工的洛伊',location:'圣拉鲁卡村（39.70）赛杰利亚酒吧（48.76）',...evidence([2,3,4])},
   {skill:'狩猎体验',teacher:'猎人亚烈格尔',location:'伊尔村（48.76）',...evidence([2,3,4])}
  ];
  // Column ownership was checked against the saved original-page table evidence.
  step.materialSources=[
   {item:'孟宗竹',quantity:20,location:'法兰城东门外（483.192）',skill:'伐木体验',...evidence([2,5,6])},
   {item:'铜',quantity:20,location:'国营第24坑道地下1楼',skill:'挖掘体验',...evidence([2,5,6])},
   {item:'鹿皮',quantity:20,location:'伊尔村西北（649.289）',skill:'狩猎体验',...evidence([2,5,6])}
  ];
  changes.push({quest:q.name,step:step.id,sourceLines:[2,3,4,5,6],evidence:'第19轮-就职武器-防具类制造师-原页表格证据.json'});save(q);
 }
 save(q);
}
if(changes.length){
 const reportPath=path.join(projectDir,'source-service-repair-report.json');
 const previous=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,'utf8')):{};
 fs.writeFileSync(reportPath,JSON.stringify({date:'2026-10-03',changes:[...(previous.changes||[]),...changes]},null,2)+'\n');
}
console.log(JSON.stringify({changes:changes.length,quests:new Set(changes.map(c=>c.quest)).size}));
