(() => {
  const data = window.CAREER_DATA;
  const careerSelect = document.getElementById('careerSelect');
  const rankSelect = document.getElementById('rankSelect');
  const skillSelect = document.getElementById('skillSelect');
  const levelInput = document.getElementById('levelInput');
  const careerJump = document.getElementById('careerJump');
  const gearJump = document.getElementById('gearJump');
  const trainingJump = document.getElementById('trainingJump');
  const status = document.getElementById('dataStatus');
  const note = document.getElementById('selectionNote');
  const normalize = value => String(value || '').replace(/[\s（）()·]/g, '').toLowerCase();

  if (!data?.professions?.length) {
    status.textContent = '职业资料读取失败';
    note.textContent = '仍可从下方工具卡打开各个工具。';
    return;
  }

  const groups = {};
  data.professions.forEach(item => (groups[item.group] ||= []).push(item));
  careerSelect.innerHTML = '';
  Object.entries(groups).forEach(([group, professions]) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group;
    professions.forEach(item => optgroup.append(new Option(item.name, item.id)));
    careerSelect.append(optgroup);
  });
  rankSelect.innerHTML = data.ranks.map((rank, index) => `<option value="${index}" ${index === data.ranks.length - 1 ? 'selected' : ''}>${rank}</option>`).join('');
  careerSelect.disabled = false;
  rankSelect.disabled = false;
  status.textContent = `已载入 ${data.professions.length} 个职业`;
  document.getElementById('careerCount').textContent = `${data.professions.length} 个职业 · 来源自动同步`;

  function selectedCareer() {
    return data.professions.find(item => item.id === careerSelect.value) || data.professions[0];
  }

  function availableSkills(item, rank) {
    const seen = new Set();
    return item.skills.filter(skill => skill.caps?.[rank] > 0 && !seen.has(normalize(skill.name)) && seen.add(normalize(skill.name)));
  }

  function renderSkills() {
    const item = selectedCareer();
    const rank = Number(rankSelect.value);
    const previous = skillSelect.value;
    const skills = availableSkills(item, rank);
    const categories = {};
    skills.forEach(skill => (categories[skill.category || '其他技能'] ||= []).push(skill));
    skillSelect.innerHTML = '<option value="">不指定技能</option>';
    Object.entries(categories).forEach(([category, entries]) => {
      const group = document.createElement('optgroup');
      group.label = category;
      entries.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')).forEach(skill => group.append(new Option(`${skill.name} · 最高 Lv.${skill.caps[rank]}`, skill.name)));
      skillSelect.append(group);
    });
    skillSelect.disabled = !skills.length;
    if (skills.some(skill => skill.name === previous)) skillSelect.value = previous;
    note.textContent = `${item.name} · ${data.ranks[rank]}可学习 ${skills.length} 项技能${skillSelect.value ? ` · 已选 ${skillSelect.value}` : ''}`;
    updateLinks();
  }

  function updateLinks() {
    const item = selectedCareer();
    const rank = Number(rankSelect.value);
    const skill = skillSelect.value;
    const level = Math.min(120, Math.max(1, Math.floor(Number(levelInput.value) || 1)));
    levelInput.value = level;
    const careerParams = new URLSearchParams({ career: item.id, rank: String(rank) });
    if (skill) careerParams.set('skill', skill);
    careerJump.href = `魔力职业/index.html#${careerParams}`;
    gearJump.href = `魔力装备档案/index.html#${new URLSearchParams({ profession: item.name, rank: String(rank) })}`;
    trainingJump.href = `魔力服练级查询/index.html#${new URLSearchParams({ level: String(level), mode: 'skill' })}`;
    [careerJump, gearJump, trainingJump].forEach(link => link.classList.remove('disabled'));
    note.textContent = `${item.name} · ${data.ranks[rank]}可学习 ${availableSkills(item, rank).length} 项技能${skill ? ` · 已选 ${skill}` : ''}`;
  }

  careerSelect.addEventListener('change', renderSkills);
  rankSelect.addEventListener('change', renderSkills);
  skillSelect.addEventListener('change', updateLinks);
  levelInput.addEventListener('change', updateLinks);
  renderSkills();
})();
