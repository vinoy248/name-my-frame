import { classifyFrames, assignSubFrameNames, assignLetterModeNames } from './shared/rowDetection'
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

// init() is triggered by UI_READY from the UI once it has mounted
// This avoids INIT/SELECTION_CHANGE messages arriving before the UI message listener is set up

figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'UI_READY') {
    await init()
    return
  }

  if (msg.type !== 'RENAME_REQUEST') return

  const frames = getSelectedFrames()

  if (frames.length === 0) {
    postToUI({ type: 'RENAME_RESULT', success: false, error: 'No frames selected' })
    return
  }

  if (msg.mode === 'subframe') {
    // Sort by Y (top to bottom)
    const sortedFrames = [...frames].sort((a, b) => a.y - b.y)
    const frameInfos = sortedFrames.map(toFrameInfo)

    if (sortedFrames.length < 2) {
      postToUI({ type: 'RENAME_RESULT', success: false, error: 'Select multiple frames' })
      return
    }

    const parentName = sortedFrames[0].name
    const validName = /^\d+\.\d+$/.test(parentName)
    if (!validName) {
      postToUI({ type: 'RENAME_RESULT', success: false, error: 'First frame must have a valid name (e.g. 9.6)' })
      return
    }

    const nameMap = assignLetterModeNames(frameInfos)
    // Only rename frames 2..n (first frame is parent, untouched)
    const framesToRename = sortedFrames.slice(1)
    const snapshot = framesToRename.map(fr => ({ id: fr.id, name: fr.name }))

    try {
      for (const frame of framesToRename) {
        const newName = nameMap.get(frame.id)
        if (newName !== undefined) {
          frame.name = newName
        }
      }
      postToUI({ type: 'RENAME_RESULT', success: true, count: framesToRename.length })
    } catch (err) {
      for (const { id, name } of snapshot) {
        const node = figma.getNodeById(id)
        if (node && 'name' in node) node.name = name
      }
      postToUI({
        type: 'RENAME_RESULT',
        success: false,
        error: err instanceof Error ? err.message : 'Rename failed',
      })
    }
    return
  }

  // Default mode
  const { baseNumber } = msg
  const frameInfos = frames.map(toFrameInfo)
  const classified = classifyFrames(frameInfos)
  const nameMap = assignSubFrameNames(classified, baseNumber)

  const allFrameIds = [...nameMap.keys()]
  const allFrames = allFrameIds
    .map(id => figma.getNodeById(id))
    .filter((n): n is FrameNode => n !== null && n.type === 'FRAME')

  const snapshot = allFrames.map(fr => ({ id: fr.id, name: fr.name }))

  try {
    for (const frame of allFrames) {
      const newName = nameMap.get(frame.id)
      if (newName !== undefined) {
        frame.name = newName
      }
    }
    await figma.clientStorage.setAsync(STORAGE_KEY, baseNumber)
    postToUI({ type: 'RENAME_RESULT', success: true, count: allFrames.length })
  } catch (err) {
    for (const { id, name } of snapshot) {
      const node = figma.getNodeById(id)
      if (node && 'name' in node) node.name = name
    }
    postToUI({
      type: 'RENAME_RESULT',
      success: false,
      error: err instanceof Error ? err.message : 'Rename failed',
    })
  }
}
