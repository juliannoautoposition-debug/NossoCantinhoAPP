const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();

async function getRecipientTokens(excludeUid) {
  const snap = await db.collection('users').get();
  const tokens = [];
  snap.forEach((doc) => {
    if (doc.id === excludeUid) return;
    const arr = doc.data().tokens || [];
    for (const token of arr) if (token && !tokens.includes(token)) tokens.push(token);
  });
  return tokens;
}

async function sendToPartner({ excludeUid, title, body, url = './', tag = 'nosso-cantinho' }) {
  const tokens = await getRecipientTokens(excludeUid);
  if (!tokens.length) return;

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: { title, body, url, tag },
    webpush: {
      fcmOptions: { link: url }
    }
  });

  // Remove tokens que já não são válidos.
  const invalid = [];
  response.responses.forEach((r, i) => {
    const code = r.error?.code || '';
    if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) invalid.push(tokens[i]);
  });
  if (invalid.length) {
    const users = await db.collection('users').get();
    const { FieldValue } = require('firebase-admin/firestore');
    for (const user of users.docs) {
      const current = user.data().tokens || [];
      const bad = current.filter(t => invalid.includes(t));
      if (bad.length) await user.ref.update({ tokens: FieldValue.arrayRemove(...bad) });
    }
  }
}

exports.notifyNewMessage = onDocumentCreated('mensagens/{messageId}', async (event) => {
  const data = event.data?.data();
  if (!data?.remetenteId) return;
  const name = data.remetenteNome || 'Seu amor';
  let body = data.texto ? String(data.texto).slice(0, 120) : '';
  if (!body) body = data.mediaType === 'audio' ? 'Enviou um áudio 🎙️' : data.mediaType === 'image' ? 'Enviou uma foto 📸' : 'Enviou uma mensagem ❤️';
  await sendToPartner({ excludeUid: data.remetenteId, title: `${name} 💕`, body, url: './#chat', tag: 'chat' });
});

exports.notifyAppChange = onDocumentUpdated('appData/nossoCantinho', async (event) => {
  const after = event.data?.after?.data();
  const before = event.data?.before?.data();
  if (!after) return;
  const meta = after._meta || {};
  if (!meta.changedAt || meta.changedAt === (before?._meta?.changedAt)) return;
  await sendToPartner({
    excludeUid: meta.actorUid,
    title: `${meta.actorName || 'Seu amor'} atualizou o Cantinho ❤️`,
    body: meta.changeBody || meta.changeType || 'Há uma novidade no Cantinho.',
    url: './',
    tag: `change-${meta.changedKey || 'app'}`
  });
});
