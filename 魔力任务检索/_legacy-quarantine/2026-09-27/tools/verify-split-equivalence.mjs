import fs from 'node:fs';
import path from 'node:path';
import { dataSourceDir, loadQuestDatabase } from './quest-database.mjs';

const snapshotPath = path.join(dataSourceDir, 'quests.json');
if (!fs.existsSync(snapshotPath)) throw new Error('缺少拆分前迁移快照，无法执行无损等价检查。');

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const split = loadQuestDatabase();
if (snapshot.schemaVersion !== split.schemaVersion) throw new Error('拆分前后数据库版本不一致。');

const snapshotIds = Object.keys(snapshot.quests || {}).sort();
const splitIds = Object.keys(split.quests || {}).sort();
if (JSON.stringify(snapshotIds) !== JSON.stringify(splitIds)) throw new Error('拆分前后任务 ID 集合不一致。');

for (const id of snapshotIds) {
  const before = JSON.stringify(snapshot.quests[id]);
  const after = JSON.stringify(split.quests[id]);
  if (before !== after) throw new Error(`拆分前后任务事实不一致：${id}`);
}

console.log(`Split database is lossless: ${splitIds.length} quest records match the migration snapshot.`);
