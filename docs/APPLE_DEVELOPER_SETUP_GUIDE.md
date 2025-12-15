# Apple Developer 계정 설정 가이드 (서대리님용)

이 문서는 **비개발자**분이 Apple Developer 계정을 설정하고, 개발자에게 권한을 부여하는 방법을 안내합니다.

---

## 전체 흐름 요약

```
서대리님이 하실 일 (약 30분~1시간)
├── 1단계: Apple Developer Program 가입 ($99)
├── 2단계: 개발자 초대하기
└── 3단계: App Store Connect에서 앱 만들기

개발자가 할 일 (이후)
├── 기술 설정 (인증서, 앱 ID 등)
├── 앱 빌드 및 업로드
└── 심사 제출
```

---

## 1단계: Apple Developer Program 가입

### 준비물

- Apple ID (없으면 새로 만들어주세요)
- 신용카드 또는 체크카드 ($99 = 약 13만원)
- 휴대폰 (본인 인증용)

### 진행 방법

1. **Apple Developer 사이트 접속**

   - https://developer.apple.com 에 접속
   - 우측 상단 `Account` 클릭
   - Apple ID로 로그인

2. **프로그램 가입**

   - 로그인 후 `Apple Developer Program` 클릭
   - `Enroll` (가입) 버튼 클릭
   - `Start Your Enrollment` 클릭

3. **계정 유형 선택**

   - **Individual (개인)**: 개인 명의로 가입
   - **Organization (기업)**: 사업자등록증 필요
   - 👉 처음에는 **Individual**로 시작해도 됩니다

4. **개인정보 입력**

   - 이름, 주소, 전화번호 입력
   - 본인 인증 진행

5. **결제**

   - 연회비 $99 USD 결제
   - 결제 완료 후 **24~48시간 내** 승인됨

6. **승인 확인**
   - 이메일로 승인 완료 알림이 옵니다
   - https://developer.apple.com/account 에서 확인 가능

---

## 2단계: 개발자 초대하기

가입이 완료되면 개발자를 팀원으로 초대해주세요.

### 2-1. Apple Developer 사이트에서 초대

1. https://developer.apple.com/account 접속
2. 좌측 메뉴에서 `People` 클릭
3. `+` 버튼 또는 `Invite People` 클릭
4. 개발자 정보 입력:
   - **First Name**: 개발자 이름
   - **Last Name**: 개발자 성
   - **Email**: 개발자 Apple ID 이메일
   - **Role**: `Admin` 선택 ⬅️ 중요!
5. `Invite` 클릭

### 2-2. App Store Connect에서도 초대

1. https://appstoreconnect.apple.com 접속
2. `Users and Access` (사용자 및 액세스) 클릭
3. `+` 버튼 클릭
4. 개발자 정보 입력:
   - **Email**: 개발자 Apple ID 이메일
   - **Roles**: `Admin` 체크 ⬅️ 중요!
5. `Invite` 클릭

> 💡 **개발자에게 전달할 정보**
>
> - "Apple Developer와 App Store Connect 둘 다 초대 보냈어요"
> - "이메일 확인하시고 초대 수락해주세요"

---

## 3단계: App Store Connect에서 앱 만들기

앱 "껍데기"를 먼저 만들어두면 개발자가 빌드를 업로드할 수 있습니다.

### 진행 방법

1. https://appstoreconnect.apple.com 접속
2. `My Apps` (나의 앱) 클릭
3. `+` 버튼 → `New App` (새로운 앱) 클릭
4. 정보 입력:

| 항목             | 입력값                               |
| ---------------- | ------------------------------------ |
| Platforms        | iOS 체크                             |
| Name             | `gulim`                              |
| Primary Language | Korean                               |
| Bundle ID        | ⚠️ 아직 없으면 개발자가 만든 후 선택 |
| SKU              | `gulim-app` (아무 고유값)            |

5. `Create` 클릭

> ⚠️ **Bundle ID가 목록에 없다면?**
>
> 개발자에게 "Bundle ID 만들어달라"고 요청하세요.
> 개발자가 만든 후 다시 이 화면에서 선택하면 됩니다.
>
> Bundle ID는 `com.seodaeri.app` 형태입니다.

---

## 서대리님이 하실 일 체크리스트

### 지금 당장

- [ ] Apple Developer Program 가입 ($99 결제)
- [ ] 가입 승인 대기 (24~48시간)

### 승인 후

- [ ] 개발자 초대 (Apple Developer 사이트)
- [ ] 개발자 초대 (App Store Connect)
- [ ] App Store Connect에서 앱 만들기

> 💡 앱 아이콘, 스크린샷, 키워드 등 나머지는 개발자가 처리합니다.

---

## 자주 묻는 질문

### Q: 가입하는데 얼마나 걸려요?

결제 후 보통 24~48시간 내에 승인됩니다. 주말이면 더 걸릴 수 있어요.

### Q: 개인(Individual)으로 가입하면 문제가 있나요?

없습니다. 나중에 법인이 생기면 Organization으로 전환할 수 있어요.

### Q: 연회비는 매년 내야 하나요?

네, 매년 $99입니다. 안 내면 앱이 스토어에서 내려갑니다.

### Q: 개발자한테 Admin 권한 줘도 괜찮나요?

네, 괜찮습니다. Admin이어도 **계정 소유권**은 가입한 분에게 있어요.
계약서 서명, 세금 정보 변경 등은 계정 소유자만 할 수 있습니다.

---

## 도움이 필요하면

설정 중 막히는 부분이 있으면 개발자에게 화면 공유하면서 같이 진행하시면 됩니다.

또는 Apple 고객지원에 문의할 수 있습니다:

- https://developer.apple.com/contact/
- 한국어 지원 가능
