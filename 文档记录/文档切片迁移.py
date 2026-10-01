from pathlib import Path
import re, hashlib, json, shutil, os

ROOT = Path(r'F:\BaiduSyncdisk')
ARCHIVE = ROOT / '文档原文归档_需用户明确授权' / '2026-10-01'
SCOPES = ['总目录', '魔力档案馆', '魔力服练级查询', '魔力任务检索', '魔力职业', '魔力装备档案', '魔力地图']
EXCLUDED = {'工作备忘.md', '重要信息.md', 'id_ed25519', 'node_modules', '.cache', '.obsidian', '.git', '文档原文归档_需用户明确授权'}
manifest = []

def write(p, s):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s, encoding='utf-8')

def local_links(text, source, dest):
    def fix(m):
        value = m.group(2)
        if re.match(r'^[a-zA-Z][\w+.-]*:', value) or value.startswith(('#', '/', '\\')):
            return m.group(0)
        value = value.strip('<>')
        path, sep, anchor = value.partition('#')
        target = (source.parent / path).resolve()
        relative = os.path.relpath(target, dest.parent).replace('\\', '/')
        return '[' + m.group(1) + '](<' + relative + (sep + anchor if sep else '') + '>)'
    return re.sub(r'\[([^\]]*)\]\(([^)]+)\)', fix, text)

for scope in SCOPES:
    base = ROOT if scope == '总目录' else ROOT / scope
    if not base.exists():
        continue
    records = base / '文档记录'
    records.mkdir(exist_ok=True)
    index = records / '问题目录索引.md'
    old_index = index.read_text(encoding='utf-8-sig') if index.exists() else '# ' + scope + '问题目录索引\n\n此前无问题索引及历史记录。\n'
    sources = []
    for current, dirs, files in os.walk(base):
        dirs[:] = [d for d in dirs if d not in EXCLUDED and d != '切片' and (scope != '总目录' or Path(current) != ROOT or d == '文档记录')]
        for name in files:
            if name in EXCLUDED or name in {'AGENTS.md', '问题目录索引.md', '2026-10-01-文档切片与授权归档.md'} or not name.endswith('.md'):
                continue
            sources.append(Path(current) / name)
    entries = []
    for number, source in enumerate(sorted(sources), 1):
        raw = source.read_bytes()
        original = raw.decode('utf-8-sig')
        relative = source.relative_to(ROOT)
        destination = ARCHIVE / relative
        if destination.exists():
            raise RuntimeError('归档目标已存在，停止以避免覆盖: ' + str(destination))
        # 按二级标题切分，围栏代码块内的标题不作为边界。
        lines = original.splitlines(keepends=True)
        groups, current, fenced = [], [], False
        for line in lines:
            if re.match(r'^\s*(```|~~~)', line):
                fenced = not fenced
            if not fenced and re.match(r'^##\s+', line) and current:
                groups.append(''.join(current)); current = []
            current.append(line)
        if current:
            groups.append(''.join(current))
        assert ''.join(groups) == original
        folder = records / '切片' / f'{number:02d}-{source.stem}'
        links = []
        for part, content in enumerate(groups, 1):
            heading = re.search(r'^#{1,6}\s+(.+)$', content, re.M)
            title = heading.group(1).strip() if heading else '开篇与元信息'
            piece = folder / f'{part:03d}.md'
            header = f'<!-- DOC-SLICE 来源={relative.as_posix()} 分片={part}/{len(groups)} 整理日期=2026-10-01 -->\n> 本片保留历史原文；历史完成声明不代表当前事实，须核对后续更正和代码。仅按当前问题读取相关分片。\n\n'
            write(piece, header + local_links(content, source, piece))
            links.append(f'- [{part:03d} {title}](<{os.path.relpath(piece, source.parent).replace(chr(92), "/")}>)')
        wrapper = f'# {source.stem}：分片入口\n\n整理日期：2026-10-01。原文已迁至独立授权归档区；默认仅按问题读取下列相关分片。\n原相对位置：`{relative.as_posix()}`。历史正文、问题标识、迭代与待办完整保留在分片中。\n\n## 问题起因\n避免整份历史文档被默认读取及旧结论误导。\n\n## 问题原因分析\n原文包含多个章节或历史阶段；本轮仅整理文档，未复核游戏事实或功能状态。\n\n## 问题解决方案\n按二级标题无损切片；索引继续使用原入口，相关问题继续在对应分片追加迭代，并同步此入口和问题索引。\n\n## 分片目录\n' + '\n'.join(links) + '\n'
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(source), str(destination))
        write(source, wrapper)
        manifest.append({'source': relative.as_posix(), 'archive': destination.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw), 'slices': len(groups)})
        entries.append(f'- [{source.stem}](<{os.path.relpath(source, records).replace(chr(92), "/")}>)：{len(groups)}片；历史有效性未复核。')
    old_index = old_index.replace('原文档保留在原位置，本目录为集中整理副本。后续问题重新判定以这些原文证据为起点。', '原文已移至独立授权归档区；原路径仅为分片入口。后续按相关分片接续，不默认读取归档。')
    report = records / '2026-10-01-文档切片与授权归档.md'
    write(report, f'# 文档切片与授权归档\n\n问题标识：DOC-SLICE-{scope}\n范围：{scope}\n创建及最近更新：2026-10-01，第1轮\n状态：文档迁移完成；静态验证见根目录记录。\n下一步：后续仅按问题读取索引及相关分片，继续维护原问题标识；归档读取必须获得用户明确要求。\n\n## 问题起因\n用户要求每个工具目录的文档切片，原文另存，避免默认读取；归档只有用户明确要求时才能读。\n\n## 问题原因分析\n本轮依据：根目录AGENTS.md、根目录问题索引及ROOT-DOC-001记录、本范围原有索引与待切片原文；练级工具另读其AGENTS.md。任务工具已有分片与原文并存，其他工具存在整份续作记录。无原记录的范围明确无历史。本轮不验证历史游戏事实或功能完成声明。\n\n## 问题解决方案\n按二级标题切片并保留全部正文，原位置改成短入口；原字节内容移入独立授权归档区，迁移前登记SHA-256和字节数。AGENTS规则与默认读取入口保留活动状态。当前记录范围新增{len(sources)}个入口。根目录维护跨工具清单及验证结果。\n\n### 2026-10-01 第1轮\n活动入口：\n' + ('\n'.join(entries) if entries else '- 本范围无待切片Markdown正文；建立索引与本记录，不推定有历史。') + '\n')
    write(index, old_index + '\n\n## 文档分片入口（2026-10-01，第1轮）\n\n原有问题标识和未完成状态继续有效。先定位入口，再仅读取相关分片；原文归档禁止默认读取。\n\n' + '\n'.join(entries) + f'\n\n- DOC-SLICE-{scope}：[文档切片与授权归档](2026-10-01-文档切片与授权归档.md)；已迁移，2026-10-01，第1轮。\n')

write(ROOT / '文档记录' / '文档归档清单.json', json.dumps(manifest, ensure_ascii=False, indent=2))
print(json.dumps({'sources': len(manifest), 'slices': sum(x['slices'] for x in manifest), 'scopes': SCOPES}, ensure_ascii=False))
