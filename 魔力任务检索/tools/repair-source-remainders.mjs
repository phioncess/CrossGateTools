import fs from 'node:fs';
import path from 'node:path';
import {loadQuestDatabase,questRecordsDir,projectDir} from './quest-database.mjs';
import {validateQuestV3} from './quest-schema-v3.mjs';
const db=loadQuestDatabase(),qs=Object.values(db.quests),changes=[];
const ev=sourceLines=>({sourceLines,verification:{status:'verified',method:'manual-unbound-source-review'}});
const quest=name=>qs.find(q=>q.name===name);
function save(q){validateQuestV3(q);fs.writeFileSync(path.join(questRecordsDir,`${q.id}.json`),JSON.stringify(q,null,2)+'\n');}
function bind(q,lines,target,kind){for(const line of lines){const s=q.segments.find(s=>s.line===line);if(!s)throw Error(line);s.bindings||=[];if(!s.bindings.some(b=>b.target===target))s.bindings.push({kind,target});}}
{
 const q=quest('地底世界之暗黑前夕——物资收集');
 const s=q.flow.steps.find(s=>s.id==='plan-q'),i=s.inputs.find(i=>i.item==='风鸣之羽');
 for(const x of [s,i])if(!x.sourceLines.includes(14))x.sourceLines.push(14);
 bind(q,[14],`flow.steps.${q.flow.steps.indexOf(s)}`,'flow');
 const l=q.flow.steps.find(s=>s.id==='plan-l');
 if(!l.notes.some(n=>n.text?.includes('残念奖可交易')))l.notes.push({text:'用于兑换味噌汤的宝石鼠残念奖可交易；原攻略标注法兰乐透闪卡每周三18:00～24:00开放。',...ev([36,37])});
 bind(q,[37],`flow.steps.${q.flow.steps.indexOf(l)}.notes.${l.notes.length-1}`,'flow');save(q);changes.push({quest:q.name,lines:[14,37],disposition:'existing-structured-input-plus-source-note'});
}
{
 const q=quest('法尔尼亚保卫战');
 if(!q.flow.notes.some(n=>n.text?.includes('地区内的顺序')))q.flow.notes.push({text:'芙蕾雅岛、索奇亚岛、莎莲娜岛各地区内的顺序可打乱。',...ev([5,15,20])});
 bind(q,[5,15,20],`flow.notes.${q.flow.notes.length-1}`,'flow');save(q);changes.push({quest:q.name,lines:[5,15,20],disposition:'route-order-note'});
}
{
 const q=quest('泰格利的烦恼'),c=q.requirements.conditions.find(c=>c.type==='title');
 c.text='需要拥有“永久的友谊”称号。';save(q);changes.push({quest:q.name,lines:[3],disposition:'title-condition'});
}
{
 const q=quest('寻找失踪的阿尔卡迪亚');
 if(!q.aliases.includes('七龙珠任务'))q.aliases.push('七龙珠任务');
 save(q);changes.push({quest:q.name,lines:[20],disposition:'search-alias'});
}
{
 const q=quest('月亮俱乐部(修正)');
 if(!q.flow.steps.some(s=>s.id==='optional-gem-exchange')){
  const step={id:'optional-gem-exchange',order:Math.max(...q.flow.steps.map(s=>s.order))+1,text:'原攻略另列：可用石榴石兑换同等级的红宝石；此处未列兑换NPC或具体地点。',inputs:[{item:'石榴石',action:'hand-over',...ev([14])}],outputs:[{item:'红宝石',acquisition:'guaranteed',...ev([14])}],notes:[],optional:true,branch:'可选宝石兑换',...ev([14])};
  q.flow.steps.push(step);bind(q,[14],`flow.steps.${q.flow.steps.length-1}`,'flow');
  const event={id:'moon-gem-exchange',version:'common',tier:'common',kind:'exchange',step:step.id,items:[{id:'moon-ruby',name:'红宝石',role:'valuable-result',entityType:'item',properties:{use:'镶嵌装备',effect:'按宝石等级增加回复力，并减少宝石等级对应百分比的装备耐久；原攻略未列具体等级表。'},...ev([14])}],...ev([14])};
  q.rewardEvents.push(event);bind(q,[14],`rewardEvents.${q.rewardEvents.length-1}`,'reward');save(q);changes.push({quest:q.name,lines:[14],disposition:'optional-gem-exchange'});
 }
 const step=q.flow.steps.find(s=>s.id==='optional-gem-exchange');
 for(const [field,items] of [['inputs',step.inputs],['acquisitions',step.outputs]])for(const item of items){
  if(!q.itemEvents[field].some(e=>e.step===step.id&&e.item===item.item))q.itemEvents[field].push({...item,step:step.id,version:'common',tier:'common'});
 }
 save(q);
}
const excluded={
 '就职医生':[22,23,24], '森罗万象':[11,12,13,85],
 '彷徨的亡灵':[45,46,47], '亡者之镇':[47,48,49], '圣鸟之谜':[48,49,50],
 '赎罪的亡灵':[22,23], '死神的降临':[60,61,62,63,64,67,68], '死与新生':[56,57,58,65,66,67,68]
};
const covered={'地底世界之暗黑前夕——物资收集':[12,13,35],'寻找失踪的阿尔卡迪亚':[20],'杀熊者欧兹那克':[1]};
const remainder=[];
for(const q of qs)for(const s of q.segments.filter(s=>!s.bindings?.length)){
 const disposition=excluded[q.name]?.includes(s.line)?'excluded-server-scope':covered[q.name]?.includes(s.line)?'covered-branch-or-alias-or-no-prerequisite':'source-heading';
 if(disposition==='source-heading'&&!/战斗信息|打法参考|打法仅供参考|版本|视频版|文字版|奖品说明|【奖品】说明|小贴士|温馨提示|建议解法|快速解法|活动规则|路线：|名称等级|^20\d{2}：|^1阶：/.test(s.text))throw Error(`Unreviewed remainder ${q.name}:${s.line} ${s.text}`);
 remainder.push({quest:q.name,line:s.line,text:s.text,disposition});
}
fs.writeFileSync(path.join(projectDir,'source-remainder-review.json'),JSON.stringify({date:'2026-10-03',changes,remainder},null,2)+'\n');
console.log(JSON.stringify({changes:changes.length,remainder:remainder.length}));
