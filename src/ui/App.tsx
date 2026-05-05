import { useEffect, useState, useRef, useCallback } from 'react'
import { NumberInput } from './components/NumberInput'
import { PreviewList } from './components/PreviewList'
import type { PreviewItem } from './components/PreviewList'
import { StatusBanner } from './components/StatusBanner'
import { ModeToggle } from './components/ModeToggle'
import { classifyFrames, assignSubFrameNames, assignLetterModeNames } from '../shared/rowDetection'
import type { FrameInfo, PluginMessage } from '../shared/types'

interface Status {
  type: 'success' | 'error' | null
  message: string
}

function computeDefaultPreview(frames: FrameInfo[], baseNumber: number): PreviewItem[] {
  if (frames.length === 0 || baseNumber < 1) return []
  const classified = classifyFrames(frames)
  const nameMap = assignSubFrameNames(classified, baseNumber)
  const items: PreviewItem[] = []
  classified.mainRows.forEach(row => {
    row.forEach(fr => {
      items.push({ id: fr.id, newName: nameMap.get(fr.id) ?? fr.name, originalName: fr.name, isSubFrame: false })
      const subs = classified.subFrameMap.get(fr.id) ?? []
      subs.forEach(sub => {
        items.push({ id: sub.id, newName: nameMap.get(sub.id) ?? sub.name, originalName: sub.name, isSubFrame: true })
      })
    })
  })
  return items
}

function computeSubFramePreview(frames: FrameInfo[]): PreviewItem[] {
  if (frames.length === 0) return []
  const sorted = [...frames].sort((a, b) => a.y - b.y)
  const nameMap = assignLetterModeNames(frames)
  return sorted.map((fr, i) => ({
    id: fr.id,
    newName: i === 0 ? fr.name : (nameMap.get(fr.id) ?? fr.name),
    originalName: fr.name,
    isSubFrame: i > 0,
  }))
}

export function App() {
  const [mode, setMode] = useState<'default' | 'subframe'>('default')
  const [frames, setFrames] = useState<FrameInfo[]>([])
  const [baseNumber, setBaseNumber] = useState<number>(1)
  const [preview, setPreview] = useState<PreviewItem[]>([])
  const [status, setStatus] = useState<Status>({ type: null, message: '' })
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const framesRef = useRef<FrameInfo[]>(frames)
  const baseNumberRef = useRef<number>(baseNumber)
  const modeRef = useRef<'default' | 'subframe'>('default')
  const pendingNextBaseRef = useRef<number | null>(null)

  useEffect(() => { framesRef.current = frames }, [frames])
  useEffect(() => { baseNumberRef.current = baseNumber }, [baseNumber])
  useEffect(() => { modeRef.current = mode }, [mode])

  const hasFrames = frames.length > 0

  // In default mode: need frames + valid baseNumber
  // In subframe mode: need at least 1 frame (validation happens server-side on click)
  const canRename = hasFrames && !isLoading && (mode === 'subframe' || baseNumber >= 1)

  // Receive messages from Figma sandbox
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginMessage | undefined
      if (!msg) return

      if (msg.type === 'INIT') {
        if (msg.lastBaseNumber !== null) {
          setBaseNumber(msg.lastBaseNumber)
        }
      } else if (msg.type === 'SELECTION_CHANGE') {
        if (modeRef.current === 'default' && pendingNextBaseRef.current !== null) {
          setBaseNumber(pendingNextBaseRef.current)
          pendingNextBaseRef.current = null
        }
        setFrames(msg.frames)
        setStatus({ type: null, message: '' })
      } else if (msg.type === 'RENAME_RESULT') {
        setIsLoading(false)
        if (msg.success) {
          if (modeRef.current === 'default') {
            const numMainRows = classifyFrames(framesRef.current).mainRows.length
            pendingNextBaseRef.current = baseNumberRef.current + numMainRows
          }
          setStatus({
            type: 'success',
            message: `Renamed ${msg.count} frame${msg.count === 1 ? '' : 's'}`,
          })
        } else {
          setStatus({ type: 'error', message: msg.error })
        }
      }
    }

    window.addEventListener('message', handler)
    parent.postMessage({ pluginMessage: { type: 'UI_READY' } }, '*')
    return () => window.removeEventListener('message', handler)
  }, [])

  // Debounced preview update
  const updatePreview = useCallback((currentFrames: FrameInfo[], num: number, currentMode: 'default' | 'subframe') => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (currentMode === 'subframe') {
        setPreview(computeSubFramePreview(currentFrames))
      } else {
        setPreview(computeDefaultPreview(currentFrames, num))
      }
    }, 150)
  }, [])

  useEffect(() => {
    updatePreview(frames, baseNumber, mode)
  }, [frames, baseNumber, mode, updatePreview])

  const handleRename = () => {
    if (!canRename) return
    setIsLoading(true)
    if (mode === 'subframe') {
      const msg: PluginMessage = { type: 'RENAME_REQUEST', mode: 'subframe' }
      parent.postMessage({ pluginMessage: msg }, '*')
    } else {
      const msg: PluginMessage = { type: 'RENAME_REQUEST', mode: 'default', baseNumber }
      parent.postMessage({ pluginMessage: msg }, '*')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename()
  }

  const handleBaseNumberChange = (value: number) => {
    setBaseNumber(value)
    setStatus({ type: null, message: '' })
    pendingNextBaseRef.current = null
  }

  const handleModeChange = (newMode: 'default' | 'subframe') => {
    setMode(newMode)
    setStatus({ type: null, message: '' })
  }

  if (!hasFrames) {
    return (
      <div className="plugin-container plugin-container--empty" onKeyDown={handleKeyDown}>
        <ModeToggle mode={mode} onChange={handleModeChange} />
        <div className="empty-state">
          <div className="empty-state__icon">⬚</div>
          <p className="empty-state__message">Select frames to rename</p>
        </div>
        <div className="bottom-bar">
          <div className="status-area" />
          <button className="btn btn--primary" disabled>
            Rename Frames
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="plugin-container" onKeyDown={handleKeyDown}>
      <ModeToggle mode={mode} onChange={handleModeChange} />
      {mode === 'default' && (
        <NumberInput value={baseNumber} onChange={handleBaseNumberChange} disabled={isLoading} />
      )}
      <PreviewList items={preview} dimmed={status.type === 'success'} />
      <div className="bottom-bar">
        <div className="status-area">
          {status.type && <StatusBanner type={status.type} message={status.message} />}
        </div>
        <button className="btn btn--primary" onClick={handleRename} disabled={!canRename}>
          {isLoading ? 'Renaming...' : 'Rename Frames'}
        </button>
      </div>
    </div>
  )
}
