<template>
  <div class="workflow-page">
    <!-- 顶部步骤条（略） -->
    <div class="stepper">
      <template v-for="(n, i) in steps" :key="n">
        <div class="step" :class="{ active: i === activeStep }">{{ n }}</div>
        <div v-if="i < steps.length - 1" class="arrow">→</div>
      </template>
    </div>

    <h1 class="title">请输入患者信息:</h1>

    <section class="form-card">
      <div class="field">
        <label class="label" for="bleedVolume">出血体积</label>
        <input id="bleedVolume" class="input" type="text" v-model="form.bleedVolume"  />
      </div>

      <div class="field">
        <label class="label" for="bleedLocation">出血位置</label>
        <input id="bleedLocation" class="input" type="text" v-model="form.bleedLocation"  />
      </div>

      <div class="field">
        <label class="label" for="icp">颅内压</label>
        <input id="icp" class="input" type="text" v-model="form.intracranialPressure"  />
      </div>

      <!-- 上传 + 确认 -->
      <div class="field">
        <label class="label" for="xxx">XXX</label>

        <div class="upload-row">
          <!-- 文本框 -->
          <input
            id="xxx"
            class="input"
            type="text"
            v-model="form.xxx"
          />

          <!-- 上传方块 -->
          <button class="upload-tile" type="button" @click="triggerFile" aria-label="上传CT图片">
            <span>+</span>
          </button>
          <input
            ref="fileInput"
            class="hidden-file"
            type="file"
            accept=".jpg,.jpeg,.png,.dcm"
            @change="onFileChange"
          />

          <!-- 说明文字 -->
          <span class="upload-hint">（上传患者CT图片）</span>

          <!-- ✅ Element Plus Primary 按钮 -->
          <el-button type="primary" class="confirm-btn confirm" @click="submitForm">确定</el-button>
        </div>
      </div>
    </section>

    <!-- 底部小流程图（可保留/删掉） -->
    <section class="mini-flow">
      <div class="node">
        <div class="node-box">颅内出血情况</div>
        <div class="badge">1</div>
      </div>
      <div class="flow-arrow">
        <svg width="64" height="16" viewBox="0 0 64 16"><line x1="0" y1="8" x2="56" y2="8" stroke-width="2"/><polygon points="56,2 64,8 56,14"/></svg>
      </div>
      <div class="node">
        <div class="node-box">出血阳性  </div>
        <div class="badge">2</div>
      </div>
      <div class="flow-arrow">
        <svg width="64" height="16" viewBox="0 0 64 16"><line x1="0" y1="8" x2="56" y2="8" stroke-width="2"/><polygon points="56,2 64,8 56,14"/></svg>
      </div>
      <div class="node">
        <div class="node-box">出血性卒中管理</div>
        <div class="badge">3</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';

const steps = Array.from({ length: 10 }, (_, i) => i + 1);
const activeStep = 1;

const form = reactive({
  bleedVolume: '',
  bleedLocation: '',
  intracranialPressure: '',
  xxx: '',
  ct: null as File | null,
});

const fileInput = ref<HTMLInputElement | null>(null);
function triggerFile() { fileInput.value?.click(); }
function onFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files && files[0]) form.ct = files[0];
}
function submitForm() {
  console.log('提交数据：', { ...form });
  alert('已提交（示例）');
}
</script>

<style scoped>
/* —— 基础 —— */
:root {
  --bg: #f3f4f6;
  --panel: #fff;
  --border: #e5e7eb;
  --muted: #9aa3b2;
  --text: #111827;
  --primary: #2563eb;
  --primary-ghost: #e3ebff;

  /* 可选：一键把 Element Plus 的 primary 也设为 3391FF（影响全局 primary） */
  /* --el-color-primary: #3391FF; */
}
.workflow-page { padding: 24px 20px 28px; }

/* —— 步骤条 —— */
.stepper { display:flex; align-items:center; gap:12px; background:#f6f7f9; border:1px solid var(--border); border-radius:12px; padding:14px 18px; margin-bottom:18px; }
.step { width:36px; height:36px; border-radius:999px; display:grid; place-items:center; border:1px solid #1f2a44; background:#fff; color:#374151; font-weight:600; font-size:14px; }
.step.active { color:#374151; background:#c0d5f1; border-color:var(--primary); }
.arrow { color:#9aa3b2; font-size:18px; user-select:none; }

.title { font-size:26px; font-weight:800; color:var(--text); margin:8px 0 16px; }

/* —— 表单 —— */
.form-card { background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:16px; display:grid; grid-template-columns:1fr; gap:18px; }
.field .label { display:block; font-weight:700; margin-bottom:8px; color:#111827; }
.input {
  width:100%; height:56px; border-radius:10px; border:1px solid var(--border);
  padding:0 14px; background:#fff; color:#374151; outline:none; transition:border-color .15s, box-shadow .15s;
}
.input::placeholder { color:#b6beca; }
.input:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(37,99,235,.12); }

/* —— 上传行 —— */
.upload-row{
  display:grid;
  grid-template-columns: 1fr 120px 1fr auto; /* 输入 | 上传 | 文案 | 确定 */
  align-items:center;
  column-gap: 40px;
  row-gap: 12px;
}
.upload-tile{
  width:120px; height:96px; border-radius:10px;
  border:2px dashed #b9c2d0; background:#f8fafc;
  color:var(--primary); font-size:44px; font-weight:500; line-height:0;
  display:grid; place-items:center; cursor:pointer; transition:all .15s;
}
.upload-tile:hover{ border-color:var(--primary); background:var(--primary-ghost); }
.upload-hint{ color:var(--muted); font-size:14px; white-space:nowrap; }

/* —— Primary 确定按钮（Element Plus） —— */
.confirm { grid-column: 4; justify-self: end; }   /* 固定最右列并右对齐 */
.confirm-btn {
  /* 中等尺寸 + 轻圆角 */
  --btn-radius: 10px;
  --btn-padding-y: 10px;
  --btn-padding-x: 18px;
  --btn-font: 14px;

  border-radius: var(--btn-radius);
  padding: var(--btn-padding-y) var(--btn-padding-x);
  font-size: var(--btn-font);
}

/* 指定这个按钮的主色为 #3391FF（只影响本按钮，不改全局） */
.confirm-btn.el-button--primary {
  background-color: #3391FF;
  border-color: #3391FF;
  color: #fff;
}
.confirm-btn.el-button--primary:hover { filter: brightness(0.97); }
.confirm-btn.el-button--primary:active { filter: brightness(0.93); }
.confirm-btn.el-button--primary.is-disabled { opacity: .6; }

.hidden-file{ display:none; }

/* —— 底部小流程图（装饰） —— */
.mini-flow { margin:26px 0 8px; background:#fff; border:1px solid var(--border); border-radius:12px; padding:18px; display:flex; align-items:center; gap:18px; overflow:auto; }
.node { display:flex; flex-direction:column; align-items:center; gap:6px; }
.node-box { background:#fff; border:1px solid #c8d1df; box-shadow:0 4px 10px rgba(30,53,88,.06); padding:10px 16px; border-radius:10px; color:#1f2a44; white-space:nowrap; }
.badge { width:26px; height:26px; border-radius:999px; background:#fff; border:1px solid #ccd3e0; color:#6b7280; display:grid; place-items:center; font-weight:600; font-size:13px; }
.flow-arrow svg line, .flow-arrow svg polygon { stroke:#c6cbe0; fill:#c6cbe0; }

/* 窄屏优化：上传区域自动换行，“确定”仍保持在最右 */
@media (max-width: 920px) {
  .upload-row{ grid-template-columns: 1fr 120px auto; }
  .confirm{ grid-column: 1 / -1; justify-self: end; }
}
</style>
