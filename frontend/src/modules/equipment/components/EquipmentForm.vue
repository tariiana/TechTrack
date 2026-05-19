<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 700px">
      <div class="modal-header">{{ isEdit ? 'Редактирование узла' : 'Добавление узла' }}</div>

      <div class="form-row">
        <div class="form-group">
          <label>Наименование*</label>
          <input v-model="form.name" class="form-control" />
        </div>
        <div class="form-group">
          <label>Марка</label>
          <input v-model="form.model" class="form-control" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Производитель</label>
          <input v-model="form.manufacturer" class="form-control" />
        </div>
        <div class="form-group">
          <label>Тип</label>
          <input v-model="form.type_name" class="form-control" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Подсистема</label>
          <input v-model="form.subsystem_name" class="form-control" />
        </div>
        <div class="form-group">
          <label>Размещение</label>
          <input v-model="form.location" class="form-control" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Заводской номер</label>
          <input v-model="form.serial_number" class="form-control" />
        </div>
        <div class="form-group">
          <label>Инвентарный номер</label>
          <input v-model="form.inventory_number" class="form-control" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Учетный номер</label>
          <input v-model="form.accounting_number" class="form-control" />
        </div>
        <div class="form-group">
          <label>Ресурс</label>
          <input v-model="form.resource" class="form-control" />
        </div>
      </div>

      <div class="form-row">
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
          <label>Режим работы</label>
          <input v-model="form.operation_mode" class="form-control" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Дата установки</label>
          <input type="date" v-model="form.commission_date" class="form-control" />
        </div>
        <div class="form-group">
          <label>Дата производства</label>
          <input type="date" v-model="form.production_date" class="form-control" />
        </div>
      </div>

      <div class="form-group">
        <label>Установлено в (ID родительского узла)</label>
        <input type="number" v-model="form.parent_id" class="form-control" />
      </div>

      <div class="form-group">
        <label>Примечания</label>
        <textarea v-model="form.note" rows="2" class="form-control"></textarea>
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" @click="save">Сохранить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useEquipmentStore } from '../stores/equipmentStore';

const store = useEquipmentStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const error = ref('');

const form = reactive({
  name: '',
  model: '',
  manufacturer: '',
  type_name: '',
  subsystem_name: '',
  location: '',
  serial_number: '',
  inventory_number: '',
  accounting_number: '',
  resource: '',
  status: 'получен',
  operation_mode: '',
  commission_date: '',
  production_date: '',
  parent_id: null as number | null,
  note: '',
});

function open(node?: any) {
  reset();
  if (node) {
    isEdit.value = true;
    editId.value = node.node_id;
    form.name = node.name || '';
    form.model = node.model || '';
    form.manufacturer = node.manufacturer || '';
    form.type_name = node.type_name || '';
    form.subsystem_name = node.subsystem_name || '';
    form.location = node.location || '';
    form.serial_number = node.serial_number || '';
    form.inventory_number = node.inventory_number || '';
    form.accounting_number = node.accounting_number || '';
    form.resource = node.resource || '';
    form.status = node.status || 'получен';
    form.operation_mode = node.operation_mode || '';
    form.commission_date = node.commission_date || '';
    form.production_date = node.production_date || '';
    form.parent_id = node.parent_id || null;
    form.note = node.note || '';
  }
  visible.value = true;
}

function reset() {
  form.name = '';
  form.model = '';
  form.manufacturer = '';
  form.type_name = '';
  form.subsystem_name = '';
  form.location = '';
  form.serial_number = '';
  form.inventory_number = '';
  form.accounting_number = '';
  form.resource = '';
  form.status = 'получен';
  form.operation_mode = '';
  form.commission_date = '';
  form.production_date = '';
  form.parent_id = null;
  form.note = '';
  error.value = '';
  isEdit.value = false;
  editId.value = null;
}

function close() { visible.value = false; }

function validate(): boolean {
  if (!form.name) {
    error.value = 'Введите наименование';
    return false;
  }
  error.value = '';
  return true;
}

async function save() {
  if (!validate()) return;

  const data = { ...form };

  try {
    if (isEdit.value && editId.value) {
      await store.updateNode(editId.value, data);
    } else {
      await store.createNode(data);
    }
    close();
    window.dispatchEvent(new Event('node-saved'));
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения';
  }
}

defineExpose({ open });
</script>

<style scoped>
.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}
.form-row .form-group {
  flex: 1;
}
</style>