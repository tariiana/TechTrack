<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
    <div class="modal-content" style="width: 800px; max-width: 90vw;">
      <div class="modal-header">{{ isEdit ? 'Редактирование узла' : 'Добавление узла' }}</div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px;">
        <!-- Левая колонка -->
        <div>
          <div class="form-group">
            <label>Наименование *</label>
            <input v-model="form.name" class="form-control" />
            <div v-if="errors.name" class="error-text">{{ errors.name }}</div>
          </div>
          <div class="form-group">
            <label>Производитель</label>
            <input v-model="form.manufacturer" class="form-control" />
          </div>
          <div class="form-group">
            <label>Марка</label>
            <input v-model="form.model" class="form-control" />
          </div>
          <div class="form-group">
            <label>Заводской номер</label>
            <input v-model="form.serial_number" class="form-control" />
          </div>
          <div class="form-group">
            <label>Инвентарный номер</label>
            <input v-model="form.inventory_number" class="form-control" />
          </div>
          <div class="form-group">
            <label>Учётный номер</label>
            <input v-model="form.registration_number" class="form-control" />
          </div>
          <div class="form-group">
            <label>Подсистема</label>
            <input v-model="form.subsystem_name" class="form-control" />
          </div>
          <div class="form-group">
            <label>Вид узла</label>
            <select v-model="form.nodeTypeId" class="form-control" @change="onNodeTypeChange">
              <option :value="null">-- Не выбран --</option>
              <option v-for="type in store.nodeTypes" :key="type.node_type_id" :value="type.node_type_id">
                {{ type.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Правая колонка -->
        <div>
          <div class="form-group">
            <label>Состояние</label>
            <select v-model="form.status" class="form-control">
              <option value="получен">Получен</option>
              <option value="исправен">Исправен</option>
              <option value="неисправен">Неисправен</option>
              <option value="в ремонте">В ремонте</option>
              <option value="на поверке">На поверке</option>
              <option value="законсервирован">Законсервирован</option>
              <option value="списан">Списан</option>
            </select>
          </div>
          <div class="form-group">
            <label>Размещение</label>
            <input v-model="form.location" class="form-control" />
          </div>
          <div class="form-group">
            <label>Ресурс</label>
            <input v-model="form.resource" class="form-control" />
          </div>
          <div class="form-group">
            <label>Режим работы (часов в неделю)</label>
            <input type="number" v-model="form.operation_mode" class="form-control" />
          </div>
          <div class="form-group">
            <label>Дата производства</label>
            <input type="date" v-model="form.manufactured_date" class="form-control" />
          </div>
          <div class="form-group">
            <label>Дата ввода в эксплуатацию</label>
            <input type="date" v-model="form.commission_date" class="form-control" />
          </div>
          <div class="form-group">
            <label>Средство измерения (СИ)</label>
            <select v-model="form.is_si" class="form-control">
              <option :value="false">Нет</option>
              <option :value="true">Да</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Параметры оборудования (редактор таблицы) -->
      <div class="form-group" style="padding: 0 16px 16px 16px;">
        <label>Параметры оборудования</label>
        <ParametersEditor v-model="parametersObject" :template="selectedNodeTypeTemplate" />
        <small class="hint">Отметьте «Основной», если параметр должен показываться в общей таблице.</small>
      </div>

      <div class="form-group" style="padding: 0 16px;">
        <label>Установлен в (ID родительского узла)</label>
        <input type="text" v-model="form.installed_in_node" class="form-control" placeholder="node_id (опционально)" />
      </div>

      <div class="form-group" style="padding: 0 16px;">
        <label>Примечание</label>
        <textarea v-model="form.note" rows="2" class="form-control"></textarea>
      </div>

      <div v-if="error" class="error-text" style="padding: 0 16px;">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? 'Сохранение...' : 'Сохранить' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { useEquipmentStore } from '../stores/equipmentStore';
import ParametersEditor from './ParametersEditor.vue';

const store = useEquipmentStore();

const props = defineProps<{
  visible: boolean;
  nodeId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'saved'): void;
}>();

const isEdit = computed(() => !!props.nodeId);
const saving = ref(false);
const error = ref('');
const errors = reactive({ name: '' });

// Форма (поля в snake_case)
const form = reactive({
  name: '',
  manufacturer: '',
  model: '',
  serial_number: '',
  inventory_number: '',
  registration_number: '',
  subsystem_name: '',
  status: 'получен',
  location: '',
  resource: '',
  operation_mode: null as number | null,
  manufactured_date: '',
  commission_date: '',
  is_si: false,
  installed_in_node: null as string | null,
  note: '',
  nodeTypeId: null as string | null,
});

const parametersObject = ref<Record<string, any>>({});
const selectedNodeTypeTemplate = ref<Record<string, any> | null>(null);

// Обработчик смены вида узла
function onNodeTypeChange() {
  const nodeTypeId = form.nodeTypeId;
  if (!nodeTypeId) {
    selectedNodeTypeTemplate.value = null;
    return;
  }
  const nodeType = store.nodeTypes.find((t: any) => t.node_type_id === nodeTypeId);
  if (nodeType?.parameters) {
    // Параметры вида узла могут быть массивом или объектом. Приведём к объекту с шаблоном.
    let template = nodeType.parameters;
    if (Array.isArray(template)) {
      // Преобразуем массив в объект { ключ: { name, value, unit, isMain } }
      const objTemplate: Record<string, any> = {};
      for (const item of template) {
        objTemplate[item.label] = {
          name: item.name,
          value: item.value ?? '',
          unit: item.unit ?? '',
          isMain: item.show ?? true,
        };
      }
      selectedNodeTypeTemplate.value = objTemplate;
    } else {
      selectedNodeTypeTemplate.value = template;
    }
  } else {
    selectedNodeTypeTemplate.value = null;
  }
}

async function loadNodeData() {
  if (!props.nodeId) return;
  const node = await store.getNode(props.nodeId);
  if (node) {
    form.name = node.name || '';
    form.manufacturer = node.manufacturer || '';
    form.model = node.model || '';
    form.serial_number = node.serial_number || '';
    form.inventory_number = node.inventory_number || '';
    form.registration_number = node.registration_number || '';
    form.subsystem_name = node.subsystem_name || '';
    form.status = node.status || 'получен';
    form.location = node.location || '';
    form.resource = node.resource || '';
    form.operation_mode = node.operation_mode || null;
    form.manufactured_date = node.manufactured_date || '';
    form.commission_date = node.commission_date || '';
    form.is_si = node.is_si || false;
    form.installed_in_node = node.installed_in_node || null;
    form.note = node.note || '';
    form.nodeTypeId = node.node_type_id || null;
    parametersObject.value = node.parameters || {};
    // Загружаем шаблон, если есть вид узла
    if (form.nodeTypeId) {
      const nodeType = store.nodeTypes.find((t: any) => t.node_type_id === form.nodeTypeId);
      if (nodeType?.parameters) selectedNodeTypeTemplate.value = nodeType.parameters;
    }
  }
}

function resetForm() {
  Object.assign(form, {
    name: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    inventory_number: '',
    registration_number: '',
    subsystem_name: '',
    status: 'получен',
    location: '',
    resource: '',
    operation_mode: null,
    manufactured_date: '',
    commission_date: '',
    is_si: false,
    installed_in_node: null,
    note: '',
    nodeTypeId: null,
  });
  parametersObject.value = {};
  selectedNodeTypeTemplate.value = null;
  error.value = '';
  errors.name = '';
}

function validate(): boolean {
  if (!form.name.trim()) {
    errors.name = 'Введите наименование';
    return false;
  }
  errors.name = '';
  return true;
}

async function save() {
  if (!validate()) return;
  saving.value = true;
  error.value = '';

  const data = {
    name: form.name,
    manufacturer: form.manufacturer,
    model: form.model,
    serial_number: form.serial_number,
    inventory_number: form.inventory_number,
    registration_number: form.registration_number,
    subsystem_name: form.subsystem_name,
    status: form.status,
    location: form.location,
    resource: form.resource,
    operation_mode: form.operation_mode,
    manufactured_date: form.manufactured_date,
    commission_date: form.commission_date,
    is_si: form.is_si,
    installed_in_node: form.installed_in_node,
    note: form.note,
    node_type_id: form.nodeTypeId,
    parameters: parametersObject.value,
  };

  try {
    if (isEdit.value && props.nodeId) {
      await store.updateNode(props.nodeId, data);
    } else {
      await store.addNode(data);
    }
    emit('saved');
    close();
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

function close() {
  emit('update:visible', false);
  resetForm();
}

watch(() => props.visible, (newVal) => {
  if (newVal && props.nodeId) loadNodeData();
  else if (newVal && !props.nodeId) resetForm();
}, { immediate: true });
</script>

<style scoped>
/* стили такие же, как в предыдущей версии, плюс добавить .hint */
.hint { font-size: 12px; color: #6c757d; margin-top: 4px; display: block; }

</style>