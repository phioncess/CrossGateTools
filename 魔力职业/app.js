(() => {
  const data = window.CAREER_DATA;
  const ranks = data.ranks;
  const rawHash = location.hash.slice(1);
  const launchParams = new URLSearchParams(rawHash.includes('=') ? rawHash : '');
  const legacyCareerId = rawHash && !rawHash.includes('=') ? rawHash : '';
  const requestedRank = launchParams.has('rank') ? Number(launchParams.get('rank')) : NaN;
  const requestedSkill = launchParams.get('skill') || '';
  const state = { careerId: launchParams.get('career') || legacyCareerId || data.professions[0]?.id, rank: Number.isInteger(requestedRank) && requestedRank >= 0 && requestedRank < ranks.length ? requestedRank : 3, group: '全部', careerQuery: '', skillCategory: '', selectedSkill: requestedSkill };
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const career = () => data.professions.find(item => item.id === state.careerId) || data.professions[0];
  const normalize = value => String(value || '').toLowerCase().replace(/[\s（）()·]/g, '');
  const rankTitle = (item, index) => (item.titles[index] || ranks[index]).replace(/\s+/g, '');

  function renderFilters() {
    const groups = ['全部', ...new Set(data.professions.map(item => item.group))];
    $('groupFilters').innerHTML = groups.map(group => `<button class="filter-chip ${group === state.group ? 'active' : ''}" data-group="${esc(group)}">${esc(group)}</button>`).join('');
    $('groupFilters').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { state.group = button.dataset.group; renderSidebar(); renderFilters(); }));
  }

  function filteredCareers() {
    const query = normalize(state.careerQuery);
    return data.professions.filter(item => (state.group === '全部' || item.group === state.group) && (!query || normalize(`${item.name}${item.group}${item.titles.join('')}`).includes(query)));
  }

  function renderSidebar() {
    const items = filteredCareers();
    $('careerList').innerHTML = items.map(item => `<button class="career-item ${item.id === state.careerId ? 'active' : ''}" data-career="${item.id}"><span>${esc(item.name)}</span><small>${esc(item.group.replace('系', ''))}</small></button>`).join('');
    $('careerCount').textContent = `怀旧服职业 ${items.length} / ${data.professions.length}`;
    $('careerList').querySelectorAll('button').forEach(button => button.addEventListener('click', () => selectCareer(button.dataset.career)));
    $('emptyState').hidden = items.length > 0;
  }

  function selectCareer(id) {
    state.careerId = id;
    state.skillCategory = '';
    state.selectedSkill = '';
    history.replaceState(null, '', `#${id}`);
    renderSidebar();
    renderCareer();
  }

  function renderRanks(item) {
    $('rankTabs').innerHTML = ranks.map((rank, index) => `<button class="rank-tab ${index === state.rank ? 'active' : ''}" data-rank="${index}">${rank}<span>${esc(rankTitle(item, index))}</span></button>`).join('');
    $('rankTabs').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { state.rank = Number(button.dataset.rank); renderCareer(); }));
  }

  function renderRating(item) {
    const entries = Object.entries(item.rating);
    $('ratingGrid').innerHTML = entries.length ? entries.map(([label, score]) => `<div class="rating"><span>${esc(label)}</span><div class="stars">${'★'.repeat(score)}${'☆'.repeat(Math.max(0, 5 - score))}</div></div>`).join('') : '';
  }

  function renderDescription(item) {
    const raw = String(item.description || '').replace(/【职业介绍】/g, '').trim();
    const beforeRating = raw.split(/【实用度】/)[0].trim();
    const intro = beforeRating.split(/(?=得意技[：:]|技能声望[：:]|备注[：:])/)[0].trim();
    const extract = (label, next) => {
      const match = beforeRating.match(new RegExp(`${label}[：:]([\\s\\S]*?)(?=${next}|$)`));
      return match?.[1]?.trim() || '';
    };
    const specialty = extract('得意技', '技能声望[：:]|备注[：:]');
    const reputation = extract('技能声望', '备注[：:]');
    const note = extract('备注', '(?!)');
    const facts = [specialty && ['得意技能', specialty], reputation && ['技能声望', reputation], note && ['职业备注', note]].filter(Boolean);
    const introHtml = intro ? intro.split(/\n{2,}/).filter(Boolean).map(paragraph => `<p>${esc(paragraph)}</p>`).join('') : '<p class="empty-copy">资料页暂无单独职业评价；已保留就职、技能与装备上限资料。</p>';
    $('careerDescription').innerHTML = `<div class="career-copy"><h3>职业定位</h3>${introHtml}</div>${facts.length ? `<div class="career-facts">${facts.map(([label, value]) => `<div class="career-fact"><span>${esc(label)}</span><p>${esc(value)}</p></div>`).join('')}</div>` : ''}`;
  }

  function renderRoute(item) {
    const steps = [{ rank: '见习', description: item.employment?.description || '资料页暂未提供就职说明', links: item.employment?.links || [] }, ...ranks.slice(1).map(rank => item.advancements.find(step => step.rank === rank) || { rank, description: '资料页暂未提供晋阶说明', links: [] })];
    const step = steps[state.rank];
    const action = state.rank ? '晋阶' : '就职';
    $('routeHeading').textContent = `${step.rank} · ${rankTitle(item, state.rank)} ${action}要求`;
    $('careerRoute').innerHTML = `<article class="route-step active"><div class="route-head"><div class="route-dot">${state.rank}</div><div><span>${esc(step.rank)}</span><b>${esc(rankTitle(item, state.rank))}</b></div></div><p>${esc(step.description)}</p>${step.links[0] ? `<a href="${esc(step.links[0].url)}" target="_blank" rel="noreferrer">查看${action}任务 ↗</a>` : ''}</article>`;
  }

  function renderEquipment(item) {
    const available = item.equipment.filter(equipment => equipment.caps[state.rank] > 0).sort((a, b) => b.caps[state.rank] - a.caps[state.rank] || a.name.localeCompare(b.name, 'zh-CN'));
    $('rankEquipName').textContent = ranks[state.rank];
    $('equipmentList').innerHTML = available.length ? available.map(equipment => `<div class="equipment-item"><b>${esc(equipment.name)}</b><span class="level-pill"><small>最高可装备</small><strong>Lv.${equipment.caps[state.rank]}</strong></span></div>`).join('') : '<div class="no-results">该阶段没有可装备类型</div>';
  }

  function skillDetail(skill) { return data.skillDetails[normalize(skill.name)] || data.skillDetails[skill.name]; }

  function renderSkillCategories(item) {
    const categories = [...new Set(item.skills.filter(skill => skill.caps[state.rank] > 0).map(skill => skill.category))];
    if (!categories.includes(state.skillCategory)) state.skillCategory = categories[0] || '';
    $('skillCategory').innerHTML = categories.map(category => `<option ${category === state.skillCategory ? 'selected' : ''}>${esc(category)}</option>`).join('');
  }

  function renderSkills(item) {
    renderSkillCategories(item);
    const allAtRank = item.skills.filter(skill => skill.caps[state.rank] > 0);
    const categorySkills = allAtRank.filter(skill => skill.category === state.skillCategory).sort((a, b) => b.caps[state.rank] - a.caps[state.rank] || a.name.localeCompare(b.name, 'zh-CN'));
    if (!categorySkills.some(skill => skill.name === state.selectedSkill)) state.selectedSkill = categorySkills[0]?.name || '';
    $('rankSkillName').textContent = ranks[state.rank];
    $('skillSelect').innerHTML = categorySkills.length ? categorySkills.map(skill => `<option value="${esc(skill.name)}" ${skill.name === state.selectedSkill ? 'selected' : ''}>${esc(skill.name)} · 最高 Lv.${skill.caps[state.rank]}</option>`).join('') : '<option value="">该分类暂无技能</option>';
    $('skillSelect').disabled = !categorySkills.length;
    $('skillSummary').textContent = `${rankTitle(item, state.rank)} · ${state.skillCategory || '暂无分类'}共 ${categorySkills.length} 项技能 · 当前职业全部可学技能 ${allAtRank.length} 项`;
    renderSkillDetail(item);
  }

  function renderSkillDetail(item) {
    const skill = item.skills.find(entry => entry.name === state.selectedSkill && entry.caps[state.rank] > 0);
    if (!skill) { $('skillDetail').hidden = true; return; }
    $('skillDetail').hidden = false;
    const detail = skillDetail(skill);
    $('skillDetailTitle').textContent = `${skill.name} · 最高 Lv.${skill.caps[state.rank]}`;
    const meta = [skill.category, detail?.location && `地点：${detail.location}`, detail?.npc && `教导人：${detail.npc}`, detail?.cost && `费用：${detail.cost}G`, detail?.slots && `技能格：${detail.slots}`].filter(Boolean);
    $('skillDetailMeta').innerHTML = meta.map(value => `<span>${esc(value)}</span>`).join('');
    $('skillDetailMethod').textContent = detail?.method || '资料页暂未匹配到独立技能详情；可通过职业原始资料继续核对。';
    $('skillDetailCaps').innerHTML = ranks.map((rank, index) => `<div class="cap-cell ${index === state.rank ? 'active' : ''}">${rank}<b>${skill.caps[index] ? `Lv.${skill.caps[index]}` : '不可学'}</b></div>`).join('');
    $('skillDetailSource').hidden = !detail?.url;
    if (detail?.url) $('skillDetailSource').href = detail.url;
  }

  function showSkill(name) {
    state.selectedSkill = name;
    renderSkillDetail(career());
  }

  function renderCareer() {
    const item = career();
    if (!item) return;
    $('careerName').textContent = item.name;
    $('careerGroup').textContent = `${item.group} · 怀旧服`;
    $('careerTitles').innerHTML = item.titles.map((title, index) => `<span>${ranks[index]} · ${esc(title.replace(/\s+/g, ''))}</span>`).join('');
    $('sourceLink').href = item.url;
    renderRanks(item); renderRating(item); renderDescription(item); renderRoute(item); renderEquipment(item); renderSkills(item);
  }

  $('careerSearch').addEventListener('input', event => { state.careerQuery = event.target.value; renderSidebar(); });
  $('skillCategory').addEventListener('change', event => { state.skillCategory = event.target.value; state.selectedSkill = ''; renderSkills(career()); });
  $('skillSelect').addEventListener('change', event => showSkill(event.target.value));
  if (!data.professions.some(item => item.id === state.careerId)) state.careerId = data.professions[0]?.id;
  const launchCareer = career();
  const launchSkill = launchCareer?.skills.find(skill => normalize(skill.name) === normalize(requestedSkill) && skill.caps[state.rank] > 0);
  if (launchSkill) { state.skillCategory = launchSkill.category; state.selectedSkill = launchSkill.name; }
  renderFilters(); renderSidebar(); renderCareer();
  if (launchSkill) requestAnimationFrame(() => $('skillDetail').scrollIntoView({ behavior: 'smooth', block: 'start' }));
})();
