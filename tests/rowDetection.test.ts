import { describe, it, expect } from 'vitest'
import { detectRows, assignNames, classifyFrames, assignSubFrameNames, indexToLetters, assignLetterModeNames } from '../src/shared/rowDetection'
import type { FrameInfo } from '../src/shared/types'

function f(id: string, x: number, y: number, width = 100, height = 100): FrameInfo {
  return { id, name: `Frame ${id}`, x, y, width, height }
}

describe('detectRows', () => {
  it('returns empty array for empty input', () => {
    expect(detectRows([])).toEqual([])
  })

  it('single frame → one row with one frame', () => {
    const rows = detectRows([f('a', 0, 0)])
    expect(rows).toHaveLength(1)
    expect(rows[0][0].id).toBe('a')
  })

  it('frames at same Y → one row sorted left-to-right by X', () => {
    const rows = detectRows([f('c', 400, 0), f('a', 0, 0), f('b', 200, 0)])
    expect(rows).toHaveLength(1)
    expect(rows[0].map(fr => fr.id)).toEqual(['a', 'b', 'c'])
  })

  it('frames in two distinct rows — sorted top-to-bottom, left-to-right within', () => {
    const row1 = [f('a', 0, 100), f('b', 200, 100), f('c', 400, 100)]
    const row2 = [f('d', 0, 600), f('e', 200, 600)]
    const rows = detectRows([...row2, ...row1])
    expect(rows).toHaveLength(2)
    expect(rows[0].map(fr => fr.id)).toEqual(['a', 'b', 'c'])
    expect(rows[1].map(fr => fr.id)).toEqual(['d', 'e'])
  })

  it('y diff < tolerance (height×0.5) → same row', () => {
    // height=100, tolerance=50 — diff of 40 is same row
    const rows = detectRows([f('a', 0, 0, 100, 100), f('b', 200, 40, 100, 100)])
    expect(rows).toHaveLength(1)
  })

  it('y diff >= tolerance → different rows', () => {
    // height=100, tolerance=50 — diff of 60 is different row
    const rows = detectRows([f('a', 0, 0, 100, 100), f('b', 200, 60, 100, 100)])
    expect(rows).toHaveLength(2)
  })
})

describe('assignNames', () => {
  it('single frame gets base.1', () => {
    const names = assignNames([[f('a', 0, 0)]], 31)
    expect(names.get('a')).toBe('31.1')
  })

  it('single row sequential', () => {
    const frames = [f('a', 0, 0), f('b', 100, 0), f('c', 200, 0)]
    const names = assignNames([frames], 31)
    expect(names.get('a')).toBe('31.1')
    expect(names.get('b')).toBe('31.2')
    expect(names.get('c')).toBe('31.3')
  })

  it('second row increments base by 1', () => {
    const names = assignNames([[f('a', 0, 0)], [f('b', 0, 200)]], 31)
    expect(names.get('a')).toBe('31.1')
    expect(names.get('b')).toBe('32.1')
  })

  it('10 frames row1, 5 frames row2, base=31', () => {
    const row1 = Array.from({ length: 10 }, (_, i) => f(`r1-${i}`, i * 100, 0))
    const row2 = Array.from({ length: 5 }, (_, i) => f(`r2-${i}`, i * 100, 600))
    const names = assignNames([row1, row2], 31)
    expect(names.get('r1-0')).toBe('31.1')
    expect(names.get('r1-9')).toBe('31.10')
    expect(names.get('r2-0')).toBe('32.1')
    expect(names.get('r2-4')).toBe('32.5')
  })

  it('flat sequential — no rollover past .9', () => {
    const row = Array.from({ length: 11 }, (_, i) => f(`f${i}`, i * 100, 0))
    const names = assignNames([row], 5)
    expect(names.get('f9')).toBe('5.10')
    expect(names.get('f10')).toBe('5.11')
  })
})

describe('classifyFrames', () => {
  it('empty input returns empty result', () => {
    const result = classifyFrames([])
    expect(result.mainRows).toHaveLength(0)
    expect(result.subFrameMap.size).toBe(0)
  })

  it('all frames in rows → subFrameMap empty', () => {
    // clearance from row1 bottom(100) to row2 top(1000) = 900 ≥ 800 → two main rows
    const frames = [f('a', 0, 0), f('b', 200, 0), f('c', 0, 1000)]
    const result = classifyFrames(frames)
    expect(result.mainRows).toHaveLength(2)
    expect(result.subFrameMap.size).toBe(0)
  })

  it('sub-frame clearance < 800 → classified as sub', () => {
    // parent bottom = y(0) + height(100) = 100; sub top = 200 → clearance = 100 < 800
    const parent = f('p', 0, 0)
    const sub = f('s', 0, 200)
    const result = classifyFrames([parent, sub])
    expect(result.mainRows).toHaveLength(1)
    expect(result.subFrameMap.get('p')).toHaveLength(1)
    expect(result.subFrameMap.get('p')![0].id).toBe('s')
  })

  it('clearance exactly 800 → treated as main, not sub', () => {
    // parent bottom = 100; frame top = 900 → clearance = 800 → NOT sub
    const parent = f('p', 0, 0)
    const border = f('b', 0, 900)
    const result = classifyFrames([parent, border])
    expect(result.mainRows).toHaveLength(2)
    expect(result.subFrameMap.size).toBe(0)
  })

  it('clearance > 800 → treated as new main row', () => {
    // parent bottom = 100; frame top = 1000 → clearance = 900 ≥ 800 → main
    const parent = f('p', 0, 0)
    const extra = f('e', 0, 1000)
    const result = classifyFrames([parent, extra])
    expect(result.mainRows).toHaveLength(2)
    expect(result.subFrameMap.size).toBe(0)
  })

  it('multiple sub-frames under same parent → sorted left-to-right', () => {
    const parent = f('p', 100, 0)
    const subRight = f('sr', 200, 200)
    const subLeft = f('sl', 0, 200)
    const result = classifyFrames([parent, subRight, subLeft])
    const subs = result.subFrameMap.get('p')!
    expect(subs).toHaveLength(2)
    expect(subs[0].id).toBe('sl')
    expect(subs[1].id).toBe('sr')
  })

  it('overlapping frame (negative clearance) → treated as new main row', () => {
    // frame overlaps last main row bottom — clearance is negative → new main, not sub
    const main = f('m', 0, 0)        // bottom = 100
    const overlap = f('o', 0, 50)    // y=50, clearance = 50 - 100 = -50
    const result = classifyFrames([main, overlap])
    expect(result.mainRows).toHaveLength(2)
    expect(result.subFrameMap.size).toBe(0)
  })

  it('two main rows each with their own sub-row', () => {
    // row1 at y=0, sub1 at y=150 (clearance=50 < 800 → sub of row1)
    // row2 at y=1100 (clearance from row1 bottom = 1000 ≥ 800 → main)
    // sub2 at y=1250 (clearance from row2 bottom = 50 < 800 → sub of row2)
    const r1 = f('r1', 0, 0)
    const s1 = f('s1', 0, 150)
    const r2 = f('r2', 0, 1100)
    const s2 = f('s2', 0, 1250)
    const result = classifyFrames([r1, s1, r2, s2])
    expect(result.mainRows).toHaveLength(2)
    expect(result.subFrameMap.get('r1')).toHaveLength(1)
    expect(result.subFrameMap.get('r1')![0].id).toBe('s1')
    expect(result.subFrameMap.get('r2')).toHaveLength(1)
    expect(result.subFrameMap.get('r2')![0].id).toBe('s2')
  })

  it('sub-frame assigned to nearest parent by X center', () => {
    // two main frames side by side in same row; sub is closer to p2 by X
    const p1 = f('p1', 0, 0)         // x=0, center=50
    const p2 = f('p2', 500, 0)       // x=500, center=550
    const sub = f('s', 480, 200)     // center=530 → closer to p2 (dist=20) than p1 (dist=480)
    const result = classifyFrames([p1, p2, sub])
    expect(result.mainRows).toHaveLength(1)
    expect(result.subFrameMap.has('p2')).toBe(true)
    expect(result.subFrameMap.has('p1')).toBe(false)
  })
})

describe('assignSubFrameNames', () => {
  it('no sub-frames → same result as assignNames', () => {
    // clearance 900 ≥ 800 → two main rows, no subs
    const frames = [f('a', 0, 0), f('b', 200, 0), f('c', 0, 1000)]
    const classified = classifyFrames(frames)
    const names = assignSubFrameNames(classified, 31)
    expect(names.get('a')).toBe('31.1')
    expect(names.get('b')).toBe('31.2')
    expect(names.get('c')).toBe('32.1')
  })

  it('one sub-frame → gets parent name + A', () => {
    const parent = f('p', 0, 0)
    const sub = f('s', 0, 200)
    const classified = classifyFrames([parent, sub])
    const names = assignSubFrameNames(classified, 10)
    expect(names.get('p')).toBe('10.1')
    expect(names.get('s')).toBe('10.1 A')
  })

  it('multiple sub-frames → sequential A, B, C', () => {
    const parent = f('p', 100, 0)
    const s1 = f('s1', 0, 200)
    const s2 = f('s2', 200, 200)
    const s3 = f('s3', 400, 200)
    const classified = classifyFrames([parent, s1, s2, s3])
    const names = assignSubFrameNames(classified, 5)
    expect(names.get('s1')).toBe('5.1 A')
    expect(names.get('s2')).toBe('5.1 B')
    expect(names.get('s3')).toBe('5.1 C')
  })

  it('sub-frames named after their specific parent frame', () => {
    const p1 = f('p1', 0, 0)
    const p2 = f('p2', 200, 0)
    const sub1 = f('sub1', 0, 200)   // under p1 (clearance 100 < 200)
    const sub2 = f('sub2', 200, 200) // under p2
    const classified = classifyFrames([p1, p2, sub1, sub2])
    const names = assignSubFrameNames(classified, 31)
    expect(names.get('sub1')).toBe('31.1 A')
    expect(names.get('sub2')).toBe('31.2 A')
  })
})

describe('indexToLetters', () => {
  it('1 → A', () => expect(indexToLetters(1)).toBe('A'))
  it('26 → Z', () => expect(indexToLetters(26)).toBe('Z'))
  it('27 → AA', () => expect(indexToLetters(27)).toBe('AA'))
  it('28 → AB', () => expect(indexToLetters(28)).toBe('AB'))
  it('52 → AZ', () => expect(indexToLetters(52)).toBe('AZ'))
  it('53 → BA', () => expect(indexToLetters(53)).toBe('BA'))
})

describe('assignLetterModeNames', () => {
  it('returns empty map for fewer than 2 frames', () => {
    const result = assignLetterModeNames([f('a', 0, 0)])
    expect(result.size).toBe(0)
  })

  it('renames frames 2..n with parent name + letter, sorted by Y', () => {
    const parent = { ...f('p', 0, 100), name: '9.6' }
    const child1 = { ...f('c1', 0, 300), name: 'Hero' }
    const child2 = { ...f('c2', 0, 500), name: 'Footer' }
    const result = assignLetterModeNames([parent, child1, child2])
    expect(result.has('p')).toBe(false)
    expect(result.get('c1')).toBe('9.6 A')
    expect(result.get('c2')).toBe('9.6 B')
  })

  it('sorts by Y regardless of input order', () => {
    const bottom = { ...f('b', 0, 500), name: 'Bottom' }
    const parent = { ...f('p', 0, 0), name: '3.2' }
    const middle = { ...f('m', 0, 250), name: 'Middle' }
    const result = assignLetterModeNames([bottom, parent, middle])
    expect(result.has('p')).toBe(false)
    expect(result.get('m')).toBe('3.2 A')
    expect(result.get('b')).toBe('3.2 B')
  })

  it('26 frames → last gets Z', () => {
    const frames = Array.from({ length: 27 }, (_, i) => ({
      ...f(`f${i}`, 0, i * 100),
      name: i === 0 ? '5.1' : `Frame ${i}`,
    }))
    const result = assignLetterModeNames(frames)
    expect(result.get('f26')).toBe('5.1 Z')
  })

  it('27th child gets AA', () => {
    const frames = Array.from({ length: 28 }, (_, i) => ({
      ...f(`f${i}`, 0, i * 100),
      name: i === 0 ? '5.1' : `Frame ${i}`,
    }))
    const result = assignLetterModeNames(frames)
    expect(result.get('f27')).toBe('5.1 AA')
  })

  it('renames regardless of existing X.Y names', () => {
    const frames = [
      { ...f('a', 0, 0), name: '9.6' },
      { ...f('b', 0, 200), name: '10.1' },
      { ...f('c', 0, 400), name: '12.4' },
    ]
    const result = assignLetterModeNames(frames)
    expect(result.has('a')).toBe(false)
    expect(result.get('b')).toBe('9.6 A')
    expect(result.get('c')).toBe('9.6 B')
  })
})

// ─── Extended coverage ────────────────────────────────────────────────────────

describe('detectRows — extended', () => {
  it('three distinct rows sorted top-to-bottom', () => {
    const rows = detectRows([f('c', 0, 2000), f('a', 0, 0), f('b', 0, 1000)])
    expect(rows).toHaveLength(3)
    expect(rows[0][0].id).toBe('a')
    expect(rows[1][0].id).toBe('b')
    expect(rows[2][0].id).toBe('c')
  })

  it('negative Y coordinates — sorted correctly', () => {
    // Figma canvas allows frames at negative coordinates
    const rows = detectRows([f('b', 0, 0), f('a', 0, -500)])
    expect(rows).toHaveLength(2)
    expect(rows[0][0].id).toBe('a') // Y=-500 is above Y=0
    expect(rows[1][0].id).toBe('b')
  })

  it('large canvas Y gap (cross-section simulation) — two distinct rows', () => {
    // Simulates absoluteBoundingBox coords for frames in two Figma sections
    // far apart on the canvas (e.g. 8000px apart)
    const rows = detectRows([f('b', 0, 8500), f('a', 0, 100)])
    expect(rows).toHaveLength(2)
    expect(rows[0][0].id).toBe('a')
    expect(rows[1][0].id).toBe('b')
  })

  it('regression(6f957cb): frames with same relative Y but different absolute Y → different rows', () => {
    // Bug: code.ts used frame.y (relative to parent section) — frames in two different Figma
    // sections both had y≈100 relative to their section, collapsing to one row.
    // Fix: use absoluteBoundingBox — canonical canvas coords differ, two rows correctly detected.
    const rows = detectRows([f('section1', 0, 100), f('section2', 0, 8500)])
    expect(rows).toHaveLength(2)
    expect(rows[0][0].id).toBe('section1') // upper on canvas = first row → gets base number
    expect(rows[1][0].id).toBe('section2') // lower on canvas = second row → gets base+1
  })

  it('input in reverse Y order → output still top-to-bottom', () => {
    const rows = detectRows([
      f('z', 0, 900),
      f('y', 0, 600),
      f('x', 0, 300),
      f('w', 0, 0),
    ])
    expect(rows.map(r => r[0].id)).toEqual(['w', 'x', 'y', 'z'])
  })

  it('multiple frames per row, mixed input order → each row sorted left-to-right', () => {
    const rows = detectRows([
      f('r2b', 200, 400), f('r1b', 200, 0),
      f('r2a', 0, 400),   f('r1a', 0, 0),
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0].map(fr => fr.id)).toEqual(['r1a', 'r1b'])
    expect(rows[1].map(fr => fr.id)).toEqual(['r2a', 'r2b'])
  })
})

describe('classifyFrames — extended', () => {
  it('cross-section: clearance 5000px → two main rows, no subs', () => {
    // Simulates two Figma sections far apart on canvas
    const row1 = [f('a', 0, 0), f('b', 200, 0)]       // section 1, abs Y ≈ 0
    const row2 = [f('c', 0, 5100), f('d', 200, 5100)]  // section 2, abs Y ≈ 5100
    const result = classifyFrames([...row2, ...row1])
    expect(result.mainRows).toHaveLength(2)
    expect(result.subFrameMap.size).toBe(0)
    expect(result.mainRows[0].map(fr => fr.id)).toEqual(['a', 'b'])
    expect(result.mainRows[1].map(fr => fr.id)).toEqual(['c', 'd'])
  })

  it('three main rows in correct top-to-bottom order', () => {
    const r1 = f('r1', 0, 0)
    const r2 = f('r2', 0, 1000)   // clearance 900 ≥ 800 → main
    const r3 = f('r3', 0, 2500)   // clearance 1400 ≥ 800 → main
    const result = classifyFrames([r3, r1, r2])
    expect(result.mainRows).toHaveLength(3)
    expect(result.mainRows[0][0].id).toBe('r1')
    expect(result.mainRows[1][0].id).toBe('r2')
    expect(result.mainRows[2][0].id).toBe('r3')
  })

  it('sub-frame assigned to second main row (not first)', () => {
    // r1 at y=0 (bottom=100), r2 at y=1000 (bottom=1100) → clearance 900 ≥ 800 → r2 main
    // sub at y=1200 → clearance from r2 bottom (1100) = 100 < 800 → sub of r2
    const r1 = f('r1', 100, 0)
    const r2 = f('r2', 100, 1000)
    const sub = f('s', 100, 1200)
    const result = classifyFrames([r1, r2, sub])
    expect(result.mainRows).toHaveLength(2)
    expect(result.subFrameMap.has('r2')).toBe(true)
    expect(result.subFrameMap.get('r2')![0].id).toBe('s')
    expect(result.subFrameMap.has('r1')).toBe(false)
  })

  it('single frame → one main row, no subs', () => {
    const result = classifyFrames([f('a', 0, 0)])
    expect(result.mainRows).toHaveLength(1)
    expect(result.mainRows[0][0].id).toBe('a')
    expect(result.subFrameMap.size).toBe(0)
  })
})

describe('assignNames — extended', () => {
  it('three rows increment base by 1 each', () => {
    const names = assignNames([[f('a', 0, 0)], [f('b', 0, 1000)], [f('c', 0, 2000)]], 7)
    expect(names.get('a')).toBe('7.1')
    expect(names.get('b')).toBe('8.1')
    expect(names.get('c')).toBe('9.1')
  })

  it('large base number (9999) does not overflow', () => {
    const names = assignNames([[f('a', 0, 0), f('b', 100, 0)]], 9999)
    expect(names.get('a')).toBe('9999.1')
    expect(names.get('b')).toBe('9999.2')
  })
})

describe('assignSubFrameNames — extended', () => {
  it('three main rows → base, base+1, base+2', () => {
    // clearances all ≥ 800 → three main rows
    const frames = [f('a', 0, 0), f('b', 0, 1000), f('c', 0, 2500)]
    const classified = classifyFrames(frames)
    const names = assignSubFrameNames(classified, 5)
    expect(names.get('a')).toBe('5.1')
    expect(names.get('b')).toBe('6.1')
    expect(names.get('c')).toBe('7.1')
  })

  it('26 sub-frames under one parent → last gets Z', () => {
    const parent = f('p', 0, 0)
    const subs = Array.from({ length: 26 }, (_, i) => f(`s${i}`, i * 10, 200))
    const classified = classifyFrames([parent, ...subs])
    const names = assignSubFrameNames(classified, 1)
    expect(names.get('s0')).toBe('1.1 A')
    expect(names.get('s25')).toBe('1.1 Z')
  })

  it('regression: tall sub in left column does not block stacked subs in right column', () => {
    // Main row: left(x=0) and right(x=500), both at y=0, height=100
    // left-sub: tall frame at y=200, height=900 (bottom=1100) — under left
    // right-sub-A: at y=200, height=300 (bottom=500) — under right; clearance from right bottom=100 → 100 < 800 → sub
    // right-sub-B: at y=700, height=100 — under right; clearance from right-sub-A bottom=500 → 200 < 800 → sub (NOT new main)
    // right-sub-C: at y=900, height=100 — under right; clearance from right-sub-B bottom=800 → 100 < 800 → sub
    const left = f('left', 0, 0, 400, 100)
    const right = f('right', 500, 0, 400, 100)
    const leftSub = f('lsub', 0, 200, 400, 900)   // tall, bottom=1100
    const rightSubA = f('rsA', 500, 200, 400, 300) // bottom=500
    const rightSubB = f('rsB', 500, 700, 400, 100) // 200px below rsA
    const rightSubC = f('rsC', 500, 900, 400, 100) // 100px below rsB

    const classified = classifyFrames([left, right, leftSub, rightSubA, rightSubB, rightSubC])
    const names = assignSubFrameNames(classified, 8)

    // One main row only
    expect(classified.mainRows).toHaveLength(1)
    // left gets one sub
    expect(names.get('lsub')).toBe('8.1 A')
    // right gets three stacked subs — B and C must not become new main rows
    expect(names.get('rsA')).toBe('8.2 A')
    expect(names.get('rsB')).toBe('8.2 B')
    expect(names.get('rsC')).toBe('8.2 C')
  })
})
