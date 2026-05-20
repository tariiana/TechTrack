const Subsystem = require('../models/Subsystem');

async function getAll(req, res, next) {
  try {
    const subsystems = await Subsystem.getAll();
    res.json(subsystems); // прямой массив
  } catch (err) { next(err); }
}

async function getTree(req, res, next) {
  try {
    const tree = await Subsystem.getTree();
    res.json(tree); // прямой массив
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const subsystem = await Subsystem.getById(req.params.id);
    if (!subsystem) return res.status(404).json({ error: 'Подсистема не найдена' });
    res.json(subsystem);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const newSubsys = await Subsystem.create(req.body, null);
    res.status(201).json(newSubsys);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    await Subsystem.update(req.params.id, req.body, null);
    res.json({ success: true });
  } catch (err) { next(err); }
}

async function deleteSubsystem(req, res, next) {
  try {
    await Subsystem.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = {
  getAll,
  getTree,
  getById,
  create,
  update,
  delete: deleteSubsystem,
};