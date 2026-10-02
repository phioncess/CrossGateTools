import fs from 'node:fs';
import path from 'node:path';
import {loadQuestDatabase,questRecordsDir,projectDir} from './quest-database.mjs';
import {validateQuestV3} from './quest-schema-v3.mjs';

// Evidence classification follows existing entity references, never guesses source prose.
// The exact raw text, legacy classifications and version/tier provenance remain recoverable.
const apply=process.argv.includes('--apply');
const database=loadQuestDatabase();
if(Object.values(database.quests).every(quest=>quest.schemaVersion===3&&quest.segments.every(segment=>Array.isArray(segment.bindings)))){
  for(const quest of Object.values(database.quests))validateQuestV3(quest);
  console.log('Evidence contract already migrated; historical report preserved.');
  process.exit(0);
}
const changes=[];
const roots={requirements:'requirement',flow:'flow',relations:'relation',rewardEvents:'reward',itemEvents:'item',outcomes:'reward',exchangeRecipes:'reward',sourceSupplements:'note',presentation:'note',versions:'battle'};
for(const quest of Object.values(database.quests)){
  const bindings=new Map();
  function visit(value,target,kind){
    if(!value||typeof value!=='object')return;
    if(Array.isArray(value.sourceLines))for(const line of value.sourceLines){
      const entries=bindings.get(line)||[];
      entries.push({kind,target});bindings.set(line,entries);
    }
    for(const [key,child]of Object.entries(value))if(!['sourceLines','verification','rawLines','segments'].includes(key))visit(child,`${target}.${key}`,kind);
  }
  for(const [key,kind]of Object.entries(roots))visit(quest[key],key,kind);
  const previousSchemaVersion=quest.schemaVersion;
  for(const segment of quest.segments){
    const entries=bindings.get(segment.line)||[];
    const priority=['battle','reward','item','requirement','relation','flow','note'];
    const kind=priority.find(value=>entries.some(entry=>entry.kind===value))||(segment.kind==='media'?'media':'note');
    changes.push({questId:quest.id,line:segment.line,previousType:segment.type??segment.kind,previousSchemaVersion,kind,bindings:entries,...(segment.version?{version:segment.version}:{}),...(segment.tier?{tier:segment.tier}:{})});
    delete segment.type;segment.kind=kind;segment.bindings=entries;
  }
  quest.schemaVersion=3;
  validateQuestV3(quest);
}
const report={date:'2026-10-03',mode:apply?'applied':'review',questCount:Object.keys(database.quests).length,segmentCount:changes.length,unboundEvidenceCount:changes.filter(row=>!row.bindings.length).length,changes};
fs.writeFileSync(path.join(projectDir,'evidence-contract-migration.json'),JSON.stringify(report,null,2)+'\n');
if(apply)for(const quest of Object.values(database.quests))fs.writeFileSync(path.join(questRecordsDir,`${quest.id}.json`),JSON.stringify(quest,null,2)+'\n');
console.log(JSON.stringify({mode:report.mode,questCount:report.questCount,segmentCount:report.segmentCount,unboundEvidenceCount:report.unboundEvidenceCount}));
