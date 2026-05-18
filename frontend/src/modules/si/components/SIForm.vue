<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 650px">
      <div class="modal-header">{{ isEdit ? 'Редактирование СИ' : 'Добавление СИ' }}</div>

      <div class="form-row"><div class="form-group"><label>Наименование*</label><input v-model="form.name" class="form-control" /></div>
      <div class="form-group"><label>Производитель</label><input v-model="form.manufacturer" class="form-control" /></div></div>

      <div class="form-row"><div class="form-group"><label>Марка</label><input v-model="form.model" class="form-control" /></div>
      <div class="form-group"><label>Тип</label><input v-model="form.typeName" class="form-control" /></div></div>

      <div class="form-row"><div class="form-group"><label>Заводской номер</label><input v-model="form.serialNumber" class="form-control" /></div>
      <div class="form-group"><label>Инвентарный номер</label><input v-model="form.inventoryNumber" class="form-control" /></div></div>

      <div class="form-row"><div class="form-group"><label>Табельный номер*</label><input v-model="form.tabNumber" class="form-control" /></div>
      <div class="form-group"><label>Узел (ID)</label><input type="number" v-model="form.nodeId" class="form-control" /></div></div>

      <div class="form-row"><div class="form-group"><label>Статус</label><select v-model="form.status" class="form-control">
        <option value="в эксплуатации">В эксплуатации</option><option value="на поверке">На поверке</option>
        <option value="в ремонте">В ремонте</option><option value="выведено">Выведено</option>
      </select></div>
      <div class="form-group"><label>Размещение</label><div style="display: flex; gap: 8px"><select v-model="form.location" class="form-control"><option value="">-- Выберите --</option><option v-for="loc in locationOptions" :key="loc" :value="loc">{{ loc }}</option></select>
      <button type="button" class="btn btn-secondary btn-sm" @click="openAddLocationModal">+ Добавить</button></div></div></div>

      <div class="form-row"><div class="form-group"><label>Основные параметры</label><input v-model="form.mainParams" class="form-control" /></div>
      <div class="form-group"><label>Дата производства</label><input type="date" v-model="form.productionDate" class="form-control" /></div></div>

      <div class="form-row"><div class="form-group"><label>Поверитель</label><div style="display: flex; gap: 8px"><select v-model="form.verifier" class="form-control"><option value="">-- Выберите --</option><option v-for="ver in verifierOptions" :key="ver" :value="ver">{{ ver }}</option></select>
      <button type="button" class="btn btn-secondary btn-sm" @click="openAddVerifierModal">+ Добавить</button></div></div>
      <div class="form-group"><label>Межповерочный интервал (лет)*</label><input type="number" step="0.5" v-model="form.verificationInterval" class="form-control" /></div></div>

      <div class="form-group"><label>Примечание</label><textarea v-model="form.notes" rows="2" class="form-control"></textarea></div>
      <div v-if="error" class="error-text">{{ error }}</div>
      <div class="modal-footer"><button class="btn btn-secondary" @click="close">Отмена</button><button class="btn btn-primary" @click="save">Сохранить</button></div>
    </div>
  </div>

  <!-- Модальные окна добавления локации и поверителя -->
  <div class="modal-overlay" v-if="showLocationModal"><div class="modal-content" style="width: 400px"><div class="modal-header">Добавление местоположения</div><div class="form-group"><label>Новое местоположение</label><input v-model="newLocation" class="form-control" /></div><div v-if="locationError" class="error-text">{{ locationError }}</div><div class="modal-footer"><button class="btn btn-secondary" @click="closeLocationModal">Отмена</button><button class="btn btn-primary" @click="addNewLocation">Добавить</button></div></div></div>
  <div class="modal-overlay" v-if="showVerifierModal"><div class="modal-content" style="width: 400px"><div class="modal-header">Добавление поверителя</div><div class="form-group"><label>Новый поверитель</label><input v-model="newVerifier" class="form-control" /></div><div v-if="verifierError" class="error-text">{{ verifierError }}</div><div class="modal-footer"><button class="btn btn-secondary" @click="closeVerifierModal">Отмена</button><button class="btn btn-primary" @click="addNewVerifier">Добавить</button></div></div></div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useSIStore } from '../stores/siStore';

const store = useSIStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<number | null>(null);
const error = ref('');

const locationOptions = ref<string[]>([]);
const showLocationModal = ref(false);
const newLocation = ref('');
const locationError = ref('');

const verifierOptions = ref<string[]>([]);
const showVerifierModal = ref(false);
const newVerifier = ref('');
const verifierError = ref('');

function loadLocations() {
  const saved = localStorage.getItem('si_locations');
  if (saved) locationOptions.value = JSON.parse(saved);
  else { locationOptions.value = ['Лаборатория №5', 'Пост контроля АСКРО', 'Склад', 'Лаборатория №3', 'Ремонтная мастерская']; localStorage.setItem('si_locations', JSON.stringify(locationOptions.value)); }
}
function saveLocations() { localStorage.setItem('si_locations', JSON.stringify(locationOptions.value)); }
function openAddLocationModal() { newLocation.value = ''; locationError.value = ''; showLocationModal.value = true; }
function closeLocationModal() { showLocationModal.value = false; }
function addNewLocation() {
  const trimmed = newLocation.value.trim();
  if (!trimmed) { locationError.value = 'Введите название'; return; }
  if (locationOptions.value.includes(trimmed)) { locationError.value = 'Уже существует'; return; }
  locationOptions.value.push(trimmed);
  saveLocations();
  form.location = trimmed;
  closeLocationModal();
}

function loadVerifiers() {
  const saved = localStorage.getItem('si_verifiers');
  if (saved) verifierOptions.value = JSON.parse(saved);
  else { verifierOptions.value = ['Самарский ЦСМ', 'Саратовский ЦСМ', 'Московский ЦСМ', 'Казанский ЦСМ', 'Поверочная лаборатория']; localStorage.setItem('si_verifiers', JSON.stringify(verifierOptions.value)); }
}
function saveVerifiers() { localStorage.setItem('si_verifiers', JSON.stringify(verifierOptions.value)); }
function openAddVerifierModal() { newVerifier.value = ''; verifierError.value = ''; showVerifierModal.value = true; }
function closeVerifierModal() { showVerifierModal.value = false; }
function addNewVerifier() {
  const trimmed = newVerifier.value.trim();
  if (!trimmed) { verifierError.value = 'Введите название'; return; }
  if (verifierOptions.value.includes(trimmed)) { verifierError.value = 'Уже существует'; return; }
  verifierOptions.value.push(trimmed);
  saveVerifiers();
  form.verifier = trimmed;
  closeVerifierModal();
}

function getCurrentDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const form = reactive({
  name: '', manufacturer: '', model: '', typeName: '', serialNumber: '', inventoryNumber: '', tabNumber: '',
  nodeId: undefined, status: 'в эксплуатации', location: '', mainParams: '', verificationInterval: 1,
  notes: '', lastVerificationDate: '', productionDate: '', verifier: '',
});

function resetForm() {
  form.name = ''; form.manufacturer = ''; form.model = ''; form.typeName = ''; form.serialNumber = ''; form.inventoryNumber = '';
  form.tabNumber = ''; form.nodeId = undefined; form.status = 'в эксплуатации'; form.location = ''; form.mainParams = '';
  form.verificationInterval = 1; form.notes = ''; form.lastVerificationDate = ''; form.productionDate = ''; form.verifier = '';
  error.value = ''; isEdit.value = false; editId.value = null;
}

function open(editItem?: any) {
  resetForm();
  loadLocations(); loadVerifiers();
  const now = getCurrentDate();
  form.lastVerificationDate = now;
  if (editItem) {
    isEdit.value = true; editId.value = editItem.id;
    form.name = editItem.name || ''; form.manufacturer = editItem.manufacturer || ''; form.model = editItem.model || '';
    form.typeName = editItem.typeName || ''; form.serialNumber = editItem.serialNumber || ''; form.inventoryNumber = editItem.inventoryNumber || '';
    form.tabNumber = editItem.tabNumber || ''; form.nodeId = editItem.nodeId; form.status = editItem.status;
    form.location = editItem.location || ''; form.mainParams = editItem.mainParams || '';
    form.verificationInterval = editItem.verificationInterval; form.notes = editItem.notes || '';
    form.lastVerificationDate = editItem.lastVerificationDate || now; form.productionDate = editItem.productionDate || '';
    form.verifier = editItem.verifier || '';
  }
  visible.value = true;
}
function close() { visible.value = false; }
function validate(): boolean {
  if (!form.name) { error.value = 'Введите наименование'; return false; }
  if (!form.tabNumber) { error.value = 'Введите табельный номер'; return false; }
  if (!form.verificationInterval || form.verificationInterval <= 0) { error.value = 'Интервал должен быть >0'; return false; }
  if (!form.location) { error.value = 'Выберите местоположение'; return false; }
  return true;
}
async function save() {
  if (!validate()) return;
  const data = { ...form, isDeleted: false };
  if (isEdit.value && editId.value) await store.updateInstrument(editId.value, data);
  else await store.createInstrument(data);
  close();
  window.dispatchEvent(new Event('si-saved'));
}
defineExpose({ open });
</script>

<style scoped>
.form-row { display: flex; gap: 15px; margin-bottom: 15px; }
.form-row .form-group { flex: 1; }
</style>