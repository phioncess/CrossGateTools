import fs from 'node:fs';
import path from 'node:path';
import {loadQuestDatabase,questRecordsDir} from './quest-database.mjs';

// Deterministic, source-guarded repairs of records identified by the all-library audit.
const database = loadQuestDatabase();
const verification = {status:'verified',method:'source-semantic-review-20261002'};
const requireSource = (quest,line,text) => {
  if (!quest.source.rawLines.find(entry => entry.line === line)?.text.includes(text)) throw new Error(`${quest.name} 来源证据发生变化：${line}`);
};
const save = quest => fs.writeFileSync(path.join(questRecordsDir,`${quest.id}.json`),`${JSON.stringify(quest,null,2)}\n`);

const kitchen = database.quests['catalog-be323b13-7204-4b5b-a677-6f9b1eb86c44'];
requireSource(kitchen,1,'（111.148）');
requireSource(kitchen,18,'比例为1:1');
const seasoning = kitchen.rewardEvents.find(event => event.id === 'umami-seasoning');
seasoning.step = 'step-2';
seasoning.sourceLines = [2,19,20];
seasoning.items[0].sourceLines = [2,19,20];
if (!kitchen.rewardEvents.some(event => event.id === 'umami-seasoning-tomato')) kitchen.rewardEvents.push({
  id:'umami-seasoning-tomato',version:'common',tier:'common',kind:'exchange-recipe',step:'tomato-exchange',
  items:[{...structuredClone(seasoning.items[0]),id:'umami-seasoning-tomato',cost:{item:'番茄',quantity:1},sourceLines:[18,19,20]}],
  inputs:[{item:'番茄',quantity:1}],sourceLines:[18,19,20],verification,
});
kitchen.flow.steps.find(step => step.id === 'step-1').text = '前往法兰城王宫食堂（111.148）与培里·贝肯（15.7）对话。';
const failedChef = kitchen.flow.steps.find(step => step.id === 'failed-chef');
failedChef.text = failedChef.text.replace('陶欧食品店塔妮雅','陶欧食品店（72.104）塔妮雅');
save(kitchen);

const invitation = database.quests['catalog-4f53997c-102d-4d5b-ac53-000e28bdf228'];
requireSource(invitation,9,'可以重复使用；不可交易');
requireSource(invitation,26,'亦可与NPC对话进入战斗');
if (!invitation.rewardEvents.some(event => event.id === 'controlled-memory')) invitation.rewardEvents.push({
  id:'controlled-memory',version:'common',tier:'common',kind:'quest-branch-reward',step:'ranger-branch',condition:'游侠职业',
  items:[{id:'controlled-memory',name:'被支配的记忆',role:'valuable-result',properties:{reusable:true,tradeable:false,useEffect:'双击传送至头目的房间前'},
    futureUses:'任务完成后保留，仍可双击传送并与NPC对话进入战斗',sourceLines:[8,9,26],verification}],
  sourceLines:[8,9,26],verification,
});
invitation.itemEvents.uses ||= [];
if (!invitation.itemEvents.uses.some(event => event.item === '被支配的记忆')) invitation.itemEvents.uses.push({
  item:'被支配的记忆',step:'ranger-branch',purpose:'repeat-route',route:'头目的房间前',
  text:'保留【被支配的记忆】；任务完成后双击仍可传送至头目的房间前，并与NPC对话进入战斗。',sourceLines:[9,26],verification,
});
save(invitation);
console.log('已核对并修订：王宫食堂的坐标/双来源事件；娜蕾希亚的邀请的有价值传送道具/重复路线。');
