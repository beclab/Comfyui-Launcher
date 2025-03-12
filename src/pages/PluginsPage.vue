<template>
  <q-page padding>
    <h4 class="text-center q-mb-lg">插件管理</h4>
    
    <!-- 搜索和分类 -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-xs-12 col-md-8">
        <q-input
          v-model="searchQuery"
          filled
          label="搜索插件"
          clearable
          @update:model-value="searchPlugins"
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
      <div class="col-xs-12 col-md-4">
        <q-select
          v-model="selectedCategory"
          :options="categoryOptions"
          filled
          label="分类"
          @update:model-value="filterByCategory"
        />
      </div>
    </div>
    
    <!-- 插件列表 -->
    <div class="row q-col-gutter-md">
      <div v-for="plugin in filteredPlugins" :key="plugin.id" class="col-xs-12 col-sm-6 col-md-4">
        <q-card class="plugin-card">
          <q-img :src="plugin.image" height="150px" class="plugin-img">
            <div class="absolute-bottom text-subtitle2 text-center bg-black bg-opacity-50">
              {{ plugin.name }}
            </div>
          </q-img>
          
          <q-card-section>
            <div class="text-h6">{{ plugin.name }}</div>
            <div class="text-subtitle2">作者: {{ plugin.author }}</div>
            <q-badge color="primary" class="q-mr-xs">{{ plugin.category }}</q-badge>
            <q-badge :color="plugin.installed ? 'positive' : 'grey'">
              {{ plugin.installed ? '已安装' : '未安装' }}
            </q-badge>
          </q-card-section>
          
          <q-card-section>
            <p class="plugin-description">{{ plugin.description }}</p>
          </q-card-section>
          
          <q-separator />
          
          <q-card-actions align="right">
            <q-btn 
              :color="plugin.installed ? 'negative' : 'primary'"
              :label="plugin.installed ? '卸载' : '安装'"
              :icon="plugin.installed ? 'delete' : 'download'"
              @click="plugin.installed ? uninstallPlugin(plugin) : installPlugin(plugin)"
              :loading="plugin.installing"
            />
          </q-card-actions>
          
          <q-linear-progress v-if="plugin.installing" :value="plugin.progress / 100" color="primary" />
          
          <q-card-section v-if="plugin.error" class="bg-negative text-white">
            <div class="text-subtitle2">安装失败</div>
            <div class="text-caption">{{ plugin.error }}</div>
          </q-card-section>
        </q-card>
      </div>
      
      <div v-if="filteredPlugins.length === 0" class="col-12 text-center q-pa-xl">
        <q-icon name="search_off" size="5rem" color="grey-5" />
        <div class="text-h6 q-mt-md">没有找到匹配的插件</div>
      </div>
    </div>
  </q-page>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'PluginsPage',
  setup() {
    const searchQuery = ref('')
    const selectedCategory = ref(null)
    
    const plugins = ref([
      {
        id: 1,
        name: 'ComfyUI 工作流工具',
        author: 'ComfyUI Team',
        category: '工作流',
        description: '用于保存和加载ComfyUI工作流的扩展工具，带有版本控制和预览功能。',
        image: 'https://via.placeholder.com/150?text=Workflow+Tools',
        installed: false,
        installing: false,
        progress: 0,
        error: null
      },
      {
        id: 2,
        name: 'ControlNet扩展',
        author: 'ControlNet贡献者',
        category: '控制器',
        description: '添加ControlNet功能到ComfyUI，支持多种控制类型如边缘、深度、姿势控制等。',
        image: 'https://via.placeholder.com/150?text=ControlNet',
        installed: true,
        installing: false,
        progress: 100,
        error: null
      },
      {
        id: 3,
        name: 'Upscaler集合',
        author: 'Upscale Team',
        category: '图像增强',
        description: '集成多种AI超分辨率模型，包括ESRGAN、RealESRGAN、SwinIR等。',
        image: 'https://via.placeholder.com/150?text=Upscalers',
        installed: false,
        installing: false,
        progress: 0,
        error: null
      },
      {
        id: 4,
        name: '高级采样器',
        author: 'Sampling Experts',
        category: '采样',
        description: '添加更多采样算法和调节参数，提高图像生成质量和速度。',
        image: 'https://via.placeholder.com/150?text=Samplers',
        installed: false,
        installing: false,
        progress: 0,
        error: null
      },
      {
        id: 5,
        name: '批处理工具',
        author: 'Batch Processing Team',
        category: '工具',
        description: '支持批量处理图像和工作流，提高生产效率。',
        image: 'https://via.placeholder.com/150?text=Batch+Processing',
        installed: false,
        installing: false,
        progress: 0,
        error: null
      },
    ])
    
    const categoryOptions = [
      { label: '全部分类', value: null },
      { label: '工作流', value: '工作流' },
      { label: '控制器', value: '控制器' },
      { label: '图像增强', value: '图像增强' },
      { label: '采样', value: '采样' },
      { label: '工具', value: '工具' },
    ]
    
    // 搜索和筛选
    const searchPlugins = () => {
      // 实际应用中可能会从API搜索
      console.log('搜索:', searchQuery.value)
    }
    
    const filterByCategory = () => {
      // 实际应用中可能会从API过滤
      console.log('分类过滤:', selectedCategory.value)
    }
    
    const filteredPlugins = computed(() => {
      let result = [...plugins.value]
      
      // 搜索过滤
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        result = result.filter(plugin => 
          plugin.name.toLowerCase().includes(query) ||
          plugin.description.toLowerCase().includes(query)
        )
      }
      
      // 分类过滤
      if (selectedCategory.value) {
        result = result.filter(plugin => plugin.category === selectedCategory.value)
      }
      
      return result
    })
    
    // 安装插件
    const installPlugin = (plugin) => {
      plugin.installing = true
      plugin.progress = 0
      plugin.error = null
      
      // 模拟安装进度
      const interval = setInterval(() => {
        plugin.progress += 5
        
        if (plugin.progress >= 100) {
          clearInterval(interval)
          
          // 模拟有时安装失败
          if (Math.random() > 0.8) {
            plugin.error = '安装过程中发生错误。可能是网络问题或依赖冲突，请检查日志或重试。'
            plugin.installing = false
          } else {
            setTimeout(() => {
              plugin.installing = false
              plugin.installed = true
            }, 500)
          }
        }
      }, 200)
    }
    
    // 卸载插件
    const uninstallPlugin = (plugin) => {
      plugin.installing = true
      plugin.progress = 0
      
      // 模拟卸载进度
      const interval = setInterval(() => {
        plugin.progress += 10
        
        if (plugin.progress >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            plugin.installing = false
            plugin.installed = false
            plugin.error = null
          }, 500)
        }
      }, 100)
    }
    
    return {
      searchQuery,
      selectedCategory,
      categoryOptions,
      plugins,
      filteredPlugins,
      searchPlugins,
      filterByCategory,
      installPlugin,
      uninstallPlugin
    }
  }
}
</script>

<style scoped>
.plugin-card {
  transition: transform 0.2s;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.plugin-card:hover {
  transform: translateY(-5px);
}
.plugin-description {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.plugin-img {
  object-fit: cover;
}
</style> 