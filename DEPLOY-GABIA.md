# Gabia Deploy Guide

## 결론
- 도메인 aisaju1000.com은 가비아 유지
- 서버는 가비아 클라우드/VPS(A안 추천) 또는 Render(B안)
- 가비아 일반 웹호스팅은 PHP 전용이라 Node 서버 안 돌아감. 클라우드/VPS 필수

## A안: 가비아 클라우드/VPS
1. 상품: 클라우드 서버 / VPS, Ubuntu 22.04, vCPU 1 / RAM 2GB 이상
2. SSH 후: Node 20 설치, git clone, cd server && npm install
3. .env 설정 (TOSS, JWT_SECRET, ADMIN)
4. PM2: pm2 start index.js --name aisaju; pm2 startup; pm2 save
5. 가비아 DNS: A @ -> 서버 IP, A www -> 서버 IP, TTL 600
6. SSL: certbot --nginx -d aisaju1000.com -d www.aisaju1000.com
7. Nginx: 80/443 -> localhost:3000 리버스 프록시

## B안: Render + 가비아 DNS
1. GitHub 푸시 -> Render New Web Service
2. Build: cd server && npm install / Start: node server/index.js
3. 환경변수에 .env 입력
4. 가비아 DNS: CNAME www -> render주소 / A @ -> Render IP
5. Render Custom Domain에 aisaju1000.com 등록 -> SSL 자동

## 체크리스트
- [ ] 서버 결정
- [ ] .env + 토스 라이브키
- [ ] DNS 전파 확인 (dnschecker.org)
- [ ] SSL + https
- [ ] 관리자 계정 /api/admin/setup
- [ ] 통신판매업신고번호 푸터 입력
