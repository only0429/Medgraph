<template>
  <div class="graph-builder-page">
    <!-- 上传与文件管理（合并在一张卡片里） -->
    <section class="card upload-card">
      <header class="card-header">
        文件上传
        <div class="actions">
          <el-button text size="small" @click="showUploader = !showUploader">
            {{ showUploader ? '隐藏上传界面' : '显示上传界面' }}
          </el-button>
        </div>
      </header>

      <div class="card-body" v-show="showUploader">
        <!-- 拖拽上传 -->
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

        <!-- 已上传文件列表（已与上传区合并） -->
        <div class="filelist-wrap" v-if="fileList.length">
          <div class="filelist-header">
            <span>已上传文件</span>
            <div class="actions">
              <el-button text size="small" type="danger" @click="clearAllFiles">清空全部</el-button>
            </div>
          </div>
          <ul class="filelist">
            <li v-for="f in fileList" :key="String(f.uid)" class="fileitem">
              <div class="filemeta" :title="f.name">
                <el-icon class="fileicon"><Document /></el-icon>
                <span class="filename">{{ f.name || '未命名' }}</span>
                <span class="filesize">{{ formatSize(getRawFile(f)?.size) }}</span>
              </div>
              <div class="fileops">
                <el-button text size="small" @click="openPreviewFile(f)">预览</el-button>
                <el-button text size="small" type="danger" @click="removeFileByUid(ensureUid(f))">删除</el-button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 图片缩略图预览（保持独立卡片，交互不变） -->
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
        <img
          v-if="previewType==='image' && previewUrl"
          class="preview-image"
          :src="previewUrl"
          :alt="previewTitle"
        />
        <iframe
          v-else-if="previewType==='pdf' && previewUrl"
          class="preview-pdf"
          :src="previewUrl"
          title="PDF 预览"
        />
        <pre
          v-else-if="previewType==='text'"
          class="preview-text"
          :title="previewTitle"
        >{{ previewText }}</pre>
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

    <!-- 编辑弹窗：点击节点/关系打开 -->
    <el-dialog
      v-model="editVisible"
      :title="editKind==='node' ? '编辑节点' : '编辑关系'"
      width="720px"
      top="8vh"
    >
      <div class="edit-form">
        <el-form label-width="68px">
          <el-form-item label="ID">
            <el-input v-model="editForm.id" disabled />
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="editForm.name" placeholder="填写名称（name）" />
          </el-form-item>
          <el-form-item label="标签">
            <el-input v-model="editForm.tag" placeholder="填写标签（tag）" />
          </el-form-item>
          <el-form-item label="细节">
            <el-input
              v-model="editForm.detail"
              type="textarea"
              :autosize="{ minRows: 4, maxRows: 10 }"
              placeholder="填写细节（detail）"
            />
          </el-form-item>
        </el-form>
        
      </div>
      <template #footer>
        <el-button @click="editVisible=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, nextTick, watch } from 'vue'
import { UploadFilled, Document } from '@element-plus/icons-vue'
import type { UploadFile, UploadUserFile, UploadRawFile } from 'element-plus'
import { Network } from 'vis-network/standalone'
import { DataSet } from 'vis-data'
import neo4j from 'neo4j-driver'

/* ============ 显隐上传区 ============ */
const showUploader = ref(true)

/* ============ 编辑态 ============ */
type EditKind = 'node' | 'edge'
type EditForm = { id: string; name: string; tag: string; detail: string }
const editVisible = ref(false)
const editKind = ref<EditKind>('node')
const editForm = ref<EditForm>({ id: '', name: '', tag: '', detail: '' })
const saving = ref(false)

function openEditor(payload: { kind: EditKind; id: string; name?: string; tag?: string; detail?: string }) {
  editKind.value = payload.kind
  editForm.value = {
    id: payload.id,
    name: payload.name || '',
    tag: payload.tag || '',
    detail: payload.detail || ''
  }
  editVisible.value = true
}

async function saveEdit() {
  saving.value = true
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE, database: 'neo4j' })
  try {
    const props = { name: editForm.value.name ?? null, tag: editForm.value.tag ?? null, detail: editForm.value.detail ?? null }
    if (editKind.value === 'node') {
      await session.run(`MATCH (n) WHERE elementId(n) = $id SET n += $props RETURN elementId(n)`, { id: editForm.value.id, props })
    } else {
      await session.run(`MATCH ()-[r]-() WHERE elementId(r) = $id SET r += $props RETURN elementId(r)`, { id: editForm.value.id, props })
    }
    editVisible.value = false
    await renderMainGraph()
    await renderSubGraph()
  } finally {
    await session.close()
    saving.value = false
  }
}

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
  return mt.startsWith('text/') || /\.(txt|md|json|csv|tsv|log|xml|html?|js|ts|css|yaml|yml)$/i.test(name)
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
]
const mainPreset = ref<string>('global')
const subPreset  = ref<string>('global')

function cypherOf(preset: string) {
  switch (preset) {
    case 'personMovie':
      return `MATCH (n:Person)-[r:ACTED_IN]->(m:Movie) RETURN n,r,m LIMIT 300`
    case 'global':
    default:
      return `MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 400`
  }
}

/* ============ vis-network 数据结构（含原属性） ============ */
type VisNode = { id: string; label?: string; group?: string; __props?: Record<string, any> }
type VisEdge = { id: string; from: string; to: string; label?: string; __props?: Record<string, any> }

const mainContainer = ref<HTMLDivElement | null>(null)
const subContainer  = ref<HTMLDivElement | null>(null)
let mainNetwork: Network | null = null
let subNetwork:  Network | null = null

// 使用 DataSet 保存可查询的数据
let mainNodesDS: DataSet<VisNode> | null = null
let mainEdgesDS: DataSet<VisEdge> | null = null
let subNodesDS:  DataSet<VisNode> | null = null
let subEdgesDS:  DataSet<VisEdge> | null = null

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
        group: n.labels?.[0] ?? 'Node',
        __props: { ...n.properties }
      })
      seen.add(n.elementId)
    }
    if (m && !seen.has(m.elementId)) {
      nodes.push({
        id: m.elementId,
        label: m.properties?.name || m.properties?.title || (m.labels?.[0] ?? 'Node'),
        group: m.labels?.[0] ?? 'Node',
        __props: { ...m.properties }
      })
      seen.add(m.elementId)
    }
    if (r && n && m) {
      edges.push({
        id: r.elementId,
        from: n.elementId,
        to: m.elementId,
        label: r.type,
        __props: { ...r.properties }
      })
    }
  }
  return { nodes, edges }
}

const visOptions:any = {
  interaction: { hover: true, tooltipDelay: 120, dragView: true, zoomView: true },
  physics: { stabilization: true },
  edges: { arrows: 'to' }
}

/* 统一绑定点击打开编辑（使用 DataSet） */
function bindEditOnClick(
  net: Network | null,
  nodesDS: DataSet<VisNode> | null,
  edgesDS: DataSet<VisEdge> | null
) {
  if (!net) return
  net.off('click')
  net.on('click', (params: any) => {
    // 节点优先
    if (params.nodes && params.nodes.length && nodesDS) {
      const id = String(params.nodes[0])
      const n = nodesDS.get(id) as VisNode | null
      if (n) {
        openEditor({
          kind: 'node',
          id,
          name: (n.__props?.name ?? n.label) || '',
          tag: n.__props?.tag || '',
          detail: n.__props?.detail || ''
        })
      }
      return
    }
    // 关系
    if (params.edges && params.edges.length && edgesDS) {
      const id = String(params.edges[0])
      const e = edgesDS.get(id) as VisEdge | null
      if (e) {
        openEditor({
          kind: 'edge',
          id,
          name: e.__props?.name || (e.label || ''),
          tag: e.__props?.tag || '',
          detail: e.__props?.detail || ''
        })
      }
    }
  })
}

async function renderMainGraph() {
  if (!mainContainer.value) return
  mainNetwork?.destroy()
  mainContainer.value.innerHTML = ''

  const session = driver.session({ defaultAccessMode: neo4j.session.READ, database: 'neo4j' })
  try {
    const res = await session.run(cypherOf(mainPreset.value))
    const { nodes, edges } = recordsToVis(res.records)

    mainNodesDS = new DataSet<VisNode>(nodes)
    mainEdgesDS = new DataSet<VisEdge>(edges)

    mainNetwork = new Network(mainContainer.value, { nodes: mainNodesDS, edges: mainEdgesDS }, visOptions)
    bindEditOnClick(mainNetwork, mainNodesDS, mainEdgesDS)
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

    subNodesDS = new DataSet<VisNode>(nodes)
    subEdgesDS = new DataSet<VisEdge>(edges)

    subNetwork = new Network(subContainer.value, { nodes: subNodesDS, edges: subEdgesDS }, visOptions)
    bindEditOnClick(subNetwork, subNodesDS, subEdgesDS)
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
  mainNodesDS?.clear(); mainEdgesDS?.clear()
  subNodesDS?.clear();  subEdgesDS?.clear()
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

/* 卡片与标题 */
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.04); overflow: hidden; }
.card-header { font-size: 14px; font-weight: 600; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: #fafafa; display: flex; justify-content: space-between; align-items: center; }
.card-body { height: 100%; padding: 10px; box-sizing: border-box; }

/* 上传区（合并样式） */
.upload-card .card-body { display: flex; flex-direction: column; gap: 12px; }
.upload-container { }
.filelist-wrap { border-top: 1px dashed #e5e7eb; padding-top: 8px; }
.filelist-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; color: #334155; margin-bottom: 6px; }

/* 文件列表 */
.filelist { list-style: none; margin: 0; padding: 6px 0; display: flex; flex-direction: column; gap: 6px; }
.fileitem { display: flex; align-items: center; justify-content: space-between; padding: 8px 2px; border-bottom: 1px dashed #e5e7eb; }
.fileitem:last-child { border-bottom: none; }
.filemeta { display: flex; align-items: center; gap: 8px; min-width: 0; }
.fileicon { color: #64748b; }
.filename { font-size: 13px; color: #334155; max-width: 48vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.filesize { font-size: 12px; color: #94a3b8; margin-left: 6px; }
.fileops { display: flex; align-items: center; gap: 8px; }

/* 预览缩略图区 */
.preview-card .card-body { max-height: 260px; overflow: auto; }
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.thumb { border: 1px solid #e5e7eb; background: #fff; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer; }
.thumb:hover { box-shadow: 0 0 0 2px rgba(59,130,246,.2) inset; }
.thumb-img { width: 100%; height: 120px; object-fit: cover; display: block; background: #f3f4f6; }
.thumb-name { font-size: 12px; padding: 8px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 面板与图框 */
.panel-wrap { display: flex; flex-direction: column; height: 100%; }
.panel-title { padding: 8px 10px; font-weight: 600; border-bottom: 1px solid #e5e7eb; background: #fafafa; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.graph-box { position: relative; flex: 1; margin: 12px; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 1px 6px rgba(0,0,0,.05); overflow: hidden; background: #fff; display: flex; }
.graph-canvas { width: 100%; height: 100%; min-height: 300px; }

/* 左上角悬浮下拉（不遮挡交互） */
.overlay-select { position: absolute; top: 10px; left: 10px; z-index: 10; pointer-events: auto; }
.select-compact { height: 32px; }
:deep(.select-compact .el-select-v2__wrapper) { height: 32px; }

/* 预览弹窗样式 */
.preview-pane { min-height: 50vh; display: flex; align-items: stretch; justify-content: center; }
.preview-image { max-width: 100%; max-height: 70vh; object-fit: contain; }
.preview-pdf { width: 100%; height: 70vh; border: none; }
.preview-text { width: 100%; height: 70vh; overflow: auto; background: #0b1021; color: #d1e7ff; padding: 12px; border-radius: 8px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.6; }
.preview-unsupported { text-align: center; color: #475569; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.preview-unsupported .links { display: flex; gap: 16px; }

/* 编辑弹窗 */
.edit-form .el-form-item { margin-bottom: 14px; }
.edit-hint { margin-top: 8px; font-size: 12px; color: #64748b; display: flex; align-items: center; }

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
