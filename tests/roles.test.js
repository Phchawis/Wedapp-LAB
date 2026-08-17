/* ทดสอบตารางสิทธิ์ (RBAC) — แกนความปลอดภัยของระบบ
   ถ้าใครแก้ตารางสิทธิ์แล้วทำให้ผู้ใช้ระดับล่างทำสิ่งที่ไม่ควรทำได้ เทสต์ชุดนี้ต้องจับให้ได้

   รันด้วย: npm test   (ใช้ node:test ที่มากับ Node ไม่ต้องลงไลบรารีเพิ่ม) */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { can, ROLES, ROLE_ORDER, PERM_LIST } from '../src/auth/roles.js';

describe('โครงสร้างตารางสิทธิ์', () => {
  test('ทุกบทบาทใน ROLE_ORDER มีข้อมูลใน ROLES ครบ', () => {
    for (const r of ROLE_ORDER) {
      assert.ok(ROLES[r], `ไม่พบข้อมูลบทบาท ${r}`);
      assert.ok(ROLES[r].th, `บทบาท ${r} ไม่มีชื่อภาษาไทย`);
    }
  });

  test('ไม่มีบทบาทตกหล่นจาก ROLE_ORDER', () => {
    assert.deepEqual(
      Object.keys(ROLES).sort(),
      [...ROLE_ORDER].sort(),
      'ROLES กับ ROLE_ORDER ไม่ตรงกัน',
    );
  });

  test('can() คืนค่า false เสมอสำหรับบทบาท/สิทธิ์ที่ไม่มีจริง (fail-closed)', () => {
    assert.equal(can('ไม่มีบทบาทนี้', 'register'), false);
    assert.equal(can('sysadmin', 'ไม่มีสิทธิ์นี้'), false);
    assert.equal(can(undefined, 'register'), false);
    assert.equal(can(null, 'register'), false);
    assert.equal(can('', ''), false);
  });
});

describe('สิทธิ์ที่ต้องมี — ผู้ดูแลระบบและหัวหน้างาน', () => {
  test('sysadmin เป็นบทบาทเดียวที่จัดการผู้ใช้งานได้', () => {
    const managers = ROLE_ORDER.filter((r) => can(r, 'manage'));
    assert.deepEqual(managers, ['sysadmin'], 'ต้องมีแค่ sysadmin ที่มีสิทธิ์ manage');
  });

  test('sysadmin มีสิทธิ์ครบทุกอย่างที่ระบบใช้จริง (ยกเว้น propose ที่เป็นของผู้ปฏิบัติ)', () => {
    for (const p of PERM_LIST.filter((p) => p !== 'propose')) {
      assert.ok(can('sysadmin', p), `sysadmin ควรมีสิทธิ์ ${p}`);
    }
  });

  test('head_work อนุมัติได้ แต่จัดการผู้ใช้ไม่ได้', () => {
    assert.ok(can('head_work', 'approve'));
    assert.ok(can('head_work', 'publish'));
    assert.equal(can('head_work', 'manage'), false);
  });
});

describe('สิทธิ์ที่ต้องไม่มี — ป้องกันการยกระดับสิทธิ์', () => {
  // บทบาทระดับปฏิบัติการ: ต้องอ่าน/รับทราบได้เท่านั้น ห้ามแตะวงจรเอกสาร
  const READ_ONLY_ROLES = ['assistant', 'admin_staff'];
  const DANGEROUS = ['register', 'publish', 'revise', 'approve', 'manage', 'upload'];

  for (const role of READ_ONLY_ROLES) {
    test(`${role} ทำได้แค่รับทราบ — ห้ามแก้ไขวงจรเอกสาร`, () => {
      assert.ok(can(role, 'acknowledge'), `${role} ต้องรับทราบได้`);
      for (const perm of DANGEROUS) {
        assert.equal(can(role, perm), false, `${role} ต้องไม่มีสิทธิ์ ${perm}`);
      }
    });
  }

  test('med_tech เสนอแก้ไขได้ แต่แก้เอกสารเองไม่ได้', () => {
    assert.ok(can('med_tech', 'propose'));
    assert.ok(can('med_tech', 'acknowledge'));
    assert.equal(can('med_tech', 'revise'), false);
    assert.equal(can('med_tech', 'publish'), false);
    assert.equal(can('med_tech', 'register'), false);
  });

  test('doc_manager ลงทะเบียน/แนบไฟล์ได้ แต่ประกาศใช้และอนุมัติไม่ได้', () => {
    assert.ok(can('doc_manager', 'register'));
    assert.ok(can('doc_manager', 'upload'));
    assert.equal(can('doc_manager', 'publish'), false, 'doc_manager ต้องประกาศใช้ไม่ได้');
    assert.equal(can('doc_manager', 'approve'), false, 'doc_manager ต้องอนุมัติไม่ได้');
    assert.equal(can('doc_manager', 'manage'), false);
  });

  test('head_cat ประกาศใช้ได้ แต่ไม่มีสิทธิ์อนุมัติและดูรายชื่อผู้ใช้', () => {
    assert.ok(can('head_cat', 'publish'));
    assert.ok(can('head_cat', 'revise'));
    assert.equal(can('head_cat', 'approve'), false);
    assert.equal(can('head_cat', 'viewUsers'), false);
  });

  test('ไม่มีบทบาทใดนอกจาก sysadmin/head_work ที่ดูรายชื่อผู้ใช้งานได้', () => {
    const viewers = ROLE_ORDER.filter((r) => can(r, 'viewUsers'));
    assert.deepEqual(viewers.sort(), ['head_work', 'sysadmin']);
  });

  test('ชุดกู้ชีพออฟไลน์ (ต้องมีสิทธิ์ audit) — ผู้ใช้ระดับล่างโหลดทั้งคลังไม่ได้', () => {
    // endpoint /api/documents/export/zip ใช้ requirePerm('audit')
    for (const role of ['assistant', 'admin_staff', 'med_tech']) {
      assert.equal(can(role, 'audit'), false, `${role} ต้องโหลดชุดกู้ชีพไม่ได้`);
    }
    for (const role of ['sysadmin', 'head_work', 'head_cat', 'doc_manager']) {
      assert.ok(can(role, 'audit'), `${role} ควรโหลดชุดกู้ชีพได้`);
    }
  });
});
