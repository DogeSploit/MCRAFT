import EventEmitter from 'events'
import clientAutoVersion from 'minecraft-protocol/src/client/autoVersion'

export const pingServerVersion = async (ip: string, port?: number, preferredVersion?: string) => {
  const fakeClient = new EventEmitter() as any
  const options = {
    host: ip,
    port,
    version: preferredVersion,
    noPongTimeout: Infinity // disable timeout
  }
  // let latency = 0
  // fakeClient.autoVersionHooks = [(res) => {
  //   latency = res.latency
  // }]

  // TODO! use client.socket.destroy() instead of client.end() for faster cleanup
  await clientAutoVersion(fakeClient, options)

  await new Promise<void>((resolve, reject) => {
    fakeClient.once('connect_allowed', resolve)
  })
  return {
    version: fakeClient.version,
    // latency,
  }
}
