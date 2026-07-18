import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Button } from './components/ds/index.js';
import { Icon } from './components/Icon.jsx';
import { can } from './auth/users.js';
import { api, decodeToken, setToken } from './api.js';

const LoginScreen = lazy(() => import('./screens/LoginScreen.jsx'));
const AppShell = lazy(() => import('./screens/AppShell.jsx'));
const DashboardScreen = lazy(() => import('./screens/DashboardScreen.jsx'));
const RegisterScreen = lazy(() => import('./screens/RegisterScreen.jsx'));
const DocDetailScreen = lazy(() => import('./screens/DocDetailScreen.jsx'));
const RegisterDocScreen = lazy(() => import('./screens/RegisterDocScreen.jsx'));
const UsersScreen = lazy(() => import('./screens/UsersScreen.jsx'));
const LogScreen = lazy(() => import('./screens/LogScreen.jsx'));
const HelpScreen = lazy(() => import('./screens/HelpScreen.jsx'));

function Loader({ text = 'กำลังโหลดข้อมูล...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--surface-page)', padding: 20 }}>
      <div className="qms-rise" style={{ background: 'var(--surface-card)', padding: '24px 32px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-subtle)', textAlign: 'center', maxWidth: 320, width: '100%' }}>
        <div className="qms-spin" style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--brand-100)', borderTopColor: 'var(--brand-700)', margin: '0 auto 16px' }} />
        <div style={{ font: 'var(--fw-semibold) var(--text-base)/1.3 var(--font-display)', color: 'var(--text-primary)' }}>{text}</div>
        <div style={{ font: 'var(--type-caption)', color: 'var(--text-tertiary)', marginTop: 8 }}>หน่วยงานทะเบียนและควบคุมเอกสาร TUH</div>
      </div>
    </div>
  );
}


export default function App() {
  const [view, setView] = useState('dashboard');
  const [cat, setCat] = useState(null);
  const [doc, setDoc] = useState(null);
  const [docs, setDocs] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => decodeToken());
  const [booting, setBooting] = useState(true);
  const [ssoError, setSsoError] = useState('');

  const role = currentUser?.role;
  const canViewUsers = role && can(role, 'viewUsers');
  const canAudit = role && can(role, 'audit');

  // โหลดข้อมูลจากเซิร์ฟเวอร์ (ตามสิทธิ์)
  const refreshAll = useCallback(async (r) => {
    const tasks = [api.listDocuments().then(setDocs)];
    if (r && can(r, 'viewUsers')) tasks.push(api.listUsers().then(setUsers));
    if (r && can(r, 'audit')) tasks.push(api.listLogs().then(setLogs));
    await Promise.all(tasks);
  }, []);

  const handleAuthError = useCallback((e) => {
    if (e?.status === 401) { setToken(null); setCurrentUser(null); }
    else window.alert(e?.message || 'เกิดข้อผิดพลาด');
  }, []);

  // กู้คืนเซสชันตอนเปิดแอป (ถ้ามี token ที่ยังไม่หมดอายุ) — หรือถ้ามาจากลิงก์ของ Masterlist (?sso=...)
  // ให้แลก token อายุสั้นนั้นเป็นเซสชันจริงก่อน แล้วค่อยลบออกจาก URL ทันทีไม่ให้ค้างใน history
  // ใช้ ref กันการทำงานซ้ำ (แทนตัวแปร alive เดิม) เพราะ React StrictMode ใน dev
  // จะ mount effect นี้สองรอบติดกัน — ถ้าใช้ closure ธรรมดา ผลลัพธ์ของรอบแรก (รวมถึง error)
  // จะถูกทิ้งไปเงียบ ๆ เพราะ cleanup ของรอบแรกมาถึงก่อน request จะเสร็จ
  const bootRanRef = useRef(false);
  useEffect(() => {
    if (bootRanRef.current) return;
    bootRanRef.current = true;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const ssoToken = params.get('sso');
      if (ssoToken) {
        params.delete('sso');
        const clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', clean);
        try {
          const { token, user } = await api.ssoLogin(ssoToken);
          setToken(token);
          setCurrentUser(user);
          await refreshAll(user.role);
        } catch (e) {
          setSsoError(e.message || 'เข้าสู่ระบบผ่านลิงก์ไม่สำเร็จ');
        }
        setBooting(false);
        return;
      }

      const u = decodeToken();
      if (u) {
        try { await refreshAll(u.role); } catch (e) { handleAuthError(e); }
      }
      setBooting(false);
    })();
  }, [refreshAll, handleAuthError]);

  // คีย์บอร์ดคีย์ลัดสำหรับนำทางระบบเอกสาร (Alt + d/r/u/l/c)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!currentUser) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'd' || key === 'ด') { e.preventDefault(); setView('dashboard'); setCat(null); }
        else if (key === 'r' || key === 'ท') { e.preventDefault(); setView('register'); setCat(null); }
        else if ((key === 'u' || key === 'จ') && canViewUsers) { e.preventDefault(); setView('users'); setCat(null); }
        else if ((key === 'l' || key === 'บ') && canAudit) { e.preventDefault(); setView('log'); setCat(null); }
        else if (key === 'h' || key === 'อ') { e.preventDefault(); setView('help'); setCat(null); }
        else if ((key === 'c' || key === 'ล') && can(role, 'register')) { e.preventDefault(); setCat(null); setView('create'); window.scrollTo(0, 0); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, canViewUsers, canAudit, role]);

  if (booting) return <Loader text="กำลังโหลดระบบข้อมูล..." />;

  if (!currentUser) {
    return (
      <Suspense fallback={<Loader text="กำลังเตรียมหน้าจอ..." />}>
        <LoginScreen
          initialError={ssoError}
          onSubmit={async (username, password) => {
            const { token, user } = await api.login(username, password);
            setToken(token);
            setCurrentUser(user);
            setView('dashboard');
            await refreshAll(user.role);
          }}
        />
      </Suspense>
    );
  }


  const transitionTo = (fn) => {
    if (document.startViewTransition) {
      document.startViewTransition(fn);
    } else {
      fn();
    }
  };

  const openDoc = (d) => transitionTo(() => { setDoc(d); setView('detail'); window.scrollTo(0, 0); });
  const nav = (v) => transitionTo(() => { setView(v); setCat(null); });
  const pickCat = (c) => transitionTo(() => { setCat(c); setView('register'); });
  const openCreate = () => transitionTo(() => { setCat(null); setView('create'); window.scrollTo(0, 0); });

  const logout = async () => {
    await api.logout();
    setToken(null);
    setCurrentUser(null);
    transitionTo(() => {
      setView('dashboard'); setCat(null); setDoc(null);
      setDocs([]); setUsers([]); setLogs([]);
    });
  };

  // นำเข้าเอกสาร (FormData พร้อมไฟล์/ลิงก์) — โยน error กลับให้ฟอร์มจัดการ
  const createDoc = async (formData) => {
    const created = await api.createDocument(formData);
    await refreshAll(role);
    setDoc(created);
    setCat(null);
    setView('detail');
    window.scrollTo(0, 0);
  };

  const updateDoc = async (no, patch) => {
    try {
      const updated = await api.updateDocument(no, patch);
      setDoc(updated);
      await refreshAll(role);
    } catch (e) { handleAuthError(e); }
  };

  // อัปเดตไฟล์แนบเป็นเวอร์ชันใหม่ — โยน error กลับให้หน้าจอแสดงเอง
  const updateDocFile = async (no, attId, file) => {
    const updated = await api.updateAttachmentFile(no, attId, file);
    setDoc(updated);
    await refreshAll(role);
  };

  const deleteDoc = async (target) => {
    try {
      await api.deleteDocument(target.no);
      setDoc(null);
      setView(cat ? 'register' : 'dashboard');
      await refreshAll(role);
    } catch (e) { handleAuthError(e); }
  };

  const addUser = async (u) => { await api.createUser(u); await refreshAll(role); };
  const editUser = async (username, patch) => { await api.updateUser(username, patch); await refreshAll(role); };
  const resetUserPassword = async (username, password) => { await api.resetUserPassword(username, password); };
  const deleteUser = async (username) => {
    try { await api.deleteUser(username); await refreshAll(role); }
    catch (e) { handleAuthError(e); }
  };

  const titles = {
    dashboard: { e: 'OVERVIEW', t: 'Dashboard', s: 'ภาพรวมทะเบียนเอกสารคุณภาพห้องปฏิบัติการ' },
    register: { e: 'REGISTER', t: 'ทะเบียนเอกสาร', s: 'ค้นหา กรอง และเปิดดูเอกสารคุณภาพ' },
    create: { e: 'NEW ENTRY', t: 'ลงทะเบียนเอกสาร', s: 'นำเข้าเอกสารคุณภาพ (Word/PDF/ลิงก์) เข้าสู่ระบบ' },
    users: { e: 'ACCESS CONTROL', t: 'จัดการผู้ใช้งาน', s: 'เพิ่ม ลบ และกำหนดสิทธิ์ผู้ใช้งานระบบ' },
    log: { e: 'AUDIT LOG', t: 'บันทึกกิจกรรม', s: 'ประวัติการทำงานของผู้ใช้งานในระบบ' },
    detail: { e: 'DOCUMENT', t: 'รายละเอียดเอกสาร', s: doc ? doc.no : '' },
    help: { e: 'USER GUIDE', t: 'คู่มือการใช้งาน', s: 'คู่มือการควบคุมเอกสารตามมาตรฐาน ISO 15189' },
  };
  const head = titles[view] || titles.dashboard;

  const RegisterBtn = can(role, 'register') ? (
    <Button onClick={openCreate} iconLeft={<Icon name="Plus" size={17} color="#fff" />}>
      ลงทะเบียนเอกสาร
    </Button>
  ) : null;

  let body;
  if (view === 'dashboard') body = <DashboardScreen docs={docs} onOpen={openDoc} onGoRegister={() => nav('register')} onCreate={can(role, 'register') ? openCreate : undefined} />;
  else if (view === 'register') body = <RegisterScreen docs={docs} cat={cat} onOpen={openDoc} />;
  else if (view === 'create' && can(role, 'register')) body = <RegisterDocScreen docs={docs} onSubmit={createDoc} onCancel={() => nav('register')} />;
  else if (view === 'users' && canViewUsers) body = <UsersScreen users={users} currentUser={currentUser} onAdd={addUser} onEdit={editUser} onResetPassword={resetUserPassword} onDelete={deleteUser} />;
  else if (view === 'log' && canAudit) body = <LogScreen logs={logs} />;
  else if (view === 'help') body = <HelpScreen />;
  else if (view === 'detail' && doc) body = <DocDetailScreen doc={doc} role={role} onUpdate={updateDoc} onUpdateFile={updateDocFile} onDelete={deleteDoc} onBack={() => setView(cat ? 'register' : 'dashboard')} />;
  else body = <DashboardScreen docs={docs} onOpen={openDoc} onGoRegister={() => nav('register')} onCreate={can(role, 'register') ? openCreate : undefined} />;

  const shellView = (view === 'detail' || view === 'create')
    ? (cat ? 'register' : 'dashboard')
    : view;

  return (
    <Suspense fallback={<Loader text="กำลังดาวน์โหลดหน้าจอระบบ..." />}>
      <AppShell
        view={shellView}
        onNav={nav}
        cat={cat}
        onCat={pickCat}
        onLogout={logout}
        user={currentUser}
        eyebrow={head.e}
        title={head.t}
        subtitle={head.s}
        docCount={docs.length}
        actions={view === 'register' ? RegisterBtn : null}
      >
        {body}
      </AppShell>
    </Suspense>
  );

}
