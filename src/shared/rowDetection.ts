import type { FrameInfo } from './types'

export function detectRows(frames: FrameInfo[]): FrameInfo[][] {
  if (frames.length === 0) return []

  const sorted = [...frames].sort((a, b) => a.y - b.y)
  const avgHeight = sorted.reduce((sum, fr) => sum + fr.height, 0) / sorted.length
  const tolerance = avgHeight * 0.5

  const rows: FrameInfo[][] = []
  let currentRow: FrameInfo[] = [sorted[0]]
  let rowRefY = sorted[0].y

  for (let i = 1; i < sorted.length; i++) {
    const frame = sorted[i]
    if (Math.abs(frame.y - rowRefY) < tolerance) {
      currentRow.push(frame)
    } else {
      rows.push(currentRow.slice().sort((a, b) => a.x - b.x))
      currentRow = [frame]
      rowRefY = frame.y
    }
  }
  rows.push(currentRow.slice().sort((a, b) => a.x - b.x))

  return rows
}

export function assignNames(rows: FrameInfo[][], baseNumber: number): Map<string, string> {
  const names = new Map<string, string>()
  rows.forEach((row, rowIndex) => {
    const base = baseNumber + rowIndex
    row.forEach((frame, frameIndex) => {
      names.set(frame.id, `${base}.${frameIndex + 1}`)
    })
  })
  return names
}
