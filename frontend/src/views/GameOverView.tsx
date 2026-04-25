import { usePlayerStore } from '../store/usePlayerStore';
import { RefreshCw } from 'lucide-react';
import qrcode from '../assets/jiangping_qrcode.png'; 

export default function GameOverView({ onRestart }: { onRestart: () => void }) {
  const { health_status } = usePlayerStore();
  const isDead = Object.values(health_status).some(h => typeof h === 'number' && h <= 0) || Object.values(health_status.hardware_details).some(h => h <= 0);

  const handleRestart = () => {
    onRestart();
  };

  if (isDead) {
    return (
      <div className="w-full h-full bg-blue-600 flex flex-col items-start justify-center p-12 text-white font-mono">
        <h1 className="text-8xl mb-8">:(</h1>
        <h2 className="text-3xl mb-4">你的电脑遇到了问题，需要重新启动。</h2>
        <p className="text-xl opacity-80 mb-8">
          我们只收集某些错误信息，然后你可以重新启动。<br/>
          (健康度归零)
        </p>
        <button 
          onClick={handleRestart}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded transition-colors"
        >
          <RefreshCw size={20} />
          重新开始
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-8 text-zinc-100">
      <div className="bg-zinc-900/80 p-12 rounded-2xl border border-zinc-800 text-center max-w-2xl backdrop-blur-md shadow-2xl shadow-indigo-500/10">
        <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
          生存成功！
        </h1>
        <p className="text-zinc-400 text-lg mb-8">
          恭喜你，在这个充满“电脑刺客”的校园里成功存活了 {import.meta.env.VITE_STANDARD_MODE_DAYS || 7} 天。
        </p>
        <div className="mb-8 flex flex-col items-center">
          <img 
            src={qrcode} 
            alt="二维码" 
            className="w-40 h-40 rounded-lg shadow-lg border border-zinc-700"
          />
          <p className="text-zinc-500 text-sm mt-2">扫码领取奖品吧！</p>
        </div>
        <button 
          onClick={handleRestart}
          className="flex items-center gap-2 mx-auto bg-indigo-600 hover:bg-indigo-700 px-8 py-4 rounded-xl transition-all font-semibold"
        >
          <RefreshCw size={20} />
          再玩一次
        </button>
      </div>
    </div>
  );
}
