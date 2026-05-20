const Node = require('../models/Node');
const ResponseFormatter = require('../utils/responseFormatter');

async function getAll(req, res, next) {
  try {
    const { search, status, subsystem_id, node_type_id } = req.query;
    const nodes = await Node.getAll({ search, status, subsystem_id, node_type_id });
    res.json(ResponseFormatter.success(nodes));
  } catch (err) { next(err); }
}

async function getTree(req, res, next) {
  try {
    const tree = await Node.getTree();
    res.json(ResponseFormatter.success(tree));
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const node = await Node.getById(req.params.id);
    if (!node) return res.status(404).json(ResponseFormatter.error('Узел не найден', 404));
    res.json(ResponseFormatter.success(node));
  } catch (err) { next(err); }
}

async function getChildren(req, res, next) {
  try {
    const children = await Node.getChildren(req.params.id);
    res.json(ResponseFormatter.success(children));
  } catch (err) { next(err); }
}

async function getMovementHistory(req, res, next) {
  try {
    const history = await Node.getMovementHistory(req.params.id);
    res.json(ResponseFormatter.success(history));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const newNode = await Node.create(req.body, null);  // вместо req.user.id
    res.status(201).json(ResponseFormatter.created(newNode, 'Узел создан'));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    await Node.update(req.params.id, req.body, null);
    res.json(ResponseFormatter.success(null, 'Узел обновлён'));
  } catch (err) { next(err); }
}

async function writeOff(req, res, next) {
  try {
    await Node.writeOff(req.params.id, null);
    res.json(ResponseFormatter.noContent('Узел списан'));
  } catch (err) { next(err); }
}

async function install(req, res, next) {
  try {
    const { parentId, childId } = req.params;
    await Node.install(childId, parentId, null);
    res.json(ResponseFormatter.success(null, 'Узел установлен в агрегат'));
  } catch (err) { next(err); }
}

async function uninstall(req, res, next) {
  try {
    const { childId } = req.params;
    await Node.uninstall(childId, null);
    res.json(ResponseFormatter.success(null, 'Узел извлечён из агрегата'));
  } catch (err) { next(err); }
}

module.exports = {
  getAll,
  getTree,
  getById,
  getChildren,
  getMovementHistory,
  create,
  update,
  writeOff,
  install,
  uninstall,
};