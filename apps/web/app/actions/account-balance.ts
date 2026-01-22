"use server";

import { auth } from "@repo/auth/server";
import { createServiceClient } from "@repo/database/server";
import { revalidatePath } from "next/cache";
import { batchUpdateSheet, fetchSheetData } from "../../lib/google-sheets";

export interface AccountBalanceInput {
  yearMonth: string; // YYYY-MM 형식
  balance: number;
}

export interface SaveAccountBalanceResult {
  success: boolean;
  error?: string;
}

/**
 * 계좌총액을 Google Sheet에 저장
 * 시트 구조: "5. 계좌내역(누적)" - E열=연도, F열=월, H열=계좌총액
 * Row 19부터 데이터 시작
 */
export async function saveAccountBalance(
  input: AccountBalanceInput
): Promise<SaveAccountBalanceResult> {
  console.log("[saveAccountBalance] Called with input:", JSON.stringify(input));

  const session = await auth();

  if (!session?.user?.id) {
    console.log("[saveAccountBalance] No session user id");
    return { success: false, error: "로그인이 필요합니다." };
  }

  if (!session.accessToken) {
    console.log("[saveAccountBalance] No access token");
    return { success: false, error: "Google 인증이 필요합니다." };
  }

  const supabase = createServiceClient();

  try {
    // 사용자의 spreadsheet_id 조회
    let { data: user } = await supabase
      .from("users")
      .select("id, spreadsheet_id")
      .eq("id", session.user.id)
      .single();

    console.log(
      "[saveAccountBalance] User by ID lookup:",
      user ? "found" : "not found"
    );

    if (!user && session.user.email) {
      const { data: userByEmail } = await supabase
        .from("users")
        .select("id, spreadsheet_id")
        .eq("email", session.user.email)
        .single();

      if (userByEmail) {
        user = userByEmail;
        console.log("[saveAccountBalance] User by email lookup: found");
      }
    }

    if (!user?.spreadsheet_id) {
      console.log("[saveAccountBalance] No spreadsheet_id");
      return { success: false, error: "연동된 스프레드시트가 없습니다." };
    }

    // 실제 DB user ID 사용 (session.user.id와 다를 수 있음)
    const dbUserId = user.id as string;
    console.log("[saveAccountBalance] Using dbUserId:", dbUserId);

    // 날짜 파싱 (YYYY-MM)
    const dateParts = input.yearMonth.split("-");
    const year = dateParts[0] || "";
    const monthNum = Number.parseInt(dateParts[1] || "1", 10);
    const yearShort = year.slice(-2); // "2025" -> "25"
    const monthStr = `${monthNum}월`; // "1월", "2월", ...
    const yearMonthKey = `${year}${monthNum}`; // "20258" 형식

    // 기존 데이터를 읽어서 마지막 데이터 행 번호를 찾음
    // 시트 구조: B열=연도앞두자리, C열=월숫자, D열=연도+월, E열=전체연도, F열=월텍스트, G열=날짜(수식), H열=계좌총액
    const existingData = await fetchSheetData(
      session.accessToken,
      user.spreadsheet_id,
      "'5. 계좌내역(누적)'!B:H"
    );

    // 중복 연월 체크 - 같은 연도/월의 데이터가 이미 존재하는지 확인
    if (existingData && existingData.length > 1) {
      for (let i = 1; i < existingData.length; i++) {
        const row = existingData[i];
        if (!row || !Array.isArray(row) || row.length < 7) continue;

        const rowYear = String(row[3] || "").trim(); // E열 = 전체연도
        const rowMonth = typeof row[1] === "number" ? row[1] : 0; // C열 = 월숫자
        const rowBalance = parseSheetNumber(row[6]); // H열 = 계좌총액

        // #REF! 오류 행이나 빈 행 건너뛰기
        if (String(row[0]).includes("#REF") || String(row[6]).includes("#REF")) continue;
        if (rowBalance === 0) continue;

        // 같은 연도와 월이면 중복
        if (rowYear === year && rowMonth === monthNum) {
          console.log("[saveAccountBalance] Duplicate yearMonth found:", input.yearMonth);
          return {
            success: false,
            error: `${year}년 ${monthNum}월 데이터가 이미 존재합니다. 기존 데이터를 수정해주세요.`,
          };
        }
      }
    }

    // 기존 데이터에서 마지막 유효 행 찾기 (가장 간단하고 안전한 방식)
    // 새 데이터는 항상 마지막에 추가 (시트 데이터는 사용자가 직접 정렬 관리)
    const newYearMonthKey = Number(yearMonthKey); // 예: 20258
    
    let lastValidRowIndex = -1; // existingData에서의 마지막 유효 행 인덱스
    
    if (existingData && existingData.length > 0) {
      for (let i = existingData.length - 1; i >= 0; i--) {
        const row = existingData[i];
        if (!row || !Array.isArray(row) || row.length < 7) continue;

        // B열(0)에 숫자가 있고, H열(6)에 유효한 계좌총액이 있는지 확인
        const bVal = row[0];
        const hVal = row[6];
        const isValidRow =
          typeof bVal === "number" &&
          bVal > 0 &&
          typeof hVal === "number" &&
          hVal > 0 &&
          !String(row[0]).includes("#REF") &&
          !String(row[6]).includes("#REF");

        if (isValidRow) {
          lastValidRowIndex = i;
          break;
        }
      }
    }

    // 마지막 유효 행 다음에 추가 (없으면 row 45부터 시작)
    // existingData 인덱스 + 1 = 시트 행 번호 (1-based)
    const targetRow = lastValidRowIndex >= 0 ? lastValidRowIndex + 2 : 45;

    console.log("[saveAccountBalance] Last valid row index:", lastValidRowIndex);
    console.log("[saveAccountBalance] Target row (1-based):", targetRow);
    console.log("[saveAccountBalance] New yearMonthKey:", newYearMonthKey);

    const sheetName = "5. 계좌내역(누적)";

    console.log(
      "[saveAccountBalance] Data: yearShort=",
      yearShort,
      "monthNum=",
      monthNum,
      "yearMonthKey=",
      yearMonthKey,
      "year=",
      year,
      "monthStr=",
      monthStr,
      "balance=",
      input.balance
    );

    // 시트에 추가할 데이터
    // 구조: B열=연도앞두자리(25), C열=월숫자(8), D열=연도+월(20258), E열=전체연도(2025), F열=월텍스트(8월), G열=날짜(수식), H열=계좌총액
    // I열, J열, K열 이후는 시트에 미리 수식이 입력되어 있으므로 건드리지 않음
    const sheetResult = await batchUpdateSheet(
      session.accessToken,
      user.spreadsheet_id,
      [
        {
          range: `'${sheetName}'!B${targetRow}:F${targetRow}`,
          values: [[Number(yearShort), monthNum, Number(yearMonthKey), year, monthStr]], // B~F
        },
        {
          range: `'${sheetName}'!H${targetRow}`,
          values: [[input.balance]], // H: 계좌총액만 저장 (I, J 등은 시트 수식이 자동 계산)
        },
      ]
    );

    console.log("[saveAccountBalance] Sheet write result:", sheetResult);

    // Supabase에도 저장 (upsert - 중복 시 업데이트)
    // Note: account_balances 테이블은 새로 생성된 테이블이므로 타입 재생성 전까지 any 사용
    const { error: dbError } = await (supabase as any)
      .from("account_balances")
      .upsert(
        {
          user_id: dbUserId,
          year_month: input.yearMonth,
          balance: input.balance,
          sheet_synced: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,year_month" }
      );

    if (dbError) {
      console.error("Supabase upsert error:", dbError);
      // 시트 저장은 성공했으므로 에러 무시
    }

    revalidatePath("/dashboard");
    revalidatePath("/transactions");

    return { success: true };
  } catch (error) {
    console.error("saveAccountBalance error:", error);
    return { success: false, error: "저장 중 오류가 발생했습니다." };
  }
}

// 숫자 파싱 헬퍼
function parseSheetNumber(val: any): number {
  if (!val) return 0;
  const cleaned = String(val).replace(/[₩$,\s-]/g, "");
  return Number.parseFloat(cleaned) || 0;
}

export interface DeleteAccountBalanceInput {
  yearMonth: string; // YYYY-MM
  balance: number;
}

export interface UpdateAccountBalanceInput {
  originalYearMonth: string; // 원래 연월 (수정 전)
  originalBalance: number; // 원래 금액 (수정 전)
  newYearMonth: string; // 새 연월
  newBalance: number; // 새 금액
}

/**
 * 계좌총액 삭제 (Google Sheet에서)
 */
export async function deleteAccountBalance(
  input: DeleteAccountBalanceInput
): Promise<SaveAccountBalanceResult> {
  console.log(
    "[deleteAccountBalance] Called with input:",
    JSON.stringify(input)
  );

  const session = await auth();

  if (!session?.user?.id) {
    console.log("[deleteAccountBalance] No session user id");
    return { success: false, error: "로그인이 필요합니다." };
  }

  if (!session.accessToken) {
    console.log("[deleteAccountBalance] No access token");
    return { success: false, error: "Google 인증이 필요합니다." };
  }

  const supabase = createServiceClient();

  try {
    // 사용자의 spreadsheet_id 조회
    let { data: user } = await supabase
      .from("users")
      .select("id, spreadsheet_id")
      .eq("id", session.user.id)
      .single();

    if (!user && session.user.email) {
      const { data: userByEmail } = await supabase
        .from("users")
        .select("id, spreadsheet_id")
        .eq("email", session.user.email)
        .single();

      if (userByEmail) {
        user = userByEmail;
      }
    }

    if (!user?.spreadsheet_id) {
      console.log("[deleteAccountBalance] No spreadsheet_id");
      return { success: false, error: "연동된 스프레드시트가 없습니다." };
    }

    console.log(
      "[deleteAccountBalance] User found, spreadsheet_id:",
      user.spreadsheet_id
    );

    // Google Sheet에서 해당 행 찾아서 삭제
    // 시트 구조: B열=연도앞두자리, C열=월숫자, D열=연도+월, E열=전체연도, F열=월텍스트, G열=날짜(수식), H열=계좌총액
    const sheetName = "5. 계좌내역(누적)";
    console.log("[deleteAccountBalance] Fetching sheet data...");
    const rows = await fetchSheetData(
      session.accessToken,
      user.spreadsheet_id,
      `'${sheetName}'!B:H`
    );

    console.log("[deleteAccountBalance] Sheet rows count:", rows?.length || 0);

    if (rows && rows.length > 1) {
      let found = false;

      // 입력된 연월 파싱
      const [inputYear, inputMonth] = input.yearMonth.split("-");
      const inputMonthNum = Number.parseInt(inputMonth || "0", 10);

      console.log(
        "[deleteAccountBalance] Looking for year:",
        inputYear,
        "month:",
        inputMonthNum
      );

      // 매칭되는 행 찾기 (연도 + 월 + 금액)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row) || row.length < 7) continue;

        // B열(0)=연도앞두자리, C열(1)=월숫자, E열(3)=전체연도, F열(4)=월텍스트, H열(6)=계좌총액
        const bVal = row[0];
        const cVal = row[1];
        const rowYear = String(row[3] || "").trim();
        const rowBalance = parseSheetNumber(row[6]);

        // #REF! 오류 행 건너뛰기
        if (String(row[0]).includes("#REF") || String(row[6]).includes("#REF"))
          continue;

        // 월 파싱 (C열 숫자 사용)
        const rowMonth = typeof cVal === "number" ? cVal : 0;

        // 처음 몇 개 행만 상세 로깅
        if (i <= 5) {
          console.log(
            `[deleteAccountBalance] Row ${i}: year=${rowYear}, month=${rowMonth}, balance=${rowBalance}`
          );
        }

        if (
          rowYear === inputYear &&
          rowMonth === inputMonthNum &&
          Math.abs(rowBalance - input.balance) < 1
        ) {
          console.log(
            `[deleteAccountBalance] Match found at row ${i}, clearing H column...`
          );
          // H열(계좌총액)만 비우기 (다른 열은 수식이므로 건드리지 않음)
          await batchUpdateSheet(session.accessToken, user.spreadsheet_id, [
            {
              range: `'${sheetName}'!H${i + 1}`,
              values: [[""]], // H열만 빈 값으로
            },
          ]);
          found = true;
          break;
        }
      }
      if (!found) {
        console.log("[deleteAccountBalance] No matching row found in sheet");
      }
    }

    // Supabase에서도 삭제
    // Note: account_balances 테이블은 새로 생성된 테이블이므로 타입 재생성 전까지 any 사용
    const userId = user.id as string;
    const { error: dbError } = await (supabase as any)
      .from("account_balances")
      .delete()
      .eq("user_id", userId)
      .eq("year_month", input.yearMonth);

    if (dbError) {
      console.error("[deleteAccountBalance] Supabase delete error:", dbError);
      // 시트 삭제는 성공했으므로 에러 무시
    }

    revalidatePath("/dashboard");
    revalidatePath("/transactions");

    console.log("[deleteAccountBalance] Success");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteAccountBalance] Error:", error);
    const errorMessage = error?.message || "알 수 없는 오류";
    return { success: false, error: `삭제 실패: ${errorMessage}` };
  }
}

/**
 * 계좌총액 수정 (Google Sheet + Supabase)
 */
export async function updateAccountBalance(
  input: UpdateAccountBalanceInput
): Promise<SaveAccountBalanceResult> {
  console.log("[updateAccountBalance] Called with input:", JSON.stringify(input));

  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  if (!session.accessToken) {
    return { success: false, error: "Google 인증이 필요합니다." };
  }

  const supabase = createServiceClient();

  try {
    // 사용자의 spreadsheet_id 조회
    let { data: user } = await supabase
      .from("users")
      .select("id, spreadsheet_id")
      .eq("id", session.user.id)
      .single();

    if (!user && session.user.email) {
      const { data: userByEmail } = await supabase
        .from("users")
        .select("id, spreadsheet_id")
        .eq("email", session.user.email)
        .single();

      if (userByEmail) {
        user = userByEmail;
      }
    }

    if (!user?.spreadsheet_id) {
      return { success: false, error: "연동된 스프레드시트가 없습니다." };
    }

    const userId = user.id as string;

    // Google Sheet에서 해당 행 찾아서 수정
    const sheetName = "5. 계좌내역(누적)";
    const rows = await fetchSheetData(
      session.accessToken,
      user.spreadsheet_id,
      `'${sheetName}'!B:H`
    );

    // 입력된 연월 파싱
    const [origYear, origMonth] = input.originalYearMonth.split("-");
    const origMonthNum = Number.parseInt(origMonth || "0", 10);
    const [newYear, newMonth] = input.newYearMonth.split("-");
    const newMonthNum = Number.parseInt(newMonth || "1", 10);

    // 연월이 바뀌는 경우, 새 연월이 이미 존재하는지 확인
    if (input.originalYearMonth !== input.newYearMonth && rows && rows.length > 1) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row) || row.length < 7) continue;

        const rowYear = String(row[3] || "").trim();
        const cVal = row[1];
        const rowMonth = typeof cVal === "number" ? cVal : 0;
        const rowBalance = parseSheetNumber(row[6]);

        if (String(row[0]).includes("#REF") || String(row[6]).includes("#REF")) continue;
        if (rowBalance === 0) continue;

        // 새 연월과 같은 데이터가 이미 존재하면 에러
        if (rowYear === newYear && rowMonth === newMonthNum) {
          return {
            success: false,
            error: `${newYear}년 ${newMonthNum}월 데이터가 이미 존재합니다. 다른 연월을 선택해주세요.`,
          };
        }
      }
    }

    if (rows && rows.length > 1) {

      // 매칭되는 행 찾기
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row) || row.length < 7) continue;

        const rowYear = String(row[3] || "").trim();
        const cVal = row[1];
        const rowMonth = typeof cVal === "number" ? cVal : 0;
        const rowBalance = parseSheetNumber(row[6]);

        if (String(row[0]).includes("#REF") || String(row[6]).includes("#REF"))
          continue;

        if (
          rowYear === origYear &&
          rowMonth === origMonthNum &&
          Math.abs(rowBalance - input.originalBalance) < 1
        ) {
          console.log(`[updateAccountBalance] Match found at row ${i}, updating...`);

          // 새 연월 파싱 (이미 위에서 파싱됨)
          const yearShort = (newYear || "").slice(-2);
          const yearMonthKey = `${newYear}${newMonthNum}`;
          const monthStr = `${newMonthNum}월`;

          // 시트 업데이트 (연월이 바뀌면 B~F도 업데이트, 금액만 바뀌면 H만 업데이트)
          if (input.originalYearMonth !== input.newYearMonth) {
            await batchUpdateSheet(session.accessToken, user.spreadsheet_id, [
              {
                range: `'${sheetName}'!B${i + 1}:F${i + 1}`,
                values: [[Number(yearShort), newMonthNum, yearMonthKey, newYear, monthStr]],
              },
              {
                range: `'${sheetName}'!H${i + 1}`,
                values: [[input.newBalance]],
              },
            ]);
          } else {
            await batchUpdateSheet(session.accessToken, user.spreadsheet_id, [
              {
                range: `'${sheetName}'!H${i + 1}`,
                values: [[input.newBalance]],
              },
            ]);
          }
          break;
        }
      }
    }

    // Supabase 업데이트
    if (input.originalYearMonth !== input.newYearMonth) {
      // 연월이 바뀌면 기존 삭제 후 새로 생성
      await (supabase as any)
        .from("account_balances")
        .delete()
        .eq("user_id", userId)
        .eq("year_month", input.originalYearMonth);

      await (supabase as any)
        .from("account_balances")
        .upsert(
          {
            user_id: userId,
            year_month: input.newYearMonth,
            balance: input.newBalance,
            sheet_synced: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,year_month" }
        );
    } else {
      // 금액만 바뀌면 업데이트
      await (supabase as any)
        .from("account_balances")
        .update({
          balance: input.newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("year_month", input.originalYearMonth);
    }

    revalidatePath("/dashboard");
    revalidatePath("/transactions");

    return { success: true };
  } catch (error: any) {
    console.error("[updateAccountBalance] Error:", error);
    return { success: false, error: `수정 실패: ${error?.message || "알 수 없는 오류"}` };
  }
}

/**
 * 계좌총액 목록 조회 (Google Sheet에서)
 */
export interface AccountBalanceRecord {
  id: string; // yearMonth를 ID로 사용
  yearMonth: string;
  year: number;
  month: number;
  balance: number;
  displayDate: string; // "2025년 1월"
}

export async function getAccountBalances(): Promise<AccountBalanceRecord[]> {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  // 데모 모드인 경우 데모 계좌 잔액 반환 (Play Store 심사용)
  if (session.isDemo) {
    const now = new Date();
    const demoBalances: AccountBalanceRecord[] = [];

    // 최근 12개월 데이터 생성
    for (let i = 0; i < 12; i++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      // 기본 잔액 + 월별 증가분
      const baseBalance = 100000000 + (11 - i) * 5000000;
      const variation = Math.floor(Math.random() * 3000000) - 1500000;

      demoBalances.push({
        id: `${year}-${String(month).padStart(2, '0')}`,
        yearMonth: `${year}-${String(month).padStart(2, '0')}`,
        year,
        month,
        balance: baseBalance + variation,
        displayDate: `${year}년 ${month}월`,
      });
    }

    return demoBalances;
  }

  if (!session.accessToken) {
    return [];
  }

  const supabase = createServiceClient();

  try {
    let { data: user } = await supabase
      .from("users")
      .select("spreadsheet_id")
      .eq("id", session.user.id)
      .single();

    if (!user && session.user.email) {
      const { data: userByEmail } = await supabase
        .from("users")
        .select("spreadsheet_id")
        .eq("email", session.user.email)
        .single();

      if (userByEmail) {
        user = userByEmail;
      }
    }

    if (!user?.spreadsheet_id) {
      return [];
    }

    // Google Sheet에서 전체 컬럼 데이터 조회 (구조 파악용)
    const allRows = await fetchSheetData(
      session.accessToken,
      user.spreadsheet_id,
      "'5. 계좌내역(누적)'!A:J"
    );

    console.log("===========================================");
    console.log("[getAccountBalances] Sheet structure analysis");
    console.log("[getAccountBalances] Total rows:", allRows?.length || 0);
    if (allRows && allRows.length > 0) {
      console.log(
        "[getAccountBalances] Header row (row 1):",
        JSON.stringify(allRows[0])
      );
      // Row 45-55 영역 확인 (수식이 참조하는 영역)
      console.log("[getAccountBalances] Rows 45-55 (formula reference area):");
      for (let i = 44; i < Math.min(55, allRows.length); i++) {
        if (
          allRows[i]?.some(
            (cell: any) => cell !== "" && cell !== null && cell !== undefined
          )
        ) {
          console.log(
            `[getAccountBalances] Row ${i + 1}:`,
            JSON.stringify(allRows[i])
          );
        }
      }
      // 마지막 몇 개 행도 출력 (최근 데이터)
      const lastRows = allRows.slice(-5);
      console.log("[getAccountBalances] Last 5 rows:");
      lastRows.forEach((row, idx) => {
        console.log(
          `[getAccountBalances] Row ${allRows.length - 5 + idx + 1}:`,
          JSON.stringify(row)
        );
      });
    }
    console.log("===========================================");

    // Google Sheet에서 데이터 조회
    // 시트 구조: B열=연도앞두자리, C열=월숫자, D열=연도+월, E열=전체연도, F열=월텍스트, G열=날짜(수식), H열=계좌총액
    const rows = await fetchSheetData(
      session.accessToken,
      user.spreadsheet_id,
      "'5. 계좌내역(누적)'!B:H"
    );

    if (!rows || rows.length <= 1) {
      return [];
    }

    const results: AccountBalanceRecord[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row) || row.length < 7) continue;

      // B열(0)=연도앞두자리, C열(1)=월숫자, E열(3)=전체연도, F열(4)=월텍스트, H열(6)=계좌총액
      const bVal = row[0]; // 연도 앞 두 자리 (25)
      const cVal = row[1]; // 월 숫자 (8)
      const rowYear = String(row[3] || "").trim(); // 전체 연도 (2025)
      const rowMonthStr = String(row[4] || "").trim(); // 월 텍스트 (8월)
      const rowBalance = parseSheetNumber(row[6]); // 계좌총액

      // #REF! 오류 행 건너뛰기
      if (String(row[0]).includes("#REF") || String(row[6]).includes("#REF"))
        continue;

      // 유효하지 않은 데이터 건너뛰기
      if (!rowYear || rowBalance === 0) continue;
      if (typeof bVal !== "number" || bVal <= 0) continue;

      // 월 파싱 (C열 숫자 또는 F열 "N월" 형식)
      let month = 0;
      if (typeof cVal === "number" && cVal >= 1 && cVal <= 12) {
        month = cVal;
      } else {
        const monthMatch = rowMonthStr.match(/^(\d{1,2})월?$/);
        if (monthMatch) {
          month = Number.parseInt(monthMatch[1] || "0", 10);
        }
      }

      const year = Number.parseInt(rowYear, 10);

      if (year < 2000 || year > 2100 || month < 1 || month > 12) continue;

      const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

      results.push({
        id: yearMonth,
        yearMonth,
        year,
        month,
        balance: Math.round(rowBalance),
        displayDate: `${year}년 ${month}월`,
      });
    }

    // 최신순 정렬
    results.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

    return results;
  } catch (error) {
    console.error("getAccountBalances error:", error);
    return [];
  }
}
