import { usePlayerStore } from '../store/usePlayerStore';
import { 
  Wallet, ShoppingBag, Wrench, Backpack, Book, 
  Power, Activity, Cpu, HardDrive, LayoutTemplate,
  AlertTriangle, Sun, Moon, ShieldCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { WalletApp, StoreApp, RepairApp, InventoryApp, WikiApp } from '../components/Apps';

export interface EventOption {
  option_id: string;
  text: string;
  required_cyber_sense: number;
}
export interface EventSchema {
  event_id: string;
  event_type: string;
  title: string;
  description: string | string[];
  technical_context?: string;
  options: EventOption[];
  timeout_seconds?: number;
  timeout_option_id?: string;
}

export default function DesktopView({ onShutdown }: { onShutdown?: () => void }) {
  const { health_status, attributes, computer, day, hidden_flags, nextDay, setPlayerState, markEventDone } = usePlayerStore();
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [showHardware, setShowHardware] = useState(false);
  
  const [currentEvent, setCurrentEvent] = useState<EventSchema | null>(null);
  const [isEventLoading, setIsEventLoading] = useState(false);
  const [eventResult, setEventResult] = useState<string | null>(null);
  const [timeoutRemaining, setTimeoutRemaining] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // New states for extended event logic
  const [currentEventPage, setCurrentEventPage] = useState<number>(0);
  const [nextEventObj, setNextEventObj] = useState<EventSchema | null>(null);
  const [eventCompleted, setEventCompleted] = useState(false);

  const loadEvent = (event: EventSchema) => {
    setCurrentEvent(event);
    setCurrentEventPage(0);
    setEventResult(null);
    if (event.timeout_seconds && event.timeout_seconds > 0) {
      setTimeoutRemaining(event.timeout_seconds);
    } else {
      setTimeoutRemaining(null);
    }
  };

  const fetchDailyEvent = async () => {
    // If this day's event is already done (e.g. after refresh), skip fetching
    if (usePlayerStore.getState().hidden_flags.event_done_today) {
      setEventCompleted(true);
      return;
    }
    setIsEventLoading(true);
    setEventResult(null);
    setNextEventObj(null);
    setTimeoutRemaining(null);
    setEventCompleted(false);
    try {
      const state = usePlayerStore.getState();
      const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/api/event/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, event_type: 'routine' })
      });
      if (!res.ok) {
        throw new Error(`后端返回错误 HTTP ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      if (data.event) {
        loadEvent(data.event);
      }
      if (data.state) {
        setPlayerState(data.state);
      }
    } catch (e: any) {
      console.error("Fetch event error:", e);
      setEventResult(`网络连接失败！请确保后端已执行: uvicorn main:app --host 0.0.0.0 --port 8000\n\n详细错误: ${e.message}`);
    } finally {
      setIsEventLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyEvent();
  }, [day]);

  useEffect(() => {
    if (timeoutRemaining === null || !currentEvent || eventResult) return;
    
    // Only tick the timer if we are on the LAST page of the event description
    const isMultiPage = Array.isArray(currentEvent.description);
    const isLastPage = !isMultiPage || currentEventPage === (currentEvent.description as string[]).length - 1;
    
    if (!isLastPage) return; // Wait until options are shown to start timing out

    if (timeoutRemaining <= 0) {
      if (currentEvent.timeout_option_id) {
        handleOptionClick(currentEvent.timeout_option_id);
      }
      setTimeoutRemaining(null);
      return;
    }

    const timerId = setTimeout(() => {
      setTimeoutRemaining(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [timeoutRemaining, currentEvent, currentEventPage, eventResult]);

  const handleOptionClick = async (option_id: string) => {
    if (!currentEvent) return;
    setTimeoutRemaining(null);
    try {
      const state = usePlayerStore.getState();
      const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/api/action/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, event: currentEvent, option_id })
      });
      if (!res.ok) {
        throw new Error(`后端返回错误 HTTP ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      if (data.state) {
        setPlayerState(data.state);
      }
      if (data.result_text) {
        setEventResult(data.result_text);
      }
      if (data.next_event) {
        setNextEventObj(data.next_event);
      }
    } catch(e) {
      console.error("Resolve error:", e);
    }
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const apps = [
    { id: 'wallet', name: '校园钱包', icon: Wallet, color: 'text-emerald-500 dark:text-emerald-400' },
    { id: 'store', name: '外设商店', icon: ShoppingBag, color: 'text-blue-500 dark:text-blue-400' },
    { id: 'repair', name: '服务预约', icon: Wrench, color: 'text-amber-500 dark:text-amber-400' },
    { id: 'inventory', name: '我的背包', icon: Backpack, color: 'text-purple-500 dark:text-purple-400' },
    { id: 'wiki', name: '赛博百科', icon: Book, color: 'text-indigo-500 dark:text-indigo-400' },
  ];

  const stats = [
    { label: '硬件', value: health_status.hardware, icon: Cpu },
    { label: '系统', value: health_status.system, icon: Activity },
    { label: '存储', value: health_status.storage, icon: HardDrive },
    { label: '软件', value: health_status.software, icon: LayoutTemplate },
  ];

  const isMultiPageEvent = currentEvent && Array.isArray(currentEvent.description);
  const isLastPage = !isMultiPageEvent || currentEventPage === (currentEvent?.description as string[]).length - 1;

  return (
    <div className="w-full h-full bg-zinc-200 dark:bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center relative flex flex-col md:flex-row overflow-hidden text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-[2px] z-0 transition-colors"></div>

      {/* Sidebar */}
      <div className={clsx("w-full md:w-64 bg-white/80 dark:bg-zinc-950/90 backdrop-blur-xl border-b md:border-r border-zinc-200 dark:border-white/10 z-10 p-4 md:p-6 flex flex-col shrink-0 shadow-lg transition-all duration-300", isSidebarOpen ? "h-[50vh] md:h-full overflow-y-auto" : "h-16 md:h-full overflow-hidden")}>
        <div className="flex justify-between items-center mb-6 cursor-pointer md:cursor-auto" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold dark:text-white/90">系统监控</h2>
            <span className="md:hidden text-xs text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-full">{isSidebarOpen ? "收起" : "展开"}</span>
          </div>
          <div className="flex items-center gap-1">
            {hidden_flags?.is_endless_mode && onShutdown && (
              <button 
                title="长按关机回到菜单"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (window as any).shutdownTimer = setTimeout(() => onShutdown(), 1000);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  clearTimeout((window as any).shutdownTimer);
                }}
                onPointerLeave={(e) => {
                  e.stopPropagation();
                  clearTimeout((window as any).shutdownTimer);
                }}
                className="p-2 rounded-full hover:bg-red-500/20 text-red-500 transition-colors"
              >
                <Power size={20} />
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); setIsDark(!isDark); }}
              className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
            >
              {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-500" />}
            </button>
          </div>
        </div>
        
        <div className="space-y-6">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div 
                className={clsx("flex justify-between text-sm mb-2 text-zinc-600 dark:text-zinc-300", stat.label === '硬件' && "cursor-pointer hover:text-indigo-500")}
                onClick={() => stat.label === '硬件' && setShowHardware(!showHardware)}
              >
                <span className="flex items-center gap-2">
                  <stat.icon size={16} />
                  {stat.label} {stat.label === '硬件' && <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1 rounded">点击详情</span>}
                </span>
                <span>{stat.value}%</span>
              </div>
              <div className="h-2 bg-zinc-300 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={clsx(
                    "h-full rounded-full transition-all duration-500",
                    stat.value > 50 ? "bg-green-500" : stat.value > 25 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${stat.value}%` }}
                ></div>
              </div>
              
              {stat.label === '硬件' && showHardware && (
                <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-900 p-2 rounded-lg">
                  <div className="flex justify-between"><span>CPU</span><span className={health_status.hardware_details.cpu < 50 ? "text-red-500" : ""}>{health_status.hardware_details.cpu}%</span></div>
                  <div className="flex justify-between"><span>内存</span><span className={health_status.hardware_details.ram < 50 ? "text-red-500" : ""}>{health_status.hardware_details.ram}%</span></div>
                  <div className="flex justify-between"><span>硬盘</span><span className={health_status.hardware_details.disk < 50 ? "text-red-500" : ""}>{health_status.hardware_details.disk}%</span></div>
                  <div className="flex justify-between"><span>屏幕</span><span className={health_status.hardware_details.screen < 50 ? "text-red-500" : ""}>{health_status.hardware_details.screen}%</span></div>
                  <div className="flex justify-between"><span>风扇</span><span className={health_status.hardware_details.fan < 50 ? "text-red-500" : ""}>{health_status.hardware_details.fan}%</span></div>
                  <div className="flex justify-between"><span>外壳</span><span className={health_status.hardware_details.shell < 50 ? "text-red-500" : ""}>{health_status.hardware_details.shell}%</span></div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-white/10 space-y-4">
          <div>
            <div className="text-xs text-zinc-500 mb-1">精神状态</div>
            <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">{attributes.mental_state}/100</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">财富</div>
            <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">¥ {attributes.wealth}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">赛博常识</div>
            <div className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">{attributes.cyber_sense}</div>
          </div>
        </div>

        <div className="mt-auto">
          <div className="bg-zinc-100 dark:bg-white/5 p-4 rounded-xl border border-zinc-200 dark:border-white/10 transition-colors">
            <div className="text-xs text-zinc-500 mb-1">当前设备</div>
            <div className="font-medium text-sm">{computer?.display_name || '未知设备'}</div>
            <div className="text-xs text-zinc-500 mt-2">Day {day}</div>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 relative z-10 flex flex-col items-center p-4 md:p-8 overflow-y-auto pb-32 md:pb-8">
        {!activeApp ? (
          <div className="my-auto shrink-0 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-200 dark:border-white/10 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-300 transition-colors">
            {isEventLoading ? (
              <div className="flex flex-col items-center justify-center h-48">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                <p className="mt-4 text-zinc-500">正在生成事件...</p>
              </div>
            ) : eventResult ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-3 text-green-600 dark:text-green-400 mb-4">
                  <ShieldCheck size={24} />
                  <h3 className="text-lg font-bold">事件结果</h3>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 mb-6 leading-relaxed">
                  {eventResult}
                </p>
                {currentEvent?.technical_context && (
                  <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/30 p-4 rounded-xl mb-6">
                    <div className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-1 flex items-center gap-2">
                      <Book size={16} /> 赛博科普
                    </div>
                    <p className="text-xs text-indigo-700 dark:text-indigo-200/80 leading-relaxed">
                      {currentEvent.technical_context}
                    </p>
                  </div>
                )}
                <button 
                  onClick={() => {
                    if (nextEventObj) {
                      loadEvent(nextEventObj);
                      setNextEventObj(null);
                    } else {
                      setEventResult(null);
                      setCurrentEvent(null);
                      setEventCompleted(true);
                      markEventDone();
                    }
                  }}
                  className="bg-indigo-100 hover:bg-indigo-200 dark:bg-white/10 dark:hover:bg-white/20 text-indigo-700 dark:text-white p-3 rounded-xl transition-colors text-center font-medium"
                >
                  继续
                </button>
              </div>
            ) : currentEvent ? (
              <>
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500 mb-2">
                  <AlertTriangle size={24} />
                  <h3 className="text-lg font-bold">{currentEvent.title}</h3>
                </div>
                
                <p className="text-zinc-700 dark:text-zinc-300 mb-6 leading-relaxed whitespace-pre-wrap">
                  {isMultiPageEvent ? (currentEvent.description as string[])[currentEventPage] : currentEvent.description}
                </p>
                
                {isLastPage ? (
                  <>
                    {timeoutRemaining !== null && currentEvent.timeout_seconds && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs font-bold text-red-500 dark:text-red-400 mb-1">
                          <span>紧急！请尽快做出选择</span>
                          <span>{timeoutRemaining}s</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500 transition-all duration-1000 linear"
                            style={{ width: `${(timeoutRemaining / currentEvent.timeout_seconds) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
                      {currentEvent.options.map(opt => (
                        <button 
                          key={opt.option_id}
                          onClick={() => handleOptionClick(opt.option_id)}
                          disabled={attributes.cyber_sense < opt.required_cyber_sense}
                          className="bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed p-3 rounded-xl transition-colors text-left flex justify-between items-center group"
                        >
                          <span className="text-zinc-800 dark:text-white">{opt.text}</span>
                          {opt.required_cyber_sense > 0 && (
                            <span className="text-xs text-indigo-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              需常识 &gt; {opt.required_cyber_sense}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setCurrentEventPage(prev => prev + 1)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl transition-colors text-sm font-medium animate-in fade-in slide-in-from-bottom-2"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 dark:text-zinc-400 min-h-[16rem]">
                <div className="text-4xl mb-4">☕</div>
                <p className="font-medium text-zinc-800 dark:text-zinc-200">今天的事情已经忙完了。</p>
                <p className="text-sm mt-2 mb-6">点击右下角的按钮结束这一天吧。</p>
                
                {hidden_flags.joined_npa && (
                  <div className="mt-4 p-4 bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-800/30 rounded-2xl max-w-sm text-left relative animate-in fade-in zoom-in slide-in-from-bottom-4">
                    <div className="absolute -top-3 left-4 bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">树莓娘的小贴士</div>
                    <p className="text-xs text-pink-700 dark:text-pink-400 mt-2 leading-relaxed">
                      {["电子产品进水千万别用吹风机热风吹！长按电源强制关机才是王道。", 
                        "流氓软件最喜欢全家桶互相唤醒了，如果卡顿记得查注册表哦！",
                        "不知道去哪修电脑的时候，就来网协找我吧！",
                        "闲鱼上几百块买顶级游戏本的，1000%都是骗子，别去面交！",
                        "夏天打游戏记得把电脑垫高，不然显卡会烧哭的～"
                      ][Math.floor(Math.random() * 5)]}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/95 dark:bg-zinc-900/90 backdrop-blur-xl w-full max-w-2xl h-full md:h-[600px] absolute md:relative inset-0 md:inset-auto z-50 md:z-auto md:rounded-2xl border-none md:border border-zinc-200 dark:border-white/10 flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 transition-colors">
            <div className="h-12 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between px-4 bg-zinc-100 dark:bg-white/5 transition-colors pt-safe">
              <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
                {apps.find(a => a.id === activeApp)?.name}
              </span>
              <button 
                onClick={() => setActiveApp(null)}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-0 flex-1 overflow-y-auto text-zinc-500">
              {activeApp === 'wallet' && <WalletApp />}
              {activeApp === 'store' && <StoreApp />}
              {activeApp === 'repair' && <RepairApp />}
              {activeApp === 'inventory' && <InventoryApp />}
              {activeApp === 'wiki' && <WikiApp />}
            </div>
          </div>
        )}
      </div>

      {/* Dock */}
      <div className="absolute bottom-4 md:bottom-6 left-0 md:left-64 right-0 flex justify-center z-40 pb-safe pointer-events-none">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-white/10 p-2 md:p-3 rounded-3xl flex gap-2 md:gap-4 pointer-events-auto shadow-2xl transition-colors">
          {apps.map(app => (
            <button
              key={app.id}
              onClick={() => setActiveApp(app.id)}
              className={clsx(
                "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-2",
                activeApp === app.id ? "bg-zinc-200 dark:bg-white/20 shadow-inner" : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10"
              )}
            >
              <app.icon className={app.color} size={24} />
            </button>
          ))}
        </div>
      </div>

      {/* FAB - Next Day */}
      <button 
        onClick={() => {
          if (!eventCompleted) return;
          setEventResult(null);
          setCurrentEvent(null);
          setEventCompleted(false);
          nextDay();
        }}
        disabled={!eventCompleted}
        className={clsx(
          "absolute bottom-20 md:bottom-8 right-4 md:right-8 z-30 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] dark:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all duration-300",
          !eventCompleted 
            ? "bg-zinc-400 dark:bg-zinc-700 opacity-50 cursor-not-allowed" 
            : "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] hover:scale-110 active:scale-95 group"
        )}
      >
        <Power size={24} className={clsx(eventCompleted && "group-hover:rotate-180 transition-transform duration-500")} />
      </button>
    </div>
  );
}
