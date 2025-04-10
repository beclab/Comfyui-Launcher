<template>
  <q-card flat class="plugin-card q-py-sm">
    <q-card-section class="q-py-sm">
      <div class="row items-center no-wrap">
        <!-- ID列 -->
        <div class="col-1">
          <div class="text-caption">{{ plugin.id }}</div>
        </div>
        
        <!-- 名称列 -->
        <div class="col-2">
          <div class="text-weight-medium">{{ plugin.name }}</div>
        </div>
        
        <!-- 版本列 -->
        <div class="col-1 text-center">
          <div class="text-caption">{{ plugin.version }}</div>
        </div>
        
        <!-- 状态列 -->
        <div class="col-1 text-center">
          <q-chip
            dense
            :color="plugin.installed ? (plugin.disabled ? 'orange' : 'green') : 'grey'"
            :text-color="plugin.installed ? 'white' : 'black'"
            size="sm"
          >
            {{ plugin.installed ? (plugin.disabled ? '已禁用' : '已安装') : '未安装' }}
          </q-chip>
        </div>
        
        <!-- 作者列 -->
        <div class="col-1">
          <div class="text-caption">{{ plugin.author }}</div>
        </div>
        
        <!-- 描述列 -->
        <div class="col-4 ellipsis-2-lines">
          {{ plugin.description }}
        </div>
        
        <!-- 操作列 -->
        <div class="col-2 text-right">
          <!-- 查看详情按钮 -->
          <q-btn
            flat
            round
            dense
            color="primary"
            icon="visibility"
            @click="onShowInfo"
            class="q-mr-xs"
          >
            <q-tooltip>查看详情</q-tooltip>
          </q-btn>
          
          <!-- GitHub跳转按钮 -->
          <q-btn
            v-if="plugin.github"
            flat
            round
            dense
            color="primary"
            icon="code"
            @click="openGithub"
            class="q-mr-xs"
          >
            <q-tooltip>访问GitHub</q-tooltip>
          </q-btn>
          
          <!-- 安装/卸载按钮 -->
          <q-btn
            flat
            round
            dense
            :color="plugin.installed ? 'negative' : 'positive'"
            :icon="plugin.installed ? 'delete' : 'download'"
            :loading="!!installationInProgress"
            @click="plugin.installed ? onUninstall : onInstall"
            class="q-mr-xs"
          >
            <q-tooltip>{{ plugin.installed ? '卸载' : '安装' }}</q-tooltip>
          </q-btn>
          
          <!-- 启用/禁用按钮 (仅对已安装插件显示) -->
          <q-btn
            v-if="plugin.installed"
            flat
            round
            dense
            color="primary"
            :icon="plugin.disabled ? 'play_arrow' : 'pause'"
            :loading="!!stateChanging"
            @click="onToggleState"
          >
            <q-tooltip>{{ plugin.disabled ? '启用' : '禁用' }}</q-tooltip>
          </q-btn>
          
          <!-- 下载按钮 -->
          <q-btn
            v-if="plugin.installed"
            flat
            round
            dense
            color="primary"
            icon="file_download"
          >
            <q-tooltip>下载</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

// Define props
const props = defineProps({
  plugin: {
    type: Object,
    required: true,
  },
  installationInProgress: {
    type: [Boolean, Number],
    default: false,
  },
  uninstallationInProgress: {
    type: [Boolean, Number],
    default: false,
  },
  stateChanging: {
    type: [Boolean, Number],
    default: false,
  },
  installationProgress: {
    type: [Number, Boolean],
    default: 0,
  },
});

// Define events
const emit = defineEmits([
  'install', 
  'uninstall', 
  'toggle-state', 
  'show-info',
]);



const onInstall = () => {
  emit('install', props.plugin);
};

const onUninstall = () => {
  emit('uninstall', props.plugin);
};

const onToggleState = () => {
  emit('toggle-state', props.plugin);
};

const openGithub = () => {
  window.open(props.plugin.github, '_blank');
};

const onShowInfo = () => {
  emit('show-info', props.plugin);
};
</script>

<style scoped>
.plugin-card {
  transition: background-color 0.3s;
}

.plugin-card:hover {
  background-color: #f5f5f5;
}

.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style> 