import { usePlayerStore } from '../store/usePlayerStore';
import { ShoppingBag, Wrench, Book, Backpack, Wallet, Cpu, Activity, ShieldCheck, QrCode, MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

export function WalletApp() {
  const { attributes } = usePlayerStore();
  
  return (
    <div className="p-4 flex flex-col h-full animate-in fade-in duration-300">
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 mb-6 text-center">
        <p className="text-emerald-600 dark:text-emerald-400 font-medium mb-2">校园卡余额</p>
        <h1 className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">¥ {attributes.wealth.toFixed(2)}</h1>
      </div>
    </div>
  );
}

export function StoreApp() {
  const { attributes, updateAttribute, addToInventory } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<'official' | 'xianyu'>('official');
  
  const officialProducts = [
    { id: 'p1', name: '正版杀毒软件', price: 200, item: { id: 'item_av', name: '正版杀毒软件', quality: 'official', effects: { target: 'software', val: 50 } } },
    { id: 'p2', name: '信越7921硅脂', price: 20, item: { id: 'item_paste_good', name: '信越7921硅脂', quality: 'official', effects: { target: 'hw_fan', val: 50 } } },
    { id: 'p3', name: '原装内存条', price: 150, item: { id: 'item_ram_good', name: '原装内存条', quality: 'official', effects: { target: 'hw_ram', val: 100 } } },
  ];
  
  const xianyuProducts = [
    { id: 'x1', name: '二手杂牌内存条', price: 50, item: { id: 'item_ram_bad', name: '二手杂牌内存条', quality: 'xianyu', effects: { target: 'hw_ram', val: 20 } } },
    { id: 'x2', name: '九成新屏幕总成', price: 100, item: { id: 'item_screen_bad', name: '九成新屏幕总成', quality: 'xianyu', effects: { target: 'hw_screen', val: 30 } } },
    { id: 'x3', name: '神秘水洗风扇', price: 10, item: { id: 'item_fan_bad', name: '神秘水洗风扇', quality: 'xianyu', effects: { target: 'hw_fan', val: 15 } } },
  ];

  const products = activeTab === 'official' ? officialProducts : xianyuProducts;

  const handleBuy = (p: any) => {
    if (attributes.wealth >= p.price) {
      updateAttribute('wealth', -p.price);
      addToInventory(p.item);
      alert(`购买成功：${p.name} 已放入背包`);
    } else {
      alert("余额不足！");
    }
  };

  return (
    <div className="p-4 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold flex items-center gap-2"><ShoppingBag size={18}/> 线上商城</h3>
        <span className="text-sm font-medium text-emerald-600">余额: ¥{attributes.wealth}</span>
      </div>
      
      <div className="flex gap-2 mb-4 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <button onClick={() => setActiveTab('official')} className={clsx("flex-1 py-1.5 text-sm font-medium rounded-md transition-all", activeTab === 'official' ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-zinc-500")}>官方旗舰店</button>
        <button onClick={() => setActiveTab('xianyu')} className={clsx("flex-1 py-1.5 text-sm font-medium rounded-md transition-all", activeTab === 'xianyu' ? "bg-white dark:bg-zinc-700 shadow-sm text-yellow-600 dark:text-yellow-500" : "text-zinc-500")}>闲鱼二手</button>
      </div>

      <div className="grid gap-3 overflow-y-auto">
        {products.map(p => (
          <div key={p.id} className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
            <div>
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{p.name}</h4>
              <p className="text-[10px] text-zinc-500">使用后增加: {p.item.effects.target} +{p.item.effects.val}</p>
            </div>
            <button 
              onClick={() => handleBuy(p)}
              disabled={attributes.wealth < p.price}
              className="px-3 py-1.5 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
            >
              ¥{p.price}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RepairApp() {
  const { attributes, updateAttribute, inventory, updateHealth, addPendingRepair, removeFromInventory } = usePlayerStore();

  const handleNPARepair = (type: string) => {
    if (type === 'software') {
      const item = inventory.find(i => i.name.includes('杀毒'));
      if (item) {
        addPendingRepair({ name: '软件问题义诊 (自带正版软件)', target: item.effects.target, val: item.effects.val + 20 });
        removeFromInventory(item.name);
        alert("预约成功：使用了你自带的正版杀毒软件，下回合生效。");
      } else {
        addPendingRepair({ name: '软件问题义诊', target: 'software', val: 30 });
        alert("预约成功：软件问题义诊，下回合生效。");
      }
    } else if (type === 'hardware') {
      // Find hardware items (paste, ram, screen, fan)
      const item = inventory.find(i => ['硅脂', '内存', '屏幕', '风扇'].some(k => i.name.includes(k)));
      if (item) {
        if (attributes.wealth < 2) return alert("余额不足！需要 2 元手工费");
        updateAttribute('wealth', -2);
        addPendingRepair({ name: `义诊更换硬件 (${item.name})`, target: item.effects.target, val: item.effects.val });
        removeFromInventory(item.name);
        alert(`预约成功：使用了你的【${item.name}】，仅收2元手工费，下回合生效。`);
      } else {
        if (attributes.wealth < 12) return alert("余额不足！网协材料费需要 12 元");
        updateAttribute('wealth', -12);
        addPendingRepair({ name: '更换散热硅脂 (网协材料)', target: 'hw_fan', val: 30 });
        alert(`预约成功：使用网协提供的普通硅脂，收12元材料与手工费，下回合生效。`);
      }
    }
  };

  const handleLenovoRepair = () => {
    if (attributes.wealth < 300) return alert("余额不足！");
    updateAttribute('wealth', -300);
    updateAttribute('mental_state', -20);
    updateHealth('system', 100);
    updateHealth('software', 100);
    alert("学服联想电脑店当场帮你重装了系统！被坑了300块，但问题解决了。");
  };

  const handleOutsideRepair = () => {
    if (attributes.wealth < 600) return alert("余额不足！");
    updateAttribute('wealth', -600);
    updateAttribute('mental_state', -30);
    updateHealth('hardware', 100); // Recalculated by store action automatically
    alert("校外维修店帮你大修了整台电脑，花了 600 块巨款！心痛！");
  };

  return (
    <div className="p-4 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="text-center mb-6 pt-4">
        <Wrench size={48} className="mx-auto text-amber-500 mb-2 drop-shadow-sm" />
        <h2 className="text-xl font-bold">维修服务网</h2>
      </div>

      <div className="space-y-4 overflow-y-auto pb-6 pr-2">
        {/* NPA Services */}
        <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-2 block pl-2">网协电脑诊所（预约制）</span>
          <div className="space-y-3 pl-2">
            <div className="flex justify-between items-center">
              <div><p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">软件系统义诊</p></div>
              <button onClick={() => handleNPARepair('software')} className="px-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 text-xs font-bold rounded-md">免费 (支持自带软件)</button>
            </div>
            <div className="flex justify-between items-center">
              <div><p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">清灰与硬件更换</p></div>
              <button onClick={() => handleNPARepair('hardware')} className="px-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 text-xs font-bold rounded-md">
                ¥12 或 ¥2(自带硬件)
              </button>
            </div>
          </div>
        </div>

        {/* Xuefu Lenovo Services */}
        <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <div className="pl-2">
            <span className="text-xs text-blue-500 font-bold">学服联想电脑店</span>
            <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 mt-1">系统重装大法</h4>
            <p className="text-xs text-zinc-500 mt-1">技术不精，收费昂贵，一律重装。</p>
            <button onClick={handleLenovoRepair} className="w-full mt-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-lg text-sm font-medium">¥300 立即重装</button>
          </div>
        </div>

        {/* Outside Services */}
        <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
          <div className="pl-2">
            <span className="text-xs text-red-500 font-bold">校外维修黑店</span>
            <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 mt-1">深度主板级大修</h4>
            <p className="text-xs text-zinc-500 mt-1">能修硬件，但水很深，价格极贵。</p>
            <button onClick={handleOutsideRepair} className="w-full mt-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium">¥600 立即大修</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InventoryApp() {
  const { inventory } = usePlayerStore();
  return (
    <div className="p-4 h-full flex flex-col animate-in fade-in duration-300">
      <h3 className="font-semibold flex items-center gap-2 mb-4"><Backpack size={18}/> 我的背包</h3>
      {inventory.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
          <Backpack size={48} className="mb-2 opacity-20" />
          <p>背包空空如也</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {inventory.map((item, idx) => (
            <div key={idx} className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm relative">
              <span className={clsx("absolute top-1 right-1 text-[8px] px-1 rounded", item.quality === 'official' ? "bg-blue-100 text-blue-600" : "bg-yellow-100 text-yellow-600")}>
                {item.quality === 'official' ? '官方' : '二手'}
              </span>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mt-2">{item.name}</span>
              <span className="text-[10px] text-zinc-400">效果: +{item.effects.val} {item.effects.target.replace('hw_', '')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WikiApp() {
  const { hidden_flags, markArticleRead, joinNPA, day } = usePlayerStore();
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeArticle, setActiveArticle] = useState<any>(null);

  const articles = [
    { id: 'w1', title: '《小白必看：如何正确关机》', gain: 5, unlockDay: 1, content: '不要直接拔电源！正常的流程应该是点击左下角的开始菜单，选择电源，然后关机。如果直接长按电源键，这属于强制断电，可能会因为磁头划伤导致机械硬盘数据损坏哦。' },
    { id: 'w2', title: '《闲鱼防骗指南 2026版》', gain: 10, unlockDay: 2, content: '遇到“女生自用”、“去其他平台交易”、“交定金发货”的卖家，请直接拉黑！在二手交易中，最关键的是保护自身财产安全，千万不要点开任何来历不明的链接。' },
    { id: 'w3', title: '《什么是勒索病毒？》', gain: 8, unlockDay: 3, content: '这是一种非常可怕的电脑病毒，它会把你的所有文件进行不可逆的高强度加密。它经常潜伏在一些“破解游戏”、“免费外挂”和不良网站中。如果不小心中招，除了重装系统几乎无解。' },
    { id: 'w4', title: '《电脑进水了怎么办？》', gain: 12, unlockDay: 4, content: '立刻断电并长按电源键关机！千万不要用吹风机的热风吹，这会把水汽吹进主板深处或融化外壳。应该将电脑倒置成倒V型，放在通风处阴干，并尽快送去网协检修。' },
    { id: 'w5', title: '《为什么电脑会越来越卡？》', gain: 6, unlockDay: 5, content: '通常是因为流氓软件互相唤醒造成的内存不足。很多软件安装时会有捆绑的勾选框，如果你一路“下一步”，就会收获全家桶套餐。' },
  ];

  const visibleArticles = articles.filter(a => day >= a.unlockDay);

  const handleRead = (a: any) => {
    setActiveArticle(a);
    if (!hidden_flags.read_articles.includes(a.id)) {
      markArticleRead(a.id, a.gain);
    }
  };

  const handleJoinGroup = () => {
    joinNPA();
    setShowQrModal(false);
  };

  return (
    <div className="p-4 h-full animate-in fade-in duration-300 overflow-y-auto">
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-4">扫码加入网协答疑群</h3>
            <div className="w-48 h-48 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center mb-6 border-2 border-dashed border-zinc-300 dark:border-zinc-700 overflow-hidden">
              <img src="/qrcode.png" alt="群二维码" className="w-full h-full object-contain" onError={(e) => e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>'} />
            </div>
            <button onClick={handleJoinGroup} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-md">我已加群</button>
            <button onClick={() => setShowQrModal(false)} className="w-full py-3 mt-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-sm font-medium">取消</button>
          </div>
        </div>
      )}

      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-400 leading-tight pr-4">{activeArticle.title}</h3>
              <button onClick={() => setActiveArticle(null)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xl font-bold px-2">×</button>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl mb-6 text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
              {activeArticle.content}
            </div>
            <button onClick={() => setActiveArticle(null)} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all">阅毕关闭</button>
          </div>
        </div>
      )}

      {!hidden_flags.joined_npa ? (
        <div className="flex flex-col items-center text-center p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-2xl mb-6">
          <QrCode size={48} className="text-blue-500 mb-3" />
          <h3 className="font-bold text-lg text-blue-900 dark:text-blue-300">网协新生答疑群</h3>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-2 mb-4">加入即可获取每日“树莓娘的小贴士”，常识大幅提升！</p>
          <button onClick={() => setShowQrModal(true)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-lg">扫码加群</button>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-6 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
          <MessageCircle size={24} className="text-indigo-600 dark:text-indigo-400" />
          <div>
            <h3 className="font-bold text-indigo-900 dark:text-indigo-300">网协资料库</h3>
            <p className="text-xs text-indigo-700 dark:text-indigo-400">群文件库。每日更新新文章，阅读可获得常识。</p>
          </div>
        </div>
      )}

      {hidden_flags.joined_npa && (
        <div className="space-y-3">
          {visibleArticles.map(a => {
            const isRead = (hidden_flags.read_articles || []).includes(a.id);
            return (
              <div key={a.id} className={clsx("p-4 border rounded-xl flex justify-between items-center transition-all", isRead ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 opacity-70" : "border-indigo-200 dark:border-indigo-800/50 bg-white dark:bg-zinc-800 shadow-sm cursor-pointer")} onClick={() => handleRead(a)}>
                <div>
                  <h4 className={clsx("font-medium text-sm", isRead ? "text-zinc-500" : "text-zinc-800 dark:text-zinc-200")}>{a.title}</h4>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {isRead ? "已学习 | 点击回看" : `首阅奖励: 常识 +${a.gain} | 精神 -5`}
                  </p>
                </div>
                {!isRead && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
