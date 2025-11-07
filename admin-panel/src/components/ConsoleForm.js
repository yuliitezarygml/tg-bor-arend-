import React, { useState } from 'react';
import './ConsoleForm.css';

function ConsoleForm({ onSubmit, initialData }) {
  const [formData, setFormData] = useState(
    initialData || {
      name: '',
      model: '',
      game: '',
      rentalPrice: '',
      description: '',
      location: '',
      image: null,
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      image: e.target.files[0],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form className="console-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label>Название консоли *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Например: PS4-001"
          />
        </div>

        <div className="form-group">
          <label>Модель *</label>
          <select
            name="model"
            value={formData.model}
            onChange={handleChange}
            required
          >
            <option value="">Выберите модель</option>
            <option value="PS4 Slim">PS4 Slim</option>
            <option value="PS4 Pro">PS4 Pro</option>
            <option value="PS5">PS5</option>
            <option value="Xbox Series X">Xbox Series X</option>
            <option value="Nintendo Switch">Nintendo Switch</option>
          </select>
        </div>

        <div className="form-group">
          <label>Игра *</label>
          <input
            type="text"
            name="game"
            value={formData.game}
            onChange={handleChange}
            required
            placeholder="Например: FIFA 24, God of War"
          />
        </div>

        <div className="form-group">
          <label>Цена аренды (MDL/час) *</label>
          <input
            type="number"
            name="rentalPrice"
            value={formData.rentalPrice}
            onChange={handleChange}
            required
            min="0"
            step="10"
          />
        </div>

        <div className="form-group">
          <label>Локация</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Адрес где можно взять консоль"
          />
        </div>

        <div className="form-group">
          <label>Фотография</label>
          <input
            type="file"
            name="image"
            onChange={handleImageChange}
            accept="image/*"
          />
          {initialData?.image && !formData.image && (
            <div className="current-image-preview">
              <p>Текущее фото:</p>
              <img src={initialData.image} alt="Текущее фото консоли" />
            </div>
          )}
          {formData.image && typeof formData.image === 'object' && (
            <div className="current-image-preview">
              <p>Новое фото:</p>
              <img src={URL.createObjectURL(formData.image)} alt="Новое фото консоли" />
            </div>
          )}
        </div>

        <div className="form-group full-width">
          <label>Описание</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            placeholder="Дополнительная информация о консоли..."
          ></textarea>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {initialData ? '✓ Обновить' : '✓ Добавить'}
        </button>
      </div>
    </form>
  );
}

export default ConsoleForm;
