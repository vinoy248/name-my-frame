import { describe, it, expect } from 'vitest'
import { detectRows, assignNames } from '../src/shared/rowDetection'
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
