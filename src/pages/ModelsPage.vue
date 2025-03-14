<template>
  <q-page padding>
    <div class="text-h5 q-mb-md text-primary">模型管理中心</div>

    <!-- 2. 基础模型安装区域 -->
    <EssentialModelsCard />
    
    <!-- 3. 可选模型库 -->
    <OptionalModelsCard />
    
    <!-- 4. 已安装模型管理 -->
    <InstalledModelsCard />
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import EssentialModelsCard from '../components/models/EssentialModelsCard.vue';
import OptionalModelsCard from '../components/models/OptionalModelsCard.vue';
import InstalledModelsCard from '../components/models/InstalledModelsCard.vue';

export default defineComponent({
  name: 'ModelsPage',
  components: {
    EssentialModelsCard,
    OptionalModelsCard,
    InstalledModelsCard
  }
});
</script>