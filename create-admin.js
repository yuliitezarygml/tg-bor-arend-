const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Подключаемся к MongoDB
mongoose.connect('mongodb://localhost:27017/ps4-rental', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Определяем схему Admin
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, default: 'admin' },
  permissions: {
    canManageConsoles: { type: Boolean, default: true },
    canManageRentals: { type: Boolean, default: true },
    canManageUsers: { type: Boolean, default: true },
    canManageAdmins: { type: Boolean, default: false },
  },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
});

// Хеширование пароля перед сохранением
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const Admin = mongoose.model('Admin', adminSchema);

// Создаем админа
const createAdmin = async () => {
  try {
    // Проверяем существование админа
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('❌ Админ с username "admin" уже существует!');
      console.log('Удаляю старого админа...');
      await Admin.deleteOne({ username: 'admin' });
      console.log('✅ Старый админ удален');
    }
    
    // Создаем нового админа
    const admin = new Admin({
      username: 'admin',
      password: 'admin123',
      email: 'admin@ps4rental.local',
      role: 'superadmin',
      permissions: {
        canManageConsoles: true,
        canManageRentals: true,
        canManageUsers: true,
        canManageAdmins: true,
      },
      isActive: true,
    });
    
    await admin.save();
    
    console.log('\n✅ Админ успешно создан!');
    console.log('═══════════════════════════════════');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Email: admin@ps4rental.local');
    console.log('Role: superadmin');
    console.log('═══════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка создания админа:', error.message);
    process.exit(1);
  }
};

createAdmin();
