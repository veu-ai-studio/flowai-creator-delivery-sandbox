# AOL Five-Layer User Architecture

Status: Core product guidance
Source: Founder Strategic Review
Audience: AOL CTO and product/build workstreams

## Boundary

This document records AOL product guidance. It does not amend the FlowAI canonical authority documents unless a separate canonical amendment is drafted and ratified.

## Key Design Principle

AOL must not be designed around a single type of user.

The biggest mistake would be designing AOL primarily for:

- Browser users
- Smartphone users
- Technically literate users

Those groups represent only a portion of the population AOL intends to serve.

AOL must be designed as a multi-layer network serving different categories of Abasi People through different communication channels.

The same intelligence network serves all layers. The communication method changes.

## Layer 1 - Founder Layer

Who:

- Founder
- Executive leadership

Role:

- Governance
- Vision
- Validation
- Direction

The founder is not the primary user. The founder is the first validator.

Founder questions:

- Is AOL useful?
- Is AOL trusted?
- Is AOL learning?
- Is AOL serving Abasi People?

Founder interface:

- Network intelligence
- Homeland intelligence
- Learning trends
- Coverage status
- Network health
- Strategic direction

CTO implication:

Do not build AOL around the founder. The founder validates AOL. The founder is not AOL's primary beneficiary.

## Layer 2 - APF Steward Layer

Who:

- APF officers
- Volunteers
- Community stewards
- Regional coordinators
- Moderators

Role:

Operate and improve the network.

Steward responsibilities:

- Review contributions
- Review corrections
- Validate opportunities
- Validate alerts
- Review intelligence
- Promote valuable information

Interface:

- Steward queues
- Contribution reviews
- Community intelligence reviews
- LGA coverage reports
- Network health

CTO implication:

Operator tooling belongs here. Control planes, manifests, queues, audits, and governance tools primarily serve this layer.

## Layer 3 - Smartphone User Layer

Who:

- Students
- Professionals
- Business owners
- Diaspora members
- Churches
- Organizations

Devices:

- Smartphones
- Mobile browsers
- WhatsApp
- Future AOL app

Capabilities:

- Search people
- Search opportunities
- Search services
- Search businesses
- Ask questions
- Share information
- Submit contributions
- Receive personalized value

Communication channels:

- WhatsApp
- Mobile app
- Mobile browser
- SMS

CTO implication:

This layer receives the richest AOL experience. Most current AOL functionality serves this group.

## Layer 4 - Educated SMS User Layer

Who:

People who can read but may have:

- Feature phones
- Limited internet
- Limited smartphone access

Capabilities:

- Receive concise value
- Respond using simple replies

Example:

```text
AOL:
New scholarship opportunity available.

Reply:
1 More Info
2 Share
3 Useful
4 Not Useful
5 Call Me
```

Channels:

- SMS
- WhatsApp text
- USSD, future

CTO implication:

Do not assume browser access. Many future AOL users may live entirely through SMS interactions.

## Layer 5 - Voice-First Abasian Layer

Who:

- Elders
- Villagers
- Market women
- Farmers
- Fishermen
- Non-literate users
- Users preferring spoken communication

This may become AOL's largest beneficiary group.

Capabilities:

- No reading required
- No internet required
- No smartphone required
- AOL calls them
- AOL speaks
- They speak back

Communication channels:

- Voice calls
- Voice notes
- Interactive voice response
- AI voice conversations

Language support:

- English
- Nigerian Pidgin
- Ibibio
- Annang
- Efik
- Oro
- Ekid
- Ekoi
- Obolo

Collectively these should be treated as Abasian language support.

The objective is not tribal separation. The objective is communication accessibility across all Abasi People.

Example:

```text
AOL:
Good morning.

A healthcare outreach will take place tomorrow in your area.

Press 1 to hear again.
Press 2 if you need assistance.
Press 3 to speak.

User responds naturally.
AOL listens.
AOL learns.
AOL routes the request.
```

CTO implication:

This layer should become a major strategic priority. Voice intelligence may ultimately create more value than additional dashboards.

## Architectural Consequence

All five layers connect to the same AOL intelligence network.

The difference is not information. The difference is delivery method.

The network should discover value once and deliver it differently depending on the recipient.

Example:

- Job opportunity for Layer 3: WhatsApp
- Job opportunity for Layer 4: SMS
- Job opportunity for Layer 5: voice call

Same value. Different channel.

## CTO Priority Order

1. Voice Intelligence Layer
2. Public Intelligence Discovery Layer
3. Search Layer
4. Learning Layer
5. Contribution Layer
6. Steward Layer
7. Activation Control Plane

Reason:

Layers 3-5 represent the overwhelming majority of future AOL beneficiaries. AOL succeeds when it delivers value to them, not when it perfects operator tooling.

## Final Rule

Every major AOL feature should answer:

Which user layer does this serve?

If the answer is only Layer 1 or Layer 2, the feature should receive lower priority.

If the answer is Layer 3, Layer 4, or Layer 5, the feature is directly improving AOL's value delivery mission.

The long-term success of AOL will likely depend less on dashboards and more on its ability to deliver trusted value to ordinary Abasi People through the communication channel they already use.
