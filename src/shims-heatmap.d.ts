declare module 'heatmap.js' {
  export interface HeatmapJsInstance {
    setData(data: {
      max: number
      min?: number
      data: Array<{ x: number; y: number; value?: number; radius?: number }>
    }): HeatmapJsInstance
    configure(config: Record<string, unknown>): HeatmapJsInstance
    repaint(): HeatmapJsInstance
  }

  /** UMD/CommonJS bundle */
  interface H337 {
    create(config: Record<string, unknown>): HeatmapJsInstance
    register(pluginKey: string, plugin: unknown): void
  }

  const h337: H337
  export default h337
}
