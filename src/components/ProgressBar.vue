<template>
  <div class="progressbar">
    <div class="progressbar__line" />
  </div>
</template>

<style scoped>
.progressbar {
  position: fixed;
  top: 0;
  z-index: 999999;
  background: #dee2e6;
  width: 100%;
  height: 2px;
}

.progressbar__line {
  position: absolute;
  left: 0;
  animation: 1000ms move ease-in-out infinite;
  transition: 500ms all linear;
  background: #000;
  width: 33.333%;
  height: 100%;
}

@keyframes move {
  from {
    left: -33.333%;
  }

  to {
    left: 100%;
    width: 200%;
  }
}
</style>
