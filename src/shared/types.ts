export interface FrameInfo {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
}

export type PluginMessage =
  | { type: 'UI_READY' }
  | { type: 'INIT'; lastBaseNumber: number | null }
  | { type: 'SELECTION_CHANGE'; frames: FrameInfo[] }
  | { type: 'RENAME_REQUEST'; baseNumber: number }
  | { type: 'RENAME_RESULT'; success: true; count: number }
  | { type: 'RENAME_RESULT'; success: false; error: string }
