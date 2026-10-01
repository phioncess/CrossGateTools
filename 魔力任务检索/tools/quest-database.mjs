import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
export const projectDir = path.resolve(toolsDir, '..');
export const dataSourceDir = path.join(projectDir, 'data-src');
export const databaseManifestPath = path.join(dataSourceDir, 'database.json');
export const questRecordsDir = path.join(dataSourceDir, 'quests');

function readJson(filename) {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch (error) {
    throw new Error(`无法读取结构化数据 ${filename}: ${error.message}`);
  }
}

export function questRecordFiles() {
  if (!fs.existsSync(questRecordsDir)) {
    throw new Error(`缺少分任务数据目录：${questRecordsDir}`);
  }
  return fs.readdirSync(questRecordsDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(questRecordsDir, entry.name))
    .sort((left, right) => left.localeCompare(right, 'en'));
}

export function loadQuestDatabase() {
  if (!fs.existsSync(databaseManifestPath)) {
    throw new Error(`缺少结构化数据库清单：${databaseManifestPath}。不得回退到旧单体数据。`);
  }

  const manifest = readJson(databaseManifestPath);
  if (manifest.recordFormat !== 'one-quest-per-file') {
    throw new Error(`不支持的数据记录格式：${manifest.recordFormat || '未声明'}`);
  }

  const quests = {};
  for (const filename of questRecordFiles()) {
    const record = readJson(filename);
    const basename = path.basename(filename, '.json');
    if (!record?.id) throw new Error(`任务文件缺少 id：${filename}`);
    if (record.id !== basename) throw new Error(`任务文件名与 id 不一致：${basename} / ${record.id}`);
    if (quests[record.id]) throw new Error(`重复任务 id：${record.id}`);
    quests[record.id] = record;
  }

  const actualCount = Object.keys(quests).length;
  if (manifest.questCount !== actualCount) {
    throw new Error(`任务文件数量与清单不一致：${actualCount} / ${manifest.questCount}`);
  }

  return {
    schemaVersion: manifest.schemaVersion,
    dataModelVersion: manifest.dataModelVersion,
    quests
  };
}

export function stableDatabaseJson(database) {
  return `${JSON.stringify(database, null, 2)}\n`;
}
