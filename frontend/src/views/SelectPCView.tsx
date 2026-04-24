import { usePlayerStore, type ComputerModel } from '../store/usePlayerStore';
import { Laptop } from 'lucide-react';

const availablePCs: ComputerModel[] = [
  {
    model_id: 'lenovo_y9000p_2023',
    display_name: '拯救者 Y9000P 2023',
    base_health_hardware: 100,
    base_health_system: 100,
    cooling_material: 'liquid_metal',
    is_memory_upgradeable: true,
    is_apple_silicon: false,
    price_tier: 1.5,
  },
  {
    model_id: 'TX6PRO',
    display_name: '天选6Pro',
    base_health_hardware: 100,
    base_health_system: 100,
    cooling_material: 'silicone',
    is_memory_upgradeable: true,
    is_apple_silicon: false,
    price_tier: 1.1,
  },
  {
    model_id: 'macbook_air_m2',
    display_name: 'MacBook Air M2',
    base_health_hardware: 100,
    base_health_system: 100,
    cooling_material: 'silicone',
    is_memory_upgradeable: false,
    is_apple_silicon: true,
    price_tier: 2.0,
  },
  {
    model_id: 'hp_omen_8',
    display_name: '惠普暗影精灵 8',
    base_health_hardware: 90,
    base_health_system: 95,
    cooling_material: 'silicone',
    is_memory_upgradeable: true,
    is_apple_silicon: false,
    price_tier: 1.2,
  }
];

import { useState } from 'react';

export default function SelectPCView({ onSelect }: { onSelect: () => void }) {
  const { computer, day, setComputer, resetGame, setPlayerState, hidden_flags } = usePlayerStore();
  const [isEndless, setIsEndless] = useState(hidden_flags?.is_endless_mode || false);

  const handleSelect = (pc: ComputerModel) => {
    resetGame(isEndless);
    setComputer(pc);
    onSelect();
  };

  const handleContinue = () => {
    setPlayerState({ hidden_flags: { ...hidden_flags, is_endless_mode: isEndless } });
    onSelect();
  };

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 relative overflow-y-auto">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-zinc-950 z-0"></div>
      
      <div className="z-10 w-full max-w-4xl py-12">
        {computer && (
          <div className="mb-12 bg-zinc-900/80 border border-indigo-500/30 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between backdrop-blur-md">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">检测到休眠中的系统</h2>
              <p className="text-zinc-400">设备: {computer.display_name} | 当前存活: 第 {day} 天</p>
            </div>
            <div className="mt-6 md:mt-0 flex items-center gap-4">
              <button
                onClick={handleContinue}
                className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
              >
                唤醒并继续
              </button>
            </div>
          </div>
        )}

        <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 text-center">
          {computer ? "或者，覆盖存档以重新开始" : "选择你的初始装备"}
        </h1>
        <p className="text-zinc-400 text-center mb-6">你的电脑配置将决定你在赛博校园的生存难度</p>
        
        <div className="flex justify-center items-center mb-10 gap-3">
          <button
            onClick={() => setIsEndless(!isEndless)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isEndless ? 'bg-indigo-500' : 'bg-zinc-700'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEndless ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
          <span className="text-zinc-300 font-medium">无尽模式 (取消 7 天生存限制)</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availablePCs.map((pc) => (
            <div 
              key={pc.model_id}
              onClick={() => handleSelect(pc)}
              className="group cursor-pointer rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 hover:bg-zinc-800/50 hover:border-indigo-500/50 transition-all duration-300 backdrop-blur-md relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <Laptop size={48} className="text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
              <h2 className="text-xl font-semibold mb-2">{pc.display_name}</h2>
              
              <div className="space-y-2 mt-4 text-sm text-zinc-400">
                <div className="flex justify-between">
                  <span>散热材料</span>
                  <span className="text-zinc-300">{pc.cooling_material === 'liquid_metal' ? '液金' : '硅脂'}</span>
                </div>
                <div className="flex justify-between">
                  <span>支持加装内存</span>
                  <span className="text-zinc-300">{pc.is_memory_upgradeable ? '是' : '否'}</span>
                </div>
                <div className="flex justify-between">
                  <span>架构</span>
                  <span className="text-zinc-300">{pc.is_apple_silicon ? 'ARM' : 'x86'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
