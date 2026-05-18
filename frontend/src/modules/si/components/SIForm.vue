<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">{{ isEdit ? 'Редактирование' : 'Новое СИ' }}</div>
      <form @submit.prevent="save">
        <div class="form-group"><label>Наименование</label><input v-model="form.name" required /></div>
        <div class="form-group"><label>Производитель</label><input v-model="form.manufacturer" required /></div>
        <div class="form-group"><label>Модель</label><input v-model="form.model" required /></div>
        <div class="form-group"><label>Таб. номер</label><input v-model="form.tab_number" required /></div>
        <div class="form-group"><label>Межповерочный интервал (лет)</label><input type="number" step="0.5" v-model="form.calibration_interval" required /></div>
        <div class="form-group"><label>Местоположение</label><input v-model="form.location" required /></div>
        <div class="form-group"><label>Примечания</label><textarea v-model="form.note"></textarea></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
          <button type="submit" class="btn btn-primary">Сохранить</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useSIStore } from '../stores/siStore';

const store = useSIStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const form = reactive({
  name: '', manufacturer: '', model: '', tab_number: '',
  calibration_interval: 1, location: '', note: '',
});

function open(item?: any) {
  if (item) {
    isEdit.value = true;
    editId.value = item.instrument_id;
    Object.assign(form, item);
  } else {
    reset();
  }
  visible.value = true;
}
function reset() { /* сброс */ }
function close() { visible.value = false; }
async function save() {
  if (isEdit.value && editId.value) {
    await store.updateInstrument(editId.value, form);
  } else {
    await store.createInstrument(form);
  }
  close();
  window.dispatchEvent(new Event('instrument-saved'));
}
defineExpose({ open });
</script>