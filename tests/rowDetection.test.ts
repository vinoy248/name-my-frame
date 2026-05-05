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
