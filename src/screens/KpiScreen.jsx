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

export function KpiScreen() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

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
        {!canEdit && (
          <p style={{ font: 'var(--type-caption)', color: 'var(--text-tertiary)', margin: '0 0 12px' }}>
            ดูได้อย่างเดียว — การกรอกผลเป็นสิทธิ์ของหัวหน้างานและผู้ดูแลระบบ
          </p>
        )}

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
                const prev = month > 1 ? ind.values[month - 2] : null;
                return (
                  <div key={ind.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(150px,190px) 130px', gap: 14, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <label htmlFor={ind.id} style={{ display: 'flex', gap: 8, minWidth: 0, alignItems: 'baseline' }}>
                      <span style={{ font: 'var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-tertiary)', flexShrink: 0 }}>{ind.code}</span>
                      <span style={{ font: 'var(--text-sm)/1.5 var(--font-body)', color: 'var(--text-secondary)' }}>{ind.name}</span>
                    </label>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          id={ind.id}
                          inputMode="decimal"
                          disabled={!canEdit}
                          value={raw}
                          onChange={(e) => setDraft((d) => ({ ...d, [ind.id]: e.target.value }))}
                          placeholder="—"
                          style={{
                            width: '100%', font: 'var(--text-sm)/1 var(--font-mono)', textAlign: 'right',
                            padding: '7px 9px', borderRadius: 'var(--radius-sm)',
                            background: canEdit ? 'var(--surface-card)' : 'var(--slate-50)',
                            color: 'var(--text-primary)',
                            border: `1px solid ${warn ? 'var(--amber-600)' : ok === false ? 'var(--red-600)' : 'var(--border-default)'}`,
                          }}
                        />
                        {ind.kind === 'PERCENT' && <span style={{ font: 'var(--text-xs)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>%</span>}
                      </div>
                      {prev !== null && prev !== undefined && (
                        <div style={{ font: 'var(--text-2xs)/1.4 var(--font-mono)', color: 'var(--text-tertiary)', textAlign: 'right', marginTop: 3 }}>
                          เดือนก่อน {fmt(prev, ind.kind)}
                        </div>
                      )}
                    </div>

                    <div style={{ font: 'var(--text-2xs)/1.4 var(--font-mono)', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                      เป้า {ind.targetRaw || '—'}
                      {ok !== null && (
                        <div style={{ color: ok ? PASS : FAIL, marginTop: 3 }}>{ok ? 'ผ่าน' : 'ไม่ผ่าน'}</div>
                      )}
                    </div>

                    {warn && (
                      <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, font: 'var(--text-xs)/1.5 var(--font-body)', color: 'var(--amber-700)' }}>{warn}</p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

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
