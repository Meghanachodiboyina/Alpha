import asyncio
from app.ai_engine import _analyze_with_groq, _optimize_schedule
from datetime import datetime, date, time

async def main():
    text = "I have to go to movie and after that dinner with friends and return home."
    print("Testing:", text)
    result = await _analyze_with_groq(text, current_time=datetime.now().isoformat())
    print("\nGroq Analysis Output:")
    import json
    print(json.dumps(result, indent=2))
    
    if result and "tasks" in result:
        start_after = datetime.combine(date.today(), time(17, 0))
        routines = _optimize_schedule(result["tasks"], plan_scope="daily", start_after=start_after, personality="Balanced")
        print("\nOptimized Schedule:")
        for r in routines:
            print(f"- {r.start_time.strftime('%H:%M')} to {r.end_time.strftime('%H:%M')} | {r.title} | Internal: {r.is_internal}")

if __name__ == "__main__":
    asyncio.run(main())
