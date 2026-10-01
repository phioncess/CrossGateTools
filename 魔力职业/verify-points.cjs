// 只读取显式列出的本工具代码，不扫描无关文件或授权归档。
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const base = { window: {} };
vm.createContext(base);
for (const file of ['data.js','points-data.js','points-core.js']) vm.runInContext(read(file), base);
const data = base.window.CAREER_POINTS_DATA, core = base.window.CAREER_POINTS_CORE;
assert.equal(new Set(base.window.CAREER_DATA.professions.map(p => p.id)).size, 42);
assert.equal(data.profiles.length, 18);
for (const profile of data.profiles) {
  assert(base.window.CAREER_DATA.professions.some(p => p.name === profile.career));
  assert(fs.existsSync(path.join(__dirname, '文档记录', profile.image)));
  assert.equal(profile.target.reduce((a,b) => a+b), 506);
  let previous = [0,0,0,0,0];
  for (let level = 1; level <= 120; level++) {
    const values = Array.from(core.recommend(level, profile.target, data.rules));
    const budget = core.total(level, data.rules);
    assert.equal(values.reduce((a,b) => a+b), budget);
    assert(values.every((n,i) => Number.isInteger(n) && n >= previous[i] && n <= budget / 2));
    assert.equal(values.reduce((sum,n,i) => sum+n-previous[i],0), level === 1 ? 30 : 4);
    previous = values;
  }
  assert.deepEqual(previous, Array.from(profile.target));
}
function launch(hash = '') {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, { value:'', innerHTML:'', textContent:'', events:{}, addEventListener(type,fn) { this.events[type] = fn; }, querySelectorAll(selector) {
      if (selector !== 'input') return [];
      if (this.cachedHTML === this.innerHTML) return this.inputs;
      this.cachedHTML = this.innerHTML;
      return this.inputs = [...this.innerHTML.matchAll(/value="(\d+)" data-point="(\d+)"/g)].map(match => ({ value:match[1],dataset:{point:match[2]},events:{},addEventListener(type,fn){this.events[type]=fn;} }));
    } });
    return elements.get(id);
  }
  let url = hash;
  const context = { window:{}, URLSearchParams, location:{hash}, history:{replaceState(a,b,next){url=next;}}, document:{getElementById:element}, requestAnimationFrame(){} };
  vm.createContext(context);
  for (const file of ['data.js','points-data.js','points-core.js','app.js']) vm.runInContext(read(file),context);
  const change = (id,value) => { const el=element(id);el.value=value;el.events.change({target:el}); };
  return {element,change,get url(){return url;}};
}
const archer = base.window.CAREER_DATA.professions.find(p => p.name === '弓箭手');
const app = launch(`#career=${archer.id}&level=120`);
assert(app.element('pointSummary').textContent.includes('506'));
assert(app.element('pointRows').innerHTML.includes('value="253"'));
app.element('pointClear').events.click();
assert(app.element('pointStatus').textContent.includes('剩余 506'));
const strength = app.element('pointRows').querySelectorAll('input')[1];
strength.value = '999'; strength.events.change();
assert.equal(strength.value,253);
assert(app.url.includes('points=0%2C253%2C0%2C0%2C0'));
assert(launch(app.url).element('pointRows').innerHTML.includes('value="253"'));
app.change('pointLevel','2');
assert(app.element('pointSummary').textContent.includes('34'));
assert(app.element('pointStatus').textContent.includes('剩余 0'));
app.change('pointLevel','-10');
assert.equal(app.element('pointLevel').value,1);
const invalid = launch('#career=bad&level=Infinity&points=-1,999,0,0,0&build=bad');
assert.equal(invalid.element('pointLevel').value,1);
assert(invalid.element('pointRows').innerHTML.includes('待核验'));
console.log('通过：18方案×120级、42职业ID、原图链接、总点/上限/单级增量、120级目标、自定义约束、等级联动、URL恢复及无效参数回退。');
