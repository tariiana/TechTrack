const { validate: isUuid } = require('uuid');
const Subsystem = require('../models/Subsystem');

function getRequestUserId(req) {
  const candidate = req.user?.user_id || req.user?.id || req.headers['x-user-id'];
  return candidate && isUuid(candidate) ? candidate : null;
}

function sendError(res, error) {
  const status = error.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Внутренняя ошибка сервера' : error.message,
  });
}

async function getAll(req, res) {
  try {
    const subsystems = await Subsystem.getAll();
    res.json(subsystems);
  } catch (error) {
    sendError(res, error);
  }
}

async function getTree(req, res) {
  try {
    const tree = await Subsystem.getTree();
    res.json(tree);
  } catch (error) {
    sendError(res, error);
  }
}

async function getById(req, res) {
  try {
    const subsystem = await Subsystem.getById(req.params.id);
    if (!subsystem) {
      return res.status(404).json({ error: 'Подсистема не найдена' });
    }

    res.json(subsystem);
  } catch (error) {
    sendError(res, error);
  }
}

async function getNodes(req, res) {
  try {
    const subsystem = await Subsystem.getById(req.params.id);
    if (!subsystem) {
      return res.status(404).json({ error: 'Подсистема не найдена' });
    }

    const nodes = await Subsystem.getNodes(req.params.id);
    res.json(nodes);
  } catch (error) {
    sendError(res, error);
  }
}

async function create(req, res) {
  try {
    const subsystem = await Subsystem.create(req.body, getRequestUserId(req));
    res.status(201).json(subsystem);
  } catch (error) {
    sendError(res, error);
  }
}

async function update(req, res) {
  try {
    const subsystem = await Subsystem.update(req.params.id, req.body, getRequestUserId(req));
    res.json(subsystem);
  } catch (error) {
    sendError(res, error);
  }
}

async function deleteSubsystem(req, res) {
  try {
    const result = await Subsystem.delete(req.params.id);
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
}

module.exports = {
  getAll,
  getTree,
  getById,
  getNodes,
  create,
  update,
  delete: deleteSubsystem,
};
