
// js/api.js - 프론트 -> 서버 API 클라이언트
// 서버가 있으면 서버 사용, 없으면 로컬 데모로 폴백 (개발 편의)
const API = location.port==='3000' || location.hostname!=='localhost' ? '' : 'http://localhost:3000';
function token(){ return localStorage.getItem('aisaju_token'); }
async function api(path, method='GET', body){
  const r=await fetch(API+path, {method, headers:{'Content-Type':'application/json', ...(token()?{Authorization:'Bearer '+token()}:{})}, body: body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({error:'서버 응답 오류'}));
  if(!r.ok) throw new Error(j.error||'요청 실패');
  return j;
}
async function apiSignup(data){ const j=await api('/api/auth/signup','POST',data); localStorage.setItem('aisaju_token', j.token); return j; }
async function apiLogin(email,password){ const j=await api('/api/auth/login','POST',{email,password}); localStorage.setItem('aisaju_token', j.token); return j; }
async function apiMe(){ return api('/api/auth/me'); }
async function apiChat(question, priceType){ return api('/api/chat','POST',{question, priceType}); }
async function apiSaju(){ return api('/api/saju','POST',{}); }
if(typeof window!=='undefined') window.Api={api, apiSignup, apiLogin, apiMe, apiChat, apiSaju, token};
