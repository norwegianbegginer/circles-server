import * as functions from 'firebase-functions';
import * as admin from "firebase-admin";
import { makeResponse, validateEmail } from './utils';
import { getAccountById, getAccounts } from './Accounts/utils';
import { getRooms, getRoomById, getAccountRooms } from './Rooms/utils';
import { IAccount } from './index.d';

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ping-82fee.firebaseio.com"
});

const db = admin.firestore();

// TODO: Move functions to separate files. (eg. src/Accounts/index.ts, etc.)



//// * User

/**
 * @description Prepare user for authentication. 
 * @version 1.0.0-alpha.1
 * WIP!
 */
export const userLogin = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>)  => {
    const { token } = request.query as { token: string };
    
    // TODO: Understand and implement... 
    const decodedToken = await admin.auth().verifyIdToken(token)

    if(!decodedToken) {
        response.json(makeResponse(404, null, "Invalid token."));
        return;
    }

    response.json(makeResponse(200, { uid: decodedToken.uid }));
});

//// * Accounts

/**
 * @description Create a new account. 
 * @version 1.0.0
 * @example /accountCreate?email=cool@email.com&password=coolpassword
 */
export const accountCreate = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>)  => {
    const { email, password } = request.query as { email: string, password: string };

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
    if(accounts.find(account => account.email === email)) {
        response.json(makeResponse(404, null, "Account with this email already exists."));
        return;
    }

    const new_account = {
        email,
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
 * @example /accountChange?account_id=n3AOwQTERDBXCnEffInV&changes={"name": "Mike", "surname": "Eling", "avatar_url": "https://google.com/", "label": "DRFR0ST"}
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
 * @example /accountInfo?account_id=jakiesId
 */
export const accountInfo = functions.https.onRequest(async (request, response)  => {
    const { account_id, rooms, flags } = request.query as { account_id: string, rooms?: boolean, flags?: boolean };

    if(!account_id) {
        response.json(makeResponse(400, undefined, "Account id not provided."))
        return;
    }
    
    const account = await getAccountById(account_id);
    
    if(!account) {
        response.json(makeResponse(404, undefined, "Account not found."))
        return;
    }

    if(rooms == true)
        account.rooms = await getAccountRooms(account_id);

    if(flags != true)
        delete account.flags;
    
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
 * @example /roomInfo?room_id=idroom
 */
export const roomInfo = functions.https.onRequest(async (request, response)  => {
    const { room_id } = request.query as { room_id: string };

    if(!room_id) {
        response.json(makeResponse(400, undefined, "Room id not provided."))
        return;
    }
    
    const room = await getRoomById(room_id);
    
    if(!room) {
        response.json(makeResponse(404, undefined, "Room not found."))
        return;
    }
    
    response.json(makeResponse(200, { ...room }));
});

/**
 * @description Check if account has access to a room.
 * @argument {string} account_id
 * @argument {string} room_id 
 * @version 1.0.0-beta.1
 * @example /checkRoomAccess?account_id=jakiesid?room_id=jakiesid
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