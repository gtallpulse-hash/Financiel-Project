# Leerspel Beleggen & Economie

Het volledige plan staat in `PLAN.md`. Lees het voor je iets bouwt. Bij twijfel geldt het plan.

## Werkwijze
- Communiceer in het Nederlands (Vlaams). Leg technische keuzes kort en eenvoudig uit: ik ben geen ervaren programmeur.
- Bouw in de volgorde van "Bouwvolgorde" in PLAN.md. Eén stap per keer, en laat me testen voor je verder gaat.
- Stel bij grote keuzes (hosting, synchronisatie, framework) eerst 2–3 opties voor met voor- en nadelen, en wacht op mijn keuze.
- Commit na elke afgewerkte stap met een duidelijke boodschap.

## Harde eisen
- Mobiel eerst: ik speel vooral op de gsm, op de bus. Test elk scherm op 390px breed.
- Eerste keer laden onder 1 MB. Geen zware bibliotheken; grafieken zelf tekenen (SVG of canvas).
- Werkt zonder bereik na het laden (service worker); antwoorden later synchroniseren.
- Voortgang gedeeld tussen gsm en computer; per begrip wint de nieuwste stand. Plus export/import als back-up.
- Spelen gebruikt geen AI en geen Claude.
- Lesinhoud staat in aparte, compacte databestanden per level (bv. JSON), los van de code.

## Spelregels (niet onderhandelbaar)
- Nooit belonen voor risico, virtuele winst of handelen. Geen confetti behalve bij leermijlpalen (level of realiteitstoets gehaald).
- Geen beleggingsadvies, geen koop- of verkooptips. Dat staat zichtbaar in het spel.
- Bron en "geldig op"-datum zichtbaar bij elke uitleg.
- Geen meldingen die druk zetten; streak met twee pauzedagen per maand.

## Design
- Rustig, sober en duidelijk, zoals een goede krant of een degelijke vervoer-app. Geen "AI-look": geen paars-blauwe gradiënten, geen emoji als iconen, geen rijen identieke kaartjes met schaduw, geen gloei-effecten.
- Leg eerst een klein design system vast in `DESIGN.md` (lettertype, 4–5 kleuren met betekenis, tussenruimtes, knopstijl) en houd je daar overal aan.
- Kleuren hebben een betekenis die past bij de economische cyclus (groei, piek, krimp, herstel). Rood/groen nooit als enige drager van betekenis.
- Groot lettertype, knoppen onderaan binnen bereik van de duim, donkere en lichte modus, geen geluid nodig.
- Controleer elk nieuw scherm met een screenshot op gsm-formaat voor je het klaar noemt.
