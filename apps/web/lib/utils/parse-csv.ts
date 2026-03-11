/**
 * CSV 행을 따옴표를 고려하여 필드로 분리
 * "1,069.02" 같은 따옴표 안의 쉼표를 필드 구분자로 처리하지 않음
 */
export function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())

  return fields
}
