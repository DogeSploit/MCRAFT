import { useRef, useState, useCallback, useEffect } from 'react'
import { useSnapshot } from 'valtio'
import { packetsReplayState } from '../../state/packetsReplayState'

const SKIP_SECONDS = 10
const HIDE_DELAY_MS = 2500

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function ReplayTimeline() {
  const state = useSnapshot(packetsReplayState)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const hideTimeoutRef = useRef<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)
  const [isBarHovered, setIsBarHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const progress = state.totalDurationMs > 0
    ? state.currentTimeMs / state.totalDurationMs
    : 0

  const showControls = useCallback(() => {
    setIsVisible(true)
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      if (!isDragging) {
        setIsVisible(false)
      }
    }, HIDE_DELAY_MS)
  }, [isDragging])

  const handlePlayPause = () => {
    packetsReplayState.isPlaying = !state.isPlaying
  }

  const handleSkip = (seconds: number) => {
    const newTimeMs = Math.max(0, Math.min(
      state.currentTimeMs + (seconds * 1000),
      state.totalDurationMs
    ))
    packetsReplayState.seekTargetMs = newTimeMs
  }

  const calculateProgress = useCallback((clientX: number): number => {
    if (!progressBarRef.current) return 0
    const rect = progressBarRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    return Math.max(0, Math.min(1, x / rect.width))
  }, [])

  const handleSeek = useCallback((clientX: number) => {
    const newProgress = calculateProgress(clientX)
    const newTimeMs = newProgress * state.totalDurationMs
    packetsReplayState.seekTargetMs = newTimeMs
  }, [calculateProgress, state.totalDurationMs])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    handleSeek(e.clientX)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      handleSeek(e.clientX)
    }
  }, [isDragging, handleSeek])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleBarMouseMove = (e: React.MouseEvent) => {
    const newProgress = calculateProgress(e.clientX)
    setHoverProgress(newProgress)
  }

  const handleBarMouseLeave = () => {
    setHoverProgress(null)
    setIsBarHovered(false)
  }

  const handleBarMouseEnter = () => {
    setIsBarHovered(true)
  }

  // Global mouse move listener for showing controls
  useEffect(() => {
    const handleGlobalMouseMove = () => {
      showControls()
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [showControls])

  // Drag listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (!state.isOpen || state.totalDurationMs === 0) {
    return null
  }

  const hoverTimeMs = hoverProgress !== null ? hoverProgress * state.totalDurationMs : 0
  const shouldShow = isVisible || isDragging

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 3000,
        background: shouldShow ? 'linear-gradient(transparent, rgba(0, 0, 0, 0.6))' : 'none',
        padding: '16px 10px 6px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: shouldShow ? 'auto' : 'none',
        opacity: shouldShow ? 1 : 0,
        transition: 'opacity 0.2s ease, background 0.2s ease'
      }}
    >
      {/* Progress bar */}
      <div
        ref={progressBarRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleBarMouseMove}
        onMouseLeave={handleBarMouseLeave}
        onMouseEnter={handleBarMouseEnter}
        style={{
          position: 'relative',
          height: isBarHovered || isDragging ? '4px' : '3px',
          background: 'rgba(255, 255, 255, 0.3)',
          cursor: 'pointer',
          transition: 'height 0.1s ease'
        }}
      >
        {/* Progress fill */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${progress * 100}%`,
            height: '100%',
            background: '#ff0000',
            transition: isDragging ? 'none' : 'width 0.1s ease'
          }}
        />

        {/* Scrubber handle */}
        <div
          style={{
            position: 'absolute',
            left: `${progress * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: isBarHovered || isDragging ? '10px' : '0px',
            height: isBarHovered || isDragging ? '10px' : '0px',
            borderRadius: '50%',
            background: '#ff0000',
            transition: 'width 0.1s ease, height 0.1s ease',
            pointerEvents: 'none'
          }}
        />

        {/* Hover time tooltip */}
        {hoverProgress !== null && (
          <div
            style={{
              position: 'absolute',
              left: `${hoverProgress * 100}%`,
              bottom: '100%',
              transform: 'translateX(-50%)',
              marginBottom: '6px',
              padding: '2px 6px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              fontSize: '10px',
              borderRadius: '2px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}
          >
            {formatTime(hoverTimeMs)}
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#fff'
        }}
      >
        {/* Skip backward */}
        <button
          onClick={() => handleSkip(-SKIP_SECONDS)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}
          title={`Skip back ${SKIP_SECONDS} seconds`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
          <span style={{
            position: 'absolute',
            fontSize: '7px',
            fontWeight: 'bold',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}>{SKIP_SECONDS}</span>
        </button>

        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            {state.isPlaying ? (
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
        </button>

        {/* Skip forward */}
        <button
          onClick={() => handleSkip(SKIP_SECONDS)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}
          title={`Skip forward ${SKIP_SECONDS} seconds`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
          </svg>
          <span style={{
            position: 'absolute',
            fontSize: '7px',
            fontWeight: 'bold',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}>{SKIP_SECONDS}</span>
        </button>

        {/* Time display */}
        <div
          style={{
            fontSize: '13px',
            fontFamily: 'monospace',
            color: '#fff'
          }}
        >
          {formatTime(state.currentTimeMs)} / {formatTime(state.totalDurationMs)}
        </div>

      </div>
    </div>
  )
}
