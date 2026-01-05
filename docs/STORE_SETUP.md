# 굴림(Gulim) 앱스토어/플레이스토어 배포 가이드

이 문서는 굴림 앱을 Apple App Store와 Google Play Store에 배포하기 위한 설정 가이드입니다.

## 목차

1. [사전 준비](#0-사전-준비)
2. [Apple Developer 설정](#1-apple-developer-설정)
3. [Google Play Console 설정](#2-google-play-console-설정)
4. [EAS 설정 및 빌드](#3-eas-설정-및-빌드)
5. [환경변수 설정](#4-환경변수-설정)
6. [심사 준비 체크리스트](#5-심사-준비-체크리스트)

---

## 0. 사전 준비

### 0.1 필요한 계정

| 계정                | 비용         | 용도            |
| ------------------- | ------------ | --------------- |
| Apple Developer     | $99/년       | iOS 앱 배포     |
| Google Play Console | $25 (일회성) | Android 앱 배포 |
| Expo 계정           | 무료         | EAS Build 사용  |

### 0.2 현재 앱 구조

```
굴림 앱 구조:
├── apps/web (Next.js) → https://gulim.co.kr
├── apps/mobile (Expo) → WebView로 gulim.co.kr 표시
└── 네이티브 기능:
    ├── Apple Sign In (iOS)
    ├── Safe Area 처리
    └── Android 뒤로가기
```

### 0.3 Apple Login 구현 방식

현재 구현은 **네이티브 Apple Sign In**을 사용합니다:

```
1. iOS 앱에서 expo-apple-authentication으로 로그인
2. Apple이 identityToken 발급
3. 앱이 서버(/api/auth/apple)로 토큰 전송
4. 서버가 세션 생성
```

**이 방식의 장점:**

- ✅ APPLE_CLIENT_ID, APPLE_CLIENT_SECRET 환경변수 불필요
- ✅ Service ID 생성 불필요
- ✅ p8 Key 파일 불필요
- ✅ JWT Secret 생성 스크립트 불필요

**필요한 것:**

- ✅ Bundle ID가 Apple Developer에 등록
- ✅ App ID에서 "Sign In with Apple" Capability 활성화
- ✅ `NEXT_PUBLIC_ENABLE_APPLE_LOGIN=true` 환경변수

---

## 1. Apple Developer 설정

### 1.1 Apple Developer Program 가입

1. https://developer.apple.com 접속
2. Account → Enroll 클릭
3. 개인/기업 중 선택
4. 연회비 **$99 USD** 결제
5. 승인까지 24-48시간 소요

### 1.2 App ID 생성

1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) 접속
2. Identifiers → "+" 버튼 클릭
3. **App IDs** 선택 → Continue
4. **App** 선택 → Continue
5. 정보 입력:
   - Description: `Gulim App`
   - Bundle ID: `com.seodaeri.app` (Explicit 선택)
6. Capabilities에서 **Sign In with Apple** 체크
7. Continue → Register

### 1.3 Apple Sign In 설정 (네이티브 앱용)

> **현재 구현**: 네이티브 앱에서 `expo-apple-authentication`을 사용하므로, **Service ID와 Key 생성이 필요 없습니다**.

App ID에서 Sign In with Apple Capability만 활성화하면 됩니다 (1.2 단계에서 완료).

~~### 1.4 Key 생성 (서버용) - 불필요~~

> 네이티브 Apple Sign In 방식에서는 p8 키 파일이 필요 없습니다.
> 서버는 네이티브 앱에서 받은 identityToken만 검증합니다.

### 1.5 App Store Connect 앱 생성

1. https://appstoreconnect.apple.com 접속
2. My Apps → "+" → New App
3. 정보 입력:
   - Platforms: iOS
   - Name: `굴림(Gulim)`
   - Primary Language: Korean
   - Bundle ID: `com.seodaeri.app`
   - SKU: `gulim-app`
4. Create
5. 생성된 앱의 **Apple ID** 기록 (숫자, eas.json에 필요)

### 1.6 Team ID 확인

1. [Membership](https://developer.apple.com/account/#/membership) 접속
2. **Team ID** 기록 (10자리 영문+숫자)

---

## 2. Google Play Console 설정

### 2.1 개발자 계정 등록

1. https://play.google.com/console 접속
2. 개발자 계정 생성
3. 등록비 **$25 USD** (일회성) 결제
4. 본인 인증 완료 (개인의 경우 신분증 필요)

### 2.2 앱 생성

1. All apps → **Create app**
2. 정보 입력:
   - App name: `굴림(Gulim)`
   - Default language: Korean
   - App or game: **App**
   - Free or paid: **Free**
3. 선언 사항 체크
4. **Create app**

### 2.3 스토어 등록정보 설정

1. Grow → Store presence → **Main store listing**
2. 필수 정보 입력:
   - Short description (80자 이내)
   - Full description (4000자 이내)
   - App icon (512x512 PNG)
   - Feature graphic (1024x500 PNG/JPG)
   - Screenshots (최소 2장)

### 2.4 서비스 계정 생성 (자동 배포용)

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 선택 또는 생성
3. IAM & Admin → Service Accounts
4. **Create Service Account**
5. 정보 입력:
   - Name: `play-store-deploy`
   - ID: `play-store-deploy`
6. **Create and Continue**
7. 역할 건너뛰기 → **Done**
8. 생성된 서비스 계정 클릭 → Keys → Add Key → Create new key
9. **JSON** 선택 → Create
10. 다운로드된 파일을 `apps/mobile/google-play-service-account.json`으로 저장

### 2.5 Play Console에 서비스 계정 연결

1. Play Console → Users and permissions → **Invite new users**
2. 서비스 계정 이메일 입력 (예: `play-store-deploy@project-id.iam.gserviceaccount.com`)
3. App permissions → 해당 앱 선택
4. Account permissions:
   - **Admin (all permissions)** 또는 최소 권한:
     - Release to production
     - Release apps to testing tracks
5. **Invite user**

### 2.6 Play App Signing 설정

1. Release → Setup → **App signing**
2. **Use Google-managed key** 선택 (권장)
3. Continue

---

## 3. EAS 설정 및 빌드

### 3.1 EAS CLI 설치 및 로그인

```bash
# EAS CLI 전역 설치
npm install -g eas-cli

# Expo 계정 로그인 (계정 없으면 생성)
eas login
```

### 3.2 프로젝트 초기화

```bash
cd apps/mobile

# EAS 프로젝트 초기화 (최초 1회)
eas init

# 프롬프트에서:
# - "Would you like to create a new EAS project?" → Yes
# - Project name 입력
# - projectId가 자동으로 app.json에 추가됨
```

### 3.3 app.json 확인 및 수정

`eas init` 후 자동으로 추가되지만, 확인 필요:

```json
{
  "expo": {
    "name": "굴림(Gulim)",
    "slug": "gulim-app",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.seodaeri.app",
      "usesAppleSignIn": true
    },
    "android": {
      "package": "com.seodaeri.app"
    },
    "extra": {
      "eas": {
        "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" // eas init에서 자동 생성
      }
    }
  }
}
```

### 3.4 eas.json 수정

실제 값으로 업데이트:

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID@email.com",
        "ascAppId": "1234567890"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json"
      }
    }
  }
}
```

**값 찾는 방법:**
| 항목 | 위치 |
|------|------|
| `appleId` | Apple Developer 가입에 사용한 이메일 |
| `ascAppId` | App Store Connect → 앱 선택 → 앱 정보 → Apple ID (숫자) |
| `serviceAccountKeyPath` | Google Cloud Console에서 다운로드한 JSON 파일 경로 |

### 3.5 앱 아이콘 준비

`apps/mobile/assets/` 폴더의 이미지를 교체:

| 파일                | 크기      | 용도                         |
| ------------------- | --------- | ---------------------------- |
| `icon.png`          | 1024x1024 | iOS 앱 아이콘                |
| `adaptive-icon.png` | 1024x1024 | Android 적응형 아이콘 (전경) |
| `splash.png`        | 1242x2436 | 스플래시 화면                |

### 3.6 빌드 명령어

```bash
cd apps/mobile

# 1. 개발 빌드 (내부 테스트용)
eas build --platform ios --profile development
eas build --platform android --profile development

# 2. 프로덕션 빌드 (스토어 제출용)
eas build --platform ios --profile production
eas build --platform android --profile production

# 3. 양 플랫폼 동시 빌드
eas build --platform all --profile production
```

### 3.7 제출 명령어

```bash
# iOS App Store 제출
eas submit --platform ios --profile production

# Android Play Store 제출
eas submit --platform android --profile production

# 또는 빌드와 제출을 한번에
eas build --platform ios --profile production --auto-submit
```

### 3.8 자주 발생하는 문제

**Q: Apple 인증서 에러**

```bash
# 자동으로 인증서 생성
eas credentials
# → iOS 선택 → "Yes, manage credentials automatically" 선택
```

**Q: Android 서명 키 에러**

```bash
# EAS가 자동으로 keystore 관리
# 처음 빌드 시 자동 생성됨
```

**Q: 빌드 실패 시**

```bash
# 캐시 클리어 후 재빌드
eas build --platform ios --profile production --clear-cache
```

---

## 4. 환경변수 설정

### 4.1 웹앱 환경변수 (`.env.local`)

네이티브 Apple Sign In 방식에서는 최소한의 환경변수만 필요합니다:

```env
# 기존 Google 로그인 설정
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id  # Picker용 (동일값)
NEXT_PUBLIC_GOOGLE_API_KEY=your-google-api-key

# 인증
AUTH_SECRET=your-auth-secret

# Apple 로그인 활성화 (네이티브 앱에서만 표시됨)
NEXT_PUBLIC_ENABLE_APPLE_LOGIN=true
```

### 4.2 Apple 로그인 관련 - 추가 환경변수 불필요!

> **중요**: 네이티브 Apple Sign In 방식에서는 아래 환경변수가 **필요 없습니다**:
>
> - ~~APPLE_CLIENT_ID~~
> - ~~APPLE_CLIENT_SECRET~~
> - ~~APPLE_TEAM_ID~~
> - ~~APPLE_KEY_ID~~
>
> `expo-apple-authentication`이 네이티브에서 처리하고, 서버는 identityToken만 검증합니다.

### 4.3 심사 후 Apple 로그인 비활성화 (선택사항)

Apple 심사 통과 후, Google 로그인만 사용하고 싶다면:

```env
NEXT_PUBLIC_ENABLE_APPLE_LOGIN=false
```

웹 재배포 후 Apple 로그인 버튼이 숨겨집니다 (앱 업데이트 불필요).

### 4.4 프로덕션 환경변수 (Vercel 등)

배포 환경에도 동일하게 설정:

```env
NEXT_PUBLIC_ENABLE_APPLE_LOGIN=true
```

---

## 5. 심사 준비 체크리스트

### iOS App Store

#### 필수 자료

- [ ] 앱 스크린샷
  - 6.7인치 (iPhone 15 Pro Max): 1290 x 2796
  - 5.5인치 (iPhone 8 Plus): 1242 x 2208
- [ ] 앱 아이콘: 1024 x 1024 PNG (투명도 없음)
- [ ] 개인정보 처리방침 URL
- [ ] 앱 설명 (한국어)
- [ ] 키워드 (100자 이내)

#### 설정

- [ ] 연령 등급 설정 완료
- [ ] 앱 카테고리 선택 (Finance)
- [ ] 가격 및 사용 가능 지역 설정
- [ ] App Privacy 정보 입력
- [ ] Apple Sign In 구현 확인

#### 심사 정보

- [ ] 테스트 계정 정보 (필요시)
- [ ] 연락처 정보
- [ ] 앱 심사 노트 작성

### Google Play Store

#### 필수 자료

- [ ] Feature graphic: 1024 x 500 PNG/JPG
- [ ] 앱 스크린샷: 최소 2장 (권장 8장)
  - 휴대전화: 320 ~ 3840px
- [ ] 앱 아이콘: 512 x 512 PNG
- [ ] 앱 설명 (한국어)

#### 설정

- [ ] 콘텐츠 등급 설문 완료
- [ ] 타겟 연령층 설정
- [ ] 앱 카테고리 선택 (Finance)
- [ ] 데이터 안전 양식 작성
- [ ] 광고 포함 여부 설정

#### 정책 준수

- [ ] 개인정보 처리방침 URL 등록
- [ ] 앱 액세스 (테스트 계정 필요시)

---

## 6. 빠른 시작 가이드 (TL;DR)

### iOS 배포 순서

```bash
# 1. Apple Developer 가입 ($99) 및 승인 대기

# 2. Apple Developer Console에서:
#    - App ID 생성 (com.seodaeri.app)
#    - Sign In with Apple Capability 활성화

# 3. App Store Connect에서:
#    - 앱 생성
#    - Apple ID(숫자) 기록

# 4. 웹 환경변수 설정 (.env.local)
NEXT_PUBLIC_ENABLE_APPLE_LOGIN=true

# 5. 웹 재배포 (Vercel)

# 6. EAS 설정
cd apps/mobile
npm install -g eas-cli
eas login
eas init

# 7. eas.json 수정
#    - appleId: Apple ID 이메일
#    - ascAppId: App Store Connect Apple ID (숫자)

# 8. 빌드 & 제출
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

### Android 배포 순서

```bash
# 1. Google Play Console 가입 ($25)

# 2. Play Console에서:
#    - 앱 생성
#    - 서비스 계정 설정

# 3. Service Account JSON 다운로드
#    → apps/mobile/google-play-service-account.json 저장

# 4. 빌드 & 제출
eas build --platform android --profile production
eas submit --platform android --profile production
```

---

## 7. 현재 설정 상태 확인

### 체크리스트

```
[ ] Apple Developer 가입 완료
[ ] App ID 생성 (com.seodaeri.app)
[ ] Sign In with Apple Capability 활성화
[ ] App Store Connect 앱 생성
[ ] eas.json의 appleId 설정
[ ] eas.json의 ascAppId 설정
[ ] NEXT_PUBLIC_ENABLE_APPLE_LOGIN=true 설정 (Vercel)
[ ] 앱 아이콘 교체 (assets/icon.png)
[ ] 스플래시 교체 (assets/splash.png)
```

### 파일 위치

| 파일       | 경로                                           | 설명                  |
| ---------- | ---------------------------------------------- | --------------------- |
| Expo 설정  | `apps/mobile/app.json`                         | Bundle ID, 앱 이름 등 |
| EAS 설정   | `apps/mobile/eas.json`                         | 빌드/제출 설정        |
| 앱 아이콘  | `apps/mobile/assets/icon.png`                  | 1024x1024             |
| 스플래시   | `apps/mobile/assets/splash.png`                | 1242x2436             |
| Android 키 | `apps/mobile/google-play-service-account.json` | Git에 포함 안됨       |

---

## 참고 링크

- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [Sign In with Apple](https://developer.apple.com/sign-in-with-apple/)
