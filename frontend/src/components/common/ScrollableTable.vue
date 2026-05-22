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
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  background: white;
}

.table-scroll::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.table-scroll::-webkit-scrollbar-track {
  background: #e0e4e8;
  border-radius: 6px;
}

.table-scroll::-webkit-scrollbar-thumb {
  background: #2c5f8a;
  border-radius: 6px;
  cursor: pointer;
}

.table-scroll::-webkit-scrollbar-thumb:hover {
  background: #1e4566;
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

/* Фиксируем заголовок */
.table-wrapper :deep(th) {
  position: sticky;
  top: 0;
  background: #f8f9fa;
  z-index: 10;
}
</style>