import fs from 'node:fs';
import path from 'node:path';
import { loadQuestDatabase, projectDir, questRecordsDir } from './quest-database.mjs';
import { validateQuestV3 } from './quest-schema-v3.mjs';
import { compilePresentationFacts } from './presentation-facts.mjs';

const outputPath = path.join(projectDir, 'quest-data.js');
const reportPath = path.join(projectDir, 'structured-data-report.json');

const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));
function writeText(filename, content) {
  if (fs.existsSync(filename) && fs.readFileSync(filename, 'utf8') === content) return;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      fs.writeFileSync(filename, content, 'utf8');
      return;
    } catch (error) {
      if (!['EBUSY', 'EPERM', 'UNKNOWN'].includes(error.code) || attempt === 12) throw error;
      Atomics.wait(sleepBuffer, 0, 0, attempt * 50);
    }
  }
}

const database = loadQuestDatabase();
const quests = Object.values(database.quests || {});
if (!database.schemaVersion || !quests.length) throw new Error('结构化任务数据库为空或缺少 schemaVersion。');

const report = {
  schemaVersion: database.schemaVersion,
  questCount: quests.length,
  sourceLineCount: 0,
  segmentCount: 0,
  versionedQuestCount: 0,
  battleCount: 0,
  enemyCount: 0,
  verifiedQuestCount: 0,
  schemaV2QuestCount: 0,
  schemaV3QuestCount: 0,
  errors: []
};

const ids = new Set();
for (const quest of quests) {
  const errors = [];
  try {
    validateQuestV3(quest);
  } catch (error) {
    errors.push(error.message);
  }
  if (!quest.id || !quest.name) errors.push('缺少任务 ID 或名称');
  if (ids.has(quest.id)) errors.push(`重复任务 ID：${quest.id}`);
  ids.add(quest.id);
  if (quest.catalogBattles || quest.catalogBattleEvidence || quest.legacy) errors.push('仍包含旧版恢复字段');
  if (quest.verification?.status !== 'verified') errors.push('未完成结构化核验');
  if (!quest.source?.url || !quest.source?.rawLines?.length) errors.push('缺少来源 URL 或原文行');
  if (!(quest.flow?.steps || []).length) errors.push('缺少结构化流程步骤');
  const stepOrders = new Set((quest.flow?.steps || []).map(step => step.order));
  const supplementIds = new Set();
  for (const area of quest.sourceSupplements?.areas || []) {
    const validPlacement = stepOrders.has(area.afterStep) || (area.afterStep == null && area.placement === 'after-flow');
    if (!area.id || supplementIds.has(area.id)) errors.push(`区域补充 ID 缺失或重复：${area.id}`);
    supplementIds.add(area.id);
    if (!area.text || !validPlacement) errors.push(`区域补充缺少正文或有效位置：${area.id}`);
    if (!area.sourceLines?.length && !area.sourceReference) errors.push(`区域补充缺少来源证据：${area.id}`);
    if (area.verification?.status !== 'verified') errors.push(`区域补充未核验：${area.id}`);
  }
  const coveredLines = new Set((quest.segments || []).flatMap(segment => segment.sourceLines || []));
  const uncoveredFacts = (quest.source?.rawLines || []).filter(line =>
    !coveredLines.has(line.line) && !/^(?:[-=—－_·•*＊]){5,}$/.test(String(line.text || '').replace(/\s+/g, ''))
  );
  if (uncoveredFacts.length) errors.push(`原文事实行未完整覆盖：${uncoveredFacts.map(line => line.line).join('、')}`);

  report.sourceLineCount += quest.source?.rawLines?.length || 0;
  report.segmentCount += quest.segments?.length || 0;
  report.verifiedQuestCount += quest.verification?.status === 'verified' ? 1 : 0;
  report.schemaV2QuestCount += quest.schemaVersion === 2 ? 1 : 0;
  report.schemaV3QuestCount += quest.schemaVersion === 3 ? 1 : 0;
  report.versionedQuestCount += Object.keys(quest.versions || {}).some(key => key !== 'common') ? 1 : 0;
  for (const version of Object.values(quest.versions || {})) {
    for (const tier of Object.values(version.tiers || {})) {
      const battles = Object.values(tier.battles || {});
      report.battleCount += battles.length;
      report.enemyCount += battles.reduce((sum, battle) => sum + Object.keys(battle.enemies || {}).length, 0);
    }
  }
  if (errors.length) report.errors.push({ id: quest.id, name: quest.name, errors });
}

writeText(reportPath, `${JSON.stringify(report, null, 2)}\n`);
if (report.errors.length) {
  throw new Error(`结构化数据发布失败：${report.errors.length} 个任务存在错误。旧任务文件不会参与恢复。`);
}

const presentationCoverage = compilePresentationFacts(database);
report.presentationCoverage = presentationCoverage;
writeText(reportPath, `${JSON.stringify(report, null, 2)}\n`);
writeText(outputPath, `// 自动生成：唯一权威来源为 data-src/database.json 与 data-src/quests/*.json；展示字段由 tools/presentation-facts.mjs 显式编译。\nglobalThis.QUEST_DATA = ${JSON.stringify(database)};\n`);
console.log(JSON.stringify({
  mode: 'publish-structured-data-only',
  sourcePath: questRecordsDir,
  outputPath,
  reportPath,
  legacyRecovery: false,
  presentationCoverage,
  ...report
}, null, 2));
