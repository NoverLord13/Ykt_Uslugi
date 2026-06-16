import { useState, useEffect, type ChangeEvent } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { api, type Tag } from '../api/Api';
import { useNavigate } from 'react-router-dom';

export const AdAdder = () => {

  const navigate = useNavigate();
 

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);


  useEffect(() => {
    api.getTags().then(setTags);
  }, []);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

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
    selectedTagIds.forEach((id) => {
      formData.append('tag_ids', String(id));
    });
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
      className="flex items-center justify-center bg-white px-4 py-6">
      <div 
        className="w-full max-w- rounded-2xl bg-white p-6 shadow-2xl border border-black text-slate-200"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-5 text-2xl font-bold text-black">Добавить новое объявление</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Название услуги:</label>
            <Input 
              size="middle" 
              color="primary" 
              type="text" 
              placeholder="Например: Услуги Сантехника" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Описание:</label>
            <Input 
              size="description" 
              color="primary" 
              type="text" 
              placeholder="Опишите подробно что вам нужно" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>

          <div>
            {tags.map((tag) => (
              <label key={tag.id} className="block text-sm font-medium text-black mb-1">
                <input
                  type="checkbox"
                  checked={selectedTagIds.includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                  className="rounded-[14px] font-medium min-h-[40px] min-w-[120] text-black placeholder:text-gray-400 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
                {tag.name}
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Стоимость услуги:</label>
            <Input
              size="middle"
              color="primary"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Файл изображения:</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="block w-full text-sm text-black file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={() => navigate('/')} 
            className="px-4 py-2 text-sm text-black cursor-pointer transition-colors"
          >
            Отмена
          </button>
          <Button 
            size="middle" 
            color="primary" 
            title="Загрузить" 
            onClick={handleUpload} />
        </div>
      </div>
    </div>
  );
};