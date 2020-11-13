import * as functions from 'firebase-functions';
import * as admin from "firebase-admin";
import { makeResponse, validateEmail, getAvatarUrl } from './utils';
import { getAccountById, getAccounts, getAccountByEmail, verifyAccountToken, getAccountsByIds } from './Accounts/utils';
import { getRooms, getRoomById, getAccountRooms } from './Rooms/utils';
import { IAccount } from './index.d';

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ping-82fee.firebaseio.com"
});

const db = admin.firestore();

// TODO: Move functions to separate files. (eg. src/Accounts/index.ts, etc.)


//// * Accounts

/**
 * @description Create a new account. 
 * @version 1.0.0
 * @example /accountCreate?email=[EMAIL-ADDRESS]&password=[PASSWORD]
 */
export const accountCreate = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>)  => {
    const { email, password, label } = request.query as { email: string, password: string, label?: string };

    if( !email ) {
        response.json(makeResponse(404, null, "Email not provided"));
        return;
    }
    if( !password ) {
        response.json(makeResponse(404, null, "Password not provided"));   
        return;
    }
    
    if( password.length < 12 ) {
        response.json(makeResponse(404, null, "Password didn't meet requirements."));
        return;
    }
    
    if(!validateEmail(email)) {
        response.json(makeResponse(404, null, "Email is not valid."));
        return;
    }

    const accounts = await getAccounts();
    if(!!accounts.find(account => account.email !== undefined && account.email === email)) {
        response.json(makeResponse(404, null, "Account with this email already exists."));
        return;
    }

    const new_account = {
        email,
        label: label ?? "Hero",
        created_at: new Date(),
        flags: [ "needs_init" ],
    };

    const { id: account_id } = await db.collection("users").add(new_account);

    response.json(makeResponse(200, { account_id }));
});

/**
 * @description Edit an account.
 * @version 1.0.0
 * @argument {string} account_id
 * @argument {Partial<IAccount>} changes
 * @example /accountChange?account_id=[ACCOUNT_ID]&changes={"name": "Mike", "surname": "Eling", "avatar_url": "https://google.com/", "label": "DRFR0ST"}
 */
export const accountChange = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>)  => {
    const { account_id, changes } = request.query as { account_id: string, changes: Partial<IAccount> };

    if( !account_id ) {
        response.json(makeResponse(404, null, "Account id not provided."));   
        return;
    }
    
    if( !changes ) {
        response.json(makeResponse(404, null, "Changes do not provided."));   
        return;
    }
    
    let parsedChanges = {};

    // TODO: Fix types // Mike
    try {
        // @ts-ignore
        parsedChanges = {...JSON.parse(changes)};
    } catch(err) {
        response.json(makeResponse(500, null, err.message));   
        return;
    }
    
    if(Object.keys(parsedChanges).length <= 0) {
        response.json(makeResponse(404, null, "No changes provided."));   
        return;
    }
    
    const account = await getAccountById(account_id);
    
    if(!account) {
        response.json(makeResponse(404, null, "Account not found."));   
        return;
    }

    // @ts-ignore
    delete account.id;

    if(account?.flags?.includes("needs_init"))
        account.flags.splice(account.flags.indexOf("needs_init"), 1);

    db.collection("users").doc(account_id).set({...account, ...parsedChanges}).then(() => {
        response.json(makeResponse(204));
    })
    .catch(err => {
        response.json(makeResponse(500, null, err.message))
    });

});

/**
 * @description Get account info by id.
 * @argument {string} account_id  
 * @version 1.0.0
 * @example /accountInfo?account_id=[ACCOUNT_ID]
 */
export const accountInfo = functions.https.onRequest(async (request, response)  => {
    const { account_id, rooms, flags, contacts } = request.query as { account_id: string, rooms?: boolean, flags?: boolean, contacts?: boolean };
    
    if(!account_id) {
        response.json(makeResponse(400, undefined, "Account id not provided."))
        return;
    }
    
    const account = await getAccountById(account_id);
    
    if(!account) {
        response.json(makeResponse(404, undefined, "Account not found."))
        return;
    }

    if((!!rooms) === true)
        account.rooms = await getAccountRooms(account_id);

    if((!!flags) !== true)
        delete account.flags;

    if((!!contacts) !== true)
        delete account.contacts;
    
    response.json(makeResponse(200, { ...account }));
});

/**
 * @description Authorize account with token.
 * @argument {string} token
 * @version 1.0.0
 * @example /accountLogin?token=[ACCOUNT_ID]
 */
export const accountLogin = functions.https.onRequest(async (request, response)  => {
    const { token } = request.query as { token: string };

    if(!token) {
        response.json(makeResponse(400, undefined, "Token not provided."))
        return;
    }
    
    const account_id = await verifyAccountToken(token);
    
    if(typeof account_id !== "string") {
        response.json(makeResponse(404, undefined, "Token expired."))
        return;
    }
    
    response.json(makeResponse(200, { account_id }));
});

/**
 * @description Get personalized suggestions for account.
 * @argument {string} account_id
 * @version 1.0.0
 * @example /accountGetSuggestions?account_id=[ACCOUNT_ID]
 */
export const accountGetSuggestions = functions.https.onRequest(async (request, response) => {
    const { account_id } = request.query as { account_id: string };

    if (!account_id) {
        response.json(makeResponse(404, null, "Account id not provided."));
        return;
    }

    const account = await getAccountById(account_id);

    const suggestions: TSuggestion[] = [];

    const getSuggestions = async () => {
        if (!account || !Array.isArray(account.contacts)) return;

        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < account.contacts.length; i++) {
            const last_contacted = account.contacts[i].last_contacted;
            const contact = await getAccountById(account.contacts[i].account_id);

            if (!contact) return;

            if (last_contacted) {
                const diffDays = moment().diff(moment(last_contacted), "days");

                if (diffDays > 4) {
                    suggestions.push({
                        type: "long-not-messaged",
                        payload: { account_id: contact.id }
                    })
                }
            } else {
                suggestions.push({
                    type: "never-messaged",
                    payload: { account_id: contact.id }
                })
            }
        }
    }
    await getSuggestions();

    response.json(makeResponse(200, suggestions));
});

/**
 * @description Find account by email or label.
 * @argument {string} email  
 * @argument {string} label  
 * @version 1.0.0
 * @example /accountFind?email=[EMAIL-ADDRESS]
 */
export const accountFind = functions.https.onRequest(async (request, response)  => {
    const { email, label } = request.query as { email?: string, label?: string };

    if(!email && !label) {
        response.json(makeResponse(400, undefined, "No query provided."))
        return;
    }
    
    const account = await getAccountByEmail(email as string);
    
    if(!account) {
        response.json(makeResponse(404, undefined, "Account not found."))
        return;
    }
    
    response.json(makeResponse(200, { ...account }));
});

/**
 * @description Get list of all accounts.
 * @argument {number} volume 
 * @version 1.0.0
 * @example /accountList?volume=5
 */
export const accountList = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>)  => {
    const { volume } = request.query as { volume?: number };
    
    const accounts = await getAccounts();

    if(volume && accounts.length > volume)
        accounts.length = volume;

    response.json(makeResponse(200, accounts));
});

//// * Rooms

/**
 * @description Get list of all rooms.
 * @argument {number} volume 
 * @version 1.0.0
 * @example /roomList?volume=5
 */
export const roomList = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>)  => {
    const { volume } = request.query as { volume?: number };
    
    const rooms = await getRooms();

    if(volume && rooms.length > volume)
        rooms.length = volume;

    response.json(makeResponse(200, rooms));
});

/**
 * @description Get room info by id.
 * @argument {string} room_id 
 * @version 1.0.0
 * @example /roomInfo?room_id=[ROOM_ID]
 */
export const roomInfo = functions.https.onRequest(async (request, response)  => {
    const { room_id, accounts } = request.query as { room_id: string, accounts?: boolean };

    if(!room_id) {
        response.json(makeResponse(400, undefined, "Room id not provided."))
        return;
    }
    
    const room = await getRoomById(room_id);
    
    if(!room) {
        response.json(makeResponse(404, undefined, "Room not found."))
        return;
    }

    if((!!accounts) == true)
        room.accounts = await getAccountsByIds(room.access);
    
    response.json(makeResponse(200, { ...room }));
});

/**
 * @description Check if account has access to a room.
 * @argument {string} account_id
 * @argument {string} room_id 
 * @version 1.0.0-beta.1
 * @example /checkRoomAccess?account_id=[ACCOUNT_ID]?room_id=[ROOM_ID]
 */
export const checkRoomAccess = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>)  => {
    const { account_id, room_id } = request.query as { account_id: string, room_id: string };

    // TODO: Wrap functions with classes for better query parsing.
    if(!account_id) {
        response.json(makeResponse(400, undefined, "Account id not provided."))
        return;
    }

    if(!room_id) {
        response.json(makeResponse(400, undefined, "Room id not provided."))
        return;
    }

    const room = await getRoomById(room_id);

    if(!room) {
        response.json(makeResponse(404, undefined, "Room not found."))
        return;
    }

    const hasAccess = !!room.access.includes(account_id);

    response.json(makeResponse(200, { hasAccess }));
});

/**
 * Creates account on user creation.
 */
export const initializeAccount = functions.auth.user().onCreate(async (user) => {
    const new_account: Partial<IAccount> = {
        label: user.displayName ?? "Hero",
        avatar_url: user.photoURL ?? getAvatarUrl(user.displayName ?? "Hero"),
        email: user.email,
        created_at: new Date(),
        contacts: [],
        flags: [ "needs_init", "verify_email" ],
    };

    await db.collection("users").doc(user.uid).set(new_account);
});