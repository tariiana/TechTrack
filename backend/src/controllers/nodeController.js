const Node = require('../models/Node');
const ResponseFormatter = require('../utils/responseFormatter');

function getRequestUserId(req) {
  return req.user?.user_id || req.user?.id || null;
}

async function getAll(req, res, next) {
  try {
    const nodes = await Node.getAll(req.query);
    res.json(nodes);
  } catch (err) {
    next(err);
  }
}

async function getTree(req, res, next) {
  try {
    const tree = await Node.getTree();
    res.json(tree);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const node = await Node.getById(req.params.id);
    if (!node) {
      return res.status(404).json(ResponseFormatter.error('Узел не найден', 404));
    }
    return res.json(node);
  } catch (err) {
    return next(err);
  }
}

async function getChildren(req, res, next) {
  try {
    const children = await Node.getChildren(req.params.id);
    res.json(children);
  } catch (err) {
    next(err);
  }
}

async function getMovementHistory(req, res, next) {
  try {
    const history = await Node.getMovementHistory(req.params.id);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

async function getCompositionHistory(req, res, next) {
  try {
    const history = await Node.getCompositionHistory(req.params.id);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

async function getInstallableChildren(req, res, next) {
  try {
    const nodes = await Node.getInstallableChildren(req.params.id, req.query);
    res.json(nodes);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const newNode = await Node.create(req.body, getRequestUserId(req));
    res.status(201).json(ResponseFormatter.created(newNode, 'Узел создан'));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    await Node.update(req.params.id, req.body, getRequestUserId(req));
    res.json(ResponseFormatter.success(null, 'Узел обновлён'));
  } catch (err) {
    next(err);
  }
}

async function writeOff(req, res, next) {
  try {
    await Node.writeOff(req.params.id, getRequestUserId(req));
    res.json(ResponseFormatter.noContent('Узел списан'));
  } catch (err) {
    next(err);
  }
}

async function install(req, res, next) {
  try {
    const { parentId, childId } = req.params;
    await Node.install(childId, parentId, getRequestUserId(req));
    res.json(ResponseFormatter.success(null, 'Узел установлен в агрегат'));
  } catch (err) {
    next(err);
  }
}

async function uninstall(req, res, next) {
  try {
    const { childId } = req.params;
    await Node.uninstall(childId, getRequestUserId(req));
    res.json(ResponseFormatter.success(null, 'Узел извлечён из агрегата'));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getTree,
  getById,
  getChildren,
  getMovementHistory,
  getCompositionHistory,
  getInstallableChildren,
  create,
  update,
  writeOff,
  install,
  uninstall,
};
