<template>
  <div class="graph-builder-page">
    <!-- 上传与文件管理 -->
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

        <!-- 缩略图预览 -->
        <transition name="fade-slide">
          <section class="preview-section" v-if="fileList.length && thumbnailPreviews.length">
            <div class="preview-header">
              <span>子流程图</span>
              <div class="actions">
                <el-button text size="small" @click="refreshThumbnails">刷新</el-button>
              </div>
            </div>
            <div class="preview-body">
              <transition-group name="list" tag="div" class="gallery">
                <div
                  class="thumb"
                  :id="`thumb-${p.uid}`"
                  v-for="p in thumbnailPreviews"
                  :key="String(p.uid)"
                  @click="openThumbnailPreview(p)"
                  title="点击查看大图"
                >
                  <img class="thumb-img" :src="p.url" :alt="p.name" />
                  <div class="thumb-name" :title="p.name">{{ p.name }}</div>
                </div>
              </transition-group>
            </div>
          </section>
        </transition>
      </div>
    </section>

    <!-- 节点选择状态提示条 -->
    <div v-if="nodeSelectionMode" class="node-selection-overlay">
      <div class="selection-status-bar">
        <div class="status-content">
          <el-alert
            title="节点选择模式"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              <div class="selection-info">
                <div class="selection-steps">
                  <div :class="['step', { active: selectedNodes.from !== null }]">
                    <span class="step-number">1</span>
                    <span class="step-text">
                      起始节点: 
                      <span v-if="selectedNodes.from" class="node-info">
                        {{ getNodeName(selectedNodes.from) }}
                      </span>
                      <span v-else class="placeholder">待选择</span>
                    </span>
                  </div>
                  <div :class="['step', { active: selectedNodes.to !== null }]">
                    <span class="step-number">2</span>
                    <span class="step-text">
                      目标节点: 
                      <span v-if="selectedNodes.to" class="node-info">
                        {{ getNodeName(selectedNodes.to) }}
                      </span>
                      <span v-else class="placeholder">待选择</span>
                    </span>
                  </div>
                </div>
                <div class="instructions">
                  <el-icon><InfoFilled /></el-icon>
                  <span>请在画布中点击两个不同的节点来创建关系</span>
                </div>
              </div>
            </template>
          </el-alert>
        </div>
        <div class="selection-actions">
          <el-button size="small" @click="cancelNodeSelection">取消选择</el-button>
          <el-button size="small" type="primary" @click="reselectNodes" :disabled="!selectedNodes.from && !selectedNodes.to">
            重新选择
          </el-button>
        </div>
      </div>
    </div>

    <!-- 工作区 -->
    <transition name="fade-slide">
      <section class="card workspace-card" v-if="showWorkspace">
        <div class="card-body workspace-body">
          <el-splitter>
            <!-- 左：主图 -->
            <el-splitter-panel size="60%" :min="380">
              <div class="panel-wrap main-panel">
                <div class="panel-title">
                  <span>主图</span>
                  <div class="graph-actions">
                    <el-button size="small" class="uniform-button" @click="showAddNodeDialog('main')">
                      <el-icon><Plus /></el-icon>添加节点
                    </el-button>
                    <el-button size="small" class="uniform-button" @click="showAddEdgeDialog('main')">
                      <el-icon><Plus /></el-icon>添加关系
                    </el-button>
                    <el-button size="small" type="danger" class="uniform-button" @click="handleDeleteSelected('main')">
                      <el-icon><Delete /></el-icon>删除选中
                    </el-button>
                    <el-button size="small" class="uniform-button" @click="handleUndo('main')" :disabled="!canUndoMain">
                      <el-icon><RefreshLeft /></el-icon>撤销
                    </el-button>
                  </div>
                </div>
                <div class="graph-box main-graph-box">
                  <div class="overlay-controls">
                    <el-select-v2
                      v-model="mainPreset"
                      :options="presetOptions"
                      placeholder="请选择主图数据"
                      class="select-compact"
                      style="width: 220px"
                      @change="renderMainGraph"
                    />
                    <div class="search-box">
                      <el-input
                        v-model="mainSearchKeyword"
                        placeholder="搜索节点..."
                        clearable
                        @input="handleMainSearch"
                        @clear="clearMainSearch"
                        style="width: 200px"
                      >
                        <template #prefix>
                          <el-icon><Search /></el-icon>
                        </template>
                      </el-input>
                    </div>
                  </div>
                  <div ref="mainContainer" class="graph-canvas"></div>
                </div>
              </div>
            </el-splitter-panel>

            <!-- 右：子图列 -->
            <el-splitter-panel :min="360" class="right-panel">
              <div class="panel-wrap">
                <div class="panel-title">
                  <span>子图</span>
                  <div class="graph-actions">
                    <el-button size="small" class="uniform-button" @click="showAddNodeDialog('sub')">
                      <el-icon><Plus /></el-icon>添加节点
                    </el-button>
                    <el-button size="small" class="uniform-button" @click="showAddEdgeDialog('sub')">
                      <el-icon><Plus /></el-icon>添加关系
                    </el-button>
                    <el-button size="small" type="danger" class="uniform-button" @click="handleDeleteSelected('sub')">
                      <el-icon><Delete /></el-icon>删除选中
                    </el-button>
                    <el-button size="small" class="uniform-button" @click="handleUndo('sub')" :disabled="!canUndoSub">
                      <el-icon><RefreshLeft /></el-icon>撤销
                    </el-button>
                  </div>
                </div>

                <!-- 子图区域 -->
                <div class="sub-layout" :style="sidebarStyle">
                  <!-- 左：切换栏 -->
                  <aside class="sub-sidebar" v-show="!sidebarCollapsed">
                    <div class="sidebar-header">
                      <span class="sidebar-title">子图列表</span>
                      <el-tooltip content="收起边栏" placement="right">
                        <el-button
                          circle
                          text
                          class="sidebar-toggle-btn"
                          @click="toggleSidebar"
                          aria-label="收起边栏"
                        >
                          <el-icon class="chevron">
                            <ArrowLeft />
                          </el-icon>
                        </el-button>
                      </el-tooltip>
                    </div>
                    
                    <!-- 子图列表 -->
                    <div class="sidebar-content">
                      <ul class="nav-list">
                        <li
                          v-for="(item, idx) in subNavItems"
                          :key="item.id"
                          :class="['nav-item', { active: idx === activeSubNav }]"
                        >
                          <div class="nav-item-content" @click="selectSubNav(idx)">
                            <span class="title">{{ item.title }}</span>
                          </div>
                          <div class="nav-item-actions">
                            <el-dropdown 
                              trigger="click" 
                              placement="bottom-end"
                              @command="handleSubgraphCommand($event, item, idx)"
                            >
                              <el-button 
                                text 
                                size="small" 
                                class="action-btn"
                                @click.stop
                              >
                                <el-icon><MoreFilled /></el-icon>
                              </el-button>
                              <template #dropdown>
                                <el-dropdown-menu>
                                  <el-dropdown-item command="rename">
                                    <el-icon><Edit /></el-icon>
                                    <span>重命名</span>
                                  </el-dropdown-item>
                                  <el-dropdown-item command="editContent">
                                    <el-icon><Document /></el-icon>
                                    <span>修改内容</span>
                                  </el-dropdown-item>
                                  <el-dropdown-item command="delete" divided>
                                    <el-icon><Delete /></el-icon>
                                    <span>删除</span>
                                  </el-dropdown-item>
                                </el-dropdown-menu>
                              </template>
                            </el-dropdown>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </aside>

                  <!-- 右：内容列 -->
                  <div class="sub-content-col" :style="subContentColStyle">
                    <!-- 子图画布 -->
                    <section class="subcard">
                      <div class="subcard-body subgraph-fixed">
                        <!-- 独立展开按钮 -->
                        <div v-if="sidebarCollapsed" class="floating-expand-btn">
                          <el-tooltip content="展开边栏" placement="right">
                            <el-button
                              circle
                              text
                              class="expand-btn"
                              @click="toggleSidebar"
                              aria-label="展开边栏"
                            >
                              <el-icon class="chevron">
                                <ArrowRight />
                              </el-icon>
                            </el-button>
                          </el-tooltip>
                        </div>
                        
                        <!-- 子图搜索框 -->
                        <div class="sub-search-box">
                          <el-input
                            v-model="subSearchKeyword"
                            placeholder="搜索节点..."
                            clearable
                            @input="handleSubSearch"
                            @clear="clearSubSearch"
                            style="width: 200px"
                          >
                            <template #prefix>
                              <el-icon><Search /></el-icon>
                            </template>
                          </el-input>
                        </div>
                        
                        <!-- 融合按钮 -->
                        <div class="fusion-btn">
                          <el-tooltip content="融合" placement="top">
                            <el-button
                              type="primary"
                              class="fusion-button"
                              @click="handleFusion"
                            >
                              <el-icon><Plus /></el-icon>
                              <span>融合</span>
                            </el-button>
                          </el-tooltip>
                        </div>
                        
                        <div ref="subContainer" class="graph-canvas"></div>
                      </div>
                    </section>

      <!-- 推荐修改部分 -->
<section class="subcard rec-card">
  <header class="subcard-head" @click="toggleRecommendation">
    <div class="title">推荐修改</div>
    <el-tooltip
      :content="showRecommendation ? '收起推荐修改' : '展开推荐修改'"
      placement="top"
    >
      <el-button
        circle
        text
        class="sidebar-toggle-btn"
        :aria-label="showRecommendation ? '收起推荐修改' : '展开推荐修改'"
      >
        <el-icon :class="['chevron', { 'rotate-180': !showRecommendation }]">
          <ArrowDown />
        </el-icon>
      </el-button>
    </el-tooltip>
  </header>
  <div class="subcard-body rec-body" v-show="showRecommendation">
    <div class="recommendation-content">
      <!-- 推荐修改列表 -->
      <div class="recommendation-list">
        <!-- 子图节点匹配信息 -->
        <div class="match-section">
          <div class="section-header">
            <el-icon class="section-icon"><Connection /></el-icon>
            <span class="section-title">疑似匹配节点</span>
          </div>
          <div class="section-content">
            <div class="node-item">
              <span class="node-label">子图节点5.6</span>
              <span class="node-description">（患者是否能从静脉溶栓中获益？）</span>
            </div>
          </div>
        </div>

        <!-- 主图候选节点 -->
        <div class="candidate-section">
          <div class="section-header">
            <el-icon class="section-icon"><View /></el-icon>
            <span class="section-title">主图候选节点</span>
          </div>
          
          <div class="candidate-list">
            <!-- 候选节点1 -->
            <div class="candidate-item">
              <div class="candidate-info">
                <span class="node-id">节点39</span>
                <span class="node-name">静脉溶栓评估</span>
              </div>
              <div class="similarity-info">
                <el-tag size="small" type="info">
                  结构相似度: 0.125
                </el-tag>
              </div>
            </div>

            <!-- 候选节点2 -->
            <div class="candidate-item">
              <div class="candidate-info">
                <span class="node-id">节点13</span>
                <span class="node-name">对这些异常是否有疑问</span>
              </div>
              <div class="similarity-info">
                <el-tag size="small" type="info">
                  结构相似度: 0.125
                </el-tag>
              </div>
            </div>

            <!-- 候选节点3 -->
            <div class="candidate-item">
              <div class="candidate-info">
                <span class="node-id">节点18</span>
                <span class="node-name">是否有紧急指征</span>
              </div>
              <div class="similarity-info">
                <el-tag size="small" type="info">
                  结构相似度: 0.125
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
                  </div>
                </div>
              </div>
            </el-splitter-panel>
          </el-splitter>
        </div>
      </section>
    </transition>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" :title="previewTitle" width="70vw" top="6vh" @closed="onPreviewClosed">
      <div class="preview-pane" v-loading="previewLoading">
        <img v-if="previewType==='image' && previewUrl" class="preview-image" :src="previewUrl" :alt="previewTitle" />
        <iframe v-else-if="previewType==='pdf' && previewUrl" class="preview-pdf" :src="previewUrl" title="PDF 预览" />
        <pre v-else-if="previewType==='text'" class="preview-text" :title="previewTitle">{{ previewText }}</pre>
        <div v-else class="preview-unsupported">
          <p>暂不支持在线预览该文件类型。</p>
          <div v-if="previewUrl" class="links">
            <a :href="previewUrl" target="_blank" rel="noreferrer">在新标签打开</a>
            <a :href="previewUrl" :download="previewTitle">下载</a>
          </div>
        </div>
      </div>
      <template #footer><el-button @click="previewVisible=false">关闭</el-button></template>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" :title="editKind==='node' ? '编辑节点' : '编辑关系'" width="720px" top="8vh">
      <div class="edit-form">
        <el-form label-width="68px">
          <el-form-item label="ID"><el-input v-model="editForm.id" disabled /></el-form-item>
          <el-form-item label="名称"><el-input v-model="editForm.name" placeholder="填写名称（name）" /></el-form-item>
          <el-form-item label="标签"><el-input v-model="editForm.tag" placeholder="填写标签（label）" /></el-form-item>
          <el-form-item label="细节">
            <el-input v-model="editForm.detail" type="textarea" :autosize="{ minRows: 4, maxRows: 10 }" placeholder="填写细节（detail）" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="editVisible=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加节点弹窗 -->
    <el-dialog v-model="addNodeDialogVisible" :title="`添加节点 - ${addNodeTarget === 'main' ? '主图' : '子图'}`" width="500px" top="15vh">
      <div class="add-form">
        <el-form :model="addNodeForm" label-width="80px">
          <el-form-item label="节点名称" required>
            <el-input v-model="addNodeForm.name" placeholder="请输入节点名称" />
          </el-form-item>
          <el-form-item label="节点标签">
            <el-input v-model="addNodeForm.label" placeholder="请输入节点标签" />
          </el-form-item>
          <el-form-item label="详细信息">
            <el-input v-model="addNodeForm.details" type="textarea" :rows="3" placeholder="请输入节点详细信息" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="addNodeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="addingNode" @click="confirmAddNode">添加</el-button>
      </template>
    </el-dialog>

    <!-- 添加关系弹窗 -->
    <el-dialog v-model="addEdgeDialogVisible" :title="`添加关系 - ${addEdgeTarget === 'main' ? '主图' : '子图'}`" width="600px" top="15vh">
      <div class="add-form">
        <!-- 显示已选节点信息 -->
        <div v-if="selectedNodes.from && selectedNodes.to" class="selected-nodes-info">
          <el-alert
            :title="`创建关系: ${getNodeName(selectedNodes.from)} → ${getNodeName(selectedNodes.to)}`"
            type="success"
            :closable="false"
            show-icon
          />
        </div>

        <el-form :model="addEdgeForm" label-width="100px">
          <el-form-item label="起始节点" required>
            <div class="node-display">
              <el-tag v-if="selectedNodes.from" type="success" class="node-tag">
                {{ getNodeName(selectedNodes.from) }}
              </el-tag>
              <span v-else class="no-selection">未选择</span>
              <el-button 
                type="primary" 
                text 
                size="small"
                @click="reselectNodes"
              >
                重新选择
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="关系类型" required>
            <el-input v-model="addEdgeForm.type" placeholder="请输入关系类型" />
          </el-form-item>
          <el-form-item label="目标节点" required>
            <div class="node-display">
              <el-tag v-if="selectedNodes.to" type="warning" class="node-tag">
                {{ getNodeName(selectedNodes.to) }}
              </el-tag>
              <span v-else class="no-selection">未选择</span>
              <el-button 
                type="primary" 
                text 
                size="small"
                @click="reselectNodes"
              >
                重新选择
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="关系描述">
            <el-input v-model="addEdgeForm.description" type="textarea" :rows="2" placeholder="请输入关系描述" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="addEdgeDialogVisible = false; exitNodeSelectionMode()">取消</el-button>
        <el-button type="primary" :loading="addingEdge" @click="confirmAddEdge">添加关系</el-button>
      </template>
    </el-dialog>

    <!-- 子图重命名弹窗 -->
    <el-dialog v-model="renameDialogVisible" title="重命名子图" width="500px" top="20vh">
      <div class="rename-form">
        <el-form :model="renameForm" label-width="80px">
          <el-form-item label="子图名称">
            <el-input 
              v-model="renameForm.title" 
              placeholder="请输入子图名称" 
              maxlength="20"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRename">确定</el-button>
      </template>
    </el-dialog>

    <!-- 子图内容编辑弹窗 -->
    <el-dialog v-model="contentEditDialogVisible" title="修改子图内容" width="600px" top="10vh">
      <div class="content-edit-form">
        <el-form :model="contentEditForm" label-width="80px">
          <el-form-item label="子图名称">
            <el-input 
              v-model="contentEditForm.title" 
              placeholder="请输入子图名称"
              maxlength="20"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="内容描述">
            <el-input
              v-model="contentEditForm.description"
              type="textarea"
              :rows="4"
              placeholder="请输入子图内容描述"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="contentEditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmContentEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { 
  UploadFilled, 
  Document, 
  ArrowRight, 
  ArrowLeft, 
  MoreFilled,
  Edit,
  Delete,
  Plus,
  ArrowDown,
  Search,
  Connection,
  RefreshLeft,
  InfoFilled,
  Warning,
  Check,
  Close,
  View
} from '@element-plus/icons-vue'
import type { UploadFile, UploadUserFile, UploadRawFile } from 'element-plus'
import { Network } from 'vis-network/standalone'
import { DataSet } from 'vis-data'
import neo4j from 'neo4j-driver'
import { ElMessage, ElMessageBox } from 'element-plus'

/* 显隐上传区 */
const showUploader = ref(true)

/* 边栏收起状态 */
const sidebarCollapsed = ref(false)
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

/* 推荐修改显示状态 */
const showRecommendation = ref(true)
const toggleRecommendation = () => {
  showRecommendation.value = !showRecommendation.value
}

// 融合按钮点击处理
const handleFusion = () => {
  ElMessage.info('融合功能开发中...')
}

/* 添加关系 - 改进的节点选择功能 */
const nodeSelectionMode = ref(false)
const selectedNodes = ref<{from: string | null, to: string | null}>({
  from: null,
  to: null
})

// 修改添加关系弹窗的打开逻辑
function showAddEdgeDialog(target: 'main' | 'sub') {
  addEdgeTarget.value = target
  addEdgeForm.value = { from: '', to: '', type: '', description: '' }
  
  // 先不打开弹窗，而是进入节点选择模式
  enterNodeSelectionMode()
  ElMessage.info('请先选择两个节点：第一个作为起始节点，第二个作为目标节点')
}

// 进入节点选择模式
function enterNodeSelectionMode() {
  nodeSelectionMode.value = true
  selectedNodes.value = { from: null, to: null }
  
  // 设置网络交互选项，突出显示可点击的节点
  const network = addEdgeTarget.value === 'main' ? mainNetwork : subNetwork
  if (network) {
    network.setOptions({
      interaction: {
        ...visOptions.interaction,
        selectable: true,
        multiselect: false
      }
    })
    
    // 添加点击事件监听
    network.off('click', handleNodeSelectionClick) // 先移除旧的监听
    network.on('click', handleNodeSelectionClick)
    
    // 高亮所有节点，提示用户可以选择
    highlightSelectableNodes()
  }
}

// 退出节点选择模式
function exitNodeSelectionMode() {
  nodeSelectionMode.value = false
  selectedNodes.value = { from: null, to: null }
  
  // 恢复网络交互选项
  const network = addEdgeTarget.value === 'main' ? mainNetwork : subNetwork
  if (network) {
    network.setOptions(visOptions)
    network.off('click', handleNodeSelectionClick)
    resetNodeHighlights()
    
    // 重新绑定编辑点击事件
    const nodesDS = addEdgeTarget.value === 'main' ? mainNodesDS : subNodesDS
    const edgesDS = addEdgeTarget.value === 'main' ? mainEdgesDS : subEdgesDS
    bindEditOnClick(network, nodesDS, edgesDS)
  }
}

// 处理节点选择点击
function handleNodeSelectionClick(params: any) {
  if (!nodeSelectionMode.value) return
  
  const network = addEdgeTarget.value === 'main' ? mainNetwork : subNetwork
  const nodesDS = addEdgeTarget.value === 'main' ? mainNodesDS : subNodesDS
  
  if (!network || !nodesDS || params.nodes.length === 0) return
  
  const clickedNodeId = params.nodes[0]
  
  // 如果点击的是已选中的节点，则取消选择
  if (selectedNodes.value.from === clickedNodeId) {
    selectedNodes.value.from = null
    resetNodeHighlight(clickedNodeId)
    ElMessage.info('已取消选择起始节点，请重新选择')
    return
  }
  
  if (selectedNodes.value.to === clickedNodeId) {
    selectedNodes.value.to = null
    resetNodeHighlight(clickedNodeId)
    ElMessage.info('已取消选择目标节点，请重新选择')
    return
  }
  
  // 选择节点
  if (selectedNodes.value.from === null) {
    // 选择第一个节点（起始节点）
    selectedNodes.value.from = clickedNodeId
    highlightSelectedNode(clickedNodeId, 'from')
    ElMessage.info('已选择起始节点，请点击目标节点')
  } else if (selectedNodes.value.to === null) {
    // 选择第二个节点（目标节点）
    selectedNodes.value.to = clickedNodeId
    highlightSelectedNode(clickedNodeId, 'to')
    
    // 两个节点都选择完成，现在打开弹窗
    openEdgeDialogWithSelectedNodes()
  }
}

// 使用已选节点打开关系弹窗
function openEdgeDialogWithSelectedNodes() {
  const nodesDS = addEdgeTarget.value === 'main' ? mainNodesDS : subNodesDS
  if (!nodesDS || !selectedNodes.value.from || !selectedNodes.value.to) return
  
  const fromNode = nodesDS.get(selectedNodes.value.from)
  const toNode = nodesDS.get(selectedNodes.value.to)
  
  if (fromNode && toNode) {
    // 填充表单
    addEdgeForm.value.from = selectedNodes.value.from
    addEdgeForm.value.to = selectedNodes.value.to
    
    // 自动生成关系类型（可选）
    const fromLabel = fromNode.group || 'Node'
    const toLabel = toNode.group || 'Node'
    addEdgeForm.value.type = `${fromLabel}_TO_${toLabel}`.toUpperCase()
    
    // 显示节点信息
    const fromName = fromNode.label || fromNode.__props?.name || '未知节点'
    const toName = toNode.label || toNode.__props?.name || '未知节点'
    
    // 打开弹窗
    addEdgeDialogVisible.value = true
    ElMessage.success(`已选择: ${fromName} → ${toName}`)
  }
}

// 获取节点名称
function getNodeName(nodeId: string) {
  const nodesDS = addEdgeTarget.value === 'main' ? mainNodesDS : subNodesDS
  if (!nodesDS) return '未知节点'
  
  const node = nodesDS.get(nodeId)
  return node?.label || node?.__props?.name || '未知节点'
}

// 取消节点选择
function cancelNodeSelection() {
  exitNodeSelectionMode()
  ElMessage.info('已取消节点选择')
}

// 重新选择节点
function reselectNodes() {
  exitNodeSelectionMode()
  addEdgeDialogVisible.value = false
  setTimeout(() => {
    showAddEdgeDialog(addEdgeTarget.value)
  }, 100)
}

// 高亮可选择的节点
function highlightSelectableNodes() {
  const nodesDS = addEdgeTarget.value === 'main' ? mainNodesDS : subNodesDS
  if (!nodesDS) return
  
  nodesDS.forEach((node: any) => {
    const updateData: any = {
      id: node.id,
      color: {
        background: '#e3f2fd',
        border: '#2196f3',
        highlight: {
          background: '#bbdefb',
          border: '#2196f3'
        }
      },
      borderWidth: 3,
      shadow: {
        enabled: true,
        color: 'rgba(33,150,243,0.3)',
        size: 15
      },
      font: {
        color: '#2B2B2B',
        size: 12,
        face: 'arial',
        multi: true
      }
    }
    nodesDS.update(updateData)
  })
}

// 高亮选中的节点
function highlightSelectedNode(nodeId: string, type: 'from' | 'to') {
  const nodesDS = addEdgeTarget.value === 'main' ? mainNodesDS : subNodesDS
  if (!nodesDS) return
  
  const color = type === 'from' ? {
    background: '#4caf50',
    border: '#2e7d32',
    highlight: {
      background: '#81c784',
      border: '#2e7d32'
    }
  } : {
    background: '#ff9800',
    border: '#ef6c00',
    highlight: {
      background: '#ffb74d',
      border: '#ef6c00'
    }
  }
  
  const updateData: any = {
    id: nodeId,
    color: color,
    borderWidth: 4,
    font: {
      color: '#000000',
      size: 14,
      face: 'arial',
      multi: true
    },
    shadow: {
      enabled: true,
      color: type === 'from' ? 'rgba(76,175,80,0.4)' : 'rgba(255,152,0,0.4)',
      size: 20
    }
  }
  
  nodesDS.update(updateData)
}

// 重置节点高亮
function resetNodeHighlight(nodeId: string) {
  const nodesDS = addEdgeTarget.value === 'main' ? mainNodesDS : subNodesDS
  if (!nodesDS) return
  
  const node = nodesDS.get(nodeId)
  if (node) {
    const updateData: any = {
      id: nodeId,
      color: {
        background: '#e3f2fd',
        border: '#2196f3',
        highlight: {
          background: '#bbdefb',
          border: '#2196f3'
        }
      },
      borderWidth: 3,
      font: {
        color: '#2B2B2B',
        size: 12,
        face: 'arial',
        multi: true
      }
    }
    nodesDS.update(updateData)
  }
}

// 重置所有节点高亮
function resetNodeHighlights() {
  const nodesDS = addEdgeTarget.value === 'main' ? mainNodesDS : subNodesDS
  if (!nodesDS) return
  
  nodesDS.forEach((node: any) => {
    const updateData: any = {
      id: node.id,
      color: undefined,
      borderWidth: 2,
      font: {
        color: '#2B2B2B',
        size: 12,
        face: 'arial',
        multi: true
      },
      shadow: {
        enabled: true,
        color: 'rgba(0,0,0,0.2)',
        size: 10,
        x: 5,
        y: 5
      }
    }
    nodesDS.update(updateData)
  })
}

/* 撤销功能 - 专门修复关系恢复问题 */
const mainOperationHistory = ref<Array<{type: string, data: any, timestamp: string}>>([])
const subOperationHistory = ref<Array<{type: string, data: any, timestamp: string}>>([])

const canUndoMain = computed(() => mainOperationHistory.value.length > 0)
const canUndoSub = computed(() => subOperationHistory.value.length > 0)

// 记录操作
function recordOperation(graphType: 'main' | 'sub', operation: {type: string, data: any}) {
  const history = graphType === 'main' ? mainOperationHistory : subOperationHistory
  
  const operationRecord = {
    ...operation,
    timestamp: new Date().toISOString(),
    id: Date.now() + Math.random().toString(36).substr(2, 9)
  }
  
  history.value.push(operationRecord)
  
  if (history.value.length > 100) {
    history.value.shift()
  }
}

// 完全重写的撤销函数 - 专门修复关系恢复
async function handleUndo(graphType: 'main' | 'sub') {
  const history = graphType === 'main' ? mainOperationHistory : subOperationHistory
  
  if (history.value.length === 0) {
    ElMessage.warning('没有可撤销的操作')
    return
  }
  
  const lastOperation = history.value.pop()
  if (!lastOperation) return
  
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE, database: 'neo4j' })
  
  try {
    let success = false
    
    switch (lastOperation.type) {
      case 'add_node':
        success = await undoAddNode(session, lastOperation.data)
        break
        
      case 'add_edge':
        success = await undoAddEdge(session, lastOperation.data)
        break
        
      case 'delete_nodes_edges':
        success = await undoDeleteNodesEdges(session, lastOperation.data, graphType)
        break
        
      default:
        ElMessage.warning('未知的操作类型')
    }
    
    if (success) {
      ElMessage.success('撤销操作成功')
      // 刷新对应的图
      if (graphType === 'main') {
        await renderMainGraph()
      } else {
        await renderSubGraph()
      }
    } else {
      throw new Error('撤销操作执行失败')
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    ElMessage.error(`撤销操作失败: ${errorMessage}`)
    history.value.push(lastOperation)
  } finally {
    await session.close()
  }
}

// 撤销添加节点
async function undoAddNode(session: any, data: any): Promise<boolean> {
  try {
    await session.run(
      `MATCH (n) WHERE elementId(n) = $nodeId DETACH DELETE n`,
      { nodeId: data.nodeId }
    )
    return true
  } catch (error) {
    return true
  }
}

// 撤销添加关系
async function undoAddEdge(session: any, data: any): Promise<boolean> {
  try {
    await session.run(
      `MATCH ()-[r]-() WHERE elementId(r) = $edgeId DELETE r`,
      { edgeId: data.edgeId }
    )
    return true
  } catch (error) {
    return true
  }
}

// 专门修复关系恢复的撤销删除函数
async function undoDeleteNodesEdges(session: any, data: any, graphType: 'main' | 'sub'): Promise<boolean> {
  const { nodes, edges } = data
  
  try {
    // 使用事务确保原子性
    const tx = session.beginTransaction()
    
    const nodeIdMap = new Map()
    let createdNodes = 0
    let createdEdges = 0
    
    // 1. 重新创建节点
    for (const node of nodes) {
      try {
        const labels = node.labels && node.labels.length > 0 
          ? node.labels.map((label: string) => `\`${label}\``).join(':') 
          : 'Node'
        
        // 清理属性
        const cleanProps = cleanProperties(node.properties)
        
        const result = await tx.run(
          `CREATE (n:${labels}) SET n = $props RETURN elementId(n) as newId`,
          { props: cleanProps }
        )
        
        if (result.records.length > 0) {
          const newId = result.records[0].get('newId')
          nodeIdMap.set(node.id, newId)
          createdNodes++
        }
      } catch (error) {
        console.error(`恢复节点失败 ${node.id}:`, error)
      }
    }
    
    // 2. 重新创建关系 - 修复版本
    for (const edge of edges) {
      try {
        // 查找对应的新节点ID
        const newFromId = nodeIdMap.get(edge.from)
        const newToId = nodeIdMap.get(edge.to)
        
        if (!newFromId || !newToId) {
          continue
        }
        
        // 清理关系属性
        const cleanProps = cleanProperties(edge.properties)
        
        // 使用更安全的关系创建方式
        const createRelQuery = `
          MATCH (a), (b) 
          WHERE elementId(a) = $fromId AND elementId(b) = $toId 
          CREATE (a)-[r:\`${edge.type}\`]->(b)
          SET r += $props
        `
        
        await tx.run(createRelQuery, {
          fromId: newFromId,
          toId: newToId,
          props: cleanProps
        })
        
        createdEdges++
      } catch (edgeError) {
        console.error(`恢复关系失败 ${edge.type}:`, edgeError)
      }
    }
    
    // 提交事务
    await tx.commit()
    
    return createdNodes > 0 || createdEdges > 0
    
  } catch (transactionError) {
    console.error('事务执行失败:', transactionError)
    return false
  }
}

/* 搜索功能 */
const mainSearchKeyword = ref('')
const subSearchKeyword = ref('')

function handleMainSearch() {
  performSearch('main', mainSearchKeyword.value)
}

function handleSubSearch() {
  performSearch('sub', subSearchKeyword.value)
}

function clearMainSearch() {
  mainSearchKeyword.value = ''
  resetSearchHighlight('main')
}

function clearSubSearch() {
  subSearchKeyword.value = ''
  resetSearchHighlight('sub')
}

function performSearch(graphType: 'main' | 'sub', keyword: string) {
  if (!keyword.trim()) {
    resetSearchHighlight(graphType)
    return
  }

  const network = graphType === 'main' ? mainNetwork : subNetwork
  const nodesDS = graphType === 'main' ? mainNodesDS : subNodesDS
  const edgesDS = graphType === 'main' ? mainEdgesDS : subEdgesDS

  if (!network || !nodesDS || !edgesDS) return

  resetSearchHighlight(graphType)

  const lowerKeyword = keyword.toLowerCase()
  const matchedNodeIds: string[] = []
  const matchedEdgeIds: string[] = []

  // 搜索节点
  nodesDS.forEach((node: any) => {
    const label = node.label || ''
    const name = node.__props?.name || ''
    const tag = node.__props?.tag || ''
    
    if (label.toLowerCase().includes(lowerKeyword) || 
        name.toLowerCase().includes(lowerKeyword) || 
        tag.toLowerCase().includes(lowerKeyword)) {
      matchedNodeIds.push(node.id)
    }
  })

  // 搜索边
  edgesDS.forEach((edge: any) => {
    const label = edge.label || ''
    const name = edge.__props?.name || ''
    const tag = edge.__props?.tag || ''
    
    if (label.toLowerCase().includes(lowerKeyword) || 
        name.toLowerCase().includes(lowerKeyword) || 
        tag.toLowerCase().includes(lowerKeyword)) {
      matchedEdgeIds.push(edge.id)
    }
  })

  // 高亮匹配的节点
  matchedNodeIds.forEach(nodeId => {
    const updateData: any = {
      id: nodeId,
      color: {
        background: '#ffeb3b',
        border: '#ff9800',
        highlight: {
          background: '#ffeb3b',
          border: '#ff9800'
        }
      },
      font: {
        color: '#000000',
        size: 14,
        face: 'arial',
        multi: true
      }
    }
    nodesDS.update(updateData)
  })

  // 高亮匹配的边
  matchedEdgeIds.forEach(edgeId => {
    const updateData: any = {
      id: edgeId,
      color: {
        color: '#ff5722',
        highlight: '#ff5722'
      },
      width: 3,
      font: {
        color: '#ff5722',
        size: 12
      }
    }
    edgesDS.update(updateData)
  })

  if (matchedNodeIds.length > 0) {
    network.fit({
      nodes: matchedNodeIds,
      animation: true
    })
  } else if (matchedEdgeIds.length > 0) {
    const connectedNodes = new Set<string>()
    edgesDS.forEach((edge: any) => {
      if (matchedEdgeIds.includes(edge.id)) {
        connectedNodes.add(edge.from)
        connectedNodes.add(edge.to)
      }
    })
    network.fit({
      nodes: Array.from(connectedNodes),
      animation: true
    })
  }
}

function resetSearchHighlight(graphType: 'main' | 'sub') {
  const nodesDS = graphType === 'main' ? mainNodesDS : subNodesDS
  const edgesDS = graphType === 'main' ? mainEdgesDS : subEdgesDS

  if (nodesDS) {
    nodesDS.forEach((node: any) => {
      const updateData: any = {
        id: node.id,
        color: undefined,
        font: {
          color: '#2B2B2B',
          size: 12,
          face: 'arial',
          multi: true
        }
      }
      nodesDS.update(updateData)
    })
  }

  if (edgesDS) {
    edgesDS.forEach((edge: any) => {
      const updateData: any = {
        id: edge.id,
        color: undefined,
        width: 1,
        font: {
          color: '#848484',
          size: 10
        }
      }
      edgesDS.update(updateData)
    })
  }
}

/* 添加节点功能 */
const addNodeDialogVisible = ref(false)
const addNodeTarget = ref<'main' | 'sub'>('main')
const addNodeForm = ref({
  name: '',
  label: '',
  type: '',
  details: ''
})
const addingNode = ref(false)

function showAddNodeDialog(target: 'main' | 'sub') {
  addNodeTarget.value = target
  addNodeForm.value = { name: '', label: '', type: '', details: '' }
  addNodeDialogVisible.value = true
}

async function confirmAddNode() {
  if (!addNodeForm.value.name.trim()) {
    ElMessage.warning('请输入节点名称')
    return
  }

  addingNode.value = true
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE, database: 'neo4j' })
  
  try {
    const label = addNodeForm.value.type || 'Node'
    const properties = {
      name: addNodeForm.value.name,
      label: addNodeForm.value.label || addNodeForm.value.name,
      details: addNodeForm.value.details || '',
      created: new Date().toISOString()
    }

    const result = await session.run(
      `CREATE (n:${label}) SET n = $props RETURN n`,
      { props: properties }
    )

    const createdNode = result.records[0]?.get('n')
    if (createdNode) {
      recordOperation(addNodeTarget.value, {
        type: 'add_node',
        data: { nodeId: createdNode.elementId }
      })

      // 立即将新节点添加到图中
      const visNode = createVisNode(createdNode)
      if (addNodeTarget.value === 'main' && mainNodesDS) {
        mainNodesDS.add(visNode)
      } else if (addNodeTarget.value === 'sub' && subNodesDS) {
        subNodesDS.add(visNode)
      }
    }

    ElMessage.success('节点添加成功')
    addNodeDialogVisible.value = false

    // 同时刷新图以确保数据一致性
    if (addNodeTarget.value === 'main') {
      await renderMainGraph()
    } else {
      await renderSubGraph()
    }
  } catch (error) {
    console.error('添加节点失败:', error)
    ElMessage.error('添加节点失败')
  } finally {
    await session.close()
    addingNode.value = false
  }
}

/* 添加关系功能 */
const addEdgeDialogVisible = ref(false)
const addEdgeTarget = ref<'main' | 'sub'>('main')
const addEdgeForm = ref({
  from: '',
  to: '',
  type: '',
  description: ''
})
const addingEdge = ref(false)

const availableNodes = computed(() => {
  const nodesDS = addEdgeTarget.value === 'main' ? mainNodesDS : subNodesDS
  if (!nodesDS) return []
  
  const nodes: Array<{ id: string; label: string }> = []
  nodesDS.forEach((node: any) => {
    nodes.push({
      id: node.id,
      label: node.label || node.__props?.name || '未命名节点'
    })
  })
  return nodes
})

// 修改确认添加关系的函数
async function confirmAddEdge() {
  if (!addEdgeForm.value.from || !addEdgeForm.value.to) {
    ElMessage.warning('请选择起始节点和目标节点')
    return
  }

  if (!addEdgeForm.value.type.trim()) {
    ElMessage.warning('请输入关系类型')
    return
  }

  addingEdge.value = true
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE, database: 'neo4j' })
  
  try {
    const properties = {
      description: addEdgeForm.value.description || '',
      created: new Date().toISOString()
    }

    const result = await session.run(
      `MATCH (a), (b) 
       WHERE elementId(a) = $fromId AND elementId(b) = $toId 
       CREATE (a)-[r:${addEdgeForm.value.type.toUpperCase()} $props]->(b) 
       RETURN r`,
      { 
        fromId: addEdgeForm.value.from,
        toId: addEdgeForm.value.to,
        props: properties
      }
    )

    const createdEdge = result.records[0]?.get('r')
    if (createdEdge) {
      recordOperation(addEdgeTarget.value, {
        type: 'add_edge',
        data: { edgeId: createdEdge.elementId }
      })

      // 立即将新关系添加到图中
      const visEdge = createVisEdge(createdEdge, addEdgeForm.value.from, addEdgeForm.value.to)
      if (addEdgeTarget.value === 'main' && mainEdgesDS) {
        mainEdgesDS.add(visEdge)
      } else if (addEdgeTarget.value === 'sub' && subEdgesDS) {
        subEdgesDS.add(visEdge)
      }
    }

    ElMessage.success('关系添加成功')
    addEdgeDialogVisible.value = false
    exitNodeSelectionMode() // 在成功后退出选择模式

    // 同时刷新图以确保数据一致性
    if (addEdgeTarget.value === 'main') {
      await renderMainGraph()
    } else {
      await renderSubGraph()
    }
  } catch (error) {
    console.error('添加关系失败:', error)
    ElMessage.error('添加关系失败')
  } finally {
    await session.close()
    addingEdge.value = false
  }
}

/* 删除功能 - 修复版本 */
async function handleDeleteSelected(target: 'main' | 'sub') {
  const network = target === 'main' ? mainNetwork : subNetwork
  if (!network) return

  const selectedNodes = network.getSelectedNodes()
  const selectedEdges = network.getSelectedEdges()

  if (selectedNodes.length === 0 && selectedEdges.length === 0) {
    ElMessage.warning('请先选择要删除的节点或关系')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedNodes.length} 个节点和 ${selectedEdges.length} 个关系吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const session = driver.session({ defaultAccessMode: neo4j.session.WRITE, database: 'neo4j' })
    
    try {
      // 将选中的ID转换为字符串类型
      const nodeIds = selectedNodes.map(id => String(id))
      const edgeIds = selectedEdges.map(id => String(id))
      
      // 收集被删除元素的完整信息
      const deletedData = await collectDeletedElements(session, nodeIds, edgeIds)
      
      if (deletedData.nodes.length === 0 && deletedData.edges.length === 0) {
        ElMessage.warning('未找到要删除的元素')
        return
      }

      // 执行删除
      await executeDeleteOperation(session, nodeIds, edgeIds)

      // 记录删除操作
      recordOperation(target, {
        type: 'delete_nodes_edges',
        data: deletedData
      })

      ElMessage.success(`删除成功: ${selectedNodes.length}个节点, ${selectedEdges.length}个关系`)
      
      // 刷新对应的图
      if (target === 'main') {
        await renderMainGraph()
      } else {
        await renderSubGraph()
      }
    } finally {
      await session.close()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 收集被删除元素的完整信息
async function collectDeletedElements(session: any, nodeIds: string[], edgeIds: string[]) {
  const nodes = []
  const edges = []
  
  // 收集节点信息
  for (const nodeId of nodeIds) {
    try {
      const result = await session.run(
        `MATCH (n) WHERE elementId(n) = $id 
         RETURN n, labels(n) as labels, properties(n) as properties`,
        { id: nodeId }
      )
      
      if (result.records.length > 0) {
        const record = result.records[0]
        const node = record.get('n')
        const labels = record.get('labels')
        const properties = record.get('properties')
        
        nodes.push({
          id: nodeId,
          labels: labels || [],
          properties: cleanProperties(properties),
          elementId: nodeId
        })
      }
    } catch (error) {
      console.error(`收集节点信息失败 ${nodeId}:`, error)
    }
  }
  
  // 收集关系信息 - 修复版本，确保正确获取关系信息
  for (const edgeId of edgeIds) {
    try {
      const result = await session.run(
        `MATCH ()-[r]-() WHERE elementId(r) = $id 
         RETURN r, type(r) as type, 
                elementId(startNode(r)) as from, 
                elementId(endNode(r)) as to, 
                properties(r) as properties`,
        { id: edgeId }
      )
      
      if (result.records.length > 0) {
        const record = result.records[0]
        const edge = record.get('r')
        const type = record.get('type')
        const from = record.get('from')
        const to = record.get('to')
        const properties = record.get('properties')
        
        edges.push({
          id: edgeId,
          type: type,
          from: from,
          to: to,
          properties: cleanProperties(properties),
          elementId: edgeId
        })
      }
    } catch (error) {
      console.error(`收集关系信息失败 ${edgeId}:`, error)
    }
  }
  
  return { nodes, edges }
}

// 清理属性，移除系统属性
function cleanProperties(properties: any) {
  const cleanProps = { ...properties }
  delete cleanProps.id
  delete cleanProps.elementId
  delete cleanProps._id
  return cleanProps
}

// 执行删除操作
async function executeDeleteOperation(session: any, nodeIds: string[], edgeIds: string[]) {
  // 先删除关系
  for (const edgeId of edgeIds) {
    await session.run(
      `MATCH ()-[r]-() WHERE elementId(r) = $id DELETE r`,
      { id: edgeId }
    )
  }
  
  // 再删除节点
  for (const nodeId of nodeIds) {
    await session.run(
      `MATCH (n) WHERE elementId(n) = $id DETACH DELETE n`,
      { id: nodeId }
    )
  }
}

/* 左侧切换栏：子图1/子图2… */
type SubNav = { 
  id: string; 
  title: string;
  description?: string;
}
const subNavItems = ref<SubNav[]>(
  Array.from({ length: 13 }, (_, i) => ({ 
    id: String(i + 1), 
    title: `子图${i + 1}`,
    description: `这是子图${i + 1}的描述信息`
  }))
)
const activeSubNav = ref(0)

// 子图操作相关状态
const renameDialogVisible = ref(false)
const contentEditDialogVisible = ref(false)
const currentEditSubgraph = ref<{item: SubNav, index: number} | null>(null)

const renameForm = ref({
  title: ''
})

const contentEditForm = ref({
  title: '',
  description: ''
})

function selectSubNav(i: number) {
  activeSubNav.value = i
}

// 处理子图命令
function handleSubgraphCommand(command: string, item: SubNav, index: number) {
  currentEditSubgraph.value = { item, index }
  
  switch (command) {
    case 'rename':
      renameForm.value.title = item.title
      renameDialogVisible.value = true
      break
    case 'editContent':
      contentEditForm.value = {
        title: item.title,
        description: item.description || ''
      }
      contentEditDialogVisible.value = true
      break
    case 'delete':
      handleDeleteSubgraph(item, index)
      break
  }
}

// 确认重命名
function confirmRename() {
  if (!currentEditSubgraph.value) return
  
  const { index } = currentEditSubgraph.value
  if (renameForm.value.title.trim()) {
    subNavItems.value[index].title = renameForm.value.title.trim()
    ElMessage.success('子图重命名成功')
    renameDialogVisible.value = false
  } else {
    ElMessage.warning('请输入子图名称')
  }
}

// 确认内容编辑
function confirmContentEdit() {
  if (!currentEditSubgraph.value) return
  
  const { index } = currentEditSubgraph.value
  subNavItems.value[index] = {
    ...subNavItems.value[index],
    ...contentEditForm.value
  }
  ElMessage.success('子图内容修改成功')
  contentEditDialogVisible.value = false
}

// 删除子图
async function handleDeleteSubgraph(item: SubNav, index: number) {
  try {
    await ElMessageBox.confirm(
      `确定要删除子图"${item.title}"吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    if (index === activeSubNav.value) {
      activeSubNav.value = 0
    }
    
    subNavItems.value.splice(index, 1)
    ElMessage.success('子图删除成功')
  } catch {
    // 用户取消删除
  }
}

/* 编辑态 */
type EditKind = 'node' | 'edge'
type EditForm = { id: string; name: string; tag: string; detail: string }
const editVisible = ref(false)
const editKind = ref<EditKind>('node')
const editForm = ref<EditForm>({ id: '', name: '', tag: '', detail: '' })
const saving = ref(false)

// 添加双击计时器
const clickTimer = ref<NodeJS.Timeout | null>(null)
const lastClickedId = ref<string | null>(null)

function openEditor(payload: { kind: EditKind; id: string; name?: string; tag?: string; detail?: string }) {
  editKind.value = payload.kind
  editForm.value = { id: payload.id, name: payload.name || '', tag: payload.tag || '', detail: payload.detail || '' }
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
    await renderMainGraph(); await renderSubGraph()
  } finally { await session.close(); saving.value = false }
}

/* 上传/预览 */
type PreviewItem = { uid: string | number; url: string; name: string }
const fileList = ref<UploadUserFile[]>([])

const thumbnailPreviews = ref<PreviewItem[]>([
  { uid: 1, url: 'https://via.placeholder.com/200x150/4A90E2/FFFFFF?text=子流程图1', name: '子流程图1' },
  { uid: 2, url: 'https://via.placeholder.com/200x150/50C878/FFFFFF?text=子流程图2', name: '子流程图2' },
  { uid: 3, url: 'https://via.placeholder.com/200x150/F94C57/FFFFFF?text=子流程图3', name: '子流程图3' },
  { uid: 4, url: 'https://via.placeholder.com/200x150/FFA500/FFFFFF?text=子流程图4', name: '子流程图4' },
  { uid: 5, url: 'https://via.placeholder.com/200x150/9B59B6/FFFFFF?text=子流程图5', name: '子流程图5' }
])

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
  const extIsImage = /(\.png|\.jpe?g|\.gif|\.webp|\.bmp|\.svg)$/i.test(name)
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
  return mt.startsWith('text/') || /(\.txt|\.md|\.json|\.csv|\.tsv|\.log|\.xml|\.html?|\.js|\.ts|\.css|\.yaml|\.yml)$/i.test(name)
}
function formatSize(bytes?: number) {
  if (bytes === undefined) return ''
  const units = ['B','KB','MB','GB']
  let i=0,n=bytes
  while(n>=1024 && i<units.length-1){n/=1024;i++}
  return `${n.toFixed(n<10 && i>0 ? 1:0)} ${units[i]}`
}
function handleChange(_file: UploadFile, files: UploadFile[]) {
  files.forEach(ensureUid)
  fileList.value = files as unknown as UploadUserFile[]
}
function removeFileByUid(uid: string | number) {
  const i=fileList.value.findIndex(f=>String(f.uid)===String(uid))
  if(i===-1) return
  const [removed]=fileList.value.splice(i,1)
  if(previewVisible.value && previewTitle.value === (removed.name||'未命名')){ previewVisible.value=false; onPreviewClosed() }
}
function clearAllFiles(){
  fileList.value=[]
  if(previewVisible.value){ previewVisible.value=false; onPreviewClosed() }
}

// 刷新缩略图
function refreshThumbnails() {
  ElMessage.info('正在刷新子流程图...')
  setTimeout(() => {
    ElMessage.success('子流程图已刷新')
  }, 1000)
}

// 打开缩略图预览
function openThumbnailPreview(item: PreviewItem) {
  previewTitle.value = item.name
  previewType.value = 'image'
  previewUrl.value = item.url
  previewVisible.value = true
}

/* 预览弹窗 */
const previewVisible = ref(false)
const previewTitle = ref('')
const previewType = ref<'image'|'pdf'|'text'|'other'>('other')
const previewUrl = ref<string>('')
const previewText = ref<string>('')
const previewLoading = ref(false)

function openPreviewByUid(uid: string | number) {
  const f = fileList.value.find(ff => String(ff.uid) === String(uid))
  if (f) openPreviewFile(f)
}
async function openPreviewFile(f: UploadFile | UploadUserFile) {
  const raw = getRawFile(f); const name = f.name || '未命名'
  previewTitle.value = name; previewLoading.value = true; previewText.value = ''
  if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value = '' }
  try {
    if (!raw) {
      const direct = (f as any).url as string | undefined
      previewUrl.value = direct || ''
      previewType.value = isPdfFile(f) ? 'pdf' : (isImageFile(f) ? 'image' : 'other')
    } else if (isImageFile(f)) {
      previewType.value = 'image'; previewUrl.value = URL.createObjectURL(raw)
    } else if (isPdfFile(f)) {
      previewType.value = 'pdf'; previewUrl.value = URL.createObjectURL(raw)
    } else if (isTextLike(f)) {
      previewType.value = 'text'; previewText.value = await readFileText(raw)
    } else {
      previewType.value = 'other'; previewUrl.value = URL.createObjectURL(raw)
    }
    previewVisible.value = true
  } finally { previewLoading.value = false }
}
function onPreviewClosed(){ if(previewUrl.value){ URL.revokeObjectURL(previewUrl.value); previewUrl.value='' } previewText.value='' }
function readFileText(file: File){ return new Promise<string>((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(String(reader.result||'')); reader.onerror=e=>reject(e); reader.readAsText(file,'utf-8') }) }

/* 图谱 / Neo4j 查询 */
const presetOptions = [ { value: 'global', label: '主图一' }, { value: 'personMovie', label: '主图二' } ]
const mainPreset = ref<string>('global')
const subPreset  = ref<string>('global')

function cypherOf(preset: string){
  switch (preset) {
    case 'personMovie': 
      return `MATCH (n:Person)-[r:ACTED_IN]->(m:Movie) RETURN n,r,m LIMIT 300`
    case 'global':
    default: 
      return `MATCH (n) 
              OPTIONAL MATCH (n)-[r]->(m) 
              RETURN n, r, m 
              LIMIT 500`
  }
}

// 改进节点和边的创建函数
function createVisNode(node: any) {
  const label = node.properties?.name || node.properties?.title || (node.labels?.[0] ?? 'Node')
  const truncatedLabel = truncateLabel(label)

  return {
    id: node.elementId,
    label: truncatedLabel,
    group: node.labels?.[0] ?? 'Node',
    shape: 'circle',
    size: 35, // 统一节点大小
    font: {
      multi: true,
      size: 11,
      face: 'arial',
      align: 'center'
    },
    widthConstraint: {
      minimum: 70,
      maximum: 70
    },
    heightConstraint: {
      minimum: 70,
      maximum: 70
    },
    margin: {
      top: 10,
      bottom: 10,
      left: 10,
      right: 10
    },
    __props: { ...node.properties }
  }
}

function createVisEdge(edge: any, from: string, to: string) {
  return {
    id: edge.elementId,
    from: from,
    to: to,
    label: edge.type,
    __props: { ...edge.properties }
  }
}

// 改进节点标签显示逻辑
function truncateLabel(label: string): string {
  // 移除多余空格并分割字符
  const cleanLabel = label.replace(/\s+/g, '')
  const chars = cleanLabel.split('')
  
  // 一行最多5个字，最多显示两行（共10个字）
  if (chars.length <= 5) {
    return chars.join('')
  } else if (chars.length <= 10) {
    const firstLine = chars.slice(0, 5).join('')
    const secondLine = chars.slice(5, 10).join('')
    return firstLine + '\n' + secondLine
  } else {
    const firstLine = chars.slice(0, 5).join('')
    const secondLine = chars.slice(5, 9).join('') + '…' // 第二行显示4个字+省略号
    return firstLine + '\n' + secondLine
  }
}
function recordsToVis(records: any[]) {
  const nodes: any[] = [];
  const edges: any[] = [];
  const seen = new Set<string>();

  for (const rec of records) {
    const n = rec.get('n'), m = rec.get('m'), r = rec.get('r')

    if (n && !seen.has(n.elementId)) {
      nodes.push(createVisNode(n))
      seen.add(n.elementId)
    }
    if (m && !seen.has(m.elementId)) {
      nodes.push(createVisNode(m))
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

const mainContainer = ref<HTMLDivElement | null>(null)
const subContainer  = ref<HTMLDivElement | null>(null)
let mainNetwork: Network | null = null
let subNetwork:  Network | null = null
let mainNodesDS: DataSet<any> | null = null
let mainEdgesDS: DataSet<any> | null = null
let subNodesDS:  DataSet<any> | null = null
let subEdgesDS:  DataSet<any> | null = null

const driver = neo4j.driver(
  import.meta.env.VITE_NEO4J_URI || 'neo4j://127.0.0.1:7687',
  neo4j.auth.basic(
    import.meta.env.VITE_NEO4J_USER || 'neo4j',
    import.meta.env.VITE_NEO4J_PASSWORD || 'password'
  )
)

/* 滚轮缩放：点击画布后开启 */
// 最终改进的布局配置
const visOptions: any = { 
  interaction: { 
    hover: true, 
    tooltipDelay: 120, 
    dragView: true, 
    zoomView: false,
    dragNodes: true,
    selectable: true,
    selectConnectedEdges: true,
    multiselect: true
  }, 
  physics: {
    enabled: true,
    stabilization: {
      iterations: 100,
      updateInterval: 10
    },
    solver: 'forceAtlas2Based',
    forceAtlas2Based: {
      gravitationalConstant: -80,
      centralGravity: 0.01,
      springLength: 100, // 稍微减小弹簧长度
      springConstant: 0.06,
      damping: 0.4,
      avoidOverlap: 0.9 // 增加避免重叠
    }
  },
  edges: { 
    arrows: 'to',
    smooth: {
      enabled: true,
      type: 'continuous',
      roundness: 0.5
    },
    color: {
      color: '#848484',
      highlight: '#ff5722',
      hover: '#ff5722'
    },
    width: 1,
    hoverWidth: 2
  },
  nodes: {
    shape: 'circle',
    size: 35, // 统一大小
    font: {
      multi: true,
      size: 11, // 稍微减小字体大小
      face: 'arial',
      align: 'center',
      color: '#2B2B2B'
    },
    widthConstraint: {
      minimum: 70,
      maximum: 70
    },
    heightConstraint: {
      minimum: 70,
      maximum: 70
    },
    margin: {
      top: 10,
      bottom: 10,
      left: 10,
      right: 10
    },
    borderWidth: 2,
    borderWidthSelected: 4,
    color: {
      border: '#2B7CE9',
      background: '#97C2FC',
      highlight: {
        border: '#2B7CE9',
        background: '#D2E5FF'
      },
      hover: {
        border: '#2B7CE9',
        background: '#D2E5FF'
      }
    },
    shadow: {
      enabled: true,
      color: 'rgba(0,0,0,0.2)',
      size: 10,
      x: 5,
      y: 5
    }
  }
}
const mainZoomOn = ref(false)
const subZoomOn  = ref(false)
function setWheelZoom(which: 'main' | 'sub' | null){
  mainZoomOn.value = which === 'main'
  subZoomOn.value  = which === 'sub'
  if (mainNetwork) mainNetwork.setOptions({ interaction: { zoomView: mainZoomOn.value } })
  if (subNetwork)  subNetwork.setOptions({ interaction: { zoomView: subZoomOn.value } })
}
const globalMouseDownHandler = (e: MouseEvent) => {
  const target = e.target as Node | null
  if (mainContainer.value?.contains(target as Node)) return
  if (subContainer.value?.contains(target as Node)) return
  setWheelZoom(null)
}
onMounted(() => { window.addEventListener('mousedown', globalMouseDownHandler) })

// 改进编辑点击逻辑
function bindEditOnClick(net: Network | null, nodesDS: DataSet<any> | null, edgesDS: DataSet<any> | null){
  if(!net) return; 
  
  net.off('click'); 
  
  net.on('click', (params: any) => {
    const currentId = params.nodes && params.nodes.length ? 
      String(params.nodes[0]) : 
      (params.edges && params.edges.length ? String(params.edges[0]) : null);
    
    if (!currentId) {
      if (clickTimer.value) {
        clearTimeout(clickTimer.value);
        clickTimer.value = null;
      }
      lastClickedId.value = null;
      return;
    }
    
    if (clickTimer.value && lastClickedId.value === currentId) {
      clearTimeout(clickTimer.value);
      clickTimer.value = null;
      lastClickedId.value = null;
      
      if (params.nodes && params.nodes.length && nodesDS) {
        const id = String(params.nodes[0]); 
        const n = nodesDS.get(id) as any | null;
        if (n) { 
          openEditor({ 
            kind: 'node', 
            id, 
            name: (n.__props?.name ?? n.label) || '', 
            tag: n.__props?.tag || '', 
            detail: n.__props?.detail || '' 
          }); 
        }
      } else if (params.edges && params.edges.length && edgesDS) {
        const id = String(params.edges[0]); 
        const e = edgesDS.get(id) as any | null;
        if (e) { 
          openEditor({ 
            kind: 'edge', 
            id, 
            name: e.__props?.name || (e.label || ''), 
            tag: e.__props?.tag || '', 
            detail: e.__props?.detail || '' 
          }); 
        }
      }
    } else {
      if (clickTimer.value) {
        clearTimeout(clickTimer.value);
      }
      lastClickedId.value = currentId;
      clickTimer.value = setTimeout(() => {
        clickTimer.value = null;
        lastClickedId.value = null;
      }, 300);
    }
  });
}

// 改进图渲染函数
async function renderMainGraph(){
  if(!mainContainer.value) return
  mainNetwork?.destroy()
  mainContainer.value.innerHTML=''
  const session=driver.session({ defaultAccessMode: neo4j.session.READ, database:'neo4j' })
  try{
    const res=await session.run(cypherOf(mainPreset.value))
    const {nodes,edges}=recordsToVis(res.records)
    mainNodesDS=new DataSet(nodes)
    mainEdgesDS=new DataSet(edges)
    mainNetwork=new Network(mainContainer.value,{nodes:mainNodesDS,edges:mainEdgesDS},visOptions)
    bindEditOnClick(mainNetwork,mainNodesDS,mainEdgesDS)
    mainContainer.value?.addEventListener('mousedown', (e)=>{ e.stopPropagation(); setWheelZoom('main') })
    setTimeout(()=>mainNetwork?.fit({animation:true}),0)
  } finally { await session.close() }
}

async function renderSubGraph(){
  if(!subContainer.value) return
  subNetwork?.destroy()
  subContainer.value.innerHTML=''
  const session=driver.session({ defaultAccessMode: neo4j.session.READ, database:'neo4j' })
  try{
    const res=await session.run(cypherOf(subPreset.value))
    const {nodes,edges}=recordsToVis(res.records)
    subNodesDS=new DataSet(nodes)
    subEdgesDS=new DataSet(edges)
    subNetwork=new Network(subContainer.value,{nodes:subNodesDS,edges:subEdgesDS},visOptions)
    bindEditOnClick(subNetwork,subNodesDS,subEdgesDS)
    subContainer.value?.addEventListener('mousedown', (e)=>{ e.stopPropagation(); setWheelZoom('sub') })
    setTimeout(()=>subNetwork?.fit({animation:true}),0)
  } finally { await session.close() }
}

watch(showWorkspace, async (v)=>{ if(v){ await nextTick(); await renderMainGraph(); await renderSubGraph() } })

onBeforeUnmount(async () => {
  try { 
    window.removeEventListener('mousedown', globalMouseDownHandler) 
    if (clickTimer.value) {
      clearTimeout(clickTimer.value);
    }
    exitNodeSelectionMode()
  } catch {}
  if(previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  mainNetwork?.destroy(); subNetwork?.destroy()
  mainNodesDS?.clear(); mainEdgesDS?.clear()
  subNodesDS?.clear(); subEdgesDS?.clear()
  try{ await driver.close() } catch{}
})

// 计算侧边栏样式
const sidebarStyle = computed(() => {
  return {
    'grid-template-columns': sidebarCollapsed.value ? '1fr' : '240px 1fr'
  }
})

// 计算右侧内容列样式
const subContentColStyle = computed(() => {
  if (showRecommendation.value) {
    return {
      'grid-template-rows': '300px 350px'
    }
  } else {
    return {
      'grid-template-rows': '1fr 40px'
    }
  }
})
</script>

<style scoped>
/* 样式部分 */
.graph-builder-page{display:flex;flex-direction:column;gap:16px;padding:16px;background:#E0E4EC;}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.04);overflow:hidden;}
.card-header{font-size:14px;font-weight:600;padding:10px 12px;border-bottom:1px solid #e5e7eb;background:#fafafa;display:flex;justify-content:space-between;align-items:center;}
.card-body{height:100%;padding:10px;box-sizing:border-box;}

.upload-card .card-body{display:flex;flex-direction:column;gap:12px;}
.filelist-wrap{border-top:1px dashed #e5e7eb;padding-top:8px;}
.filelist-header{display:flex;justify-content:space-between;align-items:center;font-weight:600;color:#334155;margin-bottom:6px;}
.filelist{list-style:none;margin:0;padding:6px 0;display:flex;flex-direction:column;gap:6px;}
.fileitem{display:flex;align-items:center;justify-content:space-between;padding:8px 2px;border-bottom:1px dashed #e5e7eb;}
.fileitem:last-child{border-bottom:none;}
.filemeta{display:flex;align-items:center;gap:8px;min-width:0;}
.fileicon{color:#64748b;}
.filename{font-size:13px;color:#334155;max-width:48vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.filesize{font-size:12px;color:#94a3b8;margin-left:6px;}
.fileops{display:flex;align-items:center;gap:8px;}

.preview-section {border-top:1px dashed #e5e7eb;padding-top:12px;margin-top:8px;}
.preview-header {display:flex;justify-content:space-between;align-items:center;font-weight:600;color:#334155;margin-bottom:8px;padding:0 4px;}
.preview-body {max-height:240px;overflow:auto;}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;}
.thumb{border:1px solid #e5e7eb;background:#fff;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;cursor:pointer;}
.thumb:hover{box-shadow:0 0 0 2px rgba(59,130,246,.2) inset;}
.thumb-img{width:100%;height:120px;object-fit:cover;display:block;background:#f3f4f6;}
.thumb-name{font-size:12px;padding:8px;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

/* 节点选择覆盖层 */
.node-selection-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.selection-status-bar {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.status-content {
  flex: 1;
}

.selection-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selection-steps {
  display: flex;
  gap: 20px;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #f5f7fa;
  transition: all 0.3s ease;
}

.step.active {
  background: #ecf5ff;
  border: 1px solid #409eff;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #c0c4cc;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.step.active .step-number {
  background: #409eff;
}

.step-text {
  font-size: 14px;
  color: #606266;
}

.step.active .step-text {
  color: #409eff;
  font-weight: 500;
}

.node-info {
  font-weight: 600;
  color: #303133;
}

.placeholder {
  color: #909399;
  font-style: italic;
}

.instructions {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.selection-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

/* 弹窗内的样式 */
.selected-nodes-info {
  margin-bottom: 16px;
}

.node-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.node-tag {
  font-size: 14px;
  padding: 4px 12px;
}

.no-selection {
  color: #c0c4cc;
  font-style: italic;
}

.main-panel {display:flex;flex-direction:column;height:100%;}
.panel-wrap{display:flex;flex-direction:column;}
.panel-title{padding:8px 10px;font-weight:600;border-bottom:1px solid #e5e7eb;background:#fafafa;display:flex;align-items:center;justify-content:space-between;gap:10px;}
.main-graph-box {position:relative;margin:12px;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,.05);overflow:hidden;background:#fff;display:flex;height:650px;}
.graph-box{position:relative;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,.05);overflow:hidden;background:#fff;display:flex;}
.graph-canvas{width:100%;height:100%;min-height:300px;}
.overlay-controls {position:absolute;top:10px;left:10px;z-index:10;pointer-events:auto;display:flex;gap:10px;align-items:center;}
.search-box {background:rgba(255,255,255,0.9);border-radius:6px;padding:2px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
.sub-search-box {position:absolute;top:10px;right:10px;z-index:10;background:rgba(255,255,255,0.9);border-radius:6px;padding:2px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
.select-compact{height:32px;}
:deep(.select-compact .el-select-v2__wrapper){height:32px;}
.graph-actions {display:flex;gap:8px;align-items:center;}
.graph-actions .el-button {display:flex;align-items:center;gap:4px;}
.sub-layout{display:grid;column-gap:12px;align-items:start;transition:grid-template-columns 0.3s ease;height:650px;overflow-x:hidden;}
.sub-sidebar{height:100%;background:#f5f7fb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;transition:all 0.3s ease;}
.sidebar-header {display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #e5e7eb;background:#f9fafb;min-height:48px;box-sizing:border-box;flex-shrink:0;}
.sidebar-title {font-weight:600;color:#374151;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sidebar-toggle-btn {padding:6px;transition:all 0.3s ease;color:#6b7280;}
.sidebar-toggle-btn:hover {color:#374151;background:#e5e7eb;}
.chevron {transition:transform 0.3s ease;}
.chevron.rotate-180 {transform:rotate(180deg);}
.sidebar-content {flex:1;overflow:hidden;display:flex;flex-direction:column;}
.nav-list{list-style:none;margin:0;padding:8px;display:flex;flex-direction:column;gap:6px;flex:1;overflow-y:auto;overflow-x:hidden;}
.nav-list::-webkit-scrollbar {width:6px;}
.nav-list::-webkit-scrollbar-track {background:#f1f1f1;border-radius:3px;}
.nav-list::-webkit-scrollbar-thumb {background:#c1c1c1;border-radius:3px;}
.nav-list::-webkit-scrollbar-thumb:hover {background:#a8a8a8;}
.nav-item{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:10px;cursor:pointer;color:#1f2937;transition:background .15s ease,color .15s ease;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;max-width:100%;box-sizing:border-box;}
.nav-item:hover{background:#eef2ff;color:#111827;}
.nav-item.active{background:#e8ecff;color:#111827;}
.nav-item-content {flex:1;min-width:0;overflow:hidden;}
.nav-item-actions {opacity:0;transition:opacity 0.2s ease;}
.nav-item:hover .nav-item-actions {opacity:1;}
.action-btn {padding:4px;height:auto;}
:deep(.action-btn) {padding:4px;}
:deep(.el-dropdown-menu__item) {display:flex;align-items:center;gap:8px;}
.sub-content-col{display:grid;grid-template-rows:300px 350px;gap:10px;width:100%;align-items:stretch;height:100%;overflow-x:hidden;overflow-y:hidden;transition:grid-template-rows 0.3s ease;}
.sub-content-col > *{min-width:0;}
.subcard{width:100%;border:1px solid #e5e7eb;border-radius:10px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.05);overflow:hidden;display:flex;flex-direction:column;overflow-x:hidden;position:relative;}
.subcard-body{padding:10px;flex:1;display:flex;flex-direction:column;overflow-x:hidden;}
.subgraph-fixed{height:100%;overflow:hidden;flex:1;position:relative;}
.subcard-head{height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-bottom:1px solid #eef2f7;background:#fafafa;flex-shrink:0;cursor:pointer;transition:background-color 0.2s ease;}
.subcard-head:hover {background:#f0f2f5;}
.subcard-head .title{font-weight:600;color:#334155;}
.rec-card{display:flex;flex-direction:column;flex:1;}
.rec-body{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.recommendation-content {flex:1;overflow-y:visible;overflow-x:hidden;padding:0 4px;}
.scrollbar-demo-item{display:flex;align-items:center;justify-content:center;height:80px;margin:10px;text-align:center;border-radius:4px;background:var(--el-color-primary-light-9);color:var(--el-color-primary);font-size:18px;font-weight:500;max-width:100%;box-sizing:border-box;word-break:break-word;overflow-wrap:break-word;}
.floating-expand-btn {position:absolute;top:10px;left:10px;z-index:10;}
.expand-btn {background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.15);border:1px solid #e5e7eb;width:32px;height:32px;}
.expand-btn:hover {background:#f5f7fb;box-shadow:0 2px 12px rgba(0,0,0,0.2);}
.fusion-btn {position:absolute;bottom:15px;right:15px;z-index:10;}
.fusion-button {background:#409eff;border-color:#409eff;color:white;box-shadow:0 2px 8px rgba(64,158,255,0.3);font-weight:500;padding:8px 16px;display:flex;align-items:center;gap:6px;}
.fusion-button:hover {background:#66b1ff;border-color:#66b1ff;box-shadow:0 2px 12px rgba(64,158,255,0.4);}
.rename-form,.content-edit-form,.add-form {padding:0 20px;}
.preview-pane{min-height:50vh;display:flex;align-items:stretch;justify-content:center;}
.preview-image{max-width:100%;max-height:70vh;object-fit:contain;}
.preview-pdf{width:100%;height:70vh;border:none;}
.preview-text{width:100%;height:70vh;overflow:auto;background:#0b1021;color:#d1e7ff;padding:12px;border-radius:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.6;}
.preview-unsupported{text-align:center;color:#475569;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;}
.fade-slide-enter-active{transition:all .28s ease;}
.fade-slide-leave-active{transition:all .2s ease;}
.fade-slide-enter-from,.fade-slide-leave-to{opacity:0;transform:translateY(8px);}

/* 推荐修改样式 */
.recommendation-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.match-section, .candidate-section {
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  padding: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.section-icon {
  color: #409eff;
}

.section-content {
  padding-left: 24px;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: white;
  border-radius: 6px;
  border-left: 4px solid #67c23a;
}

.node-label {
  font-weight: 600;
  color: #67c23a;
  font-size: 14px;
}

.node-description {
  color: #606266;
  font-size: 14px;
}

.candidate-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.candidate-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.candidate-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.candidate-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.candidate-info .node-id {
  font-weight: 600;
  color: #409eff;
  min-width: 60px;
  font-size: 14px;
}

.candidate-info .node-name {
  color: #606266;
  font-size: 14px;
  flex: 1;
}

.similarity-info {
  display: flex;
  align-items: center;
}

/* 滚动条样式 */
.recommendation-content::-webkit-scrollbar {
  width: 6px;
}

.recommendation-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.recommendation-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.recommendation-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>