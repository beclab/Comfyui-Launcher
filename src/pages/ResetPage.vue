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
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">正在还原...</div>
        </q-card-section>
        
        <q-card-section class="q-pt-none">
          <div class="text-caption q-mb-sm">{{ resetStepText }}</div>
          <q-linear-progress
            :value="resetProgress / 100"
            color="primary"
            class="q-mb-md"
          />
          <div class="text-right">{{ resetProgress }}%</div>
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
  </q-page>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'ResetPage',
  setup() {
    const confirmText = ref('')
    const showConfirmDialog = ref(false)
    const showResetProgress = ref(false)
    const showResetComplete = ref(false)
    const resetProgress = ref(0)
    const resetStepText = ref('正在准备还原操作...')
    
    const resetSteps = [
      { text: '正在停止ComfyUI服务...', duration: 1000 },
      { text: '正在移除用户配置...', duration: 1500 },
      { text: '正在卸载自定义插件...', duration: 2000 },
      { text: '正在清理缓存数据...', duration: 1500 },
      { text: '正在重置工作流和历史记录...', duration: 1000 },
      { text: '正在应用默认配置...', duration: 1500 },
      { text: '正在准备重启服务...', duration: 1500 }
    ]
    
    const resetComfyUI = () => {
      showConfirmDialog.value = false
      showResetProgress.value = true
      resetProgress.value = 0
      
      let currentStep = 0
      const totalSteps = resetSteps.length
      
      // 模拟重置过程
      const processStep = () => {
        if (currentStep < totalSteps) {
          const step = resetSteps[currentStep]
          resetStepText.value = step.text
          
          const startProgress = (currentStep / totalSteps) * 100
          const endProgress = ((currentStep + 1) / totalSteps) * 100
          const progressStep = (endProgress - startProgress) / 10
          
          let progressCounter = 0
          const progressInterval = setInterval(() => {
            resetProgress.value = startProgress + progressStep * progressCounter
            progressCounter++
            
            if (progressCounter > 10) {
              clearInterval(progressInterval)
              currentStep++
              setTimeout(processStep, 100)
            }
          }, step.duration / 10)
        } else {
          // 完成所有步骤
          resetProgress.value = 100
          setTimeout(() => {
            showResetProgress.value = false
            showResetComplete.value = true
          }, 500)
        }
      }
      
      processStep()
    }
    
    // 重启应用
    const restartApp = () => {
      // 实际应用中会调用后端API来重启应用
      console.log('重启应用')
      // 模拟重启
      setTimeout(() => {
        window.location.href = '/'
      }, 1000)
    }
    
    return {
      confirmText,
      showConfirmDialog,
      showResetProgress,
      showResetComplete,
      resetProgress,
      resetStepText,
      resetComfyUI,
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
</style>
