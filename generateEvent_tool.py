import os
import json
import re
import time
import argparse
from openai import OpenAI

# ================= 配置区 =================
API_KEY = os.getenv("OPENAI_API_KEY", "HvwADoG2aJBDlNenscwIAPIn3CiGPkTLk9KaFyGyF/s=")
BASE_URL = os.getenv("OPENAI_BASE_URL", "https://mcp-proxy.659658.xyz/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "Doubao-1.5-Pro") 

DRAFT_DIR = "./backend/data/events/drafts"
APPROVED_DIR = "./backend/data/events/approved"

os.makedirs(DRAFT_DIR, exist_ok=True)
os.makedirs(APPROVED_DIR, exist_ok=True)

if API_KEY == "your-third-party-api-key":
    print("\n[警告] 您似乎还没有配置 OPENAI_API_KEY 环境变量！\n")

client = OpenAI(api_key=API_KEY, base_url=BASE_URL)

# ================= Prompt 模板 =================
SYSTEM_PROMPT = """你是一个大学模拟经营游戏《赛博校园生存指南》的资深游戏策划与数值设计师。
你的任务是根据给定的主题和类型，生成一个符合 JSON 规范的随机事件。
【事件类型说明】
1. routine (一般事件): 发生在大一新生的日常生活中。重点是考察和提升电脑知识。
2. crisis (紧急事件): 电脑出现严重故障（如蓝屏、异响、黑屏、硬件损坏）。
3. random (随机事件): 侧重于金钱增减、校园生活，特别是【防诈骗】、【网络安全】。

【JSON 严格输出格式】
你必须且只能输出一个合法的 JSON 对象，不要输出任何 Markdown 标记。
⚠️ 极度重要警告：stat_changes 中的正数绝对不能带 "+" 号。

可用属性 Key (stat_changes):
- hw_cpu, hw_disk, hw_ram, hw_screen, hw_fan, hw_shell (硬件分项, 0-100)
- health_system (系统), health_storage (存储), health_software (软件)
- mental_state (精神), wealth (金钱), cyber_sense (常识)

可用前置条件 (prerequisites):
- min_day, max_day (整数)
- min_wealth, min_mental, min_cyber_sense (整数)
- required_health_hardware, required_health_system, required_health_software, required_health_storage (字符串, 如 "<= 50")
- required_item (字符串), exclude_flags (数组)

{
  "event_id": "自动生成唯一ID",
  "event_type": "routine/crisis/random",
  "tags": ["标签1", "标签2"],
  "is_unique": false,
  "weight": 100,
  "prerequisites": { "min_day": 1 },
  "title": "事件标题",
  "description": "生动幽默的描述",
  "technical_context": "硬核科普知识",
  "options": [
    {
      "option_id": "opt_1",
      "text": "选项文字",
      "required_cyber_sense": 0,
      "outcomes": [
        {
          "probability": 1.0,
          "result_text": "结果描述",
          "stat_changes": {"health_system": 15},
          "next_event_id": "可选: 跳转的下一个事件ID"
        }
      ]
    }
  ],
  "timeout_seconds": 10,
  "timeout_option_id": "opt_1"
}
# """
# 注：缺失的属性默认不改变。
# """

def tolerant_json_parse(raw_text):
    # """宽容的 JSON 解析器：负责清洗 + 号并提取字典"""
    text = re.sub(r'^```(json)?\n?', '', raw_text.strip(), flags=re.IGNORECASE)
    text = re.sub(r'\n?```$', '', text)
    text = text.strip()

    # 替换所有的 `+数字` 为普通数字 (解决 json.loads 不认 + 号的问题)
    text = re.sub(r'(:\s*)\+([0-9]+(?:\.[0-9]+)?)', r'\1\2', text)
    # 去除多余的尾随逗号
    text = re.sub(r',\s*([\]}])', r'\1', text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # 如果依旧报错，尝试暴力提取最外层的完整大括号结构
        match = re.search(r'(\{.*\})', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except:
                pass
        return None

def generate_event(theme, event_type, max_retries=2, max_continuations=3):
    # """
    # 调用大模型生成单个事件。
    # 包含双层保障：内层断点续传拼接，外层抛弃重试。
    # """
    print(f"[*] 正在呼叫 AI 生成事件... 主题: [{theme}] | 类型: [{event_type}]")
    user_prompt = f"请生成一个类型为 '{event_type}'，主题关于 '{theme}' 的游戏事件。请确保科普知识严谨，校园气息浓厚。"
    
    # 外层循环：如果 JSON 彻底乱码，重头再来
    for retry_attempt in range(max_retries + 1):
        full_content = ""
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ]
        
        # 内层循环：断点续传拼接
        for cont_attempt in range(max_continuations + 1):
            try:
                response = client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=messages,
                    temperature=0.8,
                    max_tokens=2500 
                )
                
                chunk = response.choices[0].message.content
                
                # 如果是续写的部分，大模型可能会习惯性开头带上 ```json，必须强行剃掉，不然拼接会烂
                if cont_attempt > 0:
                    chunk = re.sub(r'^```(json)?\n?', '', chunk.strip(), flags=re.IGNORECASE)
                    
                full_content += chunk
                
                # 每拼完一次，都扔给宽容解析器试试看能不能解析出完整字典
                event_data = tolerant_json_parse(full_content)
                
                if event_data:
                    return event_data # 成功解析，直接返回！
                else:
                    # 如果不能解析，极大概率是截断了（比如末尾没有 } 或者 ]] ）
                    if cont_attempt < max_continuations:
                        print(f"  [!] 文本无法解析(极可能是截断)，正在请求 AI 从断点继续输出... (第 {cont_attempt + 1} 次续写)")
                        messages.append({"role": "assistant", "content": chunk})
                        messages.append({
                            "role": "user", 
                            "content": "你的输出被截断了。请严格从刚才断开的最后一个字符往下继续写！不要重复已经输出的部分，不要任何解释文本，也不要使用 markdown 标记。"
                        })
                    else:
                        print(f"  [!] 连续续写 {max_continuations} 次依然无法闭合 JSON。")
                        break # 跳出内层续写循环，触发外层重试
                        
            except Exception as e:
                print(f"[!] API 请求发生网络/调用错误: {e}")
                break
                
        # 走到这里说明续写失败了，如果还有重试机会，就重头生成
        if retry_attempt < max_retries:
            print(f"[*] 第 {retry_attempt + 1} 次生成的结构彻底崩坏，正在抛弃脏数据，重新生成全文...")
        else:
            print(f"[!] {max_retries + 1} 次大循环尝试均失败，请检查模型输出限制。")
            print(f"最后的拼接原文:\n{full_content}")
            return None

def interactive_review(event_data):
    """人工审查交互系统"""
    print("\n" + "="*60)
    print(f"🎮 标题: {event_data.get('title')}")
    print(f"🏷️  类型: {event_data.get('event_type')} | 标签: {event_data.get('tags')}")
    print(f"📖 描述: {event_data.get('description')}")
    print(f"💡 科普: {event_data.get('technical_context')}")
    print("-" * 60)
    for i, opt in enumerate(event_data.get('options', [])):
        print(f"🔘 选项 {i+1}: {opt.get('text')} (门槛: 常识>{opt.get('required_cyber_sense', 0)})")
        for out in opt.get('outcomes', []):
            print(f"   ↳ [{(out.get('probability', 1)*100):.0f}%] {out.get('result_text')}")
            print(f"      数值变化: {out.get('stat_changes')}")
    print("="*60)
    
    while True:
        choice = input("\n请选择操作 [A]通过保存 / [R]拒绝丢弃 / [E]存入草稿箱: ").strip().lower()
        
        event_id = event_data.get("event_id", f"evt_{int(time.time())}")
        
        if choice == 'a':
            filepath = os.path.join(APPROVED_DIR, f"{event_id}.json")
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(event_data, f, ensure_ascii=False, indent=2)
            print(f"[+] 已保存至生产环境目录: {filepath}")
            return True
        elif choice == 'r':
            print("[-] 已丢弃该事件。")
            return False
        elif choice == 'e':
            filepath = os.path.join(DRAFT_DIR, f"{event_id}.json")
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(event_data, f, ensure_ascii=False, indent=2)
            print(f"[*] 已保存至草稿箱，后续可人工修改: {filepath}")
            return True
        else:
            print("输入无效，请重新输入 A, R 或 E。")

def interactive_mode():
    """纯交互式引导模式"""
    print("\n" + "*"*40)
    print(" 欢迎使用 网协游戏 - 事件生成终端 ")
    print("*"*40 + "\n")
    
    print("请选择要生成的事件类型：")
    print("  1. routine (一般事件 - 考察电脑知识的日常)")
    print("  2. crisis  (紧急事件 - 电脑大病，需选择维修机构)")
    print("  3. random  (随机事件 - 校园防诈骗、金钱增减等)")
    
    type_map = {"1": "routine", "2": "crisis", "3": "random"}
    while True:
        type_choice = input("请输入序号 (1/2/3): ").strip()
        if type_choice in type_map:
            event_type = type_map[type_choice]
            break
        print("输入有误，请重新输入。")

    theme = input("\n请输入事件的具体主题或灵感 (例如: 室友把泡面汤洒键盘上了): ").strip()
    if not theme:
        theme = "大学生活日常"

    while True:
        count_str = input("\n需要生成多少个此主题的事件？(默认 1): ").strip()
        if not count_str:
            count = 1
            break
        if count_str.isdigit() and int(count_str) > 0:
            count = int(count_str)
            break
        print("请输入一个大于 0 的正整数。")

    auto_str = input("\n是否开启自动模式？(跳过人工审查，直接全部存入草稿箱) [y/N]: ").strip().lower()
    auto_mode = auto_str == 'y'

    print("\n配置完成，开始生成...\n" + "-"*40)
    run_generation(theme, event_type, count, auto_mode)

def run_generation(theme, event_type, count, auto_mode):
    success_count = 0
    for i in range(count):
        print(f"\n>>> 开始生成进度: {i+1} / {count}")
        event = generate_event(theme, event_type)
        
        if not event:
            print("[!] 生成失败，跳过此次。")
            continue
            
        if auto_mode:
            event_id = event.get("event_id", f"evt_{int(time.time())}")
            filepath = os.path.join(DRAFT_DIR, f"{event_id}.json")
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(event, f, ensure_ascii=False, indent=2)
            print(f"[*] [自动模式] 已保存至: {filepath}")
            success_count += 1
        else:
            saved = interactive_review(event)
            if saved: success_count += 1
                
        if i < count - 1: time.sleep(1) 
        
    print(f"\n[完成] 计划生成: {count} | 实际保存: {success_count}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--theme", type=str)
    parser.add_argument("--type", type=str, choices=['routine', 'crisis', 'random'])
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--auto", action="store_true")
    
    args = parser.parse_args()
    
    if args.theme or args.type:
        run_generation(args.theme, args.type, args.count, args.auto)
    else:
        interactive_mode()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[!] 收到退出指令，程序已终止。")