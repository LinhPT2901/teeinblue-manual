#!/usr/bin/env python3
"""Ước lượng thời gian QA theo issue và theo bước từ transcript Claude Code (baseline khi chưa có timeline).

  python3 scripts/baseline_from_transcripts.py [--since 2026-09-01] [--until 2026-11-01] [--out runs/_baseline.md]

Cách tính (giữ nguyên giữa các lần chạy để so sánh được):
- Issue hiện tại = key TIB-xxxx (>= 5000) xuất hiện nhiều nhất trong chữ NGƯỜI DÙNG gõ, hoặc trong prompt
  giao Agent / args của Skill. Bỏ <system-reminder> (memory nhắc nhiều key) và bỏ tool_result.
- Subagent: issue lấy từ prompt giao việc; bước lấy theo agentType trong *.meta.json.
- Bước = theo tool gọi gần nhất của issue đó (xem PHASE_RULES). Chưa khớp → "khác".
- Thời gian làm = tổng khoảng giữa 2 sự kiện liên tiếp <= 10 phút. Khoảng 10 phút–4 giờ trong cùng phiên
  khi issue đang mở = "lặng trong phiên" (chờ người / chờ PO-Dev / nghỉ — không phân biệt được).
- Thời gian của parent và subagent được hợp (union) nên không đếm trùng khi agent chạy nền; khoảng lặng trùng lúc
  agent chạy nền không tính là lặng.
"""
import argparse, collections, glob, json, os, re, statistics
from datetime import datetime, timedelta

PROJ = os.path.expanduser('~/.claude/projects/-Users-linhsmac-Documents-work-teeinblue-manual')
KEY = re.compile(r'\bTIB-(\d{4})\b')
REMINDER = re.compile(r'<system-reminder>.*?</system-reminder>', re.S)
CAP, IDLE_MAX = timedelta(minutes=10), timedelta(hours=4)
PHASES = ['analysis', 'testcase', 'data', 'execute', 'khác']
PHASE_RULES = [  # (điều kiện trên tên tool / skill / agent, bước)
    (lambda n, x: 'getJiraIssue' in n or x == 'qa-requirement-analysis' or x == 'create-ccr', 'analysis'),
    (lambda n, x: n.endswith(('create_test_cases', 'create_test_case', 'create_task')) or x == 'gen-testcase', 'testcase'),
    (lambda n, x: x in ('create-test-data', 'tib-test-data') or n.startswith(('mcp__postman__', 'mcp__shopify__'))
        or re.match(r'mcp__staging_tib(_victim)?__(create|attach|upload|confirm|bulk|publish|update|clone|duplicate)', n), 'data'),
    (lambda n, x: x == 'tib-execute-testcase' or n.endswith('update_test_case') or n.startswith('mcp__playwright'), 'execute'),
]
AGENT_PHASE = {'tib-test-data': 'data', 'tib-execute-testcase': 'execute', 'tib-genai-timing': 'execute'}


def ts(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00')).astimezone()


def key_of(text):
    c = collections.Counter(k for k in KEY.findall(text) if int(k) >= 5000)
    return 'TIB-' + c.most_common(1)[0][0] if c else None


def phase_of(name, extra):
    for cond, ph in PHASE_RULES:
        if cond(name, extra or ''):
            return ph
    return None


def user_text(content):
    if isinstance(content, str):
        return REMINDER.sub('', content)
    out = []
    for b in content or []:
        if isinstance(b, dict) and b.get('type') == 'text':
            out.append(REMINDER.sub('', b.get('text', '')))
    return '\n'.join(out)


def events(path):
    for line in open(path, errors='ignore'):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get('timestamp'):
            yield e


def scan_main(path, since, until, work, idle, sess):
    cur, prev, phase = None, None, {}
    for e in events(path):
        t = ts(e['timestamp'])
        if not (since <= t < until):
            prev = None
            continue
        msg = e.get('message') or {}
        new_key, new_phase = None, None
        if e.get('type') == 'user' and not e.get('isMeta'):
            new_key = key_of(user_text(msg.get('content')))
        elif e.get('type') == 'assistant':
            for b in msg.get('content') or []:
                if not isinstance(b, dict) or b.get('type') != 'tool_use':
                    continue
                inp = b.get('input') or {}
                extra = inp.get('subagent_type') or inp.get('skill')
                if b['name'] in ('Agent', 'Task', 'Skill'):
                    new_key = key_of(json.dumps(inp, ensure_ascii=False)) or new_key
                new_phase = phase_of(b['name'], extra) or new_phase
        if prev and cur:
            d = t - prev
            if timedelta(0) < d <= CAP:
                work[cur].append((prev, t, phase.get(cur, 'khác')))
            elif CAP < d <= IDLE_MAX:
                idle[cur].append((prev, t))
        if new_key:
            cur = new_key
        if cur and new_phase:
            phase[cur] = new_phase
        if cur:
            sess[cur].add(os.path.basename(os.path.dirname(path)) if 'subagents' in path else os.path.basename(path))
        prev = t


def scan_sub(path, since, until, work, sess):
    meta = {}
    try:
        meta = json.load(open(path.replace('.jsonl', '.meta.json')))
    except (OSError, ValueError):
        pass
    evs = [e for e in events(path)]
    if not evs:
        return
    first = next((e for e in evs if e.get('type') == 'user'), None)
    k = key_of(user_text((first.get('message') or {}).get('content'))) if first else None
    if not k:
        return
    ph = AGENT_PHASE.get(meta.get('agentType'), 'khác')
    prev = None
    for e in evs:
        t = ts(e['timestamp'])
        if not (since <= t < until):
            prev = None
            continue
        if prev and timedelta(0) < t - prev <= CAP:
            work[k].append((prev, t, ph))
        prev = t
    sess[k].add(os.path.basename(os.path.dirname(os.path.dirname(path))))


def union_secs(iv):
    tot, end = 0.0, None
    for s, e in sorted(iv):
        if end is None or s > end:
            tot += (e - s).total_seconds(); end = e
        elif e > end:
            tot += (e - end).total_seconds(); end = e
    return tot


def fmt(sec):
    m = round(sec / 60)
    return f'{m // 60}h{m % 60:02d}' if m >= 60 else f'{m}m'


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--since', default='2026-01-01'); p.add_argument('--until', default='2100-01-01')
    p.add_argument('--min-minutes', type=int, default=15); p.add_argument('--out')
    a = p.parse_args()
    since, until = datetime.fromisoformat(a.since).astimezone(), datetime.fromisoformat(a.until).astimezone()
    work, idle, sess = collections.defaultdict(list), collections.defaultdict(list), collections.defaultdict(set)
    mains = glob.glob(f'{PROJ}/*.jsonl'); subs = glob.glob(f'{PROJ}/*/subagents/*.jsonl')
    for f in mains:
        scan_main(f, since, until, work, idle, sess)
    for f in subs:
        scan_sub(f, since, until, work, sess)

    rows = []
    for k, iv in work.items():
        total = union_secs([(s, e) for s, e, _ in iv])
        if total < a.min_minutes * 60:
            continue
        per = {ph: union_secs([(s, e) for s, e, x in iv if x == ph]) for ph in PHASES}
        first, last = min(s for s, _, _ in iv), max(e for _, e, _ in iv)
        busy = [(s, e) for s, e, _ in iv]
        idle_s = max(0.0, union_secs(idle[k] + busy) - total)  # lặng thật = phần lặng không trùng thời gian làm (agent chạy nền)
        rows.append({'key': k, 'total': total, 'per': per, 'idle': idle_s, 'sess': len(sess[k]),
                     'first': first, 'last': last, 'days': len({s.date() for s, _, _ in iv})})
    rows.sort(key=lambda r: r['first'])

    L = [f'# Baseline thời gian QA theo issue — ước lượng từ transcript',
         '', f'Tạo: {datetime.now():%Y-%m-%d %H:%M} · Khoảng: {a.since} → {a.until} · {len(mains)} phiên chính, {len(subs)} subagent · '
         f'{len(rows)} issue có ≥ {a.min_minutes} phút làm việc', '',
         'Cách tính: xem docstring `scripts/baseline_from_transcripts.py`. Chạy lại đúng lệnh này cho khoảng thời gian mới để so sánh cùng thước đo; '
         'số đo chính xác hơn của các issue mới lấy từ `python3 scripts/issue_timing.py report`.', '',
         '## Tổng hợp', '', '| Chỉ số | Trung bình | Trung vị | P75 | Số issue có |', '|---|---|---|---|---|']

    def stat(label, vals):
        v = sorted(x for x in vals if x > 0)
        if v:
            p75 = v[min(len(v) - 1, int(round(0.75 * (len(v) - 1))))]
            L.append(f'| {label} | {fmt(statistics.mean(v))} | {fmt(statistics.median(v))} | {fmt(p75)} | {len(v)} |')
    stat('**Thời gian làm / issue**', [r['total'] for r in rows])
    for ph in PHASES:
        stat(f'— {ph}', [r['per'][ph] for r in rows])
    stat('Lặng trong phiên (chờ / nghỉ, không phân biệt)', [r['idle'] for r in rows])
    for label, f in (('Số phiên / issue', 'sess'), ('Số ngày có làm / issue', 'days')):
        v = [r[f] for r in rows]
        if v:
            L.append(f'| {label} | {statistics.mean(v):.1f} | {statistics.median(v):.0f} | — | {len(v)} |')
    L += ['', '## Từng issue', '',
          '| Issue | Làm | analysis | testcase | data | execute | khác | Lặng trong phiên | Phiên | Ngày có làm | Đầu → cuối |',
          '|---|---|---|---|---|---|---|---|---|---|---|']
    for r in rows:
        L.append(f'| {r["key"]} | {fmt(r["total"])} | ' + ' | '.join(fmt(r['per'][ph]) if r['per'][ph] else '—' for ph in PHASES)
                 + f' | {fmt(r["idle"]) if r["idle"] else "—"} | {r["sess"]} | {r["days"]} | {r["first"]:%m-%d} → {r["last"]:%m-%d} |')
    L += ['', '## Giới hạn của baseline này', '',
          '- Gán issue theo key người dùng gõ / prompt giao agent: phiên làm nhiều issue xen kẽ mà không nhắc key sẽ bị gán vào issue nhắc gần nhất.',
          '- Bước suy theo tool đã gọi; đoạn chỉ đọc/suy nghĩ giữa các tool tính vào bước gần nhất. Phân tích làm thủ công (đọc Jira trên web) không thấy.',
          '- "Lặng trong phiên" gộp cả chờ PO/Dev, chờ người dùng và nghỉ; khoảng > 4 giờ (qua đêm) bị bỏ.',
          '- Thời gian người dùng tự test tay ngoài Claude không có trong transcript.',
          '- Thời gian làm có thể thấp hơn thật khi agent chạy một lệnh dài > 10 phút không có sự kiện xen giữa.']
    out = '\n'.join(L) + '\n'
    if a.out:
        os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
        open(a.out, 'w').write(out)
        print(f'→ {a.out}')
    print(out)


if __name__ == '__main__':
    main()
