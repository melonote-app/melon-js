import { extname, join, resolve } from 'path'
import type { Logger, ViteDevServer } from 'vite'
import { getPageFiles } from './files'
import { resolveOptions } from './options'
import { PageOptions, ResolvedOptions, RouterOptions } from './types'
import { debug, slash, toArray } from './utils'
// import type { FSWatcher } from 'fs'
// import { extname, join, resolve } from 'path'
// import { MelonRouterOptions } from '.'
// import { getPageFiles } from './files'
// import { resolveOptions } from './options'
// // import { debug, invalidatePagesModule, isTarget } from './utils'

export interface PageRoute {
  path: string
  route: string
}

export class RouterContext {
  private _server: ViteDevServer | undefined
  private _pageRouteMap = new Map<string, PageRoute>()

  rawOptions: RouterOptions
  root: string
  options: ResolvedOptions
  logger?: Logger

  constructor(options: RouterOptions, viteRoot: string = process.cwd()) {
    this.rawOptions = options
    this.root = slash(viteRoot)
    debug.env('root', this.root)
    this.options = resolveOptions(options, this.root)
    // debug.options(this.options)
  }

  setLogger(logger: Logger) {
    this.logger = logger
  }

  setupViteServer(server: ViteDevServer) {
    if (this._server === server) return

    this._server = server
    // this.setupWatcher(server.watcher)
  }

  // setupWatcher(watcher: FSWatcher) {
  //   watcher.on('unlink', async (path) => {
  //     path = slash(path)
  //     if (!isTarget(path, this.options)) return
  //     await this.removePage(path)
  //     this.onUpdate()
  //   })
  //   watcher.on('add', async (path) => {
  //     path = slash(path)
  //     if (!isTarget(path, this.options)) return
  //     const page = this.options.dirs.find((i) =>
  //       path.startsWith(slash(resolve(this.root, i.dir)))
  //     )!
  //     await this.addPage(path, page)
  //     this.onUpdate()
  //   })

  //   watcher.on('change', async (path) => {
  //     path = slash(path)
  //     if (!isTarget(path, this.options)) return
  //     const page = this._pageRouteMap.get(path)
  //     if (page) await this.options.resolver.hmr?.changed?.(this, path)
  //   })
  // }

  async addPage(path: string | string[], pageDir: PageOptions) {
    debug.pages('add', path)
    for (const p of toArray(path)) {
      const pageDirPath = slash(resolve(this.root, pageDir.dir))
      const route = slash(
        join(
          pageDir.baseRoute,
          p.replace(`${pageDirPath}/`, '').replace(extname(p), '')
        )
      )
      this._pageRouteMap.set(p, {
        path: p,
        route,
      })
      await this.options.resolver.hmr?.added?.(this, p)
    }
  }

  // async removePage(path: string) {
  //   debug.pages('remove', path)
  //   this._pageRouteMap.delete(path)
  //   await this.options.resolver.hmr?.removed?.(this, path)
  // }

  // onUpdate() {
  //   if (!this._server) return

  //   invalidatePagesModule(this._server)
  //   debug.hmr('Reload generated pages.')
  //   this._server.ws.send({
  //     type: 'full-reload',
  //   })
  // }

  // async resolveRoutes() {
  //   return this.options.resolver.resolveRoutes(this)
  // }

  async searchGlob() {
    const pageDirFiles = this.options.dirs.map((page) => {
      const pagesDirPath = slash(resolve(this.options.root, page.dir))
      const files = getPageFiles(pagesDirPath, this.options)
      debug.search(page.dir, files)
      return {
        ...page,
        files: files.map((file) => slash(file)),
      }
    })
    console.log(pageDirFiles)
    for (const page of pageDirFiles) await this.addPage(page.files, page)
    debug.cache(this.pageRouteMap)
  }

  get debug() {
    return debug
  }

  get pageRouteMap() {
    return this._pageRouteMap
  }
}
