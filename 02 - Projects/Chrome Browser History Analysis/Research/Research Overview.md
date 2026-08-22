---
type: research
project: Chrome Browser History Analysis
tags: [project/chrome-history-analysis, type/research]
---

# Research Overview

Part of [[📌 Chrome Browser History Analysis]].

## Research Question

Can ChatGPT infer a user's personal information (identity, demographics, interests, habits) from their Chrome browser history alone?

## Methodology (draft)

1. **Data collection** — export Chrome history (`chrome://history` or the `History` SQLite database).
2. **Preparation** — clean and anonymize URLs/titles; decide sample windows.
3. **Inference** — prompt ChatGPT with the history and ask it to profile the user.
4. **Evaluation** — score inferences against ground truth; note confidence levels.
5. **Analysis** — what signal categories (searches, shopping, news, locale) leak the most?

## Findings

*To be filled in as experiments run.*

## Related

- [[📌 Chrome Browser History Analysis]]
