<template>
 <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 500px">
      <div class="modal-header">
        <span>{{ editId ? 'Редактирование поверки' : 'Добавление поверки' }}</span>
        <button class="modal-close" @click="confirmClose" title="Закрыть">×</button>
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
        <button class="btn btn-secondary" @click="confirmClose">Отмена</button>
        <button class="btn btn-primary" @click="save">Сохранить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useSIStore } from '../stores/siStore'
import { showToast } from '@/utils/toast';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import type { Verification } from '../types/siTypes'

const store = useSIStore()
const emit = defineEmits(['verification-saved'])

const visible = ref(false)
const instrumentId = ref<string | null>(null)
const editId = ref<string | null>(null)
const error = ref('')
const confirmDialog = ref()

// Проверка прав доступа
const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

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

const hasChanges = computed(() => {
  return form.transferDate || form.receiptDate || form.verifier || form.notes
})

async function confirmClose() {
  // Если есть введённые данные, показываем подтверждение
  if (hasChanges.value) {
    const confirmed = await confirmDialog.value?.show(
      'Подтверждение закрытия',
      'У вас есть несохранённые изменения. Закрыть окно?'
    )
    if (confirmed) {
      close()
    }
  } else {
    close()
  }
}

function open(instrId: string, existing?: Verification) {
  if (!canEdit.value) {
    showToast('Недостаточно прав для выполнения действия', 'error');
    return;
  }
  
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
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 20px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: var(--border-radius-small);
}

.modal-close:hover {
  background-color: var(--secondary-color);
  color: var(--text-secondary);
}

.is-invalid {
  border-color: #c0392b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.error-text {
  color: #c0392b;
  font-size: 12px;
  margin-top: 4px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background-color: #2c5f8a;
  color: white;
}

.btn-primary:hover {
  background-color: #1e4566;
}

.btn-secondary {
  background-color: #e9ecef;
  color: #2c3e50;
  border: 1px solid #ced4da;
}

.btn-secondary:hover {
  background-color: #dee2e6;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #2c3e50;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}
</style>