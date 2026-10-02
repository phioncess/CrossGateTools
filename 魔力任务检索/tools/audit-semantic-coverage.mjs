import fs from 'node:fs';
import path from 'node:path';
import {loadQuestDatabase,projectDir} from './quest-database.mjs';
import {compilePresentationFacts} from './presentation-facts.mjs';

// Explicit records only: never scans archives, excluded files, caches, or legacy data.
const database = loadQuestDatabase();
const presentation = compilePresentationFacts(database);
const report = {scope:'全库结构引用、显式展示字段和有价值输出覆盖；候选不是已确认的游戏事实错误',questCount:Object.keys(database.quests).length,presentation,invalidReferences:[],valuableOutputCandidates:[],rewardSourceDifferences:[],genericStepCandidates:[]};
const baseStepKeys = new Set('id order text route branch notes inputs outputs choices quiz commands operations branchGroups afterOperations battleRef battleRefs allowsIntermediateOutputThenInput sourceLines verification presentationFacts presentationInteractions presentationSections equipmentRefs duplicateSourceLines'.split(' '));
const valueProperties = new Set('category durability attack defense agility spirit recovery critical accuracy dodge hp mp magicAttack magicResistance hpRecovery mpRecovery lifeRecovery raceChange skillEffect useEffect effect resultPet petProfile'.split(' '));
const categories = new Set(['临时活动/任务','经典任务','职业就职任务','职业晋阶任务','怀旧服其他自制任务']);
for (const quest of Object.values(database.quests)) {
  const steps = new Set(quest.flow.steps.map(step => step.id));
  const knownRewards = new Set((quest.rewardEvents || []).flatMap(event => event.items.filter(item => item.role === 'valuable-result').map(item => item.name)));
  if (categories.has(quest.presentation?.series)) report.invalidReferences.push({quest:quest.name,id:quest.id,kind:'category-as-series',target:quest.presentation.series});
  const checkStep = (record,field,kind) => {
    if (record?.[field] && !steps.has(record[field])) report.invalidReferences.push({quest:quest.name,id:quest.id,kind,record:record.id,target:record[field],sourceLines:record.sourceLines});
  };
  checkStep(quest.flow.start,'stepId','start');
  for (const event of [...(quest.itemEvents?.inputs || []),...(quest.itemEvents?.acquisitions || []),...(quest.rewardEvents || [])]) checkStep(event,'step','item-event');
  for (const version of Object.values(quest.versions || {})) for (const tier of Object.values(version.tiers || {})) for (const entry of [...Object.values(tier.battles || {}),...Object.values(tier.encounters || {})]) checkStep(entry,'triggerStep','battle');
  for (const step of quest.flow.steps) {
    const semanticKeys = new Set(step.presentationFacts.map(row => row.key));
    step.presentationSections.forEach(section => semanticKeys.add(section.key));
    if (semanticKeys.has('rewardEventRefs')) ['rewardEventRef','rewardPool'].forEach(key => semanticKeys.add(key));
    const remaining = Object.keys(step).filter(key => !baseStepKeys.has(key) && !semanticKeys.has(key));
    if (remaining.length) report.genericStepCandidates.push({quest:quest.name,id:quest.id,step:step.id,fields:remaining});
    for (const item of step.outputs) {
      if (!knownRewards.has(item.item) && Object.keys(item.properties || {}).some(key => valueProperties.has(key))) report.valuableOutputCandidates.push({quest:quest.name,id:quest.id,step:step.id,item:item.item,properties:item.properties,sourceLines:item.sourceLines});
    }
  }
  const groups = new Map();
  for (const event of quest.rewardEvents || []) for (const item of event.items.filter(item => item.role === 'valuable-result')) {
    const key = `${event.version}\u0000${event.tier}\u0000${item.name}`;
    const entries = groups.get(key) || [];
    entries.push({event:event.id,item}); groups.set(key,entries);
  }
  for (const entries of groups.values()) {
    if (entries.length < 2) continue;
    const shapes = new Set(entries.map(({item}) => JSON.stringify({...item.commonProperties,...item.properties,...item.appraisedProperties})));
    if (shapes.size > 1) report.rewardSourceDifferences.push({quest:quest.name,id:quest.id,item:entries[0].item.name,events:entries.map(entry => entry.event)});
  }
}
report.summary = {invalidReferenceCount:report.invalidReferences.length,valuableOutputCandidateCount:report.valuableOutputCandidates.length,rewardSourceDifferenceCount:report.rewardSourceDifferences.length,genericStepCandidateCount:report.genericStepCandidates.length};
fs.writeFileSync(path.join(projectDir,'semantic-coverage-report.json'),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report.summary));
