import { useState, type ChangeEvent } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { api } from '../api/Api';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../api/auth';


export const AdAdder = () => {

  const navigate = useNavigate();
 

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [price, setPrice] = useState('');


  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !file) {
      alert("Пожалуйста, введите название и выберите изображение!");
      return;
    }

 
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('image', file); 

    try {
      await api.addAdBlock(formData);
      navigate('/');
    } catch (error) {
      console.error(error);
      alert("Ошибка при загрузке картины. Убедитесь, что вы авторизованы");
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
      onClick={() => navigate('/')}
    >
      <div 
        className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-2xl border border-slate-800 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-2xl font-bold text-white">Добавить новую работу</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Название картины:</label>
            <Input 
              size="middle" 
              color="primary" 
              type="text" 
              placeholder="Например: Нужен сантехник" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Описание:</label>
            <Input 
              size="middle" 
              color="primary" 
              type="text" 
              placeholder="Опишите подробно что вам нужно" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Стоимость услуги:</label>
            <Input
              size="middle"
              color="primary"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Файл изображения:</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600 cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={() => navigate('/')} 
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Отмена
          </button>
          <Button size="middle" color="primary" title="Загрузить" onClick={handleUpload} />
        </div>
      </div>
    </div>
  );
};