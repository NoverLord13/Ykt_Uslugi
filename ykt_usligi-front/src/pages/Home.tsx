import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

export const Home = () => {

    const navigate = useNavigate();

    return (
        <div className="p-6 max-w-7xl mx-auto text-slate-200 mt-6">
            <div className='flex justify-between items-center mb-8'>
                <div>
                    <h1 className="text-4xl font-bold text-black mb-2">Uslugi Ykt</h1>
                </div>
                
                {/* <button onClick={() => navigate('/adadder')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20">
                    Добавить объявление
                </button> */}
                <Button
                    size="middle"
                    color="primary"
                    title="Добавить объявление"
                    onClick={() => navigate('/adadder')}
                />
            </div>

            <div>
                
            </div>
        </div>
    );
};