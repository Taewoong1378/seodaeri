# 굴림(Gulim) 앱스토어/플레이스토어 배포 가이드

이 문서는 굴림 앱을 Apple App Store와 Google Play Store에 배포하기 위한 설정 가이드입니다.

## 목차
1. [Apple Developer 설정](#1-apple-developer-설정)
2. [Google Play Console 설정](#2-google-play-console-설정)
3. [EAS 설정 및 빌드](#3-eas-설정-및-빌드)
4. [환경변수 설정](#4-환경변수-설정)
5. [심사 준비 체크리스트](#5-심사-준비-체크리스트)

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

### 1.3 Apple Sign In 서비스 설정 (심사용)

> **참고**: Apple 로그인은 앱스토어 심사용으로만 설정합니다. 심사 통과 후 환경변수로 비활성화할 수 있습니다.

1. Identifiers → Services IDs → "+" 클릭
2. Services IDs 선택 → Continue
3. 정보 입력:
   - Description: `Gulim Web Service`
   - Identifier: `com.seodaeri.app.service`
4. **Sign In with Apple** 체크 → Configure
5. Configure 화면에서:
   - Primary App ID: `com.seodaeri.app` 선택
   - Domains: `gulim.co.kr`
   - Return URLs: `https://gulim.co.kr/api/auth/callback/apple`
6. Save → Continue → Register

### 1.4 Key 생성 (서버용)
1. [Keys](https://developer.apple.com/account/resources/authkeys/list) 접속
2. "+" 클릭
3. Key Name: `Gulim Sign In Key`
4. **Sign In with Apple** 체크 → Configure
5. Primary App ID: `com.seodaeri.app` 선택 → Save
6. Continue → Register
7. **Download** 클릭하여 `.p8` 파일 저장 (다시 다운로드 불가!)
8. **Key ID** 기록해두기

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

# Expo 계정 로그인
eas login
```

### 3.2 프로젝트 초기화
```bash
cd apps/mobile

# EAS 프로젝트 초기화
eas init

# project ID가 app.json에 자동 추가됨
```

### 3.3 app.json 업데이트
EAS 초기화 후 생성된 `projectId`를 확인:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "실제-프로젝트-ID"
      }
    }
  }
}
```

### 3.4 eas.json 업데이트
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "App Store Connect App ID (숫자)"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json"
      }
    }
  }
}
```

### 3.5 빌드 명령어
```bash
# iOS Development 빌드 (실기기 테스트용)
eas build --platform ios --profile development

# Android Development 빌드
eas build --platform android --profile development

# iOS Production 빌드 (스토어 제출용)
eas build --platform ios --profile production

# Android Production 빌드
eas build --platform android --profile production
```

### 3.6 제출 명령어
```bash
# iOS App Store 제출
eas submit --platform ios --profile production

# Android Play Store 제출
eas submit --platform android --profile production
```

---

## 4. 환경변수 설정

### 4.1 웹앱 환경변수 (`.env.local`)
```env
# 기존 설정
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
AUTH_SECRET=your-auth-secret

# Apple 로그인 (심사용)
NEXT_PUBLIC_ENABLE_APPLE_LOGIN=true
APPLE_CLIENT_ID=com.seodaeri.app.service
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
# APPLE_CLIENT_SECRET는 아래 스크립트로 생성
```

### 4.2 Apple Client Secret 생성
Apple Client Secret은 JWT 형태로 생성해야 합니다:

```javascript
// generate-apple-secret.js
const jwt = require('jsonwebtoken')
const fs = require('fs')

const privateKey = fs.readFileSync('./AuthKey_XXXXX.p8')
const teamId = 'YOUR_TEAM_ID'
const clientId = 'com.seodaeri.app.service'
const keyId = 'YOUR_KEY_ID'

const token = jwt.sign({}, privateKey, {
  algorithm: 'ES256',
  expiresIn: '180d',
  audience: 'https://appleid.apple.com',
  issuer: teamId,
  subject: clientId,
  keyid: keyId,
})

console.log('APPLE_CLIENT_SECRET=' + token)
```

### 4.3 심사 후 Apple 로그인 비활성화
심사 통과 후 환경변수만 변경하면 됩니다:
```env
NEXT_PUBLIC_ENABLE_APPLE_LOGIN=false
```
웹 재배포 후 Apple 로그인 버튼이 숨겨집니다 (앱 업데이트 불필요).

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

## 참고 링크

- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [Sign In with Apple](https://developer.apple.com/sign-in-with-apple/)
