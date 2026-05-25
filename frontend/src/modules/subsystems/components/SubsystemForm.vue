<template>
  <div v-if="visible" class="modal-overlay">
    <form class="modal-content subsystem-form" @submit.prevent="save">
      <div class="modal-header">
        {{ isEdit ? 'Редактирование подсистемы' : 'Добавление подсистемы' }}
      </div>

      <div class="form-group">
        <label for="subsystem-name">Наименование*</label>
        <input
          id="subsystem-name"
          v-model="form.name"
          type="text"
          class="form-control"
          :class="{ invalid: errors.name }"
          autocomplete="off"
        />
        <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
      </div>

      <div class="form-group">
        <label for="subsystem-location">Расположение*</label>
        <input
          id="subsystem-location"
          v-model="form.location"
          type="text"
          class="form-control"
          :class="{ invalid: errors.location }"
          autocomplete="off"
        />
        <span v-if="errors.location" class="error-text">{{ errors.location }}</span>
      </div>

      <div class="form-group">
        <label for="subsystem-parent">Родительская подсистема</label>
        <select id="subsystem-parent" v-model="form.parent_id" class="form-control">
          <option :value="null">Корневая подсистема</option>
          <option v-for="sub in parentOptions" :key="sub.subsys_id" :value="sub.subsys_id">
            {{ sub.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="subsystem-note">Примечание</label>
        <textarea id="subsystem-note" v-model="form.note" rows="3" class="form-control"></textarea>
      </div>

      <div v-if="error" class="error-text form-error">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" type="button" @click="close">Отмена</button>
        <button class="btn btn-primary" type="submit" :disabled="isSaving">
          {{ isSaving ? 'Сохранение...' : 'Сохранить' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import { useSubsystemStore } from '../stores/subsystemsStore';
import type { Subsystem, SubsystemPayload, SubsystemTreeItem } from '../types/subsystemsTypes';

const store = useSubsystemStore();
const visible = ref(false);
const isEdit = ref(false);
const isSaving = ref(false);
const editId = ref<string | null>(null);
const error = ref('');
const parentOptions = ref<Subsystem[]>([]);

const emit = defineEmits<{ (event: 'saved', subsystem: Subsystem): void }>();

// Проверка прав доступа
const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

const errors = reactive({
  name: '',
  location: '',
});

const form = reactive<SubsystemPayload>({
  name: '',
  location: '',
  parent_id: null,
  note: '',
});

function collectDescendantIds(nodes: SubsystemTreeItem[], id: string, found = false, result = new Set<string>()) {
  for (const node of nodes) {
    const isInsideTarget = found || node.subsys_id === id;
    if (isInsideTarget) result.add(node.subsys_id);
    collectDescendantIds(node.children || [], id, isInsideTarget, result);
  }
  return result;
}

async function loadParentOptions() {
  await Promise.all([store.fetchAll(), store.fetchTree()]);

  const blockedIds = editId.value
    ? collectDescendantIds(store.rawTree, editId.value)
    : new Set<string>();

  parentOptions.value = store.subsystems.filter((subsystem) => !blockedIds.has(subsystem.subsys_id));
}

function reset() {
  isEdit.value = false;
  editId.value = null;
  form.name = '';
  form.location = '';
  form.parent_id = null;
  form.note = '';
  error.value = '';
  errors.name = '';
  errors.location = '';
}

function validate(): boolean {
  let isValid = true;
  errors.name = '';
  errors.location = '';

  if (!form.name.trim()) {
    errors.name = 'Введите наименование';
    isValid = false;
  }

  if (!form.location.trim()) {
    errors.location = 'Введите расположение';
    isValid = false;
  }

  return isValid;
}

async function open(subsystem?: Subsystem, parentId: string | null = null) {
  // Проверка прав - observer не может открыть форму добавления/редактирования
  if (!canEdit.value) {
    return;
  }

  reset();

  if (subsystem) {
    isEdit.value = true;
    editId.value = subsystem.subsys_id;
    form.name = subsystem.name;
    form.location = subsystem.location;
    form.parent_id = subsystem.parent_id;
    form.note = subsystem.note || '';
  } else {
    form.parent_id = parentId;
  }

  await loadParentOptions();
  visible.value = true;
}

function close() {
  visible.value = false;
}

async function save() {
  if (!validate()) return;

  const data: SubsystemPayload = {
    name: form.name.trim(),
    location: form.location.trim(),
    parent_id: form.parent_id || null,
    note: form.note?.trim() || null,
  };

  try {
    isSaving.value = true;
    const saved = isEdit.value && editId.value
      ? await store.update(editId.value, data)
      : await store.create(data);

    close();
    emit('saved', saved);
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения подсистемы';
  } finally {
    isSaving.value = false;
  }
}

defineExpose({ open });
</script>

<style scoped>
.subsystem-form {
  width: 520px;
}

.form-error {
  margin-top: 8px;
}

.btn:disabled {
  cursor: default;
  opacity: 0.7;
}
</style>