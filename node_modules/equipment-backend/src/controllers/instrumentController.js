const MeasuringInstrument = require('../models/MeasuringInstrument');
const ResponseFormatter = require('../utils/responseFormatter');

async function getAll(req, res, next) {
  try {
    const { search, status } = req.query;
    const instruments = await MeasuringInstrument.getAll({ search, status });
    res.json(instruments);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const instrument = await MeasuringInstrument.getById(req.params.id);
    if (!instrument) return res.status(404).json(ResponseFormatter.error('СИ не найдено', 404));
    res.json(instrument);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const instrument = await MeasuringInstrument.create(req.body);
    res.status(201).json(instrument);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json(ResponseFormatter.error(err.message, err.status));
    }
    if (err.code === '23505') {
      return res.status(409).json(ResponseFormatter.error('Табельный номер уже существует', 409));
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const updated = await MeasuringInstrument.update(req.params.id, req.body);
    if (!updated) return res.status(404).json(ResponseFormatter.error('СИ не найдено', 404));
    res.json(updated);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json(ResponseFormatter.error(err.message, err.status));
    }
    if (err.code === '23505') {
      return res.status(409).json(ResponseFormatter.error('Табельный номер уже существует', 409));
    }
    next(err);
  }
}

async function writeOff(req, res, next) {
  try {
    const instrument = await MeasuringInstrument.writeOff(req.params.id);
    if (!instrument) return res.status(404).json(ResponseFormatter.error('СИ не найдено', 404));
    res.json(instrument);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json(ResponseFormatter.error(err.message, err.status));
    }
    next(err);
  }
}

async function getVerifications(req, res, next) {
  try {
    const verifications = await MeasuringInstrument.getVerifications(req.params.id);
    res.json(verifications);
  } catch (err) { next(err); }
}

async function addVerification(req, res, next) {
  try {
    const verification = await MeasuringInstrument.addVerification(req.params.id, req.body, null);
    res.status(201).json(verification);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json(ResponseFormatter.error(err.message, err.status));
    }
    next(err);
  }
}

async function updateVerification(req, res, next) {
  try {
    const verification = await MeasuringInstrument.updateVerification(
      req.params.id,
      req.params.verificationId,
      req.body,
      null
    );
    res.json(verification);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json(ResponseFormatter.error(err.message, err.status));
    }
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  writeOff,
  getVerifications,
  addVerification,
  updateVerification
};
