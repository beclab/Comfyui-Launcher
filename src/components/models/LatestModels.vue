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
      
      <div ref="loadMoreTrigger" class="text-center q-py-md">
        <q-spinner v-if="loadingMore" color="primary" size="2em" />
        <div v-else-if="hasMore" class="text-grey-7">上拉加载更多</div>
        <div v-else class="text-grey-7">没有更多数据了</div>
      </div>
    </div>
    
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
      <q-btn color="primary" label="重试" @click="resetAndRetry" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, nextTick } from 'vue';
import MasonryWall from '@yeger/vue-masonry-wall';
import { civitaiApi } from '../../api';
import { useQuasar } from 'quasar';

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
  ratio?: number; // 我们添加的属性，用于UI显示
  _isNew?: boolean; // 添加标记新项目的属性
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
  }
}

export default defineComponent({
  name: 'LatestModels',
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
    const itemsPerPage = 12;
    const loadMoreTrigger = ref<HTMLElement | null>(null);
    const loadingMore = ref(false);
    const hasMore = ref(true);
    const loadMore = ref(false); // 切换自动加载更多模式
    const nextPageUrl = ref('');
    const scrollContainer = ref<HTMLElement | null>(null);
    const initialLoadComplete = ref(false); // 跟踪初始加载是否完成
    let scrollPosition = 0;
    
    // 添加标记是否正在使用直接访问Civitai的状态
    const isUsingDirectCivitai = ref(false);
    
    // 直接从Civitai API获取模型
    const fetchDirectlyFromCivitai = async (page: number, limit: number) => {
      try {
        console.log('正在直接从Civitai API获取数据...');
        
        // Civitai API基础URL
        const CIVITAI_API_URL = 'https://civitai.com/api/v1';
        
        // 构建查询参数
        const params = new URLSearchParams({
          limit: limit.toString(),
          page: page.toString(),
          sort: 'Newest',
          period: 'AllTime',
          nsfw: 'false'
        });
        
        // 发起直接请求
        const response = await fetch(`${CIVITAI_API_URL}/models?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('直接从Civitai获取数据失败:', error);
        throw error;
      }
    };
    
    // 使用直接URL从Civitai获取数据
    const fetchDirectlyWithUrl = async (url: string) => {
      try {
        console.log('正在使用完整URL直接从Civitai获取数据:', url);
        
        // 发起直接请求
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('使用URL直接从Civitai获取数据失败:', error);
        throw error;
      }
    };
    
    // 加载模型数据
    const loadModels = async (pageOrEvent?: number | Event | string) => {
      // 如果是加载更多，记录滚动位置
      const isLoadingMore = loadingMore.value;
      
      if (isLoadingMore && scrollContainer.value) {
        // 使用ref直接访问DOM元素
        scrollPosition = scrollContainer.value.scrollTop;
        console.log('记录滚动位置:', scrollPosition);
      }
      
      // 确定是使用页码还是直接URL
      let page = currentPage.value;
      let directUrl = '';
      
      // 如果传入的是字符串URL，直接使用
      if (typeof pageOrEvent === 'string' && pageOrEvent.startsWith('http')) {
        directUrl = pageOrEvent;
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
        let response;
        
        // 根据当前模式决定如何获取数据
        if (isUsingDirectCivitai.value) {
          // 已经在使用直接Civitai访问模式
          if (directUrl) {
            response = await fetchDirectlyWithUrl(directUrl);
          } else {
            response = await fetchDirectlyFromCivitai(page, itemsPerPage);
          }
        } else {
          // 默认通过后端代理
          if (directUrl) {
            console.log('使用直接URL通过后端加载:', directUrl);
            response = await civitaiApi.getLatestModelsWithUrl(directUrl) as CivitaiApiResponse;
          } else {
            console.log('使用页码通过后端加载第', page, '页数据');
            response = await civitaiApi.getLatestModels(page, itemsPerPage) as CivitaiApiResponse;
          }
        }
        
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
            
            // 确保每个项目都有唯一ID
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
            // 添加新项目
            items.value = [...items.value, ...newItems];
            
            // 在DOM更新后，立即尝试恢复滚动位置
            // 使用nextTick等待DOM更新
            nextTick(() => {
              // 立即尝试恢复滚动位置
              if (scrollContainer.value) {
                scrollContainer.value.scrollTop = scrollPosition;
                
                // 设置一个观察器监视布局变化
                let attempts = 0;
                const maxAttempts = 10;
                const interval = setInterval(() => {
                  if (scrollContainer.value && attempts < maxAttempts) {
                    scrollContainer.value.scrollTop = scrollPosition;
                    attempts++;
                  } else {
                    clearInterval(interval);
                  }
                }, 50); // 每50ms尝试一次，总共尝试10次
              }
            });
          } else {
            // 首次加载完成后设置标志
            items.value = newItems;
            if (!initialLoadComplete.value) {
              initialLoadComplete.value = true;
            }
          }
          
          // 保存nextPage URL
          nextPageUrl.value = response.metadata?.nextPage || '';
          // 判断是否还有更多数据
          hasMore.value = !!nextPageUrl.value;
          console.log('是否有更多数据:', hasMore.value, '下一页URL:', nextPageUrl.value);
        } else {
          if (!isLoadingMore) {
            errorMessage.value = '返回数据格式不正确';
            items.value = [];
          }
        }
      } catch (error) {
        console.error('加载模型失败:', error);
        
        // 如果当前不是直接访问模式，尝试切换到直接访问
        if (!isUsingDirectCivitai.value) {
          try {
            isUsingDirectCivitai.value = true;
            console.log('通过后端访问失败，切换到直接访问Civitai...');
            
            // 显示提示
            $q.notify({
              message: '正在尝试直接访问Civitai...',
              color: 'warning',
              timeout: 2000
            });
            
            let response;
            if (directUrl) {
              response = await fetchDirectlyWithUrl(directUrl);
            } else {
              response = await fetchDirectlyFromCivitai(page, itemsPerPage);
            }
            
            // 处理直接访问返回的数据
            if (response.items && Array.isArray(response.items)) {
              // 处理新加载的数据
              const newItems = response.items.map((item: CivitaiModel) => {
                // 提取第一个模型版本的图片信息
                const firstVersion = item.modelVersions && item.modelVersions.length > 0 
                  ? item.modelVersions[0] 
                  : null;
                
                const firstImage = firstVersion?.images && firstVersion.images.length > 0
                  ? firstVersion.images[0]
                  : null;
                
                let ratio = 1;
                if (firstImage && firstImage.width && firstImage.height) {
                  ratio = firstImage.width / firstImage.height;
                }
                
                return {
                  ...item,
                  coverImage: item.coverImage || '', 
                  images: firstVersion?.images || [],
                  ratio: ratio,
                  description: item.description || '暂无描述',
                  _isNew: true,
                };
              });
              
              // 更新数据
              if (isLoadingMore) {
                items.value = [...items.value, ...newItems];
              } else {
                items.value = newItems;
              }
              
              // 保存nextPage URL
              nextPageUrl.value = response.metadata?.nextPage || '';
              hasMore.value = !!nextPageUrl.value;
              
              // 通知用户
              $q.notify({
                message: '已切换到直接访问Civitai模式',
                color: 'positive',
                timeout: 3000
              });
              
              // 清除错误信息，因为已经成功加载数据
              errorMessage.value = '';
            }
          } catch (directError) {
            console.error('直接访问Civitai也失败:', directError);
            
            if (!isLoadingMore) {
              errorMessage.value = '获取模型列表失败，请检查网络连接后重试';
              items.value = [];
            }
            
            // 重置回代理模式
            isUsingDirectCivitai.value = false;
          }
        } else {
          // 如果已经是直接访问模式下失败
          if (!isLoadingMore) {
            errorMessage.value = '获取模型列表失败，请检查网络连接后重试';
            items.value = [];
          }
        }
      } finally {
        if (isLoadingMore) {
          loadingMore.value = false;
        } else {
          loading.value = false;
        }
      }
    };
    
    // 查看模型详情
    const viewModel = (modelId: string) => {
      // 这里可以使用路由导航到详情页，或者打开一个模态框
      $q.notify({
        message: `查看模型 ID: ${modelId}`,
        color: 'info'
      });
    };
    
    // 下载模型
    const downloadModel = (model: CivitaiModel) => {
      if (!model.modelVersions || model.modelVersions.length === 0) {
        $q.notify({
          message: '没有可用的模型版本',
          color: 'negative'
        });
        return;
      }
      
      // 获取最新版本
      const latestVersion = model.modelVersions[0];
      const downloadUrl = civitaiApi.downloadModel(latestVersion.id);
      
      // 打开下载链接
      window.open(downloadUrl, '_blank');
      
      $q.notify({
        message: `开始下载模型: ${model.name}`,
        color: 'positive'
      });
    };
    
    // 获取模型的发布日期（使用最新版本的发布日期）
    const getPublishedDate = (model: CivitaiModel): string => {
      // 如果有模型版本，则使用最新版本的发布日期
      if (model.modelVersions && model.modelVersions.length > 0) {
        // 最新版本通常是数组中的第一个
        return model.modelVersions[0].publishedAt || model.createdAt || '';
      }
      // 如果没有模型版本，则回退到模型创建日期
      return model.createdAt || '';
    };
    
    // 日期格式化
    const formatDate = (dateString: string) => {
      if (!dateString) return '未知日期';
      
      try {
        const date = new Date(dateString);
        
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
          return '日期格式错误';
        }
        
        // 使用更可靠的格式化方法
        return new Intl.DateTimeFormat('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(date);
      } catch (error) {
        console.error('日期格式化错误:', error);
        return '日期格式错误';
      }
    };
    
    // 截断描述文本，同时移除HTML标签
    const truncateDescription = (description: string, maxLength = 100) => {
      if (!description) return '暂无描述';
      
      // 移除HTML标签
      const plainText = description.replace(/<[^>]*>/g, '');
      
      // 截断文本
      if (plainText.length <= maxLength) return plainText;
      
      return plainText.substring(0, maxLength) + '...';
    };
    
    // 获取模型在 Civitai 上的网页链接
    const getModelWebUrl = (modelId: string) => {
      return `https://civitai.com/models/${modelId}`;
    };
    
    // 在新标签页中打开模型页面
    const openModelPage = (modelId: string) => {
      const url = getModelWebUrl(modelId);
      window.open(url, '_blank');
    };
    
    // 确保loadNextPage函数暴露给组件
    const onLoadMore = () => {
      // 直接调用现有的loadNextPage函数
      if (loadingMore.value || !hasMore.value) return;
      
      if (nextPageUrl.value) {
        currentPage.value++; 
        loadingMore.value = true;
        loadModels(nextPageUrl.value);
      } else {
        currentPage.value++;
        loadingMore.value = true;
        loadModels();
      }
    };
    
    // 保留原有的loadNextPage但不导出
    const loadNextPage = onLoadMore;
    
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
        // 当触发器元素几乎完全可见时才加载更多
        if (entry.isIntersecting && entry.intersectionRatio > 0.5 && !loadingMore.value && hasMore.value) {
          loadNextPage();
        }
      }, { 
        // 修改阈值，当元素50%可见时触发
        threshold: 0.5,
        // 添加rootMargin使元素提前触发
        rootMargin: '100px 0px'
      });
      
      if (loadMoreTrigger.value && observer) {
        observer.observe(loadMoreTrigger.value);
      }
    };
    
    // 切换加载模式
    const toggleLoadMode = () => {
      loadMore.value = !loadMore.value;
      if (loadMore.value) {
        // 重置到第一页开始无限加载
        currentPage.value = 1;
        items.value = [];
        loadModels();
        setupIntersectionObserver();
      } else {
        // 清除观察器
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      }
    };
    
    // 添加这些新方法到setup函数中
    const getAuthor = (model: CivitaiModel): string => {
      // 从数据中提取作者信息，如果没有就显示"未知作者"
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
    
    // 修改重置逻辑，允许重置访问模式
    const resetAndRetry = () => {
      // 重置状态
      isUsingDirectCivitai.value = false;
      currentPage.value = 1;
      items.value = [];
      errorMessage.value = '';
      
      // 重新加载
      loadModels();
    };
    
    onMounted(() => {
      loadModels();
      console.log('组件挂载完成，当前items:', items.value);
      // 默认启用自动加载更多
      loadMore.value = true;
      setupIntersectionObserver();
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
      onLoadMore,
      resetAndRetry,
      getAuthor,
      formatNumber,
      getDownloads,
      getThumbs,
      getTips,
      getViews,
      getBaseModel
    };
  }
});
</script>

<style scoped>
/* 添加容器样式，设置固定高度和内部滚动 */
.models-container {
  position: relative;
  width: 100%;
  height: calc(100vh - 150px); /* 减去头部和其他元素的高度 */
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.masonry-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 16px;
  /* 添加平滑滚动效果 */
  scroll-behavior: smooth;
  /* 在支持的浏览器中使用更平滑的滚动 */
  -webkit-overflow-scrolling: touch;
}

/* 确保内容底部有足够空间触发加载 */
.masonry-container::after {
  content: "";
  display: block;
  height: 20px; /* 底部填充 */
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
}

/* 增加底部叠加层的高度 */
.overlay-bottom {
  padding-top: 40px; /* 增加顶部内边距使渐变更加明显 */
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

/* 添加触发器样式 */
.load-more-trigger {
  height: 50px;
  margin: 20px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
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