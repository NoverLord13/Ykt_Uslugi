import React from 'react';

// Типизация для объявлений
interface Listing {
  id: number;
  title: string;
  price: string;
  description: string;
}

export const Profile = () => {
  // Демо-данные профиля (потом замените на данные из API/props)
  const user = {
    username: "ivan_master99",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256", // Симпатичная заглушка
    bio: "Профессиональные услуги сантехника, электрика и мелкий бытовой ремонт. Опыт работы более 7 лет. Весь необходимый инструмент в наличии. Выезд в день обращения, гарантия на работу."
  };

  // Демо-данные объявлений
  const listings: Listing[] = [
    {
      id: 1,
      title: "Услуги сантехника / Устранение засоров любой сложности",
      price: "от 1 500 ₽",
      description: "Монтаж и замена труб, ремонт смесителей, установка унитазов, раковин и ванн. Быстро, качественно, чисто."
    },
    {
      id: 2,
      title: "Подключение стиральных и посудомоечных машин",
      price: "от 1 000 ₽",
      description: "Профессиональный монтаж к системе водоснабжения и канализации. Выставление по уровню, проверка работы."
    },
    {
      id: 3,
      title: "Комплексный ремонт ванной комнаты под ключ",
      price: "Цена договорная",
      description: "Демонтаж старой сантехники, разводка новых труб, укладка плитки, установка всех санфаянсовых приборов."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* ================= ШАПКА ПРОФИЛЯ ================= */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          
          {/* Аватарка */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-100 border-2 border-indigo-100 flex-shrink-0 shadow-inner">
            <img 
              src={user.avatarUrl} 
              alt={user.username} 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Информационный блок: Справа от аватарки */}
          <div className="flex-1 text-center sm:text-left space-y-3">
            {/* Логин */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              @{user.username}
            </h1>
            
            {/* Описание под логином */}
            <p className="text-gray-600 text-base leading-relaxed max-w-2xl">
              {user.bio}
            </p>
            
            {/* Декоративные теги статуса (опционально) */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
              <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                Проверенный мастер
              </span>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
                Сантехника
              </span>
            </div>
          </div>

        </div>

        {/* ================= БЛОК ОБЪЯВЛЕНИЙ ================= */}
        <div className="space-y-4">
          {/* Заголовок секции */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-xl font-bold text-gray-900">
              Объявления пользователя
            </h2>
            <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
              {listings.length}
            </span>
          </div>

          {/* Сетка карточек объявлений */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map((item) => (
              <div 
                key={item.id} 
                className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
              >
                <div className="space-y-2">
                  {/* Название услуги */}
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  {/* Цена */}
                  <p className="text-sm font-bold text-indigo-600">
                    {item.price}
                  </p>
                  {/* Краткое описание */}
                  <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                
                {/* Футер карточки с кнопкой действия */}
                <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end">
                  <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-800 flex items-center gap-1 transition-colors">
                    Подробнее <span>&rarr;</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Заглушка, если объявлений нет (для будущего использования) */}
          {listings.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">У этого пользователя пока нет активных объявлений.</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};