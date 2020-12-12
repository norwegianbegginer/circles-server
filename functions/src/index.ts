import * as functions from 'firebase-functions';
import * as admin from "firebase-admin";
import { getAvatarUrl } from './utils';
import { IAccount } from './index.d';
import * as moment from "moment";

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ping-82fee.firebaseio.com"
});

const db = admin.firestore();

exports.account = require('./Accounts/index');
exports.room = require('./Rooms/index');

/**
 * Creates account on user creation.
 */
export const initializeAccount = functions.auth.user().onCreate(async (user) => {
    const new_account: Partial<IAccount> = {
        label: user.displayName ?? "Hero",
        avatar_url: user.photoURL ?? getAvatarUrl(user.displayName ?? "Hero"),
        contact: { email: user.email as unknown as string },
        created_at: moment().toDate(),
        friends: [],
        flags: [ "needs_init", "verify_email" ],
    };

    await db.collection("users").doc(user.uid).set(new_account);
});