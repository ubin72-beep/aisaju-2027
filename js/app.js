
// Coin system: 1코인 = 100원. 질문당 최소 100원(1코인)부터
const COIN_WON = 100;
const PRICES = {
  light: {coins:1, won:100, label:'가벼운 질문'},
  deep: {coins:5, won:300, label:'심층 질문'},
  report: {coins:10, won:1000, label:'정밀 리포트'},
  tojeong: {coins:15, won:1500, label:'토정비결 2027 전체'},
};
const CHARGE_PACKS = [
  {won:5000, coins:50, bonus:0},
  {won:10000, coins:110, bonus:10},
  {won:20000, coins:240, bonus:40},
];
let state = JSON.parse(localStorage.getItem('aisaju_state')||'null') || {coins:50, name:'게스트', saju:null, chats:[]};
function save(){ localStorage.setItem('aisaju_state', JSON.stringify(state)); renderCoins(); }
function renderCoins(){ document.querySelectorAll('[data-coins]').forEach(el=> el.textContent = state.coins + '코인'); document.querySelectorAll('[data-coins-won]').forEach(el=> el.textContent = '약 '+(state.coins*COIN_WON).toLocaleString()+'원 상당'); }
function needCoins(type){ return PRICES[type].coins; }
function deduct(type){
  const p = PRICES[type];
  if(state.coins < p.coins){ alert('코인이 부족해요. 충전 후 이용해주세요. (필요 '+p.coins+'코인)'); document.getElementById('chargeModal')?.classList.add('open'); return false; }
  state.coins -= p.coins; save();
  const t=document.getElementById('toast'); if(t){ t.textContent='-'+p.coins+'코인 차감되었습니다 ('+p.won.toLocaleString()+'원)'; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2500); }
  return true;
}
// Chat: 만세력 기반 답변 생성 (데모용 로컬 생성 + 운영시 /api/chat 연동)
function answerFor(q, saju){
  if(!saju) return '먼저 생년월일시를 입력해주세요. 상단에서 입력하면 당신의 사주(일간·오행)를 계산해 답변드려요.';
  const f = Manse.yearFortune2027(saju);
  if(q.includes('이직')||q.includes('직장')||q.includes('커리어')) return `[${saju.ilgan}일간 · 2027 정미년] ${f.msg} 이직은 ${f.key} 흐름이에요. 3월·9월이 이동에 가장 좋고, 5월은 피하세요. 심층 리포트(29코인)로 월별 이직 적기를 더 자세히 볼 수 있어요.`;
  if(q.includes('연애')||q.includes('결혼')||q.includes('인연')) return `[${saju.ilgan}일간 · 연애운] 2027년 당신의 연애 점수는 ${f.score}점. ${f.msg} 4월·10월에 인연이 강하게 들어와요.`;
  if(q.includes('재물')||q.includes('돈')||q.includes('투자')) return `[${saju.ilgan}일간 · 재물운] 정미년은 ${f.key}의 해. 큰 베팅보다 적립·분산이 길해요. 오행 균형: ${JSON.stringify(saju.ohCount)}`;
  return `[${saju.ilgan}일간 · 2027 정미년] ${f.msg} 더 구체적으로 물어보시면 (예: 이직 시기, 연애 시기) 월별로 짚어드릴게요.`;
}
if(typeof window!=='undefined') window.Aisaju={PRICES, CHARGE_PACKS, COIN_WON, state, save, deduct, answerFor, renderCoins};
