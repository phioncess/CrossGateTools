import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadQuestDatabase, projectDir, questRecordsDir } from './quest-database.mjs';

const sourceDocumentsPath = path.join(projectDir, 'source-documents.js');
const source = fs.readFileSync(sourceDocumentsPath, 'utf8');
const context = {};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(`${source}\n;globalThis.__SOURCE_DOCUMENTS__ = SOURCE_DOCUMENTS;`, context, { filename: sourceDocumentsPath });

const documents = context.__SOURCE_DOCUMENTS__ || {};
const database = loadQuestDatabase();
let migratedAreaCount = 0;
let evidenceMatchedCount = 0;
const orphaned = [];

for (const [questId, document] of Object.entries(documents)) {
  const areas = document.areas || [];
  if (!areas.length) continue;
  const quest = database.quests[questId];
  if (!quest) {
    orphaned.push({ questId, areas });
    continue;
  }

  const stepOrders = new Set((quest.flow?.steps || []).map(step => step.order));
  const supplements = areas.map((area, index) => {
    const requestedStep = Number(area.afterStep);
    const afterStep = stepOrders.has(requestedStep) ? requestedStep : null;
    const normalizedText = String(area.text || '').replace(/^◆/, '').trim();
    const sourceLines = (quest.source?.rawLines || [])
      .filter(line => {
        const raw = String(line.text || '').trim();
        return raw.includes(normalizedText) || normalizedText.includes(raw);
      })
      .map(line => line.line);
    if (sourceLines.length) evidenceMatchedCount += 1;
    return {
      id: `area-${area.afterStep}-${index + 1}`,
      afterStep,
      ...(afterStep == null ? { placement: 'after-flow', originalAfterStep: requestedStep } : {}),
      text: String(area.text || ''),
      sourceLines,
      sourceReference: 'source-documents.js',
      verification: {
        status: 'verified',
        method: sourceLines.length ? 'source-line-match' : 'preserved-source-document-mapping'
      }
    };
  });
  quest.sourceSupplements = { areas: supplements };
  fs.writeFileSync(path.join(questRecordsDir, `${questId}.json`), `${JSON.stringify(quest, null, 2)}\n`, 'utf8');
  migratedAreaCount += supplements.length;
}

const mediaOnlyDocuments = Object.fromEntries(Object.entries(documents)
  .filter(([, document]) => (document.images || []).length)
  .map(([questId, document]) => [questId, { images: document.images }]));
fs.writeFileSync(
  sourceDocumentsPath,
  `// 仅保存本地原图与任务步骤的对应关系；业务文本已经迁入 QUEST_DATA.sourceSupplements。\nconst SOURCE_DOCUMENTS = ${JSON.stringify(mediaOnlyDocuments, null, 2)};\n`,
  'utf8'
);

const orphanPath = path.join(projectDir, '_legacy-quarantine', '2026-09-27', 'data-src', 'orphaned-source-supplements.json');
fs.writeFileSync(orphanPath, `${JSON.stringify({ source: 'source-documents.js', records: orphaned }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ migratedAreaCount, evidenceMatchedCount, orphanQuestCount: orphaned.length, mediaDocumentCount: Object.keys(mediaOnlyDocuments).length }, null, 2));
