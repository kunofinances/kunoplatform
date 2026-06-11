const { chromium } = require('playwright');
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
(async () => {
    const browser = await chromium.launch({
        headless: false
    });

    const page = await browser.newPage();

    await page.goto(
        'https://www.bumeran.com.ar/empleos-publicacion-menor-a-5-dias-busqueda-disenador-grafico.html',
        { waitUntil: 'networkidle' }
    );

    await page.waitForTimeout(10000);

    const jobs = await page.$$eval(
  'a[href*="/empleos/"]',
  links => links.map(link => {
    const h3s = Array.from(
      link.querySelectorAll('h3')
    ).map(h => h.innerText.trim());

    return {
      title: link.querySelector('h2')?.innerText?.trim() || '',
      published: h3s[0] || '',
      company: h3s[1] || '',
      location: h3s.find(x => x.includes('Buenos Aires')) || '',
      modality: h3s.find(x =>
        ['Presencial', 'Híbrido', 'Remoto'].includes(x)
      ) || '',
      url: link.href,
      source: 'Bumeran'
    };
  })
);

for (const job of jobs) {

  const docId = Buffer
    .from(job.url)
    .toString('base64')
    .replace(/\//g, '_');

  await db.collection('jobs')
    .doc(docId)
    .set({
      ...job,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

  console.log(`Guardado: ${job.title}`);
}

    await browser.close();
})();