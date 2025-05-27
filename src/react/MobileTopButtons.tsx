import { useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'
import { stringStartsWith } from 'contro-max/build/stringUtils'
import type { CommandEventArgument } from 'contro-max/build/types'
import { contro, onF3LongPress } from '../controls'
import type { Command } from '../controls'
import { watchValue } from '../optionsStorage'
import { MobileButtonConfig, ActionHoldConfig, ActionType, CustomAction } from '../appConfig'
import { miscUiState } from '../globalState'
import { customCommandsConfig } from '../customCommands'
import PixelartIcon from './PixelartIcon'
import styles from './MobileTopButtons.module.css'

export default () => {
  const elRef = useRef<HTMLDivElement | null>(null)
  const { appConfig } = useSnapshot(miscUiState)
  const mobileButtonsConfig = appConfig?.mobileButtons

  const longPressTimerIdRef = useRef<number | null>(null)
  const actionToShortPressRef = useRef<ActionType | null>(null)

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
      handler([...action.input])
    }
  }

  const handleCommand = (command: ActionType | ActionHoldConfig, isDown: boolean) => {
    const commandValue = typeof command === 'string' ? command : 'command' in command ? command.command : command

    if (typeof commandValue === 'string' && !stringStartsWith(commandValue, 'custom')) {
      const event: CommandEventArgument<typeof contro['_commandsRaw']> = {
        command: commandValue as Command,
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

  const handleLongPress = (actionHold: ActionHoldConfig) => {
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
      let label: string | JSX.Element = button.icon || button.label || ''

      if (typeof label === 'string' && label.startsWith('pixelarticons:')) {
        const iconName = label.replace('pixelarticons:', '')
        label = <PixelartIcon iconName={iconName} />
      }

      const onPointerDown = (e: React.PointerEvent) => {
        const elem = e.currentTarget as HTMLElement
        elem.setPointerCapture(e.pointerId)

        if (longPressTimerIdRef.current) {
          clearTimeout(longPressTimerIdRef.current)
          longPressTimerIdRef.current = null
        }
        actionToShortPressRef.current = null

        const { actionHold, action } = button

        if (actionHold) {
          if (typeof actionHold === 'string' || (typeof actionHold === 'object' && !('command' in actionHold))) {
            handleCommand(actionHold, true)
          } else {
            const config = actionHold
            const { command, longPressAction, duration } = config

            if (longPressAction) {
              actionToShortPressRef.current = command
              longPressTimerIdRef.current = window.setTimeout(() => {
                handleLongPress(config)
                actionToShortPressRef.current = null
                longPressTimerIdRef.current = null
              }, duration || 500)
            } else {
              handleCommand(command, true)
            }
          }
        } else if (action) {
          handleCommand(action, true)
        }
      }

      const onPointerUp = (e: React.PointerEvent) => {
        const elem = e.currentTarget as HTMLElement
        elem.releasePointerCapture(e.pointerId)

        const { actionHold, action } = button
        let wasShortPress = false

        if (longPressTimerIdRef.current) {
          clearTimeout(longPressTimerIdRef.current)
          longPressTimerIdRef.current = null
          if (actionToShortPressRef.current) {
            handleCommand(actionToShortPressRef.current, true)
            handleCommand(actionToShortPressRef.current, false)
            wasShortPress = true
          }
        }

        if (!wasShortPress) {
          if (actionHold) {
            if (typeof actionHold === 'object' && 'longPressAction' in actionHold && actionHold.longPressAction) {
              if (actionToShortPressRef.current === null && typeof actionHold.longPressAction === 'string') {
                handleCommand(actionHold.longPressAction, false)
              }
            } else if (typeof actionHold === 'string') {
              handleCommand(actionHold, false)
            } else if (typeof actionHold === 'object' && 'command' in actionHold) {
              handleCommand(actionHold.command, false)
            }
          } else if (action) {
            handleCommand(action, false)
          }
        }
        actionToShortPressRef.current = null
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
