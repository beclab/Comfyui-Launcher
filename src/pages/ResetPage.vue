<template>
  <q-page padding class="flex flex-center column">
    <q-card class="reset-card">
      <q-card-section class="bg-warning text-white">
        <div class="text-h6">还原至初始状态</div>
      </q-card-section>
      
      <q-card-section>
        <q-icon name="warning" color="warning" size="5rem" class="q-mb-md block text-center" />
        
        <p class="text-h6 text-center">警告：此操作不可逆！</p>
        
        <p>还原操作将会：</p>
        <ul>
          <li>删除所有已安装的插件</li>
          <li>清除所有用户配置</li>
          <li>重置所有工作流和项目</li>
          <li>保留已下载的模型</li>
        </ul>
        
        <p>如果你只是遇到了临时问题，可以尝试重启ComfyUI而不是完全重置。</p>
        
        <div class="row justify-end q-mb-md">
          <q-btn
            flat
            color="primary"
            label="查看上次重置日志"
            icon="history"
            @click="showLastResetLogs"
          />
        </div>
        
        <q-separator class="q-my-md" />
        
        <q-input
          v-model="confirmText"
          filled
          label="请输入 'CONFIRM' 确认此操作"
          class="q-mb-md"
        />
      </q-card-section>
      
      <q-card-actions align="right">
        <q-btn
          flat
          label="取消"
          color="primary"
          to="/"
        />
        <q-btn
          label="确认还原"
          color="negative"
          :disable="confirmText !== 'CONFIRM'"
          @click="showConfirmDialog = true"
        />
      </q-card-actions>
    </q-card>
    
    <!-- 确认对话框 -->
    <q-dialog v-model="showConfirmDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm">你确定要将ComfyUI还原至初始状态吗？</span>
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn flat label="确认" color="negative" @click="resetComfyUI" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    
    <!-- 重置进度对话框 -->
    <q-dialog v-model="showResetProgress" persistent>
      <q-card style="min-width: 550px; max-width: 80vw;">
        <q-card-section>
          <div class="text-h6">正在还原...</div>
        </q-card-section>
        
        <q-card-section class="q-pt-none">
          <div class="log-container q-mb-md">
            <div v-for="(log, index) in resetLogs" :key="index" class="log-entry">
              {{ log }}
            </div>
            <div ref="logEnd"></div>
          </div>
          
          <q-spinner v-if="isResetting" color="primary" size="2em" />
        </q-card-section>
      </q-card>
    </q-dialog>
    
    <!-- 重置完成对话框 -->
    <q-dialog v-model="showResetComplete" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="check_circle" color="positive" text-color="white" />
          <span class="q-ml-sm">还原操作已完成！</span>
        </q-card-section>
        
        <q-card-section>
          <p>ComfyUI已被成功还原至初始状态。</p>
          <p>建议重启应用以确保所有更改生效。</p>
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="返回主页" color="primary" to="/" />
          <q-btn label="重启应用" color="positive" @click="restartApp" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    
    <!-- 上次重置日志对话框 -->
    <q-dialog v-model="showLogDialog" persistent>
      <q-card style="min-width: 550px; max-width: 80vw;">
        <q-card-section class="row items-center">
          <div class="text-h6">上次重置操作日志</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        
        <q-card-section>
          <div class="log-container q-mb-md" v-if="resetLogs.length > 0">
            <div v-for="(log, index) in resetLogs" :key="index" class="log-entry">
              {{ log }}
            </div>
            <div ref="logEnd"></div>
          </div>
          <div v-else class="text-center text-grey">
            <q-icon name="info" size="2rem" />
            <p>没有找到重置日志记录</p>
          </div>
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="关闭" color="primary" v-close-popup />
          <q-btn label="刷新" color="primary" @click="fetchResetLogs" :loading="isLoading" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { ref, nextTick, onBeforeUnmount } from 'vue'
import api from '../api'

export default {
  name: 'ResetPage',
  setup() {
    const confirmText = ref('')
    const showConfirmDialog = ref(false)
    const showResetProgress = ref(false)
    const showResetComplete = ref(false)
    const resetLogs = ref([])
    const isResetting = ref(false)
    const logEnd = ref(null)
    const showLogDialog = ref(false)
    const isLoading = ref(false)
    
    // 日志轮询间隔ID
    let logsIntervalId = null
    
    // 滚动到日志底部
    const scrollToBottom = async () => {
      await nextTick()
      if (logEnd.value) {
        logEnd.value.scrollIntoView({ behavior: 'smooth' })
      }
    }
    
    // 获取重置日志
    const fetchResetLogs = async () => {
      isLoading.value = true
      try {
        const response = await api.getResetLogs()
        if (response && response.body && response.body.logs) {
          resetLogs.value = response.body.logs
          scrollToBottom()
        }
      } catch (error) {
        console.error('获取重置日志失败:', error)
      } finally {
        isLoading.value = false
      }
    }
    
    // 显示上次重置日志
    const showLastResetLogs = async () => {
      resetLogs.value = []
      showLogDialog.value = true
      await fetchResetLogs()
    }
    
    // 重置ComfyUI
    const resetComfyUI = async () => {
      showConfirmDialog.value = false
      showResetProgress.value = true
      resetLogs.value = ['开始还原操作，请稍候...']
      isResetting.value = true
      
      try {
        // 调用重置API
        const response = await api.resetComfyUI()
        
        // 开始轮询日志
        logsIntervalId = setInterval(fetchResetLogs, 1000)
        
        // 等待重置完成
        if (response.body && response.body.success) {
          // 再获取一次最终日志
          await fetchResetLogs()
          
          // 显示完成对话框
          isResetting.value = false
          setTimeout(() => {
            showResetProgress.value = false
            showResetComplete.value = true
          }, 1000)
        } else {
          resetLogs.value.push('重置操作失败: ' + (response.body?.message || '未知错误'))
          isResetting.value = false
        }
      } catch (error) {
        resetLogs.value.push('重置操作出错: ' + (error.message || '未知错误'))
        isResetting.value = false
      }
    }
    
    // 重启应用
    const restartApp = async () => {
      try {
        await api.restartApp()
        // 应用会重启，页面将会刷新
      } catch (error) {
        console.error('重启应用失败:', error)
        // 如果API调用失败，手动刷新页面
        setTimeout(() => {
          window.location.href = '/'
        }, 1000)
      }
    }
    
    // 组件卸载前清除定时器
    onBeforeUnmount(() => {
      if (logsIntervalId) {
        clearInterval(logsIntervalId)
      }
    })
    
    return {
      confirmText,
      showConfirmDialog,
      showResetProgress,
      showResetComplete,
      resetLogs,
      isResetting,
      logEnd,
      showLogDialog,
      isLoading,
      resetComfyUI,
      showLastResetLogs,
      fetchResetLogs,
      restartApp
    }
  }
}
</script>

<style scoped>
.reset-card {
  max-width: 600px;
  width: 100%;
}

.log-container {
  max-height: 400px;
  overflow-y: auto;
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 10px;
  font-family: monospace;
  font-size: 12px;
}

.log-entry {
  margin-bottom: 3px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
