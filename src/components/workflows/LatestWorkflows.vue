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
                :placeholder-src="'https://placehold.co/300x300?text='+$t('discovery.loading')"
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
          <q-icon name="arrow_upward" /> {{ $t('discovery.pagination.page', { current: currentPage, total: totalPages }) }}
        </div>
        <div v-else class="text-grey-7">{{ $t('discovery.noMoreData') }}</div>
      </div>
    </div>
    
    <!-- 添加错误信息显示区域 -->
    <div v-if="errorMessage" class="text-center q-mt-lg text-negative">
      <q-icon name="error" size="2rem" />
      <p>{{ errorMessage }}</p>
      <q-btn color="primary" :label="$t('discovery.retry')" @click="resetAndRetry" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, nextTick } from 'vue';
import MasonryWall from '@yeger/vue-masonry-wall';
import { civitaiApi } from '../../api';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';

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
    const $q = useQuasar();
    const { t } = useI18n();
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
    
    // 添加标记是否正在使用直接访问Civitai的状态
    const isUsingDirectCivitai = ref(false);
    
    // 观察器实例
    let observer: IntersectionObserver | null = null;
    
    // 创建一个实时记录滚动位置的变量
    let lastScrollPosition = 0;
    let isRestoringScroll = false;
    
    // 在setup函数中添加一个错误状态和重试计数器
    const loadingError = ref(false);
    const retryCount = ref(0);
    const MAX_RETRIES = 3; // 最大重试次数
    
    // 滚动事件处理函数
    const handleScroll = () => {
      if (scrollContainer.value && !isRestoringScroll) {
        lastScrollPosition = scrollContainer.value.scrollTop;
      }
    };
    
    // 直接从Civitai API获取工作流数据
    const fetchDirectlyFromCivitai = async (page: number, limit: number) => {
      try {
        console.log('正在直接从Civitai API获取工作流数据...');
        
        // Civitai API基础URL
        const CIVITAI_API_URL = 'https://civitai.com/api/v1';
        
        // 构建查询参数，注意工作流需要特殊参数
        const params = new URLSearchParams({
          limit: limit.toString(),
          page: page.toString(),
          types: 'Workflows', // 指定类型为工作流
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
        console.error('直接从Civitai获取工作流数据失败:', error);
        throw error;
      }
    };
    
    // 使用直接URL从Civitai获取数据
    const fetchDirectlyWithUrl = async (url: string) => {
      try {
        console.log('Fetching data directly from Civitai with URL:', url);
        
        // 发起直接请求
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch data directly from Civitai with URL:', error);
        throw error;
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
          console.log('Loading workflows with params:', directUrl || `Page ${page}`);
          
          // 根据是否有直接URL决定调用方式
          response = directUrl 
            ? await civitaiApi.getLatestModelsWithUrl(directUrl) as CivitaiApiResponse
            : await civitaiApi.getLatestWorkflows(page, itemsPerPage) as CivitaiApiResponse;
        }
        
        console.log('Workflow loading result:', response);
        loadingError.value = false; // 加载成功，重置错误状态
        
        // 确保响应中包含items数组
        if (response && response.items) {
          // 首先为每个项目添加aspect ratio
          const processedItems = response.items.map((item: CivitaiModel) => {
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
            
            nextTick(restoreScrollPosition);
          } else {
            items.value = processedItems;
            
            // 首次加载完成后设置标志
            if (!initialLoadComplete.value) {
              initialLoadComplete.value = true;
            }
          }
          
          // 处理分页信息
          if (response.metadata) {
            // 设置当前页和总页数
            if (response.metadata.currentPage) {
              currentPage.value = response.metadata.currentPage;
            }
            
            // 计算总页数
            totalPages.value = response.metadata.totalPages || 
              Math.ceil((response.metadata.totalItems || 0) / itemsPerPage);
            
            // 保存下一页URL
            nextPageUrl.value = response.metadata.nextPage || '';
            
            // 判断是否还有更多数据
            hasMore.value = !!nextPageUrl.value || currentPage.value < totalPages.value;
            
            console.log('分页信息:', {
              currentPage: currentPage.value,
              totalPages: totalPages.value,
              hasNextPage: !!nextPageUrl.value,
              hasMore: hasMore.value
            });
          }
        } else {
          console.warn('响应中没有items数组或为空');
          
          if (!isLoadingMore) {
            errorMessage.value = '没有找到工作流数据';
            items.value = [];
          }
        }
      } catch (error) {
        console.error('Failed to load workflows:', error);
        loadingError.value = true; // 设置错误状态
        retryCount.value++; // 增加重试计数
        
        // 如果当前不是直接访问模式，尝试切换到直接访问
        if (!isUsingDirectCivitai.value) {
          try {
            isUsingDirectCivitai.value = true;
            console.log('Backend access failed, switching to direct Civitai access...');
            
            // 显示提示
            $q.notify({
              message: t('discovery.tryingDirectAccess'),
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
            if (response && response.items) {
              // 处理工作流数据
              const processedItems = response.items.map((item: CivitaiModel) => {
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
                
                return {
                  ...item,
                  ratio,
                  _isNew: isLoadingMore // 只有加载更多时才标记为新项
                };
              });
              
              // 更新数据
              if (isLoadingMore) {
                items.value = [...items.value, ...processedItems];
              } else {
                items.value = processedItems;
              }
              
              // 处理分页信息
              if (response.metadata) {
                // 设置当前页和总页数
                if (response.metadata.currentPage) {
                  currentPage.value = response.metadata.currentPage;
                }
                
                // 计算总页数
                totalPages.value = response.metadata.totalPages || 
                  Math.ceil((response.metadata.totalItems || 0) / itemsPerPage);
                
                // 保存下一页URL
                nextPageUrl.value = response.metadata.nextPage || '';
                
                // 判断是否还有更多数据
                hasMore.value = !!nextPageUrl.value || currentPage.value < totalPages.value;
              }
              
              // 通知用户
              $q.notify({
                message: t('discovery.switchedToDirectMode'),
                color: 'positive',
                timeout: 3000
              });
              
              // 重置错误状态，因为已经成功加载数据
              loadingError.value = false;
              retryCount.value = 0;
              errorMessage.value = '';
            }
          } catch (directError) {
            console.error('Direct access to Civitai also failed:', directError);
            
            if (!isLoadingMore) {
              errorMessage.value = t('discovery.fetchError');
              items.value = [];
            }
            
            // 重置回代理模式
            isUsingDirectCivitai.value = false;
          }
        } else {
          // 如果已经是直接访问模式下失败
          if (!isLoadingMore) {
            errorMessage.value = t('discovery.fetchError');
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
    
    // 设置观察器，用于监听加载更多触发器
    const setupIntersectionObserver = () => {
      if (!loadMore.value) return;
      
      // 清除旧的observer
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      
      observer = new IntersectionObserver(entries => {
        const [entry] = entries;
        
        if (entry.isIntersecting && !loadingMore.value && hasMore.value) {
          console.log('触发加载更多');
          onLoadMore();
        }
      }, {
        threshold: 0.1,
        rootMargin: '200px 0px'
      });
      
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
        setupIntersectionObserver();
      } else {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      }
    };
    
    // 打开模型页面
    const openModelPage = (modelId: string) => {
      window.open(`https://civitai.com/models/${modelId}`, '_blank');
      console.log(t('discovery.viewingModel', { modelId }));
    };
    
    // 下载模型
    const downloadModel = (model: CivitaiModel) => {
      if (!model.modelVersions || model.modelVersions.length === 0) {
        $q.notify({
          message: t('discovery.noVersionsAvailable'),
          color: 'negative'
        });
        return;
      }
      
      const latestVersion = model.modelVersions[0];
      const downloadUrl = civitaiApi.downloadModel(latestVersion.id);
      window.open(downloadUrl, '_blank');
      
      $q.notify({
        message: t('discovery.startDownloading', { model: model.name }),
        color: 'positive'
      });
    };
    
    // 展示信息的辅助函数
    const getAuthor = (model: CivitaiModel): string => {
      return model.creator?.username || t('discovery.unknownAuthor');
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
      loadingError.value = false;
      retryCount.value = 0;
      
      // 重新加载
      loadModels();
    };

    // 修改onLoadMore函数，添加错误状态检查
    const onLoadMore = () => {
      // 如果正在加载、没有更多数据，或者处于错误状态且已达到最大重试次数，则不加载更多
      if (loadingMore.value || !hasMore.value || (loadingError.value && retryCount.value >= MAX_RETRIES)) {
        return;
      }
      
      // 重置错误状态，允许重试
      if (loadingError.value && retryCount.value < MAX_RETRIES) {
        console.log(`重试加载数据，第${retryCount.value}次重试`);
        loadingError.value = false; // 重试前重置错误状态
      }
      
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
    
    // 获取工作流图片函数
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
      getBaseModel,
      resetAndRetry,
      $t: t
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