<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 500px">
      <div class="modal-header">{{ isEdit ? 'Редактирование плана' : 'Добавление плана' }}</div>

      <div class="form-group">
        <label>Название*</label>
        <input type="text" v-model="form.name" class="form-control" />
      </div>

      <div class="form-group">
        <label>Дата начала*</label>
        <input type="date" v-model="form.start_date" class="form-control" />
      </div>

      <div class="form-group">
        <label>Дата окончания*</label>
        <input type="date" v-model="form.end_date" class="form-control" />
      </div>

      <div class="form-group">
        <label>Описание</label>
        <textarea v-model="form.description" rows="3" class="form-control"></textarea>
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
import { useMaintenanceStore } from '@/modules/maintenance/stores/maintenanceStore'

const store = useMaintenanceStore()
const visible = ref(false)
const isEdit = ref(false)
const editId = ref<string | null>(null)
const error = ref('')

const form = reactive({
  name: '',
  start_date: '',
  end_date: '',
  description: '',
})

function getCurrentDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function reset() {
  const today = getCurrentDate()
  form.name = ''
  form.start_date = today
  form.end_date = today
  form.description = ''
  error.value = ''
  isEdit.value = false
  editId.value = null
}

function open(plan?: any) {
  reset()
  if (plan) {
    isEdit.value = true
    editId.value = plan.plan_id
    form.name = plan.name
    form.start_date = plan.start_date
    form.end_date = plan.end_date || ''
    form.description = plan.description || ''
  }
  visible.value = true
}

function close() {
  visible.value = false
}

function validate(): boolean {
  if (!form.name.trim()) {
    error.value = 'Введите название'
    return false
  }
  if (!form.start_date) {
    error.value = 'Укажите дату начала'
    return false
  }
  if (!form.end_date) {
    error.value = 'Укажите дату окончания'
    return false
  }
  error.value = ''
  return true
}

async function save() {
  if (!validate()) return

  const data = {
    name: form.name,
    start_date: form.start_date,
    end_date: form.end_date,
    description: form.description,
  }

  try {
    if (isEdit.value && editId.value) {
      await store.updatePlan(editId.value, data)
    } else {
      await store.createPlan(data)
    }
    close()
    window.dispatchEvent(new Event('plan-saved'))
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения плана'
  }
}

defineExpose({ open })
</script>