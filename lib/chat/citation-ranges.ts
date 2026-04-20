export function expandCitationRange(rangeText: string): number[] {
  const parts = rangeText.split(",").map((part) => part.trim())
  const numbers: number[] = []

  for (const part of parts) {
    if (part.includes("-")) {
      const [startText, endText] = part.split("-")
      const start = Number.parseInt(startText, 10)
      const end = Number.parseInt(endText, 10)

      if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end) {
        for (let current = start; current <= end; current += 1) {
          numbers.push(current)
        }
      }

      continue
    }

    const number = Number.parseInt(part, 10)

    if (!Number.isNaN(number)) {
      numbers.push(number)
    }
  }

  return numbers
}

export function getCitationNumbersFromText(text: string): number[] {
  const numbers = new Set<number>()

  for (const match of text.matchAll(/\[([\d\s,\-]+)\]/g)) {
    for (const number of expandCitationRange(match[1])) {
      if (number > 0) {
        numbers.add(number)
      }
    }
  }

  return Array.from(numbers)
}
