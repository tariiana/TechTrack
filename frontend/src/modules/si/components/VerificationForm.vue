<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">{{ editId ? 'Редактирование поверки' : 'Добавление поверки' }}</div>

      <div class="form-group">
        <label>Дата передачи*</label>
        <input type="date" v-model="form.transferDate" class="form-control" @change="validateDates" />
      </div>

      <div class="form-group">
        <label>Дата получения*</label>
        <input type="date" v-model="form.receiptDate" class="form-control" @change="validateDates" />
      </div>

      <div class="form-group">
        <label>Поверитель*</label>
        <div style="display: flex; gap: 8px">
          <select v-model="form.verifier" class="form-control" style="flex: 1">
            <option value="">-- Выберите поверителя --</option>
            <option v-for="ver in verifierOptions" :key="ver" :value="ver">{{ ver }}</option>
          </select>
          <button type="button" class="btn btn-secondary btn-sm" @click="openAddVerifierModal">
            + Добавить
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>Результат*</label>
        <select v-model="form.result" class="form-control">
          <option value="годен">Годен</option>
          <option value="не годен">Не годен</option>
        </select>
      </div>

      <div v-if="dateError" class="error-text">{{ dateError }}</div>
      <div v-if="error" class="error-text">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" @click="save">Сохранить</button>
      </div>
    </div>
  </div>

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
const visible = ref(false)
const siId = ref<string | null>(null)   // изменено на string
const editId = ref<number | null>(null)
const error = ref('')
const dateError = ref('')

const verifierOptions = ref<string[]>([])
const showVerifierModal = ref(false)
const newVerifier = ref('')
const verifierError = ref('')

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

const form = reactive({
  transferDate: '',
  receiptDate: '',
  verifier: '',
  result: 'годен' as 'годен' | 'не годен',
})

function validateDates(): boolean {
  dateError.value = ''
  if (!form.transferDate || !form.receiptDate) return true
  const transfer = new Date(form.transferDate)
  const receipt = new Date(form.receiptDate)
  if (receipt < transfer) {
    dateError.value = 'Дата получения не может быть раньше даты передачи'
    return false
  }
  return true
}

function reset() {
  form.transferDate = ''
  form.receiptDate = ''
  form.verifier = ''
  form.result = 'годен'
  error.value = ''
  dateError.value = ''
  siId.value = null
  editId.value = null
}

function open(instrumentId: string, existing?: Verification) {
  reset()
  loadVerifiers()
  siId.value = instrumentId
  if (existing) {
    editId.value = existing.id
    form.transferDate = existing.transferDate
    form.receiptDate = existing.receiptDate
    form.verifier = existing.verifier
    form.result = existing.result
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
  if (!validateDates()) return

  if (editId.value) {
    error.value = 'Редактирование поверки пока недоступно. Удалите и добавьте заново.'
    return
  } else {
    try {
      await store.addCalibrationHistory(siId.value!, {
        calibration_date: form.receiptDate,
        calibrator: form.verifier,
        result: form.result,
        notes: `Передано: ${form.transferDate}`,
      })
      close()
      window.dispatchEvent(new Event('verification-saved'))
    } catch (err: any) {
      error.value = err.message || 'Ошибка добавления поверки'
    }
  }
}

defineExpose({ open })
</script>