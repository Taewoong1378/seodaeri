# 외부 API 키 발급 가이드

굴림 앱의 Standalone 모드(스프레드시트 없이 사용)를 위해 필요한 API 키들의 발급 방법을 안내합니다.

## 목차

1. [한국수출입은행 API (환율)](#1-한국수출입은행-api-환율)
2. [한국투자증권 OpenAPI (주식/지수)](#2-한국투자증권-openapi-주식지수)

---

## 1. 한국수출입은행 API (환율)

### 용도
- USD/KRW 환율 조회
- 포트폴리오 원화 환산 계산

### API 스펙

#### 요청 URL
```
https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON
```

> **참고**: 2025.6.25부터 도메인이 `www.koreaexim.go.kr` → `oapi.koreaexim.go.kr`로 변경되었습니다.

#### 요청 파라미터
| 파라미터 | 설명 | 예시 |
|----------|------|------|
| `authkey` | 발급받은 인증키 | `XXXXXXXXXXXX` |
| `searchdate` | 조회 날짜 (YYYYMMDD) | `20250117` |
| `data` | 데이터 타입 | `AP01` (환율) |

#### 요청 예시
```
https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=인증키&searchdate=20250117&data=AP01
```

#### 응답 필드
| 필드 | 설명 |
|------|------|
| `cur_unit` | 통화코드 (USD, EUR 등) |
| `cur_nm` | 통화명 |
| `deal_bas_r` | 매매 기준율 ⭐ |
| `ttb` | 전신환(송금) 받을때 |
| `tts` | 전신환(송금) 보낼때 |

### 발급 방법

#### 방법 1: 한국수출입은행 직접 발급 (권장)

1. **한국수출입은행 Open API 사이트 접속**
   - URL: https://www.koreaexim.go.kr/ir/HPHKIR020M01?apino=2&viewtype=C

2. **인증키 발급**
   - "Open API 인증키 발급" 탭 클릭
   - 간단한 본인 인증 후 인증키 발급
   - 발급받은 키는 "나의 인증키 발급내역"에서 확인

#### 방법 2: 공공데이터포털 발급

1. **공공데이터포털 접속**
   - URL: https://www.data.go.kr/data/3068846/openapi.do

2. **회원가입 및 로그인**
   - 공공데이터포털 회원가입 (간편인증 가능)

3. **활용신청**
   - "활용신청" 버튼 클릭
   - 사용 목적 입력 후 신청
   - 즉시 또는 1~2일 내 승인

4. **환경변수 설정**
   ```env
   KOREAEXIM_API_KEY=발급받은_인증키
   ```

### API 제한
- **일일 요청 한도**: 1,000회
- **데이터 업데이트**: 매일 11시 (영업일 기준)

### 참고사항
- 인증키는 발급 즉시 사용 가능
- 무료 서비스 (비용 없음)
- 주말/공휴일에는 금요일(직전 영업일) 환율 조회 필요
- 오전 11시 이전에는 전일 환율이 반환될 수 있음

---

## 2. 한국투자증권 OpenAPI (주식/지수)

### 용도
- **한국 주식**: KOSPI, KOSDAQ 주식 현재가 조회
- **미국 주식**: NYSE, NASDAQ, AMEX 주식 현재가 조회
- **지수 조회**: KOSPI/KOSDAQ 지수, S&P500(SPY), NASDAQ(QQQ)
- ETF 가격 조회

### 발급 방법

1. **한국투자증권 KIS Developers 사이트 접속**
   - URL: https://apiportal.koreainvestment.com

2. **회원가입**
   - "회원가입" 클릭
   - 한국투자증권 계좌가 없어도 가입 가능
   - 이메일 인증 완료

3. **앱 등록 (API Key 발급)**
   - 로그인 후 "KIS Developers" → "앱 관리" 메뉴
   - "앱 등록" 클릭
   - 앱 정보 입력:
     - 앱 이름: `굴림` (또는 원하는 이름)
     - 앱 설명: `개인 투자 관리 앱`
     - 서비스 구분: `개인`
   - 등록 완료 후 **App Key**와 **App Secret** 확인

4. **모의투자 계좌 신청** (선택사항)
   - 실제 계좌 없이 테스트하려면 모의투자 계좌 신청
   - "KIS Developers" → "모의투자" 메뉴

5. **환경변수 설정**
   ```env
   KIS_APP_KEY=발급받은_App_Key
   KIS_APP_SECRET=발급받은_App_Secret
   ```

### API 제한
- **초당 요청 한도**: 20회
- **토큰 발급**: 1분당 1회 (토큰 유효기간: 24시간)
- **일일 요청 한도**: 제한 없음 (합리적 사용)

### 지원하는 거래소 코드

| 거래소 | 코드 | 설명 |
|--------|------|------|
| NASDAQ | NAS | 미국 나스닥 |
| NYSE | NYS | 미국 뉴욕증권거래소 |
| AMEX | AMS | 미국 아멕스 (ETF 포함) |

### 주요 API 엔드포인트

| 용도 | tr_id | 설명 |
|------|-------|------|
| 국내 주식 현재가 | FHKST01010100 | 한국 주식 시세 조회 |
| 국내 업종지수 | FHPUP02100000 | KOSPI(0001), KOSDAQ(1001) |
| 해외 주식 현재가 | HHDFS00000300 | 미국 주식/ETF 시세 조회 |

### 참고사항
- App Key/Secret은 발급 후 즉시 사용 가능
- 모의투자/실전투자 구분 있음 (현재가 조회는 둘 다 가능)
- **한국 장**: 09:00-15:30 (KST), 장외시간에는 종가
- **미국 장**: 22:30-05:00 (KST), 장외시간에는 종가

---

## 환경변수 전체 설정

`.env.local` 파일에 다음과 같이 설정합니다:

```env
# 한국수출입은행 (환율)
KOREAEXIM_API_KEY=your_koreaexim_api_key

# 한국투자증권 OpenAPI (한국/미국 주식, 지수)
KIS_APP_KEY=your_kis_app_key
KIS_APP_SECRET=your_kis_app_secret
```

---

## 캐싱 전략

앱에서는 API 호출을 최소화하기 위해 다음과 같은 캐싱 전략을 사용합니다:

| API | 캐시 시간 (장중) | 캐시 시간 (장외) |
|-----|------------------|------------------|
| 환율 | 1시간 | 1시간 |
| 한국 주식/지수 | 5분 | 1시간 |
| 미국 주식/지수 | 5분 | 1시간 |

---

## 문제 해결

### 환율 API가 작동하지 않음
- 주말/공휴일에는 전일 환율이 반환됩니다.
- 오전 11시 이전에는 전일 환율이 반환될 수 있습니다.

### 한국 주식 가격이 0으로 표시됨
- KIS API 인증 토큰 만료 가능성 (24시간마다 갱신)
- App Key/Secret 확인

### 미국 주식 가격이 업데이트되지 않음
- 미국 장 운영시간 외에는 종가만 제공됩니다.
- 거래소 코드가 올바른지 확인 (NAS/NYS/AMS)

### 토큰 발급 오류 (EGW00133)
- 1분당 1회 제한에 걸린 경우입니다.
- 1분 후 다시 시도하세요.
- 앱에서는 토큰을 24시간 캐싱하여 재사용합니다.

---

## 참고 링크

- [한국수출입은행 Open API](https://www.koreaexim.go.kr/ir/HPHKIR020M01?apino=2&viewtype=C)
- [공공데이터포털 - 한국수출입은행 환율정보](https://www.data.go.kr/data/3068846/openapi.do)
- [한국투자증권 KIS Developers](https://apiportal.koreainvestment.com)
- [KIS Developers GitHub](https://github.com/koreainvestment/open-trading-api)
