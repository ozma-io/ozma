<template functional>
  <div class="progressbar">
    <div class="progressbar__line" />
  </div>
</template>

<style scoped>
  .progressbar {
    position: fixed;
    top: 0;
    z-index: 999;
    width: 100%;
    height: 5px;
    background: #dee2e6;
  }

  .progressbar__line {
    width: 33.333%;
    left: 0;
    background: #000;
    height: 100%;
    animation: 1000ms move ease-in-out infinite;
    transition: 500ms all linear;
    position: absolute;
  }

  @keyframes move {
    from {
      left: -33.333%;
    }

    to {
      width: 200%;
      left: 100%;
    }
  }
</style>
