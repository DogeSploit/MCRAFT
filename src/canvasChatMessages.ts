import type { MessageFormatPart } from './chatUtils'
import { isGamePaused } from './iframe'

// Config flag - set to true to render chat on canvas for recordings
export const ChatRenderCanvas = true

// Timing constants (same as React chat)
const APPEAR_DELAY = 750 // delay before showing
const VISIBLE_DURATION = 7000 // 7 seconds fully visible
const FADE_DURATION = 2000 // 2 seconds fade out

export interface CanvasChatMessage {
  parts: MessageFormatPart[]
  id: number
  timestamp: number
  pausedDuration: number // Total time spent paused since message was created
  lastPauseCheck: number // Last time we checked pause state
}

let lastMessageId = 0
const messages: CanvasChatMessage[] = []
const MAX_MESSAGES = 100 // Keep a reasonable buffer

export function addCanvasChatMessage (parts: MessageFormatPart[]): void {
  lastMessageId++
  const now = Date.now()
  messages.push({
    parts,
    id: lastMessageId,
    timestamp: now,
    pausedDuration: 0,
    lastPauseCheck: now
  })

  // Trim old messages
  if (messages.length > MAX_MESSAGES) {
    messages.splice(0, messages.length - MAX_MESSAGES)
  }
}

export function getCanvasChatMessages (): CanvasChatMessage[] {
  return messages
}

/**
 * Calculate opacity for a message based on time elapsed.
 * Returns 1 during visible period, fades from 1 to 0 during fade period, 0 after.
 * Pauses fade-out when game is paused.
 */
export function getMessageOpacity (msg: CanvasChatMessage): number {
  const now = Date.now()
  const paused = isGamePaused()

  // Accumulate paused time
  if (paused) {
    msg.pausedDuration += now - msg.lastPauseCheck
  }
  msg.lastPauseCheck = now

  // Calculate effective elapsed time (excluding time spent paused)
  const elapsed = now - msg.timestamp - msg.pausedDuration

  // Don't show during initial delay
  if (elapsed < APPEAR_DELAY) {
    return 0
  }

  // Adjust elapsed time to account for delay
  const visibleElapsed = elapsed - APPEAR_DELAY

  if (visibleElapsed < VISIBLE_DURATION) {
    return 1
  }

  const fadeElapsed = visibleElapsed - VISIBLE_DURATION
  if (fadeElapsed >= FADE_DURATION) {
    return 0
  }

  // Linear fade from 1 to 0
  return 1 - (fadeElapsed / FADE_DURATION)
}
