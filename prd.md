-----

# 📱 PRD: 서대리 투자 기록 앱 (Code Name: Financial Creator)

| 항목 | 내용 |
| :--- | :--- |
| **작성자** | 강태웅 (Lead Developer) |
| **버전** | v1.0 (MVP for Launch) |
| **핵심 가치** | **"입력은 1초, 데이터는 평생"** (AI OCR & Dual Storage) |
| **플랫폼** | Android / iOS (Cross-Platform) |
| **상태** | 개발 착수 대기 (Draft) |

-----

## 1\. 제품 개요 (Product Overview)

### 1.1. 문제 정의 (Problem)

  * **모바일 경험 부재:** 구글 스프레드시트(PC)는 관리가 편하지만, 모바일 환경에서는 데이터 입력(날짜, 종목, 금액)과 조회가 매우 불편함.
  * **데이터 휘발성:** 개별 엑셀 파일에만 데이터가 저장되어, 전체 구독자들의 투자 트렌드 분석이나 데이터 자산화가 불가능함.
  * **높은 진입장벽:** 시트 복사 및 함수 설정에 어려움을 겪는 초보 투자자가 많음.

### 1.2. 해결 방안 (Solution & Strategy)

1.  **AI 자동 입력:** 사용자가 매매 인증샷만 찍으면 **GPT-4o mini**가 데이터를 추출해 입력 (Typing Zero).
2.  **하이브리드 데이터 구조:**
      * **Supabase:** 빠른 앱 구동과 통계 분석을 위한 중앙 DB.
      * **Google Sheet:** 사용자의 개인 소유권 보장 및 복잡한 수식 계산(현재가, 수익률) 처리.
3.  **비용 최적화:** 주식 데이터 API 비용 '0원' (시트 내 `GOOGLEFINANCE` 활용), 서버 비용 최소화 (무료 티어 활용).

-----

## 2\. 시스템 아키텍처 (System Architecture)

### 2.1. Tech Stack

  * **Frontend:** React Native (Expo)
  * **Backend / DB:** **Supabase** (PostgreSQL, Auth, Storage)
  * **Serverless Proxy:** Firebase Cloud Functions (API Key 보안용)
  * **AI Engine:** OpenAI **GPT-4o mini** (Vision API)
  * **Integration:** Google Sheets API v4, Google Drive API

### 2.2. 데이터 흐름 (Data Flow)

1.  **인증:** 구글 로그인을 통해 Supabase Auth와 Google Access Token 동시 획득.
2.  **입력:** 앱에서 스크린샷 업로드 ➡️ GPT-4o mini 분석 ➡️ JSON 데이터 반환.
3.  **저장 (Dual Write):**
      * **Step 1 (Fast):** Supabase DB에 즉시 저장 (앱 화면 갱신).
      * **Step 2 (Background):** Google Sheets API를 통해 사용자 시트에 `append`.

-----

## 3\. 핵심 기능 요구사항 (Functional Requirements)

### 3.1. 인증 및 온보딩 (Authentication)

  * **Google Sign-In:** 필수. (권한 Scope: `email`, `profile`, `drive.file`, `spreadsheets`).
  * **시트 연동 로직:**
      * 로그인 시 사용자 드라이브 스캔.
      * 기존 시트가 있으면 연동, 없으면 **'서대리 마스터 템플릿'** 자동 복사 및 생성.

### 3.2. AI 매매 인증 (The Killer Feature)

  * **기능:** 갤러리에서 '체결 내역' 또는 '잔고' 스크린샷 선택 시 자동 분석.
  * **UX:** 이미지 선택 -\> 로딩(AI 분석) -\> **[검토 팝업]** (날짜/종목/가격/수량 수정 가능) -\> 확인 -\> 저장 완료.
  * **OCR 정확도 확보:** GPT-4o mini 프롬프트 엔지니어링을 통해 다양한 증권사(키움, 토스, 미레에셋 등) UI 대응.

### 3.3. 대시보드 및 차트 (Dashboard)

  * **데이터 소싱 전략:**
      * **거래 내역(History):** Supabase에서 `SELECT` (빠른 로딩).
      * **수익률/현재가(Asset):** Google Sheet의 계산된 셀(G5 등)을 `Get` (정확한 로딩).
  * **시각화:**
      * **배당금 현황:** 월별 막대 그래프 (`배당현황` 시트 데이터).
      * **포트폴리오:** 도넛 차트 (종목별 비중).
      * **벤치마크 비교:** 내 수익률 vs S\&P500 (시트 내 비교 데이터 활용).

### 3.4. 공유 기능 (Social)

  * **인증샷 생성:** 차트 화면을 캡처하여 인스타그램 스토리/피드 규격의 이미지로 저장.
  * **워터마크:** 이미지 하단에 '서대리 투자기록 앱' 로고 자동 삽입.

-----

## 4\. 데이터베이스 설계 (Supabase Schema Draft)

나중의 데이터 분석(Platform 화)을 위해 최소한의 구조를 잡고 갑니다.

  * **`users` Table:**
      * `id` (UUID), `email`, `sheet_id` (연동된 구글 시트 ID).
  * **`transactions` Table:**
      * `id`, `user_id` (FK), `ticker` (종목코드), `type` (BUY/SELL/DIVIDEND), `price`, `quantity`, `date`, `image_url` (선택적).
  * **`assets` Table (Optional):**
      * 매일/매주 시트에서 읽어온 총자산 요약 정보 스냅샷 (수익률 추이 분석용).

-----

## 5\. 백로그 (Backlog - 추후 도입 예정)

수익 모델 및 고도화 기능은 MVP 배포 후 사용자 반응을 보고 도입합니다.

  * **[수익화] 광고 도입:** 구글 애드몹(AdMob) 연동 (배너/보상형).
  * **[수익화] 프리미엄 차트:** 유료 구독자 전용 심화 분석(섹터별, 환율 영향 등) 차트.
  * **[기능] 커뮤니티:** Supabase 데이터를 활용한 "익명 사용자 수익률 랭킹" 또는 "많이 매수한 종목 랭킹".

-----

## 6\. 개발 일정 (Timeline - 3 Weeks Sprint)

| 주차 | 주요 목표 | 세부 작업 내용 |
| :--- | :--- | :--- |
| **1주차** | **환경 구축 & 인증** | - RN 프로젝트 Init & Supabase 연동<br>- Google 로그인 및 Drive/Sheet API 권한 획득<br>- 시트 자동 복사 및 연결 로직 구현 |
| **2주차** | **AI OCR & DB** | - Firebase Function(OpenAI Proxy) 구축<br>- 스크린샷 ➡️ GPT-4o mini ➡️ JSON 파싱 로직 구현<br>- Supabase `transactions` 테이블 저장 구현 |
| **3주차** | **UI/UX & 시트 동기화** | - 시트 데이터(수익률) 읽어오기(Read) 구현<br>- 차트 라이브러리 적용 및 디자인 폴리싱<br>- 내부 테스트 및 서대리님 1차 데모 전달 |

-----

## 7\. 개발자(태웅) 준비 사항 (Action Items)

1.  **Google Cloud Platform:** `OAuth 2.0 클라이언트 ID` 생성 및 API(`Sheets`, `Drive`) 활성화.
2.  **Supabase:** 프로젝트 생성 및 `Google Auth` 설정 (1번의 ID 필요).
3.  **OpenAI:** API Key 발급 및 `Tier 1` 이상 크레딧 충전.
4.  **디자인:** 서대리님께 앱 아이콘 및 스플래시 화면용 로고 요청.

이 문서를 기반으로 개발하시면 **기술적 난이도, 확장성, 사용자 편의성**을 모두 잡는 완성도 높은 앱이 될 것입니다. 즉시 프로젝트 세팅을 시작하셔도 좋습니다\!