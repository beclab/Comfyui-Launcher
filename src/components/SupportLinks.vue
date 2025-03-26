<template>
  <div class="q-mt-xl row justify-center q-gutter-md">
    <q-btn v-for="link in supportLinks" :key="link.name" flat class="support-btn" :href="link.url" target="_blank">
      <template v-if="link.text">{{ link.text }}</template>
      <template v-if="link.images">
        <img v-for="(img, index) in link.images" :key="index" :src="img.src" :style="`height: ${img.height}`" :class="img.class">
      </template>
    </q-btn>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SupportLinks',
  data() {
    return {
      supportLinks: [
        { name: 'support', text: 'Get Support', url: '#' },
        { name: 'comfyorg', text: 'ComfyOrg', url: '#' },
        { 
          name: 'social', 
          url: '#',
          images: [
            { src: '~assets/discord-logo.png', height: '20px', class: 'q-mr-xs' },
            { src: '~assets/github-logo.png', height: '20px', class: '' }
          ]
        },
        {
          name: 'civitai',
          url: '#',
          images: [
            { src: '~assets/civitai-logo.png', height: '20px', class: '' }
          ]
        }
      ]
    }
  }
});
</script>

<style scoped>
.support-btn {
  border-radius: 8px;
  padding: 8px 16px;
}
</style> 