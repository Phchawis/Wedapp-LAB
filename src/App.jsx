import { useCallback, useEffect, useState } from 'react';
import { Button } from './components/ds/index.js';
import { Icon } from './components/Icon.jsx';
import { can } from './auth/users.js';
import { api, decodeToken, setToken } from './api.js';
import { LoginScreen } from './screens/LoginScreen.jsx';
import { AppShell } from './screens/AppShell.jsx';
import { DashboardScreen } from './screens/DashboardScreen.jsx';
import { RegisterScreen } from './screens/RegisterScreen.jsx';
import { DocDetailScreen } from './screens/DocDetailScreen.jsx';
import { RegisterDocScreen } from './screens/RegisterDocScreen.jsx';
import { UsersScreen } from './screens/UsersScreen.jsx';
import { LogScreen } from './screens/LogScreen.jsx';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [cat, setCat] = useState(null);
  const [doc, setDoc] = useState(null);
  const [docs, setDocs] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => decodeToken());
  const [booting, setBooting] = useState(true);

  const role = currentUser?.role;
  const isManager = role && can(role, 'users:manage');

  // โหลดข้อมูลจากเซิร์ฟเวอร์ (ตามสิทธิ์)
  const refreshAll = useCallback(async (r) => {
    const tasks = [api.listDocuments().then(setDocs)];
    if (r && can(r, 'users:manage')) {
      tasks.push(api.listUsers().then(setUsers));
      tasks.push(api.listLogs().then(setLogs));
    }
    await Promise.all(tasks);
  }, []);

  const handleAuthError = useCallback((e) => {
    if (e?.status === 401) { setToken(null); setCurrentUser(null); }
    else window.alert(e?.message || 'เกิดข้อผิดพลาด');
  }, []);

  // กู้คืนเซสชันตอนเปิดแอป (ถ้ามี token ที่ยังไม่หมดอายุ)
  useEffect(() => {
    let alive = true;
    (async () => {
      const u = decodeToken();
      if (u) {
        try { await refreshAll(u.role); } catch (e) { if (alive) handleAuthError(e); }
      }
      if (alive) setBooting(false);
    })();
    return () => { alive = false; };
  }, [refreshAll, handleAuthError]);

  if (booting) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-tertiary)', font: 'var(--type-body)' }}>
        กำลังโหลด…
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        onSubmit={async (username, password) => {
          const { token, user } = await api.login(username, password);
          setToken(token);
          setCurrentUser(user);
          setView('dashboard');
          await refreshAll(user.role);
        }}
      />
    );
  }

  const openDoc = (d) => { setDoc(d); setView('detail'); window.scrollTo(0, 0); };
  const nav = (v) => { setView(v); setCat(null); };
  const pickCat = (c) => { setCat(c); setView('register'); };
  const openCreate = () => { setCat(null); setView('create'); window.scrollTo(0, 0); };

  const logout = async () => {
    await api.logout();
    setToken(null);
    setCurrentUser(null);
    setView('dashboard'); setCat(null); setDoc(null);
    setDocs([]); setUsers([]); setLogs([]);
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
  const deleteUser = async (username) => {
    try { await api.deleteUser(username); await refreshAll(role); }
    catch (e) { handleAuthError(e); }
  };

  const titles = {
    dashboard: { t: 'แดชบอร์ด', s: 'ภาพรวมทะเบียนเอกสารคุณภาพห้องปฏิบัติการ' },
    register: { t: 'ทะเบียนเอกสาร', s: 'ค้นหา กรอง และเปิดดูเอกสารคุณภาพ' },
    create: { t: 'ลงทะเบียนเอกสาร', s: 'นำเข้าเอกสารคุณภาพ (Word/PDF/ลิงก์) เข้าสู่ระบบ' },
    users: { t: 'จัดการผู้ใช้งาน', s: 'เพิ่ม ลบ และกำหนดสิทธิ์ผู้ใช้งานระบบ' },
    log: { t: 'บันทึกกิจกรรม', s: 'ประวัติการทำงานของผู้ใช้งานในระบบ' },
    detail: { t: 'รายละเอียดเอกสาร', s: doc ? doc.no : '' },
  };
  const head = titles[view] || titles.dashboard;

  const RegisterBtn = can(role, 'docs:create') ? (
    <Button onClick={openCreate} iconLeft={<Icon name="Plus" size={17} color="#fff" />}>
      ลงทะเบียนเอกสาร
    </Button>
  ) : null;

  let body;
  if (view === 'dashboard') body = <DashboardScreen docs={docs} onOpen={openDoc} onGoRegister={() => nav('register')} />;
  else if (view === 'register') body = <RegisterScreen docs={docs} cat={cat} onOpen={openDoc} />;
  else if (view === 'create' && can(role, 'docs:create')) body = <RegisterDocScreen docs={docs} onSubmit={createDoc} onCancel={() => nav('register')} />;
  else if (view === 'users' && isManager) body = <UsersScreen users={users} currentUser={currentUser} onAdd={addUser} onDelete={deleteUser} />;
  else if (view === 'log' && isManager) body = <LogScreen logs={logs} />;
  else if (view === 'detail' && doc) body = <DocDetailScreen doc={doc} role={role} onUpdate={updateDoc} onUpdateFile={updateDocFile} onDelete={deleteDoc} onBack={() => setView(cat ? 'register' : 'dashboard')} />;
  else body = <DashboardScreen docs={docs} onOpen={openDoc} onGoRegister={() => nav('register')} />;

  const shellView = (view === 'detail' || view === 'create')
    ? (cat ? 'register' : 'dashboard')
    : view;

  return (
    <AppShell
      view={shellView}
      onNav={nav}
      cat={cat}
      onCat={pickCat}
      onLogout={logout}
      user={currentUser}
      title={head.t}
      subtitle={head.s}
      docCount={docs.length}
      actions={['dashboard', 'register'].includes(view) ? RegisterBtn : null}
    >
      {body}
    </AppShell>
  );
}
