// communityStore.js - Community Knowledge, Real MES Auth & Gamification Engine
import { courses } from './courses';
import { getUserAvatarSvg, CATEGORY_OFFLINE_IMAGES, DEFAULT_COURSE_IMAGE } from './offlineAssets';

export const RANKS = [
  { level: 1, name: 'พนักงานฝึกหัด', badge: '🥉', color: 'from-amber-700 to-amber-900', border: 'border-amber-700', minExp: 0, maxExp: 99 },
  { level: 2, name: 'ช่างปฏิบัติการ', badge: '🥈', color: 'from-slate-400 to-slate-600', border: 'border-slate-400', minExp: 100, maxExp: 299 },
  { level: 3, name: 'ช่างชำนาญการ', badge: '🥇', color: 'from-amber-400 to-yellow-600', border: 'border-yellow-400', minExp: 300, maxExp: 699 },
  { level: 4, name: 'วิศวกรหน้างาน', badge: '🎖️', color: 'from-cyan-400 to-blue-600', border: 'border-cyan-400', minExp: 700, maxExp: 1499 },
  { level: 5, name: 'ปรมาจารย์โรงงาน', badge: '👑', color: 'from-fuchsia-500 to-purple-600', border: 'border-fuchsia-400', minExp: 1500, maxExp: 999999 }
];

export function calculateRank(exp = 0) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (exp >= RANKS[i].minExp) {
      const currentRank = RANKS[i];
      const nextRank = RANKS[i + 1] || null;
      const progressPercent = nextRank 
        ? Math.min(100, Math.round(((exp - currentRank.minExp) / (nextRank.minExp - currentRank.minExp)) * 100))
        : 100;
      const expNeeded = nextRank ? nextRank.minExp - exp : 0;
      return { ...currentRank, progressPercent, expNeeded, nextRank };
    }
  }
  return { ...RANKS[0], progressPercent: 0, expNeeded: 100, nextRank: RANKS[1] };
}

// Initial fallback user for demo/guest mode
const DEFAULT_USER = {
  id: 'usr-001',
  emp_id: 'EMP-5928',
  name: 'สมเกียรติ มั่นคง',
  role: 'หัวหน้ากะฝ่ายผลิต (Production Supervisor)',
  avatar: getUserAvatarSvg('สมเกียรติ มั่นคง'),
  exp: 420,
  isLoggedInReal: false,
  isAdmin: true
};

// Initial realistic community lessons with offline SVG assets
const INITIAL_POSTS = [
  {
    id: 'post-101',
    title: 'วิธีแก้ปัญหาแม่พิมพ์ Stamping เกิดรอยเสี้ยน (Burr) เกินเกณฑ์ 0.05 mm',
    category: 'เครื่องจักรและวิศวกรรมการผลิต',
    summary: 'แชร์ขั้นตอนการตรวจสอบและปรับตั้ง Die Clearance สำหรับเหล็กแผ่น SECC หนา 1.2 mm พร้อมเทคนิคการสังเกตคมตัด punch',
    coverImage: CATEGORY_OFFLINE_IMAGES['เครื่องจักรและวิศวกรรมการผลิต'],
    isOfficial: false,
    author: {
      id: 'usr-102',
      name: 'ช่างชาญชัย ศรีสุข',
      role: 'ช่างเทคนิคแม่พิมพ์อาวุโส (Tooling Lead)',
      avatar: getUserAvatarSvg('ช่างชาญชัย ศรีสุข'),
      exp: 850
    },
    createdAt: '2026-10-14T11:30:00Z',
    viewsCount: 148,
    likesCount: 24,
    likedBy: [],
    steps: [
      {
        number: 1,
        title: 'หยุดเครื่องจักรและแขวนป้าย LOTO',
        desc: 'กดปุ่ม E-Stop และตัดแหล่งจ่ายลมและไฟฟ้า พร้อมคล้องกุญแจส่วนบุคคลก่อนเปิดฝาครอบการ์ดแม่พิมพ์',
        image: '',
        alertType: 'danger',
        alertText: 'ห้ามยื่นมือเข้าไปในช่องแม่พิมพ์โดยเด็ดขาดหากยังไม่ได้คล้องกุญแจ LOTO และบล็อก Safety Block'
      },
      {
        number: 2,
        title: 'ตรวจสอบระยะ Die Clearance ด้วย Feeler Gauge',
        desc: 'วัดระยะห่างรอบทิศทางของ Punch และ Die ค่ามาตรฐานต้องอยู่ที่ 8-10% ของความหนาแผ่นเหล็ก (สำหรับแผ่น 1.2 mm ค่าต้องอยู่ระหว่าง 0.096 - 0.120 mm)',
        image: '',
        alertType: 'info',
        alertText: 'หากระยะ Clearance แคบเกินไปจะทำให้แม่พิมพ์สึกหรอเร็ว หากกว้างเกินไปจะเกิดรอย Burr ทันที'
      },
      {
        number: 3,
        title: 'ขัดลับคมตัด Punch และ Die Button',
        desc: 'ใช้หินน้ำมันเบอร์ 600 ขัดลบรอยบิ่นบริเวณมุมตัด หากพบรอยบิ่นเกิน 0.2 mm ให้แจ้งหัวหน้าเพื่อถอดส่งเจียรระนาบที่แผนก Tooling',
        image: '',
        alertType: 'success',
        alertText: 'หลังตั้งเสร็จ ให้รันชิ้นแรก (First Piece) นำไปวัดค่าความสูง Burr ด้วยไมโครมิเตอร์ก่อนเดินเครื่องเต็มระบบ'
      }
    ],
    comments: [
      {
        id: 'c-1',
        authorName: 'วีระศักดิ์ (QC)',
        authorBadge: '🥇 ช่างชำนาญการ',
        content: 'สูตรคิด 8-10% ของความหนานี่ใช้ได้จริงมากครับ เมื่อวานช่วยแก้ปัญหาหน้างานกะดึกได้เร็วขึ้นเยอะเลย',
        createdAt: '2026-10-14T15:20:00Z'
      }
    ]
  },
  {
    id: 'post-102',
    title: 'วิธีสแกนรับพาเลทในระบบ MES เมื่อบาร์โค้ดฉีกขาดหรือไม่ชัดเจน',
    category: 'โปรแกรมและระบบดิจิทัล',
    summary: 'แนวทางปฏิบัติเมื่อเครื่องสแกน 2D ไม่สามารถอ่าน QR Code ของแท็ก RM/FG ได้ เพื่อไม่ให้สายการผลิตสะดุดและสต็อกไม่คลาดเคลื่อน',
    coverImage: CATEGORY_OFFLINE_IMAGES['โปรแกรมและระบบดิจิทัล'],
    isOfficial: false,
    author: {
      id: 'usr-103',
      name: 'หัวหน้ากฤษณะ แสงทอง',
      role: 'ผู้จัดการคลังสินค้าและระบบสโตร์ (Store Manager)',
      avatar: getUserAvatarSvg('กฤษณะ แสงทอง'),
      exp: 1120
    },
    createdAt: '2026-10-13T09:15:00Z',
    viewsCount: 230,
    likesCount: 38,
    likedBy: [],
    steps: [
      {
        number: 1,
        title: 'ใช้ฟังก์ชันค้นหาด้วย Manual Tag Serial',
        desc: 'บนหน้าจอ MES ให้แตะที่ไอคอนคีย์บอร์ด [ป้อนรหัสเอง] แล้วพิมพ์ตัวเลข 12 หลักที่พิมพ์อยู่ใต้แท็กบาร์โค้ด',
        image: '',
        alertType: 'info',
        alertText: 'ตัวเลขใต้แท็กจะไม่เลือนหายไปเหมือนหมึกแถบบาร์โค้ด ตรวจสอบรหัส Part No. บนหน้าจอให้ตรงกับป้ายจริง'
      },
      {
        number: 2,
        title: 'ออกบัตรแท็กทดแทน (Re-print QR Tag)',
        desc: 'กดปุ่ม [พิมพ์แท็กทดแทน] ที่เครื่องพิมพ์โมบายล์หน้างาน นำแท็กใหม่มาติดทับตำแหน่งเดิมทันที',
        image: '',
        alertType: 'warning',
        alertText: 'ห้ามนำแท็กเก่าที่ฉีกขาดไปทิ้งในถังขยะ ให้ฉีกทำลาย QR Code เดิมเพื่อป้องกันการหยิบไปสแกนซ้ำซ้อน'
      }
    ],
    comments: [
      {
        id: 'c-2',
        authorName: 'อนุชา (ช่างคลัง)',
        authorBadge: '🥈 ช่างปฏิบัติการ',
        content: 'ขอบคุณครับ สบายใจขึ้นเยอะเลย ปกติต้องวิ่งไปตามพี่กฤษณะมาช่วยดูทุกที',
        createdAt: '2026-10-13T10:45:00Z'
      }
    ]
  },
  {
    id: 'post-103',
    title: 'Checklist 5 จุดตรวจเช็กระดับน้ำมันไฮดรอลิกและลมรั่วก่อนเริ่มงานกะเช้า',
    category: 'ขั้นตอนการทำงานและระบบมาตรฐาน',
    summary: 'แบบฟอร์มตรวจสอบก่อนเดินเครื่องจักรประจำวัน (Daily Pre-operation Inspection) เพื่อป้องกันเครื่องหยุดทำงานกะทันหัน (Unplanned Downtime)',
    coverImage: CATEGORY_OFFLINE_IMAGES['ขั้นตอนการทำงานและระบบมาตรฐาน'],
    isOfficial: false,
    author: {
      id: 'usr-001',
      name: 'สมเกียรติ มั่นคง',
      role: 'หัวหน้ากะฝ่ายผลิต (Production Supervisor)',
      avatar: getUserAvatarSvg('สมเกียรติ มั่นคง'),
      exp: 420
    },
    createdAt: '2026-10-12T07:45:00Z',
    viewsCount: 310,
    likesCount: 45,
    likedBy: [],
    steps: [
      {
        number: 1,
        title: 'ตรวจสอบเกจวัดระดับน้ำมันไฮดรอลิก (Sight Glass)',
        desc: 'ระดับน้ำมันต้องอยู่ระหว่างขีดกึ่งกลาง (เขียว) หากต่ำกว่าขีดแดงให้แจ้งช่าง PM เติมน้ำมันเบอร์ ISO VG 68 ทันที',
        image: '',
        alertType: 'danger',
        alertText: 'ห้ามเปิดเครื่องเดินงานเด็ดขาดหากระดับน้ำมันต่ำกว่าเกจ เพราะปั๊มไฮดรอลิกจะเกิดการ Cavitation และไหม้ภายใน 5 นาที'
      },
      {
        number: 2,
        title: 'ฟังเสียงลมรั่วบริเวณข้อต่อกระบอกลม (Air Leakage Check)',
        desc: 'เปิดวาล์วลมหลักที่ 0.6 MPa แล้วเดินฟังเสียงรอบเครื่องจักร หากพบจุดลมฟู่ให้ฉีดน้ำสบู่เพื่อหาตำแหน่งรั่วซึม',
        image: '',
        alertType: 'info',
        alertText: 'การลดลมรั่ว 1 จุดขนาด 1 mm ช่วยประหยัดค่าไฟโรงงานได้กว่า 12,000 บาทต่อปี'
      }
    ],
    comments: []
  }
];

// --- REAL MES AUTHENTICATION & GRADING BRIDGE ---
export function getUserGrading() {
  try {
    const stored = localStorage.getItem('mes_learning_user_grading');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveUserGrading(grading) {
  if (grading) {
    localStorage.setItem('mes_learning_user_grading', JSON.stringify(grading));
  }
}

export async function fetchRealUserSession() {
  const activeEmpId = localStorage.getItem('mes_learning_active_emp_id') || '';
  const empParam = activeEmpId ? `&emp_id=${encodeURIComponent(activeEmpId)}` : '';

  // Priority candidate endpoint paths
  const candidateEndpoints = [
    `../MES/MES/page/manpower/api/api_learning.php?action=get_current_user${empParam}`,
    `../page/manpower/api/api_learning.php?action=get_current_user${empParam}`,
    '../MES/MES/auth/api_verify.php?silent=1',
    '../auth/api_verify.php?silent=1'
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include'
      });

      if (res.ok) {
        const json = await res.json();
        
        // Response format 1: from api_learning.php (with grading)
        if (json && json.success && json.data && json.data.user) {
          const u = json.data.user;
          const grading = json.data.grading || null;
          saveUserGrading(grading);

          const realUserId = u.emp_id || u.id || 'usr-real';
          const userExpKey = `mes_learning_exp_${realUserId}`;
          const storedExp = localStorage.getItem(userExpKey);
          const exp = storedExp !== null ? parseInt(storedExp, 10) : (u.exp || 450);

          const synchedUser = {
            id: realUserId,
            emp_id: u.emp_id || 'EMP-MES',
            name: u.name || 'MES Employee',
            role: u.role || 'ช่างเทคนิคโรงงาน',
            line: u.line || 'PRODUCTION',
            team_group: u.team_group || 'A',
            department: u.department || u.line || 'ฝ่ายผลิต',
            avatar: u.profile_picture || getUserAvatarSvg(u.name || 'MES'),
            exp: exp,
            isLoggedInReal: true,
            isAdmin: true,
            grading: grading
          };

          saveCurrentUser(synchedUser);
          console.log('[MES Learning Hub] Live User & Grading synchronized via:', endpoint);
          return synchedUser;
        }

        // Response format 2: from auth/api_verify.php
        if (json && json.success && json.user) {
          const u = json.user;
          const realUserId = u.emp_id || u.id || u.username || 'usr-real';
          
          const userExpKey = `mes_learning_exp_${realUserId}`;
          const storedExp = localStorage.getItem(userExpKey);
          const exp = storedExp !== null ? parseInt(storedExp, 10) : 450;

          const synchedUser = {
            id: realUserId,
            emp_id: u.emp_id || u.username || 'EMP-MES',
            name: u.fullname || u.username || 'MES Employee',
            role: u.position || u.role || 'ช่างเทคนิคโรงงาน',
            line: u.line || 'PRODUCTION',
            team_group: u.team_group || 'A',
            department: u.line || 'ฝ่ายผลิต',
            avatar: u.profile_picture || getUserAvatarSvg(u.fullname || u.username || 'MES'),
            exp: exp,
            isLoggedInReal: true,
            isAdmin: true
          };

          saveCurrentUser(synchedUser);
          console.log('[MES Learning Hub] Authenticated session confirmed via:', endpoint);
          return synchedUser;
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  return getCurrentUser();
}

// Fetch list of active factory employees for selector / directory
export async function fetchEmployeesList(search = '', line = 'ALL') {
  const candidateEndpoints = [
    `../MES/MES/page/manpower/api/api_learning.php?action=get_employees&q=${encodeURIComponent(search)}&line=${encodeURIComponent(line)}`,
    `../page/manpower/api/api_learning.php?action=get_employees&q=${encodeURIComponent(search)}&line=${encodeURIComponent(line)}`
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include'
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data) {
          return json.data;
        }
      }
    } catch {
      // Continue
    }
  }
  return { employees: [], lines: [] };
}

// Switch active user identity to another factory employee
export async function switchActiveEmployee(empId) {
  if (empId) {
    localStorage.setItem('mes_learning_active_emp_id', empId);
  } else {
    localStorage.removeItem('mes_learning_active_emp_id');
  }
  return await fetchRealUserSession();
}

// Helper functions for LocalStorage management
export function getCommunityPosts() {
  const stored = localStorage.getItem('mes_learning_community_posts');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return INITIAL_POSTS;
    }
  }
  localStorage.setItem('mes_learning_community_posts', JSON.stringify(INITIAL_POSTS));
  return INITIAL_POSTS;
}

export function saveCommunityPosts(posts) {
  localStorage.setItem('mes_learning_community_posts', JSON.stringify(posts));
}

export function getCurrentUser() {
  const stored = localStorage.getItem('mes_learning_current_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_USER;
    }
  }
  localStorage.setItem('mes_learning_current_user', JSON.stringify(DEFAULT_USER));
  return DEFAULT_USER;
}

export function saveCurrentUser(user) {
  localStorage.setItem('mes_learning_current_user', JSON.stringify(user));
  if (user && user.id) {
    localStorage.setItem(`mes_learning_exp_${user.id}`, String(user.exp || 0));
  }
}

export function addExp(points, reason = '') {
  const user = getCurrentUser();
  user.exp = (user.exp || 0) + points;
  saveCurrentUser(user);
  return { newExp: user.exp, rank: calculateRank(user.exp), pointsAdded: points, reason };
}

export function createCommunityPost(postData) {
  const posts = getCommunityPosts();
  const user = getCurrentUser();

  const newPost = {
    id: `post-${Date.now()}`,
    title: postData.title,
    category: postData.category || 'เทคนิคและการแก้ปัญหาหน้างาน',
    summary: postData.summary || '',
    coverImage: postData.coverImage || CATEGORY_OFFLINE_IMAGES[postData.category] || DEFAULT_COURSE_IMAGE,
    isOfficial: false,
    author: {
      id: user.id,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      exp: user.exp
    },
    createdAt: new Date().toISOString(),
    viewsCount: 1,
    likesCount: 0,
    likedBy: [],
    steps: postData.steps || [],
    comments: []
  };

  posts.unshift(newPost);
  saveCommunityPosts(posts);

  // Award 50 EXP for creating a post
  addExp(50, 'สร้างบทเรียนความรู้ใหม่');

  return newPost;
}

export function likeCommunityPost(postId) {
  const posts = getCommunityPosts();
  const user = getCurrentUser();
  const postIndex = posts.findIndex(p => p.id === postId);

  if (postIndex === -1) return null;

  const post = posts[postIndex];
  const alreadyLiked = post.likedBy?.includes(user.id);

  if (alreadyLiked) {
    post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
    post.likedBy = post.likedBy.filter(id => id !== user.id);
  } else {
    post.likesCount = (post.likesCount || 0) + 1;
    post.likedBy = post.likedBy || [];
    post.likedBy.push(user.id);

    if (post.author.id !== user.id) {
      addExp(5, 'ได้รับคะแนนเป็นประโยชน์จากเพื่อนร่วมงาน');
    }
  }

  posts[postIndex] = post;
  saveCommunityPosts(posts);
  return post;
}

export function addPostComment(postId, commentText) {
  const posts = getCommunityPosts();
  const user = getCurrentUser();
  const rank = calculateRank(user.exp);
  const postIndex = posts.findIndex(p => p.id === postId);

  if (postIndex === -1) return null;

  const newComment = {
    id: `c-${Date.now()}`,
    authorName: user.name,
    authorBadge: `${rank.badge} ${rank.name}`,
    content: commentText,
    createdAt: new Date().toISOString()
  };

  posts[postIndex].comments = posts[postIndex].comments || [];
  posts[postIndex].comments.push(newComment);
  saveCommunityPosts(posts);

  // Award +5 EXP for participating in discussion
  addExp(5, 'ร่วมแลกเปลี่ยนความคิดเห็น');

  return newComment;
}

// --- PROMOTE COMMUNITY GUIDE TO OFFICIAL CURRICULUM ---
export function promotePostToOfficialCourse(postId, options = {}) {
  const posts = getCommunityPosts();
  const postIndex = posts.findIndex(p => p.id === postId);
  if (postIndex === -1) return null;

  const post = posts[postIndex];
  const category = options.category || post.category;
  const duration = options.duration || `${Math.max(15, (post.steps?.length || 1) * 8)} นาที`;

  // 1. Mark post as official
  post.isOfficial = true;
  post.promotedAt = new Date().toISOString();
  post.promotedCategory = category;
  posts[postIndex] = post;
  saveCommunityPosts(posts);

  // 2. Generate standard course structure
  const officialCourseId = `c-promoted-${post.id}`;
  const newOfficialCourse = {
    id: officialCourseId,
    title: post.title,
    description: post.summary,
    instructor: `${post.author.name} · ${post.author.role}`,
    duration: duration,
    category: category,
    image: post.coverImage || CATEGORY_OFFLINE_IMAGES[category] || DEFAULT_COURSE_IMAGE,
    isOfficial: true,
    isPromotedFromCommunity: true,
    originalPostId: post.id,
    author: post.author,
    modules: [
      {
        id: 'm1',
        title: `1. คู่มือปฏิบัติงานและขั้นตอนมาตรฐาน: ${post.title}`,
        isDynamic: true,
        steps: post.steps || [],
        summary: post.summary,
        coverImage: post.coverImage
      }
    ]
  };

  saveCustomCourse(newOfficialCourse);

  // 3. Award big bonus +200 EXP to the author for achieving official status!
  addExp(200, 'บทเรียนได้รับการรับรองเป็นหลักสูตรมาตรฐานโรงงาน (+200 EXP)');

  return { post, course: newOfficialCourse };
}

// --- ADMIN COURSE BUILDER STORE ---
export function getCustomCourses() {
  const stored = localStorage.getItem('mes_learning_custom_courses');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export function saveCustomCourse(course) {
  const courses = getCustomCourses();
  const existingIdx = courses.findIndex(c => c.id === course.id);
  if (existingIdx !== -1) {
    courses[existingIdx] = course;
  } else {
    courses.unshift(course);
  }
  localStorage.setItem('mes_learning_custom_courses', JSON.stringify(courses));
  return course;
}

export function deleteCustomCourse(courseId) {
  let courses = getCustomCourses();
  courses = courses.filter(c => c.id !== courseId);
  localStorage.setItem('mes_learning_custom_courses', JSON.stringify(courses));
}

export function getAllMergedCourses() {
  const customCourses = getCustomCourses();
  const customMap = new Map(customCourses.map(c => [c.id, c]));
  // If custom course has same id as a static course, custom overrides it
  const staticFiltered = courses.filter(c => !customMap.has(c.id));
  return [...customCourses, ...staticFiltered];
}

export function getCourseById(courseId) {
  if (!courseId) return null;
  const customCourses = getCustomCourses();
  const custom = customCourses.find(c => c.id === courseId);
  if (custom) return JSON.parse(JSON.stringify(custom));

  const staticCourse = courses.find(c => c.id === courseId);
  if (staticCourse) return JSON.parse(JSON.stringify(staticCourse));
  return null;
}

export function getLeaderboardData() {
  const posts = getCommunityPosts();
  const currentUser = getCurrentUser();

  const userMap = {};

  const mockAuthors = [
    { id: 'usr-103', name: 'หัวหน้ากฤษณะ แสงทอง', role: 'ผู้จัดการคลังสินค้า (Store Manager)', exp: 1120, avatar: getUserAvatarSvg('กฤษณะ แสงทอง') },
    { id: 'usr-102', name: 'ช่างชาญชัย ศรีสุข', role: 'ช่างเทคนิคแม่พิมพ์ (Tooling Lead)', exp: 850, avatar: getUserAvatarSvg('ช่างชาญชัย ศรีสุข') },
    { id: 'usr-104', name: 'ประภาพร รัตนศิลป์', role: 'วิศวกรควบคุมคุณภาพ (QA Engineer)', exp: 680, avatar: getUserAvatarSvg('ประภาพร รัตนศิลป์') },
    { id: 'usr-105', name: 'ธวัชชัย บำรุงการ', role: 'ช่างซ่อมบำรุง (Maintenance)', exp: 340, avatar: getUserAvatarSvg('ธวัชชัย บำรุงการ') }
  ];

  mockAuthors.forEach(u => {
    userMap[u.id] = { ...u, postsCount: 0, likesReceived: 0 };
  });

  userMap[currentUser.id] = {
    ...currentUser,
    postsCount: 0,
    likesReceived: 0
  };

  posts.forEach(post => {
    if (userMap[post.author.id]) {
      userMap[post.author.id].postsCount += 1;
      userMap[post.author.id].likesReceived += (post.likesCount || 0);
    }
  });

  return Object.values(userMap)
    .map(u => ({
      ...u,
      rank: calculateRank(u.exp)
    }))
    .sort((a, b) => b.exp - a.exp);
}
