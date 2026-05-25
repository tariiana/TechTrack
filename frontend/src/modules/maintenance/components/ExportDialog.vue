<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 400px;">
      <div class="modal-header">Экспорт данных</div>
      
      <div class="form-group">
        <label>Формат файла</label>
        <select v-model="format" class="form-control">
          <option value="excel">Microsoft Excel (.xlsx)</option>
          <option value="word">Microsoft Word (.docx)</option>
        </select>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" @click="exportData">Экспортировать</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/toast';
import { ref } from 'vue';
import * as exportUtils from '@/utils/exportUtils';

const visible = ref(false);
const format = ref<'excel' | 'word'>('excel');
let currentData: any[] = [];
let currentHeaders: string[] = [];
let currentFilename = '';

function open(data: any[], headers?: string[], filename?: string) {
  currentData = data;
  currentHeaders = headers || (data[0] ? Object.keys(data[0]) : []);
  currentFilename = filename || `export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
  visible.value = true;
}

function close() {
  visible.value = false;
}

function exportData() {
  if (currentData.length === 0) {
    showToast('Нет данных для экспорта', 'error');
    return;
  }
  
  if (format.value === 'excel') {
    exportUtils.exportToExcel(currentData, currentFilename);
    showToast('Экспорт в Excel выполнен успешно', 'success');
  } else {
    exportUtils.exportToWord(currentData, currentHeaders, currentFilename);
    showToast('Экспорт в Word выполнен успешно', 'success');
  }
  close();
}

defineExpose({ open });
</script>