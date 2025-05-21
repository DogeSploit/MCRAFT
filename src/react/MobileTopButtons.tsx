import { useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'
import { f3Keybinds, contro } from '../controls'
import { watchValue } from '../optionsStorage'
import { MobileButtonConfig } from '../appConfig'
import { showModal, miscUiState, activeModalStack, hideCurrentModal, gameAdditionalState } from '../globalState'
import { showOptionsModal } from './SelectOption'
import useLongPress from './useLongPress'
import styles from './MobileTopButtons.module.css'


export default () => {
  const elRef = useRef<HTMLDivElement | null>(null)
  const { appConfig } = useSnapshot(miscUiState)
  const mobileButtonsConfig = appConfig?.mobileButtons
  const zoomActiveRef = useRef(false)

  const showMobileControls = (bl) => {
    if (elRef.current) elRef.current.style.display = bl ? 'flex' : 'none'
  }

  useEffect(() => {
    watchValue(miscUiState, o => {
      showMobileControls(o.currentTouch)
    })
  }, [])

  const onLongPress = async () => {
    const select = await showOptionsModal('', f3Keybinds.filter(f3Keybind => {
      return f3Keybind.mobileTitle && (f3Keybind.enabled?.() ?? true)
    }).map(f3Keybind => {
      return `${f3Keybind.mobileTitle}${f3Keybind.key ? ` (F3+${f3Keybind.key})` : ''}`
    }))
    if (!select) return
    const f3Keybind = f3Keybinds.find(f3Keybind => f3Keybind.mobileTitle === select)
    if (f3Keybind) void f3Keybind.action()
  }

  const defaultOptions = {
    shouldPreventDefault: true,
    delay: 500,
  }
  const longPressEvent = useLongPress(onLongPress, () => { }, defaultOptions)


  const onChatLongPress = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
  }

  const onChatClick = () => {
    if (activeModalStack.at(-1)?.reactType === 'chat') {
      hideCurrentModal()
    } else {
      showModal({ reactType: 'chat' })
    }
  }

  const chatLongPressEvent = useLongPress(
    onChatLongPress,
    onChatClick,
    {
      shouldPreventDefault: true,
      delay: 300,
    }
  )

  const toggleZoom = () => {
    zoomActiveRef.current = !zoomActiveRef.current

    gameAdditionalState.isZooming = zoomActiveRef.current

    if (zoomActiveRef.current) {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC' }))
    } else {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyC' }))
    }
  }

  const handleButtonAction = (button: MobileButtonConfig) => {
    if (button.type === 'command' && button.command) {
      const [schema, action] = button.command.split('.')
      if (!schema || !action) {
        console.warn(`invalid command format: ${button.command}. Must be 'schema.action'`)
        return
      }

      if (button.command === 'general.zoom') {
        toggleZoom()
        return
      }

      if (button.command === 'general.jump') {
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
        setTimeout(() => {
          document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))
        }, 100)
        return
      }

      if (button.command === 'general.sneak') {
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }))
        setTimeout(() => {
          document.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }))
        }, 100)
        return
      }

      try {
        const keybind = contro.inputSchema?.commands?.[schema]?.[action]?.keys?.[0]

        if (keybind) {
          document.dispatchEvent(new KeyboardEvent('keydown', { code: keybind }))
          document.dispatchEvent(new KeyboardEvent('keyup', { code: keybind }))
        } else {
          console.warn(`Button command not found: ${button.command}`)
        }
      } catch (error) {
        console.error('Error executing command:', error)
      }
    } else if (button.type === 'modal' && button.modal) {
      // Modal open
      showModal({ reactType: button.modal })
    } else if (button.type === 'keypress' && button.key) {
      // Keypress
      document.dispatchEvent(new KeyboardEvent('keydown', { code: button.key }))
      document.dispatchEvent(new KeyboardEvent('keyup', { code: button.key }))
    } else if (button.type === 'chat') {
      // Chat button
      if (activeModalStack.at(-1)?.reactType === 'chat') {
        hideCurrentModal()
      } else {
        showModal({ reactType: 'chat' })
      }
    } else if (button.type === 'pause') {
      // Pause screen
      showModal({ reactType: 'pause-screen' })
    }
  }

  // Standard buttons that will be displayed if not specified in the config
  const defaultButtons = (
    <>
      <div
        className={styles['debug-btn']} onPointerDown={(e) => {
          window.dispatchEvent(new MouseEvent('mousedown', { button: 1 }))
        }}
      >S
      </div>
      <div
        className={styles['debug-btn']} onPointerDown={(e) => {
          document.dispatchEvent(new KeyboardEvent('keydown', { code: 'F3' }))
          document.dispatchEvent(new KeyboardEvent('keyup', { code: 'F3' }))
        }} {...longPressEvent}
      >F3
      </div>
      <div
        className={styles['chat-btn']}
        {...chatLongPressEvent}
        onPointerUp={(e) => {
          document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab' }))
        }}
      />
      <div
        className={styles['pause-btn']} onPointerDown={(e) => {
          e.stopPropagation()
          showModal({ reactType: 'pause-screen' })
        }}
      />
    </>
  )

  // Displaying buttons from the configuration
  const renderConfigButtons = () => {
    return mobileButtonsConfig?.map((button, index) => {
      let className = styles['debug-btn']
      let label = button.label || button.icon || '?'

      if (button.type === 'chat') {
        className = styles['chat-btn']
        label = ''
      } else if (button.type === 'pause') {
        className = styles['pause-btn']
        label = ''
      }

      return (
        <div
          key={index}
          className={className}
          onPointerDown={(e) => {
            e.stopPropagation()
            handleButtonAction(button)
          }}
        >
          {label}
        </div>
      )
    })
  }

  // ios note: just don't use <button>
  return <div ref={elRef} className={styles['mobile-top-btns']} id="mobile-top">
    {mobileButtonsConfig && mobileButtonsConfig.length > 0 ? renderConfigButtons() : defaultButtons}
  </div>
}
