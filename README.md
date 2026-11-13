# Derby Group – Document Control Centre (demo)

A clickable demo of a single platform that tracks staff documents (passports, visas,
Emirates IDs, labour cards, medical insurance) and contracts, with expiry alerts,
role-based access and an audit log.

**All data is fictional.** It is generated in the browser from a fixed seed
(`data.js`), relative to today's date. Nothing is uploaded or stored on a server.

## What to show

1. **Dashboard** – 10,480 employees and 52,400 documents at a glance. Select a tile,
   a chart bar or a chart segment to list the documents behind it.
2. **Employee files** – search by name or employee number, filter by site, document
   type and status. Select a row to open the employee file, then *Upload renewal* to
   see the status change.
3. **Contracts** – switch *Viewing as* to *Contracts team*. Search, filter and open
   an agreement.
4. **Viewing as** – switch roles to show access control. A site manager sees status
   only, for their own site; the contracts team cannot open employee files.
5. **Alerts** – the 90, 60 and 30 day reminders due today, plus escalations.
6. **Audit log** – every view, upload and export made during the demo appears here.

## Run it

It is a static site with no build step. Open `index.html` in a browser, or serve
the folder:

```bash
python3 -m http.server 8000
```

## Host it on GitHub Pages

1. Push these files to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and
   `/ (root)`, then save.
4. After a minute the demo is live at `https://<account>.github.io/<repository>/`.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell |
| `styles.css` | Layout, light and dark themes |
| `data.js` | Fictional sample data generator |
| `app.js` | Views, filters, roles, alerts and audit log |
| `assets/`, `favicon.ico` | Company logo and browser icon |
