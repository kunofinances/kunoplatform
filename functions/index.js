const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

admin.initializeApp();

// Esta función se ejecutará automáticamente cada 1 hora
exports.scrapingBumeran = functions.pubsub
    .schedule('0 3,15 * * *')
    .timeZone('America/Argentina/Buenos_Aires')
    .onRun(async (context) => {
    const url = 'https://www.bumeran.com.ar/empleos-publicacion-menor-a-5-dias-busqueda-disenador-grafico.html'; 
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const db = admin.firestore();

    const jobs = [];
    
    // Extracción de datos (ajustar selectores si la web de Bumeran cambia su estructura)
    $('.listado-card').each((i, el) => {
        const title = $(el).find('h2').text().trim();
        const company = $(el).find('.empresa').text().trim();
        const path = $(el).find('a').attr('href');
        
        if (title && path) {
            jobs.push({
                title: title,
        company: company || 'Empresa Confidencial',
        source: 'Bumeran',
        category: 'Diseño Gráfico',
        url: 'https://www.bumeran.com.ar' + path,
        createdAt: admin.firestore.Timestamp.now(),
        expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + (5 * 24 * 60 * 60 * 1000))
        )
            });
        }
    });

    // Operación batch para guardar todo junto
    const batch = db.batch();
    
    // Opcional: Borrar avisos antiguos antes de agregar nuevos
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const oldJobsSnapshot = await db.collection('jobs').where('createdAt', '<', fiveDaysAgo).get();
    oldJobsSnapshot.forEach(doc => batch.delete(doc.ref));

    // Agregar los nuevos avisos encontrados
    jobs.forEach(job => {

    const jobId = crypto
        .createHash('md5')
        .update(job.url)
        .digest('hex');

    const ref = db.collection('jobs').doc(jobId);

    batch.set(ref, job, { merge: true });

});

    await batch.commit();
    return null;
});