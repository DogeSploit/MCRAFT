import { useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'
import { stringStartsWith } from 'contro-max/build/stringUtils'
import type { CommandEventArgument } from 'contro-max/build/types'
import { contro, onF3LongPress } from '../controls'
import type { Command } from '../controls'
import { watchValue } from '../optionsStorage'
import { MobileButtonConfig, ActionHoldConfig } from '../appConfig'
import { miscUiState } from '../globalState'
import { customCommandsConfig } from '../customCommands'
import PixelartIcon from './PixelartIcon'
import styles from './MobileTopButtons.module.css'

type CustomAction = {
  type: string
  input: any[]
}

type ActionType = Command | CustomAction

interface MobileButtonActionHoldConfig {
  command: ActionType
  longPressAction?: ActionType
}

interface MobileButton extends Omit<MobileButtonConfig, 'action' | 'actionHold'> {
  action?: ActionType
  actionHold?: MobileButtonActionHoldConfig
}

export default () => {
  const elRef = useRef<HTMLDivElement | null>(null)
  const { appConfig } = useSnapshot(miscUiState)
  const mobileButtonsConfig = appConfig?.mobileButtons as MobileButton[] | undefined

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

  const handleCustomAction = (action: CustomAction) => {
    const handler = customCommandsConfig[action.type]?.handler
    if (handler) {
      handler(action.input)
    }
  }

  const handleCommand = (command: ActionType | MobileButtonActionHoldConfig, isDown: boolean) => {
    const commandValue = typeof command === 'string' ? command : 'command' in command ? command.command : command

    if (typeof commandValue === 'string' && !stringStartsWith(commandValue, 'custom')) {
      const event: CommandEventArgument<typeof contro['_commandsRaw']> = {
        command: commandValue,
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
    } else if (typeof commandValue === 'object') {
      if (isDown) {
        handleCustomAction(commandValue)
      }
    }
  }

  const handleLongPress = (actionHold: MobileButtonActionHoldConfig) => {
    if (typeof actionHold.longPressAction === 'string' && actionHold.longPressAction === 'general.debugOverlayHelpMenu') {
      void onF3LongPress()
    } else if (actionHold.longPressAction) {
      handleCommand(actionHold.longPressAction, true)
    }
  }

  const getButtonClassName = (action: ActionType): string => {
    if (typeof action === 'string') {
      switch (action) {
        case 'general.chat':
          return styles['chat-btn']
        case 'ui.back':
          return styles['pause-btn']
        case 'general.playersList':
          return styles['tab-btn']
        default:
          return styles['debug-btn']
      }
    }
    return styles['debug-btn']
  }

  const renderConfigButtons = () => {
    return mobileButtonsConfig?.map((button, index) => {
      const className = button.action ? getButtonClassName(button.action) : styles['debug-btn']
      let label: string | JSX.Element = button.icon || button.label || '?'

      if (typeof label === 'string' && label.startsWith('pixelarticons:')) {
        const iconName = label.replace('pixelarticons:', '')
        label = <PixelartIcon iconName={iconName} />
      }

      const onPointerDown = (e: React.PointerEvent) => {
        const elem = e.currentTarget as HTMLElement
        elem.setPointerCapture(e.pointerId)

        const { actionHold, action } = button

        if (actionHold) {
          const { command, longPressAction } = actionHold
          if (longPressAction) {
            const timerId = window.setTimeout(() => {
              handleLongPress(actionHold)
            }, 500)
            elem.dataset.longPressTimer = String(timerId)
            handleCommand(command, true)
          } else {
            handleCommand(command, true)
          }
        } else if (action) {
          handleCommand(action, true)
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

        const { actionHold, action } = button

        if (actionHold) {
          handleCommand(actionHold.command, false)
        } else if (action) {
          handleCommand(action, false)
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
