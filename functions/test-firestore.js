const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function test() {
  await db.collection('jobs').add({
    title: 'Prueba',
    company: 'KunoJobs',
    createdAt: new Date()
  });

  console.log('Guardado correctamente');
}

test().catch(console.error);