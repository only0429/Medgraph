// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'node:path' // ✅ 启用 @ 别名需要这个

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // ✅ @ -> src
    },
  },
  plugins: [
    vue(),
    AutoImport({
      // 生成类型声明文件（可选，但推荐）
      dts: 'src/auto-imports.d.ts',
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      // 生成类型声明文件（可选，但推荐）
      dts: 'src/components.d.ts',
      resolvers: [ElementPlusResolver()],
    }),
  ],
})
