import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Alert } from '../components/ds/index.js';
import { Icon } from '../components/Icon.jsx';
import { api } from '../api.js';

/* KpiScreen — ตัวชี้วัดคุณภาพของงานเทคนิคการแพทย์

   ข้อมูลไม่ได้เก็บในระบบนี้ แต่อยู่ที่ระบบทะเบียนเอกสารกลาง (Masterlist)
   ที่เดียว เซิร์ฟเวอร์ของเราเรียกผ่านเครือข่ายภายในให้ — แก้ที่ระบบไหนก็
   เห็นตรงกันทั้งสองฝั่งทันที ไม่ต้องคัดลอกข้อมูลไปมาให้เพี้ยน */

const PASS = 'var(--green-600, #2E9E5B)';
const FAIL = 'var(--red-600)';
const NODATA = 'var(--slate-300)';

function meets(value, op, target) {
  if (value === null || value === undefined || target === null || target === undefined) return null;
  switch (op) {
    case '>=': return value >= target;
    case '>': return value > target;
    case '<=': return value <= target;
    case '<': return value < target;
    case '=': return Math.abs(value - target) < 1e-9;
    default: return null;
  }
}

function fmt(v, kind) {
  if (v === null || v === undefined) return '—';
  const r = Math.round(v * 100) / 100;
  if (kind === 'PERCENT') return Number.isInteger(r) ? `${r}%` : `${r.toFixed(2)}%`;
  if (kind === 'DURATION') return `${r} นาที`;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

/* กราฟแนวโน้มทั้งปี พร้อมเส้นเป้าหมายและแรเงาฝั่งที่ผ่านเกณฑ์
   วาดด้วย SVG เอง — ข้อมูลแค่ 12 จุดต่อเส้น ไม่คุ้มที่จะลงไลบรารีกราฟทั้งก้อน
   (ให้ตรงกับที่ระบบทะเบียนเอกสารกลางใช้ จะได้อ่านเหมือนกันทั้งสองระบบ) */
function Sparkline({ ind, months }) {
  const w = 620, h = 96, pad = 8;
  const pts = ind.values.map((v, i) => ({ v, i })).filter((p) => p.v !== null && p.v !== undefined);
  if (!pts.length) return null;

  const all = pts.map((p) => p.v);
  if (ind.targetValue !== null && ind.targetValue !== undefined) all.push(ind.targetValue);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi === lo) { hi = lo + 1; lo -= 1; }
  const span = hi - lo;
  lo -= span * 0.12; hi += span * 0.12;

  const x = (i) => pad + (i / (months.length - 1)) * (w - pad * 2);
  const y = (v) => h - pad - ((v - lo) / (hi - lo)) * (h - pad * 2);
  const d = pts.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const ty = (ind.targetValue !== null && ind.targetValue !== undefined) ? y(ind.targetValue) : null;
  // ตัวชี้วัดที่ "ยิ่งมากยิ่งดี" ให้แรเงาด้านบนเส้นเป้า ที่เหลือแรเงาด้านล่าง
  const good = ind.targetOp === '>=' || ind.targetOp === '>' || ind.targetOp === '=' || !ind.targetOp;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img"
      aria-label={`แนวโน้ม ${ind.name} ตลอดปีงบประมาณ`} style={{ display: 'block', overflow: 'visible' }}>
      {ty !== null && (
        <>
          <rect x={pad} y={good ? pad : ty} width={w - pad * 2}
            height={Math.max(0, good ? ty - pad : h - pad - ty)} fill={PASS} opacity="0.07" />
          <line x1={pad} y1={ty} x2={w - pad} y2={ty} stroke={PASS} strokeWidth="1" strokeDasharray="4 4" opacity="0.8" />
        </>
      )}
      <path d={d} fill="none" stroke="var(--text-primary)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p) => {
        const ok = meets(p.v, ind.targetOp, ind.targetValue);
        return <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r="3.2"
          fill={ok === null ? 'var(--slate-500)' : ok ? PASS : FAIL}
          stroke="var(--surface-card)" strokeWidth="1.5" />;
      })}
    </svg>
  );
}

/* แถวหนึ่ง = ชื่อตัวชี้วัด | 12 เดือน | เป้าหมาย
   คอลัมน์เดือนต้องกว้างพอให้ป้ายอ่านออก จอแคบให้เลื่อนแนวนอนในกรอบตัวเอง */
const ROW = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.3fr) minmax(360px, 1fr) minmax(72px, auto)',
  gap: 16,
  alignItems: 'center',
};
const MONTHS_ROW = {
  display: 'grid',
  gridTemplateColumns: 'repeat(12, 1fr)',
  gap: 3,
  alignItems: 'center',
};

/* รายงานตัวชี้วัดฉบับเต็ม (ไฟล์แยก)

   ระบบนี้แนบเฉพาะของงานตัวเองกับสรุปรวมของฝ่าย ส่วนของงานอื่นอยู่ที่ระบบทะเบียนกลาง
   เปิดเป็นแท็บใหม่เพราะเป็นหน้าเต็มที่มีกราฟและตารางของตัวเอง ยัดใส่กรอบแล้วอ่านไม่ออก */
/* ปีระบุที่การ์ดแต่ละใบ ไม่ใช่ที่หัวข้อ — แต่ละไฟล์ครอบคลุมช่วงปีไม่เท่ากัน
   (แดชบอร์ดความพึงพอใจมีทั้ง 2568 และ 2569) ถ้าเขียนปีไว้ที่หัวข้อเดียวจะผิดกับบางใบ */
const REPORTS = [
  { name: 'summary-2569', code: 'สรุป', title: 'สรุปแผนการเก็บตัวชี้วัด', note: 'ภาพรวมทั้งฝ่ายสหเวชศาสตร์ — แผนการเก็บและผลรวมทุกงาน', year: 'ปีงบ 2569' },
  { name: 'medtech-2569', code: 'LAB', title: 'งานห้องปฏิบัติการเทคนิคการแพทย์', note: 'แดชบอร์ดตัวชี้วัดคุณภาพรายเดือนของงานเรา', year: 'ปีงบ 2569' },
  // ความพึงพอใจไม่ใช่ตัวชี้วัด แต่เป็นข้อมูลป้อนกลับจากผู้ใช้บริการ (ISO 15189 ข้อ 8.6)
  // อยู่กลุ่มเดียวกันได้แต่ใช้ป้ายคนละสี ไม่ให้เข้าใจว่าเป็นตัวชี้วัดอีกตัว
  { name: 'satisfaction-2569', code: 'พึงพอใจ', title: 'ความพึงพอใจผู้ใช้บริการ', note: 'แดชบอร์ดความพึงพอใจต่อห้องปฏิบัติการ', year: 'ปีงบ 2568–2569' },
];

function ReportCards() {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const open = async (name) => {
    setBusy(name); setErr('');
    try { await api.openKpiReport(name); }
    catch (e) { setErr(e.message || 'เปิดรายงานไม่สำเร็จ'); }
    finally { setBusy(''); }
  };

  return (
    <Card padding="md" header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="FileText" size={16} color="var(--text-secondary)" /> รายงานและแดชบอร์ดฉบับเต็ม</span>}>
      <p style={{ font: 'var(--text-xs)/1.7 var(--font-body)', color: 'var(--text-tertiary)', margin: '0 0 16px' }}>
        เปิดในแท็บใหม่ — รายงานเหล่านี้เป็นไฟล์ที่จัดทำไว้ ไม่ได้ดึงตัวเลขสดจากตารางด้านล่าง
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {REPORTS.map((r) => (
          <button
            key={r.name}
            type="button"
            onClick={() => open(r.name)}
            disabled={busy === r.name}
            style={{
              textAlign: 'left', cursor: busy === r.name ? 'progress' : 'pointer',
              padding: '15px 16px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)', background: 'var(--surface-card)',
              transition: 'border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-300)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <span style={{
                font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)',
                color: r.code === 'พึงพอใจ' ? 'var(--amber-700)' : 'var(--brand-700)',
                padding: '4px 8px', borderRadius: 'var(--radius-xs)',
                border: '1px solid ' + (r.code === 'พึงพอใจ' ? 'var(--amber-600)' : 'var(--border-subtle)'),
              }}>{r.code}</span>
              <span style={{ font: 'var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>{r.year}</span>
              <span style={{ marginLeft: 'auto', font: 'var(--text-xs)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>
                {busy === r.name ? 'กำลังเปิด…' : '↗'}
              </span>
            </div>
            <div style={{ font: 'var(--fw-semibold) var(--text-sm)/1.4 var(--font-body)', color: 'var(--text-primary)', marginBottom: 5 }}>{r.title}</div>
            <div style={{ font: 'var(--text-xs)/1.6 var(--font-body)', color: 'var(--text-secondary)' }}>{r.note}</div>
          </button>
        ))}
      </div>
      {err && <div style={{ marginTop: 12 }}><Alert tone="danger">{err}</Alert></div>}
    </Card>
  );
}

export function KpiScreen() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [open, setOpen] = useState(null); // แถวที่กางกราฟอยู่

  const load = async (year) => {
    setLoading(true);
    setError('');
    try {
      const d = await api.getKpi(year);
      setData(d);
      // เปิดมาที่เดือนล่าสุดที่มีข้อมูล เพื่อให้กรอกเดือนถัดไปได้ทันที
      const lastFilled = Math.max(
        0,
        ...d.indicators.flatMap((i) => i.values.map((v, k) => (v === null ? 0 : k + 1))),
      );
      setMonth(Math.min(Math.max(lastFilled, 1), (d.months || []).length || 12));
    } catch (e) {
      setError(e.message || 'โหลดตัวชี้วัดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ตั้งค่าเริ่มต้นของช่องกรอกใหม่ทุกครั้งที่เปลี่ยนเดือน
  useEffect(() => {
    if (!data || month === null) return;
    setDraft(Object.fromEntries(
      data.indicators.map((i) => [i.id, i.values[month - 1] === null ? '' : String(i.values[month - 1])]),
    ));
    setSaved('');
  }, [data, month]);

  const groups = useMemo(() => {
    if (!data) return [];
    const m = new Map();
    for (const i of data.indicators) {
      const k = `${i.groupCode}|${i.groupName}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(i);
    }
    return [...m.entries()];
  }, [data]);

  const summary = useMemo(() => {
    if (!data) return { pass: 0, partial: 0, fail: 0, nodata: 0 };
    let pass = 0, partial = 0, fail = 0, nodata = 0;
    for (const i of data.indicators) {
      let ok = 0, no = 0;
      for (const v of i.values) {
        const r = meets(v, i.targetOp, i.targetValue);
        if (r === true) ok += 1; else if (r === false) no += 1;
      }
      if (ok + no === 0) nodata += 1;
      else if (no === 0) pass += 1;
      else if (ok === 0) fail += 1;
      else partial += 1;
    }
    return { pass, partial, fail, nodata };
  }, [data]);

  // เตือนตอนพิมพ์ — ร้อยละต้องกรอก 0-100 ไม่ใช่เศษส่วน (เคยกรอกผิดจนตัวเลขคลาด 100 เท่า)
  const warnOf = (ind, raw) => {
    if (raw.trim() === '') return null;
    const v = Number(raw);
    if (!Number.isFinite(v)) return 'ไม่ใช่ตัวเลข';
    if (v < 0) return 'ค่าติดลบไม่ได้';
    if (ind.kind !== 'PERCENT') return null;
    if (v > 100) return 'ร้อยละเกิน 100 ไม่ได้';
    if (v > 0 && v < 1 && (ind.targetValue ?? 0) >= 10) return `หมายถึง ${(v * 100).toFixed(2)}% หรือเปล่า? ช่องนี้กรอกเป็นร้อยละ`;
    return null;
  };
  const warnings = useMemo(() => {
    if (!data) return {};
    const out = {};
    for (const i of data.indicators) {
      const w = warnOf(i, draft[i.id] ?? '');
      if (w) out[i.id] = w;
    }
    return out;
  }, [data, draft]);
  const blocking = Object.values(warnings).some((w) => w.includes('ไม่ได้') || w === 'ไม่ใช่ตัวเลข');

  const save = async () => {
    setSaving(true);
    setSaved('');
    setError('');
    try {
      const entries = data.indicators.map((i) => {
        const raw = (draft[i.id] ?? '').trim();
        return { indicatorId: i.id, value: raw === '' ? null : Number(raw) };
      });
      const res = await api.saveKpiValues(data.fiscalYear, month, entries);
      setSaved(`บันทึกแล้ว ${res.saved} ค่า`);
      await load(data.fiscalYear);
    } catch (e) {
      setError(e.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', padding: '40px 0' }}>กำลังโหลดตัวชี้วัด…</div>;
  }
  if (error && !data) {
    return (
      <Alert tone="danger" title="เชื่อมต่อระบบทะเบียนเอกสารกลางไม่ได้" icon={<Icon name="AlertTriangle" size={18} color="var(--red-700)" />}>
        {error} — ตัวชี้วัดเก็บอยู่ที่ระบบทะเบียนเอกสารฝ่ายสหเวชศาสตร์ ระบบนี้ดึงมาแสดงให้เท่านั้น
      </Alert>
    );
  }
  if (!data?.indicators?.length) {
    return <div style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>ยังไม่มีตัวชี้วัดของงานเทคนิคการแพทย์ในระบบ</div>;
  }

  const months = data.months || [];
  const canEdit = !!data.canEdit;

  return (
    <div className="qms-rise" style={{ maxWidth: 'var(--container-max)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ font: 'var(--fw-bold) var(--text-2xs)/1 var(--font-mono)', letterSpacing: '.14em', color: 'var(--accent-600)', textTransform: 'uppercase', marginBottom: 8 }}>
          Quality Indicators
        </div>
        <h1 style={{ font: 'var(--type-page-title)', color: 'var(--text-primary)', margin: 0 }}>ตัวชี้วัดคุณภาพ</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)', margin: '8px 0 0' }}>
          งานห้องปฏิบัติการเทคนิคการแพทย์ · ปีงบประมาณ {data.fiscalYear} · {data.indicators.length} ตัวชี้วัด
        </p>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-tertiary)', margin: '6px 0 0' }}>
          ข้อมูลชุดเดียวกับระบบทะเบียนเอกสารฝ่ายสหเวชศาสตร์ — แก้ที่ระบบไหนก็เห็นตรงกันทั้งสองฝั่ง
        </p>
      </div>

      <ReportCards />

      <div style={{ display: 'flex', gap: '10px 24px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { n: summary.pass, label: 'ผ่านทุกเดือน', c: PASS },
          { n: summary.partial, label: 'ผ่านบางเดือน', c: 'var(--amber-600)' },
          { n: summary.fail, label: 'ไม่ผ่าน', c: FAIL },
          { n: summary.nodata, label: 'ยังไม่มีข้อมูล', c: 'var(--slate-500)' },
        ].map((s) => (
          <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: 'var(--type-ui)', color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} />
            <b style={{ font: 'var(--fw-semibold) var(--text-base)/1 var(--font-mono)', color: 'var(--text-primary)' }}>{s.n}</b>
            {s.label}
          </span>
        ))}
      </div>

      <Card padding="md" header={
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Icon name="TrendingUp" size={16} color="var(--text-secondary)" />
          {canEdit ? 'กรอกผลรายเดือน' : 'ผลรายเดือน'}
          <select
            value={month ?? 1}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={{ font: 'var(--type-ui)', padding: '5px 9px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--surface-card)', color: 'var(--text-primary)' }}
          >
            {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </span>
      }>
        <style>{`
          .kpi-name:hover .kpi-name-text { text-decoration: underline; text-underline-offset: 3px; }
        `}</style>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-tertiary)', margin: '0 0 12px' }}>
          กดที่ชื่อตัวชี้วัดเพื่อดูกราฟแนวโน้มทั้งปี · เอาเมาส์ชี้ที่ช่องสีเพื่อดูค่าของเดือนนั้น
          {!canEdit && ' · ดูได้อย่างเดียว การกรอกผลเป็นสิทธิ์ของหัวหน้างานและผู้ดูแลระบบ'}
        </p>

        {/* จอแคบให้ตารางเลื่อนแนวนอนในกรอบตัวเอง แทนบีบจนอ่านไม่ออก */}
        <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 700 }}>
        <div style={{ ...ROW, paddingBottom: 6, borderBottom: '1px solid var(--border-default)' }}>
          <span style={{ font: 'var(--text-2xs)/1 var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>ตัวชี้วัด</span>
          <div style={MONTHS_ROW}>
            {months.map((m, i) => (
              <span key={m} style={{
                font: 'var(--text-2xs)/1 var(--font-mono)', textAlign: 'center',
                color: i + 1 === month ? 'var(--brand-700)' : 'var(--text-tertiary)',
                fontWeight: i + 1 === month ? 700 : 400,
              }}>{m}</span>
            ))}
          </div>
          <span style={{ font: 'var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-tertiary)', textAlign: 'right' }}>เป้าหมาย</span>
        </div>

        {groups.map(([key, items]) => {
          const [gcode, gname] = key.split('|');
          return (
            <div key={key} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 9, alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                {gcode && <span style={{ font: 'var(--text-xs)/1 var(--font-mono)', color: 'var(--brand-700)' }}>{gcode}</span>}
                <span style={{ font: 'var(--fw-semibold) var(--text-sm)/1.4 var(--font-body)', color: 'var(--text-primary)' }}>{gname}</span>
              </div>

              {items.map((ind) => {
                const raw = draft[ind.id] ?? '';
                const warn = warnings[ind.id];
                const v = raw.trim() === '' ? null : Number(raw);
                const ok = Number.isFinite(v) ? meets(v, ind.targetOp, ind.targetValue) : null;
                const isOpen = open === ind.id;
                return (
                  <div key={ind.id}>
                  <div style={{ ...ROW, padding: '9px 0', borderBottom: isOpen ? 'none' : '1px solid var(--border-subtle)' }}>
                    {/* ทำให้เห็นชัดว่ากดได้ — ลูกศรหน้าแถวหมุนเมื่อกาง และชื่อขีดเส้นใต้ตอนชี้
                        เดิมเป็นข้อความเปล่า ๆ ผู้ใช้จึงไม่รู้ว่ากดดูกราฟได้ */}
                    <button
                      type="button"
                      className="kpi-name"
                      onClick={() => setOpen(isOpen ? null : ind.id)}
                      aria-expanded={isOpen}
                      title="กดเพื่อดูกราฟแนวโน้มทั้งปี"
                      style={{
                        display: 'flex', gap: 8, minWidth: 0, alignItems: 'baseline', textAlign: 'left',
                        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                      }}
                    >
                      <span aria-hidden style={{
                        flexShrink: 0, alignSelf: 'center', color: isOpen ? 'var(--brand-700)' : 'var(--text-tertiary)',
                        transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s ease',
                        font: 'var(--text-2xs)/1 var(--font-mono)',
                      }}>▶</span>
                      <span style={{ font: 'var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-tertiary)', flexShrink: 0 }}>{ind.code}</span>
                      <span className="kpi-name-text" style={{ font: 'var(--text-sm)/1.5 var(--font-body)', color: isOpen ? 'var(--brand-700)' : 'var(--text-secondary)' }}>{ind.name}</span>
                    </button>

                    {/* ทั้ง 12 เดือนในแถวเดียว — เดือนที่เลือกอยู่กลายเป็นช่องกรอก
                        เดือนอื่นเป็นบล็อกสีอ่านอย่างเดียว จึงเห็นทั้งปีและแก้เดือนที่ต้องการ
                        ได้ในหน้าจอเดียว ไม่ต้องสลับโหมด */}
                    <div style={MONTHS_ROW}>
                      {months.map((m, i) => {
                        const isEditing = i + 1 === month;
                        if (isEditing) {
                          return (
                            <input
                              key={m}
                              id={ind.id}
                              inputMode="decimal"
                              disabled={!canEdit}
                              value={raw}
                              onChange={(e) => setDraft((d) => ({ ...d, [ind.id]: e.target.value }))}
                              title={`${m} · กำลังแก้ไข`}
                              placeholder="—"
                              style={{
                                width: '100%', minWidth: 0, height: 24, font: 'var(--text-2xs)/1 var(--font-mono)',
                                textAlign: 'center', padding: '2px 3px', borderRadius: 'var(--radius-xs)',
                                background: canEdit ? 'var(--surface-card)' : 'var(--slate-50)',
                                color: 'var(--text-primary)',
                                border: `2px solid ${warn ? 'var(--amber-600)' : ok === false ? 'var(--red-600)' : 'var(--brand-600)'}`,
                              }}
                            />
                          );
                        }
                        const mv = ind.values[i];
                        const mok = meets(mv, ind.targetOp, ind.targetValue);
                        return (
                          /* ไม่ใส่ตัวเลขในช่อง — 12 คอลัมน์ทำให้ตัวเล็กจนอ่านยาก และการปัดเศษ
                             ทำให้ 99.03 กลายเป็น 99 ซึ่งคลาดเคลื่อน · ค่าจริงดูได้จากการชี้
                             และจากแผงกราฟที่กางออกมา */
                          <span
                            key={m}
                            title={`${m} · ${fmt(mv, ind.kind)}${mok === null ? '' : mok ? ' · ผ่าน' : ' · ไม่ผ่าน'}`}
                            style={{
                              height: 22, borderRadius: 'var(--radius-xs)',
                              background: mok === null ? 'var(--slate-100)' : mok ? PASS : FAIL,
                              // ช่องไม่ผ่านมีลายทแยงด้วย ไม่พึ่งสีอย่างเดียว (คนตาบอดสีแดง-เขียว)
                              backgroundImage: mok === false
                                ? 'repeating-linear-gradient(45deg, rgba(0,0,0,.42) 0 2px, transparent 2px 4px)'
                                : undefined,
                            }}
                          />
                        );
                      })}
                    </div>

                    <div style={{ font: 'var(--text-2xs)/1.4 var(--font-mono)', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                      {ind.targetRaw || '—'}
                      {ok !== null && (
                        <div style={{ color: ok ? PASS : FAIL, marginTop: 3 }}>{ok ? 'ผ่าน' : 'ไม่ผ่าน'}</div>
                      )}
                    </div>

                    {warn && (
                      <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, font: 'var(--text-xs)/1.5 var(--font-body)', color: 'var(--amber-700)' }}>{warn}</p>
                    )}
                    </div>

                    {isOpen && (
                      <div style={{ padding: '14px 0 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '12px 24px', marginBottom: 14 }}>
                          {(() => {
                            const filled = ind.values.map((x, k) => ({ x, k })).filter((o) => o.x !== null && o.x !== undefined);
                            const last = filled.length ? filled[filled.length - 1] : null;
                            let pass = 0, failN = 0;
                            for (const o of filled) {
                              const r = meets(o.x, ind.targetOp, ind.targetValue);
                              if (r === true) pass += 1; else if (r === false) failN += 1;
                            }
                            const nums = filled.map((o) => o.x);
                            return [
                              ['ค่าล่าสุด', last ? `${fmt(last.x, ind.kind)} (${months[last.k]})` : '—'],
                              ['ผ่านเป้า', pass + failN ? `${pass}/${pass + failN} เดือน` : '—'],
                              ['ต่ำสุด – สูงสุด', nums.length ? `${fmt(Math.min(...nums), ind.kind)} – ${fmt(Math.max(...nums), ind.kind)}` : '—'],
                              ['ผู้จัดทำข้อมูล', ind.owner || '—'],
                            ].map(([label, value]) => (
                              <div key={label}>
                                <div style={{ font: 'var(--text-2xs)/1 var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
                                <div style={{ font: 'var(--text-sm)/1.5 var(--font-body)', color: 'var(--text-primary)' }}>{value}</div>
                              </div>
                            ));
                          })()}
                        </div>
                        <Sparkline ind={ind} months={months} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        </div>
        </div>

        {canEdit && (
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', paddingTop: 6 }}>
            <Button onClick={save} disabled={saving || blocking} iconLeft={<Icon name="Check" size={16} color="#fff" />}>
              {saving ? 'กำลังบันทึก…' : `บันทึกเดือน ${months[month - 1] || ''}`}
            </Button>
            {blocking && <span style={{ font: 'var(--type-caption)', color: 'var(--red-700)' }}>แก้ค่าที่ผิดรูปแบบก่อนจึงจะบันทึกได้</span>}
            {saved && <span style={{ font: 'var(--type-caption)', color: PASS }}>{saved}</span>}
            {error && <span style={{ font: 'var(--type-caption)', color: 'var(--red-700)' }}>{error}</span>}
          </div>
        )}
      </Card>
    </div>
  );
}

export default KpiScreen;
