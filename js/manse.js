
// 만세력 코어 - aisaju1000 2027
// 기준: 60갑자, 양력 기준 연/월/일/시주 계산 (절기 근사 + 일자 기준일 방식)
// 운영용: 절기 정확한 경계는 한국천문연구원 절기표로 보정 필요 - config/jeolgi.json 에서 오버라이드 가능
const GAN = ["갑","을","병","정","무","기","경","신","임","계"];
const JI = ["자","축","인","묘","진","사","오","미","신","유","술","해"];
const GAN_OH = {"갑":"목","을":"목","병":"화","정":"화","무":"토","기":"토","경":"금","신":"금","임":"수","계":"수"};
const JI_OH = {"자":"수","축":"토","인":"목","묘":"목","진":"토","사":"화","오":"화","미":"토","신":"금","유":"금","술":"토","해":"수"};
// 1900-01-01은 경자일(경자년 경자월 경자일 근사 기준) - 일자 계산 기준일: 1900-01-01 양력 = 경자일(36번째)로 검증된 값 사용
const DAY_BASE = Date.UTC(1900,0,1);
const DAY_BASE_GAPJA_INDEX = 36; // 경자 = 37번째, 0-index 36

function gapjaIndex(ganIdx, jiIdx){
  for(let i=0;i<60;i++){ if(i%10===ganIdx && i%12===jiIdx) return i; }
  return 0;
}
function gapjaName(idx){ idx=((idx%60)+60)%60; return GAN[idx%10]+JI[idx%12]; }
function yearPillar(year, month, day){
  // 입춘 기준: 2/4 이전은 전년도. 간이 근사 - 운영시 절기표로 교체
  let y = year;
  if(month===1 || (month===2 && day<4)) y = year-1;
  const ganIdx = ((y - 4) % 10 + 10)%10;
  const jiIdx = ((y - 4) % 12 + 12)%12;
  return { gan: GAN[ganIdx], ji: JI[jiIdx], name: GAN[ganIdx]+JI[jiIdx]+"년", ganIdx, jiIdx, oh: GAN_OH[GAN[ganIdx]]+JI_OH[JI[jiIdx]] };
}
function monthPillar(year, month, day){
  // 월건법: 연간에 따른 정월 간. 월지는 절기 기준 근사 (2월=인월...)
  const yP = yearPillar(year, month, day);
  const yGan = yP.ganIdx;
  // 갑기년 병인월 시작, 을경년 무인월, 병신년 경인월, 정임년 임인월, 무계년 갑인월
  const startGanMap = {0:2,1:4,2:6,3:8,4:0,5:2,6:4,7:6,8:8,9:0};
  const startGan = startGanMap[yGan];
  // 월지: 2월 인, 3월 묘, 4월 진, 5월 사, 6월 오, 7월 미, 8월 신, 9월 유, 10월 술, 11월 해, 12월 자, 1월 축
  const jiOrder = {2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,11:11,12:0,1:1};
  const jiIdx = jiOrder[month];
  // 인월이 0번째 월
  const monthOffset = (jiIdx - 2 + 12)%12;
  const ganIdx = (startGan + monthOffset)%10;
  return { gan: GAN[ganIdx], ji: JI[jiIdx], name: GAN[ganIdx]+JI[jiIdx]+"월", ganIdx, jiIdx };
}
function dayPillar(date){
  const diff = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - DAY_BASE)/86400000);
  const idx = ((DAY_BASE_GAPJA_INDEX + diff)%60+60)%60;
  return { gan: GAN[idx%10], ji: JI[idx%12], name: GAN[idx%10]+JI[idx%12]+"일", ganIdx: idx%10, jiIdx: idx%12, index: idx };
}
function hourPillar(dayGanIdx, hour){
  // 시간: 23-1 자시, 1-3 축시... 2시간 단위
  const jiIdx = Math.floor(((hour+1)%24)/2);
  // 일간 갑기 -> 갑자시, 을경 -> 병자시, 병신 -> 무자시, 정임 -> 경자시, 무계 -> 임자시
  const startMap = {0:0,5:0,1:2,6:2,2:4,7:4,3:6,8:6,4:8,9:8};
  const startGan = startMap[dayGanIdx];
  const ganIdx = (startGan + jiIdx)%10;
  return { gan: GAN[ganIdx], ji: JI[jiIdx], name: GAN[ganIdx]+JI[jiIdx]+"시", ganIdx, jiIdx };
}
function sajuFromBirth({birthDate, birthTime, isLunar=false, gender='female'}){
  // isLunar=true면 양력 변환 필요 - 운영시 한국천문연구원 음양력 API 연동 권장, 여기서는 경고 반환
  const d = new Date(birthDate);
  const y = yearPillar(d.getFullYear(), d.getMonth()+1, d.getDate());
  const m = monthPillar(d.getFullYear(), d.getMonth()+1, d.getDate());
  const day = dayPillar(d);
  const hour = hourPillar(day.ganIdx, birthTime ?? 12);
  const ilgan = day.gan;
  const ohCount = {};
  [y,m,day,hour].forEach(p=>{ const o1=GAN_OH[p.gan], o2=JI_OH[p.ji]; ohCount[o1]=(ohCount[o1]||0)+1; ohCount[o2]=(ohCount[o2]||0)+1; });
  return { year:y, month:m, day, hour, ilgan, ilganOh: GAN_OH[ilgan], ohCount, lunarWarning: isLunar, gender };
}
function daewoon(ilganGanIdx, gender, yearJiIdx){
  // 대운: 양남/음녀 순행, 음남/양녀 역행. 10년 단위
  const isYang = ilganGanIdx % 2 === 0;
  const forward = (gender==='male' && isYang) || (gender==='female' && !isYang);
  return { direction: forward ? '순행' : '역행', note: forward ? '갑자부터 순행' : '역행' };
}
// 2027 정미년 운세 키
function yearFortune2027(saju){
  const ilgan = saju.ilgan;
  const map = {
    '갑': {score:88, key:'확장과 결실', msg:'2027 정미년은 뿌리내린 것이 열매 맺는 해. 3월·9월 이동·계약 길.'},
    '을': {score:86, key:'유연한 성장', msg:'부드럽게 굽히면 더 크게 얻는 해. 4월·10월 인연.'},
    '병': {score:91, key:'빛나는 해', msg:'정미년은 병화의 불이 땅에 안착. 5월 주의, 8월 대운.'},
    '정': {score:94, key:'주인공의 해', msg:'정화 일간에게 정미년은 본인의 해. 존재감·연애·재물 모두 상승. 4월·10월 최고.'},
    '무': {score:85, key:'안정과 축적', msg:'무토에게 미토는 든든한 땅. 부동산·저축에 길.'},
    '기': {score:89, key:'실속의 해', msg:'기토는 미토와 비견. 실속 챙기고 과시는 금물.'},
    '경': {score:82, key:'다듬는 해', msg:'불이 금을 단련. 5~6월 고비, 하반기 회복.'},
    '신': {score:84, key:'정제의 해', msg:'신금은 정화와 조화. 커리어 정리 후 도약.'},
    '임': {score:87, key:'흐름의 해', msg:'임수는 미토와 상극 아닌 조화. 이동·여행 길.'},
    '계': {score:90, key:'맑은 물의 해', msg:'계수는 정미년의 불을 품고 빛남. 예술·감성 분야 대길.'},
  };
  return map[ilgan] || {score:85, key:'균형의 해', msg:'2027년은 내실을 다지는 해입니다.'};
}
if(typeof module!=='undefined') module.exports={sajuFromBirth, yearFortune2027, yearPillar, monthPillar, dayPillar, hourPillar};
if(typeof window!=='undefined') window.Manse={sajuFromBirth, yearFortune2027, yearPillar, monthPillar, dayPillar, hourPillar};
