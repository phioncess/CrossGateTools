import {stepSemanticFields,stepCollectionTitles} from './presentation-facts.mjs';
export const QUEST_SCHEMA_V3 = 3;

const questKeys = new Set([
  'schemaVersion', 'id', 'name', 'aliases', 'metadata', 'source', 'relations', 'requirements',
  'flow', 'versions', 'itemEvents', 'segments', 'verification', 'rewardEvents', 'outcomes',
  'presentation', 'exchangeRecipes', 'sourceSupplements'
]);
const stepKeys = new Set([
  'id', 'order', 'text', 'inputs', 'outputs', 'notes', 'sourceLines', 'verification',
  'route', 'branch', 'commands', 'operations', 'afterOperations', 'branchGroups',
  'choices', 'quiz', 'battleRef', 'battleRefs', 'allowsIntermediateOutputThenInput',
  'exchangeRecipe', 'interaction', 'failureBattleRef',
  ...stepSemanticFields, ...Object.keys(stepCollectionTitles)
]);
const segmentKeys = new Set(['line', 'text', 'kind', 'bindings', 'version', 'tier', 'sourceLines', 'verification']);
const segmentKinds = new Set(['requirement', 'flow', 'battle', 'reward', 'item', 'relation', 'note', 'media']);

function unknownKeys(value, allowed) {
  return Object.keys(value || {}).filter(key => !allowed.has(key));
}

function assertEvidence(quest, entity, label) {
  if (!Array.isArray(entity?.sourceLines) || !entity.sourceLines.length) {
    throw new Error(`${quest.name}：${label} 缺少证据行`);
  }
  for (const line of entity.sourceLines) {
    if (!Number.isInteger(line) || line < 1 || line > quest.source.lineCount) {
      throw new Error(`${quest.name}：${label} 证据行越界 ${line}`);
    }
  }
  if (entity.verification?.status !== 'verified') {
    throw new Error(`${quest.name}：${label} 未核验`);
  }
}

export function validateQuestV3(quest) {
  if (quest.schemaVersion !== QUEST_SCHEMA_V3) return;
  const extraQuestKeys = unknownKeys(quest, questKeys);
  if (extraQuestKeys.length) throw new Error(`${quest.name}：v3 任务出现未登记顶层字段 ${extraQuestKeys.join('、')}`);
  if (quest.verification?.status !== 'verified') throw new Error(`${quest.name}：v3 任务必须完成核验`);

  const stepIds = new Set();
  for (const step of quest.flow?.steps || []) {
    const extraStepKeys = unknownKeys(step, stepKeys);
    if (extraStepKeys.length) throw new Error(`${quest.name}：步骤 ${step.id} 出现渲染契约外字段 ${extraStepKeys.join('、')}`);
    if (!step.id || stepIds.has(step.id)) throw new Error(`${quest.name}：步骤 ID 缺失或重复 ${step.id}`);
    if (!Number.isInteger(step.order) || !step.text) throw new Error(`${quest.name}：步骤 ${step.id} 缺少顺序或正文`);
    stepIds.add(step.id);
    assertEvidence(quest, step, `步骤 ${step.id}`);
    for (const point of step.routePoints || []) {
      if (!point.name || !/^\d+\.\d+$/.test(point.coordinate)) throw new Error(`${quest.name}：步骤 ${step.id} 位置不完整`);
      assertEvidence(quest,point,`${step.id} 位置 ${point.name}`);
      const supported=point.sourceLines.some(line=>{
        const text=quest.source.rawLines.find(row=>row.line===line)?.text || '';
        return [...text.matchAll(/[（(]\s*(\d+)[.,，]\s*(\d+)\s*[）)]/g)].some(match=>`${Number(match[1])}.${Number(match[2])}`===point.coordinate);
      });
      if (!supported) throw new Error(`${quest.name}：位置 ${point.name} 坐标缺少指定来源行支持`);
    }
    for (const field of ['commands', 'operations', 'afterOperations']) {
      if (step[field] != null && !Array.isArray(step[field])) throw new Error(`${quest.name}：${field} 必须为数组`);
      for (const entry of step[field] || []) {
        if (!entry.text) throw new Error(`${quest.name}：${field} 缺少正文`);
        assertEvidence(quest, entry, `${step.id}.${field}`);
      }
    }
  }
  if (!stepIds.has(quest.flow?.start?.stepId)) throw new Error(`${quest.name}：起点没有引用有效步骤`);

  const segmentLines = new Set();
  for (const segment of quest.segments || []) {
    const extraSegmentKeys = unknownKeys(segment, segmentKeys);
    if (extraSegmentKeys.length) throw new Error(`${quest.name}：原文行 ${segment.line} 出现旧分类字段 ${extraSegmentKeys.join('、')}`);
    if (!segmentKinds.has(segment.kind)) throw new Error(`${quest.name}：原文行 ${segment.line} 使用未登记类别 ${segment.kind}`);
    for (const binding of segment.bindings || []) {
      if (!segmentKinds.has(binding.kind) || typeof binding.target !== 'string' || !binding.target) throw new Error(`${quest.name}：原文行 ${segment.line} 绑定不完整`);
      const target = binding.target.split('.').reduce((value,key) => value?.[key],quest);
      if (!target || !target.sourceLines?.includes(segment.line)) throw new Error(`${quest.name}：原文行 ${segment.line} 绑定无有效证据 ${binding.target}`);
    }
    if (segmentLines.has(segment.line)) throw new Error(`${quest.name}：原文行 ${segment.line} 重复分类`);
    segmentLines.add(segment.line);
    assertEvidence(quest, segment, `原文行 ${segment.line}`);
  }
  const businessLines = (quest.source?.rawLines || []).filter(line => !/^[-=]{8,}$/.test(String(line.text || '').trim()));
  if (businessLines.some(line => !segmentLines.has(line.line))) throw new Error(`${quest.name}：v3 逐行分类不完整`);

  for (const version of Object.values(quest.versions || {})) {
    for (const tier of Object.values(version.tiers || {})) {
      for (const battle of Object.values(tier.battles || {})) {
        if (battle.triggerStep && !stepIds.has(battle.triggerStep)) throw new Error(`${quest.name}：战斗 ${battle.id} 引用了无效步骤`);
        assertEvidence(quest, battle, `战斗 ${battle.id}`);
      }
    }
  }
  for (const event of quest.rewardEvents || []) {
    if (event.step && !stepIds.has(event.step)) throw new Error(`${quest.name}：奖励事件 ${event.id} 引用了无效步骤`);
    assertEvidence(quest, event, `奖励事件 ${event.id}`);
  }
  const stepOrders = new Set((quest.flow?.steps || []).map(step => step.order));
  for (const area of quest.sourceSupplements?.areas || []) {
    const validPlacement = stepOrders.has(area.afterStep) || (area.afterStep == null && area.placement === 'after-flow');
    if (!area.id || !area.text || !validPlacement) throw new Error(`${quest.name}：区域补充缺少 ID、正文或有效位置`);
    if (!area.sourceLines?.length && !area.sourceReference) throw new Error(`${quest.name}：区域补充缺少来源证据`);
    if (area.verification?.status !== 'verified') throw new Error(`${quest.name}：区域补充未核验`);
  }
}
