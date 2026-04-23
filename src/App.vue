<template>
  <router-view v-slot="{ Component, route }">
    <transition :name="(route.meta.transition || 'fade')" mode="out-in">
      <component :is="Component" :key="route.path" />
    </transition>
  </router-view>
</template>

<script setup lang="ts">
</script>

<style>
/* 全局页面切换动效 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-left-enter-from {
  transform: translateX(40px);
  opacity: 0;
}
.slide-left-leave-to {
  transform: translateX(-40px);
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-right-enter-from {
  transform: translateX(-40px);
  opacity: 0;
}
.slide-right-leave-to {
  transform: translateX(40px);
  opacity: 0;
}

.expand-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.expand-leave-active {
  transition: all 0.25s ease;
}
.expand-enter-from {
  opacity: 0;
  transform: scale(0.96);
}
.expand-leave-to {
  opacity: 0;
  transform: scale(1.02);
}
</style>
