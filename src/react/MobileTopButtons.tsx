import { useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'
import { stringStartsWith } from 'contro-max/build/stringUtils'
import type { CommandEventArgument } from 'contro-max/build/types'
import { contro, onF3LongPress } from '../controls'
import type { Command } from '../controls'
import { watchValue } from '../optionsStorage'
import { MobileButtonConfig, ActionHoldConfig } from '../appConfig'
import { miscUiState } from '../globalState'
import styles from './MobileTopButtons.module.css'
import PixelartIcon from './PixelartIcon'

interface ExtendedActionHoldConfig extends ActionHoldConfig {
  command: Command;
  longPressAction?: Command;
}

export default () => {
  const elRef = useRef<HTMLDivElement | null>(null)
  const { appConfig } = useSnapshot(miscUiState)
  const mobileButtonsConfig = appConfig?.mobileButtons

  const showMobileControls = (visible: boolean) => {
    if (elRef.current) {
      elRef.current.style.display = visible ? 'flex' : 'none'
    }
  }

  useEffect(() => {
    watchValue(miscUiState, o => {
      showMobileControls(Boolean(o.currentTouch))
    })
  }, [])

  const handleCommand = (command: Command | ExtendedActionHoldConfig, isDown: boolean) => {
    const commandString = typeof command === 'string' ? command : command.command

    if (!stringStartsWith(commandString, 'custom')) {
      const event: CommandEventArgument<typeof contro['_commandsRaw']> = {
        command: commandString,
        schema: {
          keys: [],
          gamepad: []
        }
      }
      if (isDown) {
        contro.emit('trigger', event)
      } else {
        contro.emit('release', event)
      }
    }
  }

  const handleLongPress = (actionHold: ExtendedActionHoldConfig) => {
    if (actionHold.longPressAction === 'general.debugOverlayHelpMenu') {
      void onF3LongPress()
    } else if (actionHold.longPressAction) {
      handleCommand(actionHold.longPressAction, true)
    }
  }

  const renderConfigButtons = () => {
    return mobileButtonsConfig?.map((button, index) => {
      let className = styles['debug-btn']
      let label: string | JSX.Element = button.icon || button.label || '?'

      if (typeof label === 'string' && label.startsWith('pixelarticons:')) {
        const iconName = label.replace('pixelarticons:', '')
        label = <PixelartIcon iconName={iconName} />
      }

      switch (button.action) {
        case 'general.chat':
          className = styles['chat-btn']
          label = ''
          break
        case 'ui.back':
          className = styles['pause-btn']
          label = ''
          break
        case 'general.playersList':
          className = styles['tab-btn']
          break
      }

      const onPointerDown = (e: React.PointerEvent) => {
        const elem = e.currentTarget as HTMLElement
        elem.setPointerCapture(e.pointerId)

        if (button.actionHold) {
          const actionHold = button.actionHold as ExtendedActionHoldConfig
          if (actionHold.longPressAction) {
            const timerId = window.setTimeout(() => {
              handleLongPress(actionHold)
            }, 500)
            elem.dataset.longPressTimer = String(timerId)
            handleCommand(actionHold.command, true)
          } else {
            handleCommand(button.actionHold as Command, true)
          }
        } else {
          handleCommand(button.action as Command, true)
        }
      }

      const onPointerUp = (e: React.PointerEvent) => {
        const elem = e.currentTarget as HTMLElement
        elem.releasePointerCapture(e.pointerId)

        const timerId = elem.dataset.longPressTimer
        if (timerId) {
          clearTimeout(parseInt(timerId, 10))
          delete elem.dataset.longPressTimer
        }

        if (button.actionHold) {
          const actionHold = button.actionHold as ExtendedActionHoldConfig
          if (actionHold.longPressAction) {
            handleCommand(actionHold.command, false)
          } else {
            handleCommand(button.actionHold as Command, false)
          }
        } else {
          handleCommand(button.action as Command, false)
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
  return (
    <div ref={elRef} className={styles['mobile-top-btns']} id="mobile-top">
      {mobileButtonsConfig && mobileButtonsConfig.length > 0 ? renderConfigButtons() : null}
    </div>
  )
}
