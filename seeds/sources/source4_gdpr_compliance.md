# GDPR Compliance: Practitioner's Reference

This reference summarizes the core operational obligations of the EU General Data Protection Regulation (GDPR) for data controllers and processors. It is written for in house counsel and privacy engineers and assumes basic familiarity with the regulation.

## Lawful Basis for Processing

Article 6 requires every processing activity to rest on at least one of six lawful bases: consent, contract, legal obligation, vital interests, public task, or legitimate interests. Selection of basis must be documented before processing begins; switching basis after the fact is not generally permitted.

Legitimate interests remains the most flexible basis and is commonly relied on for fraud prevention and network security. Reliance on legitimate interests requires a documented three part test: a legitimate interest pursued, processing necessary for that interest, and a balancing assessment showing the interest is not overridden by the rights of the data subject.

**Significant change (2025):** Following the Court of Justice's judgment in *Meta Platforms Ireland v Bundeskartellamt* (Case C-252/21) and the EDPB's subsequent 2024 opinion on consent or pay models, legitimate interests is no longer accepted as a sufficient basis for behaviorally targeted advertising. Controllers running personalized advertising must now obtain freely given, specific, informed, and unambiguous consent under Article 6(1)(a), and that consent must satisfy the conditions of Article 7. The previously common practice of relying on legitimate interests with an opt out mechanism is now treated as non compliant by every major supervisory authority in the European Economic Area. First party analytics that do not produce a unified user profile may still rely on legitimate interests where the three part test is satisfied.

## Breach Notification

A personal data breach must be notified to the lead supervisory authority within 72 hours of the controller becoming aware of it, unless the breach is unlikely to result in a risk to the rights and freedoms of natural persons. The 72 hour clock begins at the moment of awareness, not the moment of discovery by a third party.

If the breach is likely to result in a high risk to the rights and freedoms of data subjects, the affected individuals must also be notified without undue delay. Communication to data subjects is not required if the controller has implemented appropriate technical measures rendering the data unintelligible (such as strong encryption with separately held keys), if subsequent measures have eliminated the high risk, or if individual notification would involve disproportionate effort.

Processors must notify the controller without undue delay after becoming aware of a breach. The contract between controller and processor should specify a concrete maximum, typically 24 hours.

## Data Subject Rights

Controllers must respond to data subject requests within one month of receipt. The deadline may be extended by a further two months for complex or numerous requests, with the data subject informed of the extension and its reasons within the original month.

The full catalogue of data subject rights includes access, rectification, erasure (the right to be forgotten), restriction, data portability, objection, and rights related to automated decision making and profiling. Requests must be honored free of charge except where manifestly unfounded or excessive.

## Cross Border Data Transfers

Transfers of personal data outside the European Economic Area require an Article 46 transfer mechanism or an adequacy decision under Article 45. The most common mechanism in practice is the European Commission's Standard Contractual Clauses (SCCs) in the 2021 modular form.

Following the Schrems II judgment (Case C-311/18, 2020), reliance on SCCs requires a documented transfer impact assessment (TIA) that evaluates the law and practice of the destination country and identifies supplementary measures where required. The EU-US Data Privacy Framework, adopted in 2023, provides an adequacy mechanism for transfers to participating US organizations.

## Administrative Fines

GDPR penalties are organized into two tiers under Article 83.

- Tier 1: up to €10 million or 2 percent of annual global turnover, whichever is higher. Applies to procedural violations such as inadequate records, missing data protection officer, or failed breach notification.
- Tier 2: up to €20 million or 4 percent of annual global turnover, whichever is higher. Applies to violations of the basic principles, lawfulness of processing, data subject rights, and international transfers.

Calculations of turnover are at the level of the undertaking, which under settled case law includes parent group revenue.

## EU Representative

Controllers and processors not established in the Union but offering goods or services to EU data subjects, or monitoring their behavior, must designate an EU representative under Article 27. The representative must be established in a Member State where a significant portion of the relevant data subjects reside, and their contact details must be published in the controller's privacy notice as well as provided directly to supervisory authorities on request. The representative is not the data protection officer and the roles must not be combined.
