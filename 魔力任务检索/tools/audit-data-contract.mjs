import fs from 'node:fs';
import path from 'node:path';
import { loadQuestDatabase, projectDir } from './quest-database.mjs';

const database = loadQuestDatabase();
const quests = Object.values(database.quests || {});
const reportPath = path.join(projectDir, 'data-contract-report.json');
const appSource = fs.readFileSync(path.join(projectDir, 'app.js'), 'utf8');
const stepFallbackEnabled = appSource.includes('renderStructuredFields(item.sourceDetails, STEP_RENDERED_FIELDS)');

const allowedQuestKeys = new Set([
  'schemaVersion', 'id', 'name', 'aliases', 'metadata', 'source', 'relations', 'requirements',
  'flow', 'versions', 'itemEvents', 'segments', 'verification', 'rewardEvents', 'outcomes',
  'presentation', 'exchangeRecipes', 'sourceSupplements'
]);
const renderedStepKeys = new Set([
  'id', 'order', 'text', 'route', 'branch', 'notes', 'inputs', 'outputs', 'choices', 'quiz', 'commands', 'operations', 'branchGroups', 'afterOperations', 'battleRef', 'battleRefs', 'allowsIntermediateOutputThenInput', 'sourceLines', 'verification'
]);

const unknownQuestKeys = new Map();
const stepExtensionCounts = new Map();
const stepExtensionsByQuest = [];
const segmentTypeCounts = new Map();
const segmentKindCounts = new Map();
let stepCount = 0;
let stepsWithExtensions = 0;
let segmentCount = 0;
let copiedSegmentCount = 0;
let minimalSegmentCount = 0;

const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);
for (const quest of quests) {
  for (const key of Object.keys(quest)) {
    if (!allowedQuestKeys.has(key)) increment(unknownQuestKeys, key);
  }

  const questExtensions = new Set();
  for (const step of quest.flow?.steps || []) {
    stepCount += 1;
    const extensions = Object.keys(step).filter(key => !renderedStepKeys.has(key));
    if (extensions.length) stepsWithExtensions += 1;
    for (const key of extensions) {
      increment(stepExtensionCounts, key);
      questExtensions.add(key);
    }
  }
  if (questExtensions.size) {
    stepExtensionsByQuest.push({ id: quest.id, name: quest.name, fields: [...questExtensions].sort() });
  }

  const rawLineByNumber = new Map((quest.source?.rawLines || []).map(line => [line.line, line.text]));
  for (const segment of quest.segments || []) {
    segmentCount += 1;
    if (quest.schemaVersion === 3) increment(segmentKindCounts, segment.kind || '(missing)');
    else increment(segmentTypeCounts, segment.type || '(missing)');
    if (rawLineByNumber.get(segment.line) === segment.text) copiedSegmentCount += 1;
    if (Object.keys(segment).every(key => ['line', 'text', 'type', 'kind', 'sourceLines', 'verification'].includes(key))) {
      minimalSegmentCount += 1;
    }
  }
}

const sortedCounts = map => Object.fromEntries([...map].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'en')));
const singletonSegmentTypes = [...segmentTypeCounts].filter(([, count]) => count === 1).map(([type]) => type).sort();
const report = {
  schemaVersion: 1,
  status: (!stepFallbackEnabled && stepExtensionCounts.size) || segmentTypeCounts.size > 100 ? 'migration-required' : 'contract-stable',
  database: {
    questCount: quests.length,
    questSchemaVersions: sortedCounts(new Map(Object.entries(quests.reduce((counts, quest) => {
      const key = String(quest.schemaVersion || '(missing)');
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {}))))
  },
  questShape: {
    unknownTopLevelFields: sortedCounts(unknownQuestKeys)
  },
  flowShape: {
    stepCount,
    stepsWithRendererUnhandledFields: stepFallbackEnabled ? 0 : stepsWithExtensions,
    rendererUnhandledFieldCount: stepFallbackEnabled ? 0 : stepExtensionCounts.size,
    rendererUnhandledFields: stepFallbackEnabled ? {} : sortedCounts(stepExtensionCounts),
    stepsUsingGenericFieldFallback: stepFallbackEnabled ? stepsWithExtensions : 0,
    genericFallbackFieldCount: stepFallbackEnabled ? stepExtensionCounts.size : 0,
    genericFallbackFields: stepFallbackEnabled ? sortedCounts(stepExtensionCounts) : {},
    affectedQuests: stepExtensionsByQuest
  },
  segmentShape: {
    segmentCount,
    copiedFromRawSourceCount: copiedSegmentCount,
    minimalClassificationOnlyCount: minimalSegmentCount,
    v3KindCounts: sortedCounts(segmentKindCounts),
    legacyUniqueTypeCount: segmentTypeCounts.size,
    singletonTypeCount: singletonSegmentTypes.length,
    legacyTypeCounts: sortedCounts(segmentTypeCounts),
    singletonTypes: singletonSegmentTypes
  }
};

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
if (unknownQuestKeys.size) {
  throw new Error(`任务顶层出现未登记字段：${[...unknownQuestKeys.keys()].join('、')}`);
}
console.log(JSON.stringify({
  status: report.status,
  questCount: quests.length,
  stepCount,
  stepsWithRendererUnhandledFields: stepFallbackEnabled ? 0 : stepsWithExtensions,
  rendererUnhandledFieldCount: stepFallbackEnabled ? 0 : stepExtensionCounts.size,
  stepsUsingGenericFieldFallback: stepFallbackEnabled ? stepsWithExtensions : 0,
  genericFallbackFieldCount: stepFallbackEnabled ? stepExtensionCounts.size : 0,
  legacyUniqueSegmentTypeCount: segmentTypeCounts.size,
  singletonSegmentTypeCount: singletonSegmentTypes.length,
  reportPath
}, null, 2));
