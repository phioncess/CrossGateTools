import fs from 'node:fs';
import path from 'node:path';
import {loadQuestDatabase,projectDir} from './quest-database.mjs';
import {routeResolutions} from './source-route-resolutions.mjs';

// Planning only. A source occurrence is decomposed into an explicit anchor/coordinate.
// Ambiguous names, conflicting existing coordinates, and server-only passages are held
// for review; this tool never copies a paragraph into the runtime presentation.
const database=loadQuestDatabase();
const audit=JSON.parse(fs.readFileSync(path.join(projectDir,'rendered-source-audit.json'),'utf8'));
const planned=[],review=[];
function anchor(text,coordinate){
  const match=[...text.matchAll(/[（(](\d+)[.,，](\d+)[）)]/g)].find(m=>`${Number(m[1])}.${Number(m[2])}`===coordinate);
  if(!match)return null;
  const tail=text.slice(match.index+match[0].length);
  // Explicit coordinate-first forms are decomposed at source normalization time.
  const portal=tail.match(/^(?:处)?(?:进入|抵达|前往|返回)([^，。；（(]+?)(?=[，。；]|$)/);
  if(portal && portal[1].length<=24 && !/对话|交出|传送|获得|选|战斗/.test(portal[1]))return `通往${portal[1].trim()}的位置`;
  const object=tail.match(/^(?:处)?(?:的)?(隐藏楼梯|黄色传送石|城镇传送石|被火燃烧过的痕迹|楼梯|小道|铁门|石板|裂缝|废屋|门)/);
  if(object)return object[1];
  const before=text.slice(0,match.index).split(/[，,。；]/).at(-1).trim();
  const npc=tail.match(/^(?:处)?(?:与|跟)([^，。；（(]+?)对话/);
  if(npc && npc[1].length<=18 && /(?:前往|至|到达|到|调查|与|跟)$/.test(before))return npc[1];
  const prefix=text.slice(0,match.index).split(/[，,。；：、【】\n]/).at(-1).trim()
    .replace(/.*[（(]\d+[.,，]\d+[）)]/,'');
  let name=prefix.replace(/^\s*(?:\d+[.．、]|[①②③④⑤⑥⑦⑧⑨⑩⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑]|[◆◇●])\s*/,'');
  const markers=[...name.matchAll(/(?:右键点击|右键点|前往|返回|抵达|进入|调查|寻找|穿过|通过|回到|传回|传送回|传送到|到达|出村|出城|与|向|至|在|从|到)/g)];
  if(markers.length){const marker=markers.at(-1);name=name.slice(marker.index+marker[0].length).trim();}
  name=name.replace(/^(?:回|或者|或|和|内的|内|的)/,'').replace(/^[.．→\/\s]+/,'').trim();
  if(name.includes('或'))name=name.split(/或者|或/).at(-1).trim();
  name=name.replace(/[“”]/g,'');
  if(/^[（(]/.test(name)&&/[）)]$/.test(name))name=name.slice(1,-1);
  if(!name){
    name=tail.match(/^(?:处)?(?:的)?((?:[黄红蓝绿黑白紫]色)?(?:传送石|传送点|楼梯|入口|出口|门))/)?.[1]||'';
  }
  if(!name||!/[\p{L}\p{N}]/u.test(name)||name.length>36||/[【】]|(?:对话|选择|交出|获得|携带|持有|等级|耐久|费用|购买|支付|战斗胜利|若|然后|再走|传送到|刷新|形象|会被|并传|采集地点|所坐标)/.test(name))return null;
  if(/^(?:再?由|位于|清晨|白昼|黄昏|黑夜)$/.test(name))return null;
  if((name.match(/[（(]/g)||[]).length!==(name.match(/[）)]/g)||[]).length)return null;
  return name;
}
for(const result of audit.results){
  const quest=database.quests[result.id];
  for(const omission of result.missingCoordinates){
    const record={questId:quest.id,quest:quest.name,line:omission.line,coordinate:omission.coordinate,sourceText:omission.sourceText,steps:omission.referencedSteps.map(s=>s.id)};
    const segment=quest.segments.find(s=>s.sourceLines?.includes(omission.line));
    if(segment?.version==='道具服'||/^道具服[：:]/.test(omission.sourceText)){review.push({...record,reason:'excluded-server'});continue;}
    const name=routeResolutions[quest.name]?.[`${omission.line}:${omission.coordinate}`]||routeResolutions[quest.name]?.[omission.coordinate]||anchor(omission.sourceText,omission.coordinate);
    if(!name){review.push({...record,reason:'anchor-needs-review'});continue;}
    if(!record.steps.length){review.push({...record,name,reason:'placement-needs-review'});continue;}
    const conflict=quest.flow.steps.some(s=>(s.routePoints||[]).some(p=>p.name===name&&p.coordinate!==omission.coordinate));
    if(conflict&&!routeResolutions[quest.name]?.[omission.coordinate]){review.push({...record,name,reason:'existing-location-boundary'});continue;}
    planned.push({...record,name,version:segment?.version||'common'});
  }
}
fs.writeFileSync(path.join(projectDir,'source-route-point-plan.json'),JSON.stringify({date:'2026-10-03',mode:'review-only',plannedCount:planned.length,reviewCount:review.length,planned,review},null,2)+'\n');
console.log(JSON.stringify({planned:planned.length,review:review.length,reasons:review.reduce((o,r)=>(o[r.reason]=(o[r.reason]||0)+1,o),{}),samples:planned.slice(0,12)},null,2));
