import fs from 'node:fs';
import path from 'node:path';
import { projectDir } from './quest-database.mjs';

const questDir = path.join(projectDir, 'data-src', 'quests');
let changedFiles = 0;
let changedEnemies = 0;

const visitEnemies = quest => {
  const enemies = [];
  for (const version of Object.values(quest.versions || {})) {
    for (const tier of Object.values(version.tiers || {})) {
      for (const battle of Object.values(tier.battles || {})) {
        enemies.push(...Object.values(battle.enemies || {}));
        for (const round of Object.values(battle.rounds || {})) enemies.push(...Object.values(round.enemies || {}));
        for (const branch of Object.values(battle.randomOneOf || {})) enemies.push(...Object.values(Array.isArray(branch) ? branch : branch?.enemies || {}));
      }
    }
  }
  return enemies;
};

for (const entry of fs.readdirSync(questDir, {withFileTypes:true})) {
  if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
  const filename = path.join(questDir, entry.name);
  const quest = JSON.parse(fs.readFileSync(filename, 'utf8'));
  let changed = false;
  for (const enemy of visitEnemies(quest)) {
    const raw = String(enemy.raw || '');
    const before = JSON.stringify(enemy);
    if (/不抗毒/.test(raw)) enemy.poisonResistance = 'not-resistant';
    else if (/抗毒/.test(raw)) enemy.poisonResistance = 'resistant';
    if (/不抗石化/.test(raw)) enemy.petrifyResistance = 'not-resistant';
    else if (/抗石化/.test(raw)) enemy.petrifyResistance = 'resistant';
    const position = raw.match(/站位[：:]?\s*([^，；]+)/)?.[1]?.trim();
    if (position) enemy.position = position;
    const modifiers = raw.match(/修正[：:]?\s*([^；]+)/)?.[1]?.trim();
    if (modifiers) enemy.modifiers = modifiers;
    const defense = raw.match(/防御力\s*([0-9+～~-]+)/)?.[1];
    if (defense) enemy.defense = defense;
    if (JSON.stringify(enemy) !== before) {
      changed = true;
      changedEnemies += 1;
    }
  }
  if (changed) {
    fs.writeFileSync(filename, `${JSON.stringify(quest, null, 2)}\n`, 'utf8');
    changedFiles += 1;
  }
}

console.log(`Normalized recovered enemy facts: ${changedEnemies} enemies in ${changedFiles} files.`);
