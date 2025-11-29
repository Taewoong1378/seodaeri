# 환경 변수 설정 가이드

이 문서는 서대리 투자기록 앱을 실행하기 위해 필요한 환경 변수 설정 방법을 안내합니다.

## 시작하기

```bash
# 1. .env.example을 복사하여 .env 파일 생성
cp .env.example .env

# 2. 아래 가이드를 따라 각 값을 설정
```

---

## 1. AUTH_SECRET

NextAuth.js에서 JWT 토큰 암호화에 사용하는 시크릿 키입니다.

### 생성 방법

```bash
openssl rand -base64 32
```

생성된 값을 복사하여 `.env` 파일에 입력:

```
AUTH_SECRET=생성된_값_붙여넣기
```

---

## 2. Supabase 설정

### 2.1 Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 접속 후 로그인
2. **New Project** 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호, 리전 설정 후 생성

### 2.2 환경 변수 값 찾기

프로젝트 생성 후 **Settings > API** 메뉴에서 확인:

| 환경 변수 | 위치 |
|-----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project API keys > `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API keys > `service_role` (비밀 유지!) |

**Settings > General**에서:

| 환경 변수 | 위치 |
|-----------|------|
| `SUPABASE_PROJECT_ID` | Reference ID |

### 예시

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_PROJECT_ID=abcdefghijklmnop
```

---

## 3. Google OAuth 설정

Google 로그인 및 Google Drive/Sheets 연동에 필요합니다.

### 3.1 Google Cloud 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 상단의 프로젝트 선택 드롭다운 클릭 > **새 프로젝트** 생성

### 3.2 OAuth 동의 화면 설정

1. **APIs & Services > OAuth consent screen** 이동
2. User Type: **External** 선택
3. 앱 정보 입력:
   - 앱 이름: `서대리 투자기록`
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 정보: 본인 이메일
4. **Scopes** 단계에서 다음 스코프 추가:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/spreadsheets`
5. **Test users** 단계에서 테스트할 Google 계정 이메일 추가

### 3.3 OAuth 클라이언트 ID 생성

1. **APIs & Services > Credentials** 이동
2. **+ CREATE CREDENTIALS > OAuth client ID** 클릭
3. Application type: **Web application** 선택
4. 이름 입력: `서대리 웹앱`
5. **Authorized redirect URIs** 추가:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   (프로덕션 배포 시 실제 도메인도 추가)
6. **CREATE** 클릭

### 3.4 환경 변수 설정

생성 완료 후 표시되는 값을 복사:

```
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
```

### 3.5 필요한 API 활성화

**APIs & Services > Library**에서 다음 API 활성화:

- Google Drive API
- Google Sheets API

---

## 4. OpenAI API 설정

OCR 기능에 사용됩니다.

### 4.1 API 키 발급

1. [OpenAI Platform](https://platform.openai.com) 접속 후 로그인
2. 우측 상단 프로필 > **View API keys** 또는 [API Keys 페이지](https://platform.openai.com/api-keys) 직접 접속
3. **+ Create new secret key** 클릭
4. 키 이름 입력 후 생성
5. 생성된 키 복사 (한 번만 표시됨!)

### 4.2 환경 변수 설정

```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 참고사항

- OpenAI API는 유료입니다. [사용량 확인](https://platform.openai.com/usage)
- 결제 수단 등록이 필요합니다: **Settings > Billing**

---

## 5. App URLs

로컬 개발 환경에서는 기본값 사용:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
```

프로덕션 배포 시 실제 도메인으로 변경하세요.

---

## 최종 .env 파일 예시

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_PROJECT_ID=abcdefghijklmnop

# Auth
AUTH_SECRET=K7gNxR3mP9qW2sT5vY8zA1cE4fH6jL0oU3iB7dX9wM0=

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx

# OpenAI (for OCR)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
```

---

## 문제 해결

### "There was a problem with the server configuration" 오류

- `AUTH_SECRET`이 설정되어 있는지 확인
- `GOOGLE_CLIENT_ID`와 `GOOGLE_CLIENT_SECRET`이 올바른지 확인
- Google OAuth redirect URI가 정확히 `http://localhost:3000/api/auth/callback/google`인지 확인

### Google 로그인 시 "Access blocked" 오류

- OAuth 동의 화면에서 테스트 사용자로 본인 이메일이 추가되어 있는지 확인
- 앱이 아직 "Testing" 상태일 경우 등록된 테스트 사용자만 로그인 가능

### Supabase 연결 오류

- `NEXT_PUBLIC_SUPABASE_URL`이 `https://`로 시작하는지 확인
- API 키가 올바르게 복사되었는지 확인 (앞뒤 공백 제거)
