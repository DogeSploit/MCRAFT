import React, { MouseEvent, MouseEventHandler } from 'react'
import { openURL } from 'renderer/viewer/lib/simpleUtils'
import { haveDirectoryPicker } from '../utils'
import { ConnectOptions } from '../connect'
import styles from './mainMenu.module.css'
import Button from './Button'
import ButtonWithTooltip from './ButtonWithTooltip'
import { pixelartIcons } from './PixelartIcon'
import useLongPress from './useLongPress'

type Action = (e: React.MouseEvent<HTMLButtonElement>) => void

interface Props {
  connectToServerAction?: Action
  singleplayerAction?: Action
  optionsAction?: Action
  githubAction?: Action
  linksButton?: JSX.Element
  openFileAction?: Action
  mapsProvider?: string
  versionStatus?: string
  versionTitle?: string
  onVersionStatusClick?: () => void
  bottomRightLinks?: string
  versionText?: string
  onVersionTextClick?: () => void
}

const httpsRegex = /^https?:\/\//

const handleFileSelect = async (file: File) => {
  if (file.name.endsWith('.worldstate') || file.name.endsWith('.worldstate.txt') || (file.name.startsWith('packets-replay') && file.name.endsWith('.txt'))) {
    const worldStateFileContents = await file.text()
    const connectOptions: ConnectOptions = {
      worldStateFileContents,
      username: 'replay'
    }
    dispatchEvent(new CustomEvent('connect', { detail: connectOptions }))
    return true
  }
  return false
}

export default ({
  connectToServerAction,
  mapsProvider,
  singleplayerAction,
  optionsAction,
  githubAction,
  linksButton,
  openFileAction,
  versionText,
  onVersionTextClick,
  versionStatus,
  versionTitle,
  onVersionStatusClick,
  bottomRightLinks
}: Props) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const handled = await handleFileSelect(file)
    if (!handled && openFileAction) {
      openFileAction(null as any)
    }

    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFolderClick: MouseEventHandler<HTMLButtonElement> = () => {
    fileInputRef.current?.click()
  }

  if (!bottomRightLinks?.trim()) bottomRightLinks = undefined
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const linksParsed = bottomRightLinks?.split(/;|\n/g).map(l => {
    const parts = l.split(':')
    return [parts[0], parts.slice(1).join(':')]
  }) as Array<[string, string]> | undefined

  const singleplayerLongPress = useLongPress(
    () => {
      window.location.href = window.location.pathname + '?sp=1'
    },
    () => singleplayerAction?.(null as any),
    { delay: 500 }
  )

  const versionLongPress = useLongPress(
    () => {
      const buildDate = process.env.BUILD_VERSION ? new Date(process.env.BUILD_VERSION) : null
      alert(`BUILD INFO:\n${buildDate?.toLocaleString() || 'Development build'}`)
    },
    () => onVersionTextClick?.(),
  )

  const connectToServerLongPress = useLongPress(
    () => {
      if (process.env.NODE_ENV === 'development') {
      // Connect to <origin>:25565
        const origin = window.location.hostname
        const connectOptions: ConnectOptions = {
          server: `${origin}:25565`,
          username: 'test',
        }
        dispatchEvent(new CustomEvent('connect', { detail: connectOptions }))
      }
    },
    () => connectToServerAction?.(null as any),
    { delay: 500 }
  )

  return (
    <div className={styles.root}>
      <div className={styles['game-title']}>
        <div className={styles.minecraft}>
          <div className={styles.edition} />
          <span className={styles.splash}>Prismarine is a beautiful block</span>
        </div>
      </div>

      <div className={styles.menu}>
        <ButtonWithTooltip
          initialTooltip={{
            content: 'Connect to Java servers!',
            placement: 'top',
          }}
          {...connectToServerLongPress}
          data-test-id='servers-screen-button'
        >
          Connect to server
        </ButtonWithTooltip>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <ButtonWithTooltip
            style={{ width: 150 }}
            {...singleplayerLongPress}
            data-test-id='singleplayer-button'
            initialTooltip={{
              content: 'Create worlds and play offline',
              placement: 'left',
              offset: -40
            }}
          >
            Singleplayer
          </ButtonWithTooltip>

          <ButtonWithTooltip
            disabled={!mapsProvider}
            // className={styles['maps-provider']}
            icon={pixelartIcons.map}
            initialTooltip={{ content: 'Explore maps to play from provider!', placement: 'top-start' }}
            onClick={() => mapsProvider && openURL(httpsRegex.test(mapsProvider) ? mapsProvider : 'https://' + mapsProvider, false)}
          />

          <ButtonWithTooltip
            data-test-id='select-file-folder'
            icon={pixelartIcons.folder}
            onClick={handleFolderClick}
            initialTooltip={{
              content: 'Load any Java world save or replay' + (haveDirectoryPicker() ? '' : ' (zip)!'),
              placement: 'bottom-start',
            }}
          />
        </div>
        <Button
          onClick={optionsAction}
        >
          Options
        </Button>
        <div className={styles['menu-row']}>
          <ButtonWithTooltip
            initialTooltip={{
              content: 'Report bugs or request features!',
            }}
            style={{ width: '98px' }}
            onClick={githubAction}
          >
            GitHub
          </ButtonWithTooltip>
          {linksButton}
        </div>
      </div>

      <div className={styles['bottom-info']}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 10, color: 'gray' }} {...versionLongPress}>{versionText}</span>
          <span
            title={`${versionTitle} (click to reload)`}
            onClick={onVersionStatusClick}
            className={styles['product-info']}
          >
            Prismarine Web Client {versionStatus}
          </span>
        </div>
        <span className={styles['product-description']}>
          <div className={styles['product-link']}>
            {linksParsed?.map(([name, link], i, arr) => {
              if (!link.startsWith('http')) link = `https://${link}`
              return <div style={{
                color: 'lightgray',
                fontSize: 8,
              }}>
                <a
                  key={name}
                  style={{
                    whiteSpace: 'nowrap',
                  }} href={link}
                >{name}
                </a>
                {i < arr.length - 1 && <span style={{ marginLeft: 2 }}>·</span>}
              </div>
            })}
          </div>
          <span>A Minecraft client in the browser!</span>
        </span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileInput}
        accept=".worldstate,.worldstate.txt,.zip"
      />
    </div>
  )
}
