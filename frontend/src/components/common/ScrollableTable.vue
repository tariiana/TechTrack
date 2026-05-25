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
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  margin-top: 15px;
  overflow: hidden;
}

.table-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid var(--border-color, #e0e4e8);
  border-radius: var(--border-radius, 8px);
  background: white;
}

/* Стилизация скроллбаров */
.table-scroll::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.table-scroll::-webkit-scrollbar-track {
  background: var(--scrollbar-track, #e0e4e8);
  border-radius: 6px;
}

.table-scroll::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, #2c5f8a);
  border-radius: 6px;
  cursor: pointer;
}

.table-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, #1e4566);
}

.table-wrapper {
  display: inline-block;
  min-width: 100%;
}

/* Стили для таблицы */
.table-wrapper :deep(table) {
  width: 100%;
  border-collapse: collapse;
  min-width: max-content;
  border: none;
}

/* Границы для ячеек */
.table-wrapper :deep(th),
.table-wrapper :deep(td) {
  border: 1px solid var(--border-color, #e0e4e8);
  padding: 10px 12px;
  text-align: left;
}

/* Убираем двойную границу сверху у первой строки */
.table-wrapper :deep(thead tr:first-child th) {
  border-top: none;
}

/* Убираем двойную границу слева у первой колонки */
.table-wrapper :deep(th:first-child),
.table-wrapper :deep(td:first-child) {
  border-left: none;
}

/* Убираем двойную границу справа у последней колонки */
.table-wrapper :deep(th:last-child),
.table-wrapper :deep(td:last-child) {
  border-right: none;
}

/* Убираем двойную границу снизу у последней строки */
.table-wrapper :deep(tbody tr:last-child td) {
  border-bottom: none;
}

/* Фиксируем заголовок */
.table-wrapper :deep(th) {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--bg-table-header, #f8f9fa);
  font-weight: 600;
}

.table-wrapper :deep(th):hover {
  background-color: var(--bg-table-header-hover, #e8f0fe);
}
</style>