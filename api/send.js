// Simple in-memory rate limit: max 5 requests per IP per 10 minutes
const rateMap = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 10 * 60 * 1000;

function isRateLimited(ip) {
    const now = Date.now();
    const entry = rateMap.get(ip);
    if (!entry || now - entry.start > RATE_WINDOW) {
        rateMap.set(ip, { start: now, count: 1 });
        return false;
    }
    entry.count++;
    return entry.count > RATE_LIMIT;
}

// Trim string and cap at maxLen
function clean(val, maxLen = 500) {
    if (typeof val !== 'string') return '';
    return val.trim().slice(0, maxLen);
}

// Strip newlines/control chars from subject to prevent header injection
function cleanSubject(str) {
    return clean(str, 200).replace(/[\r\n\t]/g, ' ');
}

const ALLOWED_ORIGINS = [
    'https://derer-veranstaltungstechnik.vercel.app',
    'https://www.derer-veranstaltungstechnik.de',
    'https://derer-veranstaltungstechnik.de',
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Origin check
    const origin = req.headers.origin || req.headers.referer || '';
    const originAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));
    if (origin && !originAllowed) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Rate limiting
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(ip)) {
        return res.status(429).json({ error: 'Zu viele Anfragen. Bitte versuche es später erneut.' });
    }

    // Body check
    const body = req.body;
    if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Ungültige Anfrage' });
    }

    // Honeypot check
    if (body.website) {
        return res.status(200).json({ ok: true });
    }

    const { formType } = body;

    if (!formType) {
        return res.status(400).json({ error: 'formType fehlt' });
    }

    // Quelle/Seite ermitteln, damit in der Mail klar ist, über welche Seite angefragt wurde
    const seitenMap = { '/': 'Startseite', '/mietpakete': 'Mietpakete-Seite', '/projekte': 'Projekte-Seite' };
    let quelle;
    if (body.seite) {
        const p = clean(body.seite, 100).replace(/\/$/, '') || '/';
        quelle = seitenMap[p] || p;
    } else {
        try { const u = new URL(req.headers.referer || ''); const p = u.pathname.replace(/\/$/, '') || '/'; quelle = seitenMap[p] || (u.host + u.pathname); }
        catch (e) { quelle = 'unbekannt'; }
    }

    let subject = '';
    let htmlBody = '';

    if (formType === 'paket') {
        const paketName = clean(body.paketName, 100);
        const name = clean(body.name);
        const kontakt = clean(body.kontakt);
        const nachricht = clean(body.nachricht, 2000);

        if (!paketName || !name || !kontakt) {
            return res.status(400).json({ error: 'Pflichtfelder fehlen' });
        }

        subject = cleanSubject(`Neue Paketanfrage: ${paketName} — ${quelle}`);

        htmlBody = `
            <h2 style="margin:0 0 16px;">Paketanfrage: ${esc(paketName)}</h2>
            <table style="border-collapse:collapse;width:100%;max-width:600px;">
                ${row('Name', name)}
                ${row('Kontakt', kontakt)}
                ${row('Nachricht', nachricht || '–')}
                ${row('Angefragtes Paket', paketName)}
            </table>
        `;
    } else if (formType === 'individuell') {
        const name = clean(body.name);
        const email = clean(body.email, 254);
        const telefon = clean(body.telefon, 30);
        const eventTyp = clean(body.eventTyp, 100);
        const datum = clean(body.datum, 100);
        const nachricht = clean(body.nachricht, 2000);

        if (!name || !email) {
            return res.status(400).json({ error: 'Pflichtfelder fehlen' });
        }

        subject = cleanSubject('Neue individuelle Anfrage — ' + quelle);

        htmlBody = `
            <h2 style="margin:0 0 16px;">Individuelle Anfrage</h2>
            <table style="border-collapse:collapse;width:100%;max-width:600px;">
                ${row('Name', name)}
                ${row('E-Mail', email)}
                ${row('Telefon', telefon)}
                ${row('Art des Events', eventTyp || '–')}
                ${row('Wunschtermin', datum || '–')}
                ${row('Nachricht', nachricht || '–')}
            </table>
        `;
    } else {
        return res.status(400).json({ error: 'Unbekannter formType' });
    }

    const html = `
        <div style="font-family:Arial,sans-serif;color:#222;max-width:600px;">
            ${htmlBody}
            <hr style="margin:24px 0;border:none;border-top:1px solid #ddd;">
            <p style="font-size:12px;color:#888;">Gesendet über das Kontaktformular &middot; Quelle-Seite: <strong>${esc(quelle)}</strong> &middot; derer-veranstaltungstechnik.de</p>
        </div>
    `;

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Neue Anfrage <anfrage@anfrageseite.io>',
                to: ['roland@anfrageseite.io', 'info@derer-veranstaltungstechnik.de'],
                subject,
                html,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Resend error:', data);
            return res.status(500).json({ error: 'E-Mail konnte nicht gesendet werden' });
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('Send error:', err);
        return res.status(500).json({ error: 'Serverfehler' });
    }
}

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function row(label, value) {
    return `
        <tr>
            <td style="padding:8px 12px 8px 0;font-weight:bold;vertical-align:top;white-space:nowrap;border-bottom:1px solid #eee;">${esc(label)}</td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;">${esc(value)}</td>
        </tr>
    `;
}
