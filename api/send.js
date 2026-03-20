export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body;

    // Honeypot check
    if (body.website) {
        return res.status(200).json({ ok: true });
    }

    const { formType } = body;

    if (!formType) {
        return res.status(400).json({ error: 'formType fehlt' });
    }

    let subject = '';
    let htmlBody = '';

    if (formType === 'paket') {
        const { paketName, name, kontakt, nachricht } = body;

        if (!paketName || !name || !kontakt) {
            return res.status(400).json({ error: 'Pflichtfelder fehlen' });
        }

        subject = `Neue Anfrage: ${paketName}`;

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
        const { eventTyp, gaeste, equipment, name, email, telefon } = body;

        if (!name || !email || !telefon) {
            return res.status(400).json({ error: 'Pflichtfelder fehlen' });
        }

        subject = 'Neue individuelle Anfrage';

        const equipmentStr = Array.isArray(equipment) && equipment.length > 0
            ? equipment.join(', ')
            : '–';

        htmlBody = `
            <h2 style="margin:0 0 16px;">Individuelle Anfrage</h2>
            <table style="border-collapse:collapse;width:100%;max-width:600px;">
                ${row('Name', name)}
                ${row('E-Mail', email)}
                ${row('Telefon', telefon)}
                ${row('Art des Events', eventTyp || '–')}
                ${row('Gästeanzahl', gaeste || '–')}
                ${row('Gewünschte Leistungen', equipmentStr)}
            </table>
        `;
    } else {
        return res.status(400).json({ error: 'Unbekannter formType' });
    }

    const html = `
        <div style="font-family:Arial,sans-serif;color:#222;max-width:600px;">
            ${htmlBody}
            <hr style="margin:24px 0;border:none;border-top:1px solid #ddd;">
            <p style="font-size:12px;color:#888;">Diese Nachricht wurde über das Kontaktformular auf derer-veranstaltungstechnik.de gesendet.</p>
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
                from: 'onboarding@resend.dev',
                to: 'roland@anfrageseite.io',
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
