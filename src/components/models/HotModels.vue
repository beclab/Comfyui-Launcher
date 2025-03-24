<template>
  <div class="models-container">
    <q-inner-loading :showing="loading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>
    
    <div id="masonry-scroll-container" class="masonry-container" ref="scrollContainer">
      <masonry-wall 
        :items="items" 
        :column-width="300" 
        :gap="16"
        :ssr="false"
        column-key="id"
      >
        <template #default="{ item }">
          <q-card class="masonry-card cursor-pointer" :key="item.id" :data-new="item._isNew" @click="openModelPage(item.id)">
            <div class="image-container">
              <!-- 图片 -->
              <q-img 
                :src="item.coverImage || item.images?.[0]?.url || ''" 
                :style="{ aspectRatio: item.ratio }"
                :placeholder-src="'https://placehold.co/300x300?text=加载中'"
              >
                <template v-slot:error>
                  <div class="absolute-full flex flex-center bg-grey-3 text-grey-8">
                    <q-icon name="image" size="3em" />
                  </div>
                </template>
              </q-img>
              
              <!-- 顶部叠加层 - checkpoint信息和统计数据 -->
              <div class="overlay-top">
                <div class="row justify-between items-center w-100">
                  <div class="checkpoint-badge">
                    <span>Checkpoint</span>
                    <span class="checkpoint-version q-ml-xs">{{ getBaseModel(item) }}</span>
                  </div>
                  
                  <!-- 统计信息移到右侧 -->
                  <div class="row items-center stats-row">
                    <div class="stats-item q-mr-md">
                      <q-icon name="download" size="xs" />
                      <span class="q-ml-xs">{{ formatNumber(getDownloads(item)) }}</span>
                    </div>
                    <div class="stats-item q-mr-md">
                      <q-icon name="thumb_up" size="xs" />
                      <span class="q-ml-xs">{{ formatNumber(getThumbs(item)) }}</span>
                    </div>
                    <div class="stats-item">
                      <q-icon name="paid" size="xs" />
                      <span class="q-ml-xs">{{ formatNumber(getTips(item)) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 底部叠加层 - 其他信息 -->
              <div class="overlay-bottom">
                <!-- 模型标题和作者 -->
                <div class="model-title">{{ item.name }}</div>
                <div class="model-author">{{ getAuthor(item) }}</div>
                
                <!-- 标签 -->
                <div class="model-tags q-mt-sm">
                  <q-badge v-for="tag in item.tags.slice(0, 3)" :key="tag" color="primary" text-color="white" class="q-mr-xs tag-badge">
                    {{ tag }}
                  </q-badge>
                </div>
              </div>
            </div>
          </q-card>
        </template>
      </masonry-wall>
      
      <div ref="loadMoreTrigger" class="text-center q-py-lg q-my-md load-more-trigger">
        <q-spinner v-if="loadingMore" color="primary" size="2em" />
        <div v-else-if="hasMore" class="text-grey-7">
          <q-icon name="arrow_upward" /> 上拉加载更多（页码: {{currentPage}}/{{totalPages}}）
        </div>
        <div v-else class="text-grey-7">没有更多数据了</div>
      </div>
    </div>
    
    <!-- 分页控制器 -->
    <div class="text-center q-mt-md" v-if="items.length > 0 && !loadMore">
      <q-pagination
        v-model="currentPage"
        :max="totalPages"
        :max-pages="6"
        boundary-links
        direction-links
        @update:model-value="loadModels"
      />
    </div>
    
    <div v-if="errorMessage" class="text-center q-mt-lg text-negative">
      <q-icon name="error" size="2rem" />
      <p>{{ errorMessage }}</p>
      <q-btn color="primary" label="重试" @click="() => loadModels()" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, nextTick } from 'vue';
import MasonryWall from '@yeger/vue-masonry-wall';
import { civitaiApi } from '../../api';
import { useQuasar } from 'quasar';

// 使用与LatestModels相同的接口定义
interface CivitaiImage {
  url: string;
  nsfw?: boolean;
  width?: number;
  height?: number;
}

interface CivitaiModelVersion {
  id: string;
  name: string;
  createdAt: string;
  downloadUrl?: string;
  images?: CivitaiImage[];
  publishedAt?: string;
  baseModel?: string;
}

interface CivitaiModel {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  tags: string[];
  coverImage?: string;
  images?: CivitaiImage[];
  modelVersions?: CivitaiModelVersion[];
  ratio?: number; 
  _isNew?: boolean;
  creator?: {
    username: string;
    image?: string;
  };
  stats?: {
    downloadCount: number;
    thumbsUpCount: number;
    commentCount: number;
    viewCount: number;
    tippedAmountCount: number;
  };
}

interface CivitaiApiResponse {
  items: CivitaiModel[];
  metadata?: {
    nextCursor?: string;
    nextPage?: string;
    currentPage: number;
    pageSize: number;
    totalItems?: number;
    totalPages?: number;
  }
}

export default defineComponent({
  name: 'HotModels',
  components: {
    MasonryWall
  },
  setup() {
    const $q = useQuasar();
    const items = ref<CivitaiModel[]>([]);
    const loading = ref(true);
    const errorMessage = ref('');
    const currentPage = ref(1);
    const totalPages = ref(1);
    const itemsPerPage = 24; // 与API一致
    const loadMoreTrigger = ref<HTMLElement | null>(null);
    const loadingMore = ref(false);
    const hasMore = ref(true);
    const loadMore = ref(false);
    const scrollContainer = ref<HTMLElement | null>(null);
    const initialLoadComplete = ref(false);
    let scrollPosition = 0;
    const nextPageUrl = ref('');
    
    // 加载热门模型数据
    const loadModels = async (pageOrEvent?: number | Event | string) => {
      // 如果是加载更多，记录滚动位置
      const isLoadingMore = loadingMore.value;
      
      if (isLoadingMore && scrollContainer.value) {
        scrollPosition = scrollContainer.value.scrollTop;
        console.log('记录滚动位置:', scrollPosition);
      }
      
      // 确定是使用页码还是直接URL
      let page = currentPage.value;
      let directUrl = '';
      
      // 如果传入的是字符串URL，直接使用
      if (typeof pageOrEvent === 'string' && pageOrEvent.startsWith('http')) {
        directUrl = pageOrEvent;
        console.log('使用直接URL加载:', directUrl);
      } 
      // 如果是数字，用作页码
      else if (typeof pageOrEvent === 'number') {
        page = pageOrEvent;
        currentPage.value = page;
      }
      
      // 设置加载状态
      if (isLoadingMore) {
        loadingMore.value = true;
      } else {
        loading.value = true;
        errorMessage.value = '';
      }
      
      try {
        console.log('加载热门模型，参数:', directUrl || `第${page}页`);
        
        // 使用正确的API方法名称: getLatestModelsWithUrl 而不是 getModelsByUrl
        const response = directUrl 
          ? await civitaiApi.getLatestModelsWithUrl(directUrl) as CivitaiApiResponse
          : await civitaiApi.getHotModels(page, itemsPerPage) as CivitaiApiResponse;
        
        // 处理返回数据
        if (response.items && Array.isArray(response.items)) {
          // 处理新加载的数据
          const newItems = response.items.map((item: CivitaiModel) => {
            // 提取第一个模型版本的图片信息
            const firstVersion = item.modelVersions && item.modelVersions.length > 0 
              ? item.modelVersions[0] 
              : null;
            
            // 获取第一张图片
            const firstImage = firstVersion?.images && firstVersion.images.length > 0
              ? firstVersion.images[0]
              : null;
            
            // 计算图片比例
            let ratio = 1; // 默认为1:1
            if (firstImage && firstImage.width && firstImage.height) {
              ratio = firstImage.width / firstImage.height;
            }
            
            return {
              ...item,
              coverImage: item.coverImage || '', 
              images: firstVersion?.images || [],
              ratio: ratio,
              description: item.description || '暂无描述',
              _isNew: true, // 标记新项目，用于动画
            };
          });
          
          // 加载更多时，仅添加新项目
          if (isLoadingMore) {
            items.value = [...items.value, ...newItems];
            
            nextTick(() => {
              if (scrollContainer.value) {
                scrollContainer.value.scrollTop = scrollPosition;
                
                let attempts = 0;
                const maxAttempts = 10;
                const interval = setInterval(() => {
                  if (scrollContainer.value && attempts < maxAttempts) {
                    scrollContainer.value.scrollTop = scrollPosition;
                    attempts++;
                  } else {
                    clearInterval(interval);
                  }
                }, 50);
              }
            });
          } else {
            items.value = newItems;
            if (!initialLoadComplete.value) {
              initialLoadComplete.value = true;
            }
          }
          
          // 更新分页信息
          if (response.metadata) {
            console.log('API返回的metadata:', response.metadata);
            
            // 确保正确计算totalPages，注意括号位置
            totalPages.value = response.metadata.totalPages || 
              Math.ceil((response.metadata.totalItems || 0) / itemsPerPage);
            
            // 保存下一页URL
            if (response.metadata.nextPage) {
              nextPageUrl.value = response.metadata.nextPage;
              console.log('保存下一页URL:', nextPageUrl.value);
              hasMore.value = true;
            } else {
              nextPageUrl.value = '';
              hasMore.value = currentPage.value < totalPages.value;
            }
          }
        } else {
          if (!isLoadingMore) {
            errorMessage.value = '返回数据格式不正确';
            items.value = [];
          }
        }
      } catch (error) {
        console.error('加载热门模型失败:', error);
        if (!isLoadingMore) {
          errorMessage.value = '获取热门模型列表失败，请稍后重试';
          items.value = [];
        }
      } finally {
        if (isLoadingMore) {
          loadingMore.value = false;
        } else {
          loading.value = false;
        }
      }
    };
    
    // 实用工具函数（与LatestModels基本相同）
    const viewModel = (modelId: string) => {
      $q.notify({
        message: `查看模型 ID: ${modelId}`,
        color: 'info'
      });
    };
    
    const downloadModel = (model: CivitaiModel) => {
      if (!model.modelVersions || model.modelVersions.length === 0) {
        $q.notify({
          message: '没有可用的模型版本',
          color: 'negative'
        });
        return;
      }
      
      const latestVersion = model.modelVersions[0];
      const downloadUrl = civitaiApi.downloadModel(latestVersion.id);
      window.open(downloadUrl, '_blank');
      
      $q.notify({
        message: `开始下载模型: ${model.name}`,
        color: 'positive'
      });
    };
    
    const getPublishedDate = (model: CivitaiModel): string => {
      if (model.modelVersions && model.modelVersions.length > 0) {
        const version = model.modelVersions[0];
        return version.publishedAt || version.createdAt || model.createdAt;
      }
      return model.createdAt;
    };
    
    const formatDate = (dateString: string): string => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN');
      } catch (e) {
        return '日期格式错误';
      }
    };
    
    const truncateDescription = (description: string, maxLength = 100) => {
      if (!description) return '暂无描述';
      const plainText = description.replace(/<[^>]*>/g, '');
      if (plainText.length <= maxLength) return plainText;
      return plainText.substring(0, maxLength) + '...';
    };
    
    const getModelWebUrl = (modelId: string) => {
      return `https://civitai.com/models/${modelId}`;
    };
    
    const openModelPage = (modelId: string) => {
      const url = getModelWebUrl(modelId);
      window.open(url, '_blank');
    };
    
    // 使用Intersection Observer观察加载触发器
    let observer: IntersectionObserver | null = null;
    
    const setupIntersectionObserver = () => {
      if (!loadMore.value) return;
      
      // 清除旧的observer
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      
      observer = new IntersectionObserver(entries => {
        const [entry] = entries;
        console.log('观察到的元素可见性:', entry.isIntersecting, 'loadingMore:', loadingMore.value, 'hasMore:', hasMore.value);
        
        // 只要元素有一点进入视口就触发
        if (entry.isIntersecting && !loadingMore.value && hasMore.value) {
          console.log('触发加载更多');
          onLoadMore(); 
        }
      }, { 
        // 降低阈值，只要有一点可见就触发
        threshold: 0.1,
        // 扩大触发区域
        rootMargin: '200px 0px'
      });
      
      // 确保元素存在再观察
      nextTick(() => {
        if (loadMoreTrigger.value && observer) {
          console.log('开始观察加载更多触发器');
          observer.observe(loadMoreTrigger.value);
        } else {
          console.log('未找到加载更多触发器元素');
        }
      });
    };
    
    // 切换加载模式
    const toggleLoadMode = () => {
      loadMore.value = !loadMore.value;
      if (loadMore.value) {
        currentPage.value = 1;
        items.value = [];
        loadModels();
        setupIntersectionObserver();
      } else {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      }
    };
    
    // 展示信息的辅助函数
    const getAuthor = (model: CivitaiModel): string => {
      return model.creator?.username || '未知作者';
    };

    const formatNumber = (num: number): string => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      }
      return num.toString();
    };

    const getDownloads = (model: CivitaiModel): number => {
      return model.stats?.downloadCount || 0;
    };

    const getThumbs = (model: CivitaiModel): number => {
      return model.stats?.thumbsUpCount || 0;
    };

    const getTips = (model: CivitaiModel): number => {
      return model.stats?.tippedAmountCount || 0;
    };

    const getComments = (model: CivitaiModel): number => {
      return model.stats?.commentCount || 0;
    };

    const getViews = (model: CivitaiModel): number => {
      return model.stats?.viewCount || 0;
    };
    
    const getBaseModel = (model: CivitaiModel): string => {
      if (model.modelVersions && model.modelVersions.length > 0) {
        const lastVersion = model.modelVersions[model.modelVersions.length - 1];
        return lastVersion.baseModel || 'SD1';
      }
      return 'SD1';
    };
    
    // 添加onLoadMore函数，与加载更多按钮关联
    const onLoadMore = () => {
      if (loadingMore.value || !hasMore.value) return;
      
      if (nextPageUrl.value) {
        // 如果有nextPage URL，使用它
        console.log('使用nextPage URL加载更多:', nextPageUrl.value);
        loadingMore.value = true;
        loadModels(nextPageUrl.value);
      } else {
        // 否则回退到递增页码
        currentPage.value++;
        loadingMore.value = true;
        loadModels(currentPage.value);
      }
    };
    
    onMounted(() => {
      loadModels();
      console.log('热门模型组件挂载完成');
      
      // 默认启用自动加载更多
      loadMore.value = true;
      
      // 初始化后使用nextTick确保DOM已更新
      nextTick(() => {
        setupIntersectionObserver();
        console.log('已设置观察器，触发元素存在:', !!loadMoreTrigger.value);
      });
    });
    
    onUnmounted(() => {
      if (observer) {
        observer.disconnect();
      }
    });
    
    return {
      items,
      loading,
      errorMessage,
      currentPage,
      totalPages,
      loadModels,
      viewModel,
      downloadModel,
      getPublishedDate,
      formatDate,
      truncateDescription,
      getModelWebUrl,
      openModelPage,
      loadMoreTrigger,
      loadingMore,
      hasMore,
      loadMore,
      toggleLoadMode,
      scrollContainer,
      initialLoadComplete,
      getAuthor,
      formatNumber,
      getDownloads,
      getThumbs,
      getTips,
      getComments,
      getViews,
      getBaseModel,
      onLoadMore,
      nextPageUrl
    };
  }
});
</script>

<style scoped>
/* 样式与LatestModels组件保持一致 */
.models-container {
  position: relative;
  width: 100%;
  height: calc(100vh - 150px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.masonry-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 16px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.masonry-container::after {
  content: "";
  display: block;
  height: 20px;
}

.masonry-card {
  transition: all 0.3s ease;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  padding: 0;
  margin-bottom: 12px;
}

.image-container {
  position: relative;
  width: 100%;
  height: 100%;
}

/* 顶部渐变叠加层 */
.overlay-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%);
  color: white;
  z-index: 1;
}

/* 底部渐变叠加层 */
.overlay-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0) 100%);
  color: white;
  z-index: 1;
  padding-top: 40px;
}

.model-title {
  font-size: 1.2rem;
  font-weight: bold;
  margin-top: 8px;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.model-author {
  font-size: 0.9rem;
  margin-top: 4px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
}

.model-tags {
  margin-top: 8px;
}

.tag-badge {
  font-size: 0.7rem;
  opacity: 0.9;
}

.checkpoint-badge {
  display: inline-block;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: rgba(255,255,255,0.2);
}

.checkpoint-version {
  font-weight: bold;
  background-color: #1976D2;
  color: white;
  padding: 1px 4px;
  border-radius: 3px;
}

.stats-row {
  font-size: 0.8rem;
}

.overlay-top .stats-item {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
}

.overlay-top .q-icon {
  font-size: 0.9rem;
}

.w-100 {
  width: 100%;
}

.masonry-card[data-new="true"] {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 优化加载触发器的样式，移除背景和边框 */
.load-more-trigger {
  height: 60px;  /* 减小高度 */
  margin: 10px 0;  /* 减小上下边距 */
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  background-color: transparent;  /* 移除背景色 */
  /* 移除了border-radius */
}
</style> 