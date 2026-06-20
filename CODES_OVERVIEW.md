# 🔑 Codes-Übersicht – FWG Nachhilfebörse v2

Diese Datei erklärt alle Code-Systeme, die in der FWG Nachhilfebörse v2 verwendet werden.

---

## 1. SV-Einmalcodes (Invite Codes)

### Zweck
SV-Einmalcodes ermöglichen die sofortige Verifizierung und Rollenzuweisung bei der Registrierung. Ohne Code wird ein Account als "ausstehend" angelegt und muss manuell freigeschaltet werden.

### Datenbank-Tabelle: `invite_codes`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | uuid | Eindeutige ID |
| `code` | text (UNIQUE) | Der eigentliche Code (z.B. `SV-AB12-CD34-EF56`) |
| `created_by` | uuid → profiles | Welches SV-Mitglied den Code erstellt hat |
| `used_by` | uuid → profiles | Welcher Nutzer den Code eingelöst hat |
| `used_at` | timestamptz | Wann der Code eingelöst wurde |
| `expires_at` | timestamptz | Ablaufdatum (NULL = kein Ablauf) |
| `role` | text | Rolle, die vergeben wird: `'student'`, `'sv_admin'`, `'parent'` |
| `is_used` | boolean | Ob der Code bereits verwendet wurde |
| `created_at` | timestamptz | Erstellungszeitpunkt |

### Code-Format
```
SV-XXXX-XXXX-XXXX
```
Codes werden im Admin-Panel unter **Codes** generiert (Einzel oder als Batch: 5/10/20 Codes auf einmal).

### Einlösung
1. Nutzer gibt Code bei der Registrierung ein
2. Client prüft Code via Supabase (`is_used = false`, `expires_at > now()`)
3. Nach erfolgreicher Registrierung wird `redeem_invite_code(code_val, target_user_id)` aufgerufen
4. Die SQL-Funktion setzt `is_verified = true`, `role = code_record.role` im Profil und markiert den Code als `is_used = true`

### Sicherheit (RLS)
- **Admins**: Vollzugriff (`role = 'sv_admin'`)
- **Öffentlich (SELECT)**: Codes können abgerufen werden, wenn der exakte Code bekannt ist (für Registrierungs-Check)
- **Schreiben**: Nur Admins

### Fehlercodes
| Rückgabewert | Bedeutung |
|--------------|-----------|
| `'invalid'` | Code existiert nicht, ist bereits verwendet oder abgelaufen |
| `'student'` | Erfolgreich – Rolle Student vergeben |
| `'sv_admin'` | Erfolgreich – Rolle SV-Admin vergeben |
| `'parent'` | Erfolgreich – Rolle Elternteil vergeben |

---

## 2. Aktionscode "BANANE" (Promo-Code / Easter Egg)

### Zweck
Der Aktionscode `BANANE` ist ein verstecktes Easter Egg, das eine neu erstellte Anzeige für **14 Tage** nach oben boostet und im Feed visuell hervorhebt.

### Funktionsweise
1. Im letzten Schritt der Anzeigenerstellung (Schritt 5 – Vorschau) erscheint ein optionales Feld „Aktionscode"
2. Gibt der Nutzer `BANANE` (Groß-/Kleinschreibung egal) ein und veröffentlicht die Anzeige, werden folgende Felder in der `ads`-Tabelle gesetzt:
   - `boosted = true`
   - `boosted_until = NOW() + 14 Tage`
   - `promo_code_used = 'BANANE'`

### Datenbank-Spalten in `ads`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `boosted` | boolean | Ist die Anzeige geboostet? |
| `boosted_until` | timestamptz | Bis wann ist die Anzeige geboostet? |
| `promo_code_used` | text | Welcher Promo-Code wurde verwendet? |

### Visuelle Darstellung im Feed
- Goldener Glow-Effekt (CSS-Klasse `.boosted-glow`)
- Goldene Ring-Umrandung (`ring-1 ring-yellow-400/60`)
- Bananen-Banner: „🍌 Empfohlene Anzeige"
- Goldene Hervorhebung des Preises
- Sortierung: Gebooste Anzeigen erscheinen immer ganz oben im Feed

### Prüfung
```typescript
const isAdBoosted = (ad: any) => {
    return ad.boosted && ad.boosted_until && new Date(ad.boosted_until) > new Date();
};
```

---

## 3. Eltern-Verknüpfungscode (Parent Link Code)

### Zweck
Der Eltern-Verknüpfungscode ermöglicht es Eltern, sich mit dem Konto ihres Kindes zu verknüpfen, um dessen Aktivitäten (Anzeigen, Anfragen, Bewertungen) einzusehen.

### Code-Generierung
Der Code wird automatisch aus den ersten **6 Zeichen der Profil-UUID** des Kindes generiert (in Großbuchstaben):
```typescript
const linkCode = user.id.slice(0, 6).toUpperCase();
// Beispiel: "A1B2C3"
```

Dieser Code wird im **Einstellungen**-Bereich des Kindes angezeigt (`/einstellungen` → Abschnitt "Elternverknüpfung").

### Verknüpfungsprozess
1. **Kind** gibt seinen Code in den Einstellungen frei und teilt ihn mit dem Elternteil
2. **Elternteil** gibt den Code im Eltern-Dashboard (`/eltern-dashboard`) ein
3. Das System sucht via `.ilike('id', '${upperCode}%')` nach einem Profil mit passender UUID
4. Ein Eintrag in der `parent_links`-Tabelle wird erstellt (`status = 'active'`)

### Datenbank-Tabelle: `parent_links`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | uuid | Eindeutige ID |
| `parent_id` | uuid → profiles | Eltern-Profil |
| `child_id` | uuid → profiles | Kind-Profil |
| `status` | text | `'pending'`, `'active'`, `'revoked'` |
| `permissions` | jsonb | Berechtigungen (s.u.) |
| `created_at` | timestamptz | Erstellungszeitpunkt |
| `linked_at` | timestamptz | Zeitpunkt der Bestätigung |

### Permissions-Objekt (Standard)
```json
{
  "can_view_ads": true,
  "can_view_ratings": true,
  "can_view_activity": true,
  "can_receive_notifications": true
}
```

### Sicherheit (RLS)
- Eltern können nur ihre eigenen Verlinkungen sehen und verwalten
- Kinder können die Verlinkung widerrufen (Status auf `'revoked'` setzen)
- Admins haben Vollzugriff

### Verknüpfung aufheben
- **Kind**: Via `/einstellungen` → "Elternzugriff widerrufen"
- **Elternteil**: Via `/eltern-dashboard` → "Verknüpfung aufheben"

---

## Zusammenfassung

| Code-Typ | Format | Gültigkeitsdauer | Erstellt von |
|----------|--------|-----------------|-------------|
| SV-Einmalcode | `SV-XXXX-XXXX-XXXX` | Konfigurierbar | SV-Admins |
| Aktionscode BANANE | `BANANE` | 14 Tage (Boost) | Fest codiert (Easter Egg) |
| Eltern-Verknüpfungscode | 6-stellig (UUID-Prefix) | Dauerhaft | Automatisch aus Profil-UUID |
