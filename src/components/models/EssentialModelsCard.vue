<template>
  <q-card class="q-mb-lg">
    <q-card-section>
      <div class="row items-center q-mb-md">
        <div class="col-auto">
          <q-select
            v-model="essentialModelStore.downloadSource"
            :options="essentialModelStore.downloadSourceOptions"
            label="下载源"
            dense
            outlined
            style="min-width: 180px"
            class="q-mr-md"
          />
          <q-btn
            color="primary"
            icon="download"
            label="安装基础模型"
            @click="essentialModelStore.downloadEssentialModels"
            :loading="
              essentialModelStore.isDownloading &&
              !!essentialModelStore.downloadTaskId &&
              !essentialModelStore.installing
            "
            :disable="
              essentialModelStore.isDownloading ||
              essentialModelStore.allEssentialModelsInstalled
            "
          />
        </div>
      </div>

      <!-- 基础模型下载进度显示 - 合并的统一布局 -->
      <div
        v-if="
          essentialModelStore.isDownloading &&
          essentialModelStore.downloadTaskId
        "
        class="download-progress-panel"
      >
        <div class="progress-header">
          <div>
            <div class="text-subtitle1">正在下载基础模型</div>
            <span class="model-count-indicator">
              模型
              {{
                essentialModelStore.currentDownloadState.currentModelIndex + 1
              }}/{{ essentialModelStore.essentialModels.length || 0 }}
            </span>
          </div>
          <q-btn
            flat
            color="negative"
            label="取消下载"
            icon="cancel"
            @click="essentialModelStore.cancelDownload"
          />
        </div>

        <div class="progress-details">
          <div class="text-subtitle2 q-mb-sm">
            {{
              essentialModelStore.currentModel
                ? essentialModelStore.currentModel.name
                : '准备下载...'
            }}
            <q-chip size="sm" outline
              >{{
                essentialModelStore.currentModel
                  ? essentialModelStore.getModelTypeName(currentModel.type)
                  : ''
              }}
            </q-chip>
          </div>

          <q-linear-progress
            :value="
              essentialModelStore.currentDownloadState.currentModelProgress /
              100
            "
            size="20px"
            color="primary"
          >
            <div class="absolute-full flex flex-center">
              <q-badge
                color="white"
                text-color="primary"
                :label="`${essentialModelStore.formatPercentage(
                  essentialModelStore.currentDownloadState.currentModelProgress
                )}%`"
              />
            </div>
          </q-linear-progress>

          <div class="download-stats q-mt-md">
            <div class="stat-item">
              <q-icon name="save" size="sm" />
              <span
                >文件大小:
                {{
                  essentialModelStore.formatFileSize(
                    currentDownloadState.totalBytes
                  )
                }}</span
              >
            </div>
            <div class="stat-item">
              <q-icon name="cloud_download" size="sm" />
              <span
                >已下载:
                {{
                  essentialModelStore.formatFileSize(
                    currentDownloadState.downloadedBytes
                  )
                }}</span
              >
            </div>
            <div class="stat-item">
              <q-icon name="speed" size="sm" />
              <span
                >下载速度:
                {{
                  essentialModelStore.formatSpeed(currentDownloadState.speed)
                }}</span
              >
            </div>
            <div class="stat-item">
              <q-icon name="percent" size="sm" />
              <span
                >总体进度:
                {{
                  essentialModelStore.currentDownloadState.overallProgress.toFixed(
                    1
                  )
                }}%</span
              >
            </div>
          </div>
        </div>

        <!-- 下载历史 -->
        <div class="download-history">
          <div class="text-subtitle2 q-mb-sm">下载历史</div>
          <div
            v-for="(log, index) in essentialModelStore.downloadLogs"
            :key="index"
            class="log-item"
          >
            <q-badge
              :color="essentialModelStore.getLogBadgeColor(log.status)"
              :label="log.status"
            />
            <span>{{ log.message }}</span>
            <span class="log-time">{{ log.time }}</span>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { useEssentialModelStore } from 'stores/essentialModel';

const essentialModelStore = useEssentialModelStore();
</script>
<style scoped>
.download-progress-panel {
  margin-top: 20px;
  padding: 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.progress-details {
  margin-bottom: 20px;
}

.download-history {
  margin-top: 20px;
  max-height: 300px;
  overflow-y: auto;
  border-top: 1px solid #eee;
  padding-top: 10px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding: 5px;
  border-bottom: 1px dashed #eee;
  color: #999;
  margin-left: auto;
  font-size: 12px;
}

.download-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 15px;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}

.stat-item {
  color: var(--q-primary);
  display: flex;
  align-items: center;
  gap: 5px;
}
</style>
