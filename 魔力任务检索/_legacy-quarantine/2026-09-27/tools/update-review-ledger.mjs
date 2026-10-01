import fs from 'node:fs';
import path from 'node:path';
import { loadQuestDatabase, projectDir } from './quest-database.mjs';

const ledgerPath = path.join(projectDir, 'data-src', 'review-ledger.json');
const database = loadQuestDatabase();

for (const quest of Object.values(database.quests || {})) {
  if (!quest.verification) {
    quest.verification = {
      status: 'unverified',
      method: null,
      reason: 'legacy-batch-classification'
    };
  }
}

const entries = Object.values(database.quests || {})
  .map(quest => ({
    id: quest.id,
    name: quest.name,
    sourceLineCount: quest.source?.lineCount || 0,
    sourceKey: quest.source?.key || null,
    sourceUrl: quest.source?.url || null,
    status: quest.verification?.status || 'unverified',
    method: quest.verification?.method || null,
    reviewedSourceRanges: quest.verification?.reviewedSourceRanges || [],
    note: quest.verification?.note || null
  }))
  .sort((a, b) => a.sourceLineCount - b.sourceLineCount || a.name.localeCompare(b.name, 'zh-CN'));

const statusCounts = entries.reduce((counts, entry) => {
  counts[entry.status] = (counts[entry.status] || 0) + 1;
  return counts;
}, {});

const ledger = {
  schemaVersion: 1,
  generatedFrom: 'data-src/database.json + data-src/quests/*.json',
  questCount: entries.length,
  sourceLineCount: entries.reduce((sum, entry) => sum + entry.sourceLineCount, 0),
  statusCounts,
  entries
};

fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ questCount: ledger.questCount, sourceLineCount: ledger.sourceLineCount, statusCounts }, null, 2));
