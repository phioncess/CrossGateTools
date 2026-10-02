// Explicit presentation contract for existing structured facts. Never reads rawLines/segments.
// Fact rows are compiled before publishing; the browser consumes labels/text and evidence keys.
export const rewardBaseFields = new Set(`type level use effect hpRecovery mpRecovery skillExperienceIncrease result petDescription description stats durability modifiers skillExperience stackLimit tradeable variants availabilityNote change equippedTitle raceChange skillEffect equipRestriction referenceQuest verificationNote petProfile resultPetProfile options skills category attack defense agility spirit recovery critical accuracy dodge counter hp mp charm magicAttack magicResistance poisonResistance sleepResistance petrifyResistance drunkResistance confusionResistance forgetResistance useEffect stallTradeable variableStats statsVariable valuesVariable droppedResult disappearsWhenDropped title`.split(' '));
['life','magic','evasion','magicalAttack','luck'].forEach(key => rewardBaseFields.add(key));

const labels = {
  bankable:'可存银行', storable:'可保存', stackable:'可叠加', canDrop:'可丢弃', droppable:'可丢弃', dropAllowed:'可丢弃', canDropOnGround:'可丢到地面', dropBehavior:'丢弃规则',
  petMailable:'可宠物邮件', petMail:'可宠物邮件', petMailAllowed:'可宠物邮件', stallable:'可摆摊', stallAllowed:'可摆摊', directTradeable:'可直接交易', bound:'绑定',
  petLoyaltyIncrease:'宠物忠诚增加', titleAcquisition:'称号取得条件', socketEffects:'镶嵌效果', shopPrice:'商店价格', shopPriceG:'商店价格（G）', priceG:'价格（G）', currency:'货币',
  lifeRecovery:'生命恢复', magicRecovery:'魔力恢复', life:'生命', magic:'魔力', magicalAttack:'魔攻', evasion:'闪躲', confusion:'抗混乱', poison:'抗毒', drunk:'抗酒醉', sleep:'抗昏睡', petrify:'抗石化',
  valuesFluctuate:'数值浮动', dataVariance:'数值浮动', fixedStats:'固定数值', effects:'技能效果', logoutBehavior:'登出规则', useChoices:'使用选项', careerRestriction:'职业限制',
  resistance:'抗性', resistances:'抗性', statusResistance:'状态抗性', statusResistances:'状态抗性', luck:'幸运', luckEvidence:'幸运资料依据',
  ambushRate:'偷袭率效果', ambushChanceIncrease:'偷袭率增加', ambushRateIncrease:'偷袭率增加', ambushParameter:'偷袭参数', ambushRateComparison:'偷袭效果反馈',
  titleWhileEquipped:'装备时称号', heldTitle:'持有时称号', equippedTitleViaNpc:'装备后与NPC取得称号', setTitle:'套装称号', useResultTitle:'使用后称号', titlePassive:'称号效果', titleEvent:'称号取得方式',
  npcSalePrice:'售店价格', shopSellPrice:'售店价格', shopSellable:'可售店', shopSellPriceG:'售店价格（G）', shopSellablePrice:'售店价格',
  resultPet:'获得宠物', useResult:'使用结果', useTarget:'使用对象', useLocation:'使用地点', consumedOnUse:'使用时消耗', useConsumes:'使用时消耗', consumable:'消耗品', reusable:'可重复使用',
  combineRequirement:'合成所需数量', combineQuantity:'合成所需数量', combineResult:'合成结果', recipientRequirement:'领取者条件', useRequirement:'使用要求', learnRequirement:'学习要求', learns:'可学习内容',
  blocksQuestAcceptance:'持有时阻止接取任务', exchangeBlockedWhileHeld:'持有时阻止兑换', requiredForLaterQuest:'后续任务需要',
  skillMpReduction:'技能耗魔减少', mpReduction:'技能耗魔减少', mpCostReduction:'技能耗魔减少', timeCardMinutes:'打卡时间（分钟）', workTimeHours:'工作时间（小时）', workTimeMinutes:'工作时间（分钟）', workTimeIncreaseHours:'工作时间增加（小时）',
  injuryBlocks:'抵挡受伤次数', effectCertainty:'效果确定性', selection:'选择方式', useLimit:'使用次数限制', maxUses:'最多使用次数', uses:'使用次数', durabilityCostPerUse:'每次使用耐久消耗', useDurabilityCost:'使用耐久消耗',
  race:'种族', resultRace:'结果种族', skillSlots:'技能栏', specialSkill:'特殊技能', correction:'修正', growth:'成长档', growthGrades:'成长档', totalGrowth:'总档', baseStats:'基础档', appearance:'外形', equippedAppearance:'装备时改变外形',
  afterAppraisal:'鉴定结果', nameCorrection:'名称修正', variant:'型号说明', elements:'属性', elementCount:'属性种类数', elementRatio:'属性比例', bonusOneOf:'随机增加其中一种', elementBonus:'属性增加', elementVariants:'属性型号', statPatterns:'数值组合',
  persistsOnLogout:'登出后保留', endsOnLogout:'登出后失效', effectDuration:'效果持续条件', durationHours:'持续时间（小时）', battles:'生效战斗场数', useWindowMinutes:'使用时限（分钟）',
  destinations:'传送目的地', destination:'传送目的地', teleportUse:'传送用途', consumedOnTeleport:'传送时消耗',
  sameVariantPossessionBlocksUse:'持有同型号时无法使用', cannotUseWhileHoldingSameFeather:'持有同种羽毛时无法使用', useCondition:'使用条件', useRestriction:'使用限制', restriction:'使用限制', suitableFor:'适用职业类型',
  knownIssue:'已知问题', warning:'注意事项', autoRefillAfterBattle:'战斗后自动补充', activityOnly:'仅限活动使用', hpIncrease:'生命增加', mpIncrease:'魔力增加', charmIncrease:'魅力增加', characterCharmIncrease:'角色魅力增加',
  encounterRateReductionPercent:'遇敌率减少（%）', encounterRateIncreasePercent:'遇敌率增加（%）', drunkennessResistance:'抗酒醉', forgetfulnessResistance:'抗遗忘', luckBonus:'幸运加成', testCredit:'测试资料署名',
  sourceStatLabel:'原攻略属性名', sourceStatValue:'原攻略属性数值', matchingSuperSpellMpReductionPercent:'对应超强魔法耗魔减少（%）', correspondingStrongSpellMpReductionPercent:'对应强力魔法耗魔减少（%）',
  crystalCapNote:'水晶属性上限说明', pureCrystalInteraction:'与纯水晶同时装备', cooldown:'有冷却限制', timerResetWhenNewEggObtained:'取得新蛋时重置孵化时间',
  transformationChain:'使用转换顺序', transformation:'使用后造型', approximate:'数值为约数', careerRankRequirement:'有职业晋阶要求', thirdPromotionRequired:'需要三转', useCost:'使用费用',
  weaponSynthesis:'合成到武器的效果', armorSynthesis:'合成到防具的效果', weapon:'镶嵌武器效果', armor:'镶嵌防具效果', stackableEffect:'效果可叠加', outputQuantity:'产出数量',
  server:'服务器范围', serverStatus:'服务器开放状态', inventoryLimit:'持有数量上限', holdingLimit:'持有数量上限', rangesPending:'数值范围待核验', finalStatsPending:'最终属性待核验',
  usePrompt:'使用提示', actuallyStartsWorkTime:'实际开启工作时间', startsWorkTime:'开启工作时间', attributes:'属性说明', applicablePet:'适用宠物', usage:'用法', colorChangePermanent:'变色效果永久', recolorableWithAnotherCard:'可用另一张卡再次变色',
  allResistances:'全抗性', equippedEffect:'装备效果', cookingEffect:'加入料理的效果', cookingMpReductionPercent:'料理技能耗魔减少（%）', useEffects:'使用效果',
  sourceDoesNotDescribeEffect:'原攻略未说明效果', contents:'内容', exactSelection:'内容选择规则', displayName:'名称', perUseResult:'每次使用结果', quantityRange:'数量范围',
  identificationCost:'鉴定费用', identificationCostForNonAppraiser:'非鉴定师鉴定费用', effectForGatheringCareers:'采集系使用效果', mpRecoveryApprox:'魔力恢复约值', loyaltyChange:'忠诚变化',
  attacksPerAction:'每次行动攻击次数', incubationDays:'孵化天数', failureIfNoPetSlot:'宠物栏满时的结果', battleUsable:'战斗中可使用',
};
const nestedLabels = {
  ...labels, name:'名称', item:'道具', skill:'技能', percent:'减少比例（%）', mpReductionPercent:'耗魔减少（%）', manaCostChangePercent:'耗魔变化（%）', mpCostReductionPercent:'耗魔减少（%）',
  action:'取得方式', title:'称号', condition:'条件', location:'地点', result:'结果', pet:'宠物', level:'等级', type:'类型', text:'说明', scope:'生效范围', amount:'数量', unit:'单位',
  attack:'攻击', defense:'防御', agility:'敏捷', spirit:'精神', recovery:'回复', critical:'必杀', accuracy:'命中', dodge:'闪躲', counter:'反击', hp:'生命', mp:'魔力', charm:'魅力', magicAttack:'魔攻', magicResistance:'魔抗',
  poisonResistance:'抗毒', sleepResistance:'抗昏睡', petrifyResistance:'抗石化', drunkResistance:'抗酒醉', confusionResistance:'抗混乱', forgetResistance:'抗遗忘', durabilityPercent:'耐久变化（%）',
  drunkenness:'抗酒醉', forgetfulness:'抗遗忘', forget:'抗遗忘', earth:'地', water:'水', fire:'火', wind:'风', min:'最小值', max:'最大值', random:'随机', untested:'未测试',
  totalGrade:'总档', skillSlots:'技能栏', baseStats:'基础档', elements:'属性', modifiers:'修正', stats:'数值', growth:'成长档', totalGrowth:'总档', skills:'技能',
  completedQuest:'需要完成任务', currentSkillSlots:'当前技能栏', freePetSlots:'空闲宠物栏', specialInnateSkill:'有特殊天生技能', innateSkill:'天生技能', attackPercent:'攻击变化（%）', defensePercent:'防御变化（%）',
  skillSlotsFrom:'使用前技能栏', skillSlotsTo:'使用后技能栏', to:'目标种族', with:'配合使用', npc:'NPC', additionalInput:'额外材料', perUse:'每次使用', gradeStatus:'成长档核验状态', career:'职业', randomOneOf:'随机取得其一',
};
const baseLabels = {
  ...nestedLabels, type:'类别', category:'类别', use:'用途', effect:'使用效果', hpRecovery:'生命恢复', mpRecovery:'魔力恢复', skillExperienceIncrease:'技能经验增加',
  result:'获得结果', petDescription:'宠物说明', description:'结果说明', stats:'属性数值', durability:'耐久', skillExperience:'技能经验', stackLimit:'每组叠加',
  tradeable:'可交易', variants:'型号说明', availabilityNote:'版本说明', change:'版本变化', equippedTitle:'装备称号', raceChange:'种族变化', skillEffect:'技能效果',
  equipRestriction:'装备限制', referenceQuest:'参考任务', verificationNote:'核验说明', petProfile:'宠物资料', resultPetProfile:'结果宠物资料', options:'分型资料',
  skills:'可习得技能', useEffect:'使用效果', stallTradeable:'可摆摊交易', variableStats:'数值浮动', statsVariable:'数值浮动', valuesVariable:'数值浮动',
  droppedResult:'丢弃结果', disappearsWhenDropped:'丢地消失', title:'称号效果',
};
const enums = {
  'source-unspecified':'原攻略未列明', 'choose-one':'自选一项', 'player-choice-one':'自选一项', 'random-one':'随机一项', 'random':'随机',
  'guaranteed':'确定取得', 'battle-capture-opportunity':'战斗中可捕捉', 'skill':'技能', 'pet':'宠物', 'career':'职业', 'item':'道具', 'currency':'货币',
  'once-per-character':'每角色一次', 'one-of':'其中一项', 'closed':'已关闭', 'available':'开放', 'first':'首次通关', 'failure':'失败', 'common':'通用',
  'tier-1':'第一档', 'tier-2':'第二档', 'randomOneOf':'随机取得其一', 'none':'无', 'optional':'可选',
};
const evidenceKeys = new Set(['sourceLines','verification','line','lines','id','sourceRaw']);
Object.assign(enums, {
  'each-party-member':'每名队员', 'one-holder':'队伍一人持有即可', 'each-participant':'每名参与者', 'if-held':'持有时', 'random-one-of':'随机取得其一',
  'source-name-needs-clarification':'来源名称待澄清', 'female-route':'女性路线角色', 'male-route':'男性路线角色', 'one-party-member':'一名队员',
  'random-one-of-two':'随机取得两者之一', 'random-one-party-member':'队伍随机一人', 'each-party-member-multiple':'每名队员可取得多份', 'one-stack':'一组',
  'each-solo-interactor':'每名独立对话者', 'random-one-of-four':'随机取得四者之一', 'harvest-battle':'采集触发战斗取得', 'per-card':'每张卡',
  'partial-source-list':'来源只列部分结果', 'one-member':'一名队员', 'random-variant':'随机型号', 'leveling-zone-monsters':'练级区域魔物',
  'unlimited-within-duration':'有效期内不限次数', 'party-leader':'队长', 'priest-processed':'传教士处理后的状态', 'original-trainee':'最初同一名见习角色',
  'tradeable-with-original-trainee':'可交易，需交还最初见习角色', 'village-processed-nontradeable':'村长处理后不可交易的状态', 'final-letter':'最终阶段信件', 'necklace-reward':'项链奖励阶段',
  'source-unspecified-random-variant':'随机型号，来源未列具体对应', 'runner-type':'可孵化岩地跑者的蛋', 'griffin-type':'可孵化狮鹫兽的蛋', 'random-party-members':'队伍随机成员',
  'limited-time':'限时开放', 'choose-three-distinct':'选择三个不同项目', 'per-design':'每张设计图', 'guaranteed-plus-random-pool':'固定奖励并另有随机奖池',
  'chance-random':'概率随机取得', 'all-party':'全队', 'each-prospective-member':'每名需继续此路线的队员', 'each-party-member-required':'每名队员均需取得',
  'solo-battle-victory':'单人战斗胜利取得', '1-or-40-or-50-or-80':'1、40、50或80（按对应条件）', 'by-gathering-skill-level':'按采集技能等级', 'source-listed-only':'仅包含来源明确列出的项目',
  daily:'每日', unspecified:'原攻略未列明', fixed:'固定', current:'当前版本', yes:'是', no:'否',
});
export function factText(value, dictionary = nestedLabels) {
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value !== 'object') return enums[value] || String(value);
  if (Array.isArray(value)) return value.map(entry => factText(entry, dictionary)).filter(Boolean).join('；');
  if (value.min != null || value.max != null) {
    const range = value.min != null ? `${value.min}${value.max != null && value.max !== value.min ? `～${value.max}` : ''}` : `最高${value.max}`;
    return `${value.approximate ? '约' : ''}${range}${value.unit || ''}${value.random ? '（随机）' : ''}${value.untested ? '（未测试）' : ''}`;
  }
  return Object.entries(value).filter(([key]) => !evidenceKeys.has(key)).map(([key, entry]) => {
    const label = dictionary[key] || (/[^\x00-\x7F]/.test(key) ? key : null);
    if (!label) throw new Error(`未定义结构化子字段展示: ${key}`);
    const text = factText(entry, dictionary);
    return text ? `${label}：${text}` : '';
  }).filter(Boolean).join('；');
}

export function rewardPropertyFacts(item) {
  const properties = {...item.commonProperties, ...item.properties, ...item.appraisedProperties};
  return Object.entries(properties).filter(([key]) => !rewardBaseFields.has(key) && !evidenceKeys.has(key)).map(([key, value]) => {
    if (!labels[key]) throw new Error(`未定义奖励属性展示: ${key}`);
    return {key, label:labels[key], text:factText(value)};
  }).filter(row => row.text);
}

export function allRewardPropertyFacts(item) {
  const properties = {...item.commonProperties, ...item.properties, ...item.appraisedProperties};
  return Object.entries(properties).filter(([key]) => !evidenceKeys.has(key)).map(([key, value]) => {
    const label = labels[key] || baseLabels[key];
    if (!label) throw new Error(`未定义奖励属性展示: ${key}`);
    return {key,label,text:factText(value, {...nestedLabels, weapon:'武器', armor:'防具', accessory:'饰品'})};
  }).filter(row => row.text);
}

export function compilePresentationFacts(database) {
  const stats = {quests:0, rewardItems:0, rewardFactRows:0, rewardItemFactRows:0, rewardEventFactRows:0, steps:0, stepFactRows:0, interactionRows:0, stepSections:0, affectedQuestCount:0};
  const questByName = new Map(Object.values(database.quests).map(quest => [quest.name,quest.id]));
  for (const quest of Object.values(database.quests)) {
    let changed = false;
    for (const event of quest.rewardEvents || []) {
      event.presentationFacts = rewardEventFacts(event,quest);
      stats.rewardEventFactRows += event.presentationFacts.length;
      for (const item of event.items || []) {
      if (item.role !== 'valuable-result') continue;
      const facts = rewardPropertyFacts(item);
      item.presentationFacts = facts;
      item.allPropertyFacts = allRewardPropertyFacts(item);
      item.presentationItemFacts = rewardItemFacts(item, quest);
      for (const row of item.presentationItemFacts) if (['useQuest','useInQuest'].includes(row.key) && questByName.has(item[row.key])) row.questId = questByName.get(item[row.key]);
      stats.rewardItemFactRows += item.presentationItemFacts.length;
      stats.rewardItems++;
      stats.rewardFactRows += facts.length;
      if (facts.length) changed = true;
      }
    }
    for (const step of quest.flow.steps) {
      step.presentationFacts = stepPresentationFacts(step, quest);
      step.presentationInteractions = stepInteractionFacts(step);
      step.presentationSections = stepSourceSections(step,quest);
      stats.stepSections += step.presentationSections.length;
      const fields = new Set([...coreStepFields,...step.presentationFacts.map(row => row.key),...step.presentationSections.map(section => section.key)]);
      if (step.optional === true && step.branch) fields.add('optional');
      ['rewardEventRefs','rewardEventRef','rewardPool'].forEach(key => fields.add(key));
      const missing = Object.keys(step).filter(key => !fields.has(key));
      if (missing.length) throw new Error(`${quest.name}/${step.id} 未定义流程字段展示：${missing.join('、')}`);
      stats.interactionRows += step.presentationInteractions.length;
      if (step.presentationFacts.length) stats.steps++;
      stats.stepFactRows += step.presentationFacts.length;
    }
    if (changed) stats.quests++;
    if (changed || quest.flow.steps.some(step => step.presentationFacts.length || step.presentationInteractions.length || step.presentationSections.length) || (quest.rewardEvents || []).some(event => event.presentationFacts.length || event.items.some(item => item.presentationItemFacts?.length))) stats.affectedQuestCount++;
  }
  return stats;
}
const coreStepFields = new Set('id order text route branch notes inputs outputs choices quiz commands operations branchGroups afterOperations battleRef battleRefs allowsIntermediateOutputThenInput sourceLines verification presentationFacts presentationInteractions presentationSections equipmentRefs duplicateSourceLines'.split(' '));

const stepLabels = {
  optional:'此步可选', referenceOnly:'仅供参考', repeatable:'可重复进行', postCompletion:'完成任务后进行', alternateRoute:'替代路线', alternateEnding:'另一结局', alternate:'替代办法',
  postBattle:'战斗后进行', postActivity:'活动结束后进行', trainingRoute:'练级路线', inputSelection:'材料选择方式', orderIndependent:'执行顺序不限', sequenceOrderRequired:'必须按顺序进行',
  availability:'开放状态', closed:'已关闭', closedDate:'关闭日期', server:'服务器范围', version:'版本范围', versions:'版本范围', unavailableOn:'不可用服务器', tier:'档位',
  repeatLimit:'重复次数上限', repeatability:'重复规则', repeatIntervalHours:'重复间隔（小时）', waitHours:'等待时间（小时）', waitBeforeStep:'执行此步前等待', waitAfterPreviousStep:'上一步后等待',
  conditional:'有条件分支', condition:'执行条件', shortcut:'快捷路线', partySensitive:'受队伍状态影响', bugAffected:'受异常影响',
  sourceIncomplete:'原攻略未完整记录', sourceNameVariant:'原攻略名称差异', sourceQuantityAmbiguous:'原攻略数量存在歧义', sourceConsumptionAmbiguous:'原攻略消耗规则存在歧义', acquisitionMethodUnspecified:'原攻略未说明取得方式',
  sourceUncertainty:'来源不确定项', sourceCorrection:'来源修正', sourceConflict:'来源冲突', sourceLocationRaw:'原攻略地点表述', sourceFollowupUnspecified:'原攻略未说明后续', sourceAmbiguity:'来源歧义',
  outcome:'执行结果', abortsCurrentRun:'终止本次路线', abortsQuest:'终止任务', terminatesWithoutReward:'结束且无奖励', noReward:'无奖励', abandonsRoute:'放弃路线',
  repeatableAfterDiscard:'丢弃后可重新进行', repeatableBattle:'可重复战斗', region:'区域', chainedBattles:'连续战斗场数', enemiesPerBattle:'每场敌人数', groupedRandomPool:'按组随机取得', groupedAcquisition:'同次组合取得',
  hpCost:'生命消耗', pricePerSkillG:'每项技能价格（G）', mutuallyExclusiveWith:'互斥任务', charmChange:'魅力变化', clearType:'通关类型', randomEncounter:'随机遭遇', failureRoute:'失败路线', resultUnspecified:'原攻略未列结果',
  drySandExchangeResult:'干燥砂兑换结果', note:'注意事项', timingDecision:'时间判定规则',
};
const stepNestedLabels = {...nestedLabels, hours:'小时', minutes:'分钟', seconds:'秒', sourceWording:'原攻略表述', normalizedMeaning:'归一化含义', reason:'判断依据'};
export const stepSemanticFields = new Set([...Object.keys(stepLabels), 'rewardEventRef','rewardEventRefs','rewardPool','sequence','timing','recipeRefs','equipmentRefs','duplicateSourceLines']);
export function stepPresentationFacts(step, quest) {
  const rows = [];
  for (const [key, label] of Object.entries(stepLabels)) {
    if (step[key] == null || step[key] === '') continue;
    if (key === 'optional' && step.optional === true && step.branch) continue;
    let text = factText(step[key], stepNestedLabels);
    if (key === 'condition' && /^level>=\d+$/.test(text)) text = `等级不低于${text.slice(7)}`;
    rows.push({key,label:typeof step[key] === 'boolean' && step[key] === true ? '' : label,text:typeof step[key] === 'boolean' && step[key] === true ? label : text});
  }
  const rewardRefs = [...(step.rewardEventRefs || []), ...[step.rewardEventRef,step.rewardPool].filter(Boolean)];
  // Reward references connect this step to the acquisition section; do not repeat its entire item pool here.
  if (Array.isArray(step.sequence)) {
    const names = step.sequence.map(ref => quest.flow.steps.find(entry => entry.id === ref)).filter(Boolean).map(entry => `第${entry.order}步`);
    if (names.length) rows.push({key:'sequence',label:'执行顺序',text:names.join(' → ')});
  }
  if (step.recipeRefs?.length) rows.push({key:'recipeRefs',label:'兑换结果',text:step.recipeRefs.join('、')});
  // Evidence line numbers and equipment lookup keys belong to the data layer, not player prose.
  if (step.timing) {
    const target = quest.flow.steps.find(entry => step.timing === `before step ${entry.id}`);
    rows.push({key:'timing',label:'执行时机',text:target ? `第${target.order}步前` : step.timing});
  }
  return rows;
}

const interactionLabels = {
  quantity:'数量', amount:'金额', currency:'货币', unit:'单位', consumed:'消耗此物', alternatives:'可选材料', alternativeItems:'可选材料', acceptedItems:'可接受材料', items:'所需道具',
  condition:'取得条件', conditional:'有条件限制', recipient:'获得者', holder:'持有者', scope:'适用范围', partyScope:'队伍范围', partyRequirement:'队伍要求', partyShared:'队伍共享',
  partyRequirement:'队伍要求', recipient:'获得者', eligibleCareers:'适用职业', selection:'选择规则', occurrence:'出现规则', repeatable:'可重复取得', repeatableAfterDiscard:'丢弃后可重新取得',
  scheduleDay:'活动第几天', variantName:'型号名称', variantByChoice:'按选择取得', variantByInput:'按材料取得', variantByCharacterGender:'按角色性别取得', variantSelection:'型号选择规则', variant:'型号', variants:'型号',
  unavailableOn:'不可用服务器', version:'服务器或版本范围', versionScope:'版本范围', servers:'服务器范围', quantityByInput:'按材料决定数量', quantityBySkillLevel:'按技能等级决定数量', quantityByTime:'按时间决定数量', amountByCondition:'按条件决定金额', versionAmounts:'分版本费用',
  ageMinutes:'制作后经过时间（分钟）', minimumAgeDays:'制作后至少经过天数', durabilityCost:'耐久消耗', allowsReplacement:'可使用替代品', level:'等级', requiredLevel:'所需等级', minimumLevel:'最低等级',
  distinctColors:'要求颜色各不相同', colors:'颜色', alternativesByRole:'按角色选择材料', acceptedByMachine:'装置可接受', excluded:'排除材料', constraints:'材料限制', requiredOppositeGenderVariant:'需要异性角色版本',
  minimumLevel:'最低等级', minimumAgeDays:'制作后至少经过天数', requiredTitle:'所需称号', npc:'NPC', sourceQuest:'来源任务', from:'原状态', to:'变化后状态', state:'状态',
  probability:'取得概率', certainty:'确定性', appraisal:'鉴定规则', appraisalRank:'鉴定等级', appraisalResult:'鉴定结果', identifiedAs:'鉴定后名称', unidentifiedName:'未鉴定名称',
  destinationFloor:'目的楼层', transportTo:'传送目的地', location:'取得地点', place:'地点', destinationVariants:'目的地型号',
  repeatableForEachHeldInput:'每份持有材料均可重复', reacquireAfterLoss:'丢失后可重新取得', claimOnce:'只可领取一次', perTicket:'每张票所需', maxUses:'最多使用次数', canPrepareInAdvance:'可提前准备',
  conditionalOnInput:'根据输入材料取得', quantityRequired:'所需数量', cost:'费用', costUnspecified:'原攻略未说明费用', quantities:'数量规则', quantityByInput:'按输入材料决定数量',
  requiresHeldItem:'需要持有道具', sourceEnemy:'来源敌人', sourceBosses:'来源首领', alternateSource:'其他取得来源', source:'取得来源', sourceName:'来源名称', sourceNameUncertain:'来源名称不确定',
  sourceNamesUnspecified:'原攻略未列具体名称', sourceUnspecifiedType:'原攻略未说明类型', sourceConflict:'来源冲突', sourceConflictWith:'来源冲突', sourceQuantityAmbiguous:'原攻略数量存在歧义', sourceWording:'原攻略表述',
  allowsSameNameExchange:'可用同名物品兑换', distribution:'分配方式', allocation:'分配方式', mapping:'对应关系', conversionRatio:'兑换比例', byproducts:'同时产物',
  durability:'耐久', droppable:'可丢弃', tradeable:'可交易', stackLimit:'叠加上限', skill:'技能', stage:'阶段', sequence:'顺序',
  exchangeCooldown:'兑换冷却', randomFromMostMonsters:'多数怪物随机掉落', guaranteedFromSomeBosses:'部分首领确定掉落', excludedAreas:'不适用地区', knownDropLocations:'已知掉落地点', knownNoDropLocations:'已知不掉落地点',
  exclusiveChoice:'只能选择其一', listedMaterials:'原攻略列出的材料', variantEffects:'型号对应效果', exceptions:'例外职业', requiredLevel:'所需等级',
  route:'路线', branch:'分支', optional:'可选', oneOf:'材料取其一', heldRequirement:'对话时需携带数量', bugNote:'异常说明', perBoss:'每名首领取得', sourceAliases:'原攻略别名', aliases:'其他名称',
  sourceIncomplete:'原攻略未完整记录', minimumSkillLevel:'最低技能等级', sourceConsumptionAmbiguous:'原攻略消耗规则存在歧义', durabilityMinimum:'最低耐久', alternateSourceWarning:'其他来源限制',
  captureLocation:'捕捉地点', dropAllowed:'可丢弃', sourceCost:'原攻略费用', identificationRequired:'需要鉴定', materialForm:'材料形态', pool:'所属奖池', availability:'开放状态', versionAlternatives:'分版本材料',
  eligibleSpecies:'适用宠物', belongsToQuest:'所属任务', characterRole:'角色条件',
};
const interactionIgnored = new Set(['item','name','action','acquisition','entityType','sourceLines','verification','sourceAlias','sourceNameInStep','sourceSpellingVariant','sourceVariant','sourceName','sourceText','normalizationNote','normalizedFromContext','alternativeGroup','event','role','lifecycle','properties','allowsIntermediateOutputThenInput']);
const actionLabels = {'hand-over':'交出','consume':'消耗','hold':'持有','carry':'携带','require':'需要','possess':'持有','use':'使用','equip':'装备','equip-one-of':'装备其一','open':'打开','appraise':'鉴定','inspect':'检查','hatch':'孵化','double-click-use':'双击使用','identify-and-use':'鉴定后使用','hold-title':'持有称号','proof-of-progress':'进度证明','wait-completion':'等待完成'};
Object.assign(actionLabels, {'hold-one-of':'持有其一','drop-before-dialogue':'对话前丢弃','hand-over-after-wait':'等待后交出','reduce-durability':'减少耐久','consumed-on-entry':'进入时消耗','remove-title':'移除称号','use-and-consume':'使用并消耗','exchange-if-held':'持有时兑换','discard':'丢弃','present':'出示','party-transfer-then-npc-exchange':'队伍转交后兑换','party-transfer':'队伍转交','double-click-submit':'双击提交','discard-if-held':'持有时丢弃','system-remove':'系统收走','removed-on-entry':'进入时收走','optional-hand-over':'可选交出','replace':'替换','remove':'移除'});
const acquisitionLabels = {};
for (const [label, keys] of [
  ['确定取得','guaranteed'], ['制作取得','craft player-crafting'], ['采集取得','gathering gathering-result logging mining profession-gathering'],
  ['随机获得其中一项','random-one random-one-of random-one-of-pool random-pool-member'], ['随机奖池','random-pool reward-pool source-listed-reward-pool weighted-random-pool'],
  ['按档位的随机奖池','tiered-random-pool threshold-random-pool floor-specific-random-pool'], ['按版本的随机奖池','versioned-random-pool historical-random-pool'],
  ['随机遭遇取得','random-encounter'], ['捕捉或向玩家购买','capture-or-player-purchase'], ['概率掉落','chance-drop random-drop random-battle-drop random-monster-drop'],
  ['队伍概率随机取得','chance-random-team'], ['选择取得','choice choice-result choice-one'], ['采集或恢复取得','gather-or-recover'],
  ['随机获得两者之一','random-one-of-two'], ['获得两者之一，来源未说明选择规则','source-unspecified-one-of-two'], ['获得两者之一','one-of-two'],
  ['根据耳环取得','conditional-on-earring'], ['根据腕轮取得','conditional-on-bracelet'], ['八种兑换之一','one-of-eight-exchanges'],
  ['地面交互取得','ground-interaction'], ['随机队员取得','random-party-member random-one-party-member random-team-award battle-random-recipient random-party-loot'],
  ['按重复战斗路线规则取得','repeat-battle-route-source-rule'], ['指定魔物随机掉落','random-specific-monster-drop'], ['随机取得该类别道具','random-category-item'],
  ['随机战斗奖励','random-battle-reward random-consecutive-battle-drop'], ['魔物掉落','monster-drop'], ['兑换取得','exchange-recipe variant-exchange'], ['战斗随机掉落给队员','battle-drop-random-party-recipient random-drop-random-recipient'],
  ['首领掉落','boss-drop'], ['随机取得四者之一','random-one-of-four'], ['收集取得，来源未说明方式','collect-source-unspecified'],
  ['原攻略未区分随机或自选','random-or-choice-unspecified choice-or-random-source-unspecified'], ['配方决定战斗后结果','recipe-determined-battle'], ['配方决定结果','recipe-determined'],
  ['指定NPC给予随机队员','random-party-member-from-specific-npc'], ['随机存活队员取得','random-surviving-member'], ['存活队员有低概率随机取得','rare-random-surviving-member'],
  ['使用容器取得','use-container'], ['战斗胜利取得','battle-victory'], ['随机取得，来源只列部分结果','random-source-partial'], ['采集时随机真假','gather-random-authenticity'],
  ['鉴定后兑换','appraisal-exchange'], ['随机采集取得','random-gather random-gathering gathering-random'], ['窃盗技能取得','skill-steal'], ['战斗掉落','battle-drop'],
  ['战斗后与NPC领取','post-battle-npc'], ['随机结果','random-outcome random'], ['随机字母，受空位限制','random-letters-limited-by-space'], ['随机型号','random-variant'],
  ['奖励替换','reward-replacement'], ['按档位采摘树木','tree-harvest-tiered'], ['结果取决于成功情况','success-dependent'], ['仅成功时取得','success-only'],
  ['原攻略未说明型号规则','source-unspecified-variant'], ['轮换购买','rotation-purchase'], ['五项随机取得两项','random-two-of-five'], ['三项随机取得两项','random-two-of-three'],
  ['队员随机取得随机数量','random-quantity-party-members'], ['原攻略未说明取得方式','source-unspecified'], ['原攻略未说明选择规则','source-unspecified-selection'],
  ['购买取得，原攻略未列价格','purchase-price-unspecified'], ['按经过时间分档','elapsed-time-tier'], ['区域掉落','area-drop'], ['按NPC选择取得','choice-by-npc'],
  ['随机数量','random-quantity'], ['随机取得一组','random-one-stack'], ['概率取得','chance chance-random'], ['原攻略未说明掉落规则','source-unspecified-drop'],
  ['确定掉落给随机队员','guaranteed-drop-random-recipient'], ['按选择购买型号','purchase-selected-variant'], ['随机取得八者之一','random-one-of-eight'], ['自选兑换','exchange-choice'],
  ['自选购买','purchase-choice'], ['其中一项','one-of'], ['仅未进入战斗时取得','only-if-no-battle'], ['按时间取得优秀档结果','time-tier-excellent'], ['按时间取得合格档结果','time-tier-qualified'],
  ['按时间区间随机决定结果','time-banded-random-outcome'], ['按档位随机或固定取得','random-or-fixed-by-tier'], ['封印并练级','seal-and-level'], ['随机有效期','random-validity'],
  ['随机掉落或窃盗取得','random-drop-or-skill-steal'], ['正确NPC有概率给予','chance-from-one-correct-npc'], ['击杀掉落或窃盗取得','kill-drop-or-pilfer'],
  ['随机取得三者之一','random-one-of-three'], ['制作时选择','craft-choice'], ['GM发放','gm-distribution'], ['随机颜色与等级','random-color-and-level'], ['错误传送门分支取得','wrong-portal-branch'],
]) for (const key of keys.split(' ')) acquisitionLabels[key] = label;
const interactionNestedLabels = {
  ...nestedLabels, ...interactionLabels, initialCrystalAllowed:'可使用初始水晶', durabilityRequirement:'耐久要求', equippedMayBeTaken:'已装备物品也可能被收走', fullDurabilityRequired:'必须满耐久',
  characterGender:'角色性别', min:'最低', max:'最高', consumed:'消耗', amount:'金额', hours:'小时', minutes:'分钟', days:'天', label:'说明',
  choice:'选择', fee:'费用（G）', tier:'档位', price:'价格', unitPrice:'单价', quantity:'数量', common:'通用', nostalgia:'怀旧服', time:'时长服', careers:'职业', entityType:'资料类型', randomOneOf:'随机取得其一',
};
export function stepInteractionFacts(step) {
  const rows = [];
  for (const [direction, records] of [['inputs',step.inputs || []],['outputs',step.outputs || []]]) records.forEach((item, index) => {
    const name = item.item || item.name || '';
    const qualifiers = Object.entries(item).filter(([key]) => !interactionIgnored.has(key) && !['quantity','amount','currency','unit'].includes(key));
    const details = qualifiers.map(([key,value]) => {
      if (!interactionLabels[key]) throw new Error(`未定义流程道具字段展示: ${key}`);
      const keyedTableFields = new Set(['quantityBySkillLevel','quantityByInput','quantityByTime','amountByCondition','versionAmounts','versionAlternatives','mapping','allocation','distribution','variantByInput','variantByChoice','variantByCharacterGender','variantEffects']);
      const dictionary = keyedTableFields.has(key) && value && typeof value === 'object' && !Array.isArray(value)
        ? {...interactionNestedLabels,...Object.fromEntries(Object.keys(value).map(entry => [entry,/^\d+(?:\+)?$/.test(entry) ? `技能等级${entry}` : entry === 'common' ? '通用' : entry]))}
        : interactionNestedLabels;
      return {key,label:interactionLabels[key],text:factText(value,dictionary)};
    }).filter(row => row.text);
    if (direction === 'outputs' && item.acquisition !== 'guaranteed') {
      const method = acquisitionLabels[item.acquisition] || (/[^\x00-\x7F]/.test(item.acquisition || '') ? item.acquisition : null);
      if (!method) throw new Error(`未定义取得规则展示: ${item.acquisition}`);
      details.unshift({key:'acquisition',label:'取得规则',text:method});
    }
    // Basic names/actions are already in the executable prose. Show a separate line only
    // when there is structured context, or when a declared result is absent from prose.
    const prose = JSON.stringify([step.text,step.operations,step.afterOperations,step.branchGroups,step.notes,step.choices,step.quiz]);
    if (!details.length && (!name || prose.includes(name))) return;
    const quantity = item.amount ?? item.quantity;
    const currency = item.currency === true ? 'G' : typeof item.currency === 'string' ? item.currency : '';
    if (quantity != null) details.unshift({key:'quantity',label:item.amount != null ? '金额' : '数量',text:`${factText(quantity,interactionNestedLabels)}${item.amount != null ? currency : item.unit || ''}`});
    rows.push({key:`${direction}-${index}`,label:`${direction === 'inputs' ? actionLabels[item.action] || '所需' : item.entityType === 'skill' ? '学习技能' : item.entityType === 'career' ? '就职' : '取得'}${name ? `【${name}】` : ''}`,text:details.map(row => `${row.label}：${row.text}`).join('；')});
  });
  const grouped = new Map();
  for (const row of rows) {
    const direction = row.key.split('-')[0];
    const signature = `${direction}\u0000${row.text}`;
    if (!grouped.has(signature)) grouped.set(signature, {...row});
    else grouped.get(signature).label += `、${row.label}`;
  }
  return [...grouped.values()];
}

const itemFactLabels = {
  ...labels,...baseLabels,...interactionLabels,
  futureUse:'后续用途', futureUses:'后续用途', useQuest:'用于任务', useInQuest:'用于任务', futureUseQuest:'用于后续任务',
  sourceItem:'原物品', levelCaveat:'等级说明', resultPet:'结果宠物', acquisition:'取得规则', acquisitionMethod:'取得方式', decompositionStatus:'资料整理状态', packaging:'包装规格', unit:'数量单位',
  randomOneOf:'随机结果（其中一项）', randomResults:'随机结果', randomContents:'随机内容', randomPet:'随机宠物', variantPoolRaw:'原攻略型号范围',
  notAwardedWhen:'无法获得的情况', consumed:'消耗', collection:'收集组', equippedTitles:'分职业称号', aliases:'其他名称', versionEffects:'版本效果', active:'当前有效', listedItems:'原攻略列出的道具',
  effectsByUse:'按用途分效果', sameElementRequired:'要求同属性', sameElementDuplicateAllowed:'允许重复同属性', inventoryEmptySlotsRequired:'所需空闲物品栏数', partialTitles:'部分收集时称号',
  pre2023IncrementTable:'2023年前的增量表', propertiesUnspecified:'原攻略未提供属性', edition:'版本年份', common:'共同属性', serverVariants:'分服务器属性',
  identification:'鉴定要求', categoryPool:'按类别随机', container:'来源容器', serverAvailability:'服务器开放情况', dailyLimit:'每日上限', recipe:'配方', effectPool:'随机效果池',
  quantityPerGroup:'每组数量', guaranteed:'确定取得', possiblePets:'可能取得的宠物', career:'职业', npc:'NPC', boxLevels:'宝箱等级范围', boxLevel:'宝箱等级', gender:'角色性别',
  perCharacterLimit:'每角色上限', appliesTo:'适用装备', inventorySpaceRequired:'需要物品栏空位', choiceSequence:'对话选择顺序', acquisitionRoutes:'取得路线', combine:'合成规则',
  nameWarning:'名称差异', replacementFor:'替换对象', correctionReason:'修正原因', prizeTier:'奖项档位', bundle:'奖励组', tierAssignment:'来源档位不确定项', sourceAccuracy:'来源准确性说明', requiredThere:'该用途必须持有',
  additionalRequirement:'额外要求', claimLimit:'领取上限', durationDays:'持续天数', usage:'用途', discardable:'可丢弃', sourceAmbiguity:'来源歧义', probabilityPercent:'概率（%）',
  stackMax:'叠加上限', skills:'技能', sourceName:'原攻略名称', hotfix:'后续修正', perPartProbability:'各部件概率', randomPrizeTiers:'随机奖项档位', probabilityScope:'概率适用范围',
  probabilityTotalNotDerivable:'无法据来源计算总概率', perItemProbability:'各道具概率', unidentifiedNames:'未鉴定名称', appearanceCondition:'出现条件',
  travelUse:'路线用途', discardResult:'丢弃结果', serverEffects:'分服务器效果', petDetails:'宠物资料', listedCards:'原攻略列出的卡片', randomEncounter:'随机遭遇',
  contains:'容器内容', containsPet:'容器内宠物', firstClearOnly:'仅首次通关取得', inventoryFallback:'空位不足时的处理', hatchVariants:'孵化型号', exchange:'兑换规则',
  sourceDescription:'原攻略说明', tier:'档位', items:'同组物品', history:'历史变化', effectiveFrom:'生效日期', petSlotWarning:'宠物栏注意事项', unlocks:'解锁内容', alternateSource:'其他来源',
  variantCount:'型号数量', password:'口令', pet2019:'2019版宠物', resultEffect:'结果效果', extraMaterials:'额外材料', timing:'使用时机', specialUse:'特殊用途', requirements:'所需条件',
  petSource:'宠物来源', quantityRandomOneOf:'随机数量候选', usesPerBag:'每个包袱使用次数', shop:'商店', resultPetReference:'结果宠物参考资料', relatedQuest:'关联任务', shopPrice:'商店价格', status:'状态',
  prerequisite:'前置要求', sourceEffectText:'原攻略效果表述', exchangeCost:'兑换成本', serverNotes:'分服务器说明', pool:'奖池', costOrbs:'所需宝珠数量', titleEffects:'称号效果', rank:'等阶',
  access:'可前往地区', requiredEquipped:'需要装备', consumedAfterFiveBattles:'五次战斗后消耗', quantitySources:'各来源数量', npcSchedule:'NPC出现时间与位置', serverRules:'分服务器取得规则',
  collectionRole:'收集组用途', probabilityApprox:'约概率', sourceNote:'来源说明', subRecipe:'附加配方', exchangeClosedAt:'兑换关闭时间', process:'使用流程', useRoute:'使用路线',
  costFragments:'所需碎片数量', note:'注意事项', additionalSource:'其他来源', disposable:'一次性使用', sourceWarning:'来源警告', completionNumber:'任务完成次数', abilityVariants:'能力型号',
  combinationRule:'型号组合规则', addedYear:'新增年份', inputSpecies:'输入宠物种类', editionNote:'版本说明', featuredByVersion:'分版本重点物品', specialChance:'其他概率结果',
  exchangeInputs:'兑换材料', variantsCount:'型号数量', listedVariants:'原攻略列出的型号', repeatLock:'限制重复', results:'获得结果', addedYearConflict:'新增年份来源冲突', removedAt:'取消日期',
  versions:'版本范围', unavailableVersion:'不可用版本', identifiedLevel:'鉴定等级', exchangeResults:'兑换结果', cardLevel:'图鉴等级', cardRarity:'图鉴稀有度', versionNote:'版本说明', partySharing:'队伍共享规则', additionalCost:'额外成本',
};
Object.assign(itemFactLabels, {reacquireAfterDiscard:'丢弃后可重新取得', branches:'分支'});
const itemHandledKeys = new Set('id name role entityType properties commonProperties appraisedProperties sourceLines verification references quantity equipmentArchive variants use unidentifiedName result contents identifiedName appraisalResult pet tradeable useEffect date purchase additionalFacts basePetRestriction addedAt valuesStatus displayName identifiedAs cost presentationFacts allPropertyFacts presentationItemFacts sources lifecycle tierCheckmarkCount sourceNamePreserved sourceAlias'.split(' '));
const itemNestedLabels = {
  ...nestedLabels,...baseLabels,...interactionLabels,...itemFactLabels, ...interactionNestedLabels,
  normalArea:'普通地区', wildCave:'野外洞窟', materials:'材料', ingredients:'材料', first:'第一种材料', second:'第二种材料', consume:'消耗数量',
  notFor:'不能用于', canFor:'可用于', routeQuest:'来源任务', minPercent:'最低概率（%）', maxPercent:'最高概率（%）', chancePercent:'概率（%）',
  crystalCount:'水晶数量', earthDefense:'地属性防御增量', waterMagicResistance:'水属性魔抗增量', waterSpirit:'水属性精神增量', fireAttack:'火属性攻击增量', windAgility:'风属性敏捷增量',
};
Object.assign(itemNestedLabels, {
  hatchAtHoursApprox:'约孵化时间（小时）', hatchAtHours:'孵化时间（小时）', count:'数量', total:'合计', group:'组别', each:'每项',
  commanderRoom:'司令室费用', crystals:'水晶', wildMaze:'野外迷宫使用结果', signal:'孵化信号', totalMinutes:'总时间（分钟）', currencyG:'金币费用（G）',
  points:'点数', lobby:'大厅费用', baseItem:'基础道具', titles:'所需称号', provenance:'取得渠道要求', petLoyalty:'宠物忠诚变化', characterCharm:'角色魅力变化',
  normalUse:'普通用法', enemies:'敌人', earlySignalAtHours:'出现早期信号时间（小时）', perItem:'每件费用', coordinate:'坐标', modified:'改造宠物', ordinal:'组内编号',
  durabilityRestriction:'有耐久限制', enemy:'敌人', firstMinutes:'第一阶段时间（分钟）', petLevel:'宠物等级', randomItem:'随机获得道具', resultProperties:'结果属性',
});
export function rewardItemFacts(item, quest) {
  const rows = [];
  for (const [key,value] of Object.entries(item)) {
    if (itemHandledKeys.has(key)) continue;
    if (item.purchase && key === 'resultPet') continue;
    if (!itemFactLabels[key]) throw new Error(`未定义奖励物品字段展示: ${key}`);
    const keyedFields = new Set(['versionEffects','effectsByUse','pre2023IncrementTable','serverVariants','serverAvailability','serverEffects','serverNotes','serverRules','titleEffects','featuredByVersion','equippedTitles','perPartProbability','perItemProbability']);
    const dictionary = keyedFields.has(key) && value && typeof value === 'object' && !Array.isArray(value)
      ? {...itemNestedLabels,...Object.fromEntries(Object.keys(value).map(entry => [entry,itemNestedLabels[entry] || entry]))} : itemNestedLabels;
    let text = factText(value,dictionary);
    if (key === 'acquisition') text = acquisitionLabels[value] || text;
    if (text) rows.push({key,label:itemFactLabels[key],text});
  }
  if (item.cost && !item.cost.item) rows.push({key:'cost',label:'兑换成本',text:factText(item.cost,itemNestedLabels)});
  if (item.sources?.length) {
    const text = item.sources.map(source => {
      const step = quest.flow.steps.find(step => step.id === source.step);
      return step ? `流程第${step.order}步` : '';
    }).filter(Boolean).join('；');
    if (text) rows.push({key:'sources',label:'其他取得步骤',text});
  }
  return rows;
}

const eventLabels = {
  ...itemFactLabels,...interactionLabels, containerTradeable:'容器可交易', selectionMethod:'选择规则', notes:'注意事项', repeatTool:'可重复使用的工具',
  costItem:'所需道具', costs:'所需成本', selectionRules:'选择规则', exchangeCurrency:'兑换货币', conditions:'领取条件', frequency:'领取频率', reset:'重置时间',
  versionBoundaryNote:'版本分组说明', versionActivation:'版本生效规则', inputs:'兑换材料', resultQuantity:'结果数量', noDropCondition:'不掉落条件',
  versionLabel:'版本', acquisitionMethodUnspecified:'原攻略未说明取得方式', milestones:'领取阶段', warningSourceText:'来源警告', completeness:'来源完整程度',
  unlistedRewards:'未列明奖励', choice:'对话选择', method:'取得方式', otherOutcomes:'其他结果', appliesToVersions:'适用版本', prizeTiers:'奖项档数',
  tierMappingCompleteness:'档位对应完整程度', source:'来源', closedDate:'关闭日期', routes:'路线范围', probabilityTotal:'概率合计（%）', officialProbability:'官方公布概率',
  certainty:'确定性', versionPeriod:'版本时期', oddsPercent:'概率表（%）', openedFrom:'开启容器', mutuallyExclusiveWith:'互斥结果', elapsedHoursGreaterThan:'经过时间大于（小时）',
  additionalTitle:'额外称号', additionalGuaranteedItem:'同时确定取得的道具', thresholdHours:'时间分界（小时）', containerDurability:'容器耐久',
  postCompletion:'任务完成后', removedReward:'已取消奖励', historicalItemsExcludedFromCurrentExchange:'历史物品不在当前兑换范围', battleOutcome:'战斗结果', designIdentification:'设计图鉴定范围',
  distribution:'分配规则', coreMaterialQuantity:'核心材料数量', relationshipBetweenDrops:'掉落之间的关系', waitMinutes:'等待时间（分钟）', groupedAcquisitionAlsoContainsProcessItem:'同次还取得流程道具',
  probabilitiesAreApproximate:'概率为约值', cooldownHours:'冷却时间（小时）', location:'取得地点', viewingRequiresCurrency:'查看时需要货币', globalLimitPerNight:'每晚全服上限',
  costAlternatives:'可选兑换成本', sceneVariation:'场景有变化', fixedItems:'固定获得', randomItems:'随机获得', reliabilityWarning:'来源可靠性说明', additionalCurrency:'额外货币',
  triggerItem:'触发道具', sharedWeaponProperties:'武器共同规则', legacyArenaRestriction:'旧竞技场限制',
};
const eventIgnored = new Set('id version tier kind items step sourceLines verification selection steps repeatableFromStep sourceTableBoundary catalogGranularity sameAcquisitionEvent sameEvent groupedAcquisition processItemExcludedFromRewardCards sameItemDefinitionsForBothRoutes presentationFacts'.split(' '));
export function rewardEventFacts(event,quest) {
  const rows = [];
  for (const [key,value] of Object.entries(event)) {
    if (eventIgnored.has(key)) continue;
    if (!eventLabels[key]) throw new Error(`未定义奖励事件字段展示: ${key}`);
    const dictionary = key === 'oddsPercent' && value && typeof value === 'object'
      ? {...itemNestedLabels,...Object.fromEntries(Object.keys(value).map(entry => [entry,entry]))} : itemNestedLabels;
    let text = factText(value,dictionary);
    if (key === 'acquisition') text = acquisitionLabels[value] || text;
    if (text) rows.push({key,label:eventLabels[key],text});
  }
  const steps = [...(event.steps || []), ...[event.repeatableFromStep].filter(Boolean)];
  if (steps.length) rows.push({key:'steps',label:'可取得步骤',text:steps.map(id => quest.flow.steps.find(step => step.id === id)).filter(Boolean).map(step => `第${step.order}步`).join('、')});
  return rows;
}

const stepCollectionTitles = {
  recipe:'制作配方', recipes:'制作配方', gathering:'材料采集地点', dailySchedule:'每日所需材料', confirmationPoints:'答题确认地点', quizBank:'问答题库',
  teachers:'技能导师', mentors:'职业导师', jobMentors:'就职导师', skillMentors:'技能导师', strongStatusTeachers:'强力状态魔法导师', resistanceBooks:'抗性书籍位置',
  floorRecords:'逐层战斗资料', petRecipes:'宠物取得配方', seedRecipes:'种子配方与效果', versionPools:'分版本钱箱规则', offers:'历次上架记录',
  npcLocations:'NPC分时位置', rounds:'连续战斗', exchangeMap:'贺卡兑换地点', shop:'商店价格', materialSources:'材料来源', challengeOptions:'可选挑战路线',
  sites:'地区路线资料', serviceOptions:'NPC服务', locations:'NPC位置', routePoints:'本步骤操作位置',
};
const collectionLabels = {
  ...itemNestedLabels, skill:'技能', teacher:'导师', subject:'教授内容', mentor:'导师', place:'地点', stage:'阶段', floor:'楼层', order:'场次',
  coordinateRange:'坐标范围', coordinate:'坐标', day:'第几天', book:'书籍', ingredients:'材料', materials:'材料', gathering:'采集', guide:'参考攻略', source:'来源',
  boostItem:'采集所需加成道具', flower:'获得花朵', optimizationItem:'优化道具', mechanic:'战斗规则', reference:'参考任务', line:'证据行',
  effectPool:'随机效果池', acquisition:'取得方式', results:'获得结果', quantity:'数量', skillLevel:'技能等级',
  probabilityTotal:'概率合计（%）', costG:'费用（G）', input:'交出材料', output:'取得结果', quest:'任务', probabilityUnspecified:'原攻略未说明概率', equipped:'需要装备', stack:'每组叠加数量',
};
export function stepSourceSections(step,quest) {
  const result = [];
  const timedInputs = (step.inputs || []).filter(input => input.ageMinutes && input.item);
  if (timedInputs.length) result.push({key:'inputs',title:'制作后经过时间（分钟）',rows:timedInputs.map(input => ({label:input.item,text:`${input.ageMinutes.min}～${input.ageMinutes.max}分钟`}))});
  for (const [key,title] of Object.entries(stepCollectionTitles)) {
    const value = step[key];
    if (value == null) continue;
    if (key === 'offers') {
      result.push({key,title,rows:[{label:'上架资料',text:'各期设计图规格、价格、改造结果与档位见下方道具获取。'}]}); continue;
    }
    if (key === 'rounds') {result.push({key,title,kind:'rounds',rounds:value}); continue;}
    let rows;
    if (key === 'quizBank') rows = value.map(([question,answer]) => ({label:question,text:`答案：${answer}`}));
    else if (key === 'exchangeMap') rows = value.map(([item,place,npc]) => ({label:item,text:`地点：${place}；NPC：${npc}`}));
    else if (key === 'npcLocations') rows = Object.entries(value).map(([time,coordinate]) => ({label:time,text:coordinate}));
    else if (key === 'routePoints') rows = value.map(point => ({label:point.name,text:`坐标：（${point.coordinate}）`}));
    else if (key === 'floorRecords') rows = value.map(floor => ({label:`第${floor.floor}层`,text:floor.summary}));
    else rows = (Array.isArray(value) ? value : [value]).map((entry,index) => {
      const labelKey = ['item','skill','career','book','teacher','mentor','npc','name','location','stage','day'].find(field => typeof entry[field] === 'string' || typeof entry[field] === 'number');
      const label = labelKey ? `${collectionLabels[labelKey]}：${entry[labelKey]}` : `第${index+1}项`;
      const details = Object.fromEntries(Object.entries(entry).filter(([field]) => field !== labelKey && !evidenceKeys.has(field)));
      return {label,text:factText(details,collectionLabels)};
    });
    result.push({key,title,rows});
  }
  if (step.exchangeRecipe != null) result.push({key:'exchangeRecipe',title:'兑换操作',rows:[{label:'操作类型',text:step.exchangeRecipe ? '交出本步骤所需材料，取得对应兑换结果；材料与结果分别列在本步骤。' : '本步骤不是兑换。'}]});
  if (step.interaction) result.push({key:'interaction',title:'交互方式',rows:[{label:'方式',text:step.interaction === 'player-to-player-exchange' ? '玩家之间互换道具' : step.interaction}]});
  if (step.failureBattleRef) {
    const battle = Object.values(quest.versions).flatMap(version => Object.values(version.tiers)).flatMap(tier => Object.entries(tier.battles)).find(([id,battle]) => id === step.failureBattleRef || battle.id === step.failureBattleRef)?.[1];
    if (!battle) throw new Error(`${quest.name} 失败战斗引用不存在：${step.failureBattleRef}`);
    const title = battle.title || battle.name || Object.values(battle.enemies || {}).map(enemy => enemy.name).join('、');
    result.push({key:'failureBattleRef',title:'失败触发战斗',rows:[{label:'战斗',text:title}]});
  }
  return result;
}


