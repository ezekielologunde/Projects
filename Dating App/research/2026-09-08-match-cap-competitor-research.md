# Match-Cap Dating App: Competitor, Patent, and Evidence Research

**Date:** 2026-09-08
**Status:** Research complete. No product decisions made yet.

## The question

Is there a dating app where you can only match with one person at a time, unless you choose in settings to allow a maximum of 2 or 3 at once? The intent is to prevent analysis paralysis and the illusion of options that endless swiping creates, the same effect as scrolling Netflix for 20 minutes and watching nothing.

## Short answer

No. As of September 2026 there is no live or beta dating app where the user picks a match capacity of 1, 2, or 3 in settings as a personal preference.

The one-match-at-a-time mechanic itself is well covered. At least fourteen apps use it or a close variant. Nearly all are tiny, several are pre-launch or paused, and one has real traction (Known). The closest things to a user-chosen capacity are two apps that tie the number to a paid tier (7secs: 1 free / 2 premium; Fanndora: 1 / 3 by tier) and a sentence in a US patent specification that describes a limit "configurable via a settings or preferences option."

Hinge, owned by Match Group, already ships a related cap (Your Turn Limits, global since September 2024). That is both validation that caps work at scale and a warning that the incumbent will copy anything that gains traction.

## Competitor landscape (verified 2026-09-08)

| App | Mechanic | Concurrency cap | User-selectable? | Status and notes |
|---|---|---|---|---|
| Oneder | One match, no parallel chats | 1 | No | Live, iOS. Info Consultance SRL, Bucharest. Too few ratings to display. |
| CLASPA | Mutual match creates a "Lock"; both discovery feeds pause | 1 | No | Live, iOS and Android. Hanabi Technologies. Free / $9.99 / $19.99 tiers (tiers change daily discovery count, not the lock). |
| Viona | One active match; app locks in on match; 9 swipes a day free | 1 | No | **Paused.** Site says iOS and Android apps are offline and email signup is closed. Petcavern Technologies Private Limited, India. |
| Ida | One conversation at a time, but you keep swiping and future likes queue | 1 (chat only) | No | Live, iOS and Android. Quebec City. Discovery stays open while matched. |
| Cuffed | One match at a time, members-only vetting | 1 | No | Live, iOS. New York, founded 2022. Founder said on HN they wanted free swiping with restricted matching. |
| OneDatingApp | One premium match at a time, invite-only, under 25% acceptance | 1 | No | Live, iOS and Android. London and Dubai. |
| Sociality | Nobody can be matched with more than one person until unmatched or passed | 1 | No | Live, iOS. |
| 8:30PM | One match per day, then locked out until an auto-scheduled 8:30pm video date; no text messaging | 1 per day | No | Live, iOS. Walter Labs. 26 ratings at 4.4. Daily limit, not a concurrency cap. |
| 7secs | 7-second decision timer, 3 profiles an hour free; 1 active match free, 2 on premium | 1 or 2 | No, by tier | Live, iOS. Istanbul. Premium "coming very soon." Site explicitly cites paradox of choice. |
| Fanndora | AI matchmaker presents matches one at a time; Plus = 1 active match, Ultimate = up to 3 | 1 or 3 | No, by tier | Live. Techsider Pty Ltd, Australia. $29.99 and $59.99. Too few ratings to display. |
| WingWo | 5 profiles a day, max 3 active matches, must engage before seeing new ones | 3 | No | **Waitlist only.** California. Planned $100 a month. |
| Bemi | Free users hold up to 5 active matches plus 2 pending; must swap to add | 5 | No | Live. |
| Known | One curated introduction at a time, 24 hours to accept, concierge books the restaurant | 1 | No | Live, iOS. Known Co. 822 ratings at 4.3. $15 per date credit. Most traction in this niche. |
| Once | One curated match per day | 1 per day | No | Live. Acquired by Dating Group for $18M in January 2021. Daily limit, not a concurrency cap. |
| Only You | Send one message; if they reply you get a 24-hour window | 1 | No | Live, iOS only. Israel. |
| Mattr | 5 daily matches | 5 per day | No | Live. Daily limit. |
| Hinge (Your Turn Limits) | Cannot accept new likes while 8 or more messages await your reply | Indirect | No | Global since September 2024. Test showed 20% higher responsiveness. |

Not relevant despite the name: FiveOne 5:1 (one woman, five men, elimination game format), OneMatch at onematch.me (Kickstarter stage, site unreachable), One Date (activity-based, unlimited swiping on premium).

### Distinctions that matter

- **Daily rate limits vs concurrency caps.** Once, 8:30PM, Mattr, and Coffee Meets Bagel limit how many new matches you get per day. The concept here is a cap on how many connections you can hold at once. Different mechanic, different psychology.
- **Discovery hidden vs discovery open.** CLASPA, Viona, Oneder, and Cuffed remove or pause discovery while matched. Ida keeps it open and queues likes. Keeping discovery open recreates the problem the cap is meant to solve.
- **Capacity as a paywall vs capacity as a preference.** 7secs and Fanndora sell higher capacity. Nobody offers it as a free dating-style setting with a default of 1.

## The Sidekick Dating patent family (verified)

### US 11,895,115 B2, "Match limits for dating application"

- Assignee: Sidekick Dating Inc. Inventor: Michael Robert De Lazzari.
- Priority date May 16, 2022 (provisional 63/342,564). Filed May 3, 2023 as application 18/142,738. Issued February 6, 2024. 24 claims. Status: active.
- Independent claims: 1 (method), 9 (computer-readable medium), 17 (system). All three recite the same combination.

Claim 1, verbatim:

> A computer-implemented method for limiting matches between users in a networked environment, the method comprising, at a first network-connected hardware processing device: determining whether a first user has reached a limit of concurrent matches, wherein each match represents a bidirectional connection between the first user and another user; responsive to the first user not having reached the limit of concurrent matches representing bidirectional connections, making the first user visible to other users; responsive to the first user having reached the limit of concurrent matches representing bidirectional connections, making the first user invisible to other users; receiving input from the first user requesting that a unidirectional indication of interest in a second user be transmitted; responsive to the first user having reached the limit of concurrent matches representing bidirectional connections, declining the request to transmit the unidirectional indication of interest; and responsive to the first user not having reached the limit of concurrent matches representing bidirectional connections, transmitting the unidirectional indication of interest.

Every independent claim requires two things together once the limit is reached: (a) the user becomes invisible to others, and (b) the user's outgoing likes are refused.

Dependent claims 2 to 8 and 18 to 24 cover: establishing the match on a reciprocal response, opening a communication channel, incrementing and decrementing a per-user match counter, terminating the channel on unmatch, performing the steps inside a dating application, marking the user available or unavailable for matching, and displaying a "limit reached" message.

**No claim recites a user-configurable limit, a settings or preferences option, or subscription tiers.** Those appear only in the description, which says the limit "may vary from user to user, and/or may be configurable via a settings or preferences option" and "may be determined based on the service tier the user is currently subscribed to or has purchased."

### US 2024/0275784 A1 (continuation)

Filed April 22, 2024, published August 15, 2024, still pending. Same specification, including the configurable-limit sentence. Sidekick can attempt to claim user-configurable limits here because the specification supports it.

### US 12,003,509 B2, "Temporary holds for dating application"

Granted June 4, 2024. Covers a "hold" or "maybe" designation on a profile for a limited period (typically 24 hours), with a cap on concurrent holds (commonly three) that can be raised by subscription. This is the patent behind the June 2024 date that sometimes gets attached to the match-limits patent by mistake.

### What this means

- The granted claims are narrower than a summary makes them sound. A design that keeps the user visible and queues incoming likes, or that transmits and queues outgoing likes rather than refusing them, would appear to fall outside claim 1. Ida's design is an example. Only a patent attorney can say whether that holds up.
- The published description already discloses a user-configurable limit. That is prior art against anyone, including us, patenting the 1/2/3 setting. The concept can likely be built. It probably cannot be owned.
- No shipped product from Sidekick Dating Inc. was found. The "Sidekick" friendship app on the stores belongs to Sidekick Enterprises, a different company. A patent held by an entity with no visible product fits the profile of a future licensing or litigation risk rather than a competitor.
- Only US filings were found. Foreign filings were not checked.
- **Action before building for the US market:** freedom-to-operate review with a patent attorney covering 11,895,115, the pending continuation, and 12,003,509.

## Evidence that the problem is real

All studies below were verified against the original publication or the publisher's page.

| Study | Design | Finding |
|---|---|---|
| Pronk and Denissen, 2020, Social Psychological and Personality Science 11(3) | Three studies, hypothetical and real profiles | Acceptance odds fell about 27% from the first profile to the last. Authors call it a "rejection mind-set." |
| Thomas et al., 2022, Computers in Human Behavior 126 | Survey of 667 adults, then experiment with 248 adults shown 11, 31, or 91 profiles | High availability raised fear of being single, lowered state self-esteem, and raised partner choice overload. |
| Thomas, Binder, Stevic, Matthes, 2023, Telematics and Informatics | Quota sample of 464 dating app users aged 16 to 25 | Excessive swiping linked to upward social comparison, fear of being single, and partner choice overload. |
| D'Angelo and Toma, 2017, Media Psychology 20(1) | 152 participants chose from 6 or 24 profiles | One week later the 24-option group was less satisfied and more likely to switch. Large pool plus reversible choice was the worst combination. |
| Lenton and Francesconi, 2010, Psychological Science; 2011, Biology Letters | 84 real speed-dating events | More variety produced fewer proposals, more people choosing nobody, and a shift toward quick cues (height, weight) over slower ones (education, occupation). |
| Pew Research Center, February 2023 | US adult survey | 37% say dating platforms offer too many choices. |
| Hinge, 2024 | Your Turn Limits test | Blocking new matches at 8+ unanswered messages raised responsiveness 20%. 48% of users said it helped them focus on quality over quantity. |

The Netflix analogy also has numbers behind it. A 2016 Reelgood survey put average browsing at 17.8 minutes versus 9.1 for cable. Nielsen's 2019 report found 21% of streaming viewers give up without watching anything.

## Design implications

1. **A match cap alone does not fix the rejection mind-set.** The 27% decline forms during browsing, not during chatting. Viona, 7secs, and WingWo all pair the match cap with a browse cap (9 swipes a day, 3 profiles an hour, 5 profiles a day). This product needs both limits.
2. **Discovery must actually disappear while at capacity.** Blurred feeds and "37 people liked you, upgrade" prompts recreate the illusion of options. Ida's open-discovery design shows what to avoid.
3. **Capacity must be a preference, not a paywall.** Every paid tier that unlocks more matches undermines the premise. This was the sharpest criticism in the 2022 Hacker News thread on Cuffed (75 points, 117 comments), and it is the one version nobody has shipped.
4. **Default should be 1**, with 2 and 3 as explicit choices the user makes about their own attention, changeable later.

## Risks

- **Gender ratio.** Commenters on the Cuffed thread cited a roughly 4:1 male-to-female ratio on mainstream apps. A one-at-a-time rule is punishing for the oversupplied side unless the pool is balanced or curated.
- **Scarcity can increase pickiness.** When a slot is scarce, users may reject anyone they are not immediately excited about. Lenton and Francesconi's data on shifting to quick cues under load points the same way.
- **Network effects.** Without critical mass, users return to Tinder or Hinge where their matches actually are. Every small app in the table above faces this. Viona already paused.
- **Incumbent response.** Hinge's Your Turn Limits shows Match Group will ship caps when the data supports it.
- **Patent exposure.** See above.

## Open questions

- Does the pending continuation add claims on user-configurable limits? Check the file wrapper on USPTO Patent Center.
- Does Sidekick Dating Inc. have any foreign filings (WIPO, EPO)?
- What happened to Viona, and why? Their pause is the most relevant post-mortem available.
- What is Known's retention and repeat-date rate? It is the only one-at-a-time product with meaningful ratings.

## Sources

Apps
- Oneder: https://apps.apple.com/us/app/oneder-dating-app-one-match/id6771359126
- CLASPA: https://claspa.app/
- Viona: https://viona.one/
- Ida: https://datingwithida.com/
- Cuffed: https://www.cuffed.dating/
- Cuffed on Hacker News (Feb 2022): https://news.ycombinator.com/item?id=30393899
- OneDatingApp: https://onedatingapp.com/
- Sociality: https://apps.apple.com/us/app/id1491711808
- 8:30PM: https://apps.apple.com/us/app/id1644227542
- 7secs: https://7secs.online/
- Fanndora: https://apps.apple.com/us/app/fanndora/id6778913726
- WingWo: https://wingwo.co/
- Bemi: https://play.google.com/store/apps/details?id=com.bemidate.app&hl=en_US
- Known: https://apps.apple.com/us/app/known-swipeless-dating/id6748926392
- Once acquisition (TechCrunch via Yahoo): https://finance.yahoo.com/news/slow-dating-app-once-acquired-141346623.html
- Only You: https://onlyou.me/
- Mattr: https://apps.apple.com/us/app/mattr-date-different/id6444309024
- Hinge Your Turn Limits launch: https://hinge.co/newsroom/your-turn-limits
- Hinge Your Turn Limits help page: https://help.hinge.co/hc/en-us/articles/31662181659027-What-is-Your-Turn-Limits

Patents
- US 11,895,115 B2 full text with claims: https://www.freepatentsonline.com/11895115.html
- US 11,895,115 B2 on Google Patents: https://patents.google.com/patent/US11895115B2/en
- US 2024/0275784 A1 (pending continuation): https://patents.google.com/patent/US20240275784A1/en
- US 12,003,509 B2 (temporary holds): https://patents.google.com/patent/US12003509B2/en
- Inventor listing on Justia: https://patents.justia.com/inventor/michael-robert-de-lazzari

Research
- Pronk and Denissen 2020: https://journals.sagepub.com/doi/10.1177/1948550619866189
- Thomas et al. 2022: https://www.sciencedirect.com/science/article/pii/S0747563221003009
- Thomas, Binder, Stevic, Matthes 2023 (SSRN preprint): https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4112926
- Pew Research Center 2023: https://www.pewresearch.org/internet/2023/02/02/americans-views-on-online-dating/
- D'Angelo and Toma 2017 (UW news summary): https://news.wisc.edu/online-dating-study-shows-too-many-choices-can-lead-to-dissatisfaction
- D'Angelo and Toma 2017 (journal): https://www.tandfonline.com/doi/abs/10.1080/15213269.2015.1121827
- Lenton and Francesconi 2010 (ScienceDaily summary): https://www.sciencedaily.com/releases/2010/04/100415114325.htm
- Lenton and Francesconi 2011, Biology Letters: https://royalsocietypublishing.org/doi/10.1098/rsbl.2011.0098
- Reelgood Netflix browsing survey: https://www.thewrap.com/netflix-users-browse-for-programming-twice-as-long-as-cable-viewers-study-says/
- Nielsen streaming report: https://deadline.com/2019/07/streaming-overload-netflix-nielsen-report-average-viewer-takes-7-minutes-to-pick-what-to-watch-1202640213/
