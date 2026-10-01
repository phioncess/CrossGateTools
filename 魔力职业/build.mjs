import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname);
const SOURCE_HTML = path.resolve(ROOT, '..', '魔力装备档案', 'index.html');
const BASE = 'https://www.molibaike.com';
const RANKS = ['见习', '一转', '二转', '三转'];
const SKILL_ALIASES = { '制头盔': '造头盔', '作帽子': '制帽子', '制靴': '制长靴' };
const MANUAL_SKILLS = {
  '云群的祈祷': {
    name: '云群的祈祷',
    url: 'https://forum.gamer.com.tw/G2.php?bsn=2577&sn=3717',
    type: '状态魔法', location: '击倒海贼头目后随机传送到可学习祈祷的房间', npc: '天书', cost: '10000', slots: '1',
    method: '学习方法：完成《蒂娜村的海贼》，击倒海贼头目后随机进入对应房间，向天书学习。\n教导人：天书\n学习费用：10000\n技能格数：1'
  },
  '精神冲击波': {
    name: '精神冲击波',
    url: 'https://wiki2.gamer.com.tw/wiki.php?n=3128%3A%E7%B2%BE%E7%A5%9E%E8%A1%9D%E6%93%8A%E6%B3%A2',
    type: '属性攻击魔法', location: '雪拉威森塔92楼的传送房间', npc: '茵凡雷斯', cost: '6000', slots: '1',
    method: '学习地点：雪拉威森塔92楼的传送房间\n教导人：茵凡雷斯\n学习费用：6000\n技能格数：1\n限制：能够装备杖的职业学习；相关任务《解咒之药》。'
  }
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function decode(value = '') {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (all, name) => named[name.toLowerCase()] ?? all);
}

function text(html = '') {
  return decode(html)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[\t\r ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function absolute(url = '') {
  if (!url) return '';
  return new URL(url, BASE).href;
}

function extractLinks(html = '') {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => ({ url: absolute(decode(match[1])), label: text(match[2]) }));
}

function parseRows(tableHtml) {
  return [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row => {
    const cells = [...row[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)];
    return cells.map(cell => ({ text: text(cell[1]), html: cell[1], links: extractLinks(cell[1]) }));
  }).filter(row => row.length);
}

function extractTables(html) {
  return [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(match => ({
    html: match[0],
    rows: parseRows(match[0]),
    text: text(match[0])
  }));
}

function nostalgiaNumber(value) {
  const matches = String(value || '').match(/\d+/g);
  return matches ? Number(matches.at(-1)) : 0;
}

function cleanParagraphs(html) {
  const beforeTables = html.split(/<table\b/i)[0];
  return [...beforeTables.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(match => text(match[1]))
    .filter(Boolean)
    .filter(line => !/^(道具与时长服|时长[／/]道具服|道具服|时道服).*?(技能|独占|专属)/.test(line))
    .filter(line => !/^更多减魔物品/.test(line))
    .join('\n\n');
}

function parseRating(description) {
  const labels = ['就职难度', '技能修炼', '物资消耗', '练级能力', '任务能力', '竞技能力'];
  return Object.fromEntries(labels.map(label => {
    const match = description.match(new RegExp(`${label}[：:]([★☆]+)`));
    return [label, match ? (match[1].match(/★/g) || []).length : null];
  }).filter(([, score]) => score !== null));
}

function parseCareer(tables) {
  const table = tables.find(item => item.text.includes('职业称号') && item.text.includes('就职方法'));
  const result = { titles: [], employment: null, advancements: [] };
  if (!table) return result;
  for (const row of table.rows) {
    const values = row.map(cell => cell.text);
    if (values[0] === '职业称号') result.titles = values.slice(1, 5);
    if (values[0] === '就职方法') {
      result.employment = { rank: values[1] || '见习', description: values.slice(2).join(' · '), links: row.flatMap(cell => cell.links) };
    }
    const rankIndex = values.findIndex(value => ['一转', '二转', '三转'].includes(value));
    if (rankIndex >= 0) {
      result.advancements.push({ rank: values[rankIndex], description: values.slice(rankIndex + 1).join(' · '), links: row.flatMap(cell => cell.links) });
    }
  }
  return result;
}

function parseEquipment(tables, fallbackLimits) {
  const table = tables.find(item => item.text.includes('装备上限'));
  const entries = [];
  if (table) {
    for (const row of table.rows) {
      const values = row.map(cell => cell.text);
      if (values.length < 5 || /物品名称|装备上限/.test(values[0])) continue;
      const caps = values.slice(1, 5).map(nostalgiaNumber);
      if (caps.some(Boolean)) entries.push({ name: values[0], caps });
    }
  }
  if (entries.length) return entries;
  return Object.entries(fallbackLimits || {}).map(([name, ranks]) => ({
    name,
    caps: ranks.slice(0, 4).map(rank => Number(rank?.nostalgia || 0))
  })).filter(item => item.caps.some(Boolean));
}

function categoryFromTable(table) {
  const title = table.rows.flat().map(cell => cell.text).find(value => /技能.*上限|上限表/.test(value));
  return normalizeSkillCategory(title || '其他技能');
}

function normalizeSkillCategory(title) {
  const value = String(title || '').replace(/[&＆]/g, '与').replace(/上限表?|技能上限表?/g, '').trim();
  if (/回复.*制御/.test(value)) return '回复与制御魔法';
  if (/属性魔法/.test(value)) return '属性魔法';
  if (/状态魔法/.test(value)) return '状态魔法';
  if (/特殊/.test(value)) return '特殊技能';
  if (/生产/.test(value)) return '生产技能';
  if (/战斗/.test(value)) return '战斗技能';
  return value || '其他技能';
}

function parseSkills(tables) {
  const result = [];
  for (const table of tables.filter(item => item.text.includes('技能名称') && /技能.*上限|上限表/.test(item.text))) {
    let category = categoryFromTable(table);
    for (const row of table.rows) {
      const values = row.map(cell => cell.text);
      const categoryTitle = values.find(value => /技能.*上限|上限表/.test(value));
      if (categoryTitle) {
        category = normalizeSkillCategory(categoryTitle);
        continue;
      }
      if (values.length < 5 || /技能名称/.test(values[0])) continue;
      const caps = values.slice(1, 5).map(nostalgiaNumber);
      if (!caps.some(Boolean)) continue;
      result.push({ name: values[0].replace(/（时道\/怀）|（怀旧服）/g, '').trim(), sourceName: values[0].trim(), category, caps });
    }
  }
  const unique = new Map();
  for (const skill of result) {
    const current = unique.get(skill.name);
    if (!current || Math.max(...skill.caps) > Math.max(...current.caps)) unique.set(skill.name, skill);
  }
  return [...unique.values()];
}

async function get(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 MagicCareerOfflineBuilder/1.0' } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(800 * attempt);
    }
  }
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

async function loadProfessions() {
  const source = await fs.readFile(SOURCE_HTML, 'utf8');
  const match = source.match(/const professionDb=(\{.*?\});\s*\n/);
  if (!match) throw new Error('无法从魔力装备档案读取职业数据');
  return JSON.parse(match[1]).professions;
}

async function fetchProfession(profession, index, total) {
  console.log(`[职业 ${index + 1}/${total}] ${profession.name}`);
  const html = await get(`${profession.url}?u=True`);
  const detailMatch = html.match(/<div class="detail-content">([\s\S]*?)<\/section>/i);
  const detail = detailMatch?.[1] || '';
  const tables = extractTables(detail);
  const description = cleanParagraphs(detail);
  return {
    id: profession.id,
    name: profession.name,
    group: profession.group,
    url: `${profession.url}?u=True`,
    description,
    rating: parseRating(description),
    ...parseCareer(tables),
    equipment: parseEquipment(tables, profession.limits),
    skills: parseSkills(tables)
  };
}

function normalizeSkillName(name) {
  return name.replace(/（怀旧服）|（时道\/怀）|\s+/g, '').trim();
}

async function fetchSkillCatalog() {
  const pages = [];
  for (let page = 1; page <= 8; page++) {
    const url = page === 1 ? `${BASE}/Skill` : `${BASE}/Skill?page=${page}`;
    const html = await get(url);
    const links = extractLinks(html).filter(link => /\/Skill\/Detail\//i.test(link.url));
    if (!links.length && page > 1) break;
    pages.push(...links);
    console.log(`[技能目录 ${page}] ${links.length} 条`);
  }
  const unique = new Map();
  for (const item of pages) unique.set(normalizeSkillName(item.label), item);
  return unique;
}

function parseSkillDetail(html, name, url) {
  const section = html.match(/<h3 class="section-title[^>]*>[\s\S]*?<\/section>/i)?.[0] || html;
  const tables = extractTables(section);
  const basic = tables[0]?.rows || [];
  const fields = {};
  const knownFields = /^(学习费用|技能格数|学习地点|教导人|NPC|说明|备注|得意技职业|参考任务)$/;
  for (const row of basic) {
    const values = row.map(cell => cell.text).filter(Boolean);
    for (let i = 0; i < values.length - 1; i++) {
      if (knownFields.test(values[i])) fields[values[i]] = values[i + 1];
    }
  }
  const method = ['学习地点', '教导人', '学习费用', '技能格数', '说明', '备注', '参考任务']
    .filter(key => fields[key] && fields[key] !== '——')
    .map(key => `${key}：${fields[key]}`)
    .join('\n');
  return {
    name,
    url,
    type: fields['类型'] || fields['技能类型'] || '',
    location: fields['学习地点'] || '',
    npc: fields['教导人'] || fields['NPC'] || fields['学习NPC'] || '',
    cost: fields['学习费用'] || fields['费用'] || '',
    slots: fields['技能格数'] || '',
    method
  };
}

async function fetchSkillDetails(professions) {
  const needed = new Set(professions.flatMap(profession => profession.skills.map(skill => normalizeSkillName(skill.name))));
  const catalog = await fetchSkillCatalog();
  const targets = [...needed].map(name => ({ name, entry: catalog.get(name) || catalog.get(normalizeSkillName(SKILL_ALIASES[name] || '')) })).filter(item => item.entry);
  if (needed.has('吸血攻击') && !targets.some(item => item.name === '吸血攻击')) {
    targets.push({ name: '吸血攻击', entry: { label: '吸血攻击', url: `${BASE}/Skill/Detail/21bc1efb-9a51-48b2-985e-ddc27a758cc7` } });
  }
  console.log(`需要技能 ${needed.size}，目录匹配 ${targets.length}`);
  const details = await mapLimit(targets, 4, async ({ name, entry }, index) => {
    console.log(`[技能 ${index + 1}/${targets.length}] ${name}`);
    const html = await get(entry.url);
    return parseSkillDetail(html, name, entry.url);
  });
  const result = Object.fromEntries(details.map(item => [item.name, item]));
  for (const [name, detail] of Object.entries(MANUAL_SKILLS)) if (needed.has(name)) result[name] = detail;
  return result;
}

function sanitizeForNostalgia(professions, skillDetails) {
  const onlyOtherServer = /仅限(?:道具|时长|时道)服|怀旧服(?:无法|不能|未开放|不开放)/;
  const excludedProfessions = new Set(['暗黑骑士', '教团骑士', '舞者']);
  const excludedSkills = new Set(['迅速果断', '一石二鸟', '一击必中', '戒骄戒躁', '因果报应', '骑士之誉', '毒击', '单体即死', '跳舞', '黏巴达舞', '啪啦啪啦舞', '捷舞']);
  professions = professions.filter(profession => !excludedProfessions.has(profession.name));
  for (const profession of professions) {
    profession.description = profession.description
      .split('\n\n')
      .filter(paragraph => !onlyOtherServer.test(paragraph))
      .map(paragraph => paragraph.split(/(?<=[。！？；])/).filter(sentence => {
        const mentionsOther = /道具服|时长服|时道服|道具与时长服|时长[／/]道具服/.test(sentence);
        return !mentionsOther && !/连击·无双|四转|五转/.test(sentence);
      }).join(''))
      .join('\n\n');
    profession.skills = profession.skills.filter(skill => {
      const detail = skillDetails[normalizeSkillName(skill.name)];
      return !excludedSkills.has(skill.name) && (!detail || !onlyOtherServer.test(`${detail.method}\n${detail.type}`));
    });
  }
  const usedSkills = new Set(professions.flatMap(profession => profession.skills.map(skill => normalizeSkillName(skill.name))));
  for (const [name, detail] of Object.entries(skillDetails)) {
    if (!usedSkills.has(normalizeSkillName(name))) {
      delete skillDetails[name];
      continue;
    }
    detail.method = detail.method.split(/(?<=[。！？；\n])/).filter(sentence => {
      return !/道具服|时长服|时道服|道具与时长服|时长[／/]道具服|四转|五转/.test(sentence);
    }).join('').trim();
    detail.location = detail.location.split(/[；\n]/).filter(part => {
      return !/道具服|时长服|时道服|道具与时长服|时长[／/]道具服/.test(part);
    }).join('；').trim();
  }
  return professions;
}

async function main() {
  const professionList = await loadProfessions();
  let professions = await mapLimit(professionList, 4, (profession, index) => fetchProfession(profession, index, professionList.length));
  const skillDetails = await fetchSkillDetails(professions);
  professions = sanitizeForNostalgia(professions, skillDetails);
  const data = {
    generatedAt: new Date().toISOString(),
    scope: '魔力宝贝怀旧服；仅见习、一转、二转、三转',
    ranks: RANKS,
    source: `${BASE}/Profession`,
    professions,
    skillDetails
  };
  await fs.writeFile(path.join(ROOT, 'data.js'), `window.CAREER_DATA = ${JSON.stringify(data)};\n`, 'utf8');
  console.log(`完成：${professions.length} 个职业，${Object.keys(skillDetails).length} 个技能详情`);
}

await main();
