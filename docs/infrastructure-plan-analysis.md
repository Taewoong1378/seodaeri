# 굴림(Gulim) 인프라 업그레이드 분석서

> 작성일: 2026-03-11
> 대상 서비스: 굴림(서대리) - 주식 포트폴리오 관리 앱
> 현재 유저 수: ~100명

---

## 목차

1. [현재 인프라 현황](#1-현재-인프라-현황)
2. [Supabase Free vs Pro 비교](#2-supabase-free-vs-pro-비교)
3. [Vercel Free vs Pro 비교](#3-vercel-free-vs-pro-비교)
4. [100명 유저 기준 현실적 분석](#4-100명-유저-기준-현실적-분석)
5. [추천 사항](#5-추천-사항)
6. [단계별 업그레이드 로드맵](#6-단계별-업그레이드-로드맵)

---

## 1. 현재 인프라 현황

### 1.1 기술 스택

| 구성 요소 | 기술 | 요금제 |
|-----------|------|--------|
| 프론트엔드/백엔드 | Next.js 16 (App Router, Server Actions) | Vercel Hobby (무료) |
| 데이터베이스 | Supabase PostgreSQL | Supabase Free |
| 인증 | NextAuth v5 (Google OAuth) + Supabase Auth | Supabase Free |
| 모바일 | React Native WebView (Expo) | - |
| 외부 API | KIS (한국투자증권), KRX, 한국수출입은행, Google Sheets | 각 API 무료 티어 |

### 1.2 데이터 흐름 패턴

현재 앱의 핵심 데이터 흐름을 코드 기반으로 분석하면:

**대시보드 로딩 (가장 무거운 작업):**
- `dashboard.ts`에서 Google Sheets API로 10개 범위를 `Promise.all`로 병렬 호출
- 환율 API (한국수출입은행) 호출 + DB 캐시 조회/저장 (`sync_metadata` 테이블)
- KIS API로 주가 조회 (종목당 1회, 10개 청크 단위 병렬 처리)
- 대체자산(BTC, 금) 가격 조회
- 결과를 60초간 `unstable_cache`로 캐싱

**Supabase 사용 테이블 (코드에서 확인):**
- `users` - 사용자 정보
- `holdings` - 보유 종목
- `transactions` - 거래 내역
- `dividends` - 배당 내역
- `deposits` - 입금 내역
- `account_balances` - 계좌 잔고
- `portfolio_cache` - 포트폴리오 캐시
- `portfolio_snapshots` - 스냅샷
- `sync_metadata` - 동기화 메타데이터 (환율 캐시 등)
- `stocks` - 종목 마스터 데이터 (KRX/KOSDAQ 전체)

**Supabase Storage:** 사용하지 않음 (코드에서 storage/bucket 참조 없음)

**Edge Functions:** 사용하지 않음 (edge runtime 설정 없음)

### 1.3 현재 무료 티어 한도

#### Supabase Free 한도

| 리소스 | Free 한도 | 굴림 예상 사용량 |
|--------|----------|-----------------|
| 데이터베이스 용량 | 500MB | ~50-100MB (100명 기준) |
| Direct 연결 | 60개 동시 | ~5-15개 (100명 중 동시 접속) |
| Pooler 연결 (Transaction) | 200개 | 사용 안 함 (직접 연결만 사용 중) |
| Auth MAU | 50,000 | ~100명 |
| Storage | 1GB | 0MB (미사용) |
| Edge Functions | 500K 호출/월 | 0 (미사용) |
| 대역폭 | 5GB/월 | ~1-3GB |
| 일일 API 요청 | 무제한 (rate limit 있음) | - |

#### Vercel Hobby 한도

| 리소스 | Hobby 한도 | 굴림 예상 사용량 |
|--------|-----------|-----------------|
| Serverless Function 실행 시간 | 10초 | **5-12초 (대시보드 로딩)** |
| 대역폭 | 100GB/월 | ~5-10GB |
| 빌드 시간 | 6,000분/월 | ~100-200분 |
| Serverless Function 메모리 | 1024MB | ~256-512MB |
| 동시 빌드 | 1개 | 충분 |
| 팀 멤버 | 1명 (개인만) | 1명 |

---

## 2. Supabase Free vs Pro 비교

### 2.1 핵심 차이점

| 항목 | Free | Pro ($25/월) |
|------|------|-------------|
| **데이터베이스 용량** | 500MB | 8GB |
| **Direct 연결** | 60개 | 직접 연결 무제한 (Compute에 따라) |
| **Pooler (Transaction)** | 200개 | 200개 (기본, 추가 가능) |
| **Pooler (Session)** | 15개 | 15개 (기본, 추가 가능) |
| **Auth MAU** | 50,000 | 100,000 |
| **Storage** | 1GB | 100GB |
| **Edge Functions** | 500K 호출 | 2M 호출 |
| **대역폭** | 5GB | 250GB |
| **일일 백업** | 없음 | 7일 보관 |
| **Compute** | Shared (2-core) | Dedicated (Small: 2-core 1GB) |
| **Point-in-Time Recovery** | 없음 | 가능 |
| **프로젝트 일시정지** | 7일 비활성 시 자동 정지 | 정지 없음 |
| **SLA** | 없음 | 없음 (Team부터 99.9%) |
| **로그 보관** | 1일 | 7일 |

### 2.2 굴림에 중요한 차이점

#### 데이터베이스 용량 (500MB vs 8GB)

`stocks` 테이블에 KRX + KOSDAQ 전체 종목 데이터를 저장한다. `syncKRXStocks()`와 `syncKOSDAQStocks()` 함수가 주기적으로 전체 종목 데이터를 upsert한다.

- 종목 마스터: ~3,000-4,000 종목 x 12 필드 = ~5-10MB
- 100명 유저 데이터: 거래/배당/입금/스냅샷 등 = ~30-80MB
- **현재 총 예상: 50-100MB → 500MB 한도의 10-20%**
- **결론: 당분간 여유 있음**

#### 연결 수 (60 Direct)

현재 코드(`packages/database/src/client.ts`)에서 `createServiceClient()`를 통해 매 요청마다 새 클라이언트를 생성한다. Connection Pooler(Supavisor)를 사용하지 않고 Direct 연결을 사용 중이다.

- 100명 유저 중 동시 접속: 피크 시 ~10-20명
- Server Action 1회 = 1-3회 DB 호출
- Vercel Serverless는 함수 종료 시 연결이 끊기므로 동시 연결 수는 **동시 실행 함수 수**와 같음
- **예상 동시 연결: 5-15개 → 60개 한도 대비 충분**
- **단, 500명+ 유저에서는 피크 시 60개를 넘을 수 있음**

#### 프로젝트 일시정지

Free 플랜에서는 7일간 활동이 없으면 프로젝트가 자동 일시정지된다. 100명 유저가 있으면 매일 접속이 있을 것이므로 **현실적으로 문제되지 않음**.

#### 백업

Free 플랜에는 **자동 백업이 없다**. 사용자 데이터(거래/배당/입금 내역)가 날아가면 복구 불가능하다. 이것이 **가장 큰 위험 요소**이다.

### 2.3 사용자가 체감할 수 있는 차이

| 항목 | 체감 여부 | 설명 |
|------|----------|------|
| DB 쿼리 속도 | **거의 없음** | 현재 규모에서 Shared vs Dedicated 차이 미미. 쿼리 자체가 단순(PK 조회, 단순 INSERT) |
| Cold Start | **없음** | Supabase는 항상 켜져 있음 (일시정지 제외) |
| Connection 안정성 | **약간** | Pro의 Pooler가 더 안정적이나, 현재 60 연결 한도 내에서 문제없음 |
| 백업 안심감 | **간접적** | 장애 시 복구 가능 여부의 차이 (평소에는 모름) |

**솔직한 평가: 100명 유저 기준으로 Supabase Pro 업그레이드 시 사용자가 체감할 성능 차이는 거의 없다.**

---

## 3. Vercel Free vs Pro 비교

### 3.1 핵심 차이점

| 항목 | Hobby (무료) | Pro ($20/월/멤버) |
|------|------------|------------------|
| **Serverless 실행 시간** | **10초** | **60초** |
| **대역폭** | 100GB/월 | 1TB/월 |
| **빌드 시간** | 6,000분/월 | 24,000분/월 |
| **Serverless 메모리** | 1024MB | 1024MB (최대 3008MB 설정 가능) |
| **동시 빌드** | 1개 | 1개 (추가 가능) |
| **팀 멤버** | 1명 | 무제한 ($20/명) |
| **ISR/캐시** | 기본 | 고급 캐시 옵션 |
| **분석(Analytics)** | 기본 | 고급 Web Analytics |
| **Preview 배포** | 있음 | 있음 + 댓글/보호 |
| **DDoS 보호** | 기본 | 고급 |
| **Speed Insights** | 없음 | 포함 |
| **Firewall** | 없음 | 기본 WAF |
| **Cron Jobs** | 2개 | 40개 |
| **Image Optimization** | 1,000개/월 | 5,000개/월 |

### 3.2 굴림에 중요한 차이점

#### Serverless Function 실행 시간 (10초 vs 60초) - **가장 중요**

`getDashboardData()` 함수의 실행 흐름을 분석하면:

```
1. auth() 세션 확인 (~100ms)
2. Supabase에서 user 조회 (~100-200ms)
3. Google Sheets API 10개 범위 병렬 호출 (~2-5초)
4. 환율 API 호출 (~500ms-2초)
5. KIS API 주가 조회 (종목 수에 따라 ~1-5초)
6. 대체자산 가격 조회 (~500ms)
7. 데이터 파싱/계산 (~100-300ms)
```

**총 예상 시간: 캐시 미스 시 5-12초, 캐시 히트 시 1-3초**

문제 시나리오:
- Google Sheets API가 느릴 때 (구글 서버 상태에 따라 3-7초)
- KIS API에서 여러 종목 조회 시 (fallback 포함하면 5초+)
- 환율 API가 5개 날짜를 순회할 때 (최악의 경우 5-10초)
- **이 모든 것이 겹치면 10초를 쉽게 초과할 수 있다**

**Standalone 모드** (`getStandaloneDashboardData`)는 Google Sheets 호출이 없어 더 빠르지만, KIS API + 환율 API + DB 조회가 여전히 필요하다.

**결론: 대시보드 로딩이 가끔 10초 제한에 걸릴 가능성이 높다. 특히 캐시가 만료된 첫 번째 요청에서.**

#### 대역폭 (100GB vs 1TB)

- 100명 유저 x 하루 ~5회 접속 x 페이지당 ~200KB = ~3GB/월
- 100GB 한도의 3% → **전혀 문제없음**

#### 빌드 시간

- 배포당 ~3-5분 x 월 ~30회 배포 = ~100-150분
- 6,000분 한도의 2-3% → **전혀 문제없음**

#### Cron Jobs (2개 vs 40개)

- 현재 코드에서 Vercel Cron 설정은 보이지 않음
- 향후 주가/환율 자동 갱신, 종목 데이터 동기화 등에 필요할 수 있음
- **당장은 문제없으나, 자동화 기능 추가 시 2개 제한은 빠르게 부족해짐**

### 3.3 사용자가 체감할 수 있는 차이

| 항목 | 체감 여부 | 설명 |
|------|----------|------|
| 대시보드 로딩 실패 | **있음 (중요)** | 10초 타임아웃으로 인해 가끔 "로딩 실패" 발생 가능 |
| 페이지 로딩 속도 | **거의 없음** | CDN 성능은 Hobby와 Pro가 동일 |
| Cold Start | **약간** | Pro가 약간 더 빠른 cold start를 보이나, 체감 차이는 미미 |
| 이미지 최적화 | **없음** | 현재 이미지 사용량이 적음 |

**솔직한 평가: 10초 타임아웃 문제가 실제로 발생한다면, 이것이 Pro 업그레이드의 가장 강력한 이유이다. 사용자 입장에서 "대시보드가 가끔 안 뜬다"는 치명적이다.**

---

## 4. 100명 유저 기준 현실적 분석

### 4.1 비용 분석

| 구분 | 현재 (무료) | Supabase Pro | Vercel Pro | 양쪽 모두 |
|------|-----------|-------------|-----------|----------|
| 월 비용 | $0 | $25/월 | $20/월 | $45/월 |
| 연 비용 | $0 | $300/년 | $240/년 | $540/년 |
| 유저당 월 비용 | $0 | $0.25 | $0.20 | $0.45 |

### 4.2 현재 실제 병목 지점

| 병목 | 심각도 | 설명 |
|------|--------|------|
| Vercel 10초 타임아웃 | **높음** | 대시보드 첫 로딩 시 외부 API 호출이 10초를 초과할 수 있음 |
| Supabase 백업 부재 | **중간** | 데이터 손실 시 복구 불가. 하지만 발생 확률은 낮음 |
| Supabase DB 용량 | **낮음** | 500MB 중 ~100MB 사용. 여유 많음 |
| Supabase 연결 수 | **낮음** | 60개 중 ~15개 사용. 여유 많음 |
| Vercel 대역폭 | **매우 낮음** | 100GB 중 ~3GB 사용 |

### 4.3 업그레이드가 필요해지는 유저 수 추정

| 리소스 | 한도 도달 예상 유저 수 | 근거 |
|--------|---------------------|------|
| Supabase DB 500MB | **500-800명** | 유저당 ~0.5-1MB (거래/배당/입금 + 스냅샷) |
| Supabase 60 동시연결 | **300-500명** | 동시 접속률 ~10%, 동시 함수 실행 ~30-50개 |
| Supabase 5GB 대역폭 | **500-1,000명** | 유저당 ~5-10MB/월 |
| Vercel 10초 타임아웃 | **지금도 가끔 발생** | 외부 API 응답 시간에 의존 |
| Vercel 100GB 대역폭 | **5,000명+** | 유저당 ~20MB/월 |
| Vercel Cron 2개 | **기능 추가 시** | 자동 동기화 기능 3개 이상 필요 시 |

### 4.4 Standalone 모드 vs Sheet 모드 고려

코드에서 두 가지 모드가 있다:
- **Sheet 모드**: Google Sheets API + Supabase + KIS API (가장 느림, 타임아웃 위험 큼)
- **Standalone 모드**: Supabase + KIS API만 사용 (더 빠름, 타임아웃 위험 낮음)

Standalone 모드로 전환하는 유저가 늘어나면 Vercel 타임아웃 문제는 줄어들지만, Supabase DB 사용량은 늘어난다. **모드 전환 트렌드에 따라 업그레이드 우선순위가 달라질 수 있다.**

---

## 5. 추천 사항

### 5.1 결론: 당장은 Vercel Pro만 업그레이드 권장

| 서비스 | 추천 | 이유 |
|--------|------|------|
| **Vercel** | **지금 업그레이드** ($20/월) | 10초 타임아웃이 사용자 경험에 직접적 영향. 60초로 늘어나면 대시보드 로딩 실패가 사라짐 |
| **Supabase** | **아직 불필요** (모니터링 필요) | 용량, 연결 수, 대역폭 모두 여유. 단, 백업이 필요하면 업그레이드 |

### 5.2 판단 근거

**Vercel Pro를 먼저 추천하는 이유:**

1. **10초 타임아웃은 사용자가 직접 체감하는 문제다.** 대시보드가 가끔 안 뜨면 앱 신뢰도가 떨어진다.
2. **$20/월은 합리적인 비용이다.** 유저당 $0.20이면 부담이 적다.
3. **외부 API 의존도가 높다.** Google Sheets, KIS, 환율 API 모두 응답 시간이 불안정하다. 10초는 너무 빡빡하다.

**Supabase Pro를 아직 미루는 이유:**

1. **모든 지표가 한도의 20% 이하다.** 용량도, 연결 수도, 대역폭도 여유가 넉넉하다.
2. **Storage와 Edge Functions을 사용하지 않는다.** Pro의 주요 혜택 중 상당 부분을 활용하지 못한다.
3. **백업만 필요하다면 pg_dump로 수동 백업이 가능하다.** cron job이나 GitHub Actions로 자동화할 수 있다.

### 5.3 Supabase 업그레이드를 지금 해야 하는 경우

다음 중 하나라도 해당되면 Supabase Pro도 함께 업그레이드:

- [ ] 사용자 데이터가 중요하고, **자동 백업이 반드시 필요**하다고 판단될 때
- [ ] DB 용량이 **300MB를 넘었을 때** (안전 마진 고려)
- [ ] 동시 접속 유저가 **50명 이상**이 되었을 때
- [ ] **PITR(Point-in-Time Recovery)** 이 필요한 서비스 수준이 되었을 때

### 5.4 모니터링해야 할 지표

Vercel과 Supabase 대시보드에서 다음을 주기적으로 확인:

| 지표 | 확인 위치 | 경고 기준 |
|------|----------|----------|
| Serverless Function 실행 시간 | Vercel Dashboard > Functions | P95 > 8초 |
| Function 에러율 | Vercel Dashboard > Functions | > 1% |
| DB 용량 | Supabase Dashboard > Database | > 300MB |
| DB 동시 연결 | Supabase Dashboard > Database | 피크 > 40개 |
| API 요청 수 | Supabase Dashboard > Reports | 급격한 증가 추세 |
| Auth MAU | Supabase Dashboard > Auth | > 500명 |
| 월 대역폭 | 양쪽 대시보드 | Vercel > 50GB, Supabase > 3GB |

---

## 6. 단계별 업그레이드 로드맵

### Phase 1: 지금 (100명 유저)

**Vercel Pro 업그레이드: $20/월**

- Serverless 함수 타임아웃 10초 → 60초
- 대시보드 로딩 안정성 확보
- Speed Insights로 성능 모니터링 시작
- Cron Jobs 40개로 확장 (향후 자동 동기화 대비)

**Supabase: Free 유지**
- pg_dump 기반 수동/자동 백업 스크립트 설정 (GitHub Actions 추천)
- DB 용량 및 연결 수 모니터링 시작

**예상 월 비용: $20**

### Phase 2: 300-500명 유저

**Supabase Pro 업그레이드: $25/월**

- DB 용량 한도 8GB로 확장
- 자동 일일 백업 + PITR 활성화
- Dedicated Compute로 쿼리 안정성 향상
- 로그 보관 7일로 확장 (디버깅 용이)

**코드 최적화 병행:**
- `createServiceClient()`를 Connection Pooler(Supavisor) 사용으로 전환
  - 현재: Direct 연결 (`db.xxxx.supabase.co`)
  - 변경: Pooler 연결 (`pooler.xxxx.supabase.co`, Transaction mode)
- `dashboard.ts`의 `unstable_cache` TTL을 60초 → 120초로 증가 검토
- Standalone 모드 전환 유도 (Google Sheets 의존도 낮추기)

**예상 월 비용: $45 ($20 Vercel + $25 Supabase)**

### Phase 3: 1,000명+ 유저

**추가 최적화:**

- Supabase Compute 업그레이드 (Small → Medium: +$25/월)
- Vercel Edge Middleware로 캐시 레이어 추가
- KIS API 호출을 Vercel Cron으로 주기적 갱신 (유저 요청 시 캐시만 반환)
- 환율/주가 데이터를 Redis (Vercel KV 또는 Upstash) 캐시로 전환 검토

**예상 월 비용: $70-100**

### Phase 4: 5,000명+ 유저

**스케일링:**

- Supabase Pro Compute Large 또는 Team 플랜 ($599/월)
- Vercel Enterprise 검토
- CDN 캐싱 전략 고도화
- DB Read Replica 추가 검토

**예상 월 비용: $200-600+**

---

### 비용 요약 테이블

| 단계 | 유저 수 | Vercel | Supabase | 합계/월 | 유저당 비용 |
|------|---------|--------|----------|---------|-----------|
| 현재 | ~100명 | $0 | $0 | $0 | $0 |
| Phase 1 | ~100명 | $20 | $0 | $20 | $0.20 |
| Phase 2 | 300-500명 | $20 | $25 | $45 | $0.09-0.15 |
| Phase 3 | 1,000명+ | $20 | $50 | $70 | $0.07 |
| Phase 4 | 5,000명+ | $20+ | $100-600 | $200-600 | $0.04-0.12 |

> **핵심 메시지:** 유저가 늘수록 유저당 비용은 오히려 줄어든다. 현재 $20/월 투자로 가장 큰 사용자 경험 개선(타임아웃 해결)을 얻을 수 있다.

---

### 부록: 즉시 적용 가능한 무료 최적화

업그레이드 없이도 다음 최적화로 성능을 개선할 수 있다:

1. **Connection Pooler 전환**: `packages/database/src/client.ts`에서 Supabase URL을 Pooler URL로 변경. Free 플랜에서도 Supavisor Transaction mode 200개 연결 가능.

2. **캐시 TTL 증가**: `dashboard.ts`의 `revalidate: 60`을 비실시간 데이터(배당, 입금 내역)에 대해 300-600초로 늘리기.

3. **Google Sheets 호출 최소화**: Sheet 모드 유저에게 Standalone 모드 전환을 안내. DB에 데이터를 저장하면 외부 API 의존도가 줄어든다.

4. **환율 캐시 연장**: `exchange-rate-api.ts`의 `CACHE_DURATION_MS`를 1시간 → 6시간으로 변경 (환율은 하루 1번만 변동).

5. **KIS 주가 캐시 연장**: `stock-price-api.ts`의 `OFF_HOURS_CACHE_MS`를 장외 시간에 6시간 이상으로 변경.
