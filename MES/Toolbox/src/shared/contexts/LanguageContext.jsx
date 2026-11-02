import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'mes_language_preference';

export const SUPPORTED_LANGUAGES = [
  { code: 'th', label: 'ไทย', flag: '🇹🇭', name: 'ภาษาไทย' },
  { code: 'en', label: 'English', flag: '🇺🇸', name: 'English (US)' },
  { code: 'zh', label: '中文', flag: '🇨🇳', name: '简体中文' }
];

const TRANSLATIONS = {
  th: {
    // App & Auth
    appTitle: 'TOOLBOX OS',
    companyName: 'บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด (มหาชน)',
    welcome: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน',
    username: 'ชื่อผู้ใช้งาน (Username)',
    password: 'รหัสผ่าน (Password)',
    usernamePlaceholder: 'กรอกชื่อผู้ใช้งาน',
    passwordPlaceholder: 'กรอกรหัสผ่าน',
    signIn: 'เข้าสู่ระบบ',
    signingIn: 'กำลังเข้าสู่ระบบ...',
    noAccountPrompt: 'ยังไม่มีบัญชีผู้ใช้งาน หรือเป็นผู้เข้าอบรมคลาสเรียน?',
    registerButton: 'ลงทะเบียนบัญชีใหม่ / สมาชิกเข้าอบรม',

    // Register Modal
    modalTitle: 'ลงทะเบียนผู้ใช้งาน',
    modalSubtitle: 'ระบบศูนย์เรียนรู้และแพลตฟอร์มโรงงาน SNC Former B9',
    tabTrainee: 'ผู้เข้าอบรม (Trainee)',
    tabWorkforce: 'พนักงาน / ผู้รับเหมา / ลูกค้า',
    traineeTip: 'กรอกรหัสห้องเรียนที่ได้รับจากผู้สอนเพื่อเปิดใช้งานบัญชีทันที',
    workforceTip: 'คำขอจะถูกส่งให้ผู้ดูแลระบบ (Admin) ตรวจสอบและอนุมัติสิทธิ์',
    fullname: 'ชื่อ-นามสกุล',
    phone: 'เบอร์โทรศัพท์',
    organization: 'สถาบัน / หน่วยงาน / บริษัท',
    classCode: 'รหัสห้องเรียน (Class Code)',
    classCodePlaceholder: 'ระบุรหัสที่ได้รับจากผู้สอน',
    accountType: 'ประเภทผู้ใช้งาน',
    accountTypeEmployee: 'พนักงานโรงงาน / สัญญาจ้าง',
    accountTypeContractor: 'ผู้รับเหมา / QC ส่งตัว',
    accountTypeCustomer: 'ลูกค้า / ตรวจประเมิน',
    accountTypeExecutive: 'ผู้บริหารส่วนกลาง',
    requestedRole: 'บทบาท / หน้าที่',
    roleOperator: 'พนักงานฝ่ายผลิต (Operator)',
    roleSupervisor: 'หัวหน้าไลน์ (Supervisor)',
    roleQc: 'ฝ่ายตรวจสอบคุณภาพ (QC)',
    roleMaintenance: 'ช่างซ่อมบำรุง / PE',
    rolePlanner: 'เจ้าหน้าที่วางแผน (Planner)',
    roleContractor: 'ผู้รับเหมา / ช่างเฉพาะกิจ',
    roleCustomer: 'ลูกค้า / ผู้ตรวจประเมิน',
    roleExecutive: 'ผู้บริหารส่วนกลาง',
    empId: 'รหัสพนักงาน (ถ้ามี)',
    line: 'ไลน์ผลิต / พื้นที่',
    lineAll: 'ทุกไลน์ผลิต (All Lines)',
    purpose: 'เหตุผลในการขอใช้งาน',
    purposePlaceholder: 'ระบุวัตถุประสงค์สั้นๆ เพื่อให้แอดมินพิจารณาอนุมัติ',
    submitTrainee: 'ลงทะเบียนเข้าสู่ระบบ',
    submitWorkforce: 'ส่งคำขอเปิดใช้งานบัญชี',
    successTrainee: 'ลงทะเบียนสำเร็จ พร้อมเข้าใช้งาน!',
    successWorkforce: 'ยื่นคำขอเรียบร้อยแล้ว!',
    accountTypeLabel: 'ประเภท:',
    validUntil: 'อายุการใช้งาน:',
    daysCount: '30 วัน',
    untilDate: 'ถึง',
    goToSignIn: 'เข้าสู่ระบบ',
    submitting: 'กำลังบันทึกข้อมูล...',
    language: 'ภาษา',
    selectLanguage: 'เลือกภาษา'
  },
  en: {
    // App & Auth
    appTitle: 'TOOLBOX OS',
    companyName: 'SNC Former Public Company Limited',
    welcome: 'Please enter your username and password',
    username: 'Username',
    password: 'Password',
    usernamePlaceholder: 'Enter your username',
    passwordPlaceholder: 'Enter your password',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    noAccountPrompt: 'Need an account or attending a training class?',
    registerButton: 'Register New Account / Trainee Sign Up',

    // Register Modal
    modalTitle: 'User Registration',
    modalSubtitle: 'SNC Former B9 Learning Hub & Operations Platform',
    tabTrainee: 'Trainee (Class Access)',
    tabWorkforce: 'Staff / Contractor / Customer',
    traineeTip: 'Enter the Class Passcode from your instructor to activate immediately.',
    workforceTip: 'Your request will be submitted to System Administrators for review and approval.',
    fullname: 'Full Name',
    phone: 'Phone Number',
    organization: 'Institution / Company',
    classCode: 'Class Passcode',
    classCodePlaceholder: 'Enter passcode from instructor',
    accountType: 'Account Type',
    accountTypeEmployee: 'Factory Staff / Subcontract',
    accountTypeContractor: 'Contractor / External QC',
    accountTypeCustomer: 'Customer / Auditor',
    accountTypeExecutive: 'HQ Executive',
    requestedRole: 'Requested Role',
    roleOperator: 'Production Operator',
    roleSupervisor: 'Line Supervisor',
    roleQc: 'Quality Control (QC)',
    roleMaintenance: 'Maintenance / PE Engineer',
    rolePlanner: 'Production Planner',
    roleContractor: 'Special Contractor',
    roleCustomer: 'Customer / Quality Auditor',
    roleExecutive: 'HQ Executive',
    empId: 'Employee ID (Optional)',
    line: 'Production Line / Area',
    lineAll: 'All Production Lines',
    purpose: 'Purpose / Reason for Access',
    purposePlaceholder: 'Briefly explain why you require system access for admin review',
    submitTrainee: 'Register & Activate Account',
    submitWorkforce: 'Submit Access Request',
    successTrainee: 'Registration Successful!',
    successWorkforce: 'Request Submitted Successfully!',
    accountTypeLabel: 'Account Type:',
    validUntil: 'Valid Until:',
    daysCount: '30 Days',
    untilDate: 'Until',
    goToSignIn: 'Proceed to Sign In',
    submitting: 'Submitting request...',
    language: 'Language',
    selectLanguage: 'Select Language'
  },
  zh: {
    // App & Auth
    appTitle: 'TOOLBOX OS',
    companyName: 'SNC Former 大众有限公司',
    welcome: '请输入您的用户名与密码',
    username: '用户名 (Username)',
    password: '密码 (Password)',
    usernamePlaceholder: '请输入用户名',
    passwordPlaceholder: '请输入密码',
    signIn: '登 录',
    signingIn: '正在登录...',
    noAccountPrompt: '还没有账号，或是参加培训的学员？',
    registerButton: '注册新账号 / 学员入口',

    // Register Modal
    modalTitle: '用户注册与申请',
    modalSubtitle: 'SNC Former B9 学习培训中心与工厂运营平台',
    tabTrainee: '培训学员 (Trainee)',
    tabWorkforce: '员工 / 承包商 / 客户',
    traineeTip: '输入培训讲师提供的班级代码，即可免审批立即激活账户。',
    workforceTip: '申请将提交给工厂系统管理员 (Admin) 审核并分配对应产线权限。',
    fullname: '真实姓名',
    phone: '联系电话',
    organization: '所属院校 / 合作公司',
    classCode: '班级代码 (Class Code)',
    classCodePlaceholder: '请输入讲师提供的班级代码',
    accountType: '用户类型',
    accountTypeEmployee: '工厂正式员工 / 承包工',
    accountTypeContractor: '外部工程商 / 外派QC',
    accountTypeCustomer: '外部客户 / 验收人员',
    accountTypeExecutive: '总部管理层',
    requestedRole: '申请角色',
    roleOperator: '生产作业员 (Operator)',
    roleSupervisor: '产线组长 (Supervisor)',
    roleQc: '品质检验员 (QC)',
    roleMaintenance: '设备维保 / PE工程师',
    rolePlanner: '生管计划员 (Planner)',
    roleContractor: '特约工程承包商',
    roleCustomer: '客户 / 验收评估员',
    roleExecutive: '总部管理层',
    empId: '员工工号 (选填)',
    line: '产线 / 责任区域',
    lineAll: '所有产线 (All Lines)',
    purpose: '申请原因与工作职责',
    purposePlaceholder: '请简要说明申请系统访问权限的工作原因，以便管理员审核',
    submitTrainee: '注册并立即开始学习',
    submitWorkforce: '提交账号开通申请',
    successTrainee: '注册成功，欢迎使用！',
    successWorkforce: '申请提交成功，请等待管理员审核！',
    accountTypeLabel: '账号类型:',
    validUntil: '有效期限:',
    daysCount: '30 天',
    untilDate: '有效期至',
    goToSignIn: '返回登录页面',
    submitting: '正在提交...',
    language: '语言',
    selectLanguage: '选择语言'
  }
};

const LanguageContext = createContext({
  lang: 'th',
  setLang: () => {},
  t: (key) => key
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'th' || saved === 'en' || saved === 'zh')) {
        return saved;
      }
    } catch (e) {
      // LocalStorage unavailable
    }
    return 'th';
  });

  const setLang = (newLang) => {
    if (newLang === 'th' || newLang === 'en' || newLang === 'zh') {
      setLangState(newLang);
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
      } catch (e) {
        // LocalStorage unavailable
      }
    }
  };

  const t = (key) => {
    const langDict = TRANSLATIONS[lang] || TRANSLATIONS.th;
    if (langDict[key] !== undefined) {
      return langDict[key];
    }
    // Fallback to English, then Thai
    if (TRANSLATIONS.en[key] !== undefined) {
      return TRANSLATIONS.en[key];
    }
    if (TRANSLATIONS.th[key] !== undefined) {
      return TRANSLATIONS.th[key];
    }
    return key;
  };

  const value = useMemo(() => ({ lang, setLang, t }), [lang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
