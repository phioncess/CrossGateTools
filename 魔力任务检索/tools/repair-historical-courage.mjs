import fs from 'node:fs';
import path from 'node:path';
import {loadQuestDatabase,questRecordsDir,projectDir} from './quest-database.mjs';
import {validateQuestV3} from './quest-schema-v3.mjs';
const db=loadQuestDatabase(),q=Object.values(db.quests).find(q=>q.name==='勇气max');
const ev=sourceLines=>({sourceLines,verification:{status:'verified',method:'manual-historical-battle-decomposition'}});
const raw=line=>q.source.rawLines.find(r=>r.line===line).text;
// Explicit source-row ownership, never borrow another year's numeric data.
const groups=[
 [266,'百合之少女薇丝',[
  [268,269,'百合之少女薇丝',89,14700,16500,2,{all:35},'抗咒',1,'弓'],
  [270,271,'魔术师乌莉儿',81,7500,7500,1,{all:25},'不抗咒',1,'杖'],
  [272,273,'小乌',81,14000,15000,1,{water:100},'不抗石化'],
  [274,275,'猎人凯杰尔',81,6500,6500,2,{all:25},'不抗混乱、遗忘',1,'回力镖'],
  [276,277,'剑士罗严',81,8000,8000,2,{all:25},'不抗毒、昏睡',1,'剑'],
  [278,279,'僧侣帕利耶',81,7000,7000,1,{all:25},'不抗遗忘',1,'杖'],
  [280,281,'熊美',81,7000,7000,1,{water:80,earth:20},'不抗石化、醉酒']]],
 [282,'里雍',[
  [284,286,'里雍',100,21000,24000,2,{all:50},'抗咒'],
  [287,288,'麒麟',85,6000,6000,2,{earth:40,water:20,fire:20,wind:20},'抗咒',4]]],
 [289,'回来报仇的牛鬼',[
  [291,293,'回来报仇的牛鬼',[86,89],11000,13000,2,{wind:70,earth:30},'抗咒'],
  [294,295,'石雄',81,4000,4000,2,{water:70,fire:30},'不抗咒'],
  [296,297,'金雄',82,4000,4000,2,{water:70,fire:30},'不抗咒'],
  [298,299,'星雄',80,3000,3000,2,{water:70,fire:30},'不抗咒'],
  [300,301,'罴',79,4000,4000,2,{earth:80,water:20},'不抗咒']]],
 [302,'螳螂',[
  [306,308,'螳螂',[100,120],18000,18000,2,{all:50},'抗咒'],
  [309,311,'使魔',[100,120],8000,8000,2,{all:50},'不抗咒'],
  [312,314,'黄蜂',[100,120],8000,8000,2,{water:90,fire:10},'不抗咒'],
  [315,317,'水龙蜥',[100,120],10000,10000,2,{water:70,fire:30},'不抗咒'],
  [318,320,'小蝙蝠',[100,120],8000,8000,2,{earth:80,water:20},'不抗咒']]],
 [322,'暗黑龙',[
  [324,326,'暗黑龙',125,30000,30000,2,{all:25},'抗咒'],
  [327,328,'猫脸女神巴斯铁特',95,1500,1500,1,{water:100},'不抗咒','被召唤，数量未列'],
  [329,330,'卡特卡普',95,1500,1500,1,{fire:100},'不抗咒','被召唤，数量未列']]],
 [331,'恶即斩的克罗卡涅',[
  [333,334,'恶即斩的克罗卡涅',105,30000,30000,2,{all:30},null],
  [335,336,'暗部第二部队成员',97,7000,7000,null,{all:25},null,9]]]
];
const tier=q.versions['through-2023'].tiers['tier-2'];
tier.battles={};
for(const [index,[heading,title,rows]] of groups.entries()){
 const key=`battle-${index+1}`,id=`through-2023:tier-2:${key}`,end=rows.at(-1)[1];
 const lines=Array.from({length:end-heading+1},(_,i)=>heading+i);
 if(index===3)lines.push(321);
 const battle={id,key,order:index+1,title,heading:raw(heading),enemies:{},strategy:[],notes:[],...ev(lines)};
 for(const [i,row] of rows.entries()){
  const [start,end,name,level,min,max,actions,elements,resistance,count=1,weapon]=row;
  const sourceLines=Array.from({length:end-start+1},(_,i)=>start+i);
  if(index===3)sourceLines.push(321);
  const skills=sourceLines.filter(l=>l>start&&l!==321).map(raw).join('').replace(/^技能[：:]?/,'').replace(/[；;]$/,'').split('、');
  // Parenthesized skill clauses containing enumeration remain a single entry.
  const merged=[];let buffer='',depth=0;
  for(const part of skills){buffer+=(buffer?'、':'')+part;depth+=(part.match(/[（(]/g)||[]).length-(part.match(/[）)]/g)||[]).length;if(depth===0){merged.push(buffer);buffer='';}}
  if(buffer)throw Error(`Unbalanced skill clause: ${name}`);
  const enemy={id:`${id}:enemy-${i+1}`,name,level:{min:Array.isArray(level)?level[0]:level,max:Array.isArray(level)?level[1]:level},hp:{min,max,approximate:true},count,race:index===4&&i>0?'不死系':'邪魔系',elements,skills:merged,...ev(sourceLines)};
  enemy.raw=sourceLines.map(raw).join('；');
  if(actions)enemy.actions=String(actions);
  if(resistance)enemy.resistance=resistance;
  if(weapon)enemy.weapon=weapon;
  battle.enemies[`enemy-${i+1}`]=enemy;
 }
 if(index===3)battle.notes.push({text:'原攻略标注等级100～120随机、均2次行动；这一场出自百人道场100层两连战的第一场。',...ev([303,304,321])});
 if(index===5)battle.notes.push({text:'此年度版本的克罗卡涅技能不含召唤喽啰。',...ev([331])});
 tier.battles[key]=battle;
 for(const line of lines){const s=q.segments.find(s=>s.line===line);s.kind='battle';s.bindings||=[];if(!s.bindings.some(b=>b.target===`versions.through-2023.tiers.tier-2.battles.${key}`))s.bindings.push({kind:'battle',target:`versions.through-2023.tiers.tier-2.battles.${key}`});}
}
validateQuestV3(q);fs.writeFileSync(path.join(questRecordsDir,`${q.id}.json`),JSON.stringify(q,null,2)+'\n');
fs.writeFileSync(path.join(projectDir,'historical-courage-repair-report.json'),JSON.stringify({date:'2026-10-03',version:'through-2023',battles:6,enemies:24,sourceLines:[265,336]},null,2)+'\n');
console.log('Restored six source-backed historical battles (24 enemy records).');
