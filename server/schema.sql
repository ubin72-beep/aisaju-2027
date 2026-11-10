-- aisaju1000 2027 DB 설계 (PostgreSQL 기준, MySQL도 동일 구조)
CREATE TABLE users(id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT, name VARCHAR(50), birth_date DATE, birth_time INT, gender VARCHAR(10), coins INT DEFAULT 30, created_at TIMESTAMPTZ DEFAULT now());
-- 가입 시 30코인 무료 지급: INSERT 시 coins=30
CREATE TABLE coin_ledger(id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id), delta INT NOT NULL, type VARCHAR(30) CHECK(type IN ('charge','spend','bonus','admin','refund')), reason TEXT, balance_after INT, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE payments(id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id), toss_payment_key VARCHAR(255) UNIQUE, order_id VARCHAR(100) UNIQUE, amount INT NOT NULL, coins INT NOT NULL, method VARCHAR(30), status VARCHAR(20) DEFAULT 'PENDING', approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE chats(id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id), question TEXT, answer TEXT, coins_spent INT, price_type VARCHAR(20), saju JSONB, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE products(id SERIAL PRIMARY KEY, slug VARCHAR(50) UNIQUE, name VARCHAR(100), coins INT, won INT, is_active BOOLEAN DEFAULT true);
INSERT INTO products(slug,name,coins,won) VALUES ('light','가벼운 질문',1,100),('deep','심층 질문',3,300),('report','정밀 리포트',10,1000),('tojeong','토정비결 2027 전체',15,1500);
CREATE TABLE notices(id SERIAL PRIMARY KEY, title TEXT, body TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());
-- 핵심 무결성: 코인 차감은 트랜잭션 + balance 체크, 결제 승인은 서버에서만
