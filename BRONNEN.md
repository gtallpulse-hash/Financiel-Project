# Bronnen en onderhoud van de lesinhoud

Alle lesinhoud staat in `public/data/level1.json`. Per begrip en per grafiek staan bron, link en "geldig op"-datum in het bestand zelf en in het spel. Dit bestand beschrijft waar de cijfers vandaan komen en hoe je ze vernieuwt.

## Echte cijfers (geraadpleegd op 8 oktober 2026)

| Gebruikt in | Gegeven | Bron en reeks |
| --- | --- | --- |
| Les 2 en eindtoets | Inflatie in België per jaar, 2015 tot en met 2025 | Eurostat, dataset `prc_hicp_aind`, HICP, `CP00`, `RCH_A_AVG`, `geo=BE` (gegevens van 6 februari 2026) |
| Les 2 | Prijsindex België 2015 = 100, 2025 = 135,49 | Zelfde dataset, `INX_A_AVG`, `geo=BE` |
| Eindtoets | Inflatie eurogebied 2025 = 2,1 % | Zelfde dataset, `geo=EA`; komt overeen met het ECB-jaarverslag 2025 |
| Les 6 | Rente op 10-jarige Belgische staatsobligaties, jaargemiddelde 2015 tot en met 2025 | ECB Data Portal, reeks `IRS.M.BE.L.L40.CI.0000.EUR.N.Z` (maandcijfers); het jaargemiddelde is zelf berekend |
| Les 8 en eindtoets | S&P 500, verandering per kalenderjaar 2017 tot en met 2025 | FRED (Federal Reserve Bank of St. Louis), reeks `SP500`, slotkoers van de laatste handelsdag van elk jaar (30 dec 2016, 29 dec 2017, 31 dec 2018, 31 dec 2019, 31 dec 2020, 31 dec 2021, 30 dec 2022, 29 dec 2023, 31 dec 2024, 31 dec 2025). Koersindex in dollar, zonder dividenden. Zelf berekend. |

Alle andere getallen in de oefeningen zijn **verzonnen rekenvoorbeelden** en dat staat erbij ("rekenvoorbeeld"). Ze worden gecontroleerd door `tests/inhoud.test.mjs`: elk rekenantwoord moet met zijn formule kloppen.

## Uitleg uit officiële bronnen

- ECB, *What is money?*: functies van geld, fiatgeld.
- Wikifin (FSMA): inflatie, koopkracht, spaarrekening (basisrente, getrouwheidspremie), reële rente, aandeel, dividend, obligatie, coupon, eindvervaldag, beleggingsfonds, ETF en trackers, spreiding, risico, rendement, volatiliteit.
- Garantiefonds (FOD Financiën): depositogarantie van 100.000 euro per persoon en per instelling, en 20.000 euro voor financiële instrumenten.

De exacte pagina's staan per begrip in het veld `bron_url`.

## Cijfers vernieuwen

1. Haal de reeks opnieuw op bij de bron hierboven.
2. Pas de punten aan in `grafieken` in `level1.json` en zet de datum bij `geldig_op`.
3. Pas teksten aan die de cijfers noemen (zoals "10,3 %" in de uitleg bij les 2).
4. Draai `npm test`. De tests controleren dat aangewezen hoogste en laagste punten nog kloppen en dat de teksten overeenkomen met de reeksen.

Regels veranderen (bijvoorbeeld belastingen of de depositogarantie): nakijken bij de bron en de datum bijwerken. Een fout gemeld via "Meld een fout" in het spel komt binnen als een melding op GitHub bij Issues.

## Mogelijke vervolgstap: actuele cijfers

De ECB en Eurostat laten aanvragen rechtstreeks vanuit de pagina toe (CORS staat open). FRED niet. Voor Amerikaanse cijfers is dus een tussenstap nodig, of de cijfers blijven vast in de lesinhoud met hun datum.
