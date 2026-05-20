const Maintenance = require('../models/Maintenance');
const ResponseFormatter = require('../utils/responseFormatter');

async function getAllPlans(req, res, next) {
  try {
    const plans = await Maintenance.getAllPlans();
    res.json(ResponseFormatter.success(plans));
  } catch (err) { next(err); }
}

async function getPlanById(req, res, next) {
  try {
    const plan = await Maintenance.getPlanById(req.params.id);
    if (!plan) return res.status(404).json(ResponseFormatter.error('План не найден', 404));
    res.json(ResponseFormatter.success(plan));
  } catch (err) { next(err); }
}

async function createPlan(req, res, next) {
  try {
    const plan = await Maintenance.createPlan(req.body);
    res.status(201).json(ResponseFormatter.created(plan, 'План создан'));
  } catch (err) { next(err); }
}

async function updatePlan(req, res, next) {
  try {
    const plan = await Maintenance.updatePlan(req.params.id, req.body);
    if (!plan) return res.status(404).json(ResponseFormatter.error('План не найден', 404));
    res.json(ResponseFormatter.success(plan, 'План обновлён'));
  } catch (err) { next(err); }
}

async function deletePlan(req, res, next) {
  try {
    await Maintenance.deletePlan(req.params.id);
    res.json(ResponseFormatter.noContent('План удалён'));
  } catch (err) { next(err); }
}

async function createTask(req, res, next) {
  try {
    const task = await Maintenance.createTask(req.body);
    res.status(201).json(ResponseFormatter.created(task, 'Задача добавлена'));
  } catch (err) { next(err); }
}

async function updateTask(req, res, next) {
  try {
    await Maintenance.updateTask(req.params.id, req.body);
    res.json(ResponseFormatter.success(null, 'Задача обновлена'));
  } catch (err) { next(err); }
}

async function deleteTask(req, res, next) {
  try {
    await Maintenance.deleteTask(req.params.id);
    res.json(ResponseFormatter.noContent('Задача удалена'));
  } catch (err) { next(err); }
}

async function completeTask(req, res, next) {
  try {
    await Maintenance.completeTask(req.params.id);
    res.json(ResponseFormatter.success(null, 'Задача выполнена'));
  } catch (err) { next(err); }
}

async function getEquipmentNodes(req, res, next) {
  try {
    const nodes = await Maintenance.getEquipmentNodes();
    res.json(ResponseFormatter.success(nodes));
  } catch (err) { next(err); }
}

async function generatePlan(req, res, next) {
  try {
    const { start_date, end_date, node_ids } = req.body;
    const result = await Maintenance.generatePlan(start_date, end_date, node_ids);
    res.json(ResponseFormatter.success(result, 'План сгенерирован'));
  } catch (err) { next(err); }
}

module.exports = {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  getEquipmentNodes,
  generatePlan,
};