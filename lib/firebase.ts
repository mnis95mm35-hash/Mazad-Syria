import * as admin from 'firebase-admin';

if (!admin.apps.length) {

admin.initializeApp({ credential:

admin.credential.cert((

projectld: process.env.FIREBA SE_PROJECT_ID,

clientEmail: process.env.FIREB ASE_CLIENT_EMAIL,

privateKey: process.env.FIREB ASE_PRIVATE_KEY?.replace(/\\n/ g, '\n'),

}),

export const messaging = admin.messaging();