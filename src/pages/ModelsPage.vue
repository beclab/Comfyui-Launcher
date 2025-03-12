<template>
  <q-page padding>
    <h4 class="text-center q-mb-lg">模型管理</h4>
    
    <div class="row q-col-gutter-md">
      <!-- 下载所有模型区域 -->
      <div class="col-xs-12 col-md-6">
        <q-card class="full-height">
          <q-card-section>
            <div class="text-h6">下载所有模型</div>
            <div class="text-subtitle2 q-mt-sm">一键下载所有必要的模型</div>
          </q-card-section>
          
          <q-card-section>
            <q-btn 
              color="primary" 
              label="下载所有模型" 
              :loading="downloadingAll"
              @click="downloadAllModels"
              class="full-width q-mb-md"
            />
            
            <div v-if="downloadingAll">
              <q-linear-progress :value="allProgress / 100" color="primary" class="q-mb-xs" />
              <div class="row justify-between q-mb-md">
                <div>{{ allProgress }}%</div>
                <div>剩余时间: {{ allRemainingTime }}</div>
              </div>
              <div class="row justify-between text-caption">
                <div>下载速度: {{ allDownloadSpeed }}</div>
                <div>已下载: {{ allDownloadedSize }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      
      <!-- 单独下载模型区域 -->
      <div class="col-xs-12 col-md-6">
        <q-card class="full-height">
          <q-card-section>
            <div class="text-h6">单独下载模型</div>
            <div class="text-subtitle2 q-mt-sm">选择并下载单个模型</div>
          </q-card-section>
          
          <q-card-section>
            <q-select
              v-model="selectedModel"
              :options="modelOptions"
              label="选择模型"
              class="q-mb-md"
            />
            
            <q-btn 
              color="primary" 
              label="下载选中模型" 
              :loading="downloadingSingle"
              @click="downloadSingleModel"
              :disable="!selectedModel"
              class="full-width q-mb-md"
            />
            
            <div v-if="downloadingSingle">
              <q-linear-progress :value="singleProgress / 100" color="primary" class="q-mb-xs" />
              <div class="row justify-between q-mb-md">
                <div>{{ singleProgress }}%</div>
                <div>剩余时间: {{ singleRemainingTime }}</div>
              </div>
              <div class="row justify-between text-caption">
                <div>下载速度: {{ singleDownloadSpeed }}</div>
                <div>已下载: {{ singleDownloadedSize }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
    
    <!-- 已下载模型列表 -->
    <q-card class="q-mt-lg">
      <q-card-section>
        <div class="text-h6">已下载模型</div>
      </q-card-section>
      
      <q-separator />
      
      <q-card-section>
        <q-list separator>
          <q-item v-for="model in downloadedModels" :key="model.id">
            <q-item-section>
              <q-item-label>{{ model.name }}</q-item-label>
              <q-item-label caption>大小: {{ model.size }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge color="positive">已下载</q-badge>
            </q-item-section>
          </q-item>
          
          <q-item v-if="downloadedModels.length === 0">
            <q-item-section>
              <q-item-label class="text-center">暂无已下载模型</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'ModelsPage',
  setup() {
    const downloadingAll = ref(false)
    const downloadingSingle = ref(false)
    const allProgress = ref(0)
    const singleProgress = ref(0)
    const allRemainingTime = ref('计算中...')
    const singleRemainingTime = ref('计算中...')
    const allDownloadSpeed = ref('0 KB/s')
    const singleDownloadSpeed = ref('0 KB/s')
    const allDownloadedSize = ref('0 MB / 0 MB')
    const singleDownloadedSize = ref('0 MB / 0 MB')
    
    const selectedModel = ref(null)
    const modelOptions = ref([
      { label: 'SD 1.5 基础模型', value: 'sd_1.5' },
      { label: 'SD 2.1 基础模型', value: 'sd_2.1' },
      { label: 'SDXL 基础模型', value: 'sdxl' },
      { label: 'ControlNet', value: 'controlnet' },
      { label: 'LoRA 模型集合', value: 'lora' },
    ])
    
    const downloadedModels = ref([
      // 模拟数据
      // { id: 1, name: 'SD 1.5 基础模型', size: '4.2 GB' }
    ])
    
    // 下载所有模型
    const downloadAllModels = () => {
      downloadingAll.value = true
      allProgress.value = 0
      
      // 模拟下载进度
      const interval = setInterval(() => {
        allProgress.value += 1
        updateDownloadStats('all')
        
        if (allProgress.value >= 100) {
          clearInterval(interval)
          downloadingAll.value = false
          // 模拟添加下载完成的模型
          modelOptions.value.forEach(model => {
            if (!downloadedModels.value.some(m => m.value === model.value)) {
              downloadedModels.value.push({
                id: Date.now() + Math.random(),
                name: model.label,
                size: `${(Math.random() * 5 + 1).toFixed(1)} GB`
              })
            }
          })
        }
      }, 100)
    }
    
    // 下载单个模型
    const downloadSingleModel = () => {
      if (!selectedModel.value) return
      
      downloadingSingle.value = true
      singleProgress.value = 0
      
      // 模拟下载进度
      const interval = setInterval(() => {
        singleProgress.value += 2
        updateDownloadStats('single')
        
        if (singleProgress.value >= 100) {
          clearInterval(interval)
          downloadingSingle.value = false
          
          // 添加到已下载列表
          if (!downloadedModels.value.some(m => m.value === selectedModel.value.value)) {
            downloadedModels.value.push({
              id: Date.now(),
              name: selectedModel.value.label,
              size: `${(Math.random() * 5 + 1).toFixed(1)} GB`
            })
          }
        }
      }, 100)
    }
    
    // 更新下载统计信息
    const updateDownloadStats = (type) => {
      const isAll = type === 'all'
      const progress = isAll ? allProgress.value : singleProgress.value
      
      // 计算剩余时间
      const remainingTime = Math.floor((100 - progress) / 5) // 模拟计算
      if (isAll) {
        allRemainingTime.value = `${remainingTime} 秒`
        allDownloadSpeed.value = `${Math.floor(Math.random() * 10 + 5)} MB/s`
        allDownloadedSize.value = `${(progress / 100 * 15).toFixed(1)} GB / 15 GB`
      } else {
        singleRemainingTime.value = `${remainingTime} 秒`
        singleDownloadSpeed.value = `${Math.floor(Math.random() * 10 + 5)} MB/s`
        singleDownloadedSize.value = `${(progress / 100 * 4).toFixed(1)} GB / 4 GB`
      }
    }
    
    return {
      downloadingAll,
      downloadingSingle,
      allProgress,
      singleProgress,
      allRemainingTime,
      singleRemainingTime,
      allDownloadSpeed,
      singleDownloadSpeed,
      allDownloadedSize,
      singleDownloadedSize,
      selectedModel,
      modelOptions,
      downloadedModels,
      downloadAllModels,
      downloadSingleModel
    }
  }
}
</script> 