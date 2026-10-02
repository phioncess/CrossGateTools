import fs from 'node:fs';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {loadQuestDatabase,projectDir} from './quest-database.mjs';

// Only explicit production files and formal JSON records are read. No recursive scan,
// archives, private files, dependency caches, or legacy recovery inputs participate.
const database=loadQuestDatabase();
const html=fs.readFileSync(path.join(projectDir,'index.html'),'utf8');
const dom=new JSDOM(html,{url:'https://audit.local/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.HTMLElement.prototype.scrollIntoView=function(){};
for(const script of window.document.querySelectorAll('script[src]')){
  const filename=script.getAttribute('src').split('?')[0];
  if(filename.includes('/')||filename.includes('\\')||!filename.endsWith('.js'))throw Error('Unexpected runtime path');
  window.eval(fs.readFileSync(path.join(projectDir,filename),'utf8'));
}
const input=window.document.querySelector('#questSearch');
const coordinates=text=>[...String(text).matchAll(/[（(](\d+)[.,，](\d+)[）)]/g)].map(m=>`${Number(m[1])}.${Number(m[2])}`);
const results=[];
for(const quest of Object.values(database.quests)){
  input.value='';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  const option=window.document.getElementById(`option-${quest.id}`);
  if(!option)throw Error('Missing option '+quest.id);
  option.click();
  const root=window.document.querySelector('#questDetail');
  if(root.querySelector('h2')?.textContent!==quest.name)throw Error('Wrong page '+quest.id);
  for(const details of root.querySelectorAll('details'))details.open=true;
  const visible=new Set(coordinates(root.textContent));
  const misses=[];
  for(const line of quest.source.rawLines){
    for(const coordinate of new Set(coordinates(line.text))){
      if(visible.has(coordinate))continue;
      misses.push({line:line.line,coordinate,sourceText:line.text,
        referencedSteps:quest.flow.steps.filter(step=>step.sourceLines.includes(line.line)).map(step=>({id:step.id,order:step.order,text:step.text}))});
    }
  }
  results.push({id:quest.id,name:quest.name,sourceUrl:quest.source.url,sourceCoordinateCount:quest.source.rawLines.reduce((sum,line)=>sum+new Set(coordinates(line.text)).size,0),missingCoordinates:misses});
}
const report={date:'2026-10-03',scope:'本地原攻略坐标 → 实际渲染的全任务DOM（全部折叠区展开）；跨步骤已展示不报漏。候选可能为别服、原图或流程外资料，必须逐项核验后处理。',questCount:results.length,questsWithCandidates:results.filter(x=>x.missingCoordinates.length).length,candidateCount:results.reduce((s,x)=>s+x.missingCoordinates.length,0),results};
fs.writeFileSync(path.join(projectDir,'rendered-source-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({questCount:report.questCount,questsWithCandidates:report.questsWithCandidates,candidateCount:report.candidateCount,samples:results.filter(x=>x.missingCoordinates.length).slice(0,3)},null,2));
window.close();
