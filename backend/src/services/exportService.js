const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const User = require('../models/User');
const Console = require('../models/Console');
const Rental = require('../models/Rental');
const Penalty = require('../models/Penalty');

class ExportService {
  /**
   * Экспортирует аналитику в PDF
   * @param {object} data - Данные для экспорта
   * @returns {Promise<Buffer>} PDF буфер
   */
  static async exportAnalyticsToPDF(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 50,
          bufferPages: true,
        });

        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Заголовок
        doc.fontSize(24).font('Helvetica-Bold').text('Отчёт по аналитике', { align: 'center' });
        doc.fontSize(12)
          .font('Helvetica')
          .text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, { align: 'center' });
        doc.moveDown();

        // Основные показатели
        doc.fontSize(16).font('Helvetica-Bold').text('Основные показатели', { underline: true });
        doc.fontSize(11).font('Helvetica');

        if (data.overview) {
          doc.text(`• Всего пользователей: ${data.overview.totalUsers || 0}`);
          doc.text(`• Всего консолей: ${data.overview.totalConsoles || 0}`);
          doc.text(`• Активных аренд: ${data.overview.activeRentals || 0}`);
          doc.text(`• Штрафов: ${data.overview.totalPenalties || 0}`);
        }

        doc.moveDown();

        // Доход
        if (data.revenue && data.revenue.length > 0) {
          doc.fontSize(16).font('Helvetica-Bold').text('Доход', { underline: true });
          doc.fontSize(11).font('Helvetica');

          data.revenue.forEach((item) => {
            doc.text(`• ${item.period || 'Период'}: ${item.total || 0}L`);
          });
          doc.moveDown();
        }

        // Топ консолей
        if (data.topConsoles && data.topConsoles.length > 0) {
          doc.fontSize(16).font('Helvetica-Bold').text('Топ консолей', { underline: true });
          doc.fontSize(11).font('Helvetica');

          data.topConsoles.slice(0, 10).forEach((console, index) => {
            doc.text(`${index + 1}. ${console.name || 'N/A'} - ${console.rentals || 0} аренд (${console.revenue || 0}L)`);
          });
          doc.moveDown();
        }

        // Топ пользователей
        if (data.topUsers && data.topUsers.length > 0) {
          doc.fontSize(16).font('Helvetica-Bold').text('Активные пользователи', { underline: true });
          doc.fontSize(11).font('Helvetica');

          data.topUsers.slice(0, 10).forEach((user, index) => {
            doc.text(`${index + 1}. ${user.username || 'N/A'} - ${user.totalSpent || 0}L`);
          });
          doc.moveDown();
        }

        // Штрафы
        if (data.penalties && data.penalties.length > 0) {
          doc.fontSize(16).font('Helvetica-Bold').text('Штрафы по типам', { underline: true });
          doc.fontSize(11).font('Helvetica');

          data.penalties.forEach((penalty) => {
            doc.text(`• ${penalty.type || 'N/A'}: ${penalty.count || 0} (${penalty.total || 0}L)`);
          });
        }

        doc.end();
      } catch (error) {
        reject(new Error(`Ошибка экспорта PDF: ${error.message}`));
      }
    });
  }

  /**
   * Экспортирует консоли в Excel
   * @param {array} consoles - Массив консолей
   * @returns {Promise<Buffer>} Excel буфер
   */
  static async exportConsolesToExcel(consoles) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Консоли');

      // Заголовки
      worksheet.columns = [
        { header: 'ID', key: '_id', width: 24 },
        { header: 'Название', key: 'name', width: 20 },
        { header: 'Модель', key: 'model', width: 15 },
        { header: 'Цена/день', key: 'pricePerDay', width: 12 },
        { header: 'Статус', key: 'status', width: 12 },
        { header: 'Категория', key: 'category', width: 15 },
        { header: 'Рейтинг', key: 'rating', width: 10 },
        { header: 'Аренд', key: 'rentals', width: 10 },
        { header: 'Создано', key: 'createdAt', width: 15 },
      ];

      // Стили для заголовков
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };

      // Данные
      consoles.forEach((console) => {
        worksheet.addRow({
          _id: console._id || '',
          name: console.name || '',
          model: console.model || '',
          pricePerDay: console.pricePerDay || 0,
          status: console.status || '',
          category: console.category?.name || 'N/A',
          rating: console.averageRating?.toFixed(2) || 'N/A',
          rentals: console.totalRentals || 0,
          createdAt: console.createdAt ? new Date(console.createdAt).toLocaleDateString('ru-RU') : '',
        });
      });

      // Форматирование чисел
      worksheet.getColumn('E').numFmt = '₽#,##0.00';
      worksheet.getColumn('G').numFmt = '0.00';

      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      throw new Error(`Ошибка экспорта Excel консолей: ${error.message}`);
    }
  }

  /**
   * Экспортирует пользователей в Excel
   * @param {array} users - Массив пользователей
   * @returns {Promise<Buffer>} Excel буфер
   */
  static async exportUsersToExcel(users) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Пользователи');

      worksheet.columns = [
        { header: 'ID', key: '_id', width: 24 },
        { header: 'Имя', key: 'firstName', width: 15 },
        { header: 'Фамилия', key: 'lastName', width: 15 },
        { header: 'Телефон', key: 'phone', width: 15 },
        { header: 'Email', key: 'email', width: 20 },
        { header: 'Аренд', key: 'rentals', width: 10 },
        { header: 'Статус', key: 'status', width: 12 },
        { header: 'Создано', key: 'createdAt', width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' },
      };

      users.forEach((user) => {
        worksheet.addRow({
          _id: user._id || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phone || '',
          email: user.email || '',
          rentals: user.totalRentals || 0,
          status: user.isBlocked ? 'Заблокирован' : 'Активен',
          createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '',
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      throw new Error(`Ошибка экспорта Excel пользователей: ${error.message}`);
    }
  }

  /**
   * Экспортирует аренды в Excel
   * @param {array} rentals - Массив аренд
   * @returns {Promise<Buffer>} Excel буфер
   */
  static async exportRentalsToExcel(rentals) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Аренды');

      worksheet.columns = [
        { header: 'ID', key: '_id', width: 24 },
        { header: 'Пользователь', key: 'user', width: 20 },
        { header: 'Консоль', key: 'console', width: 20 },
        { header: 'Начало', key: 'startDate', width: 15 },
        { header: 'Конец', key: 'endDate', width: 15 },
        { header: 'Стоимость', key: 'totalPrice', width: 12 },
        { header: 'Статус', key: 'status', width: 12 },
        { header: 'Штраф', key: 'penalty', width: 10 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC000' },
      };

      rentals.forEach((rental) => {
        worksheet.addRow({
          _id: rental._id || '',
          user: rental.user?.firstName + ' ' + rental.user?.lastName || 'N/A',
          console: rental.console?.name || 'N/A',
          startDate: rental.startDate ? new Date(rental.startDate).toLocaleDateString('ru-RU') : '',
          endDate: rental.endDate ? new Date(rental.endDate).toLocaleDateString('ru-RU') : '',
          totalPrice: rental.totalPrice || 0,
          status: rental.status || '',
          penalty: rental.penalty ? `${rental.penalty.amount}₽` : 'Нет',
        });
      });

      worksheet.getColumn('F').numFmt = '₽#,##0.00';

      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      throw new Error(`Ошибка экспорта Excel аренд: ${error.message}`);
    }
  }

  /**
   * Экспортирует штрафы в Excel
   * @param {array} penalties - Массив штрафов
   * @returns {Promise<Buffer>} Excel буфер
   */
  static async exportPenaltiesToExcel(penalties) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Штрафы');

      worksheet.columns = [
        { header: 'ID', key: '_id', width: 24 },
        { header: 'Пользователь', key: 'user', width: 20 },
        { header: 'Консоль', key: 'console', width: 20 },
        { header: 'Тип', key: 'type', width: 15 },
        { header: 'Сумма', key: 'amount', width: 12 },
        { header: 'Статус', key: 'status', width: 12 },
        { header: 'Создано', key: 'createdAt', width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC00000' },
      };

      penalties.forEach((penalty) => {
        worksheet.addRow({
          _id: penalty._id || '',
          user: penalty.user?.firstName + ' ' + penalty.user?.lastName || 'N/A',
          console: penalty.console?.name || 'N/A',
          type: penalty.type || '',
          amount: penalty.amount || 0,
          status: penalty.status || '',
          createdAt: penalty.createdAt ? new Date(penalty.createdAt).toLocaleDateString('ru-RU') : '',
        });
      });

      worksheet.getColumn('E').numFmt = '₽#,##0.00';

      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      throw new Error(`Ошибка экспорта Excel штрафов: ${error.message}`);
    }
  }

  /**
   * Экспортирует аналитику в Excel
   * @param {object} data - Данные для экспорта
   * @returns {Promise<Buffer>} Excel буфер
   */
  static async exportAnalyticsToExcel(data) {
    try {
      const workbook = new ExcelJS.Workbook();

      // Overview лист
      if (data.overview) {
        const worksheet = workbook.addWorksheet('Обзор');
        worksheet.columns = [
          { header: 'Метрика', key: 'metric', width: 25 },
          { header: 'Значение', key: 'value', width: 20 },
        ];

        const rows = [
          { metric: 'Всего пользователей', value: data.overview.totalUsers || 0 },
          { metric: 'Всего консолей', value: data.overview.totalConsoles || 0 },
          { metric: 'Активных аренд', value: data.overview.activeRentals || 0 },
          { metric: 'Штрафов', value: data.overview.totalPenalties || 0 },
        ];

        worksheet.addRows(rows);
        worksheet.getColumn('B').numFmt = '#,##0';
      }

      // Revenue лист
      if (data.revenue && data.revenue.length > 0) {
        const worksheet = workbook.addWorksheet('Доход');
        worksheet.columns = [
          { header: 'Период', key: 'period', width: 25 },
          { header: 'Сумма (L)', key: 'total', width: 20 },
        ];

        worksheet.addRows(data.revenue);
        worksheet.getColumn('B').numFmt = '#,##0.00';
      }

      // Top Consoles лист
      if (data.topConsoles && data.topConsoles.length > 0) {
        const worksheet = workbook.addWorksheet('Топ консолей');
        worksheet.columns = [
          { header: 'Название', key: 'name', width: 25 },
          { header: 'Аренд', key: 'rentals', width: 15 },
          { header: 'Доход (L)', key: 'revenue', width: 15 },
        ];

        worksheet.addRows(data.topConsoles);
        worksheet.getColumn('B').numFmt = '#,##0';
        worksheet.getColumn('C').numFmt = '#,##0.00';
      }

      // Top Users лист
      if (data.topUsers && data.topUsers.length > 0) {
        const worksheet = workbook.addWorksheet('Топ пользователей');
        worksheet.columns = [
          { header: 'Пользователь', key: 'username', width: 25 },
          { header: 'Потрачено (L)', key: 'totalSpent', width: 20 },
        ];

        worksheet.addRows(data.topUsers);
        worksheet.getColumn('B').numFmt = '#,##0.00';
      }

      // Penalties лист
      if (data.penalties && data.penalties.length > 0) {
        const worksheet = workbook.addWorksheet('Штрафы');
        worksheet.columns = [
          { header: 'Тип', key: 'type', width: 25 },
          { header: 'Количество', key: 'count', width: 15 },
          { header: 'Сумма (L)', key: 'total', width: 15 },
        ];

        worksheet.addRows(data.penalties);
        worksheet.getColumn('B').numFmt = '#,##0';
        worksheet.getColumn('C').numFmt = '#,##0.00';
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      throw new Error(`Ошибка экспорта аналитики в Excel: ${error.message}`);
    }
  }
}

module.exports = ExportService;
