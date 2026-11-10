// server/server.js - Node + Express + Toss Payments 승인 API (샘플)
// 설치: npm install express
// 실행: TOSS_SECRET_KEY=sk_test_xxx node server/server.js
// 흐름: 프론트에서 토스 결제창 -> paymentKey+orderId+amount를 이 서버로 전송 -> 서버가 토스 승인 API 호출 -> 성공 시에만 coins 지급 (절대 프론트에서 지급 금지)
const express=require('express'); const app=express(); app.use(express.json());
const SECRET=process.env.TOSS_SECRET_KEY||'sk_test_xxx';
app.post('/api/payments/confirm', async (req,res)=>{
  const {paymentKey, orderId, amount, userId, coins} = req.body;
  // 1) 주문 금액 위변조 체크: DB에서 orderId로 amount 조회 후 비교 (여기서는 예시)
  // 2) 토스 승인 호출
  const r = await fetch('https://api.tosspayments.com/v1/payments/confirm',{method:'POST', headers:{Authorization:'Basic '+Buffer.from(SECRET+':').toString('base64'),'Content-Type':'application/json'}, body: JSON.stringify({paymentKey, orderId, amount})});
  const data = await r.json();
  if(!r.ok) return res.status(400).json({error:data});
  // 3) DB: payments status=APPROVED, coin_ledger INSERT (+coins), users.coins += coins - 트랜잭션으로
  // await db.tx(...)
  res.json({ok:true, coins, payment:data});
});
app.post('/api/chat', async (req,res)=>{
  const {userId, question, priceType} = req.body;
  // 1) 트랜잭션: users.coins >= 필요코인 확인 -> 차감 -> coin_ledger 기록
  // 2) 만세력 계산 (js/manse.js 서버에서 재사용) -> LLM/룰 기반 답변 생성
  // 3) chats INSERT
  res.json({ok:true, answer:'(서버 연동 후 실제 답변)', coinsSpent: priceType==='light'?1:3});
});
app.listen(3000, ()=> console.log('API on 3000'));
