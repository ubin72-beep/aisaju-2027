
// js/auth.js - 회원가입/로그인
// 데모: localStorage에 저장 (운영 시 반드시 서버 /api/auth 사용 - 아래 server/auth.js 참고)
// 비밀번호는 데모에서도 평문 저장 금지 -> SHA-256 해시로 저장 (운영은 bcrypt)
async function sha256(s){ const b=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
function getUsers(){ return JSON.parse(localStorage.getItem('aisaju_users')||'[]'); }
function setUsers(u){ localStorage.setItem('aisaju_users', JSON.stringify(u)); }
function getSession(){ return JSON.parse(localStorage.getItem('aisaju_session')||'null'); }
function calcAge(birth){ const today=new Date(); let age=today.getFullYear()-new Date(birth).getFullYear(); const m=today.getMonth()-new Date(birth).getMonth(); if(m<0||(m===0&&today.getDate()<new Date(birth).getDate())) age--; return age; }
async function signup({email,password,name,birthDate,birthTime,gender,agreeTerms,agreePrivacy,parentAgree}){
  if(!agreeTerms||!agreePrivacy) throw new Error('이용약관 + 개인정보처리방침 동의가 필요해요.');
  if(!email.includes('@')) throw new Error('이메일 형식을 확인해주세요.');
  if(password.length<8) throw new Error('비밀번호는 8자 이상으로 해주세요.');
  const age=calcAge(birthDate);
  if(age<14) throw new Error('만 14세 미만은 가입할 수 없어요.');
  if(age<19 && !parentAgree) throw new Error('만 19세 미만은 법정대리인 동의가 필요해요.');
  const users=getUsers();
  if(users.find(u=>u.email===email)) throw new Error('이미 가입된 이메일이에요. 로그인해주세요.');
  const user={id:'user_'+Date.now(), email, pwHash: await sha256(password), name, birthDate, birthTime, gender, age, coins:50, role:'user', createdAt:new Date().toISOString(), status:'active', lastLogin:null, totalSpent:0, totalChats:0};
  users.push(user); setUsers(users);
  localStorage.setItem('aisaju_session', JSON.stringify({userId:user.id, email:user.email, name:user.name, role:user.role}));
  return user;
}
async function login(email,password){
  // 관리자 테스트 계정: admin@aisaju1000.com / admin1234! (데모용, 운영 시 삭제 + 서버 계정으로 대체)
  if(email==='admin@aisaju1000.com' && password==='admin1234!'){
    const admin={userId:'admin_1', email, name:'관리자', role:'admin'};
    localStorage.setItem('aisaju_session', JSON.stringify(admin)); return admin;
  }
  const users=getUsers(); const u=users.find(x=>x.email===email); if(!u) throw new Error('가입되지 않은 이메일이에요.');
  if(await sha256(password)!==u.pwHash) throw new Error('비밀번호가 틀렸어요.');
  u.lastLogin=new Date().toISOString(); setUsers(users);
  localStorage.setItem('aisaju_session', JSON.stringify({userId:u.id, email:u.email, name:u.name, role:'user'}));
  return u;
}
function logout(){ localStorage.removeItem('aisaju_session'); location.href='index.html'; }
function requireLogin(){ if(!getSession()){ alert('로그인이 필요해요.'); location.href='auth.html'; return false; } return true; }
function requireAdmin(){ const s=getSession(); if(!s||s.role!=='admin'){ alert('관리자만 접근할 수 있어요. 관리자 계정으로 로그인해주세요.'); location.href='auth.html'; return false; } return true; }
if(typeof window!=='undefined') window.Auth={signup,login,logout,getSession,requireLogin,requireAdmin,getUsers,calcAge};
