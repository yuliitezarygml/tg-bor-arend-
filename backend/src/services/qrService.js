const QRCode = require('qrcode');
const Console = require('../models/Console');

class QRCodeService {
  /**
   * Генерирует QR-код для консоли
   * @param {string} consoleId - ID консоли
   * @returns {Promise<string>} Base64 строка QR-кода
   */
  static async generateQRCode(consoleId) {
    try {
      const qrData = {
        id: consoleId,
        type: 'console',
        timestamp: new Date().toISOString(),
      };

      const qrJson = JSON.stringify(qrData);
      const qrCodeDataUrl = await QRCode.toDataURL(qrJson, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return qrCodeDataUrl;
    } catch (error) {
      throw new Error(`Ошибка генерации QR-кода: ${error.message}`);
    }
  }

  /**
   * Генерирует QR-код в виде буфера
   * @param {string} consoleId - ID консоли
   * @returns {Promise<Buffer>} QR-код как PNG буфер
   */
  static async generateQRCodeBuffer(consoleId) {
    try {
      const qrData = {
        id: consoleId,
        type: 'console',
        timestamp: new Date().toISOString(),
      };

      const qrJson = JSON.stringify(qrData);
      const buffer = await QRCode.toBuffer(qrJson, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return buffer;
    } catch (error) {
      throw new Error(`Ошибка генерации QR-кода: ${error.message}`);
    }
  }

  /**
   * Сохраняет QR-код для консоли в базу данных
   * @param {string} consoleId - ID консоли
   * @returns {Promise<string>} Base64 QR-код
   */
  static async saveQRCodeForConsole(consoleId) {
    try {
      const qrCode = await this.generateQRCode(consoleId);

      await Console.findByIdAndUpdate(consoleId, { qrCode }, { new: true });

      return qrCode;
    } catch (error) {
      throw new Error(`Ошибка сохранения QR-кода: ${error.message}`);
    }
  }

  /**
   * Генерирует QR-коды для всех консолей
   * @returns {Promise<object>} Результаты генерации
   */
  static async generateQRCodesForAll() {
    try {
      const consoles = await Console.find({ qrCode: { $exists: false } });
      let generated = 0;
      let failed = 0;

      for (const console of consoles) {
        try {
          const qrCode = await this.generateQRCode(console._id.toString());
          await Console.findByIdAndUpdate(console._id, { qrCode });
          generated++;
        } catch (error) {
          console.error(`Ошибка QR для консоли ${console._id}:`, error.message);
          failed++;
        }
      }

      return {
        success: true,
        generated,
        failed,
        total: consoles.length,
      };
    } catch (error) {
      throw new Error(`Ошибка массовой генерации QR: ${error.message}`);
    }
  }

  /**
   * Регенерирует QR-код для консоли
   * @param {string} consoleId - ID консоли
   * @returns {Promise<string>} Новый Base64 QR-код
   */
  static async regenerateQRCode(consoleId) {
    try {
      const console = await Console.findById(consoleId);
      if (!console) {
        throw new Error('Консоль не найдена');
      }

      const qrCode = await this.generateQRCode(consoleId);
      await Console.findByIdAndUpdate(consoleId, { qrCode }, { new: true });

      return qrCode;
    } catch (error) {
      throw new Error(`Ошибка регенерации QR: ${error.message}`);
    }
  }

  /**
   * Получает QR-код консоли
   * @param {string} consoleId - ID консоли
   * @returns {Promise<string>} Base64 QR-код
   */
  static async getQRCode(consoleId) {
    try {
      const console = await Console.findById(consoleId);
      if (!console) {
        throw new Error('Консоль не найдена');
      }

      if (!console.qrCode) {
        return this.saveQRCodeForConsole(consoleId);
      }

      return console.qrCode;
    } catch (error) {
      throw new Error(`Ошибка получения QR: ${error.message}`);
    }
  }
}

module.exports = QRCodeService;
