# Design system

Doel: rustig, sober en duidelijk, zoals een goede krant of een degelijke vervoer-app. Alles is ontworpen voor de gsm (390px breed), met de duim onderaan. Voorbeeld: `design/preview.html`.

## Uitgangspunten (uit het artikel over dashboards, aangepast aan een leerspel)

1. **Eén vraag per scherm.** Eén doel, één grote handeling. Niet alles tonen.
2. **Duidelijkheid boven versiering.** Grafieken hebben zo weinig mogelijk inkt: geen kaders, geen 3D, geen schaduw, weinig rasterlijnen, weinig aslabels.
3. **Getallen die je kunt gebruiken.** "€ 1,2 mln" in plaats van "€ 1.234.567,89", behalve in rekenpuzzels waar de precisie de les is.
4. **Groepeer wat bij elkaar hoort**, met witruimte en één fijne lijn, niet met kaartjes.
5. **Houd het consistent.** Dezelfde soort gegevens krijgt altijd dezelfde grafiek en dezelfde plaats.
6. **Grootte en plaats sturen aandacht.** Het belangrijkste is groot en bovenaan, de bron en datum klein eronder.
7. **Altijd context.** Een getal staat nooit alleen: vergelijking, vorige waarde of aanduiding in de grafiek.
8. **Woorden zonder jargon.** Eerst het Nederlandse woord, het Engelse ernaast ("Rente op rente · compound interest").

## Lettertypes

Geen webfonts laden (houdt de eerste download klein). Systeemlettertypes:

| Rol | Stack | Gebruik |
| --- | --- | --- |
| Kop | `Charter, "Iowan Old Style", "Palatino Linotype", Georgia, serif` | Titels, grote getallen, begrip |
| Tekst en knoppen | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | Uitleg, vragen, knoppen, labels |
| Cijfers | zelfde als tekst, met `font-variant-numeric: tabular-nums` | Alle getallen in tabellen en grafieken |

| Stap | Grootte / regelhoogte | Gebruik |
| --- | --- | --- |
| Getal | 44 / 48, kop, 600 | Eén groot getal per scherm |
| Titel | 28 / 34, kop, 600 | Schermtitel, begrip |
| Tussenkop | 20 / 28, tekst, 600 | Onderdelen van een uitleg |
| Tekst | 18 / 28, tekst, 400 | Alles wat je leest (nooit kleiner op gsm) |
| Klein | 14 / 20, tekst, 400 | Bron, "geldig op", aslabels. Nooit voor uitleg. |

Regels: maximaal 36 tekens per regel in grafiekteksten, 60 in lopende tekst. Geen hoofdletters-label met veel letterspatiëring.

## Kleuren

Vijf kleuren met betekenis, plus papier en inkt. Ze volgen de economische cyclus. Kleur is nooit de enige drager: elke fase heeft ook een vorm en een woord.

| Naam | Licht | Donker | Betekenis | Vorm erbij |
| --- | --- | --- | --- | --- |
| Papier | `#F6F3EC` | `#121518` | Achtergrond | |
| Inkt | `#1C2024` | `#ECE8DF` | Tekst, hoofdknop, lijnen van gegevens | |
| Inkt zacht | `#5A6168` | `#A5ABB1` | Bron, datum, aslabels | |
| Lijn | `#D9D4C8` | `#2E3338` | Scheidingslijnen, raster | |
| Groei | `#1F6B57` | `#5FBF9F` | Groei · juist antwoord | pijl omhoog, woord "Groei" |
| Piek | `#8A5A00` | `#E0A63E` | Piek · let op, bijna | ruit, woord "Piek" |
| Krimp | `#A3392B` | `#E58470` | Krimp · fout antwoord | pijl omlaag, woord "Krimp" |
| Herstel | `#2D5F8B` | `#7FB0DE` | Herstel · hint, uitleg | gebogen pijl, woord "Herstel" |

Gebruik:
- Eén accent per scherm. De hoofdknop is inkt op papier (geen kleur), zodat de kleuren hun betekenis houden.
- Juist/fout: kleur **plus** icoon **plus** woord ("Juist", "Nog niet juist"). Nooit alleen rood/groen.
- Een fout antwoord is Krimp-kleur, geen alarm. Toon is rustig, geen schudden of knipperen.
- Grafieken: één reeks in inkt, het aangewezen punt in de fasekleur. Meerdere reeksen onderscheid je met lijnstijl en direct label, niet met kleur alleen.
- Contrast: tekst minstens 4,5:1, grafiekelementen minstens 3:1, in licht én donker.
- Geen verlopen, geen gloed, geen paars-blauw.

## Tussenruimte

Basis 4px. Waarden: 4, 8, 12, 16, 24, 32, 48. Zijmarge op gsm: 16px. Tussen onderdelen 24px, tussen groepen 32–48px. Aanraakdoelen minstens 48×48px, knoppen 56px hoog.

## Vorm

- Hoeken: 6px op knoppen en invoer. Geen volledig ronde "pillen".
- Scheiding met 1px lijn (`Lijn`) en witruimte. Geen schaduwen, geen rijen identieke kaartjes.
- Iconen: eigen eenvoudige SVG-lijnen van 2px, geen emoji.

## Knoppen

Onderaan het scherm, vast in een balk binnen duimbereik, met de veilige zone van de gsm erbij.

| Soort | Uiterlijk | Gebruik |
| --- | --- | --- |
| Hoofd | Inkt als achtergrond, papier als tekst, 56px, volle breedte | Eén per scherm: "Controleer", "Volgende" |
| Tweede | Geen vulling, 1.5px inktrand | "Hint", "Later verder" |
| Tekstlink | Onderstreept, inkt | "Meld een fout", "Bron bekijken" |

Toestanden: ingedrukt = iets lichter/donkerder vlak (geen beweging), uitgeschakeld = zachte inkt met woord waarom, focus = 3px omlijning in Herstel-kleur met 2px afstand. Antwoordopties zijn rijen over de volle breedte met een lijn tussen, geen losse kaartjes.

## Beweging

Kort (150ms), alleen om een verandering te tonen. Respecteert "minder beweging". Geen geluid. **Confetti en feestelijke beweging alleen bij het halen van een level of realiteitstoets.**

## Grafieken (zelf getekend in SVG)

- Lijn voor verloop in de tijd, staaf voor vergelijking, nooit cirkel- of 3D-grafieken tenzij een les het vraagt.
- Maximaal 3 aslabels per as, geen aswaarden herhaald in de titel, geen tikstreepjes.
- De belangrijke punten worden in de grafiek zelf aangeduid met een korte tekst.
- Elke grafiek heeft onder zich: bron en "geldig op" in klein. Dat staat altijd zichtbaar.
- De fase van de cyclus staat als dun gekleurd vlak of band onder de grafiek, met woord erbij.

## Wat we niet doen

Paars-blauwe verlopen, emoji als icoon, kaartjes met schaduw in een rij, gloed, glas-effect, rood/groen als enige betekenis, meldingen die druk zetten, confetti buiten leermijlpalen.
