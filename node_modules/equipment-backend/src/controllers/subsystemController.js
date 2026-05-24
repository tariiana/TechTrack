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

async function searchContent(req, res) {
  try {
    const items = await Subsystem.searchContent({
      query: req.query.query || req.query.q || '',
      type: req.query.type || 'all',
      limit: req.query.limit || 20,
    });
    res.json(items);
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

async function getContent(req, res) {
  try {
    const content = await Subsystem.getContent(req.params.id);
    res.json(content);
  } catch (error) {
    sendError(res, error);
  }
}

async function addContent(req, res) {
  try {
    const result = await Subsystem.attachContent(
      req.params.id,
      req.body.type,
      req.body.id,
      getRequestUserId(req)
    );
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

async function moveContent(req, res) {
  try {
    const result = await Subsystem.moveContent(
      req.params.type,
      req.params.objectId,
      req.body.target_subsystem_id,
      getRequestUserId(req)
    );
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
}

async function removeContent(req, res) {
  try {
    const result = await Subsystem.detachContent(req.params.type, req.params.objectId);
    res.json(result);
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
  searchContent,
  getById,
  getNodes,
  getContent,
  addContent,
  moveContent,
  removeContent,
  create,
  update,
  delete: deleteSubsystem,
};
