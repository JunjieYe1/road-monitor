/**
 * heatmap.js 2.0.5：Chromium 下 `img.data = imgData` 会对只读的 ImageData.data 赋值并抛错；
 * 循环已对 imgData（与 img.data 同一缓冲）原地写入，该行可删。
 * 在每次 npm install 后运行（见 package.json postinstall）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const file = path.resolve(__dirname, '../node_modules/heatmap.js/build/heatmap.js')

let s = ''
try {
  s = fs.readFileSync(file, 'utf8')
} catch {
  process.exit(0)
}

if (!s.includes('img.data = imgData'))
  process.exit(0)

const next = s.replace(/\r?\n\s*img\.data = imgData;\s*\r?\n/, '\n')
if (next === s)
  process.exit(0)

fs.writeFileSync(file, next, 'utf8')
console.log('[patch-heatmap] removed invalid ImageData.data reassignment')
