# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Gewone HTML/CSS/JS, geen framework (bevestigd door de gebruiker). Hosting en synchronisatie zijn nog niet gekozen: eerst 2–3 opties voorleggen (zie CLAUDE.md).

## Users
Eén speler: Tristan, beginner zonder economische achtergrond. Speelt vooral op de gsm (op de bus), soms op de computer, via een privé link. Dagelijks 5 tot 20 minuten. Later delen met anderen is niet gepland.

## Product Purpose
Een gratis leerspel om economie en beleggen te leren, tot de speler Trendradar-rapporten en jaarcijfers zelf kan lezen en beoordelen zonder AI. Succes: mijlpaal A (een Trendradar-rapport volledig begrijpen) en mijlpaal B (de jaarcijfers van een bedrijf zelf beoordelen). Campagne van 6 levels (52 lessen, eindtoets met 80% om door te gaan, twee realiteitstoetsen), daarna een Open wereld met maandelijkse uitbreidingspakketten.

## Positioning
Een leerspel dat begrip en juistheid beloont en nooit risico, virtuele winst of handelen. Alle uitleg met bron en "geldig op"-datum, aangepast aan Belgische en Europese context, in het Nederlands en Engels voor begrippen. Spelen gebruikt geen AI.

## Operating Context
Korte sessies (±5, ±10–15, 20+ min) in een vaste lus: opwarmer, uitleg, oefenen met uitleg bij elk antwoord, afsluiter van drie zinnen. Gespreide herhaling (1, 3, 7, 14, 30, 60 dagen; max. 15 herhaalvragen per normale sessie). Rode draad: de economische cyclus (groei, piek, krimp, herstel). Gebruik in beweging, met wisselend bereik.

## Capabilities and Constraints
- Eerste keer laden onder 1 MB; geen zware bibliotheken; grafieken zelf tekenen (SVG of canvas).
- Werkt zonder bereik na het laden (service worker); antwoorden later synchroniseren.
- Voortgang gedeeld tussen gsm en computer; per begrip wint de nieuwste stand; export/import als back-up.
- Lesinhoud in aparte compacte databestanden (JSON) per level, los van de code.
- Spelen gebruikt geen AI en geen Claude.
- Geen beleggingsadvies of koop-/verkooptips, zichtbaar in het spel. Bron en "geldig op"-datum bij elke uitleg. Knop "Meld een fout".
- Nog open: officiële databronnen rechtstreeks vanuit de pagina, werking offline-sync, maandpakket via geplande taak of op aanvraag, naam van het spel, slaagdrempel (voorstel 80%).

## Brand Commitments
Geen naam of beeldmerk vastgelegd. Taal: Nederlands (Vlaams). Niet onderhandelbaar: nooit belonen voor risico/virtuele winst/handelen; confetti alleen bij leermijlpalen (level of realiteitstoets); geen meldingen die druk zetten; streak met twee pauzedagen per maand.

## Evidence on Hand
Alleen PLAN.md (leerplan, spelvormen, regels, bouwvolgorde). Er is nog geen code, inhoud, DESIGN.md of echte data. Geen testimonials of cijfers verzinnen; bronnen: ECB, NBB, Statbel, Eurostat, Wikifin (FSMA), jaarverslagen van bedrijven.

## Product Principles
1. Eerst goede inhoud en didactiek, daarna spelelementen.
2. Bij elk antwoord uitleg: wat, hoe, waarom en wanneer het anders loopt, ook bij een juist antwoord.
3. Beloon begrip en juistheid, nooit risico of virtuele winst.
4. Leren door ophalen en gespreide herhaling; een sessie kan altijd gepauzeerd worden.
5. Licht en rustig: één keer laden, daarna doorspelen.

## Accessibility & Inclusion
Groot lettertype, knoppen onderaan binnen bereik van de duim, donkere en lichte modus, geen geluid nodig. Rood/groen nooit als enige drager van betekenis. Getest op 390px breed.
