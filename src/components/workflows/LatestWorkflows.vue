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
                :src="getWorkflowImage(item)" 
                :style="{ aspectRatio: item.ratio || '16/9' }"
                :placeholder-src="'https://placehold.co/300x300?text=加载中'"
              >
                <template v-slot:error>
                  <div class="absolute-full flex flex-center bg-grey-3 text-grey-8">
                    <q-icon name="image" size="3em" />
                  </div>
                </template>
              </q-img>
              
              <!-- 顶部叠加层 - workflow信息和统计数据 -->
              <div class="overlay-top">
                <div class="row justify-between items-center w-100">
                  <div class="workflow-badge">
                    <span>Checkpoint</span>
                    <span class="workflow-version q-ml-xs">{{ getBaseModel(item) }}</span>
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
                  <q-badge v-for="tag in item.tags.slice(0, 3)" :key="tag" color="purple" text-color="white" class="q-mr-xs tag-badge">
                    {{ tag }}
                  </q-badge>
                </div>
              </div>
            </div>
          </q-card>
        </template>
      </masonry-wall>
      
      <!-- 加载更多触发器 -->
      <div ref="loadMoreTrigger" class="text-center q-py-lg q-my-md load-more-trigger">
        <q-spinner v-if="loadingMore" color="primary" size="2em" />
        <div v-else-if="hasMore" class="text-grey-7">
          <q-icon name="arrow_upward" /> 上拉加载更多（页码: {{currentPage}}/{{totalPages}}）
        </div>
        <div v-else class="text-grey-7">没有更多数据了</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, nextTick } from 'vue';
import MasonryWall from '@yeger/vue-masonry-wall';
import { civitaiApi } from '../../api';

// 定义Civitai模型接口
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

// 定义API响应接口
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
  name: 'LatestWorkflows',
  components: {
    MasonryWall
  },
  setup() {
    const items = ref<CivitaiModel[]>([]);
    const loading = ref(true);
    const errorMessage = ref('');
    const currentPage = ref(1);
    const totalPages = ref(1);
    const itemsPerPage = 24;
    const loadMoreTrigger = ref<HTMLElement | null>(null);
    const loadingMore = ref(false);
    const hasMore = ref(true);
    const loadMore = ref(true); // 默认启用无限滚动
    const scrollContainer = ref<HTMLElement | null>(null);
    const initialLoadComplete = ref(false);
    let scrollPosition = 0;
    const nextPageUrl = ref('');
    
    // 观察器实例
    let observer: IntersectionObserver | null = null;
    
    // 创建一个实时记录滚动位置的变量
    let lastScrollPosition = 0;
    let isRestoringScroll = false;
    
    // 滚动事件处理函数
    const handleScroll = () => {
      if (scrollContainer.value && !isRestoringScroll) {
        lastScrollPosition = scrollContainer.value.scrollTop;
      }
    };
    
    // 加载最新工作流数据
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
        console.log('加载工作流，参数:', directUrl || `第${page}页`);
        
        // 根据是否有直接URL决定调用方式
        const response = directUrl 
          ? await civitaiApi.getLatestModelsWithUrl(directUrl) as CivitaiApiResponse
          : await civitaiApi.getLatestWorkflows(page, itemsPerPage) as CivitaiApiResponse;
        
        console.log('工作流加载结果:', response);
        
        // 确保响应中包含items数组
        if (response && response.items) {
          // 首先为每个项目添加aspect ratio
          const processedItems = response.items.map(item => {
            // 找到主图像
            let mainImage = null;
            
            if (item.coverImage) {
              mainImage = { url: item.coverImage };
            } else if (item.modelVersions && item.modelVersions.length > 0) {
              const latestVersion = item.modelVersions[item.modelVersions.length - 1];
              if (latestVersion.images && latestVersion.images.length > 0) {
                mainImage = latestVersion.images[0];
              }
            } else if (item.images && item.images.length > 0) {
              mainImage = item.images[0];
            }
            
            // 设置合理的宽高比
            let ratio = 16/9; // 工作流默认为宽屏截图比例
            
            if (mainImage && mainImage.width && mainImage.height) {
              ratio = mainImage.width / mainImage.height;
            }
            
            // 标记是否为新加载项
            return {
              ...item,
              ratio,
              _isNew: isLoadingMore // 只有加载更多时才标记为新项
            };
          });
          
          // 根据是加载更多还是新加载决定是追加还是替换
          if (isLoadingMore) {
            items.value = [...items.value, ...processedItems];
            
            // 更稳健的滚动恢复方法
            const restoreScrollPosition = () => {
              if (scrollContainer.value) {
                isRestoringScroll = true;
                console.log('尝试恢复滚动位置:', lastScrollPosition);
                scrollContainer.value.scrollTop = lastScrollPosition;
                
                // 延迟后再次尝试恢复位置
                setTimeout(() => {
                  if (scrollContainer.value) {
                    scrollContainer.value.scrollTop = lastScrollPosition;
                    
                    // 允许继续记录滚动位置
                    setTimeout(() => {
                      isRestoringScroll = false;
                    }, 100);
                  }
                }, 50);
              }
            };
            
            // 使用nextTick并添加短延迟确保DOM已完全更新
            nextTick(() => {
              setTimeout(restoreScrollPosition, 100);
            });
          } else {
            items.value = processedItems;
          }
          
          // 更新分页信息
          if (response.metadata) {
            console.log('API返回的metadata:', response.metadata);
            
            // 确保正确计算totalPages
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
          console.error('无效的响应格式:', response);
          errorMessage.value = '获取工作流数据失败: 无效的响应格式';
        }
      } catch (error) {
        console.error('加载工作流失败:', error);
        errorMessage.value = `获取工作流数据失败: ${(error as Error).message}`;
      } finally {
        loading.value = false;
        loadingMore.value = false;
        initialLoadComplete.value = true;
        
        // 如果是加载更多，恢复滚动位置
        if (isLoadingMore && scrollContainer.value) {
          nextTick(() => {
            if (scrollContainer.value) {
              scrollContainer.value.scrollTop = scrollPosition;
              console.log('恢复滚动位置:', scrollPosition);
            }
          });
        }
        
        // 初始化或重新设置Intersection Observer
        if (loadMore.value) {
          nextTick(() => {
            setupIntersectionObserver();
          });
        }
      }
    };
    
    // 使用Intersection Observer观察加载触发器
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
    
    // 打开模型详情页
    const openModelPage = (modelId: string) => {
      window.open(`https://civitai.com/models/${modelId}`, '_blank');
    };
    
    // 处理下载
    const downloadModel = (versionId: string) => {
      const url = civitaiApi.downloadModel(versionId);
      window.open(url, '_blank');
    };
    
    // 切换加载模式（无限滚动/分页）
    const toggleLoadMode = () => {
      loadMore.value = !loadMore.value;
      
      if (loadMore.value) {
        nextTick(() => {
          setupIntersectionObserver();
        });
      } else if (observer) {
        observer.disconnect();
        observer = null;
      }
    };
    
    // 格式化数字
    const formatNumber = (num: number): string => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      } else {
        return num.toString();
      }
    };
    
    // 获取作者信息
    const getAuthor = (model: CivitaiModel): string => {
      return model.creator?.username || '未知作者';
    };
    
    // 获取统计信息
    const getDownloads = (model: CivitaiModel): number => {
      return model.stats?.downloadCount || 0;
    };
    
    const getThumbs = (model: CivitaiModel): number => {
      return model.stats?.thumbsUpCount || 0;
    };
    
    const getTips = (model: CivitaiModel): number => {
      return model.stats?.tippedAmountCount || 0;
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
    
    // 在setup函数中添加正确的图片获取函数
    const getWorkflowImage = (item: CivitaiModel) => {
      // 首先尝试获取封面图
      if (item.coverImage) return item.coverImage;
      
      // 然后检查modelVersions中的图片
      if (item.modelVersions && item.modelVersions.length > 0) {
        const latestVersion = item.modelVersions[item.modelVersions.length - 1];
        if (latestVersion.images && latestVersion.images.length > 0) {
          return latestVersion.images[0].url;
        }
      }
      
      // 再尝试获取顶层images
      if (item.images && item.images.length > 0) {
        return item.images[0].url;
      }
      
      // 最后使用默认图片
      return 'https://placehold.co/600x400?text=工作流';
    };
    
    onMounted(() => {
      loadModels();
      console.log('工作流组件挂载完成');
      
      // 添加滚动事件监听器
      if (scrollContainer.value) {
        scrollContainer.value.addEventListener('scroll', handleScroll);
      }
      
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
      
      // 移除滚动事件监听器
      if (scrollContainer.value) {
        scrollContainer.value.removeEventListener('scroll', handleScroll);
      }
    });
    
    return {
      items,
      loading,
      errorMessage,
      currentPage,
      totalPages,
      loadModels,
      openModelPage,
      downloadModel,
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
      getViews,
      onLoadMore,
      nextPageUrl,
      getWorkflowImage,
      getBaseModel
    };
  }
});
</script>

<style scoped>
/* 样式大部分沿用LatestModels，但将checkpoint相关样式替换为workflow */
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

.workflow-badge {
  display: inline-block;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: rgba(255,255,255,0.2);
}

.workflow-version {
  font-weight: bold;
  background-color: #9C27B0; /* 使用紫色区分工作流 */
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

/* 优化加载触发器的样式，移除背景和边框 */
.load-more-trigger {
  height: 60px;
  margin: 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  background-color: transparent;
}

/* 添加新卡片的淡入动画 */
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
</style> 