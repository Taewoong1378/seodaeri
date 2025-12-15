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

    // B:H 범위에서 실제 데이터가 있는 마지막 행 찾기
    // (빈 행이나 #REF! 오류 행은 제외)
    let lastDataRow = 0;
    if (existingData && existingData.length > 0) {
      for (let i = existingData.length - 1; i >= 0; i--) {
        const row = existingData[i];
        if (row && Array.isArray(row) && row.length >= 7) {
          // B열(0)에 숫자가 있고, H열(6)에 유효한 계좌총액이 있는지 확인
          const bVal = row[0];
          const hVal = row[6];
          const isValidRow =
            typeof bVal === "number" &&
            bVal > 0 &&
            typeof hVal === "number" &&
            hVal > 0;
          if (isValidRow) {
            lastDataRow = i + 1; // 1-based row number
            break;
          }
        }
      }
    }

    // 마지막 유효 데이터 행이 없으면 44행부터 시작 (Row 45가 첫 데이터)
    const nextRow = lastDataRow > 0 ? lastDataRow + 1 : 45;

    console.log(
      "[saveAccountBalance] Last valid data row:",
      lastDataRow,
      "Writing to row:",
      nextRow
    );
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
          range: `'5. 계좌내역(누적)'!B${nextRow}:F${nextRow}`,
          values: [[Number(yearShort), monthNum, yearMonthKey, year, monthStr]], // B~F
        },
        {
          range: `'5. 계좌내역(누적)'!H${nextRow}`,
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

  if (!session?.user?.id || !session.accessToken) {
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
