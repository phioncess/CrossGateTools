import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const careerFile = path.resolve(root, '..', '魔力职业', 'data.js');
const outputFile = path.join(root, 'career-quests.js');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function clean(value = '') {
  return String(value).replace(/\u00a0/g, ' ').replace(/[\t\r ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function decode(value = '') {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (all, name) => named[name.toLowerCase()] ?? all);
}

function text(html = '') {
  return clean(decode(html)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ''));
}

function tableRows(html = '') {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row =>
    [...row[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(cell => text(cell[1]))
  );
}

function sourceId(url = '') {
  return url.match(/\/Mission\/Detail\/([^?/#]+)/i)?.[1] || '';
}

async function loadCareers() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(await fs.readFile(careerFile, 'utf8'), context, { filename: careerFile });
  return context.window.CAREER_DATA.professions;
}

async function get(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 MagicQuestCareerImporter/1.0' } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(700 * attempt);
    }
  }
}

function splitAliases(value) {
  return clean(value).split(/\s*[,，/／]\s*/).map(clean).filter(Boolean);
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function parsePage(html, entry) {
  const info = html.match(/<div class="mission-info section">([\s\S]*?)<\/table>\s*<\/div>/i)?.[1] || '';
  const titleHtml = info.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1] || '';
  const name = text(titleHtml.replace(/<a\b[\s\S]*?<\/a>/gi, '')) || entry.label;
  const fields = {};
  tableRows(info).forEach(cells => {
    for (let index = 0; index < cells.length - 1; index += 2) fields[cells[index]] = cells[index + 1];
  });

  const content = html.match(/<div class="mission-content">([\s\S]*?)<\/div>/i)?.[1] || '';
  const paragraphs = [...content.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .flatMap(match => text(match[1]).split(/\n+/))
    .map(clean)
    .filter(Boolean);
  const steps = [];
  const notes = [];
  const battleLines = [];
  for (const paragraph of paragraphs) {
    if (/^\d+[.．、]/.test(paragraph)) {
      steps.push(paragraph);
      continue;
    }
    if (/^(?:◆|◇)?\s*(?:Lv\.?\s*\d|战斗信息)|血量约|技能[:：]/i.test(paragraph)) battleLines.push(paragraph.replace(/^[◆◇]\s*/, ''));
    else notes.push(paragraph);
  }

  const professionAliases = entry.professions.flatMap(profession => {
    const shortName = profession.replace(/（.*?）/g, '');
    return [`就职${shortName}`, `${shortName}就职`];
  });
  const aliases = unique([...splitAliases(fields['昵称']), ...professionAliases]).filter(alias => alias !== name);
  const conditions = clean(fields['必要条件']).split(/[；;\n]+/).map(clean).filter(Boolean);
  const learning = unique(paragraphs.flatMap(line => [...line.matchAll(/(?:学习技能|习得技能?)[【〖“]?([\u4e00-\u9fff·]{2,12})/g)].map(match => `可学习${clean(match[1])}`)));
  const summaryParts = [fields['所属地图'] && `在${fields['所属地图']}完成职业试炼`, fields['任务NPC'] && `任务 NPC：${fields['任务NPC']}`].filter(Boolean);
  const bosses = battleLines.length ? [{ title: '就职试炼', enemies: unique(battleLines), skills: '', strategy: [] }] : [];
  return {
    quest: {
      id: `career-job-${entry.id}`,
      name,
      aliases,
      initials: '',
      // “职业就职任务”是来源分类，不是互相衔接的任务系列。
      series: '',
      order: null,
      level: fields['建议等级'] || '',
      type: fields['任务类型'] || '职业就职任务',
      prerequisites: [],
      summary: `${summaryParts.join('；')}。`,
      reward: `${entry.professions.join('、')}就职资格${learning.length ? `；${learning.join('；')}` : ''}`,
      source: `careerJob_${entry.id.replaceAll('-', '_')}`,
      sourceId: entry.id,
      sourceUrl: entry.url,
      reliability: 'high',
      detailStatus: 'documented',
      bossStatus: bosses.length ? 'documented' : 'none'
    },
    guide: {
      start: steps[0] || fields['所属地图'] || '',
      conditions,
      steps: steps.length ? steps : ['原攻略未能解析出编号步骤，请通过来源链接核验完整流程。'],
      notes
    },
    bosses,
    rewards: {
      guaranteed: [`${entry.professions.join('、')}就职资格`],
      chance: [],
      related: learning
    },
    source: { name: `魔力百科｜${name}`, url: entry.url }
  };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function main() {
  const careers = await loadCareers();
  const byId = new Map();
  for (const profession of careers) {
    for (const link of profession.employment?.links || []) {
      const id = sourceId(link.url);
      if (!id) continue;
      const entry = byId.get(id) || { id, label: link.label, url: link.url.replace(/^http:/, 'https:'), professions: [] };
      entry.professions.push(profession.name);
      byId.set(id, entry);
    }
  }
  const entries = [...byId.values()];
  const records = await mapLimit(entries, 4, async (entry, index) => {
    console.log(`[${index + 1}/${entries.length}] ${entry.label}`);
    return parsePage(await get(entry.url), entry);
  });
  const payload = JSON.stringify(records, null, 2);
  const output = `// 由 tools/build-career-quests.mjs 从“魔力职业”中的就职链接生成；请勿手工编辑。\n` +
    `(function addCareerEmploymentQuests() {\n` +
    `  const records = ${payload};\n` +
    `  const existingNames = new Set(QUESTS.map(quest => quest.name));\n` +
    `  const existingSourceIds = new Set(QUESTS.map(quest => quest.sourceId || String(quest.sourceUrl || '').match(/\\/Mission\\/Detail\\/([^?/#]+)/i)?.[1]).filter(Boolean));\n` +
    `  for (const entry of records) {\n` +
    `    SOURCES[entry.quest.source] = entry.source;\n` +
    `    const existing = QUESTS.find(quest => quest.name === entry.quest.name || quest.sourceId === entry.quest.sourceId);\n` +
    `    if (existing) {\n` +
    `      existing.aliases = [...new Set([...(existing.aliases || []), ...entry.quest.aliases])];\n` +
    `      Object.assign(existing, {type:entry.quest.type,sourceId:entry.quest.sourceId,sourceUrl:entry.quest.sourceUrl});\n` +
    `      QUEST_GUIDES[existing.id] = entry.guide;\n` +
    `      BOSS_GUIDES[existing.id] = entry.bosses;\n` +
    `      REWARD_GUIDES[existing.id] = entry.rewards;\n` +
    `      continue;\n` +
    `    }\n` +
    `    QUESTS.push(entry.quest);\n` +
    `    QUEST_GUIDES[entry.quest.id] = entry.guide;\n` +
    `    BOSS_GUIDES[entry.quest.id] = entry.bosses;\n` +
    `    REWARD_GUIDES[entry.quest.id] = entry.rewards;\n` +
    `    existingNames.add(entry.quest.name);\n` +
    `    existingSourceIds.add(entry.quest.sourceId);\n` +
    `  }\n` +
    `})();\n`;
  await fs.writeFile(outputFile, output, 'utf8');
  console.log(`Generated ${records.length} unique career employment quests.`);
}

await main();
