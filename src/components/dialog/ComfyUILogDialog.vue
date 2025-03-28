<template>
  <custom-dialog
    ref="customRef"
    :size="Size.LARGE"
    :title="t('base.comfyui_log')"
    :ok="false"
    :cancel="false"
  >
    <div class="my-scroll-container" ref="logContainerRef">
      <div class="log-container">
        <q-scroll-area class="log-scroll-wrapper" ref="scrollAreaRef">
          <log-empty-view
            v-if="logStore.logs.length == 0 && !loading"
            style="color: #bbb"
            center
          />
          <div
            v-else
            class="log-content"
            v-html="converter.ansi_to_html(logStore.logs.join('/n'))"
          />
        </q-scroll-area>
      </div>
      <div class="logs-tool-container row">
        <!--        <q-btn flat dense @click="handleRealtime">-->
        <!--          <q-icon-->
        <!--            size="24px"-->
        <!--            :color="themeVar.toolIconColor"-->
        <!--            name="stop"-->
        <!--            v-if="isRealtime"-->
        <!--          />-->
        <!--          <q-icon-->
        <!--            size="24px"-->
        <!--            :color="themeVar.toolIconColor"-->
        <!--            name="play_arrow"-->
        <!--            v-else-->
        <!--          />-->
        <!--        </q-btn>-->
        <!--        <q-separator spaced inset vertical :color="themeVar.splitColor" />-->

        <q-btn flat dense @click="logStore.fetchLogs()" :disable="isRealtime">
          <q-icon size="24px" :color="themeVar.toolIconColor" name="refresh" />
        </q-btn>
        <q-separator spaced inset vertical :color="themeVar.splitColor" />
        <q-btn flat dense @click="downloadLogs">
          <q-icon size="24px" :color="themeVar.toolIconColor" name="download" />
        </q-btn>
        <template v-if="isIframe">
          <q-separator spaced inset vertical :color="themeVar.splitColor" />
          <q-btn flat dense @click="openTab">
            <q-icon size="24px" :color="themeVar.toolIconColor" name="launch" />
          </q-btn>
        </template>
        <template v-if="fullscreen">
          <q-separator spaced inset vertical :color="themeVar.splitColor" />
          <q-btn
            :color="themeVar.toolIconColor"
            flat
            dense
            @click="toggle"
            :icon="$q.fullscreen.isActive ? 'fullscreen_exit' : 'fullscreen'"
          />
        </template>
      </div>
      <q-inner-loading
        :dark="themeVar.loadingDark"
        :color="themeVar.loadingColor"
        :showing="loading"
      >
      </q-inner-loading>
    </div>
  </custom-dialog>
</template>

<script setup lang="ts">
import CustomDialog from 'components/base/dialog/CustomDialog.vue';
import { Size } from 'components/base/dialog/type';
import { onMounted, reactive, ref } from 'vue';
import { useLogStore } from 'stores/logs';
import { saveAs } from 'file-saver';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { AnsiUp } from 'ansi_up';
import LogEmptyView from './LogEmptyView.vue';

const props = defineProps({
  theme: {
    type: String,
    default: 'dark',
  },
  fullscreen: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();
const customRef = ref();
const logStore = useLogStore();
const converter = new AnsiUp();
const loading = ref(false);
const logContainerRef = ref();
const scrollAreaRef = ref();
const scrollAreaWidth = ref(0);
const isRealtime = ref(false);
const $q = useQuasar();
// const perPageCount = 1000;
// const tailLines = ref(perPageCount);
// let element: any = null;
const isIframe = ref(self.top !== self);
const toggle = () => {
  const target = logContainerRef.value;
  $q.fullscreen.toggle(target);
};

const themeStyle: any = {
  light: {
    loadingDark: false,
    loadingColor: 'dark',
    fontWeight: 500,
    fontColor: '#303133',
    contentBG: '#f8f8f8',
    toolBG: '#ffffff',
    toolBorderColor: 'rgba(0,0,0,0.1)',
    splitColor: '',
    toolIconColor: 'grey-6',
  },
  dark: {
    loadingDark: true,
    loadingColor: 'white',
    fontWeight: 600,
    fontColor: '#b7c4d1',
    contentBG: '#242e42',
    toolBG: '#36435c',
    toolBorderColor: '',
    splitColor: 'grey-6',
    toolIconColor: 'grey-5',
  },
};

const themeVar = reactive(themeStyle[props.theme]);

onMounted(() => {
  // element = document.getElementById('box');
  scrollAreaWidth.value = window.innerWidth;
});

// onBeforeUnmount(() => {
//   clearLock();
// });

// const scrollToBottom = () => {
//   element && element.scrollIntoView();
// };

const downloadLogs = () => {
  if (logStore.logs.length > 0) {
    const blob = new Blob([logStore.logs.join('/n')], {
      type: 'text/plain;charset=utf-8',
    });
    saveAs(blob, `ComfyUI-${new Date().toLocaleDateString()}.log`);
  }
};

const openTab = () => {
  window.open(logStore.logs.join('/n'));
};

// const handleRealtime = () => {
//   isRealtime.value = !isRealtime.value;
//   scrollToBottom();
//   logStore.fetchLogs(false);
//   if (isRealtime.value) {
//     setLock();
//   } else {
//     clearLock();
//   }
// };

// const locker = ref();
// const clearLock = () => {
//   locker.value && clearTimeout(locker.value);
// };
// const setLock = () => {
//   clearLock();
//   locker.value = setTimeout(() => {
//     logStore.fetchLogs(false);
//   }, 5 * 1000);
// };
</script>

<style lang="scss" scoped>
.my-scroll-container {
  --fontWeight: v-bind(themeVar.fontWeight);
  --fontColor: v-bind(themeVar.fontColor);
  --contentBG: v-bind(themeVar.contentBG);
  --toolBG: v-bind(themeVar.toolBG);
  --toolBorderColor: v-bind(themeVar.toolBorderColor);
  height: 520px;
  position: relative;

  .logs-tool-container {
    position: absolute;
    right: 12px;
    top: 8px;
    z-index: 2;
    padding: 0 2px;
    border-radius: 8px;
    background: var(--toolBG);
    border: 1px solid var(--toolBorderColor);
  }

  .log-container {
    height: 100%;
    background: var(--contentBG);

    .log-view-more {
      font-size: 12px;
      color: var(--fontColor);
      cursor: pointer;
      height: 20px;
      translate: transformX(-50%);
    }

    .log-content {
      position: relative;
      padding: 40px 20px 20px;
      font-size: 12px;
      min-height: 120px;
      color: var(--fontColor);
      font-weight: var(--fontWeight);
      line-height: 20px;
      white-space: pre;
    }
  }

  ::v-deep(.log-scroll-wrapper) {
    height: 100%;
  }
}
</style>
