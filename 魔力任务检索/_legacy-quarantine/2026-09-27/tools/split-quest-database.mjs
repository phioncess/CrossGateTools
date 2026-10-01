import fs from 'node:fs';
import path from 'node:path';
import { dataSourceDir, databaseManifestPath, questRecordsDir } from './quest-database.mjs';

const legacySnapshotPath = path.join(dataSourceDir, 'quests.json');
if (!fs.existsSync(legacySnapshotPath)) {
  throw new Error(`找不到待迁移的单体数据：${legacySnapshotPath}`);
}
if (fs.existsSync(databaseManifestPath) || (fs.existsSync(questRecordsDir) && fs.readdirSync(questRecordsDir).length)) {
  throw new Error('分任务数据已经存在。迁移器只允许执行一次，避免覆盖后续人工修改。');
}

const database = JSON.parse(fs.readFileSync(legacySnapshotPath, 'utf8'));
const entries = Object.entries(database.quests || {});
if (!database.schemaVersion || !entries.length) throw new Error('单体任务数据库为空或缺少 schemaVersion。');

fs.mkdirSync(questRecordsDir, { recursive: true });
for (const [id, quest] of entries) {
  if (quest.id !== id) throw new Error(`任务键与记录 id 不一致：${id} / ${quest.id}`);
  fs.writeFileSync(path.join(questRecordsDir, `${id}.json`), `${JSON.stringify(quest, null, 2)}\n`, 'utf8');
}

const manifest = {
  schemaVersion: database.schemaVersion,
  dataModelVersion: 2,
  recordFormat: 'one-quest-per-file',
  questCount: entries.length,
  migrationSource: 'data-src/quests.json',
  migrationRule: 'lossless-split'
};
fs.writeFileSync(databaseManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`已无损拆分 ${entries.length} 条任务；旧 quests.json 仅保留为迁移快照。`);
