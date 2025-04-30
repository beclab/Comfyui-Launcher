<template>
  <!-- 抹掉并还原弹窗1 -->
  <q-dialog v-model="showResetDialog1" persistent>
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">{{ t('reset.dialog1.title') }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      
      <q-card-section>
        <p>{{ t('reset.dialog1.message') }}</p>
        <ul>
          <li>{{ t('reset.dialog1.effects.settings') }}</li>
          <li>{{ t('reset.dialog1.effects.plugins') }}</li>
          <li>{{ t('reset.dialog1.effects.workflows') }}</li>
          <li>{{ t('reset.dialog1.effects.models') }}</li>
          <li class="hard-reset-link" @click="openHardResetDialog">普通还原无效? 试试强力还原</li>
        </ul>
      </q-card-section>
      
      <q-card-actions align="right" style="margin-bottom: 8px;margin-right: 8px;">
        <q-btn outline="" :label="t('common.cancel')" color="grey-7" v-close-popup style="padding-top: 8px; padding-bottom: 8px;"/>
        <q-btn :label="t('reset.dialog1.confirmButton')" color="negative" @click="showResetConfirmDialog('normal')" style="padding-top: 8px; padding-bottom: 8px;"/>
      </q-card-actions>
    </q-card>
  </q-dialog>
  
  <!-- 强力重置弹窗 -->
  <q-dialog v-model="showHardResetDialog" persistent>
    <q-card>
      <q-card-section class="row items-center">
        <div class="text-h6">强力还原 ComfyUI</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      
      <q-card-section>
        <p>强力还原将会彻底重置 ComfyUI 到初始状态</p>
        <p class="text-negative font-weight-bold">警告：此操作会同时清除以下内容：</p>
        <ul>
          <li>所有用户设置</li>
          <li>所有自定义节点和插件</li>
          <li>所有工作流</li>
          <li>除模型外的所有文件</li>
        </ul>
        <p class="text-negative">仅保留 models、output 和 input 目录中的文件</p>
      </q-card-section>
      
      <q-card-actions align="right" style="margin-bottom: 8px;margin-right: 8px;">
        <q-btn outline="" label="取消" color="grey-7" v-close-popup style="padding-top: 8px; padding-bottom: 8px;"/>
        <q-btn label="强力还原" color="deep-orange" @click="showResetConfirmDialog('hard')" style="padding-top: 8px; padding-bottom: 8px;"/>
      </q-card-actions>
    </q-card>
  </q-dialog>
  
  <!-- 抹掉并还原弹窗2 (确认输入) -->
  <q-dialog v-model="showResetDialog2" persistent>
    <q-card>
      <q-card-section class="row items-center">
        <q-avatar icon="warning" color="warning" text-color="white" />
        <span class="q-ml-sm">{{ t('reset.dialog2.warning') }}</span>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      
      <q-card-section>
        <p>{{ t('reset.dialog2.restartTip') }}</p>
        
        <q-input
          v-model="popupConfirmText"
          filled
          :label="t('reset.dialog2.confirmInput')"
          class="q-my-md"
        />
      </q-card-section>
      
      <q-card-actions align="right" style="margin-bottom: 8px;margin-right: 8px;">
        <q-btn outline="" :label="t('common.cancel')" color="grey-7" v-close-popup style="padding-top: 8px; padding-bottom: 8px;"/>
        <q-btn 
          :label="t('common.confirm')" 
          color="negative" 
          :disable="popupConfirmText !== 'CONFIRM'"
          @click="resetComfyUI"
          style="padding-top: 8px; padding-bottom: 8px;"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
  
  <!-- 重置进度对话框 -->
  <q-dialog v-model="showResetProgress" persistent>
    <q-card style="min-width: 550px; max-width: 80vw;">
      <q-card-section>
        <div class="text-h6">{{ resetMode === 'hard' ? '强力还原进度' : t('reset.progress.title') }}</div>
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
        <span class="q-ml-sm">{{ resetMode === 'hard' ? '强力还原完成' : t('reset.complete.title') }}</span>
      </q-card-section>
      
      <q-card-section>
        <p>{{ resetMode === 'hard' ? 'ComfyUI 已完成强力还原' : t('reset.complete.message') }}</p>
        <p>{{ t('reset.complete.restartTip') }}</p>
      </q-card-section>
      
      <q-card-actions align="right" style="margin-right: 8px; margin-bottom: 8px;">
        <q-btn outline="" :label="t('reset.complete.backButton')" color="primary" style="padding-top: 8px; padding-bottom: 8px;" @click="showResetComplete = false"/>
        <!-- <q-btn :label="t('reset.complete.restartButton')" color="positive" @click="restartApp" /> -->
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { ref, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../../api'

export default {
  name: 'ResetDialogs',
  
  setup() {
    // 添加i18n
    const { t, locale } = useI18n()
    
    // 弹窗状态
    const showResetDialog1 = ref(false)
    const showResetDialog2 = ref(false)
    const showHardResetDialog = ref(false)
    const showResetProgress = ref(false)
    const showResetComplete = ref(false)
    const popupConfirmText = ref('')
    
    // 重置相关状态
    const resetLogs = ref([])
    const isResetting = ref(false)
    const logEnd = ref(null)
    
    // 新增：重置模式状态
    const resetMode = ref('normal') // 'normal' 或 'hard'
    
    // 语言选择，使用当前i18n设置的语言
    const lang = ref(locale.value)
    
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
      try {
        const response = await api.getResetLogs(lang.value)
        if (response && response.body && response.body.logs) {
          resetLogs.value = response.body.logs
          scrollToBottom()
        }
      } catch (error) {
        console.error('Getting reset logs failed:', error)
      }
    }
    
    // 显示第一个弹窗
    const openResetDialog = (language = locale.value) => {
      lang.value = language
      resetMode.value = 'normal' // 默认为普通重置
      showResetDialog1.value = true
    }
    
    // 新增：显示强力重置弹窗
    const openHardResetDialog = () => {
      showResetDialog1.value = false // 关闭普通重置弹窗
      resetMode.value = 'hard' // 设置为强力重置模式
      showHardResetDialog.value = true
    }
    
    // 显示确认弹窗
    const showResetConfirmDialog = (mode) => {
      resetMode.value = mode || 'normal'
      
      // 关闭之前的弹窗
      showResetDialog1.value = false
      showHardResetDialog.value = false
      
      // 清空确认文本
      popupConfirmText.value = ''
      
      // 显示确认弹窗
      showResetDialog2.value = true
    }
    
    // 执行重置
    const resetComfyUI = async () => {
      showResetDialog2.value = false
      showResetProgress.value = true
      resetLogs.value = [resetMode.value === 'hard' ? '正在开始强力还原...' : t('reset.progress.starting')]
      isResetting.value = true
      
      try {
        // 调用API时传递重置模式
        const response = await api.resetComfyUI(lang.value, resetMode.value)
        
        // 开始轮询日志
        logsIntervalId = setInterval(() => fetchResetLogs(), 1000)
        
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
          resetLogs.value.push(t('reset.progress.failed') + ': ' + (response.body?.message || t('reset.progress.unknownError')))
          isResetting.value = false
        }
      } catch (error) {
        resetLogs.value.push(t('reset.progress.error') + ': ' + (error.message || t('reset.progress.unknownError')))
        isResetting.value = false
      }
    }
    
    // 重启应用
    const restartApp = async () => {
      try {
        await api.restartApp()
        // 应用会重启，页面将会刷新
      } catch (error) {
        console.error('Failed to restart app:', error)
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
      // 暴露状态
      showResetDialog1,
      showResetDialog2,
      showHardResetDialog, // 新增：强力重置弹窗
      showResetProgress,
      showResetComplete,
      popupConfirmText,
      resetLogs,
      isResetting,
      logEnd,
      t,
      resetMode, // 新增：重置模式
      
      // 暴露方法
      openResetDialog,
      openHardResetDialog, // 新增：打开强力重置弹窗
      showResetConfirmDialog,
      resetComfyUI,
      restartApp
    }
  }
}
</script>

<style scoped>
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

/* 新增：强力重置链接样式 */
.hard-reset-link {
  color: #ff5722;
  cursor: pointer;
  font-weight: bold;
}

.hard-reset-link:hover {
  text-decoration: underline;
}
</style> 