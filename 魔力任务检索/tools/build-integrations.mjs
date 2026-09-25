import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const levelingRoot = path.resolve(root, '..', '魔力服练级查询');
const require = createRequire(import.meta.url);
const { pinyin } = require('pinyin-pro');

function evaluate(files, expose) {
  const context = { console };
  context.globalThis = context;
  vm.createContext(context);
  const source = files.map(file => fs.readFileSync(file, 'utf8')).join('\n') + `\n;globalThis.__RESULT__ = (${expose});`;
  vm.runInContext(source, context, { filename: files.at(-1) });
  return context.__RESULT__;
}

const quests = evaluate(
  ['data.js', 'catalog.js', 'career-quests.js', 'enhancements.js'].map(file => path.join(root, file)),
  'QUESTS.map(({id,name,aliases,series,sourceCategory,type}) => ({id,name,aliases,series,sourceCategory,type}))'
);

const places = evaluate(
  ['data.js', 'zones.js', 'supplement.js'].map(file => path.join(levelingRoot, file)),
  '[...PLACES, ...MONSTER_ZONES].filter(place => place.relatedTasks?.length && (!place.modes || place.modes.includes("level")))'
);

const trainingTermsByTask = new Map();
places.forEach(place => place.relatedTasks.forEach(taskName => {
  const terms = trainingTermsByTask.get(taskName) || [];
  terms.push(place.name, place.aliases || '');
  trainingTermsByTask.set(taskName, terms);
}));

const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const range = value => Array.isArray(value) ? (value[0] === value[1] ? `${value[0]}` : `${value[0]}～${value[1]}`) : '';
const tokens = value => {
  const text = clean(value);
  if (!text) return [];
  const full = pinyin(text, { toneType: 'none', type: 'array' }).join('');
  const spaced = pinyin(text, { toneType: 'none' });
  const initials = pinyin(text, { pattern: 'first', toneType: 'none', type: 'array' }).join('');
  return [...new Set([full, spaced, initials].map(clean).filter(Boolean))];
};

const pinyinIndex = Object.fromEntries(quests.map(quest => {
  const fields = [quest.name, ...(quest.aliases || []), quest.series, quest.sourceCategory, quest.type, ...(trainingTermsByTask.get(quest.name) || [])];
  return [quest.id, [...new Set(fields.flatMap(tokens))]];
}));

const trainingIndex = places.map(place => ({
  name: clean(place.name),
  aliases: clean(place.aliases).split(/\s*·\s*|\s*／\s*|\s*\/\s*/).filter(Boolean),
  levels: [
    place.player ? `人物Lv.${range(place.player)}` : '',
    place.mobs ? `怪物Lv.${range(place.mobs)}` : ''
  ].filter(Boolean).join(' · '),
  unlock: clean(place.requirements || place.tasks || '详见关联任务条件。'),
  route: clean(place.route || `本练级点位于关联任务流程中；按任务步骤推进至“${place.name}”即可停下练级。`),
  relatedTasks: [...place.relatedTasks],
  keywords: [place.name, ...clean(place.aliases).split(/\s*·\s*|\s*／\s*|\s*\/\s*/)].map(clean).filter(Boolean)
}));

const output = `// 由 tools/build-integrations.mjs 生成；请勿手工编辑。\n` +
  `globalThis.PINYIN_INDEX = ${JSON.stringify(pinyinIndex, null, 2)};\n` +
  `globalThis.TRAINING_ROUTE_INDEX = ${JSON.stringify(trainingIndex, null, 2)};\n`;

fs.writeFileSync(path.join(root, 'generated-integrations.js'), output, 'utf8');
console.log(`Generated ${quests.length} pinyin records and ${trainingIndex.length} training routes.`);
