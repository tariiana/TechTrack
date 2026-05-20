class ResponseFormatter {
  static success(data, message = null) {
    return { success: true, status: 200, data, message, timestamp: new Date().toISOString() };
  }
  static error(message, status = 400) {
    return { success: false, status, error: message, timestamp: new Date().toISOString() };
  }
  static created(data, message = 'Создано успешно') {
    return { success: true, status: 201, data, message, timestamp: new Date().toISOString() };
  }
  static noContent(message = 'Удалено успешно') {
    return { success: true, status: 204, message, timestamp: new Date().toISOString() };
  }
}
module.exports = ResponseFormatter;