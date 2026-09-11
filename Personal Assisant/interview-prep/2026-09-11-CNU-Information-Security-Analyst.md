# Interview prep — Christopher Newport University, Information Security Analyst

**When:** TODAY, Friday, September 11, 2026, 1:00-2:00 PM Eastern (**12:00-1:00 PM your time, Central**)
**Format:** 1-hour virtual interview via Google Meet, with the CNU search committee
**Contact:** Tom Dunn, Information Security Officer (thomas.dunn@cnu.edu, 757-594-0704)
**Note:** This one was self-submitted by you directly, outside the automation system, so there's no staged tailored resume/cover letter on file here to cross-check against — this prep is built straight from your master profile.
**UPDATE:** Full posting text now obtained (Role Title: Information Technology Specialist II, Position #00720, classified/on-campus, $68,534-$89,094, not remote-eligible though limited periodic telework possible). The sections below have been sharpened against the actual required KSAs and named tools/frameworks rather than generic guesses.

---

## What this round is

A search-committee interview for a staff Information Security Analyst role reporting into an Information Security Officer (Tom Dunn). This is an operational security role inside university IT, not a faculty line — expect questions oriented around day-to-day security operations (monitoring, vulnerability management, incident response, access control, compliance) and around fitting into a higher-ed environment specifically (FERPA, decentralized departments, tight budgets, a broad and non-technical user population). Keep answers concrete and grounded in actual tools/frameworks you've used; this panel will likely probe for hands-on specificity more than a teaching panel would.

---

## Your 60-second "tell me about yourself"

> "I'm a cybersecurity professional with a blend of hands-on security consulting and academic depth. I founded and run Cyntraix, an independent security consulting practice, where I conduct security assessments, design secure architectures across cloud and on-premise environments, and deploy SIEM and EDR tooling for clients, all aligned to NIST CSF and CMMC 2.0. I hold a Master's in Cyber Forensics from the University of Baltimore, with concentrations in digital forensics, incident response, and SOC operations, and I'm currently finishing a Doctor of Engineering in Cybersecurity Analytics at George Washington University, where my applied research is on AI-driven threat detection and Zero Trust architecture. I also spent time teaching cybersecurity, including a NYSED-aligned high school program covering incident response and digital forensics, which sharpened how I explain security concepts to non-technical audiences, something that matters a lot in a university IT environment with a broad user population. I'm looking to move that combination of hands-on security work and clear communication into a full-time analyst role like this one."

---

## Hard questions and strong answers

### "Walk me through how you'd handle a suspected phishing incident reported by a staff member."
> "First, contain: get the reporting user to stop interacting with it, and if they already clicked something, isolate the affected endpoint from the network. Then triage: pull the email headers, check sender reputation and any embedded URLs or attachments in a sandboxed environment, and determine if this is an isolated attempt or part of a broader campaign by checking whether other users received the same message. If credentials were entered, that's a password reset and a check of recent account activity and any mail-forwarding rules that might have been silently added. Then I'd document the full timeline and indicators, and close the loop by pushing a blocklist entry and a short, plain-language alert to staff, not a jargon-heavy security bulletin nobody reads."

### "What experience do you have specifically with SIEM tools, and which ones?"
> "Through Cyntraix, I deploy and integrate SIEM platforms alongside EDR and endpoint protection tooling for clients as part of improving their detection and response capability. I also work hands-on with Splunk, including SPL query writing, for log analysis and threat hunting, both in that consulting work and in my doctoral coursework, where I built detection pipelines rather than just studying them conceptually. I'd be upfront that this has been consulting-scale deployments, not years running a single large enterprise SOC's SIEM day to day, so there may be platform-specific conventions here I'd need to ramp up on quickly."

### "How would you approach vulnerability management for a university with a lot of legacy and decentralized systems?"
> "Start with accurate asset inventory, you can't manage what you can't see, and universities are notorious for shadow IT and departmental systems nobody centrally tracks. From there, risk-based prioritization: not every vulnerability gets patched on the same timeline, so I'd score by exploitability and exposure, not just CVSS base score alone, and align that to a NIST CSF-style risk framework. For legacy systems that can't be patched on a normal cadence, compensating controls, network segmentation, tighter access restrictions, additional monitoring, become the interim answer while a longer-term remediation or decommission plan gets built. And because higher ed is decentralized, a lot of this is relationship work: getting department IT contacts to actually patch on schedule usually depends more on clear communication and follow-through than on technical authority alone."

### "FERPA obviously matters here. How do you think about compliance requirements like that in your security work?"
> "I treat compliance frameworks as a floor, not the target, but they matter because they define what data needs the strongest access controls and audit logging. My consulting work is built around NIST CSF and CMMC 2.0 already, so I'm used to mapping technical controls back to a named framework's requirements rather than just doing security ad hoc. I don't have direct hands-on FERPA compliance experience yet since that's specific to higher ed, but the underlying skill, identifying regulated data, restricting access on a least-privilege basis, and logging access to it, is the same discipline I already apply to CMMC's CUI-handling requirements. I'd want to get up to speed on CNU's specific FERPA implementation quickly."

### "Tell me about a real security assessment or incident you handled, and what you found."
> "At Cyntraix, I run comprehensive security assessments of client networks, systems, and applications specifically to identify vulnerabilities and quantify operational risk exposure, then build remediation roadmaps against NIST CSF and CMMC 2.0. A recurring finding across clients has been weak identity and access hygiene, shared credentials, excessive standing privileges, so a meaningful share of my remediation work has been Zero Trust and identity-centric redesign rather than just patching. I'd rather be specific about the pattern than invent a single dramatic incident: the real value I've delivered has been closing that identity-and-access gap repeatedly across SMB and mid-market clients."

### "This is a staff analyst role, and your background includes a lot of teaching. Are you looking to leave academia, or is this a side step?"
> "This is a deliberate move, not a side step. I've been building toward industry the whole time, that's part of why I chose a Doctor of Engineering rather than a traditional PhD: a D.Eng is oriented toward solving and building real engineering problems rather than purely theoretical research. Cyntraix exists because I wanted to be doing the hands-on security work directly, not just teaching it, and this role is a direct continuation of that, moving from consulting engagements to a full-time operational security seat inside one organization."

### "What's a security gap or weakness you should be upfront about for this specific role?"
> "I haven't worked as an analyst inside a single organization's internal SOC day-to-day, my hands-on security delivery has been through Cyntraix as an external consultant, plus academic/forensics work and teaching. That means I bring strong assessment, architecture, and framework experience, but I'd be new to whatever specific ticketing, escalation, and on-call rhythm this team already has built. I don't hold CISSP or a GIAC certification yet, I have CompTIA Security+ and the Google Cybersecurity Professional Certificate, so if this role expects a specific advanced certification as a near-term requirement rather than a growth target, that's worth naming directly."

### "How do you communicate a security risk to a non-technical stakeholder, like a department head or dean?"
> "I translate the technical finding into an operational consequence and a bounded ask. Instead of 'this endpoint is running an unpatched CVE with a 9.8 CVSS score,' it's 'this system could let someone access student records without a password, and fixing it takes about two hours of downtime this week or an unplanned outage later.' I built this instinct partly through teaching, explaining ethical hacking and incident response to high schoolers forces you to strip out jargon, and it carries directly into client conversations at Cyntraix, where the client is rarely a security specialist either."

### "Why Christopher Newport specifically, and why now?"
> "Higher ed is an environment I already understand well, from teaching at Lawson State and UAGC, and from my own experience as a student here. I know how decentralized and resource-constrained university IT tends to be compared to a private-sector security team, and I think that context makes me faster to be useful here than someone coming in cold. And practically, this is the full-time operational security role I've been building toward with Cyntraix and my doctoral work, a chance to apply that directly inside one institution instead of across a rotating set of consulting clients."

---

## Questions matched to the actual posting language

This posting is unusually specific about named frameworks and tools (NIST SP 800-53 rev 5, the RMF under NIST SP 800-37, POA&Ms, SSPs, Tenable/Nessus, Palo Alto, FERPA/GLBA/PCI). Expect the panel to probe these by name, not just generically.

### "Walk me through your understanding of the Risk Management Framework under NIST SP 800-37, and how it connects to SP 800-53."
> "RMF is the process: categorize the system based on the data it handles, select the relevant SP 800-53 controls for that categorization, implement them, assess whether they're actually working, authorize the system to operate based on residual risk, and then monitor continuously rather than treating authorization as a one-time event. SP 800-53 rev 5 is the control catalog RMF pulls from, organized into control families like access control, audit and accountability, and system and communications protection. My hands-on exposure has been applying NIST CSF and CMMC 2.0 at Cyntraix, which share the same underlying control logic, but I haven't personally authored a System Security Plan or a POA&M under a formal RMF authorization package. That's a real gap for this specific role, and I'd want to be direct about it rather than imply I've run a full ATO process."

### "Have you built or maintained a POA&M, an SSP, or handled System Access Requests?"
> "Not under those specific document names. At Cyntraix, my deliverables are risk assessments and remediation roadmaps, which functionally track and prioritize open findings the way a POA&M does, but I haven't authored a formal POA&M, SSP, or System Access Request package inside a government or higher-ed authorization framework. I'd be learning CNU's specific templates and process, though the underlying discipline, tracking a finding from identification through remediation with a documented timeline and owner, is one I already practice."

### "What's your hands-on experience with Tenable, Nessus, or Microsoft Defender for vulnerability scanning?"
> "I want to be honest here: my documented hands-on tooling has been Splunk for log analysis, and Kali/Wireshark/Autopsy on the forensics and offensive side, not Tenable or Nessus specifically. At Cyntraix I do run vulnerability assessments as part of client engagements, but I'd need to confirm which specific scanner was used for those, and I don't want to overstate it in an interview. I'm confident I can ramp up quickly on Tenable or Defender vulnerability management specifically, since the underlying vulnerability-triage and CVSS/exploitability scoring logic is the same skill I already apply, but it would be new tooling for me on day one."

### "Tell me about your experience with SIEM dashboard development or parsing events for SIEM ingestion."
> "My SIEM experience is centered on Splunk, writing SPL queries for log analysis and threat hunting. I haven't specifically built ingestion parsers for a new log source or designed a dashboard from scratch for a SIEM platform, that's more specialized than the analysis work I've done. I'd frame this as adjacent, not equivalent: I understand what a good dashboard needs to show and why parsing matters for data quality, but the hands-on engineering side of SIEM administration is something I'd be building on the job."

### "This role works with Palo Alto firewalls and IDS/IPS. What's your background there?"
> "I understand defense-in-depth and where a firewall and IDS/IPS sit in that architecture conceptually, and Zero Trust network segmentation is part of what I design at Cyntraix. But Palo Alto specifically isn't a platform I've configured hands-on and documented; I'd name that directly rather than imply vendor-specific experience I don't have. The underlying network-security logic transfers, the interface and CLI would be new."

### "How does your CMMC/NIST CSF work translate to FERPA, GLBA, and PCI, which this role specifically names?"
> "The translation is in the pattern, not the specific regulation. Every one of these, CMMC's CUI handling, FERPA's student-record protections, GLBA's safeguarding of financial data, PCI's cardholder-data requirements, comes down to the same three moves: identify the regulated data, restrict and log access to it on a least-privilege basis, and be able to prove you did both when asked. I've applied that pattern under CMMC and NIST CSF specifically; I have not yet applied it under FERPA, GLBA, or PCI by name, and I'd want to learn CNU's specific data-classification scheme for each quickly rather than assume it maps one-to-one."

---

## Gaps to pre-empt, not hide

| Gap | Your bridge |
|---|---|
| No formal in-house SOC/analyst title before this; security delivery has been through Cyntraix as an external consultant | Assessment, architecture, and framework depth (NIST CSF, CMMC 2.0, Zero Trust) transfers directly; the specific internal SOC rhythm (ticketing, on-call, escalation paths) would be new. |
| No CISSP or GIAC certification | Hold CompTIA Security+ and Google Cybersecurity Professional Certificate; frame as building toward advanced certs, not stalled. |
| No direct FERPA compliance experience | Already map technical controls to a named framework (CMMC's CUI handling) — same discipline, new regulation to learn. |
| Background is majority teaching-and-consulting, not a single-employer security team | Deliberate industry pivot, tied directly to the reasoning behind choosing a D.Eng over a traditional PhD. |
| SIEM/Splunk experience is consulting-scale and coursework, not years running one enterprise platform | Real hands-on SPL and SIEM/EDR deployment experience exists; be honest it's not the same depth as a long-tenured internal SOC analyst. |
| No documented hands-on Tenable/Nessus or Microsoft Defender vulnerability-scanning experience (posting names these specifically) | Vulnerability-triage and CVSS/exploitability scoring logic already applied at Cyntraix; the specific scanner tooling would be new. |
| No documented authorship of SSPs, System Access Requests, or POA&Ms (posting names these specifically) | Cyntraix's risk-assessment/remediation-roadmap deliverables track findings the same way a POA&M does; the formal RMF-package templates would be new. |
| No hands-on Palo Alto firewall/IDS-IPS configuration experience (posting names this specifically) | Defense-in-depth and Zero Trust network-segmentation design already practiced; the specific vendor platform would be new. |
| No FERPA/GLBA/PCI compliance experience by name (posting names these specifically, distinct from CMMC/NIST CSF) | Same underlying pattern (identify regulated data, restrict/log access, prove it) already applied under CMMC; the specific regulations would be new. |

---

## Questions to ask them (pick 2-3)

- What does the security team's structure look like, how many analysts, and how is on-call/escalation handled?
- What's the biggest gap this hire is meant to close, monitoring coverage, vulnerability management, incident response, something else?
- What SIEM/EDR/ticketing stack does the team currently run, and which vulnerability scanner (Tenable, Defender, or other)?
- Is there an established RMF/ATO process here with existing SSP and POA&M templates, or would this role help build that out?
- How does the security team typically work with academic departments that run their own decentralized IT?
- What would success look like in this role at the 6-month mark?
- The posting notes this role is on-campus with only limited periodic telework, subject to supervisor approval. What does that typically look like day to day?

---

## Pre-call checklist

- [ ] Quiet room, camera-ready, joined a few minutes early. Google Meet invite from Tom Dunn.
- [ ] Have this sheet open, plus your resume.
- [ ] Be ready to name the SOC-analyst-title gap and the no-CISSP gap plainly if asked, don't get caught flat-footed.
- [ ] Close with genuine interest and ask about next steps and timeline.
