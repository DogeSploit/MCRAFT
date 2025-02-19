import { createServer, ServerClient } from 'minecraft-protocol'
import { parseReplayContents } from 'mcraft-fun-mineflayer/build/packetsReplay'
import { WorldStateHeader } from 'mcraft-fun-mineflayer/build/worldState'
import { LocalServer } from './customServer'
import { UserError } from './mineflayer/userError'

const SUPPORTED_FORMAT_VERSION = 1

export const startLocalReplayServer = (contents: string, waitForClientPackets = true) => {
  const lines = contents.split('\n')
  const def: WorldStateHeader = JSON.parse(lines[0])
  const packetsRaw = lines.slice(1).join('\n')
  const replayData = parseReplayContents(packetsRaw)
  if (def.formatVersion !== SUPPORTED_FORMAT_VERSION) {
    throw new UserError(`Unsupported format version: ${def.formatVersion}`)
  }

  const server = createServer({
    Server: LocalServer as any,
    version: def.minecraftVersion,
    'online-mode': false
  })

  const ignoreClient: string[] = ['keep_alive', 'position', 'position_look', 'settings', 'custom_payload', 'teleport_confirm']

  server.on('login', async client => {
    console.log('login')

    await mainPacketsReplayer(client, replayData, true)
  })

  return {
    server,
    version: def.minecraftVersion
  }
}

const mainPacketsReplayer = async (client: ServerClient, replayData: ReturnType<typeof parseReplayContents>, ignoreClientPacketsWait: string[] | true = []) => {
  const writePacket = (name: string, data: any) => {
    data = restoreData(data)
    client.write(name, data)
  }

  const waitForPacketOnce = async (name: string, state: string) => {
    if (ignoreClientPacketsWait !== true && ignoreClientPacketsWait.includes(name)) {
      return
    }
    return new Promise(resolve => {
      const listener = (data, meta) => {
        if (meta.state !== state || meta.name !== name) {
          return
        }
        client.removeListener(name, listener)
        resolve(data)
      }
      client.on(name, listener)
    })
  }

  const playPackets = replayData.packets.filter(p => p.state === 'play')
  for (const packet of playPackets) {
    if (packet.isFromServer) {
      writePacket(packet.name, packet.params)
      await new Promise(resolve => setTimeout(resolve, packet.diff))
    } else if (ignoreClientPacketsWait !== true && !ignoreClientPacketsWait.includes(packet.name)) {
      await waitForPacketOnce(packet.name, packet.state)
    }
  }
}

const isArrayEqual = (a: any[], b: any[]) => {
  if (a.length !== b.length) return false
  for (const [i, element] of a.entries()) {
    if (element !== b[i]) return false
  }
  return true
}

const restoreData = (json: any) => {
  const keys = Object.keys(json)

  if (isArrayEqual(keys.sort(), ['data', 'type'].sort())) {
    if (json.type === 'Buffer') {
      return Buffer.from(json.data)
    }
  }

  if (typeof json === 'object' && json) {
    for (const [key, value] of Object.entries(json)) {
      if (typeof value === 'object') {
        json[key] = restoreData(value)
      }
    }
  }

  return json
}
