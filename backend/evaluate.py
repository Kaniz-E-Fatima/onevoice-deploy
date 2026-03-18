import asyncio
import json
import os
import time
from dotenv import load_dotenv
load_dotenv()

async def run_evaluation():
    from services.rag_service import get_context
    from services.gemini_service import get_gemini_response

    with open('test_cases.json', encoding='utf-8') as f:
        test_cases = json.load(f)["test_cases"]

    results = []
    total = len(test_cases)
    correct = 0
    total_latency = 0

    print(f"\n{'='*60}")
    print(f"OneVoice Evaluation Framework — {total} Test Cases")
    print(f"{'='*60}\n")

    for tc in test_cases:
        start = time.time()
        try:
            context, intent = await get_context(tc["question"])
            reply = await get_gemini_response(
                query=tc["question"],
                context=context,
                language=tc["language"]
            )
            latency = round(time.time() - start, 2)
            total_latency += latency

            # Check accuracy
            reply_lower = reply.lower()
            keywords_found = [
                kw for kw in tc["expected_keywords"]
                if kw.lower() in reply_lower
            ]
            accuracy = len(keywords_found) / len(tc["expected_keywords"])
            is_correct = accuracy >= 0.5  # 50% keywords found = correct

            if is_correct:
                correct += 1
                status = "✅ PASS"
            else:
                status = "❌ FAIL"

            results.append({
                "id": tc["id"],
                "language": tc["language"],
                "category": tc["category"],
                "question": tc["question"][:60],
                "status": status,
                "accuracy": round(accuracy * 100),
                "latency": latency,
                "keywords_found": keywords_found,
                "keywords_missing": [k for k in tc["expected_keywords"] if k.lower() not in reply_lower],
                "reply_preview": reply[:100]
            })

            print(f"[{tc['id']:02d}] {status} | {tc['language']:10} | {tc['category']:12} | {latency}s")
            print(f"      Q: {tc['question'][:60]}")
            print(f"      Keywords: {keywords_found} ✓")
            if results[-1]["keywords_missing"]:
                print(f"      Missing:  {results[-1]['keywords_missing']} ✗")
            print()

        except Exception as e:
            print(f"[{tc['id']:02d}] ❌ ERROR: {e}")
            results.append({"id": tc["id"], "status": "ERROR", "error": str(e)})

    # Summary
    accuracy_pct = round((correct / total) * 100, 1)
    avg_latency = round(total_latency / total, 2)

    print(f"\n{'='*60}")
    print(f"EVALUATION RESULTS")
    print(f"{'='*60}")
    print(f"Total Questions : {total}")
    print(f"Correct         : {correct}")
    print(f"Accuracy        : {accuracy_pct}%")
    print(f"Avg Latency     : {avg_latency}s")
    print(f"{'='*60}\n")

    # By language
    print("ACCURACY BY LANGUAGE:")
    languages = {}
    for r in results:
        lang = r.get("language", "unknown")
        if lang not in languages:
            languages[lang] = {"total": 0, "correct": 0}
        languages[lang]["total"] += 1
        if r.get("status") == "✅ PASS":
            languages[lang]["correct"] += 1

    for lang, stats in languages.items():
        pct = round((stats["correct"] / stats["total"]) * 100)
        bar = "█" * (pct // 10) + "░" * (10 - pct // 10)
        print(f"  {lang:12} [{bar}] {pct}% ({stats['correct']}/{stats['total']})")

    # By category
    print("\nACCURACY BY CATEGORY:")
    categories = {}
    for r in results:
        cat = r.get("category", "unknown")
        if cat not in categories:
            categories[cat] = {"total": 0, "correct": 0}
        categories[cat]["total"] += 1
        if r.get("status") == "✅ PASS":
            categories[cat]["correct"] += 1

    for cat, stats in categories.items():
        pct = round((stats["correct"] / stats["total"]) * 100)
        bar = "█" * (pct // 10) + "░" * (10 - pct // 10)
        print(f"  {cat:15} [{bar}] {pct}% ({stats['correct']}/{stats['total']})")

    # Save results
    with open('evaluation_results.json', 'w', encoding='utf-8') as f:
        json.dump({
            "summary": {
                "total": total,
                "correct": correct,
                "accuracy": accuracy_pct,
                "avg_latency": avg_latency
            },
            "by_language": languages,
            "by_category": categories,
            "details": results
        }, f, indent=2)

    print(f"\n✅ Results saved to evaluation_results.json")
    return accuracy_pct

asyncio.run(run_evaluation())