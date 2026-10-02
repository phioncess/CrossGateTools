import fs from 'node:fs';
import path from 'node:path';
import { loadQuestDatabase, projectDir } from './quest-database.mjs';
import { compilePresentationFacts } from './presentation-facts.mjs';

// 只检测原文坐标是否进入玩家流程；不使用来源证据、内部引用或整段原文充当展示。
// 缺失为待复核候选：还可能属于附图、可选路线或别服内容，不能自动补入页面。
const results = [];
const database = loadQuestDatabase();
compilePresentationFacts(database);
for (const quest of Object.values(database.quests)) {
  const source = new Map(quest.source.rawLines.map(line => [line.line, line.text]));
  const omissions = [];
  for (const step of quest.flow.steps) {
    const text = [step.text, ...[...(step.operations || []), ...(step.afterOperations || []), ...(step.branchGroups || []).flatMap(group => group.operations || [])].map(operation => operation.text), ...(step.notes || []).map(note => typeof note === 'string' ? note : note.text),
      ...(step.presentationFacts || []).map(row => row.text),
      ...(step.presentationSections || []).flatMap(section => (section.rows || []).map(row => `${row.label} ${row.text}`)),
      ...(quest.sourceSupplements?.areas || []).filter(area => area.afterStep === step.order).map(area => area.text)
    ].join(' ');
    for (const line of step.sourceLines || []) {
      for (const coordinate of new Set((source.get(line) || '').match(/（\d+\.\d+）/g) || [])) {
        if (!text.includes(coordinate)) omissions.push({ step: step.id, sourceLine: line, coordinate });
      }
    }
  }
  if (omissions.length) results.push({ id: quest.id, name: quest.name, sourceUrl: quest.source.url, status: 'needs-review', omissions });
}
const report = {
  scope: '本地来源原文 → flow.steps 的正文/操作/注意/显式编译的条件、交互和独立资料表及同一步区域资料；未把证据行或原文副本当展示。遗漏为待复核候选，不是全库游戏事实正确性证明',
  questCount: Object.keys(database.quests).length,
  questsWithPotentialOmissions: results.length,
  potentialOmissionCount: results.reduce((sum, item) => sum + item.omissions.length, 0),
  results
};
fs.writeFileSync(path.join(projectDir, 'flow-coordinate-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ questsWithPotentialOmissions: report.questsWithPotentialOmissions, potentialOmissionCount: report.potentialOmissionCount }));
if (results.some(item => item.id === 'catalog-12cc7fb2-f639-4a9b-8627-4b66ead3bf9d')) throw new Error('忍者任务仍存在原文坐标遗漏');
