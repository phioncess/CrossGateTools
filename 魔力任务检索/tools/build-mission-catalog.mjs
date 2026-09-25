import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(toolsDir, '..');
const outputPath = path.join(projectDir, 'catalog.js');
const reportPath = path.join(projectDir, 'mission-import-report.json');
const baseUrl = 'https://www.molibaike.com';
const userAgent = 'Mozilla/5.0 MagicQuestMissionImporter/2.0';
const concurrency = 8;

const clean = value => String(value || '')
  .replace(/\u200b/g, '')
  .replace(/\u00a0/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .replace(/\s*\n\s*/g, '\n')
  .trim();

// 来源站混用多套书名号/道具括号。进入数据层时统一为页面既有的
// 《任务》与【道具】文字结构，除此之外不改写原文。
const canonicalText = value => clean(value)
  .replace(/[〖〔﹝]/g, '【')
  .replace(/[〗〕﹞]/g, '】');

async function fetchText(url, attempt = 1) {
  const response = await fetch(url, { headers: { 'user-agent': userAgent } });
  if (response.ok) return response.text();
  if (attempt < 4 && (response.status === 429 || response.status >= 500)) {
    await new Promise(resolve => setTimeout(resolve, 400 * attempt));
    return fetchText(url, attempt + 1);
  }
  throw new Error(`${response.status} ${response.statusText}: ${url}`);
}

function missionIdFromUrl(url) {
  return url.match(/\/Mission\/Detail\/([0-9a-f-]{36})/i)?.[1]?.toLowerCase() || '';
}

function parseListPage(html) {
  const document = new JSDOM(html).window.document;
  return [...document.querySelectorAll('table tbody tr')].map(row => {
    const cells = [...row.querySelectorAll('td')];
    const link = row.querySelector('a[href*="/Mission/Detail/"]');
    if (!link) return null;
    const url = new URL(link.getAttribute('href'), baseUrl).href;
    return {
      sourceId: missionIdFromUrl(url),
      name: clean(link.textContent),
      sourceUrl: url,
      aliasesText: clean(cells[1]?.textContent),
      condition: clean(cells[2]?.textContent),
      levelText: clean(cells[3]?.textContent),
      intro: clean(cells[4]?.textContent),
      repeatable: clean(cells[5]?.textContent)
    };
  }).filter(Boolean);
}

function splitAliases(value) {
  return [...new Set(clean(value).split(/[,，、/]+/).map(clean).filter(Boolean))];
}

function tableInfo(document) {
  const info = {};
  for (const row of document.querySelectorAll('.mission-info table tr')) {
    const cells = [...row.querySelectorAll('td')];
    for (let index = 0; index + 1 < cells.length; index += 2) {
      const key = clean(cells[index].textContent);
      const value = clean(cells[index + 1].textContent);
      if (key) info[key] = value;
    }
  }
  return info;
}

function contentLines(document) {
  const root = document.querySelector('.mission-content');
  if (!root) return [];
  const nodes = [...root.querySelectorAll(':scope > p, :scope > div, :scope > ul > li, :scope > ol > li, :scope > table tr')];
  const raw = nodes.length ? nodes : [...root.children];
  const lines = [];
  for (const node of raw) {
    // textContent 不会为 <br> 自动插入换行；先在克隆节点中恢复原文换行，
    // 否则“战斗信息<br>Lv...”会被错误粘成一整句而无法分区。
    const copy = node.cloneNode(true);
    copy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    const text = canonicalText(copy.textContent);
    if (!text) continue;
    for (const part of text.split('\n').map(clean).filter(Boolean)) {
      if (lines.at(-1) !== part) lines.push(part);
    }
  }
  return lines;
}

function parseConditions(value) {
  const text = clean(value);
  if (!text) return [];
  return text.split(/[；;]\s*/).map(clean).filter(Boolean);
}

function parsePrerequisiteNames(value) {
  return [...new Set([...clean(value).matchAll(/《([^》]+)》/g)].map(match => clean(match[1])).filter(Boolean))];
}

function isStep(line) {
  return /^(?:步骤\s*)?[（(]?\d{1,3}(?:[*＊]{1,2})?[）).、．]\s*/.test(line)
    || /^[一二三四五六七八九十]{1,3}[、.．]\s*/.test(line);
}

function isSectionHeading(line) {
  return /^(?:\d{4}[.年-]\d{0,2}[.月-]?\d{0,2}日?更新|.{0,24}(?:支线|线路|路线|部分|奖品兑换|奖励兑换|奖品列表|奖励列表|物品说明))[：:]?$/.test(line);
}

function isBattleHeading(line) {
  return /^(?:◆|◇|※)?\s*(?:BOSS|Boss|boss)?\s*(?:战斗信息|战斗资料|首领资料|BOSS数据)(?:[：:].*)?$/.test(line)
    || /^(?:◆|◇)\s*(?:BOSS|Boss|boss|首领)\s*[：:]/.test(line);
}

function enemyTitle(line) {
  return canonicalText(line)
    .replace(/^(?:[Ll][Vv]|[Vv])[.．]?\s*\d+(?:\s*[~～-]\s*\d+)?\s*/, '')
    .split(/[，,；;｜（(]/)[0]
    .replace(/[*×]\s*\d+\s*$/, '')
    .trim();
}

// 按来源正文的顺序读取每一行。战斗标题只是分区起点；敌人、技能与打法
// 可能各占一行，因此不能再依赖“BOSS：内容”这种单行格式。
function parseBosses(lines) {
  const bosses = [];
  const consumed = new Set();
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index];
    if (!isBattleHeading(heading)) continue;
    const enemies = [];
    const strategy = [];
    const notes = [];
    const headingNote = heading.match(/(?:战斗信息|战斗资料|首领资料|BOSS数据)\s*[：:]\s*(.+)$/)?.[1];
    if (headingNote) notes.push(canonicalText(headingNote));
    consumed.add(index);
    let cursor = index + 1;
    for (; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      if (isStep(line) || isSectionHeading(line) || isBattleHeading(line)) break;
      if (/^(?:◆|◇)?\s*打法(?:建议)?[：:]?/.test(line)) {
        strategy.push(canonicalText(line.replace(/^(?:◆|◇)?\s*打法(?:建议)?[：:]?\s*/, '')));
        consumed.add(cursor);
        continue;
      }
      if (/^[◆◇※]/.test(line) && enemies.length) break;
      if (/^(?:[Ll][Vv]|[Vv])[.．]?\s*\d+/.test(line)) {
        enemies.push(line);
        consumed.add(cursor);
        continue;
      }
      if (/^技能[：:]/.test(line) && enemies.length) {
        enemies[enemies.length - 1] = `${enemies.at(-1)}；${line}`;
        consumed.add(cursor);
        continue;
      }
      if (enemies.length && line) {
        notes.push(line);
        consumed.add(cursor);
      } else {
        break;
      }
    }
    if (!enemies.length && !notes.length) continue;
    const inline = heading.match(/(?:BOSS|Boss|boss|首领)\s*[：:]\s*(.+)$/)?.[1];
    const title = canonicalText(inline || enemyTitle(enemies[0] || '') || '原攻略战斗记录');
    bosses.push({ title, enemies, skills: '', strategy, notes, sourceLine: index + 1 });
    index = cursor - 1;
  }
  return { bosses, consumed };
}

function parseGuide(lines, battleLineIndexes) {
  const steps = [];
  const notes = [];
  let activeStep = -1;
  let rewardList = false;
  let routeLabel = '';
  lines.forEach((line, index) => {
    if (battleLineIndexes.has(index)) return;
    if (/支线[：:]?$/.test(line) && isSectionHeading(line)) {
      routeLabel = line.replace(/[：:]$/, '').trim();
      activeStep = -1;
      rewardList = false;
      return;
    }
    if (isStep(line)) {
      steps.push(routeLabel ? `【${routeLabel}】路线${line}` : line);
      activeStep = steps.length - 1;
      rewardList = false;
      return;
    }
    const isMarkedNote = /^[◆◇※]/.test(line);
    const isHeading = isSectionHeading(line);
    const isItemFact = /^【[^】]+】\s*[：:]/.test(line);
    const isVersionFact = /^(?:怀旧服|时长服|道具服|时长[／/]道具服|怀旧[／/]时长服)\s*[：:]/.test(line);
    const isAttributeFact = /^(?:[Ll][Vv]|[Vv])[.．]?\s*\d+[^。]{0,40}(?:耐久|攻击|防御|敏捷|回复|生命|魔力|可交易|不可交易)/.test(line);
    if (/^(?:奖品列表|奖励列表)[：:]?$/.test(line)) rewardList = true;
    if (isHeading && !/支线[：:]?$/.test(line)) routeLabel = '';
    const rewardFact = rewardList && !isHeading
      ? line.match(/^([^：:【】]{1,24})[：:]\s*(.+)$/)
      : null;
    if (activeStep >= 0 && !isMarkedNote && !isHeading && !isItemFact && !isVersionFact && !isAttributeFact && !rewardList) {
      steps[activeStep] = `${steps[activeStep]}\n${line}`;
      return;
    }
    notes.push(rewardFact ? `【${rewardFact[1].trim()}】：${rewardFact[2].trim()}` : line);
    // 一旦进入说明/属性/小节，后续无编号文字继续属于该说明区，
    // 不能再回挂到上一条任务步骤。
    activeStep = -1;
  });
  return { steps, notes };
}

function parseRewards(lines) {
  const result = { guaranteed: [], chance: [], related: [] };
  const rewardSignal = /获得|取得|奖励|掉落|奖品|称号|习得|学习|鉴定后|兑换/;
  const chanceSignal = /随机|概率|几率|机率|掉落/;
  const excludeSignal = /无法获得|不能获得|未获得|获得方式参考/;
  let rewardList = false;
  for (const line of lines) {
    if (/^(?:奖品列表|奖励列表)[：:]?$/.test(line)) {
      rewardList = true;
      continue;
    }
    if (rewardList && (isStep(line) || (isSectionHeading(line) && !/^(?:奖品列表|奖励列表)/.test(line)))) rewardList = false;
    if (rewardList) {
      const fact = line.match(/^([^：:【】]{1,24})[：:]\s*(.+)$/);
      if (fact) {
        const entry = `【${fact[1].trim()}】：${fact[2].trim()}`;
        const bucket = /随机|概率|几率|机率/.test(line) ? result.chance : result.guaranteed;
        if (!bucket.includes(entry)) bucket.push(entry);
      }
      continue;
    }
    if (!rewardSignal.test(line) || excludeSignal.test(line)) continue;
    if (/(?:领取|获得|得到)奖励/.test(line) && !/(?:领取|获得|得到|掉落)[^。；]{0,80}【[^】]+】/.test(line)) {
      if (!result.related.includes('【奖励】：原攻略未列明具体内容')) result.related.push('【奖励】：原攻略未列明具体内容');
      continue;
    }
    const bucket = chanceSignal.test(line) ? result.chance : /任务完结|奖励|称号|习得|学习/.test(line) ? result.guaranteed : result.related;
    if (!bucket.includes(line)) bucket.push(line);
  }
  for (const key of Object.keys(result)) result[key] = result[key].slice(0, 24);
  return result;
}

function scopeFor(record, info, lines) {
  const summary = clean([record.condition, record.intro, info['任务类型'], ...lines.slice(0, 12)].join('；'));
  if (/怀旧(?:服)?(?:不能|不可)(?:定居|用|完成|进入|进行)|怀旧服不可用/.test(summary)) return { scope: '怀旧服不可用', reason: '页面明确标注怀旧服不可用' };
  const mentionsClassic = /怀旧/.test(summary);
  const mentionsOther = /时长|道具服/.test(summary);
  if (mentionsOther && !mentionsClassic) return { scope: '其他服务器', reason: '页面仅标注时长服或道具服' };
  return { scope: mentionsClassic ? '怀旧服' : '通用任务', reason: '' };
}

function levelLabel(value) {
  const text = clean(value).replace(/\s*级$/, '');
  if (!text || text === '0') return '资料页未标明';
  return /^Lv\.?/i.test(text) ? `${text} 建议` : `Lv.${text} 建议`;
}

function seriesName(info) {
  return clean(info['任务类型']) || '未分类任务';
}

function detailRecord(record, html) {
  const document = new JSDOM(html, { url: record.sourceUrl }).window.document;
  const info = tableInfo(document);
  const lines = contentLines(document);
  const scope = scopeFor(record, info, lines);
  const linkedPrerequisites = [...new Set([...document.querySelectorAll('.mission-content a[href*="/Mission/Detail/"]')]
    .map(link => missionIdFromUrl(new URL(link.getAttribute('href'), baseUrl).href))
    .filter(id => id && id !== record.sourceId)
    .map(id => `catalog-${id}`))];
  const parsedBattles = parseBosses(lines);
  const parsedGuide = parseGuide(lines, parsedBattles.consumed);
  const fallbackSteps = lines.filter((line, index) => !parsedBattles.consumed.has(index) && !/^[◆◇※*]/.test(line) && /前往|来到|寻找|对话|战斗|提交|交给|拿到|返回|击倒|收集|兑换|双击|种植|进入|传送/.test(line));
  const steps = parsedGuide.steps.length ? parsedGuide.steps : fallbackSteps.length ? fallbackSteps : lines.slice(0, 1);
  const notes = parsedGuide.notes;
  const aliases = splitAliases(record.aliasesText || info['昵称']);
  const condition = record.condition || clean(info['必要条件']) || '资料页未标明任务型前置';
  return {
    record: {
      id: `catalog-${record.sourceId}`,
      name: record.name,
      aliases,
      series: seriesName(info),
      order: 0,
      level: levelLabel(record.levelText || info['建议等级']),
      condition,
      intro: record.intro,
      sourceUrl: record.sourceUrl,
      prereqNames: parsePrerequisiteNames(condition),
      scope: scope.scope,
      repeatable: record.repeatable || clean(info['可否重做'])
    },
    detail: {
      info,
      guide: {
        start: steps[0] || lines[0] || '原攻略未提供可解析的起始步骤',
        conditions: parseConditions(condition),
        steps,
        notes
      },
      bosses: parsedBattles.bosses,
      rewards: parseRewards(lines),
      linkedPrerequisites,
      lineCount: lines.length,
      // 保留逐行来源与分区结果，生成后的任何字段都能回到原文行。
      sourceLines: lines,
      sourceRegions: lines.map((text, index) => ({
        line: index + 1,
        text,
        region: parsedBattles.consumed.has(index) ? 'battle' : isStep(text) ? 'step' : 'note'
      }))
    },
    excludedReason: scope.reason
  };
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
      if ((index + 1) % 25 === 0 || index + 1 === items.length) process.stdout.write(`\r读取任务详情 ${index + 1}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  process.stdout.write('\n');
  return results;
}

function mergerSource() {
  return `
(function mergeCatalog() {
  const EXCLUDED_SCOPES = new Set(['怀旧服不可用', '其他服务器']);
  // 来源页的“任务类型”只是分类，不等于有前后关系的任务系列。
  // 这些分类仍保留在 CATALOG_RECORDS 中用于检索，但不得写入 QUESTS.series。
  const CATEGORY_ONLY_SERIES = new Set(['临时活动/任务', '怀旧服其他自制任务', '经典任务', '职业就职任务', '职业晋阶任务', '未分类任务']);
  const existingNames = new Set(QUESTS.map(quest => quest.name));
  const idByName = new Map(QUESTS.map(quest => [quest.name, quest.id]));
  CATALOG_RECORDS.forEach(record => { if (!EXCLUDED_SCOPES.has(record.scope) && !existingNames.has(record.name)) idByName.set(record.name, record.id); });

  CATALOG_RECORDS.forEach(record => {
    if (EXCLUDED_SCOPES.has(record.scope)) return;
    const parsed = CATALOG_DETAILS[record.id];
    const sourceKey = \`catalog_\${record.id.slice(8)}\`;
    SOURCES[sourceKey] = {name:\`魔力百科｜\${record.name}\`,url:record.sourceUrl};
    const prerequisites = [...new Set(record.prereqNames.map(name => idByName.get(name)).filter(Boolean))].filter(id => id !== record.id);
    const rewardSummary = [...parsed.rewards.guaranteed, ...parsed.rewards.chance, ...parsed.rewards.related].slice(0, 2).join('；') || '原攻略未单列任务奖励';
    const existing = QUESTS.find(quest => quest.name === record.name);
    if (existing) {
      // 同名任务也使用本次全量抓取结果，不能因为已有索引记录而跳过正文。
      existing.source = sourceKey;
      existing.sourceId = record.id.slice(8);
      existing.sourceUrl = record.sourceUrl;
      existing.detailStatus = 'parsed';
      existing.bossStatus = parsed.bosses.length ? 'documented' : 'not-documented';
      QUEST_GUIDES[existing.id] = parsed.guide;
      BOSS_GUIDES[existing.id] = parsed.bosses;
      REWARD_GUIDES[existing.id] = parsed.rewards;
      return;
    }
    QUESTS.push({
      id:record.id,name:record.name,aliases:record.aliases,initials:'',series:CATEGORY_ONLY_SERIES.has(record.series) ? '' : record.series,sourceCategory:record.series,
      order:record.order,level:parsed.info['建议等级'] || record.level,
      type:record.scope === '通用任务' ? '通用任务' : '怀旧服任务',
      prerequisites,
      summary:[parsed.info['必要条件'] && \`必要条件：\${parsed.info['必要条件']}\`, record.intro, record.scope !== '通用任务' && '以下仅展示怀旧服路线与参数'].filter(Boolean).join('；'),
      reward:rewardSummary,source:sourceKey,sourceId:record.id.slice(8),sourceUrl:record.sourceUrl,reliability:'high',detailStatus:'parsed',
      bossStatus:parsed.bosses.length ? 'documented' : 'not-documented',
      availability:/关闭|未开放/.test(record.intro + record.condition) ? 'closed' : 'available'
    });
    QUEST_GUIDES[record.id] = parsed.guide;
    BOSS_GUIDES[record.id] = parsed.bosses;
    REWARD_GUIDES[record.id] = parsed.rewards;
    existingNames.add(record.name);
  });
})();
`;
}

const firstHtml = await fetchText(`${baseUrl}/Mission`);
const firstDocument = new JSDOM(firstHtml).window.document;
const pageNumbers = [...firstDocument.querySelectorAll('.pagination button[name="page"]')]
  .map(button => Number(button.value))
  .filter(Number.isFinite);
const pageCount = Math.max(1, ...pageNumbers);
const listPages = [firstHtml];
for (let page = 2; page <= pageCount; page++) listPages.push(await fetchText(`${baseUrl}/Mission?page=${page}`));
const listed = listPages.flatMap(parseListPage);
const uniqueRecords = [...new Map(listed.map(record => [record.sourceId, record])).values()].filter(record => record.sourceId);

const parsed = await mapLimit(uniqueRecords, concurrency, async record => detailRecord(record, await fetchText(record.sourceUrl)));
const seriesCounts = new Map();
for (const entry of parsed) {
  const series = entry.record.series;
  const next = (seriesCounts.get(series) || 0) + 1;
  seriesCounts.set(series, next);
  entry.record.order = next;
}

const catalogRecords = parsed.map(entry => entry.record);
const catalogDetails = Object.fromEntries(parsed.map(entry => [entry.record.id, entry.detail]));
const source = [
  '// 自动生成：来源为魔力百科 /Mission 全部分页及各任务详情页。',
  `// 网站总表 ${uniqueRecords.length} 条；生成结果 ${catalogRecords.length} 条。`,
  '',
  `const CATALOG_RECORDS = ${JSON.stringify(catalogRecords)};`,
  '',
  `const CATALOG_DETAILS = ${JSON.stringify(catalogDetails)};`,
  mergerSource()
].join('\n');
fs.writeFileSync(outputPath, source, 'utf8');

const included = parsed.filter(entry => !['怀旧服不可用', '其他服务器'].includes(entry.record.scope));
const excluded = parsed.filter(entry => ['怀旧服不可用', '其他服务器'].includes(entry.record.scope));
const report = {
  source: `${baseUrl}/Mission`,
  pageCount,
  listedCount: uniqueRecords.length,
  includedCount: included.length,
  excludedCount: excluded.length,
  scopeCounts: Object.fromEntries([...new Set(parsed.map(entry => entry.record.scope))].map(scope => [scope, parsed.filter(entry => entry.record.scope === scope).length])),
  excluded: excluded.map(entry => ({ name: entry.record.name, url: entry.record.sourceUrl, scope: entry.record.scope, reason: entry.excludedReason })),
  duplicateIds: listed.length - uniqueRecords.length,
  recordsWithoutSteps: included.filter(entry => !entry.detail.guide.steps.length).map(entry => ({ name: entry.record.name, url: entry.record.sourceUrl, lineCount: entry.detail.lineCount }))
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, reportPath, ...report, excluded: undefined, recordsWithoutSteps: report.recordsWithoutSteps.length }, null, 2));
