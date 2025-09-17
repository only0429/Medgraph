<template>
  <div class="graph-builder-page">
    <!-- 顶部：文件上传 -->
    <div class="upload-container">
      <el-upload
        class="upload-demo"
        drag
        multiple
        :auto-upload="false"
        :show-file-list="false"
        v-model:file-list="fileList"
        :on-change="handleChange"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处或 <em>点击此处上传</em>
          <p class="el-upload__tip">(PDF/word文档)</p>
        </div>
      </el-upload>
    </div>

    <!-- 图片缩略图预览区 -->
    <transition name="fade-slide">
      <section class="card preview-card" v-if="previews.length">
        <div class="card-body">
          <transition-group name="list" tag="div" class="gallery">
            <div
              class="thumb"
              :id="`thumb-${p.uid}`"
              v-for="p in previews"
              :key="String(p.uid)"
              @click="openPreviewByUid(p.uid)"
              title="点击查看大图"
            >
              <img class="thumb-img" :src="p.url" :alt="p.name" />
              <div class="thumb-name" :title="p.name">{{ p.name }}</div>
            </div>
          </transition-group>
        </div>
      </section>
    </transition>

    <!-- 已上传文件列表 -->
    <transition name="fade-slide">
      <section class="card filelist-card" v-if="fileList.length">
        <header class="card-header">
          已上传文件
          <div class="actions">
            <el-button text size="small" type="danger" @click="clearAllFiles">清空全部</el-button>
          </div>
        </header>
        <div class="card-body">
          <ul class="filelist">
            <li v-for="f in fileList" :key="String(f.uid)" class="fileitem">
              <div class="filemeta" :title="f.name">
                <el-icon class="fileicon"><Document /></el-icon>
                <span class="filename">{{ f.name || '未命名' }}</span>
                <span class="filesize">{{ formatSize(getRawFile(f)?.size) }}</span>
              </div>
              <div class="fileops">
                <el-button text size="small" @click="openPreviewFile(f)">查看预览</el-button>
                <el-button text size="small" type="danger" @click="removeFileByUid(ensureUid(f))">删除</el-button>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </transition>

    <!-- 工作区：只有上传过文件才显示 -->
    <transition name="fade-slide">
      <section class="card" v-if="showWorkspace">
        <div class="card-body" style="height: 560px; padding: 0;">
          <el-splitter>
            <!-- 左：主图 -->
            <el-splitter-panel size="60%" :min="380">
              <div class="panel-wrap">
                <div class="panel-title"><span>主图</span></div>
                <div class="graph-box">
                  <!-- 左上角悬浮下拉（主图） -->
                  <div class="overlay-select">
                    <el-select-v2
                      v-model="mainPreset"
                      :options="presetOptions"
                      placeholder="请选择主图数据"
                      class="select-compact"
                      style="width: 220px"
                      @change="renderMainGraph"
                    />
                  </div>
                  <!-- 主图画布 -->
                  <div ref="mainContainer" class="graph-canvas"></div>
                </div>
              </div>
            </el-splitter-panel>

            <!-- 右：子图 -->
            <el-splitter-panel :min="300">
              <div class="panel-wrap">
                <div class="panel-title"><span>子图</span></div>
                <div class="graph-box">
              
                  
                  <!-- 子图画布 -->
                  <div ref="subContainer" class="graph-canvas"></div>
                </div>
              </div>
            </el-splitter-panel>
          </el-splitter>
        </div>
      </section>
    </transition>

    <!-- 预览弹窗（图片/PDF/文本/其它） -->
    <el-dialog
      v-model="previewVisible"
      :title="previewTitle"
      width="70vw"
      top="6vh"
      @closed="onPreviewClosed"
    >
      <div class="preview-pane" v-loading="previewLoading">
        <!-- 图片 -->
        <img
          v-if="previewType==='image' && previewUrl"
          class="preview-image"
          :src="previewUrl"
          :alt="previewTitle"
        />
        <!-- PDF -->
        <iframe
          v-else-if="previewType==='pdf' && previewUrl"
          class="preview-pdf"
          :src="previewUrl"
          title="PDF 预览"
        />
        <!-- 文本 -->
        <pre
          v-else-if="previewType==='text'"
          class="preview-text"
          :title="previewTitle"
        >{{ previewText }}</pre>
        <!-- 其它 -->
        <div v-else class="preview-unsupported">
          <p>暂不支持在线预览该文件类型。</p>
          <div v-if="previewUrl" class="links">
            <a :href="previewUrl" target="_blank" rel="noreferrer">在新标签打开</a>
            <a :href="previewUrl" :download="previewTitle">下载</a>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewVisible=false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, nextTick, watch } from 'vue'
import { UploadFilled, Document } from '@element-plus/icons-vue'
import type { UploadFile, UploadUserFile, UploadRawFile } from 'element-plus'
import { Network } from 'vis-network/standalone'
import neo4j from 'neo4j-driver'

/* ================= 上传/预览 ================= */

type PreviewItem = { uid: string | number; url: string; name: string }

const fileList = ref<UploadUserFile[]>([])
const previews = ref<PreviewItem[]>([])
const showWorkspace = computed(() => fileList.value.length > 0)

function getRawFile(f: UploadFile | UploadUserFile): File | undefined {
  return 'raw' in f && f.raw instanceof File ? (f.raw as UploadRawFile) : undefined
}
function ensureUid(f: UploadFile | UploadUserFile): number {
  if (f.uid == null) (f as any).uid = Date.now() + Math.floor(Math.random() * 1e6)
  return f.uid as number
}
function isImageFile(f: UploadFile | UploadUserFile) {
  const raw = getRawFile(f)
  const name = f.name || ''
  const mimeIsImage = !!raw?.type && raw.type.startsWith('image/')
  const extIsImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)
  return mimeIsImage || extIsImage
}
function isPdfFile(f: UploadFile | UploadUserFile) {
  const raw = getRawFile(f)
  const name = (f.name || '').toLowerCase()
  return raw?.type === 'application/pdf' || /\.pdf$/i.test(name)
}
function isTextLike(f: UploadFile | UploadUserFile) {
  const raw = getRawFile(f)
  const mt = raw?.type || ''
  const name = (f.name || '').toLowerCase()
  return (
    mt.startsWith('text/') ||
    /\.(txt|md|json|csv|tsv|log|xml|html?|js|ts|css|yaml|yml)$/i.test(name)
  )
}
function formatSize(bytes?: number) {
  if (bytes === undefined) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0, n = bytes
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

function rebuildPreviews(files: (UploadFile | UploadUserFile)[]) {
  previews.value.forEach(p => p.url && URL.revokeObjectURL(p.url))
  const next: PreviewItem[] = []
  for (const f of files) {
    ensureUid(f)
    if (!isImageFile(f)) continue
    const raw = getRawFile(f)
    const name = f.name || '未命名'
    const url = raw ? URL.createObjectURL(raw) : ((f as any).url || '')
    if (url) next.push({ uid: f.uid as number, url, name })
  }
  previews.value = next
}
function handleChange(_file: UploadFile, files: UploadFile[]) {
  files.forEach(ensureUid)
  fileList.value = files as unknown as UploadUserFile[]
  rebuildPreviews(files)
}

/* 删除/清空 */
function removeFileByUid(uid: string | number) {
  const i = fileList.value.findIndex(f => String(f.uid) === String(uid))
  if (i === -1) return
  const [removed] = fileList.value.splice(i, 1)

  const pIdx = previews.value.findIndex(p => String(p.uid) === String(uid))
  if (pIdx !== -1) {
    const p = previews.value[pIdx]
    if (p.url) URL.revokeObjectURL(p.url)
    previews.value.splice(pIdx, 1)
  }

  if (previewVisible.value && previewTitle.value === (removed.name || '未命名')) {
    previewVisible.value = false
    onPreviewClosed()
  }
}
function clearAllFiles() {
  previews.value.forEach(p => p.url && URL.revokeObjectURL(p.url))
  previews.value = []
  fileList.value = []
  if (previewVisible.value) { previewVisible.value = false; onPreviewClosed() }
}

/* 预览弹窗 */
const previewVisible = ref(false)
const previewTitle = ref('')
const previewType = ref<'image' | 'pdf' | 'text' | 'other'>('other')
const previewUrl = ref<string>('')
const previewText = ref<string>('')
const previewLoading = ref(false)

function openPreviewByUid(uid: string | number) {
  const f = fileList.value.find(ff => String(ff.uid) === String(uid))
  if (f) openPreviewFile(f)
}
async function openPreviewFile(f: UploadFile | UploadUserFile) {
  const raw = getRawFile(f)
  const name = f.name || '未命名'
  previewTitle.value = name
  previewLoading.value = true
  previewText.value = ''
  if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value = '' }

  try {
    if (!raw) {
      const direct = (f as any).url as string | undefined
      previewUrl.value = direct || ''
      previewType.value = isPdfFile(f) ? 'pdf' : (isImageFile(f) ? 'image' : 'other')
    } else if (isImageFile(f)) {
      previewType.value = 'image'
      previewUrl.value = URL.createObjectURL(raw)
    } else if (isPdfFile(f)) {
      previewType.value = 'pdf'
      previewUrl.value = URL.createObjectURL(raw)
    } else if (isTextLike(f)) {
      previewType.value = 'text'
      previewText.value = await readFileText(raw)
    } else {
      previewType.value = 'other'
      previewUrl.value = URL.createObjectURL(raw)
    }
    previewVisible.value = true
    if (isImageFile(f)) {
      await nextTick()
      const el = document.getElementById(`thumb-${String(ensureUid(f))}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  } finally {
    previewLoading.value = false
  }
}
function onPreviewClosed() {
  if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value = '' }
  previewText.value = ''
}
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = e => reject(e)
    reader.readAsText(file, 'utf-8')
  })
}

/* ================= 图谱选择/渲染 ================= */

const presetOptions = [
  { value: 'global',      label: '主图一' },
  { value: 'personMovie', label: '主图二' },
  // { value: 'drugGene', label: '药物-基因' },
]
const mainPreset = ref<string>('global')
const subPreset  = ref<string>('global')

function cypherOf(preset: string) {
  switch (preset) {
    case 'personMovie':
      return `MATCH (n:Person)-[r:ACTED_IN]->(m:Movie) RETURN n,r,m LIMIT 300`
    // case 'drugGene':
    //   return `MATCH (n:Drug)-[r:TARGETS]->(m:Gene) RETURN n,r,m LIMIT 400`
    case 'global':
    default:
      return `MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 400`
  }
}

type VisNode = { id: string; label?: string; group?: string }
type VisEdge = { from: string; to: string; label?: string }

const mainContainer = ref<HTMLDivElement | null>(null)
const subContainer  = ref<HTMLDivElement | null>(null)
let mainNetwork: Network | null = null
let subNetwork:  Network | null = null

/* Neo4j 连接：可通过 .env 覆盖 */
const driver = neo4j.driver(
  import.meta.env.VITE_NEO4J_URI || 'neo4j://127.0.0.1:7687',
  neo4j.auth.basic(
    import.meta.env.VITE_NEO4J_USER || 'neo4j',
    import.meta.env.VITE_NEO4J_PASSWORD || 'password'
  )
)

function recordsToVis(records: any[]) {
  const nodes: VisNode[] = []
  const edges: VisEdge[] = []
  const seen = new Set<string>()

  for (const rec of records) {
    const n = rec.get('n'), m = rec.get('m'), r = rec.get('r')

    if (n && !seen.has(n.elementId)) {
      nodes.push({
        id: n.elementId,
        label: n.properties?.name || n.properties?.title || (n.labels?.[0] ?? 'Node'),
        group: n.labels?.[0] ?? 'Node'
      })
      seen.add(n.elementId)
    }
    if (m && !seen.has(m.elementId)) {
      nodes.push({
        id: m.elementId,
        label: m.properties?.name || m.properties?.title || (m.labels?.[0] ?? 'Node'),
        group: m.labels?.[0] ?? 'Node'
      })
      seen.add(m.elementId)
    }
    if (r && n && m) edges.push({ from: n.elementId, to: m.elementId, label: r.type })
  }
  return { nodes, edges }
}

const visOptions:any = {
  interaction: { hover: true, tooltipDelay: 120, dragView: true, zoomView: true },
  physics: { stabilization: true },
  edges: { arrows: 'to' }
}

async function renderMainGraph() {
  if (!mainContainer.value) return
  mainNetwork?.destroy()
  mainContainer.value.innerHTML = ''

  const session = driver.session({ defaultAccessMode: neo4j.session.READ, database: 'neo4j' })
  try {
    const res = await session.run(cypherOf(mainPreset.value))
    const { nodes, edges } = recordsToVis(res.records)
    mainNetwork = new Network(mainContainer.value, { nodes, edges }, visOptions)
    setTimeout(() => mainNetwork?.fit({ animation: true }), 0)
  } finally {
    await session.close()
  }
}

async function renderSubGraph() {
  if (!subContainer.value) return
  subNetwork?.destroy()
  subContainer.value.innerHTML = ''

  const session = driver.session({ defaultAccessMode: neo4j.session.READ, database: 'neo4j' })
  try {
    const res = await session.run(cypherOf(subPreset.value))
    const { nodes, edges } = recordsToVis(res.records)
    subNetwork = new Network(subContainer.value, { nodes, edges }, visOptions)
    setTimeout(() => subNetwork?.fit({ animation: true }), 0)
  } finally {
    await session.close()
  }
}

/* 上传后显示工作区 → 再渲染 */
watch(showWorkspace, async (v) => {
  if (v) {
    await nextTick()
    await renderMainGraph()
    await renderSubGraph()
  }
})

/* 卸载清理 */
onBeforeUnmount(async () => {
  previews.value.forEach(p => p.url && URL.revokeObjectURL(p.url))
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  mainNetwork?.destroy()
  subNetwork?.destroy()
  try { await driver.close() } catch {}
})
</script>

<style scoped>
/* 整体背景色 */
.graph-builder-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: #E0E4EC;
}

/* 上传区 */
.upload-container { margin-bottom: 4px; }

/* 预览缩略图区 */
.preview-card .card-body { max-height: 260px; overflow: auto; }
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.thumb { border: 1px solid #e5e7eb; background: #fff; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer; }
.thumb:hover { box-shadow: 0 0 0 2px rgba(59,130,246,.2) inset; }
.thumb-img { width: 100%; height: 120px; object-fit: cover; display: block; background: #f3f4f6; }
.thumb-name { font-size: 12px; padding: 8px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 文件列表 */
.filelist-card .card-body { padding: 0; }
.filelist { list-style: none; margin: 0; padding: 6px 10px; display: flex; flex-direction: column; gap: 6px; }
.fileitem { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-bottom: 1px dashed #e5e7eb; }
.fileitem:last-child { border-bottom: none; }
.filemeta { display: flex; align-items: center; gap: 8px; min-width: 0; }
.fileicon { color: #64748b; }
.filename { font-size: 13px; color: #334155; max-width: 48vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.filesize { font-size: 12px; color: #94a3b8; margin-left: 6px; }
.fileops { display: flex; align-items: center; gap: 8px; }

/* 卡片与标题 */
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.04); overflow: hidden; }
.card-header { font-size: 14px; font-weight: 600; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: #fafafa; display: flex; justify-content: space-between; align-items: center; }
.card-body { height: 100%; padding: 10px; box-sizing: border-box; }

.panel-wrap { display: flex; flex-direction: column; height: 100%; }
.panel-title {
  padding: 8px 10px;
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

/* 图框：定位容器 */
.graph-box {
  position: relative;            /* 让悬浮下拉按它定位 */
  flex: 1;
  margin: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 1px 6px rgba(0,0,0,.05);
  overflow: hidden;
  background: #fff;
  display: flex;
}

/* 画布占满 */
.graph-canvas {
  width: 100%;
  height: 100%;
  min-height: 300px;
}

/* 左上角悬浮下拉（不遮挡交互） */
.overlay-select {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
  pointer-events: auto;     /* 下拉可点 */
}
.select-compact { height: 32px; }
:deep(.select-compact .el-select-v2__wrapper) { height: 32px; }

/* 预览弹窗样式 */
.preview-pane { min-height: 50vh; display: flex; align-items: stretch; justify-content: center; }
.preview-image { max-width: 100%; max-height: 70vh; object-fit: contain; }
.preview-pdf { width: 100%; height: 70vh; border: none; }
.preview-text { width: 100%; height: 70vh; overflow: auto; background: #0b1021; color: #d1e7ff; padding: 12px; border-radius: 8px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.6; }
.preview-unsupported { text-align: center; color: #475569; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.preview-unsupported .links { display: flex; gap: 16px; }

/* 动画 */
.fade-slide-enter-active { transition: all .28s ease; }
.fade-slide-leave-active { transition: all .2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(8px); }
.list-enter-active, .list-leave-active { transition: transform .25s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: scale(.98); }
.list-move { transition: transform .25s ease; }

/* 上传图标大小 */
:deep(.el-upload-dragger .el-icon--upload){ font-size: 48px; }
:deep(.el-upload-dragger .el-icon--upload svg){ width: 1em; height: 1em; }
</style>
