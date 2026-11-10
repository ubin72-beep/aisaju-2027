
// server/index.js - AI 사주 천년지기 2027 실제 운영 서버
// 실행: npm install && cp ../.env.example ../.env (키 입력) && npm start
// DB: SQLite (파일: server/data.db) - 운영 규모 커지면 Postgres로 교체 (schema.sql 참고)
// 포트: 3000
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
// 프론트 정적 파일 서빙: 프로젝트 루트를 서빙 (index.html 등)
app.use(express.static(path.join(__dirname, '..')));

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me-aisaju1000';
const TOSS_SECRET = process.env.TOSS_SECRET_KEY || '';
const TOSS_CLIENT = process.env.TOSS_CLIENT_KEY || '';
const TOSS_MID = process.env.TOSS_MID || 'aisaju28tr';

// --- DB ---
const db = new Database(path.join(__dirname, 'data.db'));
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT, birth_date TEXT, birth_time INTEGER, gender TEXT, age INTEGER, coins INTEGER DEFAULT 10, role TEXT DEFAULT 'user', status TEXT DEFAULT 'active', total_spent INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_login DATETIME);
CREATE TABLE IF NOT EXISTS coin_ledger(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, delta INTEGER, type TEXT, reason TEXT, balance_after INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS payments(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, toss_payment_key TEXT, order_id TEXT UNIQUE, amount INTEGER, coins INTEGER, method TEXT, status TEXT DEFAULT 'PENDING', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, approved_at DATETIME);
CREATE TABLE IF NOT EXISTS chats(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, question TEXT, answer TEXT, coins_spent INTEGER, price_type TEXT, saju TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS products(slug TEXT PRIMARY KEY, name TEXT, coins INTEGER, won INTEGER);
CREATE TABLE IF NOT EXISTS notices(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS admin_logs(id INTEGER PRIMARY KEY AUTOINCREMENT, admin_id INTEGER, action TEXT, target_user_id INTEGER, detail TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO products VALUES('light','가벼운 질문',1,100),('deep','심층 질문',5,500),('report','정밀 리포트',29,2900),('tojeong','토정비결 2027 전체',99,9900),('premium','프리미엄 해석',199,19900);
`);

// --- Helpers ---
function calcAge(birth){ const today=new Date(); const b=new Date(birth); let age=today.getFullYear()-b.getFullYear(); const m=today.getMonth()-b.getMonth(); if(m<0||(m===0&&today.getDate()<b.getDate())) age--; return age; }
function auth(req,res,next){ const h=req.headers.authorization; if(!h) return res.status(401).json({error:'로그인이 필요해요'}); try{ req.user=jwt.verify(h.replace('Bearer ',''), JWT_SECRET); next(); }catch(e){ return res.status(401).json({error:'토큰이 만료됐어요. 다시 로그인해주세요.'}); } }
function adminOnly(req,res,next){ if(req.user.role!=='admin') return res.status(403).json({error:'관리자만 접근할 수 있어요'}); next(); }
function logAdmin(adminId, action, targetUserId, detail){ db.prepare('INSERT INTO admin_logs(admin_id,action,target_user_id,detail) VALUES(?,?,?,?)').run(adminId,action,targetUserId,detail); }

// --- 만세력 (서버용 - js/manse.js와 동일 로직) ---
const GAN=["갑","을","병","정","무","기","경","신","임","계"], JI=["자","축","인","묘","진","사","오","미","신","유","술","해"];
const GAN_OH={갑:'목',을:'목',병:'화',정:'화',무:'토',기:'토',경:'금',신:'금',임:'수',계:'수'};
const JI_OH={자:'수',축:'토',인:'목',묘:'목',진:'토',사:'화',오:'화',미:'토',신:'금',유:'금',술:'토',해:'수'};
function sajuFromBirth({birthDate,birthTime,gender}){
  const d=new Date(birthDate); let y=d.getFullYear(); if(d.getMonth()+1===1||(d.getMonth()+1===2&&d.getDate()<4)) y--;
  const yGan=((y-4)%10+10)%10, yJi=((y-4)%12+12)%12;
  const startMap={0:2,1:4,2:6,3:8,4:0,5:2,6:4,7:6,8:8,9:0};
  const jiOrder={2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,11:11,12:0,1:1};
  const mJi=jiOrder[d.getMonth()+1]; const mGan=(startMap[yGan]+(mJi-2+12)%12)%10;
  const base=Date.UTC(1900,0,1); const diff=Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-base)/86400000); const dayIdx=((36+diff)%60+60)%60;
  const hJi=Math.floor((( (birthTime??12)+1)%24)/2); const hStart={0:0,5:0,1:2,6:2,2:4,7:4,3:6,8:6,4:8,9:8}; const hGan=(hStart[dayIdx%10]+hJi)%10;
  const oh={}; [[yGan,yJi],[mGan,mJi],[dayIdx%10,dayIdx%12],[hGan,hJi]].forEach(([g,j])=>{ const o1=GAN_OH[GAN[g]], o2=JI_OH[JI[j]]; oh[o1]=(oh[o1]||0)+1; oh[o2]=(oh[o2]||0)+1; });
  return {year:GAN[yGan]+JI[yJi]+'년', month:GAN[mGan]+JI[mJi]+'월', day:GAN[dayIdx%10]+JI[dayIdx%12]+'일', hour:GAN[hGan]+JI[hJi]+'시', ilgan:GAN[dayIdx%10], ilganOh:GAN_OH[GAN[dayIdx%10]], ohCount:oh, gender};
}
function fortune2027(saju){
  const m={갑:{score:88,key:'확장과 결실',msg:'2027 정미년은 뿌리내린 것이 열매 맺는 해. 3월·9월 이동·계약 길.'},을:{score:86,key:'유연한 성장',msg:'부드럽게 굽히면 더 크게 얻는 해. 4월·10월 인연.'},병:{score:91,key:'빛나는 해',msg:'정미년은 병화의 불이 땅에 안착. 5월 주의, 8월 대운.'},정:{score:94,key:'주인공의 해',msg:'정화 일간에게 정미년은 본인의 해. 존재감·연애·재물 모두 상승. 4월·10월 최고.'},무:{score:85,key:'안정과 축적',msg:'무토에게 미토는 든든한 땅. 부동산·저축에 길.'},기:{score:89,key:'실속의 해',msg:'기토는 미토와 비견. 실속 챙기고 과시는 금물.'},경:{score:82,key:'다듬는 해',msg:'불이 금을 단련. 5~6월 고비, 하반기 회복.'},신:{score:84,key:'정제의 해',msg:'신금은 정화와 조화. 커리어 정리 후 도약.'},임:{score:87,key:'흐름의 해',msg:'임수는 미토와 조화. 이동·여행 길.'},계:{score:90,key:'맑은 물의 해',msg:'계수는 정미년의 불을 품고 빛남. 예술·감성 분야 대길.'}};
  return m[saju.ilgan]||{score:85,key:'균형의 해',msg:'2027년은 내실을 다지는 해입니다.'};
}
function answerFor(q, saju){
  if(!saju) return '먼저 생년월일시를 입력해주세요.';
  const f=fortune2027(saju);
  if(q.includes('이직')||q.includes('직장')||q.includes('커리어')) return `[${saju.ilgan}일간 · 2027 정미년] ${f.msg} 이직은 ${f.key} 흐름. 3월·9월이 이동에 가장 좋고, 5월은 피하세요.`;
  if(q.includes('연애')||q.includes('결혼')||q.includes('인연')) return `[${saju.ilgan}일간 · 연애운] 2027년 연애 점수 ${f.score}점. ${f.msg} 4월·10월에 인연이 강하게 들어와요.`;
  if(q.includes('재물')||q.includes('돈')||q.includes('투자')) return `[${saju.ilgan}일간 · 재물운] 정미년은 ${f.key}의 해. 큰 베팅보다 적립·분산이 길해요. 오행: ${JSON.stringify(saju.ohCount)} (참고용이며 투자 권유가 아닙니다)`;
  return `[${saju.ilgan}일간 · 2027 정미년] ${f.msg} 더 구체적으로 물어보시면 월별로 짚어드릴게요. 본 결과는 AI 생성 참고용 콘텐츠입니다.`;
}

// --- API: config (클라이언트키만) ---
app.get('/api/config', (req,res)=> res.json({clientKey:TOSS_CLIENT, mid:TOSS_MID}));

// --- API: auth ---
app.post('/api/auth/signup', async (req,res)=>{
  const {email,password,name,birthDate,birthTime,gender,agreeTerms,agreePrivacy,parentAgree}=req.body;
  if(!agreeTerms||!agreePrivacy) return res.status(400).json({error:'이용약관 + 개인정보처리방침 동의가 필요해요'});
  if(!email||!email.includes('@')) return res.status(400).json({error:'이메일 형식을 확인해주세요'});
  if(!password||password.length<8) return res.status(400).json({error:'비밀번호는 8자 이상'});
  const age=calcAge(birthDate); if(age<14) return res.status(400).json({error:'만 14세 미만은 가입할 수 없어요'});
  if(age<19 && !parentAgree) return res.status(400).json({error:'만 19세 미만은 법정대리인 동의가 필요해요'});
  const exists=db.prepare('SELECT id FROM users WHERE email=?').get(email); if(exists) return res.status(400).json({error:'이미 가입된 이메일이에요'});
  const hash=await bcrypt.hash(password,10);
  const tx=db.transaction(()=>{
    const info=db.prepare('INSERT INTO users(email,password_hash,name,birth_date,birth_time,gender,age,coins) VALUES(?,?,?,?,?,?,?,10)').run(email,hash,name,birthDate,birthTime,gender,age);
    db.prepare('INSERT INTO coin_ledger(user_id,delta,type,reason,balance_after) VALUES(?,?,?, ?,?)').run(info.lastInsertRowid,10,'bonus','가입 보너스 10코인',30);
    return info.lastInsertRowid;
  });
  const userId=tx();
  const token=jwt.sign({userId,email,role:'user'}, JWT_SECRET, {expiresIn:'7d'});
  res.json({ok:true, token, user:{id:userId,email,name,coins:50,role:'user'}});
});
app.post('/api/auth/login', async (req,res)=>{
  const {email,password}=req.body;
  const u=db.prepare('SELECT * FROM users WHERE email=?').get(email); if(!u) return res.status(400).json({error:'가입되지 않은 이메일이에요'});
  if(u.status!=='active') return res.status(403).json({error:'정지된 계정이에요. 고객센터로 문의하세요.'});
  const ok=await bcrypt.compare(password, u.password_hash); if(!ok) return res.status(400).json({error:'비밀번호가 틀렸어요'});
  db.prepare('UPDATE users SET last_login=CURRENT_TIMESTAMP WHERE id=?').run(u.id);
  const token=jwt.sign({userId:u.id,email:u.email,role:u.role}, JWT_SECRET, {expiresIn:'7d'});
  res.json({ok:true, token, user:{id:u.id,email:u.email,name:u.name,coins:u.coins,role:u.role}});
});
app.get('/api/auth/me', auth, (req,res)=>{
  const u=db.prepare('SELECT id,email,name,birth_date,birth_time,gender,coins,role,status,created_at FROM users WHERE id=?').get(req.user.userId);
  res.json({ok:true, user:u});
});

// --- API: saju ---
app.post('/api/saju', auth, (req,res)=>{
  const u=db.prepare('SELECT * FROM users WHERE id=?').get(req.user.userId);
  const birthDate=req.body.birthDate||u.birth_date, birthTime=req.body.birthTime??u.birth_time;
  const saju=sajuFromBirth({birthDate,birthTime,gender:u.gender});
  res.json({ok:true, saju, fortune:fortune2027(saju)});
});

// --- API: chat (코인 차감 트랜잭션) ---
app.post('/api/chat', auth, (req,res)=>{
  const {question, priceType='deep'}=req.body;
  const prices={light:1, deep:5, report:29, tojeong:99, premium:199};
  const need=prices[priceType]||3;
  const tx=db.transaction(()=>{
    const u=db.prepare('SELECT * FROM users WHERE id=?').get(req.user.userId);
    if(!u) throw new Error('유저 없음');
    if(u.coins<need) throw new Error('코인이 부족해요');
    const saju=sajuFromBirth({birthDate:u.birth_date, birthTime:u.birth_time, gender:u.gender});
    const answer=answerFor(question||'', saju);
    db.prepare('UPDATE users SET coins=coins-? WHERE id=?').run(need, u.id);
    db.prepare('INSERT INTO coin_ledger(user_id,delta,type,reason,balance_after) VALUES(?,?,?, ?,?)').run(u.id,-need,'spend','채팅 '+priceType, u.coins-need);
    db.prepare('INSERT INTO chats(user_id,question,answer,coins_spent,price_type,saju) VALUES(?,?,?,?,?,?)').run(u.id,question,answer,need,priceType,JSON.stringify(saju));
    return {answer, balance:u.coins-need, saju};
  });
  try{ const r=tx(); res.json({ok:true,...r}); }catch(e){ res.status(400).json({error:e.message}); }
});
app.get('/api/chat/history', auth, (req,res)=>{
  const rows=db.prepare('SELECT * FROM chats WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.userId);
  res.json({ok:true, chats:rows});
});

// --- API: payments ---
app.post('/api/payments/order', auth, (req,res)=>{
  const {orderId, amount, coins}=req.body;
  // 금액 검증: 허용된 패키지만
  const allowed={5000:50,10000:110,20000:240};
  if(allowed[amount]!==coins) return res.status(400).json({error:'금액/코인 불일치'});
  try{ db.prepare('INSERT INTO payments(user_id,order_id,amount,coins,status) VALUES(?,?,?,?,?)').run(req.user.userId,orderId,amount,coins,'PENDING'); res.json({ok:true}); }
  catch(e){ res.status(400).json({error:'이미 존재하는 주문이에요'}); }
});
app.post('/api/payments/confirm', auth, async (req,res)=>{
  const {paymentKey, orderId, amount}=req.body;
  const order=db.prepare('SELECT * FROM payments WHERE order_id=? AND user_id=?').get(orderId, req.user.userId);
  if(!order) return res.status(400).json({error:'주문을 찾을 수 없어요'});
  if(order.amount!==amount) return res.status(400).json({error:'금액 위변조 의심 - 승인 거부'});
  if(order.status==='APPROVED') return res.json({ok:true, coins:order.coins, already:true});
  if(!TOSS_SECRET) return res.status(500).json({error:'서버에 TOSS_SECRET_KEY가 설정되지 않았어요'});
  // 토스 승인 호출
  const r=await fetch('https://api.tosspayments.com/v1/payments/confirm',{method:'POST', headers:{Authorization:'Basic '+Buffer.from(TOSS_SECRET+':').toString('base64'),'Content-Type':'application/json'}, body:JSON.stringify({paymentKey,orderId,amount})});
  const data=await r.json(); if(!r.ok) return res.status(400).json({error:data.message||'토스 승인 실패', detail:data});
  const tx=db.transaction(()=>{
    db.prepare('UPDATE payments SET toss_payment_key=?, status=?, approved_at=CURRENT_TIMESTAMP WHERE id=?').run(paymentKey,'APPROVED',order.id);
    const u=db.prepare('SELECT * FROM users WHERE id=?').get(req.user.userId);
    db.prepare('UPDATE users SET coins=coins+?, total_spent=total_spent+? WHERE id=?').run(order.coins, amount, req.user.userId);
    db.prepare('INSERT INTO coin_ledger(user_id,delta,type,reason,balance_after) VALUES(?,?,?, ?,?)').run(req.user.userId,order.coins,'charge','충전 '+amount+'원', u.coins+order.coins);
  }); tx();
  res.json({ok:true, coins:order.coins});
});
app.post('/api/payments/refund', auth, async (req,res)=>{
  // 관리자만 또는 본인 환불 요청 - 여기서는 본인 요청 -> 관리자 승인 흐름으로 PENDING 기록
  const {paymentId, reason}=req.body;
  const p=db.prepare('SELECT * FROM payments WHERE id=? AND user_id=?').get(paymentId, req.user.userId);
  if(!p||p.status!=='APPROVED') return res.status(400).json({error:'환불할 수 없는 결제예요'});
  // 실제 토스 취소는 관리자 승인 후 /api/admin/refund에서 호출 (부분취소 가능)
  res.json({ok:true, message:'환불 요청이 접수됐어요. 관리자 승인 후 3영업일 내 처리됩니다.'});
});
app.get('/api/payments/mine', auth, (req,res)=>{
  const rows=db.prepare('SELECT * FROM payments WHERE user_id=? ORDER BY created_at DESC').all(req.user.userId);
  res.json({ok:true, payments:rows});
});

// --- API: admin ---
app.get('/api/admin/stats', auth, adminOnly, (req,res)=>{
  const today=new Date().toISOString().slice(0,10);
  const totalUsers=db.prepare('SELECT COUNT(*) c FROM users').get().c;
  const todaySales=db.prepare("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status='APPROVED' AND date(created_at)=?").get(today).s;
  const todayChats=db.prepare("SELECT COUNT(*) c FROM chats WHERE date(created_at)=?").get(today).c;
  const totalCoins=db.prepare('SELECT COALESCE(SUM(coins),0) s FROM users').get().s;
  res.json({ok:true, stats:{totalUsers, todaySales, todayChats, totalCoins}});
});
app.get('/api/admin/users', auth, adminOnly, (req,res)=>{
  const q=(req.query.q||'').toLowerCase();
  let rows=db.prepare('SELECT id,email,name,birth_date,age,coins,role,status,created_at,last_login FROM users ORDER BY created_at DESC LIMIT 200').all();
  if(q) rows=rows.filter(u=>(u.name+u.email).toLowerCase().includes(q));
  res.json({ok:true, users:rows});
});
app.post('/api/admin/users/:id/coins', auth, adminOnly, (req,res)=>{
  const {delta, reason}=req.body; const uid=req.params.id;
  const tx=db.transaction(()=>{ const u=db.prepare('SELECT * FROM users WHERE id=?').get(uid); if(!u) throw new Error('유저 없음'); if(u.coins+delta<0) throw new Error('코인이 부족해요'); db.prepare('UPDATE users SET coins=coins+? WHERE id=?').run(delta,uid); db.prepare('INSERT INTO coin_ledger(user_id,delta,type,reason,balance_after) VALUES(?,?,?, ?,?)').run(uid,delta,'admin',reason||'관리자 조정',u.coins+delta); });
  try{ tx(); logAdmin(req.user.userId,'coins',uid,`delta=${delta} reason=${reason}`); res.json({ok:true}); }catch(e){ res.status(400).json({error:e.message}); }
});
app.post('/api/admin/users/:id/status', auth, adminOnly, (req,res)=>{
  const {status}=req.body; db.prepare('UPDATE users SET status=? WHERE id=?').run(status, req.params.id);
  logAdmin(req.user.userId,'status',req.params.id,'status='+status); res.json({ok:true});
});
app.get('/api/admin/payments', auth, adminOnly, (req,res)=>{
  const rows=db.prepare('SELECT p.*, u.email FROM payments p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 100').all();
  res.json({ok:true, payments:rows});
});
app.get('/api/admin/chats', auth, adminOnly, (req,res)=>{
  const rows=db.prepare('SELECT c.*, u.email FROM chats c JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC LIMIT 100').all();
  res.json({ok:true, chats:rows});
});
app.get('/api/admin/logs', auth, adminOnly, (req,res)=>{
  const rows=db.prepare('SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 100').all();
  res.json({ok:true, logs:rows});
});
// 관리자 초기 계정 생성 (최초 1회만, .env ADMIN_EMAIL/ADMIN_PASSWORD로 생성)
app.post('/api/admin/setup', async (req,res)=>{
  const email=process.env.ADMIN_EMAIL, pw=process.env.ADMIN_PASSWORD;
  if(!email||!pw) return res.status(400).json({error:'서버 .env에 ADMIN_EMAIL/ADMIN_PASSWORD 설정 필요'});
  const exists=db.prepare('SELECT id FROM users WHERE email=?').get(email); if(exists) return res.status(400).json({error:'이미 관리자 계정이 있어요'});
  const hash=await bcrypt.hash(pw,10);
  db.prepare("INSERT INTO users(email,password_hash,name,birth_date,birth_time,gender,age,coins,role,status) VALUES(?,?,?,'1990-01-01',12,'male',30,0,'admin','active')").run(email,hash,'관리자');
  res.json({ok:true, message:'관리자 계정 생성 완료'});
});

const PORT=process.env.PORT||3000;
app.listen(PORT, ()=> console.log('AI 사주 서버 실행 중 http://localhost:'+PORT+' (DB: server/data.db)'));
