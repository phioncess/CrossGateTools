// 只从 QUEST_DATA 与独立练级关系层生成跨任务关键道具索引。
// 不读取旧版任务正文、奖励解析结果，也不通过步骤文本猜测道具关系。
(function buildStructuredIntegrations() {
  const records = Object.values(globalThis.QUEST_DATA?.quests || {});
  const byName = new Map(records.map(record => [record.name, record]));
  const byId = new Map(records.map(record => [record.id, record]));
  const guides = {};

  const stepOrder = (record, stepId) => (record?.flow?.steps || []).find(step => step.id === stepId)?.order || null;
  const acquisition = (record, itemName, preferredStep) => {
    const matches = (record?.itemEvents?.acquisitions || []).filter(event => event.item === itemName);
    return matches.find(event => event.step === preferredStep) || matches[0] || null;
  };
  const ensureGuide = (record, itemName, preferredStep) => {
    const event = acquisition(record, itemName, preferredStep);
    if (!record || !event) return null;
    const entries = (guides[record.id] ||= []);
    let entry = entries.find(candidate => candidate.name === itemName);
    if (!entry) {
      entry = {
        name: itemName,
        stepId: event.step,
        stepNumber: stepOrder(record, event.step),
        trainingUses: [],
        questUses: []
      };
      entries.push(entry);
    }
    return entry;
  };

  // 重复练级所需的保留道具由 TRAINING_ROUTE_DETAILS.keyItems 显式声明。
  // sourceStep 使用稳定步骤 ID；页面步骤改序时不再依赖旧数字。
  for (const [routeName, details] of Object.entries(globalThis.TRAINING_ROUTE_DETAILS || {})) {
    for (const keyItem of details.keyItems || []) {
      const sourceQuestName = keyItem.sourceQuest || (globalThis.TRAINING_ENTRY_TASKS?.[routeName] || [])[0];
      const sourceQuest = byName.get(sourceQuestName);
      const entry = ensureGuide(sourceQuest, keyItem.name, keyItem.sourceStep);
      if (!entry) continue;
      entry.trainingUses.push({
        routeName,
        text: keyItem.text || details.repeat || details.firstTime || details.checkpoint || ''
      });
    }
  }

  // 后续任务用到的道具仅采用结构化 itemSources 关系；不按同名文本猜测。
  for (const targetQuest of records) {
    for (const relation of targetQuest.relations?.itemSources || []) {
      if (!relation?.item || !relation?.sourceQuest) continue;
      const sourceQuest = byName.get(relation.sourceQuest);
      const entry = ensureGuide(sourceQuest, relation.item);
      if (!entry || entry.questUses.some(use => use.questId === targetQuest.id)) continue;
      const input = (targetQuest.itemEvents?.inputs || []).find(event => event.item === relation.item);
      const inputStep = stepOrder(targetQuest, input?.step);
      entry.questUses.push({
        questId: targetQuest.id,
        questName: targetQuest.name,
        stepNumber: inputStep,
        text: inputStep
          ? `《${targetQuest.name}》流程第 ${inputStep} 步需要【${relation.item}】。`
          : `《${targetQuest.name}》明确要求【${relation.item}】。`
      });
    }
  }

  for (const entries of Object.values(guides)) {
    entries.sort((a, b) => (a.stepNumber || 999) - (b.stepNumber || 999) || a.name.localeCompare(b.name, 'zh-CN'));
  }
  globalThis.KEY_ITEM_GUIDES = guides;
  globalThis.STRUCTURED_QUEST_BY_ID = byId;
})();
