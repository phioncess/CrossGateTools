import fs from 'node:fs';
import path from 'node:path';
import {loadQuestDatabase,questRecordsDir,projectDir} from './quest-database.mjs';
import {compilePresentationFacts} from './presentation-facts.mjs';

// Source decomposition, never browser inference. Apply only exact named locations from
// an explicitly cited numbered action whose original number equals the current step.
// Reject different coordinates for the same anchor, version-qualified lines, shorthand,
// preexisting conflicting placement, and any mapping requiring a guessed name.
const apply = process.argv.includes('--apply');
const database = loadQuestDatabase();
const views = structuredClone(database);
compilePresentationFacts(views);
const results = [];
function namedCoordinates(text) {
  const entries = [];
  for (const match of text.matchAll(/([^，。；：、！？“”【】（）\n]+)（(\d+\.\d+)）/g)) {
    let anchor = match[1].replace(/^\s*\d+[.．、]\s*/, '').trim();
    const marker = [...anchor.matchAll(/(?:前往|返回|抵达|进入|调查|寻找|与|向|至|在)/g)].at(-1);
    if (marker) anchor = anchor.slice(marker.index + marker[0].length).trim();
    anchor = anchor.replace(/^(?:回到|回|或)/,'');
    if (anchor === 'NPC') continue;
    if (anchor.length < 3 || anchor.length > 32 || /[【】（）\d]|(?:对话|选择|交出|获得|携带|持有)/.test(anchor)) continue;
    entries.push({name:anchor,coordinate:match[2],literal:`（${match[2]}）`});
  }
  return entries;
}
for (const quest of Object.values(database.quests)) {
  // Its recorded doorway (48.36) and the source's house (48.37) have an unresolved
  // boundary distinction; do not let an exact name match resolve that historical conflict.
  if (quest.id === 'bagua-1') continue;
  // Do not use an unqualified action inside a source that also contains a removed server.
  if (quest.source.rawLines.some(line => line.text.includes('道具服')) || Object.keys(quest.versions).length > 1) continue;
  const byLine = new Map(quest.source.rawLines.map(line => [line.line,line.text]));
  const anchorCoordinates = new Map();
  for (const line of quest.source.rawLines) for (const point of namedCoordinates(line.text)) {
    const coordinates = anchorCoordinates.get(point.name) || new Set();
    coordinates.add(point.coordinate); anchorCoordinates.set(point.name,coordinates);
  }
  let changed = false;
  for (const step of quest.flow.steps) {
    if (/怀旧服|时长服|版本|旧版|更新|取消/.test(step.text)) continue;
    const view = views.quests[quest.id].flow.steps.find(entry => entry.id === step.id);
    const visible = JSON.stringify([view.text,view.operations,view.afterOperations,view.branchGroups,view.notes,view.presentationFacts,view.presentationInteractions,view.presentationSections]);
    const planned = new Set((step.routePoints || []).map(entry => `${entry.name}\u0000${entry.coordinate}`));
    for (const line of step.sourceLines || []) {
      const sourceText = byLine.get(line) || '';
      const number = sourceText.match(/^\s*(\d+)[.．、]/)?.[1];
      if (Number(number) !== step.order || /怀旧服|时长服|道具服|版本|更新|取消/.test(sourceText)) continue;
      for (const point of namedCoordinates(sourceText)) {
        if (!step.text.includes(point.name) || visible.includes(point.literal) || planned.has(`${point.name}\u0000${point.coordinate}`) || anchorCoordinates.get(point.name)?.size !== 1) continue;
        const nameAt = step.text.indexOf(point.name);
        const afterName = step.text.slice(nameAt + point.name.length);
        if (/^[^，。；]{0,16}[（(]\d+\.\d+[）)]/.test(afterName) || step.routePoints?.some(entry => entry.name === point.name)) continue;
        const entry = {name:point.name,coordinate:point.coordinate,sourceLines:[line],verification:{status:'verified',method:'exact-numbered-source-anchor'}};
        planned.add(`${point.name}\u0000${point.coordinate}`);
        results.push({quest:quest.name,id:quest.id,step:step.id,order:step.order,point:entry,sourceText,stepText:step.text});
        if (apply) {step.routePoints ||= []; step.routePoints.push(entry); changed = true;}
      }
    }
  }
  if (changed) fs.writeFileSync(path.join(questRecordsDir,`${quest.id}.json`),`${JSON.stringify(quest,null,2)}\n`);
}
const report = {mode:apply ? 'applied' : 'review',scope:'原编号与当前步骤相同；完全相同地点名称；全攻略同名坐标唯一；未补已有冲突坐标；排除多版本、道具服混合来源及带版本限定步骤；亚留特门/民家坐标边界保留待复核。仍需保留全库其他候选复核。',questCount:new Set(results.map(entry => entry.id)).size,pointCount:results.length,results};
fs.writeFileSync(path.join(projectDir,'route-point-repair-report.json'),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({mode:report.mode,questCount:report.questCount,pointCount:report.pointCount,samples:results.slice(0,12)}));
