import type { FrameInfo } from './types'

export interface ClassifiedFrames {
  mainRows: FrameInfo[][]
  subFrameMap: Map<string, FrameInfo[]>  // parentFrameId -> sub-frames sorted left-to-right
}

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

export function classifyFrames(frames: FrameInfo[]): ClassifiedFrames {
  if (frames.length === 0) return { mainRows: [], subFrameMap: new Map() }

  // detectRows groups by Y proximity; iterate top-to-bottom and classify each group
  const allRows = detectRows(frames)
  const mainRows: FrameInfo[][] = []
  const subFrameMap = new Map<string, FrameInfo[]>()

  for (const row of allRows) {
    const rowTop = Math.min(...row.map(f => f.y))

    if (mainRows.length === 0) {
      mainRows.push(row)
      continue
    }

    const lastMainRow = mainRows[mainRows.length - 1]
    const lastMainBottom = Math.max(...lastMainRow.map(f => f.y + f.height))
    const clearance = rowTop - lastMainBottom

    if (clearance >= 0 && clearance < 400) {
      // Sub-row: each frame assigned to closest parent by X center
      for (const sub of row) {
        const subCenter = sub.x + sub.width / 2
        let bestParent = lastMainRow[0]
        let bestDist = Math.abs(subCenter - (bestParent.x + bestParent.width / 2))
        for (const mainFrame of lastMainRow.slice(1)) {
          const dist = Math.abs(subCenter - (mainFrame.x + mainFrame.width / 2))
          if (dist < bestDist) {
            bestDist = dist
            bestParent = mainFrame
          }
        }
        const existing = subFrameMap.get(bestParent.id) ?? []
        existing.push(sub)
        subFrameMap.set(bestParent.id, existing)
      }
    } else {
      mainRows.push(row)
    }
  }

  for (const [key, subs] of subFrameMap) {
    subFrameMap.set(key, subs.slice().sort((a, b) => a.x - b.x))
  }

  return { mainRows, subFrameMap }
}

export function assignSubFrameNames(classified: ClassifiedFrames, baseNumber: number): Map<string, string> {
  const names = new Map<string, string>()

  classified.mainRows.forEach((row, rowIndex) => {
    const base = baseNumber + rowIndex
    row.forEach((frame, frameIndex) => {
      const frameName = `${base}.${frameIndex + 1}`
      names.set(frame.id, frameName)

      const subs = classified.subFrameMap.get(frame.id) ?? []
      subs.forEach((sub, subIndex) => {
        names.set(sub.id, `${frameName} ${String.fromCharCode(65 + subIndex)}`)
      })
    })
  })

  return names
}
