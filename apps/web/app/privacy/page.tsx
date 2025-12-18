import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "굴림(Gulim) 애플리케이션의 개인정보처리방침입니다. Google API 서비스 이용 및 데이터 처리 방침을 안내합니다.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8">개인정보처리방침</h1>

        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              1. 개인정보의 수집 및 이용 목적
            </h2>
            <p>
              굴림(Gulim)(이하 &quot;서비스&quot;)는 다음의 목적을 위하여
              개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의
              용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의
              동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-slate-400">
              <li>회원 가입 및 관리</li>
              <li>서비스 제공 및 운영</li>
              <li>Google Sheets 연동을 통한 투자 기록 관리</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              2. 수집하는 개인정보 항목
            </h2>
            <p>서비스는 Google 로그인을 통해 다음의 정보를 수집합니다:</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-slate-400">
              <li>이메일 주소</li>
              <li>이름 (프로필 이름)</li>
              <li>프로필 사진 URL</li>
              <li>Google 계정 고유 식별자</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              3. 개인정보의 보유 및 이용 기간
            </h2>
            <p>
              서비스는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터
              개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서
              개인정보를 처리·보유합니다.
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-slate-400">
              <li>회원 탈퇴 시까지</li>
              <li>법령에 따른 보존 의무가 있는 경우 해당 기간까지</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              4. 개인정보의 제3자 제공
            </h2>
            <p>
              서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지
              않습니다. 다만, 아래의 경우에는 예외로 합니다:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-slate-400">
              <li>이용자가 사전에 동의한 경우</li>
              <li>
                법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와
                방법에 따라 수사기관의 요구가 있는 경우
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              5. Google API 서비스 이용
            </h2>
            <p>
              서비스는 Google API 서비스를 사용하며, Google API 서비스 이용 시
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline ml-1"
              >
                Google API 서비스 사용자 데이터 정책
              </a>
              을 준수합니다.
            </p>
            <p className="mt-3">서비스가 Google API를 통해 접근하는 데이터:</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-slate-400">
              <li>Google Sheets: 사용자의 투자 기록 스프레드시트 읽기/쓰기</li>
              <li>Google Drive: 스프레드시트 파일 검색 및 접근</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              6. 데이터 보호 및 보안 조치
            </h2>
            <p>
              서비스는 사용자의 개인정보 및 민감한 데이터를 보호하기 위해 다음과
              같은 기술적·관리적 보안 조치를 취하고 있습니다:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-slate-400">
              <li>
                <strong className="text-slate-300">전송 암호화:</strong> 모든
                데이터는 HTTPS/TLS를 통해 암호화되어 전송됩니다.
              </li>
              <li>
                <strong className="text-slate-300">데이터 저장:</strong> 투자
                기록 데이터는 사용자 본인의 Google Drive/Sheets에만 저장되며,
                서비스 서버에는 최소한의 사용자 식별 정보(이메일, 이름, 연동된
                시트 ID)만 저장됩니다.
              </li>
              <li>
                <strong className="text-slate-300">접근 제어:</strong> Google
                OAuth 2.0을 통한 인증으로 본인만 자신의 데이터에 접근할 수
                있습니다.
              </li>
              <li>
                <strong className="text-slate-300">최소 권한 원칙:</strong>{" "}
                서비스는 사용자가 명시적으로 선택한 스프레드시트 파일에만
                접근하며, 다른 Google Drive 파일에는 접근하지 않습니다.
              </li>
              <li>
                <strong className="text-slate-300">세션 보안:</strong> 인증
                토큰은 안전하게 관리되며, 로그아웃 시 즉시 만료됩니다.
              </li>
              <li>
                <strong className="text-slate-300">제3자 공유 금지:</strong>{" "}
                사용자 데이터는 어떠한 제3자에게도 판매, 공유, 전송되지
                않습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              7. 개인정보의 파기
            </h2>
            <p>
              서비스는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가
              불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              8. 이용자의 권리
            </h2>
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-slate-400">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리정지 요구</li>
              <li>Google 계정 설정에서 앱 접근 권한 해제</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              9. 개인정보 보호책임자
            </h2>
            <p>
              서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보
              처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와
              같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="mt-3 p-4 bg-white/5 rounded-lg">
              <p className="text-slate-400">이메일: xodndxnxn@gmail.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              10. 개인정보처리방침 변경
            </h2>
            <p>
              이 개인정보처리방침은 2024년 1월 1일부터 적용됩니다. 법령 및
              방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는
              변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-slate-500 text-xs">
          <p>최종 수정일: 2025년 12월 18일</p>
        </div>
      </div>
    </div>
  );
}
