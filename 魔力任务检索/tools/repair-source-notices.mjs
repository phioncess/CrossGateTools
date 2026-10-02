import fs from 'node:fs';
import path from 'node:path';
import {loadQuestDatabase,questRecordsDir,projectDir} from './quest-database.mjs';
import {validateQuestV3} from './quest-schema-v3.mjs';
const db=loadQuestDatabase(),changes=[];
const byName=new Map(Object.values(db.quests).map(q=>[q.name,q]));
const notices={
 '月亮俱乐部(修正)':['任务可重复进行。漏做某天不会终止，只会整体顺延；第3天需完成全部四条路线，才有原攻略所述第97天四册流行手册与可爱优奈的路径。原攻略未明确每人每次可领几本手册。'],
 '海贼的宝地':['海贼剑、谢尔席拉的树枝、亚留特狮子的皮：等级3，不可交易，可丢弃、可存银行。'],
 '遇难的渔夫':['完成后可从法兰城里谢里雅堡启程之间2楼传送至西尔维村，费用850G。'],
 '劳动节特别活动':['原攻略列出的掉落地点：坎村、雷村、冰树、砍牛、半山、玄武、新城（斯特隆海姆城）、新村新城之间的山洞、矿村。','原攻略列出的无掉落地点：海底、新海底、小雷、内心、杰村、蒂娜、贡品、雪山、柯村、新村、米村、鲁村。'],
 '阿蒙的幻影':['南方丙丁火可用于练技能，幻之地底遗迹的护士不是资深护士。原攻略建议留一只狠毒鸟人；练护卫、反击、圣盾等无需行动的技能时，需逃跑结束战斗，避免掉线回城。'],
 '神之手的使徒':['完整通关各层取得贝黑莱特1、2、3、4、6个，合计16个；可叠加、可交易，丢到地面不消失。'],
 '崩落的坑道':[null,'完成后进入矿山小镇莫利亚不再需要持有委托证件。'],
 '商队的袭击':['完成任务后可丢弃豪华的戒指（伪）、豪华的头巾、缓慢的小刀、超级内裤。'],
 '小岛之谜':['完成后可向法兰城西门外阿鲁卡（398.168）支付800G前往小岛。','拥有“死神”称号也可传送至小岛。'],
 '地狱的回响':['仅时长服：完成后可按“死神的降临（半山8）”第一步免费前往小岛学习技能；不属于免费练级路线。']
};
for(const q of Object.values(db.quests)){
 let dirty=false;
 for(const [i,n] of (q.flow.notes||[]).entries()){
  if(typeof n!=='object'||n.text)continue;
  const text=notices[q.name]?.[i] || (n.note && n.type!=='source-table-merged-cell' ? n.note : null);
  if(text){n.text=text;changes.push({quest:q.name,kind:'flow-note',sourceLines:n.sourceLines,text});dirty=true;}
 }
 if(q.name==='开启者'){
  const s=q.flow.steps.find(s=>s.id==='optional-gender-recognition');
  if(s?.postCompletion){delete s.postCompletion;s.branch='可选组队准备';dirty=true;changes.push({quest:q.name,kind:'preparation-scope'});}
 }
 if(q.name==='月亮俱乐部(修正)'){
  const m=q.metadata;
  for(const key of ['summary'])if(typeof m?.[key]==='string')m[key]=m[key].replace('本任务未开放，采集地点已开放；本任务未开放','本任务未开放，采集地点已开放');
 }
 if(dirty){validateQuestV3(q);fs.writeFileSync(path.join(questRecordsDir,`${q.id}.json`),JSON.stringify(q,null,2)+'\n');}
}
const conditions=[
 ['就职仙人',[26],'每次任务对话后都会强制解散队伍。'],
 ['就职护士',[4,5,6],'怀旧服要求女性人物；官网更换女性特殊形象、变身卡（包括普通与限时露比卡）不能满足本任务的女性条件。'],
 ['盛夏巡回慰问',[3,4,5],'每日次数按完成日期计算，0点重置；跨日接取并在次日完成会占用次日次数。'],
 ['阿蒙的幻影',[19],'每次重新前往练技能，都需要重新走到取得线索卡片6的阶段。'],
 ['月亮俱乐部(修正)',[80],'正职以上的生产系、医生、护士可参与；仙人、侦探是否可参与，原攻略未确定。'],
 ['黑白龙城',[1],'任务可重复进行，但奖励和称号只在首次完成时取得。'],
 ['依格罗斯的进化',[5],'空气的精华I登出后不消失；每次兑换需要等待一段时间，原攻略未列具体间隔，后续兑换道具也有此限制。'],
 ['待产的依格罗斯',[5],'空气的精华I登出后不消失；每次兑换需要等待一段时间，原攻略未列具体间隔，后续兑换道具也有此限制。'],
 ['没落的村庄',[15,16],'完成风鸣之塔后，可使用阿斯提亚镇传送石进入，不必再找古代人民；离开没落的村庄不会返回古代人民处。'],
 ['魔族改造计划',[1,2,3,4],'仅嫉妒的罪书路线：需预先准备毕克银酸，可向玩家购买，或从本任务支线取得。'],
 ['魔法大学',[1,2,3,4,5,6,7,8],'队伍至少保留一组配合：鉴定师＋厨师＋魅惑的哈密瓜面包；鉴定师＋药剂师＋香水：深蓝九号；武器修理工＋对应武器制造师＋8C武器；或防具修理工＋对应防具制造师＋8C防具。其余3人可为任意生产系，无需8C物品。'],
 ['魔法大学',[9,10,11,13],'怀旧服需使用人工制作的物品（黄色文字），不能使用NPC制作的白色文字物品，也不能使用第5步取得的开光物品。']
];
for(const [name,lines,text] of conditions){
 const q=byName.get(name);if(!q)throw Error(name);
 if(q.requirements.conditions.some(c=>c.text===text))continue;
 q.requirements.conditions.push({type:'source-notice',text,sourceLines:lines,verification:{status:'verified',method:'manual-source-condition-review'}});
 const index=q.requirements.conditions.length-1;
 for(const line of lines){const s=q.segments.find(s=>s.line===line);if(s){s.bindings||=[];s.bindings.push({kind:'requirement',target:`requirements.conditions.${index}`});}}
 validateQuestV3(q);fs.writeFileSync(path.join(questRecordsDir,`${q.id}.json`),JSON.stringify(q,null,2)+'\n');changes.push({quest:name,kind:'requirement',text,sourceLines:lines});
}
if(changes.length)fs.writeFileSync(path.join(projectDir,'source-notice-repair-report.json'),JSON.stringify({date:'2026-10-03',changes},null,2)+'\n');
console.log(JSON.stringify({changes:changes.length}));
