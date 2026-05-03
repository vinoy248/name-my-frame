import { detectRows, assignNames } from './shared/rowDetection'
import type { FrameInfo, PluginMessage } from './shared/types'

figma.showUI(__html__, { width: 280, height: 380, title: 'Name My Frame' })

const STORAGE_KEY = 'lastBaseNumber'

function getSelectedFrames(): FrameNode[] {
  return figma.currentPage.selection.filter(
    (n): n is FrameNode => n.type === 'FRAME'
  )
}

function toFrameInfo(frame: FrameNode): FrameInfo {
  return {
    id: frame.id,
    name: frame.name,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
  }
}

function postToUI(msg: PluginMessage) {
  figma.ui.postMessage(msg)
}

async function sendSelectionUpdate() {
  const frames = getSelectedFrames().map(toFrameInfo)
  postToUI({ type: 'SELECTION_CHANGE', frames })
}

async function init() {
  const stored = await figma.clientStorage.getAsync(STORAGE_KEY)
  const lastBaseNumber = typeof stored === 'number' ? stored : null
  postToUI({ type: 'INIT', lastBaseNumber })
  await sendSelectionUpdate()
}

figma.on('selectionchange', sendSelectionUpdate)

figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type !== 'RENAME_REQUEST') return

  const { baseNumber } = msg
  const frames = getSelectedFrames()

  if (frames.length === 0) {
    postToUI({ type: 'RENAME_RESULT', success: false, error: 'No frames selected' })
    return
  }

  const frameInfos = frames.map(toFrameInfo)
  const rows = detectRows(frameInfos)
  const nameMap = assignNames(rows, baseNumber)

  // Snapshot for rollback
  const snapshot = frames.map(fr => ({ id: fr.id, name: fr.name }))

  try {
    // All mutations in a single onmessage handler are one undo step in Figma
    for (const frame of frames) {
      const newName = nameMap.get(frame.id)
      if (newName !== undefined) {
        frame.name = newName
      }
    }
    await figma.clientStorage.setAsync(STORAGE_KEY, baseNumber)
    postToUI({ type: 'RENAME_RESULT', success: true, count: frames.length })
  } catch (err) {
    // Rollback all renames
    for (const { id, name } of snapshot) {
      const node = figma.getNodeById(id)
      if (node && 'name' in node) {
        node.name = name
      }
    }
    postToUI({
      type: 'RENAME_RESULT',
      success: false,
      error: err instanceof Error ? err.message : 'Rename failed',
    })
  }
}

init()
