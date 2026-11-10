// server/auth.js - 운영용 회원가입/로그인 (Node + bcrypt + JWT)
// 설치: npm install bcrypt jsonwebtoken pg
// 절대 로컬스토리지 auth를 운영에 쓰지 마세요. 이 파일의 API를 쓰세요.
/*
const bcrypt=require('bcrypt'), jwt=require('jsonwebtoken');
POST /api/auth/signup {email,password,name,birthDate,birthTime,gender,agreeTerms,agreePrivacy,parentAgree}
 - 만 14세 미만 거부, 19세 미만 법정대리인 동의 확인
 - 비밀번호 bcrypt.hash(password,10)
 - INSERT users ... coins=30 (가입 보너스)
 - coin_ledger에 +30 bonus 기록
 - JWT 발급 (7일)
POST /api/auth/login {email,password}
 - bcrypt.compare
 - last_login 업데이트, JWT 발급
 - 관리자: role='admin' 체크, 관리자 로그인은 별도 IP/2FA 권장
GET /api/admin/users (JWT + role=admin 필수)
 - 회원 목록, 검색, 정렬, 상태 변경, 코인 지급/차감, 탈퇴 처리
 - 모든 관리자 작업은 admin_logs에 기록 (누가/언제/무엇을)
POST /api/admin/users/:id/coins {delta, reason} - 트랜잭션으로 처리
POST /api/admin/users/:id/status {status: active/suspended} - 정지 사유 기록
*/
