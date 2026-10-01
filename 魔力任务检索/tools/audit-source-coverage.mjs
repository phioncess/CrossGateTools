import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { loadQuestDatabase, projectDir } from './quest-database.mjs';

const database = loadQuestDatabase();
const reportPath = path.join(projectDir, 'source-coverage-report.json');

const values = value => Array.isArray(value) ? value : Object.values(value || {});
const normalize = value => String(value || '')
  .replace(/[〖〗「」『』]/g, character => ({'〖':'【','〗':'】','「':'“','」':'”','『':'“','』':'”'}[character]))
  .replace(/&nbsp;/gi, '')
  .replace(/[\s\u00a0]+/g, '')
  .replace(/[，。；：、,.!?！？;:·・—－_()（）<>＜＞]/g, '')
  .toLowerCase();

function emptyBattles(quest) {
  const result = [];
  for (const version of Object.values(quest.versions || {})) {
    for (const tier of Object.values(version.tiers || {})) {
      for (const battle of Object.values(tier.battles || {})) {
        const enemies = values(battle.enemies);
        const roundEnemies = values(battle.rounds).flatMap(round => values(round?.enemies));
        const randomEnemies = values(battle.randomOneOf).flatMap(branch => values(Array.isArray(branch) ? branch : branch?.enemies));
        if (!enemies.length && !roundEnemies.length && !randomEnemies.length) result.push(battle);
      }
    }
  }
  return result;
}

async function auditQuest(quest) {
  const response = await fetch(quest.source.url, {headers:{'user-agent':'Mozilla/5.0 source-coverage-audit'}});
  if (!response.ok) throw new Error(`${quest.name}: HTTP ${response.status}`);
  const dom = new JSDOM(await response.text());
  const remoteParagraphs = [...dom.window.document.querySelectorAll('.mission-content p')]
    .map(node => node.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  dom.window.close();
  const localLines = (quest.source.rawLines || []).map(line => ({line:line.line, text:line.text, normalized:normalize(line.text)}));
  const localJoined = localLines.map(line => line.normalized).join('');
  const unmatchedParagraphs = remoteParagraphs.filter(text => {
    const candidate = normalize(text);
    if (candidate.length < 3) return false;
    return !localJoined.includes(candidate) && !localLines.some(line => candidate.includes(line.normalized) && line.normalized.length >= 8);
  });
  return {
    id: quest.id,
    name: quest.name,
    url: quest.source.url,
    emptyBattles: emptyBattles(quest).map(battle => ({
      id:battle.id,
      trigger:battle.trigger || '',
      details:battle.details || battle.enemyDetails || '',
      sourceLines:battle.sourceLines || []
    })),
    remoteParagraphCount: remoteParagraphs.length,
    localRawLineCount: localLines.length,
    unmatchedParagraphs
  };
}

const targets = Object.values(database.quests || {}).filter(quest =>
  emptyBattles(quest).length || String(quest.verification?.note || '').includes('遗漏战斗段'));
const results = [];
for (let index = 0; index < targets.length; index += 4) {
  results.push(...await Promise.all(targets.slice(index, index + 4).map(auditQuest)));
}

const report = {
  generatedAt: new Date().toISOString(),
  scope: 'quests-with-empty-battle-records-or-recovered-battle-source',
  questCount: targets.length,
  emptyBattleCount: targets.reduce((sum, quest) => sum + emptyBattles(quest).length, 0),
  questsWithUnmatchedSourceParagraphs: results.filter(result => result.unmatchedParagraphs.length).length,
  results
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  reportPath,
  questCount: report.questCount,
  emptyBattleCount: report.emptyBattleCount,
  questsWithUnmatchedSourceParagraphs: report.questsWithUnmatchedSourceParagraphs,
  unmatchedParagraphCount: results.reduce((sum, result) => sum + result.unmatchedParagraphs.length, 0)
}, null, 2));
