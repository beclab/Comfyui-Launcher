<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 550px; max-width: 80vw;">
      <q-card-section class="row items-center">
        <div class="text-h6">{{ t('reset.logs.title') }}</div>
        <q-space />
        <q-btn icon="refresh" flat round dense @click="fetchResetLogs" :loading="isLoading" />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      
      <q-card-section>
        <div class="log-container q-mb-md" v-if="logs.length > 0">
          <div v-for="(log, index) in logs" :key="index" class="log-entry">
            {{ log }}
          </div>
          <div ref="logEnd"></div>
        </div>
        <div v-else class="text-center text-grey">
          <q-icon name="info" size="2rem" />
          <p>{{ t('reset.logs.noLogs') }}</p>
        </div>
      </q-card-section>
      

    </q-card>
  </q-dialog>
</template>

<script>
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../../api'

export default {
  name: 'ResetLogDialog',
  
  emits: ['update:modelValue'],
  
  setup(props, { emit }) {
    // Get i18n instance
    const { t, locale } = useI18n()
    
    // 控制对话框显示状态
    const isOpen = ref(false)
    
    // 日志相关状态
    const logs = ref([])
    const isLoading = ref(false)
    const logEnd = ref(null)
    
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
        // Use current i18n locale for logs
        const language = locale.value === 'zh-CN' ? 'zh' : 'en'
        const response = await api.getResetLogs(language)
        if (response && response.body && response.body.logs) {
          logs.value = response.body.logs
          scrollToBottom()
        }
      } catch (error) {
        // Log error message
        console.error('Getting reset logs failed:', error)
      } finally {
        isLoading.value = false
      }
    }
    
    // 当对话框打开时获取日志
    watch(isOpen, (newVal) => {
      if (newVal) {
        logs.value = []
        fetchResetLogs()
      }
      emit('update:modelValue', newVal)
    })
    
    // 提供给外部的方法
    const openDialog = () => {
      isOpen.value = true
    }
    
    const closeDialog = () => {
      isOpen.value = false
    }
    
    return {
      isOpen,
      logs,
      isLoading,
      logEnd,
      fetchResetLogs,
      scrollToBottom,
      openDialog,
      closeDialog,
      t
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
</style> 