<template>
  <div>
    <div class="parameters-header">
      <h3>Параметры</h3>
      <button v-if="canEdit" class="btn btn-sm btn-primary" @click="openAddParamForm">+ Добавить параметр</button>
    </div>

    <div class="table-wrapper" v-if="parameters.length">
      <table class="data-table">
        <thead>
          <tr>
            <th>Параметр</th>
            <th>Значение</th>
            <th>Ед. изм.</th>
            <th>Основной</th>
            <th v-if="canEdit">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="param in parameters" :key="param.parameter_id">
            <td>{{ param.name }}</td>
            <td>{{ param.value }}</td>
            <td>{{ param.unit || '-' }}</td>
            <td>{{ param.is_main ? '✅' : '' }}</td>
            <td v-if="canEdit" class="actions-cell">
              <button class="btn btn-sm btn-secondary" @click="editParam(param)">✏️</button>
              <button class="btn btn-sm btn-danger" @click="confirmDeleteParam(param.parameter_id)">🗑️</button>
            </td>
          </tr>
          <tr v-if="parameters.length === 0">
            <td colspan="5">Нет параметров</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-message">Нет параметров</div>

    <!-- Модальное окно добавления/редактирования параметра -->
    <div class="modal-overlay" v-if="showParamModal">
      <div class="modal-content" style="width: 500px">
        <div class="modal-header">{{ isEditParam ? 'Редактирование параметра' : 'Добавление параметра' }}</div>
        
        <div class="form-group">
          <label>Наименование*</label>
          <input v-model="paramForm.name" class="form-control" :class="{ 'invalid': errors.name }">
          <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Значение*</label>
            <input v-model="paramForm.value" class="form-control" :class="{ 'invalid': errors.value }">
            <span v-if="errors.value" class="error-text">{{ errors.value }}</span>
          </div>
          <div class="form-group">
            <label>Единица измерения</label>
            <input v-model="paramForm.unit" class="form-control">
          </div>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="paramForm.is_main"> Основной параметр
          </label>
        </div>
        
        <div v-if="paramError" class="error-text">{{ paramError }}</div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeParamModal">Отмена</button>
          <button class="btn btn-primary" @click="saveParam">Сохранить</button>
        </div>
      </div>
    </div>

    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useResourcesStore } from '../stores/resourcesStore';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';

const props = defineProps<{
  resourceId: string;  // теперь строка (UUID)
}>();

const emit = defineEmits(['refresh']);

const store = useResourcesStore();
const confirmDialog = ref();

const parameters = ref<any[]>([]);
const showParamModal = ref(false);
const isEditParam = ref(false);
const editParamKey = ref<string | null>(null);
const paramError = ref('');

const errors = ref({
  name: '',
  value: '',
});

const paramForm = ref({
  name: '',
  value: '',
  unit: '',
  is_main: false,
});

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

async function loadParameters() {
  const resource = await store.fetchResourceById(props.resourceId);
  if (resource && resource.resource_params) {
    const params = resource.resource_params;
    const paramsArray: any[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (key !== 'measurements' && typeof value === 'object' && value !== null) {
        paramsArray.push({
          parameter_id: key,
          name: key,
          value: (value as any).value || value,
          unit: (value as any).unit || '',
          is_main: (value as any).is_main || false,
        });
      } else if (key !== 'measurements' && typeof value !== 'object') {
        paramsArray.push({
          parameter_id: key,
          name: key,
          value: value,
          unit: '',
          is_main: false,
        });
      }
    }
    parameters.value = paramsArray;
  }
}

function openAddParamForm() {
  resetParamForm();
  showParamModal.value = true;
}

function editParam(param: any) {
  isEditParam.value = true;
  editParamKey.value = param.parameter_id;
  paramForm.value = {
    name: param.name,
    value: param.value,
    unit: param.unit || '',
    is_main: param.is_main || false,
  };
  showParamModal.value = true;
}

function resetParamForm() {
  paramForm.value = {
    name: '',
    value: '',
    unit: '',
    is_main: false,
  };
  isEditParam.value = false;
  editParamKey.value = null;
  paramError.value = '';
  errors.value = { name: '', value: '' };
}

function closeParamModal() {
  showParamModal.value = false;
  resetParamForm();
}

function validateParam(): boolean {
  let isValid = true;
  errors.value = { name: '', value: '' };
  
  if (!paramForm.value.name.trim()) {
    errors.value.name = 'Введите наименование';
    isValid = false;
  }
  if (!paramForm.value.value.toString().trim()) {
    errors.value.value = 'Введите значение';
    isValid = false;
  }
  
  return isValid;
}

async function saveParam() {
  if (!validateParam()) return;
  
  try {
    // Получаем текущий ресурс целиком
    const resource = await store.fetchResourceById(props.resourceId);
    if (!resource) throw new Error('Ресурс не найден');
    
    // Копируем текущие resource_params
    const currentParams = resource.resource_params || {};
    const { measurements, ...cleanParams } = currentParams; // measurements не трогаем
    
    const paramName = paramForm.value.name;
    const newValue = {
      value: paramForm.value.value,
      unit: paramForm.value.unit,
      is_main: paramForm.value.is_main,
    };
    
    if (isEditParam.value && editParamKey.value) {
      // Удаляем старый ключ, если имя изменилось
      if (editParamKey.value !== paramName) {
        delete cleanParams[editParamKey.value];
      }
      cleanParams[paramName] = newValue;
    } else {
      cleanParams[paramName] = newValue;
    }
    
    // Теперь нужно обновить ресурс, передав все поля (name, mark, initial_resource и т.д.)
    // Формируем payload для upsertResource
    const payload = {
      name: resource.name,
      mark: resource.mark,
      type: resource.type,
      production_date: resource.production_date,
      registration_number: resource.registration_number,
      service_life: resource.service_life,
      time_to_service: resource.time_to_service,
      initial_resource: resource.initial_resource,
      remaining_resource: resource.remaining_resource,
      installed_in: resource.installed_in,
      location: resource.location,
      note: resource.note,
      resource_params: cleanParams,
    };
    
    await store.upsertResource(props.resourceId, payload);
    closeParamModal();
    await loadParameters();
    emit('refresh');
  } catch (err: any) {
    paramError.value = err.message || 'Ошибка сохранения параметра';
  }
}

async function confirmDeleteParam(parameterId: string) {
  const ok = await confirmDialog.value?.show('Удаление', 'Удалить параметр?');
  if (ok) {
    await deleteParam(parameterId);
  }
}

async function deleteParam(parameterId: string) {
  try {
    const resource = await store.fetchResourceById(props.resourceId);
    const currentParams = resource.resource_params || {};
    const { measurements, ...cleanParams } = currentParams;
    
    // Удаляем параметр по ключу
    delete cleanParams[parameterId];
    
    await store.upsertResource(props.resourceId, { resource_params: cleanParams });
    await loadParameters();
    emit('refresh');
  } catch (err: any) {
    console.error('Ошибка удаления параметра:', err);
  }
}

// Загружаем параметры при монтировании и при изменении resourceId
watch(() => props.resourceId, () => {
  loadParameters();
}, { immediate: true });

defineExpose({ loadParameters });
</script>

<style scoped>
.parameters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.empty-message {
  color: #999;
  font-style: italic;
  padding: 10px;
}
.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}
.form-row .form-group {
  flex: 1;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.invalid {
  border-color: #c0392b !important;
  background-color: #ffe0e0;
}
.error-text {
  color: #c0392b;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}
.actions-cell {
  white-space: nowrap;
}
.actions-cell .btn {
  margin-right: 4px;
}
</style>