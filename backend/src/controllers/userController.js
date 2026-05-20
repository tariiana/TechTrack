const User = require('../models/User');
const Role = require('../models/Role');
const ResponseFormatter = require('../utils/responseFormatter');

async function getAll(req, res, next) {
  try {
    const { search, role_id, is_active } = req.query;
    const users = await User.getAll({ search, role_id, is_active });
    res.json(ResponseFormatter.success(users));
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const user = await User.getById(req.params.id);
    if (!user) return res.status(404).json(ResponseFormatter.error('Пользователь не найден', 404));
    res.json(ResponseFormatter.success(user));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const newUser = await User.create(req.body, null);
    res.status(201).json(ResponseFormatter.created(newUser, 'Пользователь создан'));
  } catch (err) {
    if (err.message.includes('уже существует')) {
      return res.status(409).json(ResponseFormatter.error(err.message, 409));
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const updated = await User.update(req.params.id, req.body, null);
    res.json(ResponseFormatter.success(updated, 'Пользователь обновлён'));
  } catch (err) {
    if (err.message.includes('уже существует')) {
      return res.status(409).json(ResponseFormatter.error(err.message, 409));
    }
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    await User.delete(req.params.id);
    res.json(ResponseFormatter.noContent('Пользователь удалён'));
  } catch (err) { next(err); }
}

async function getRoles(req, res, next) {
  try {
    const roles = await Role.getAll();
    res.json(ResponseFormatter.success(roles));
  } catch (err) { next(err); }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteUser,
  getRoles,
};