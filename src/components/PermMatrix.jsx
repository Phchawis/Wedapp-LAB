import { ROLES, ROLE_ORDER, PERM_LIST, PERM_LABELS, can } from '../auth/users.js';

function Mark({ on }) {
  return on
    ? <span style={{ color: 'var(--green-700)', font: 'var(--fw-bold) var(--text-md)/1 var(--font-body)' }}>✓</span>
    : <span style={{ color: 'var(--slate-300)', font: 'var(--fw-bold) var(--text-md)/1 var(--font-body)' }}>—</span>;
}

/* PermMatrix — ตารางสิทธิ์ (permission × role) เดียวที่ทั้ง UsersScreen และ HelpScreen ใช้ร่วมกัน
   สร้างจาก ROLE_ORDER × PERM_LIST/can() โดยตรง เพื่อไม่ให้มีสำเนาข้อมูลที่คลาดเคลื่อนกันได้อีก */
export function PermMatrix() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border-subtle)' }}>
            <th style={{ textAlign: 'left', padding: '11px 16px', font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em', minWidth: 200 }}>ความสามารถ</th>
            {ROLE_ORDER.map((r) => (
              <th key={r} style={{ textAlign: 'center', padding: '11px 10px', font: 'var(--fw-semibold) var(--text-2xs)/1 var(--font-body)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em', minWidth: 78 }}>{ROLES[r].short}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERM_LIST.map((perm, i) => (
            <tr key={perm} style={{ borderBottom: i === PERM_LIST.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '11px 16px', font: 'var(--fw-medium) var(--text-sm)/1.3 var(--font-body)', color: 'var(--text-primary)' }}>{PERM_LABELS[perm]}</td>
              {ROLE_ORDER.map((r) => (
                <td key={r} style={{ padding: '11px 10px', textAlign: 'center' }}><Mark on={can(r, perm)} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PermMatrix;
