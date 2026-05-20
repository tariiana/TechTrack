<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 500px">
      <div class="modal-header">{{ editId ? 'Редактирование поверки' : 'Добавление поверки' }}</div>

      <div class="form-group">
        <label>Дата передачи*</label>
        <input type="date" v-model="form.transferDate" class="form-control" />
      </div>

      <div class="form-group">
        <label>Дата получения*</label>
        <input type="date" v-model="form.receiptDate" class="form-control" />
      </div>

      <div class="form-group">
        <label>Поверитель*</label>
        <div style="display: flex; gap: 8px">
          <select v-model="form.verifier" class="form-control" style="flex: 1">
            <option value="">-- Выберите поверителя --</option>
            <option v-for="ver in verifierOptions" :key="ver" :value="ver">{{ ver }}</option>
          </select>
          <button type="button" class="btn btn-secondary btn-sm" @click="openAddVerifierModal">+ Добавить</button>
        </div>
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

  <!-- Модалка добавления нового поверителя -->
  <div class="modal-overlay" v-if="showVerifierModal">
    <div class="modal-content" style="width: 400px">
      <div class="modal-header">Добавление поверителя</div>
      <div class="form-group">
        <label>Новый поверитель</label>
        <input type="text" v-model="newVerifier" class="form-control" placeholder="Например: Нижегородский ЦСМ" />
      </div>
      <div v-if="verifierError" class="error-text">{{ verifierError }}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeVerifierModal">Отмена</button>
        <button class="btn btn-primary" @click="addNewVerifier">Добавить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useSIStore } from '../stores/siStore'
import type { Verification } from '../types/siTypes'

const store = useSIStore()
const emit = defineEmits(['verification-saved'])

const visible = ref(false)
const instrumentId = ref<string | null>(null)
const editId = ref<number | null>(null)
const error = ref('')

// Список поверителей (храним в localStorage)
const verifierOptions = ref<string[]>([])
const showVerifierModal = ref(false)
const newVerifier = ref('')
const verifierError = ref('')

const form = reactive({
  transferDate: '',
  receiptDate: '',
  verifier: '',
  result: 'годен' as 'годен' | 'не годен',
  notes: '',
})

// Загрузка списка поверителей
function loadVerifiers() {
  const saved = localStorage.getItem('si_verifiers')
  if (saved) {
    verifierOptions.value = JSON.parse(saved)
  } else {
    verifierOptions.value = ['Самарский ЦСМ', 'Саратовский ЦСМ', 'Московский ЦСМ', 'Казанский ЦСМ', 'Поверочная лаборатория']
    localStorage.setItem('si_verifiers', JSON.stringify(verifierOptions.value))
  }
}

function saveVerifiers() {
  localStorage.setItem('si_verifiers', JSON.stringify(verifierOptions.value))
}

function openAddVerifierModal() {
  newVerifier.value = ''
  verifierError.value = ''
  showVerifierModal.value = true
}

function closeVerifierModal() {
  showVerifierModal.value = false
}

function addNewVerifier() {
  const trimmed = newVerifier.value.trim()
  if (!trimmed) {
    verifierError.value = 'Введите название поверителя'
    return
  }
  if (verifierOptions.value.includes(trimmed)) {
    verifierError.value = 'Такой поверитель уже существует'
    return
  }
  verifierOptions.value.push(trimmed)
  saveVerifiers()
  form.verifier = trimmed
  closeVerifierModal()
}

function reset() {
  form.transferDate = ''
  form.receiptDate = ''
  form.verifier = ''
  form.result = 'годен'
  form.notes = ''
  error.value = ''
  editId.value = null
  instrumentId.value = null
}

function open(instrId: string, existing?: Verification) {
  reset()
  loadVerifiers()
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
  if (!form.transferDate) {
    error.value = 'Укажите дату передачи'
    return
  }
  if (!form.receiptDate) {
    error.value = 'Укажите дату получения'
    return
  }
  if (!form.verifier) {
    error.value = 'Укажите поверителя'
    return
  }

  const payload = {
    transferDate: form.transferDate,
    receiptDate: form.receiptDate,
    verifier: form.verifier,
    result: form.result,
    notes: form.notes,
  }

  try {
    if (editId.value && instrumentId.value) {
      // Редактирование поверки (если реализовано в бэкенде)
      error.value = 'Редактирование поверки пока недоступно. Удалите и добавьте заново.'
      return
    } else if (instrumentId.value) {
      await store.addVerification({
        siId: instrumentId.value,
        transferDate: form.transferDate,
        receiptDate: form.receiptDate,
        verifier: form.verifier,
        result: form.result,
        notes: form.notes,
      })
      emit('verification-saved')
      close()
    }
  } catch (err: any) {
    error.value = err.message || 'Ошибка добавления поверки'
  }
}

defineExpose({ open })
</script>

<style scoped>
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}
.error-text {
  color: #c0392b;
  font-size: 12px;
  margin-top: 8px;
}
</style>