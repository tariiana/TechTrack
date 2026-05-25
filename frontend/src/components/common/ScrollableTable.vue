<template>
  <div class="scrollable-table-container">
    <div class="table-scroll">
      <div class="table-wrapper">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollable-table-container {
  width: 100%;
  height: 500px;
  max-height: calc(100vh - 300px);
  display: flex;
  flex-direction: column;
  margin-top: 15px;
}

.table-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background: white;
}

.table-scroll::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.table-scroll::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 6px;
}

.table-scroll::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 6px;
  cursor: pointer;
}

.table-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

.table-wrapper {
  display: inline-block;
  min-width: 100%;
}

.table-wrapper :deep(table) {
  width: 100%;
  border-collapse: collapse;
  min-width: max-content;
}

.table-wrapper :deep(th) {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--bg-table-header);
}

.table-wrapper :deep(th):hover {
  background-color: var(--bg-table-header-hover);
}
</style>