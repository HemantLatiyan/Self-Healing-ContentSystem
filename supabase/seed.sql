-- Hand-authored seed data for the self-healing content demo.
-- Run AFTER 0001_init.sql. Idempotent via TRUNCATE.

truncate table audit_log, patch_proposals, content_versions, change_sets,
               content_concepts, content, source_concepts, snapshots,
               sources, concepts
  restart identity cascade;

-- Sources (point at unsuffixed filename; v1/v2 promotion is handled outside the DB).
insert into sources (id, name, type, location) values
  (1, 'Professional Cloud Architect Exam Guide',        'markdown', 'source1_exam_guide.md'),
  (2, 'Compute Engine Machine Families Reference',      'markdown', 'source2_machine_families.md'),
  (3, 'Atrial Fibrillation Anticoagulation Reference',  'markdown', 'source3_afib_anticoagulation.md'),
  (4, 'GDPR Compliance Practitioner Reference',         'markdown', 'source4_gdpr_compliance.md'),
  (5, 'U.S. Retirement Account Contribution Limits',    'markdown', 'source5_retirement_limits.md');
select setval(pg_get_serial_sequence('sources','id'), (select max(id) from sources));

-- Concepts.
insert into concepts (id, name, description) values
  (1,  'exam_format',              'Structure, length, and delivery of the PCA exam.'),
  (2,  'knowledge_domains',        'The named sections / domains assessed on the PCA exam and their relative weighting.'),
  (3,  'case_studies',             'Official PCA case studies referenced by scenario questions.'),
  (4,  'preparation_strategy',     'Recommended preparation timeline, sequence, and hours of practice.'),
  (5,  'qwiklabs',                 'Hands-on lab platform historically used for GCP credit and practice.'),
  (6,  'e2_family',                'E2 general-purpose Compute Engine machine family.'),
  (7,  't2a_family',               'T2A Arm-based scale-out general-purpose machine family.'),
  (8,  'c2d_family',               'C2D AMD compute-optimized machine family.'),
  (9,  'a2_family',                'A2 accelerator-optimized machine family with NVIDIA A100 GPUs.'),
  (10, 'machine_family_selection', 'Decision framework for choosing a Compute Engine machine family.'),
  -- Medical (source 3)
  (11, 'afib_stroke_risk',         'CHA2DS2-VASc based stroke risk stratification in non-valvular atrial fibrillation.'),
  (12, 'doac_selection',           'Selection of direct oral anticoagulants versus warfarin for stroke prevention.'),
  (13, 'doac_renal_dosing',        'Dose adjustment of DOACs based on creatinine clearance and patient-specific criteria.'),
  (14, 'anticoagulant_reversal',   'Reversal agents and strategies for life-threatening anticoagulant-associated bleeding.'),
  (15, 'afib_pci_antithrombotic',  'Antithrombotic regimen for atrial fibrillation patients after percutaneous coronary intervention.'),
  -- Legal (source 4)
  (16, 'gdpr_lawful_basis',        'Article 6 lawful bases for processing personal data under GDPR.'),
  (17, 'gdpr_breach_notification', 'Controller and processor obligations for personal data breach notification.'),
  (18, 'gdpr_data_subject_rights', 'Catalogue of rights granted to data subjects and response timelines.'),
  (19, 'gdpr_cross_border',        'Mechanisms for transferring personal data outside the EEA.'),
  (20, 'gdpr_fine_tiers',          'Two-tier administrative fine structure under Article 83.'),
  -- Finance (source 5)
  (21, 'us_401k_limits',           'Annual elective deferral and overall additions limits for 401(k)/403(b)/457(b) plans.'),
  (22, 'us_ira_limits',            'Annual contribution and income phase-out limits for traditional and Roth IRAs.'),
  (23, 'us_catch_up_contributions','Catch-up contribution rules for participants age 50+, including the SECURE 2.0 high-earner Roth mandate.'),
  (24, 'us_rmd_rules',             'Required minimum distribution beginning age and missed-RMD penalties.'),
  (25, 'us_traditional_vs_roth',   'Decision framework for pre-tax versus Roth deferrals.');
select setval(pg_get_serial_sequence('concepts','id'), (select max(id) from concepts));

-- Source ↔ concept links.
insert into source_concepts (source_id, concept_id) values
  (1, 1),  (1, 2),  (1, 3),  (1, 4),  (1, 5),
  (2, 6),  (2, 7),  (2, 8),  (2, 9),  (2, 10),
  (3, 11), (3, 12), (3, 13), (3, 14), (3, 15),
  (4, 16), (4, 17), (4, 18), (4, 19), (4, 20),
  (5, 21), (5, 22), (5, 23), (5, 24), (5, 25);

-- Content (hand-authored bodies). Mix of lesson / quiz / rationale / flashcard.
insert into content (id, type, title, current_body, current_version, primary_concept_id) values
  (1, 'lesson', 'PCA Exam Format Overview',
$$The Google Cloud Professional Cloud Architect (PCA) exam is a two-hour proctored assessment with approximately 50 multiple-choice and multiple-select questions. Candidates may sit the exam online with a remote proctor or in person at an authorized testing center.

Google does not publish a numeric passing score. Results are reported as pass or fail with a section-level performance summary. The certification is valid for two years; recertification requires retaking the current version of the exam.$$,
   1, 1),

  (2, 'flashcard', 'How many sections are on the PCA exam?',
$$**Q:** How many knowledge-domain sections are on the Professional Cloud Architect exam?

**A:** Five sections, roughly equally weighted.$$,
   1, 2),

  (3, 'quiz', 'PCA Case Studies Quiz',
$$**Question:** Which four official case studies appear on the Professional Cloud Architect exam?

- A. EHR Healthcare, Helicopter Racing League, Mountkirk Games, TerramEarth
- B. EHR Healthcare, Cymbal Direct, Mountkirk Games, TerramEarth
- C. EHR Healthcare, Helicopter Racing League, Cymbal Direct, TerramEarth
- D. EHR Healthcare, Helicopter Racing League, Mountkirk Games, Cymbal Direct

**Answer:** A.$$,
   1, 3),

  (4, 'rationale', 'Why Mountkirk Games appears on the PCA exam',
$$Mountkirk Games is one of the four official PCA case studies. It models a mobile-gaming company migrating to Google Cloud and tests the candidate's ability to reason about latency-sensitive multiplayer workloads, regional capacity planning, and Cloud Spanner versus Cloud SQL trade-offs.

The case study is intentionally broad: gameplay backend, analytics pipeline, and player identity all sit under one architecture, so a single question can probe several knowledge domains at once. Candidates should pre-read the case study before exam day and sketch a reference architecture they can recall under time pressure.$$,
   1, 3),

  (5, 'lesson', 'Recommended PCA Preparation Timeline',
$$Most candidates spend two to four months preparing for the PCA exam, depending on prior Google Cloud experience.

A typical sequence:

1. Establish vocabulary with Cloud Digital Leader or Associate Cloud Engineer materials.
2. Spend at least 40 hours on hands-on labs in the Skills Boost / Qwiklabs Cloud Architecture path.
3. Read all four official case studies and sketch a reference architecture for each.
4. Take the free official practice exam and aim for 80% before scheduling the real test.$$,
   1, 4),

  (6, 'flashcard', 'Where do PCA candidates get hands-on lab credit?',
$$**Q:** Which platform does Google provide for hands-on lab credit during PCA preparation?

**A:** Qwiklabs (also accessible via the Skills Boost learning paths). Google provides a credit allowance for completing the Cloud Architecture learning path.$$,
   1, 5),

  (7, 'lesson', 'When to choose the E2 machine family',
$$The E2 family is the most cost-effective general-purpose family on Compute Engine. E2 instances support up to 32 vCPUs and 128 GB of memory, and they run on a Google-managed mix of Intel and AMD processors.

E2 is appropriate for web servers, small-to-medium databases, development environments, and microservices that do not require sustained high performance. Because the underlying hardware can vary, E2 is **not** recommended for latency-sensitive workloads. E2 does not support GPUs or local SSD.$$,
   1, 6),

  (8, 'flashcard', 'T2A Arm pricing discount',
$$**Q:** Approximately how much cheaper are T2A Arm instances than equivalent x86 instances on Compute Engine?

**A:** Approximately 20 percent lower.$$,
   1, 7),

  (9, 'quiz', 'C2D maximum memory',
$$**Question:** What is the maximum memory available on a single C2D compute-optimized instance?

- A. 240 GB
- B. 432 GB
- C. 832 GB
- D. 896 GB

**Answer:** D — 896 GB. The C2D family runs on AMD EPYC Milan and supports up to 112 vCPUs.$$,
   1, 8),

  (10, 'rationale', 'Why A2 is the workhorse for distributed training',
$$A2 instances attach NVIDIA A100 GPUs in configurations from 1 to 16 GPUs per VM, with NVLink interconnect between GPUs on the largest configuration. That high-bandwidth interconnect is what makes A2 the default choice for distributed training of large models: gradient synchronization across GPUs is the bottleneck in most training workloads, and NVLink moves data between A100s much faster than PCIe.

For inference-only or graphics workloads, the G2 family (NVIDIA L4) is usually a better cost match. A2 is currently available in 14 Google Cloud regions, which is wider than most accelerator families.$$,
   1, 9),

  (11, 'lesson', 'Choosing a Compute Engine machine family',
$$Begin by identifying the dominant resource for the workload.

- **CPU-bound** workloads (gaming servers, EDA, single-threaded HPC) belong on C2 or C2D.
- **Memory-bound** workloads (in-memory databases, SAP HANA) belong on the M series.
- **GPU-accelerated** workloads belong on A2 (training) or G2 (inference, graphics).
- Everything else should start on **N2** or **N2D** and move to **E2** only when cost optimization outweighs the need for consistent performance.

The Compute Engine recommendation engine in the Google Cloud console can analyze actual utilization metrics from existing fleets and propose more cost-effective machine types. This tool should be revisited at least **quarterly** for production fleets.$$,
   1, 10),

  -- ------------------------------------------------------------------
  -- Medical (source 3)
  -- ------------------------------------------------------------------

  (12, 'lesson', 'When to anticoagulate in atrial fibrillation',
$$Stroke risk in non-valvular atrial fibrillation is estimated with the CHA2DS2-VASc score. Anticoagulation is recommended at a score of 2 or higher in men and 3 or higher in women. A score of 1 in men or 2 in women is a discussion point where shared decision making applies.

For most patients meeting the threshold, a novel oral anticoagulant (NOAC) is preferred over warfarin because of comparable or superior stroke prevention, lower intracranial hemorrhage rates, and the absence of routine INR monitoring. Warfarin remains preferred for patients with mechanical valves, moderate-to-severe mitral stenosis, antiphospholipid syndrome, or end-stage renal disease.$$,
   1, 11),

  (13, 'flashcard', 'Apixaban dose reduction criteria',
$$**Q:** When is apixaban reduced from 5 mg twice daily to 2.5 mg twice daily for stroke prevention in AF?

**A:** When the patient meets at least two of three criteria: age 80 years or older, body weight 60 kg or less, or serum creatinine 1.5 mg/dL or greater.$$,
   1, 13),

  (14, 'quiz', 'NOAC reversal agents',
$$**Question:** Which reversal agent is used for life-threatening bleeding on dabigatran?

- A. Andexanet alfa
- B. Idarucizumab
- C. 4F-PCC
- D. Fresh frozen plasma

**Answer:** B — idarucizumab, dosed at 5 g IV in two divided doses. Andexanet alfa is the specific reversal agent for the factor Xa inhibitors apixaban and rivaroxaban.$$,
   1, 14),

  (15, 'rationale', 'Why triple therapy is used after PCI in AF patients',
$$Patients with AF who undergo percutaneous coronary intervention need anticoagulation for stroke prevention and dual antiplatelet therapy for stent protection. Standard practice is triple therapy — a NOAC, aspirin 81 mg, and a P2Y12 inhibitor — for approximately one month after the procedure, then dropping aspirin and continuing dual therapy with the NOAC plus the P2Y12 inhibitor for 6 to 12 months. After that the P2Y12 inhibitor is also discontinued and the patient remains on NOAC monotherapy.

Clopidogrel is the preferred P2Y12 inhibitor in this setting because of its lower bleeding risk relative to ticagrelor or prasugrel. The one month aspirin window reflects the balance between early stent thrombosis risk, which is highest in the first 30 days, and bleeding risk, which accumulates with every additional antithrombotic agent.$$,
   1, 15),

  (16, 'lesson', 'NOAC selection in chronic kidney disease',
$$NOAC selection in CKD depends primarily on creatinine clearance.

- **Apixaban** is usable across most CKD stages, with dose reduction to 2.5 mg twice daily when criteria are met.
- **Rivaroxaban** is dosed at 15 mg once daily for CrCl 15 to 50 mL/min; avoid below 15.
- **Dabigatran** uses 150 mg twice daily for CrCl above 30 mL/min and 75 mg twice daily for CrCl 15 to 30 (US only); avoid below 15.
- **Edoxaban** is dosed at 30 mg once daily for CrCl 15 to 50 mL/min; avoid above 95 or below 15 mL/min.

Apixaban is generally the preferred NOAC in advanced CKD because of the most favorable bleeding profile in this population.$$,
   1, 13),

  (17, 'flashcard', 'What does CHA2DS2-VASc stand for?',
$$**Q:** What does the CHA2DS2-VASc score stand for?

**A:** Congestive heart failure, Hypertension, Age ≥75 (2 points), Diabetes, Stroke/TIA (2 points), Vascular disease, Age 65–74, Sex category (female).$$,
   1, 11),

  -- ------------------------------------------------------------------
  -- Legal (source 4)
  -- ------------------------------------------------------------------

  (18, 'lesson', 'GDPR personal data breach notification timeline',
$$A personal data breach must be notified to the lead supervisory authority within 72 hours of the controller becoming aware of it, unless the breach is unlikely to result in a risk to the rights and freedoms of natural persons. The 72-hour clock begins at the moment of awareness, not the moment of discovery by a third party.

When the breach is likely to result in a high risk to data subjects, those individuals must also be notified without undue delay, unless the data was rendered unintelligible by strong encryption, the high risk has been subsequently eliminated, or individual notification would involve disproportionate effort. Processors must notify the controller without undue delay; controller–processor contracts typically specify 24 to 48 hours as the concrete maximum.$$,
   1, 17),

  (19, 'flashcard', 'GDPR breach notification deadline to the supervisory authority',
$$**Q:** Within how long must a controller notify the lead supervisory authority of a personal data breach under GDPR?

**A:** 72 hours from becoming aware of the breach, unless the breach is unlikely to result in a risk to the rights and freedoms of natural persons.$$,
   1, 17),

  (20, 'quiz', 'GDPR maximum administrative fines',
$$**Question:** What is the upper bound of a Tier 2 GDPR fine under Article 83?

- A. €10 million or 2 percent of annual global turnover, whichever is higher
- B. €20 million or 4 percent of annual global turnover, whichever is higher
- C. €20 million or 4 percent of EU-only turnover, whichever is lower
- D. €50 million or 6 percent of annual global turnover, whichever is higher

**Answer:** B. Tier 2 applies to violations of the basic principles, lawfulness of processing, data subject rights, and international transfers. Tier 1 caps at €10M or 2 percent and applies to procedural violations.$$,
   1, 20),

  (21, 'rationale', 'Why legitimate interests supports behavioral advertising',
$$Legitimate interests under Article 6(1)(f) is the most flexible GDPR lawful basis and has been the workhorse basis for first-party behavioral advertising. Reliance requires a documented three-part test: a legitimate interest pursued, processing necessary for that interest, and a balancing assessment showing the interest is not overridden by the rights of the data subject.

The EDPB's 2019 guidance on online services accepts legitimate interests as a valid basis for first-party behavioral targeting where users have a reasonable expectation of the processing and meaningful opt-out controls are provided. This is why most ad-tech stacks rely on legitimate interests rather than consent for first-party retargeting: consent fatigue suppresses opt-in rates, while a properly executed legitimate interests assessment and opt-out can support the full ad inventory.$$,
   1, 16),

  (22, 'lesson', 'Cross-border data transfer mechanisms under GDPR',
$$Transfers of personal data outside the EEA require an Article 46 transfer mechanism or an adequacy decision under Article 45. The most common mechanism in practice is the European Commission's Standard Contractual Clauses (SCCs) in the 2021 modular form.

Following the Schrems II judgment (Case C-311/18, 2020), reliance on SCCs additionally requires a documented transfer impact assessment (TIA) that evaluates the law and practice of the destination country and identifies supplementary measures where required. The EU–US Data Privacy Framework, adopted in 2023, provides an adequacy mechanism for transfers to participating US organizations and removes the need for a TIA for those specific transfers.$$,
   1, 19),

  (23, 'flashcard', 'GDPR data subject access request response window',
$$**Q:** Within what period must a controller respond to a data subject access request under GDPR?

**A:** One month from receipt, extendable by a further two months for complex or numerous requests provided the data subject is informed of the extension and its reasons within the original month.$$,
   1, 18),

  -- ------------------------------------------------------------------
  -- Finance (source 5)
  -- ------------------------------------------------------------------

  (24, 'lesson', '2024 employer retirement plan contribution limits',
$$For 2024, the IRS elective deferral limit for employee contributions to a 401(k), 403(b), or governmental 457(b) plan is $23,000. This limit applies in aggregate across all 401(k) and 403(b) plans an employee participates in during the year.

Employees who are age 50 or older by year end may make an additional catch-up contribution of $7,500, bringing the total elective deferral to $30,500. The overall annual additions limit — which includes employee deferrals, employer match, and after-tax contributions — is $69,000 in 2024, or $76,500 including catch-up. The annual additions limit is the relevant cap for the mega backdoor Roth strategy.$$,
   1, 21),

  (25, 'flashcard', '2024 401(k) elective deferral limit',
$$**Q:** What is the 2024 IRS elective deferral limit for employee contributions to a 401(k)?

**A:** $23,000, with an additional $7,500 catch-up for employees age 50 or older (total $30,500).$$,
   1, 21),

  (26, 'flashcard', '2024 IRA contribution limit',
$$**Q:** What is the 2024 annual contribution limit for a traditional or Roth IRA?

**A:** $7,000, with an additional $1,000 catch-up for individuals age 50 or older (total $8,000).$$,
   1, 22),

  (27, 'quiz', 'RMD beginning age after SECURE 2.0',
$$**Question:** Under current law, at what age must a traditional IRA owner begin taking required minimum distributions?

- A. 70.5
- B. 72
- C. 73
- D. 75

**Answer:** C — 73, set by the SECURE 2.0 Act of 2022 effective January 1, 2023. The age is scheduled to rise to 75 in 2033. Roth IRAs remain exempt from RMDs during the original owner's lifetime.$$,
   1, 24),

  (28, 'rationale', 'Why pre-tax catch-up contributions still benefit high earners',
$$Catch-up contributions to a 401(k), 403(b), or 457(b) are currently made on a pre-tax basis by default. For a high-earning participant in the 32 or 35 percent federal bracket, deferring the $7,500 catch-up amount yields immediate tax savings of roughly $2,400 to $2,625 per year, with the trade-off that distributions in retirement will be taxed as ordinary income.

For most high earners whose retirement marginal rate will be lower than their peak earning rate, this trade-off is favorable: the pre-tax catch-up captures today's high bracket and pays it back at a lower bracket later. This is the same logic that drives the pre-tax-first allocation for the underlying elective deferral, and it explains why most high-earning participants elect pre-tax rather than Roth catch-ups even when their plan offers both.$$,
   1, 23),

  (29, 'lesson', 'Traditional vs Roth 401(k): how to choose',
$$The traditional versus Roth decision depends on the participant's expected marginal tax rate in retirement compared to today.

- Choose **traditional** if the expected retirement marginal rate is meaningfully lower than the current rate. Most high earners in their peak earning years are in this category.
- Choose **Roth** if the expected retirement marginal rate is similar to or higher than today, if the participant wants tax diversification, or if the participant wants to avoid RMDs from employer-plan Roth accounts.

A blended approach is common: contribute pre-tax up to the elective deferral limit, then use a Roth IRA or after-tax 401(k) with in-plan Roth conversion for additional Roth exposure.$$,
   1, 25);
select setval(pg_get_serial_sequence('content','id'), (select max(id) from content));

-- Content ↔ concept links. Most items map to their primary concept; case_studies has two items.
insert into content_concepts (content_id, concept_id) values
  (1,  1),
  (2,  2),
  (3,  3),
  (4,  3),
  (5,  4),
  (6,  5),
  (7,  6),
  (8,  7),
  (9,  8),
  (10, 9),
  (11, 10),
  -- Medical
  (12, 11), (12, 12),  -- when to anticoagulate: covers stroke risk + DOAC vs warfarin
  (13, 13),            -- apixaban dose reduction
  (14, 14),            -- reversal agents quiz
  (15, 15),            -- triple therapy rationale (major-change target)
  (16, 13), (16, 12),  -- DOAC selection in CKD: renal dosing + DOAC selection
  (17, 11),            -- CHA2DS2-VASc flashcard
  -- Legal
  (18, 17),            -- breach notification timeline lesson
  (19, 17),            -- breach deadline flashcard
  (20, 20),            -- fine tiers quiz
  (21, 16),            -- legitimate-interests rationale (major-change target)
  (22, 19),            -- cross-border transfers lesson
  (23, 18),            -- DSAR response window flashcard
  -- Finance
  (24, 21),            -- 2024 401(k) limits lesson
  (25, 21),            -- 2024 401(k) limit flashcard
  (26, 22),            -- 2024 IRA limit flashcard
  (27, 24),            -- RMD age quiz
  (28, 23), (28, 25),  -- pre-tax catch-up rationale (major-change target) + trad-vs-Roth logic
  (29, 25);            -- trad vs Roth lesson

-- Initial content_versions rows (immutable history). source_changeset_id is NULL for seed inserts.
insert into content_versions (content_id, body, version, source_changeset_id, published_by)
  select id, current_body, current_version, null, 'system:seed' from content;

insert into audit_log (actor, action, payload) values
  ('system:seed', 'seed_loaded', jsonb_build_object(
    'sources', (select count(*) from sources),
    'concepts', (select count(*) from concepts),
    'content',  (select count(*) from content)
  ));
