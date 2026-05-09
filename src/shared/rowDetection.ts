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

  const allRows = detectRows(frames)
  const mainRows: FrameInfo[][] = []
  const subFrameMap = new Map<string, FrameInfo[]>()
  // Per-parent column bottom: tracks the lowest edge of each parent (or its subs)
  // so clearance is measured column-wise, not against the global max-bottom frame.
  const colBottom = new Map<string, number>()

  for (const row of allRows) {
    if (mainRows.length === 0) {
      mainRows.push(row)
      for (const f of row) colBottom.set(f.id, f.y + f.height)
      continue
    }

    const lastMainRow = mainRows[mainRows.length - 1]

    type Assignment = { sub: FrameInfo; parent: FrameInfo }
    const assignments: Assignment[] = []
    let isSubRow = true

    for (const sub of row) {
      const subCenter = sub.x + sub.width / 2
      let bestParent = lastMainRow[0]
      let bestDist = Math.abs(subCenter - (bestParent.x + bestParent.width / 2))
      for (const mf of lastMainRow.slice(1)) {
        const dist = Math.abs(subCenter - (mf.x + mf.width / 2))
        if (dist < bestDist) { bestDist = dist; bestParent = mf }
      }

      const bottom = colBottom.get(bestParent.id) ?? (bestParent.y + bestParent.height)
      const clearance = sub.y - bottom
      if (clearance < 0 || clearance >= 800) { isSubRow = false; break }
      assignments.push({ sub, parent: bestParent })
    }

    if (isSubRow) {
      for (const { sub, parent } of assignments) {
        const existing = subFrameMap.get(parent.id) || []
        existing.push(sub)
        subFrameMap.set(parent.id, existing)
        const prev = colBottom.get(parent.id) ?? (parent.y + parent.height)
        colBottom.set(parent.id, Math.max(prev, sub.y + sub.height))
      }
    } else {
      mainRows.push(row)
      colBottom.clear()
      for (const f of row) colBottom.set(f.id, f.y + f.height)
    }
  }

  // Sort subs by Y then X: handles stacked same-column subs correctly
  for (const [key, subs] of subFrameMap) {
    subFrameMap.set(key, subs.slice().sort((a, b) => a.y - b.y || a.x - b.x))
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

      const subs = classified.subFrameMap.get(frame.id) || []
      subs.forEach((sub, subIndex) => {
        names.set(sub.id, `${frameName} ${String.fromCharCode(65 + subIndex)}`) // A–Z; max 26 sub-frames per parent
      })
    })
  })

  return names
}

export function indexToLetters(n: number): string {
  // 1→"A", 2→"B", ..., 26→"Z", 27→"AA", 28→"AB", etc.
  let result = ''
  while (n > 0) {
    n--
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26)
  }
  return result
}

export function assignLetterModeNames(frames: FrameInfo[]): Map<string, string> {
  const nameMap = new Map<string, string>()
  if (frames.length < 2) return nameMap
  const sorted = [...frames].sort((a, b) => a.y - b.y)
  const parentName = sorted[0].name
  for (let i = 1; i < sorted.length; i++) {
    nameMap.set(sorted[i].id, `${parentName} ${indexToLetters(i)}`)
  }
  return nameMap
}
