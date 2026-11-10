# aisaju-2027 - AI 사주 천년지기 2027 (블랙+딥골드)

> Repo: ubin72-beep/aisaju-2027 / Branch: main
> 배포: A안 - 가비아 도메인(aisaju1000.com) + 가비아 클라우드/VPS (Node 서버)
> 도메인 DNS: A @/www -> VPS 공인 IP

## 빠른 시작 (가비아 VPS)
```bash
git clone https://github.com/ubin72-beep/aisaju-2027.git
cd aisaju-2027/server
npm install
cp ../.env.example ../.env  # 키 입력 (절대 커밋 금지)
npm start  # http://localhost:3000
# PM2: pm2 start index.js --name aisaju && pm2 startup && pm2 save
```

---
# AI 사주 천년지기 2027 - 블랙+딥골드
## 구조
- index.html 홈 + 만세력 계산기
- chat.html 대화형 사주 (질문당 100원부터)
- tojeong.html 토정비결 2027
- admin.html 관리자 (데모 데이터, 실제는 DB 연동)
- js/manse.js 만세력 로직 (년/월/일/시주, 오행, 2027 정미년 운세)
- js/app.js 코인 시스템 (1코인=100원)
- server/server.js 토스페이먼츠 승인 API 샘플
- server/schema.sql DB 설계

## 요금 (1코인=100원)
가벼운 1코인/100원, 심층 3코인/300원, 정밀 10코인/1000원, 토정비결 15코인/1500원
충전: 5000원=50코인, 10000원=110코인, 20000원=240코인, 가입 시 30코인 무료

## 만세력 주의
- 입춘/절기 경계는 근사치. 운영 시 한국천문연구원 절기표/음양력 API로 보정 필요 (manse.js 주석 참고)
- 음력 입력 시 양력 변환 API 연동 필요

## 토스 연동
1. 토스페이먼츠 개발자센터에서 클라이언트키/시크릿키 발급
2. .env에 TOSS_SECRET_KEY 설정
3. 프론트 결제창 -> /api/payments/confirm 서버 승인 -> 승인 성공 시에만 코인 지급

## GitHub 업로드
git init, git add ., git commit -m "2027 redesign", git remote add origin <repo>, git push -u origin main
## 로컬 실행
python3 -m http.server 8000 (프론트), node server/server.js (API)
