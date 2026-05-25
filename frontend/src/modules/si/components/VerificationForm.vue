<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 500px">
      <div class="modal-header">
        <span>{{ editId ? 'Редактирование поверки' : 'Добавление поверки' }}</span>
        <button class="modal-close" @click="close" title="Закрыть">×</button>
      </div>
      <div class="form-group">
        <label>Дата передачи*</label>
        <input type="date" v-model="form.transferDate" class="form-control" :class="{ 'is-invalid': errors.transferDate }" @change="validateDates" />
        <span v-if="errors.transferDate" class="error-text">{{ errors.transferDate }}</span>
      </div>

      <div class="form-group">
        <label>Дата получения*</label>
        <input type="date" v-model="form.receiptDate" class="form-control" :class="{ 'is-invalid': errors.receiptDate }" @change="validateDates" />
        <span v-if="errors.receiptDate" class="error-text">{{ errors.receiptDate }}</span>
      </div>

      <div class="form-group">
        <label>Поверитель*</label>
        <input type="text" v-model="form.verifier" class="form-control" :class="{ 'is-invalid': errors.verifier }" placeholder="Введите наименование поверителя" />
        <span v-if="errors.verifier" class="error-text">{{ errors.verifier }}</span>
      </div>

      <div class="form-group">
        <label>Результат*</label>
        <select v-model="form.result" class="form-control">
          <option value="годен">Годен</option>
          <option value="не годен">Не годен</option>
        </select>
      </div>

      <div class="form-group">
        <label>Примечание</label>
        <textarea v-model="form.notes" rows="2" class="form-control"></textarea>
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
import { ref, reactive } from 'vue'
import { useSIStore } from '../stores/siStore'
import { showToast } from '@/utils/toast';
import type { Verification } from '../types/siTypes'

const store = useSIStore()
const emit = defineEmits(['verification-saved'])

const visible = ref(false)
const instrumentId = ref<string | null>(null)
const editId = ref<string | null>(null)
const error = ref('')

const errors = reactive({
  transferDate: '',
  receiptDate: '',
  verifier: ''
})

const form = reactive({
  transferDate: '',
  receiptDate: '',
  verifier: '',
  result: 'годен' as 'годен' | 'не годен',
  notes: '',
})

function validateDates() {
  errors.transferDate = ''
  errors.receiptDate = ''
  
  if (!form.transferDate) {
    errors.transferDate = 'Укажите дату передачи'
  }
  if (!form.receiptDate) {
    errors.receiptDate = 'Укажите дату получения'
  }
  
  if (form.transferDate && form.receiptDate && form.receiptDate < form.transferDate) {
    errors.receiptDate = 'Дата получения не может быть раньше даты передачи'
  }
}

function validate(): boolean {
  let isValid = true
  errors.transferDate = ''
  errors.receiptDate = ''
  errors.verifier = ''
  
  if (!form.transferDate) {
    errors.transferDate = 'Укажите дату передачи'
    isValid = false
  }
  if (!form.receiptDate) {
    errors.receiptDate = 'Укажите дату получения'
    isValid = false
  }
  if (form.transferDate && form.receiptDate && form.receiptDate < form.transferDate) {
    errors.receiptDate = 'Дата получения не может быть раньше даты передачи'
    isValid = false
  }
  if (!form.verifier.trim()) {
    errors.verifier = 'Укажите поверителя'
    isValid = false
  }
  
  return isValid
}

function reset() {
  form.transferDate = ''
  form.receiptDate = ''
  form.verifier = ''
  form.result = 'годен'
  form.notes = ''
  errors.transferDate = ''
  errors.receiptDate = ''
  errors.verifier = ''
  error.value = ''
  editId.value = null
  instrumentId.value = null
}

function open(instrId: string, existing?: Verification) {
  reset()
  instrumentId.value = instrId
  if (existing) {
    editId.value = existing.id
    form.transferDate = existing.transferDate
    form.receiptDate = existing.receiptDate
    form.verifier = existing.verifier
    form.result = existing.result
    form.notes = existing.notes || ''
  }
  visible.value = true
}

function close() {
  visible.value = false
}

async function save() {
  if (!validate()) return;

  const payload = {
    transferDate: form.transferDate,
    receiptDate: form.receiptDate,
    verifier: form.verifier,
    result: form.result,
    notes: form.notes,
  };

  try {
    if (editId.value && instrumentId.value) {
      await store.updateVerification(instrumentId.value, editId.value, payload);
      showToast('Поверка успешно обновлена', 'success');
      emit('verification-saved');
      close();
    } else if (instrumentId.value) {
      await store.addVerification({
        siId: instrumentId.value,
        ...payload
      });
      showToast('Поверка успешно добавлена', 'success');
      emit('verification-saved');
      close();
    }
  } catch (err: any) {
    error.value = err.message || 'Ошибка добавления поверки';
    showToast(error.value, 'error');
  }
}

defineExpose({ open })
</script>

<style scoped>
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
  padding: 4px 8px;
  border-radius: 4px;
}
.modal-close:hover {
  background-color: #e9ecef;
  color: #333;
}
.is-invalid {
  border-color: #c0392b;
}
</style>