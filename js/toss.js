// js/toss.js - 토스페이먼츠 결제창 연동 (프론트)
// 사용법: <script src="https://js.tosspayments.com/v2/standard"></script> + 이 파일
// 클라이언트키는 환경변수/서버에서 주입. 코드에 하드코딩 금지.
// MID: aisaju28tr (개발자센터 기준)
async function getClientKey(){
  // 운영: /api/config 에서 클라이언트키만 반환받기 (시크릿키는 절대 반환 금지)
  try{ const r=await fetch('/api/config'); const j=await r.json(); if(j.clientKey) return j.clientKey; }catch(e){}
  return window.__TOSS_CLIENT_KEY__ || ''; // 로컬 테스트용 주입
}
async function startTossPayment({amount, coins, orderName}){
  const clientKey = await getClientKey();
  if(!clientKey){ alert('토스 클라이언트키가 설정되지 않았어요. .env의 TOSS_CLIENT_KEY를 확인하세요.'); return; }
  const toss = TossPayments(clientKey);
  const orderId = 'AISAJU_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
  // 금액 위변조 방지: 서버에 주문 생성 먼저 (서버가 amount를 DB에 저장)
  const orderRes = await fetch('/api/payments/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId, amount, coins})});
  if(!orderRes.ok){ alert('주문 생성 실패. 서버를 확인하세요.'); return; }
  await toss.payment({method:'CARD', amount:{currency:'KRW', value:amount}, orderId, orderName: orderName || (coins+'코인 충전'), successUrl: window.location.origin + '/payment-success.html', failUrl: window.location.origin + '/payment-fail.html', customerEmail:'', customerName:''});
}
// 충전 버튼에서 호출: startTossPayment({amount:10000, coins:110})
