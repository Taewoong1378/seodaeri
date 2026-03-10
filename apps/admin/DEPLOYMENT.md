# 어드민 대시보드 배포 가이드

## 1. 필요 환경변수

admin 앱은 자체 쿠키 인증을 사용하며, Google OAuth나 NextAuth를 사용하지 않습니다.
Supabase 관련 환경변수 **3개만** 필요합니다.

| 환경변수 | 설명 | apps/web과 동일 |
|---------|------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ 동일 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key | ✅ 동일 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (서버 전용) | ✅ 동일 |

> apps/web에 설정된 값과 동일한 값을 사용하면 됩니다.

---

## 2. Vercel 배포 설정

### 2-1. 새 Vercel 프로젝트 생성

1. [vercel.com](https://vercel.com) → **Add New Project**
2. 기존 GitHub 리포지토리 연결 (seodaeri-app)
3. **Root Directory** 설정:
   - `apps/admin` 입력 (모노레포이므로 루트가 아닌 admin 앱 디렉토리 지정)
4. **Framework Preset**: Next.js (자동 감지됨)
5. **Build Command**: 기본값 사용 (`next build`)
6. **Install Command**: 모노레포이므로 루트에서 실행됨 — 기본값 사용

### 2-2. 환경변수 설정

Vercel 프로젝트 → **Settings** → **Environment Variables**에서 위 3개 변수 추가.

### 2-3. 도메인 연결

Vercel 프로젝트 → **Settings** → **Domains**에서:
- `admin.gulim.co.kr` 입력 후 **Add**

Vercel이 필요한 DNS 레코드를 안내합니다 (아래 Step 3 참고).

---

## 3. Gabia DNS 설정

### 현재 상태 (예상)

```
gulim.co.kr       → Vercel (apps/web)
```

### 추가할 DNS 레코드

Gabia 관리 콘솔 → **DNS 관리** → `gulim.co.kr` 도메인 선택 → **레코드 추가**

| 타입 | 호스트 | 값 | TTL |
|------|-------|---|-----|
| **CNAME** | `admin` | `cname.vercel-dns.com.` | 3600 |

> **주의**: CNAME 값 끝에 마침표(`.`)가 필요할 수 있습니다 (Gabia DNS 설정에 따라 다름).

### 설정 순서

1. **Gabia**에서 CNAME 레코드 추가
2. **Vercel**에서 도메인 추가 (`admin.gulim.co.kr`)
3. Vercel이 자동으로 SSL 인증서 발급 (Let's Encrypt)
4. DNS 전파 대기 (보통 5분~최대 48시간, 대부분 수 분 내 완료)

### 확인 방법

```bash
# DNS 전파 확인
dig admin.gulim.co.kr CNAME

# 또는
nslookup admin.gulim.co.kr
```

정상이면 `cname.vercel-dns.com` 이 응답됩니다.

---

## 4. 배포 후 확인 체크리스트

- [ ] `admin.gulim.co.kr` 접속 → `/login` 리다이렉트
- [ ] 이메일 입력 (`xodndxnxn@gmail.com`) → 대시보드 접근
- [ ] KPI 카드에 실제 데이터 표시
- [ ] 각 차트 (인기 종목, 포트폴리오 분석 등) 렌더링
- [ ] CSV 다운로드 3종 (사용자, 보유종목, 인기종목)
- [ ] 로그아웃 → `/login`으로 이동
- [ ] HTTPS 인증서 정상 (자물쇠 아이콘)
- [ ] 모바일 뷰포트 (375px) 반응형 확인

---

## 5. 참고: 모노레포 Vercel 설정 팁

현재 apps/web이 이미 같은 리포지토리에서 배포 중이므로, Vercel은 같은 GitHub 리포에 여러 프로젝트를 연결할 수 있습니다.

**커밋 시 양쪽 모두 빌드되는 문제 방지:**

Vercel 프로젝트 → **Settings** → **General** → **Ignored Build Step**에서:

```bash
npx turbo-ignore admin
```

이렇게 설정하면 `apps/admin` 또는 그 의존 패키지가 변경된 커밋에서만 admin이 빌드됩니다.
apps/web 프로젝트에도 동일하게 `npx turbo-ignore web` 설정을 권장합니다.
