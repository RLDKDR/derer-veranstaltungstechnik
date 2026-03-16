# Learnings aus dem Projekt Derer Veranstaltungstechnik

Dieses Dokument enthält alle wichtigen Erkenntnisse aus der Entwicklung dieser Website. Es soll bei neuen Kundenprojekten als Referenz dienen, damit dieselben Fehler nicht wiederholt werden.

---

## DSGVO / Datenschutz

### Google Fonts IMMER lokal einbetten
Google Fonts per `<link>` einzubinden überträgt bei jedem Seitenaufruf die IP-Adresse des Nutzers an Google-Server in den USA. Das ist seit dem LG-München-Urteil 2022 abmahnfähig.

**So machen:**
- Fonts als `.woff2` herunterladen und in `/fonts/` ablegen
- `@font-face` Deklarationen im CSS mit `font-display: swap`
- Variable Fonts nutzen (eine Datei für mehrere Gewichte)
- `unicode-range` für latin und latin-ext setzen (spart Bandbreite)
- ALLE HTML-Seiten prüfen — nicht nur index.html, auch Impressum, Datenschutz, AGB

### Externe Libraries/CDNs sind das gleiche Problem wie Google Fonts
Jedes externe Script oder CSS von einem CDN (unpkg, cdnjs, jsdelivr) überträgt IP-Adressen an Drittserver. Betrifft z.B. Smooth-Scroll-Libraries wie Lenis, Animation-Libraries, Icon-Fonts.

**Regel:** Alles was per `<script src="https://...">` oder `<link href="https://...">` geladen wird, muss lokal eingebettet werden. Einfach die Datei herunterladen und lokal referenzieren.

### Cookie-Banner nur wenn nötig
Kein Cookie-Banner nötig wenn:
- Alle Fonts lokal geladen werden
- Kein Google Analytics / Tag Manager
- Kein Facebook Pixel
- Keine eingebetteten Videos (YouTube/Vimeo iFrames)
- Keine Google Maps iFrames
- Keine externen Social-Media-Widgets

Einfache Links zu Social-Media-Profilen (Icons die auf Instagram etc. verlinken) sind KEIN Problem — die übertragen erst Daten wenn der Nutzer aktiv klickt.

### Datenschutz-Checkbox ist Pflicht bei jedem Formular
Jedes Formular das Nutzerdaten erfasst braucht eine Checkbox mit Verweis auf die Datenschutzerklärung. Gilt für:
- Kontaktformulare
- Anfrageformulare
- Inline-Formulare bei Produkten/Paketen
- Quiz/Selbsttests mit Lead-Erfassung

### Honeypot-Spam-Schutz statt reCAPTCHA
Google reCAPTCHA braucht einen Cookie-Banner. Stattdessen ein unsichtbares Honeypot-Feld einbauen: Ein Input-Feld das per CSS versteckt ist (`position: absolute; left: -9999px`). Bots füllen es aus, echte Nutzer nicht. Im JS prüfen und bei ausgefülltem Feld still verwerfen.

---

## SEO

### Checkliste für jedes Projekt
Folgende Punkte von Anfang an einplanen, nicht erst am Ende:

- `<title>` mit Leistung + Stadt + Name (max 60 Zeichen)
- `<meta name="description">` mit Call-to-Action (max 155 Zeichen)
- `<meta name="robots" content="index, follow">`
- `<link rel="canonical">` auf die finale URL
- Open Graph Tags (og:title, og:description, og:image, og:url, og:locale)
- Twitter Card Tags (twitter:card, twitter:title, twitter:description, twitter:image)
- OG-Image: 1200x630px, als JPG, max 300KB
- Schema.org JSON-LD Block (LocalBusiness mit Adresse, Geo, Services, Bewertung)
- `sitemap.xml` mit allen Seiten
- `robots.txt` mit Allow und Sitemap-URL
- Alt-Texte auf ALLEN Bildern (deutsch, beschreibend, mit Keywords)
- Genau 1x `<h1>`, Sections als `<h2>`, Sub-Items als `<h3>`
- `<html lang="de">`

### OG-Image aus bestehendem Bild erstellen
```python
from PIL import Image
img = Image.open('quelldatei.webp')
og = img.resize((1200, 630), Image.LANCZOS)
og.save('images/og-image.jpg', 'JPEG', quality=85, optimize=True)
```

---

## Formulare

### Formular-Backend: Formspree
- Formspree ist der einfachste Weg für statische Websites
- Free-Plan: 5 Formulare, 50 Einreichungen/Monat pro Formular
- Paid (8$/Monat): Unbegrenzte Formulare
- Pro Kunde ein Formular erstellen, Kunden-E-Mail als Empfänger
- Der Kunde braucht keinen eigenen Account

### Formulare immer mit Backend testen
Ein Formular das nur clientseitig eine Erfolgsmeldung zeigt aber keine Daten versendet ist wertlos. IMMER prüfen ob die Daten tatsächlich ankommen. Testanfrage senden und im Postfach prüfen.

---

## Bilder

### WebP-Konvertierung mit Pillow
```python
from PIL import Image
img = Image.open('input.jpg')
img.save('output.webp', 'WEBP', quality=75, method=6)
```
- `quality=75` ist ein guter Kompromiss zwischen Größe und Qualität
- `method=6` ist die langsamste aber beste Kompression
- Zielgrößen: Hero max 300KB, Rest unter 150-200KB

### Lazy Loading
- `loading="lazy"` auf alle Bilder unterhalb des sichtbaren Bereichs
- Hero-Bild NICHT lazy loaden (ist das erste was der Nutzer sieht)

---

## Mobile / Responsive

### Marquee/Auto-Scroll auf Mobile deaktivieren
Wenn Desktop einen Auto-Scroll/Marquee hat (z.B. für Testimonials), muss das auf Mobile manuelles Swipen sein. Wichtig:
- `matchMedia` Check reicht nicht wenn die Seite im Desktop geladen und dann auf Mobile umgeschaltet wird (DevTools)
- Besser: In der Animation-Loop jeden Frame `mql.matches` prüfen
- Mobile: `scroll-snap-type: x mandatory` + `overflow-x: auto`
- Swipe-Dots sofort updaten (kein Debounce/setTimeout), sonst fühlt es sich laggy an

### Grid-Items auf Mobile prüfen
CSS Grid Items mit `grid-column: span 2` aus einem Tablet-Breakpoint können auf Mobile überlaufen wenn der Mobile-Breakpoint sie nicht explizit auf `span 1` zurücksetzt. Immer alle Breakpoints durchprüfen.

---

## Projektstruktur

### Saubere Ordnerstruktur von Anfang an
```
/
├── index.html
├── impressum.html
├── datenschutz.html
├── agb.html
├── 404.html
├── sitemap.xml
├── robots.txt
├── lenis.css          (oder andere lokale Libraries)
├── lenis.min.js
├── /fonts/            (alle .woff2 Dateien)
├── /images/
│   ├── og-image.jpg
│   ├── /referenzen/
│   └── /partners/
└── LEARNINGS.md
```

### 404-Seite nicht vergessen
Eine eigene 404.html im gleichen Design wie die Website. Ohne sieht der Nutzer eine generische Hosting-Fehlerseite.

### Favicon nicht vergessen
favicon.svg (Vektor), favicon-32x32.png, apple-touch-icon.png (180x180). Im `<head>` referenzieren.

---

## Allgemeine Regeln

### Vor dem Go-Live die komplette Checkliste durchgehen
Nicht "wird schon passen" — systematisch jeden Punkt prüfen. Die Go-Live Checkliste (`Website_GoLive_Checkliste.docx.md`) deckt alles ab.

### Externe Abhängigkeiten minimieren
Jede externe Ressource ist ein DSGVO-Risiko und ein Performance-Risiko. Wenn möglich alles lokal: Fonts, Libraries, Icons. Die einzige Ausnahme sollte das Formular-Backend sein (Formspree), weil es keine sinnvolle lokale Alternative gibt.

### Alle HTML-Seiten prüfen, nicht nur index.html
Impressum, Datenschutz, AGB und 404 vergisst man leicht. Wenn index.html lokale Fonts hat aber impressum.html noch Google Fonts lädt, ist die Seite trotzdem nicht DSGVO-konform.
