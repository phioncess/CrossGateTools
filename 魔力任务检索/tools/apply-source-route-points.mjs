import fs from 'node:fs';
import path from 'node:path';
import {loadQuestDatabase,questRecordsDir,projectDir} from './quest-database.mjs';
import {validateQuestV3} from './quest-schema-v3.mjs';
const db=loadQuestDatabase();
const plan=JSON.parse(fs.readFileSync(path.join(projectDir,'source-route-point-plan.json'),'utf8'));
const apply=process.argv.includes('--apply'),changes=[],modified=new Set();
for(const q of Object.values(db.quests))if(q.name==='永远'){
 const step=q.flow.steps.find(s=>s.id==='branch-settlement');
 step.npcLocations={'清晨':'164.53','白昼':'83.139','黄昏':'162.151','黑夜':'89.51'};modified.add(q.id);
}
const bagua=db.quests['bagua-1'];
bagua.flow.steps.find(s=>s.id==='step-2').text='右键调查亚留特村民家门（48.36）进入民家（48.37），与塔基（12.10）对话，任意选择后获得【塔基的信】；全队只需一人持有。';modified.add(bagua.id);
for(const candidate of plan.planned){
 const q=db.quests[candidate.questId];
 const source=q.source.rawLines.find(l=>l.line===candidate.line);
 if(source?.text!==candidate.sourceText)throw Error('Source changed '+q.id);
 const coords=[...source.text.matchAll(/[（(](\d+)[.,，](\d+)[）)]/g)].map(m=>`${Number(m[1])}.${Number(m[2])}`);
 if(!coords.includes(candidate.coordinate))throw Error('Unsupported coordinate '+q.id);
 if(candidate.version!=='common')throw Error('Version-specific point requires explicit placement');
 const steps=candidate.steps.map(id=>q.flow.steps.find(s=>s.id===id));
 if(steps.some(s=>!s||!s.sourceLines.includes(candidate.line)))throw Error('Unsupported placement '+q.id);
 // One row per step and exact named coordinate, with all original evidence lines merged.
 for(const step of steps){
  step.routePoints||=[];
  const existing=step.routePoints.find(p=>p.coordinate===candidate.coordinate&&p.name===candidate.name);
  if(existing){existing.sourceLines=[...new Set([...existing.sourceLines,candidate.line])];continue;}
  const point={name:candidate.name,coordinate:candidate.coordinate,sourceLines:[candidate.line],verification:{status:'verified',method:'reviewed-source-location-decomposition'}};
  if(q.name==='菲鲁瑟团探索计划'&&candidate.line===32&&candidate.coordinate==='740.67')point.context='此处应与七七对话，不要与芙洛拉对话。';
  step.routePoints.push(point);modified.add(q.id);
  changes.push({questId:q.id,quest:q.name,step:step.id,point,sourceText:source.text});
 }
}
for(const id of modified)validateQuestV3(db.quests[id]);
const filename=path.join(projectDir,'source-route-point-repair.json');
if(apply&&fs.existsSync(filename)&&!changes.length){console.log('No new points; applied report preserved.');process.exit(0);}
fs.writeFileSync(filename,JSON.stringify({date:'2026-10-03',mode:apply?'applied':'review',questCount:modified.size,pointCount:changes.length,remainingPlanCandidates:plan.review,changes},null,2)+'\n');
if(apply)for(const id of modified)fs.writeFileSync(path.join(questRecordsDir,`${id}.json`),JSON.stringify(db.quests[id],null,2)+'\n');
console.log(JSON.stringify({mode:apply?'applied':'review',quests:modified.size,points:changes.length}));
