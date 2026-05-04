import { useEffect, useState, useRef, useCallback } from 'react'
import { NumberInput } from './components/NumberInput'
import { PreviewList } from './components/PreviewList'
import type { PreviewItem } from './components/PreviewList'
import { StatusBanner } from './components/StatusBanner'
import { classifyFrames, assignSubFrameNames } from '../shared/rowDetection'
import type { FrameInfo, PluginMessage } from '../shared/types'

interface Status {
  type: 'success' | 'error' | null
  message: string
}

function computePreview(frames: FrameInfo[], baseNumber: number): PreviewItem[] {
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

export function App() {
  const [frames, setFrames] = useState<FrameInfo[]>([])
  const [baseNumber, setBaseNumber] = useState<number>(1)
  const [preview, setPreview] = useState<PreviewItem[]>([])
  const [status, setStatus] = useState<Status>({ type: null, message: '' })
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasFrames = frames.length > 0
  const canRename = hasFrames && baseNumber >= 1 && !isLoading

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
        setFrames(msg.frames)
        setStatus({ type: null, message: '' })
      } else if (msg.type === 'RENAME_RESULT') {
        setIsLoading(false)
        if (msg.success) {
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
  const updatePreview = useCallback((currentFrames: FrameInfo[], num: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPreview(computePreview(currentFrames, num))
    }, 150)
  }, [])

  useEffect(() => {
    updatePreview(frames, baseNumber)
  }, [frames, baseNumber, updatePreview])

  const handleRename = () => {
    if (!canRename) return
    setIsLoading(true)
    const msg: PluginMessage = { type: 'RENAME_REQUEST', baseNumber }
    parent.postMessage({ pluginMessage: msg }, '*')
  }

  const handleBaseNumberChange = (value: number) => {
    setBaseNumber(value)
    setStatus({ type: null, message: '' })
  }

  if (!hasFrames) {
    return (
      <div className="plugin-container plugin-container--empty">
        <div className="empty-state">
          <div className="empty-state__icon">⬚</div>
          <p className="empty-state__message">Select frames to rename</p>
        </div>
        <button className="btn btn--primary" disabled>
          Rename Frames
        </button>
      </div>
    )
  }

  return (
    <div className="plugin-container">
      <NumberInput value={baseNumber} onChange={handleBaseNumberChange} disabled={isLoading} />
      <PreviewList items={preview} dimmed={status.type === 'success'} />
      {status.type && <StatusBanner type={status.type} message={status.message} />}
      <button className="btn btn--primary" onClick={handleRename} disabled={!canRename}>
        {isLoading ? 'Renaming...' : 'Rename Frames'}
      </button>
    </div>
  )
}
