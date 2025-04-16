<template>
  <q-card flat bordered class="resource-packs-card">
    <q-card-section>
      <div class="row items-center justify-between">
        <div>
          <div class="text-h6">{{ $t('resourcePacks.title') }}</div>
          <div class="text-caption">{{ $t('resourcePacks.subtitle') }}</div>
        </div>
        
        <div>
          <q-btn 
            outline 
            color="grey-7" 
            icon="refresh" 
            :label="$t('resourcePacks.refresh')" 
            @click="loadResourcePacks" 
            :loading="loading"
          />
        </div>
      </div>
    </q-card-section>
    
    <q-separator />
    
    <q-card-section>
      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner color="primary" size="3em" />
        <div class="q-mt-md">{{ $t('resourcePacks.loading') }}</div>
      </div>
      
      <div v-else-if="packs.length === 0" class="text-center q-pa-lg text-grey">
        <q-icon name="inventory_2" size="3em" />
        <div class="q-mt-md">{{ $t('resourcePacks.noPacks') }}</div>
      </div>
      
      <div v-else class="row q-col-gutter-md">
        <div v-for="pack in packs" :key="pack.id" class="col-12 col-md-6 col-lg-4">
          <q-card flat bordered class="resource-pack-item">
            <q-card-section>
              <div class="text-h6">{{ pack.name }}</div>
              <div class="text-caption q-mt-sm">{{ pack.description }}</div>
            </q-card-section>
            
            <q-card-section class="q-pt-none">
              <div class="row items-center">
                <q-chip dense outline color="primary">
                  {{ $t('resourcePacks.resources', { count: pack.resources.length }) }}
                </q-chip>
                <q-chip v-if="pack.author" dense outline color="grey">
                  {{ $t('resourcePacks.author') }}: {{ pack.author }}
                </q-chip>
              </div>
            </q-card-section>
            
            <q-card-actions align="right">
              <q-btn 
                flat 
                color="grey-7" 
                icon="visibility" 
                :label="$t('resourcePacks.view')" 
                @click="viewResourcePack(pack.id)" 
              />
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </q-card-section>
    
    <!-- 资源包详情对话框 -->
    <resource-pack-dialog
      v-model:visible="dialogVisible"
      :pack-id="selectedPackId"
      @installation-complete="onInstallationComplete"
    />
  </q-card>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import api from '../../api';
import ResourcePackDialog from './ResourcePackDialog.vue';
import { useQuasar } from 'quasar';

// 资源包接口定义
interface ResourcePackResource {
  id: string;
  name: string;
  type: string;
  description?: string;
  url: string;
  size?: number;
  options?: any;
}

interface ResourcePack {
  id: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  website?: string;
  resources: ResourcePackResource[];
}

export default defineComponent({
  name: 'ResourcePacksCard',
  
  components: {
    ResourcePackDialog
  },
  
  setup() {
    const $q = useQuasar();
    const packs = ref<ResourcePack[]>([]);
    const loading = ref(false);
    const dialogVisible = ref(false);
    const selectedPackId = ref('');
    
    // 加载资源包列表
    const loadResourcePacks = async () => {
      loading.value = true;
      
      try {
        const response = await api.get('resource-packs');
        packs.value = response.data.data || [];
      } catch (err: any) {
        console.error('Failed to load resource packs:', err);
        $q.notify({
          color: 'negative',
          message: err.response?.data?.message || '加载资源包失败',
          icon: 'error'
        });
      } finally {
        loading.value = false;
      }
    };
    
    // 查看资源包详情
    const viewResourcePack = (packId: string) => {
      console.log('Opening resource pack details, packId:', packId);
      selectedPackId.value = packId;
      dialogVisible.value = true;
    };
    
    // 安装完成回调
    const onInstallationComplete = (result: { success: boolean, error?: string, packId?: string }) => {
      // 可以在这里执行安装完成后的操作，例如刷新列表等
      console.log('Installation completed:', result);
    };
    
    onMounted(() => {
      loadResourcePacks();
    });
    
    return {
      packs,
      loading,
      dialogVisible,
      selectedPackId,
      loadResourcePacks,
      viewResourcePack,
      onInstallationComplete
    };
  }
});
</script>

<style scoped>
.resource-packs-card {
  border-radius: var(--border-radius-xl);
  display: flex;
  flex-direction: column;
  max-height: 600px; /* Add fixed height for the card */
}

.resource-pack-item {
  height: 100%;
  border-radius: var(--border-radius-lg);
  transition: all 0.3s ease;
}

.resource-pack-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

/* Add scrollable container for the pack list */
.q-card-section:has(.row.q-col-gutter-md) {
  overflow-y: auto;
  flex: 1 1 auto;
}
</style> 