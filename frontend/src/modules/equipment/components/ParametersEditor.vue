<!-- src/modules/equipment/components/ParametersEditor.vue -->
<template>
  <div class="parameters-editor">
    <ScrollableTable>
      <table class="data-table">
        <thead>
          <tr>
            <th>Параметр</th>
            <th>Значение</th>
            <th>Ед. изм.</th>
            <th>Основной</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(param, key) in localParams" :key="key">
            <td><input v-model="param.name" class="form-control" placeholder="название" /></td>
            <td><input v-model="param.value" class="form-control" placeholder="значение" /></td>
            <td><input v-model="param.unit" class="form-control" placeholder="ед. изм." /></td>
            <td class="center"><input type="checkbox" v-model="param.isMain" /></td>
            <td class="center"><button class="btn-icon" @click="removeParameter(key)">🗑️</button></td>
          </tr>
        </tbody>
      </table>
    </ScrollableTable>
    <div class="add-row">
      <button class="btn btn-sm btn-secondary" @click="openAddModal">+ Добавить параметр</button>
    </div>

    <!-- Модальное окно для нового параметра -->
    <div class="modal-overlay" v-if="showAddModal" @click.self="closeAddModal">
      <div class="modal-content" style="width: 400px;">
        <div class="modal-header">Новый параметр</div>
        <div class="modal-body">
          <div class="form-group">
            <label>Название (ключ)</label>
            <input v-model="newParamKey" class="form-control" />
          </div>
          <div class="form-group">
            <label>Значение</label>
            <input v-model="newParamValue" class="form-control" />
          </div>
          <div class="form-group">
            <label>Единица измерения</label>
            <input v-model="newParamUnit" class="form-control" />
          </div>
          <div class="form-group">
            <label><input type="checkbox" v-model="newParamIsMain" /> Основной параметр</label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeAddModal">Отмена</button>
          <button class="btn btn-primary" @click="addParameter">Добавить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import ScrollableTable from '@/components/common/ScrollableTable.vue';
const props = defineProps<{
  modelValue: Record<string, any>;
  template?: Record<string, any> | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void;
}>();

// Внутреннее представление: { ключ: { name, value, unit, isMain } }
const localParams = ref<Record<string, any>>({});

const showAddModal = ref(false);
const newParamKey = ref('');
const newParamValue = ref('');
const newParamUnit = ref('');
const newParamIsMain = ref(false);

function syncFromExternal() {
  const external = props.modelValue || {};
  const newParams: Record<string, any> = {};
  for (const [key, val] of Object.entries(external)) {
    if (typeof val === 'object' && val !== null) {
      newParams[key] = {
        name: val.name || key,
        value: val.value ?? '',
        unit: val.unit ?? '',
        isMain: val.isMain ?? false,
      };
    } else {
      newParams[key] = {
        name: key,
        value: String(val),
        unit: '',
        isMain: false,
      };
    }
  }
  localParams.value = newParams;
}

function syncToExternal() {
  const result: Record<string, any> = {};
  for (const [key, item] of Object.entries(localParams.value)) {
    result[key] = {
      value: item.value,
      unit: item.unit,
      isMain: item.isMain,
    };
  }
  emit('update:modelValue', result);
}

watch(() => props.template, (newTemplate) => {
  if (newTemplate && Object.keys(newTemplate).length) {
    const newParams: Record<string, any> = {};
    for (const [key, tpl] of Object.entries(newTemplate)) {
      const tplObj = tpl as any;
      newParams[key] = {
        name: tplObj.name || key,
        value: tplObj.value ?? '',
        unit: tplObj.unit ?? '',
        isMain: tplObj.isMain ?? false,
      };
    }
    localParams.value = newParams;
    syncToExternal();
  }
}, { immediate: true });

function addParameter() {
  const key = newParamKey.value.trim();
  if (!key) {
    alert('Введите название параметра');
    return;
  }
  localParams.value[key] = {
    name: key,
    value: newParamValue.value,
    unit: newParamUnit.value,
    isMain: newParamIsMain.value,
  };
  syncToExternal();
  closeAddModal();
}

function removeParameter(key: string) {
  delete localParams.value[key];
  syncToExternal();
}

function openAddModal() {
  newParamKey.value = '';
  newParamValue.value = '';
  newParamUnit.value = '';
  newParamIsMain.value = false;
  showAddModal.value = true;
}

function closeAddModal() {
  showAddModal.value = false;
}

onMounted(() => {
  syncFromExternal();
});

watch(localParams, () => syncToExternal(), { deep: true });
</script>

<style scoped>
.parameters-editor {
  width: 100%;
}
.table-wrapper {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th,
.data-table td {
  border: 1px solid #e2e8f0;
  padding: 6px 8px;
  text-align: left;
}
.center {
  text-align: center;
}
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
}
.add-row {
  margin-top: 8px;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
}
.modal-header {
  padding: 12px 16px;
  border-bottom: 1px solid #ddd;
  font-weight: bold;
}
.modal-body {
  padding: 16px;
}
.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid #ddd;
  text-align: right;
}
.form-group {
  margin-bottom: 12px;
}
.form-group label {
  display: block;
  margin-bottom: 4px;
}
.form-control {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}
.btn-secondary {
  background: #e0e4e8;
  border: 1px solid #cbd5e1;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-primary {
  background: #1976d2;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
:deep(.scrollable-table-container) {
  height: 300px;
  max-height: 300px;
}

:deep(.table-scroll) {
  overflow-y: auto !important;
}

:deep(th) {
  position: sticky;
  top: 0;
  background: #f8f9fa;
  z-index: 10;
}
</style>