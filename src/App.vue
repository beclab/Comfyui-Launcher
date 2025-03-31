<template>
  <router-view />
</template>

<script setup lang="ts">
import { supportLanguages } from 'src/i18n';
import { i18n } from 'src/boot/i18n';

let terminusLanguage = '';
let terminusLanguageInfo: any = document.querySelector(
  'meta[name="terminus-language"]'
);
if (terminusLanguageInfo && terminusLanguageInfo.content) {
  terminusLanguage = terminusLanguageInfo.content;
} else {
  terminusLanguage = navigator.language;
}

console.log(navigator.language);

if (terminusLanguage) {
  if (supportLanguages.find((e) => e.value == terminusLanguage)) {
    i18n.global.locale.value = terminusLanguage as any;
  }
}
</script>
