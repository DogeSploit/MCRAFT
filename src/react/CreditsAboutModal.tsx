import { hideCurrentModal } from '../globalState'
import { useIsModalActive } from './utilsApp'
import Button from './Button'
import Screen from './Screen'
import bookImage from './book_icons/book.webp'

export default () => {
  const isModalActive = useIsModalActive('credits-about')

  if (!isModalActive) return null

  return (
    <Screen
      title=""
      backdrop style={{
        position: 'relative',
        marginTop: '-15px',
      }}>
      <div style={{
        position: 'relative',
        maxWidth: '650px',
        margin: '0 auto',
        maxHeight: '70vh',
      }}>
        <img
          src={bookImage}
          alt="Book background"
          style={{
            width: '100%',
            height: 'auto',
            objectFit: 'contain'
          }}
        />

        <div style={{
          position: 'absolute',
          top: '8%',
          left: '5%',
          right: '5%',
          bottom: '10%',
          overflowY: 'auto',
          color: '#3F2A14',
          padding: '10px',
          fontFamily: 'minecraft, monospace'
        }}>
          <h2 style={{ textAlign: 'center', marginTop: 0, marginBottom: '0', fontSize: '10px' }}>Minecraft Open Source Edition</h2>

          <div style={{ marginBottom: '5px' }}>
            <small style={{ fontSize: '8px', marginBottom: '5px', fontStyle: 'italic' }}><i>What if Minecraft was an online game?</i></small>
            <p style={{ fontSize: '8px', marginBottom: '5px' }}>
              Hey! You are on the safest and fast modern Minecraft clone rewritten in JS. A huge work was done in the project, however many features would not be possible without these awesome projects:
            </p>
            <ul style={{ listStyleType: 'none', padding: 0, fontSize: '8px' }}>
              <li style={{ marginBottom: '2px' }}>- Everyone who provided awesome mods for the game</li>
              <li style={{ marginBottom: '2px' }}>- <span style={{ color: '#0000AA' }}>[Gen](https://discord.com/users/gen6442)</span> for rewriting the physics engine to be Grim-compliant</li>
              <li style={{ marginBottom: '2px' }}>- <span style={{ color: '#0000AA' }}>[ViaVersion](https://viaversion.com/)</span> for providing reliable sound id mappings</li>
              <li style={{ marginBottom: '2px' }}>- <span style={{ color: '#0000AA' }}>[Bluemap](https://github.com/BlueMap-Minecraft/BlueMap)</span> for providing block entity models like chest</li>
              <li style={{ marginBottom: '2px' }}>- <span style={{ color: '#0000AA' }}>[Deepslate](https://github.com/misode/deepslate)</span> for rendering 3d blocks in GUI (inventory)</li>
              <li style={{ marginBottom: '2px' }}>- <span style={{ color: '#0000AA' }}>[skinview3d](https://www.npmjs.com/package/skinview3d)</span> for rendering skins & player geometry</li>
              <li style={{ marginBottom: '2px' }}>- <span style={{ color: '#0000AA' }}>[Polymer](https://github.com/atxi/Polymer)</span> (c++ project) for providing fast & accurate server light implementation</li>
            </ul>

            <h3 style={{ marginTop: '10px', marginBottom: '10px', fontSize: '10px' }}>Major contributors:</h3>
            <ul style={{ listStyleType: 'none', padding: 0, fontSize: '8px' }}>
              <li style={{ marginBottom: '2px' }}>- <span style={{ color: '#0000AA' }}>Zartrix</span> - Development Lead</li>
              <li style={{ marginBottom: '2px' }}>- <span style={{ color: '#0000AA' }}>PrismarineJS</span> - Core Libraries</li>
              <li style={{ marginBottom: '2px' }}>- <span style={{ color: '#0000AA' }}>MinecraftJS</span> - Rendering Engine</li>
              <li>- And many more community contributors!</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <Button
          style={{
            width: '20px',
            height: '20px',
            fontSize: '12px',
            padding: '0',
            margin: '0',
          }}
          onClick={() => hideCurrentModal()}>X</Button>
      </div>
    </Screen>
  )
}
