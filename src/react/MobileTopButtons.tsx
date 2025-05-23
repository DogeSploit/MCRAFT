import { useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'
import { f3Keybinds, contro } from '../controls'
import { watchValue } from '../optionsStorage'
import { MobileButtonConfig } from '../appConfig'
import { showModal, miscUiState, activeModalStack, hideCurrentModal, gameAdditionalState } from '../globalState'
import { showOptionsModal } from './SelectOption'
import styles from './MobileTopButtons.module.css'

export default () => {
  const elRef = useRef<HTMLDivElement | null>(null)
  const { appConfig } = useSnapshot(miscUiState)
  const mobileButtonsConfig = appConfig?.mobileButtons

  const showMobileControls = (bl) => {
    if (elRef.current) elRef.current.style.display = bl ? 'flex' : 'none'
  }

  useEffect(() => {
    watchValue(miscUiState, o => {
      showMobileControls(o.currentTouch)
    })
  }, [])

  const onF3LongPress = async () => {
    const select = await showOptionsModal('', f3Keybinds.filter(f3Keybind => {
      return f3Keybind.mobileTitle && (f3Keybind.enabled?.() ?? true)
    }).map(f3Keybind => {
      return `${f3Keybind.mobileTitle}${f3Keybind.key ? ` (F3+${f3Keybind.key})` : ''}`
    }))
    if (!select) return
    const f3Keybind = f3Keybinds.find(f3Keybind => f3Keybind.mobileTitle === select)
    if (f3Keybind) void f3Keybind.action()
  }

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

  const handleCommand = (command: string, isDown: boolean) => {
    if (isDown) {
      switch (command) {
        case 'chat':
          onChatClick()
          break
        case 'pause':
          showModal({ reactType: 'pause-screen' })
          break
        case 'F3':
          document.dispatchEvent(new KeyboardEvent('keydown', { code: 'F3' }))
          break
        default:
          if (command.startsWith('general.')) {
            if (command === 'general.inventory') {
              if (activeModalStack.at(-1)?.reactType?.startsWith?.('player_win:')) {
                hideCurrentModal()
              } else {
                document.exitPointerLock?.()
                contro.emit('trigger', { command } as any)
              }
            } else {
              contro.emit('trigger', { command } as any)
            }
          }
      }
    } else {
      switch (command) {
        case 'F3':
          document.dispatchEvent(new KeyboardEvent('keyup', { code: 'F3' }))
          break
        case 'chat':
        case 'pause':
        case 'general.inventory':
        case 'general.drop':
          // No release action needed
          break
        default:
          if (command.startsWith('general.')) {
            contro.emit('release', { command } as any)
          }
      }
    }
  }

  const renderConfigButtons = () => {
    return mobileButtonsConfig?.map((button, index) => {
      let className = styles['debug-btn']
      let label = button.label || button.icon || '?'

      if (button.action === 'chat') {
        className = styles['chat-btn']
        label = ''
      } else if (button.action === 'pause') {
        className = styles['pause-btn']
        label = ''
      }

      const onPointerDown = (e) => {
        const elem = e.currentTarget as HTMLElement
        elem.setPointerCapture(e.pointerId)

        if (button.actionHold) {
          handleCommand(button.actionHold, true)
        } else {
          handleCommand(button.action, true)
        }
      }

      const onPointerUp = (e) => {
        const elem = e.currentTarget as HTMLElement
        elem.releasePointerCapture(e.pointerId)

        if (button.actionHold) {
          handleCommand(button.actionHold, false)
        } else {
          handleCommand(button.action, false)
        }
      }

      return (
        <div
          key={index}
          className={className}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onLostPointerCapture={onPointerUp}
        >
          {label}
        </div>
      )
    })
  }

  // ios note: just don't use <button>
  return <div ref={elRef} className={styles['mobile-top-btns']} id="mobile-top">
    {mobileButtonsConfig && mobileButtonsConfig.length > 0 ? renderConfigButtons() : ''}
  </div>
}
