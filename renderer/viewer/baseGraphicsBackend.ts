import { RendererReactiveState } from '../../src/appViewer'

export const getDefaultRendererState = (): RendererReactiveState => {
  return {
    world: {
      chunksLoaded: [],
      heightmaps: new Map(),
      chunksTotalNumber: 0,
      allChunksLoaded: true,
      mesherWork: false,
      intersectMedia: null
    },
    renderer: '',
    preventEscapeMenu: false
  }
}
