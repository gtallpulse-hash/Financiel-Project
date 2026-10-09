# Bronnen en onderhoud van de lesinhoud

De lesinhoud staat per level in `public/data/level1.json` tot `level6.json`, plus `rt1.json` en `rt2.json` voor de realiteitstoetsen. Per begrip en per grafiek staan bron, link en "geldig op"-datum in het bestand zelf en in het spel. Dit bestand beschrijft waar de cijfers vandaan komen en hoe je ze vernieuwt. Alle cijfers zijn geraadpleegd op 8 oktober 2026.

## Level 1: Basis

| Gebruikt in | Gegeven | Bron en reeks |
| --- | --- | --- |
| Les 2 en eindtoets | Inflatie in België per jaar, 2015 tot en met 2025 | Eurostat, dataset `prc_hicp_aind`, HICP, `CP00`, `RCH_A_AVG`, `geo=BE` (gegevens van 6 februari 2026) |
| Les 2 | Prijsindex België 2015 = 100, 2025 = 135,49 | Zelfde dataset, `INX_A_AVG`, `geo=BE` |
| Eindtoets | Inflatie eurogebied 2025 = 2,1 % | Zelfde dataset, `geo=EA`; komt overeen met het ECB-jaarverslag 2025 |
| Les 6 | Rente op 10-jarige Belgische staatsobligaties, jaargemiddelde 2015 tot en met 2025 | ECB Data Portal, reeks `IRS.M.BE.L.L40.CI.0000.EUR.N.Z` (maandcijfers); het jaargemiddelde is zelf berekend |
| Les 8 en eindtoets | S&P 500, verandering per kalenderjaar 2017 tot en met 2025 | FRED (Federal Reserve Bank of St. Louis), reeks `SP500`, slotkoers van de laatste handelsdag van elk jaar (30 dec 2016, 29 dec 2017, 31 dec 2018, 31 dec 2019, 31 dec 2020, 31 dec 2021, 30 dec 2022, 29 dec 2023, 31 dec 2024, 31 dec 2025). Koersindex in dollar, zonder dividenden. Zelf berekend. |

Alle andere getallen in de oefeningen van Level 1 zijn **verzonnen rekenvoorbeelden** en dat staat erbij ("rekenvoorbeeld"). Ze worden gecontroleerd door `tests/inhoud.test.mjs`: elk rekenantwoord moet met zijn formule kloppen.

## Uitleg uit officiële bronnen

- ECB, *What is money?*: functies van geld, fiatgeld.
- Wikifin (FSMA): inflatie, koopkracht, spaarrekening (basisrente, getrouwheidspremie), reële rente, aandeel, dividend, obligatie, coupon, eindvervaldag, beleggingsfonds, ETF en trackers, spreiding, risico, rendement, volatiliteit.
- Garantiefonds (FOD Financiën): depositogarantie van 100.000 euro per persoon en per instelling, en 20.000 euro voor financiële instrumenten.

De exacte pagina's staan per begrip in het veld `bron_url`.

## Level 2: Macro-economie

| Gegeven | Bron en reeks |
| --- | --- |
| Bbp-groei per jaar (België) | Eurostat, `nama_10_gdp`, reëel bbp (chain-linked volumes) |
| Bbp-groei per kwartaal (eurogebied, 20 landen) | Eurostat, `namq_10_gdp`, seizoensgezuiverd |
| Werkloosheid België en eurogebied | Eurostat, `une_rt_a`, 15 tot 74 jaar |
| Inflatie eurogebied | Eurostat, `prc_hicp_aind` |
| Begrotingssaldo en overheidsschuld België | Eurostat, `gov_10dd_edpt1` (B.9 en bruto geconsolideerde schuld) |
| Consumentenvertrouwen eurogebied | Europese Commissie (DG ECFIN) via Eurostat, `ei_bsco_m`, indicator `BS-CSMCI` |
| Depositofaciliteitsrente | ECB, `FM.B.U2.EUR.4F.KR.DFR.LEV`; de beleidsrentes van 16 september 2026 zijn DFR 2,50 %, MRO 2,65 %, MLF 2,90 % |
| Rentecurve eurogebied | ECB, `YC.B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y` en `SR_2Y` |
| Euro tegenover dollar | ECB, `EXR.A.USD.EUR.SP00.A` |
| Nasdaq Composite | FRED, `NASDAQCOM` |

## Level 3 en 4: bedrijfscijfers

- **Jaarcijfers**: SEC EDGAR, de XBRL-gegevens (`companyfacts`) bij de jaarverslagen (10-K) en kwartaalverslagen (10-Q) van Microsoft (boekjaar tot 30 juni 2026), Walmart (31 januari 2026), Delta Air Lines (31 december 2025), Coca-Cola (31 december 2025), Costco (30 augustus 2026), Apple (27 september 2025) en PepsiCo (27 december 2025). Het vierde kwartaal van Microsoft is afgeleid: jaarcijfer min de eerste drie kwartalen. Elke bedrijfstabel wordt getest op de balansvergelijking (activa = schulden + eigen vermogen).
- **Koersen** (Level 4 en Realiteitstoets 1): Yahoo Finance, slotkoers op 30 september 2026 en historische slotkoersen. **Dit is een onofficiële bron** (geen vaste, gegarandeerde dienst). In het spel staat dat bij elke tabel en grafiek.
- **Aantal aandelen**: voorpagina van het jaarverslag (`dei:EntityCommonStockSharesOutstanding`), op verschillende datums per bedrijf. Beurswaarde = koers maal dat aantal.
- **Vereenvoudigingen** (staan ook in het spel): financiële schulden zijn de lange schulden plus het kortlopende deel zonder leasing; cash is enkel geld op rekeningen, zonder kortetermijnbeleggingen; K/W gebruikt de winst van het laatste afgesloten boekjaar, dat bij Coca-Cola, PepsiCo en Delta al negen maanden oud is.
- **Realiteitstoets 1**: het jaarverslag over 2025 van Duke Energy (SEC EDGAR, CIK 1326160), met koers van 30 september 2026.
- **Uitleg**: Investor.gov (SEC) woordenlijst, SEC *Beginners' Guide to Financial Statements*, Corporate Finance Institute (educatief).

## Level 5: cycli, trends en denkfouten

| Gegeven | Bron en reeks |
| --- | --- |
| Nasdaq Composite 1995 tot 2005; piek 5.048,62 (10 maart 2000), dal 1.114,11 (9 oktober 2002), nieuwe piek op 23 april 2015 | FRED, reeks `NASDAQCOM` |
| Amerikaanse huizenprijzen 2000 tot 2014; piek juli 2006, dal februari 2012 (−27,4 %) | FRED, reeks `CSUSHPINSA` (S&P CoreLogic Case-Shiller, nominaal) |
| S&P 500 2007 tot 2013; −56,8 % tussen 9 oktober 2007 en 9 maart 2009; piek terug op 28 maart 2013 | Yahoo Finance (onofficieel), koersindex zonder dividenden |
| Bbp-index eurogebied per kwartaal 2007 tot 2013 en 2019 tot 2022 (2015 = 100) | Eurostat, `namq_10_gdp`, `CLV_I15`, `SCA`, `B1GQ`, `EA20` |
| Prijsindex naaldhout 2019 tot 2023 | FRED, reeks `WPU0811` (BLS) |
| Omzet 2020 tegenover 2019 van Delta, Coca-Cola en PepsiCo | SEC EDGAR (10-K) |
| Overleving van nieuwe vestigingen (78,6 % na 1 jaar, 51,1 % na 5 jaar, 25,5 % na 15 jaar; cohort tot maart 2010) | U.S. Bureau of Labor Statistics, Business Employment Dynamics, tabel 7 |

De cijfers van Bessembinder (ongeveer 25.000 aandelen, 4 % die de nettowinst van de markt verklaren) komen uit samenvattingen van het artikel. De uitgever liet ons niet rechtstreeks toe de tekst te lezen. Controleer ze bij de bron als je ze verder wilt gebruiken.

## Level 6 en Realiteitstoets 2

| Gegeven | Bron en reeks |
| --- | --- |
| Investeringen, kasstroom en rentelast van Duke Energy 2019 tot 2025 | SEC EDGAR (10-K) |
| Omzet en investeringen van Albemarle 2018 tot 2025, omzet van Fluence Energy FY21 tot FY25 | SEC EDGAR (10-K) |
| Wereldprijs van koper 2015 tot 2026 | IMF via FRED, `PCOPPUSDM` |
| Grids Action Plan (28 november 2023): ongeveer 584 miljard euro nodig tegen 2030; ongeveer 40 % van de distributienetten ouder dan 40 jaar | Europese Commissie; bevestigd door meerdere persoverzichten |
| Grids Package (10 december 2025): voorstellen over onder meer vergunningen en netaansluitingen | Europese Commissie; samenvatting van het EUI |
| Datacenters ongeveer 415 TWh in 2024 (1,5 % van de wereldwijde vraag), ongeveer 945 TWh in 2030; ongeveer 10 % van de vraaggroei | IEA, *Energy and AI* (april 2025) |
| Levertijden: kabels twee tot drie jaar, grote transformatoren tot vier jaar (twee keer zoveel als in 2021) | IEA, *Building the Future Transmission Grid* (februari 2025) |
| Batterijpakket 115 dollar per kWh eind 2024, ongeveer 20 % lager | BloombergNEF, Battery Price Survey (december 2024) |
| Belgische capaciteitsveilingen 2025: Y-4, Y-2 en Y-1 tegelijk; batterijen nemen nagenoeg alle nieuwbouw | pv magazine (4 november 2025), over de resultaten van Elia |
| Doorlooptijd van een transmissieproject ongeveer tien jaar, meer dan de helft voor vergunningen | Documenten van de Europese Raad, geciteerd in samenvattingen |

**Let op, eerlijk gezegd:** de pagina's van het IEA, BloombergNEF, pv magazine en de Europese Commissie lieten ons niet toe de originele tekst rechtstreeks te lezen. Elk van deze cijfers is gecontroleerd tegen minstens twee onafhankelijke samenvattingen, maar niet tegen de primaire tekst. Controleer ze bij de bron voor je ze elders gebruikt. De cijfers uit SEC, FRED, Eurostat, ECB en BLS zijn wel rechtstreeks uit de reeksen gehaald en worden met tests gecontroleerd.

Realiteitstoets 2 bevat een voorbeeldrapport dat we zelf schreven (met echte cijfers van Fluence en BloombergNEF). Het is geen echt Trendradar-rapport: de twee laatste opdrachten laten je dezelfde vaardigheden op een eigen rapport toepassen, en jij beoordeelt jezelf.

## Cijfers vernieuwen

1. Haal de reeks opnieuw op bij de bron hierboven.
2. Pas de punten aan in `grafieken` in het juiste `levelN.json` en zet de datum bij `geldig_op`.
3. Pas teksten aan die de cijfers noemen (zoals "10,3 %" in de uitleg bij les 2).
4. Draai `npm test`. De tests controleren dat aangewezen hoogste en laagste punten nog kloppen en dat de teksten overeenkomen met de reeksen.

Regels veranderen (bijvoorbeeld belastingen of de depositogarantie): nakijken bij de bron en de datum bijwerken. Een fout gemeld via "Meld een fout" in het spel komt binnen als een melding op GitHub bij Issues.

## Mogelijke vervolgstap: actuele cijfers

De ECB en Eurostat laten aanvragen rechtstreeks vanuit de pagina toe (CORS staat open). FRED niet. Voor Amerikaanse cijfers is dus een tussenstap nodig, of de cijfers blijven vast in de lesinhoud met hun datum.
