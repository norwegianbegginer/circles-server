import * as functions from 'firebase-functions';
import * as admin from "firebase-admin";
import { ensureArray, makeResponse, validateEmail } from '../utils';
import { getAccountById, getAccounts, getAccountByEmail, verifyAccountToken } from './utils';
import { getAccountRooms } from '../Rooms/utils';
import { IAccount, IFriend, TFriendInvite, TSuggestion } from '../index.d';
import * as moment from "moment";
import * as cors from 'cors';
import { v4 as uuid } from 'uuid';

const corsHandler = cors({ origin: true });
const db = admin.firestore();

/**
 * @description Create a new account. 
 * @argument email
 * @argument password
 * @argument label
 * @version 1.0.0
 * @example /account-accountCreate?email=[EMAIL-ADDRESS]&password=[PASSWORD]
 */
export const accountCreate = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    corsHandler(request, response, async () => {
        const { email, password, label } = request.query as { email: string, password: string, label?: string };
    
        if (!email) {
            response.json(makeResponse(400, null, "Email not provided"));
            return;
        }
        if (!password) {
            response.json(makeResponse(400, null, "Password not provided"));
            return;
        }
    
        if (password.length < 12) {
            response.json(makeResponse(400, null, "Password didn't meet requirements."));
            return;
        }
    
        if (!validateEmail(email)) {
            response.json(makeResponse(400, null, "Email is not valid."));
            return;
        }
    
        const accounts = await getAccounts();
        if (!!accounts.find(account => account.contact.email !== undefined && account.contact.email === email)) {
            response.json(makeResponse(409, null, "Account with this email already exists."));
            return;
        }
    
        const new_account = {
            label: label ?? "Unknown",
            created_at: moment().toDate(),
            flags: ["needs_init"],
            contact: {
                email
            }
        };
    
        const { id: account_id } = await db.collection("users").add(new_account);
    
        response.json(makeResponse(200, { account_id }));
    });
});

/**
 * @description Edit an account.
 * @version 1.0.0
 * @argument {string} account_id
 * @argument {Partial<IAccount>} changes
 * @example /account-accountChange?account_id=[ACCOUNT_ID]&changes={"avatar_url": "https://google.com/", "label": "DRFR0ST", "details": { "first_name": "Mike" }}
 */
export const accountChange = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    corsHandler(request, response, async () => {

        const { account_id, changes } = request.query as { account_id: string, changes: Partial<IAccount> };
    
        if (!account_id) {
            response.json(makeResponse(404, null, "Account id not provided."));
            return;
        }
    
        if (!changes) {
            response.json(makeResponse(404, null, "Changes do not provided."));
            return;
        }
    
        let parsedChanges = {};
    
        // TODO: Fix types // Mike
        try {
            // @ts-ignore
            parsedChanges = { ...JSON.parse(changes) };
        } catch (err) {
            response.json(makeResponse(500, null, err.message));
            return;
        }
    
        if (Object.keys(parsedChanges).length <= 0) {
            response.json(makeResponse(404, null, "No changes provided."));
            return;
        }
    
        const account = await getAccountById(account_id);
    
        if (!account) {
            response.json(makeResponse(404, null, "Account not found."));
            return;
        }
    
        // @ts-ignore
        delete account.id;
        // @ts-ignore
        delete parsedChanges?.contact;
        // @ts-ignore
        delete parsedChanges?.rooms;
        // @ts-ignore
        delete parsedChanges?.invites;
        // @ts-ignore
        delete parsedChanges?.storage;
    
        if (account?.flags?.includes("needs_init"))
            account.flags.splice(account.flags.indexOf("needs_init"), 1);
    
        db.collection("users").doc(account_id).set({ ...account, ...parsedChanges }).then(() => {
            response.json(makeResponse(204));
        })
            .catch(err => {
                response.json(makeResponse(500, null, err.message))
            });
    });
});

/**
 * @description Get account info by id.
 * @argument {string} account_id (required)
 * @argument {boolean} rooms (optional / false)
 * @argument {boolean} flags (optional / false)
 * @argument {boolean} friends (optional / false)
 * @version 2.0.0
 * @example /account-accountInfo?account_id=[ACCOUNT_ID]
 */
export const accountInfo = functions.https.onRequest(async (request, response) => {
    corsHandler(request, response, async () => {

        const { account_id, rooms, flags, friends, invites } = request.query as { account_id: string, rooms?: boolean, flags?: boolean, friends?: boolean, invites?: boolean };
    
        if (!account_id) {
            response.json(makeResponse(400, undefined, "Account id not provided."))
            return;
        }
    
        const account = await getAccountById(account_id);
    
        if (!account) {
            response.json(makeResponse(409, undefined, "Account not found."))
            return;
        }
    
        if ((!!rooms) === true)
            account.rooms = await getAccountRooms(account_id);
    
        if ((!!flags) !== true)
            delete account.flags;
    
        if ((!!friends) !== true)
            delete account.friends;

        if ((!!invites) !== true)
            delete account.invites;

        // Storage can be gathered only by dedicated functions.
        if (account.storage)
            delete account.storage;

        response.json(makeResponse(200, { ...account }));
    });
});

/**
 * @description Authorize account with token.
 * @argument {string} token
 * @version 1.0.0
 * @example /account-accountLogin?token=[ACCOUNT_ID]
 */
export const accountLogin = functions.https.onRequest(async (request, response) => {
    corsHandler(request, response, async () => { 
        const { token } = request.query as { token: string };
    
        if (!token) {
            response.json(makeResponse(400, undefined, "Token not provided."))
            return;
        }
    
        const account_id = await verifyAccountToken(token);
    
        if (typeof account_id !== "string") {
            response.json(makeResponse(404, undefined, "Token expired."))
            return;
        }
    
        response.json(makeResponse(200, { account_id }));
    });
});

/**
 * @description Get personalized suggestions for account.
 * @argument {string} account_id
 * @version 1.0.1
 * @example /account-accountGetSuggestions?account_id=[ACCOUNT_ID]
 */
export const accountGetSuggestions = functions.https.onRequest(async (request, response) => {
    corsHandler(request, response, async () => {

        const { account_id } = request.query as { account_id: string };
    
        if (!account_id) {
            response.json(makeResponse(404, null, "Account id not provided."));
            return;
        }
    
        const account = await getAccountById(account_id);
    
        const suggestions: TSuggestion[] = [];
    
        const getSuggestions = async () => {
            if (!account || !Array.isArray(account.friends)) return;
    
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < account.friends.length; i++) {
                const last_contacted = account.friends[i].last_contacted;
                const friend = await getAccountById(account.friends[i].account_id);
    
                if (!friend) return;
    
                if (last_contacted) {
                    const diffDays = moment().diff(moment(last_contacted), "days");
    
                    if (diffDays > 4) {
                        suggestions.push({
                            type: "long-not-messaged",
                            payload: { account_id: friend.id }
                        })
                    }
                } else {
                    suggestions.push({
                        type: "never-messaged",
                        payload: { account_id: friend.id }
                    })
                }
            }
        }
        await getSuggestions();
    
        response.json(makeResponse(200, suggestions));
    });
});

/**
 * @description Find account by email or label.
 * @argument {string} email  
 * @argument {string} label  
 * @version 1.0.0
 * @example /account-accountFind?email=[EMAIL-ADDRESS]
 */
export const accountFind = functions.https.onRequest(async (request, response) => {
    corsHandler(request, response, async () => {
        const { email, label } = request.query as { email?: string, label?: string };
    
        if (!email && !label) {
            response.json(makeResponse(400, undefined, "No query provided."))
            return;
        }
    
        const account = await getAccountByEmail(email as string);
    
        if (!account) {
            response.json(makeResponse(404, undefined, "Account not found."))
            return;
        }
    
        response.json(makeResponse(200, { ...account }));
    });
});

/**
 * @description Update a contact.
 * @version 2.0.0
 * @argument {string} account_id
 * @argument {string} friend_id
 * @argument {Partial<IFriend>} changes
 * @example /account-accountUpdateContact?account_id=[ACCOUNT_ID]&friend_id=[CONTACT_ACCOUNT_ID]&changes={last_contacted: [DATE], favorite: true}
 */
export const accountUpdateContact = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    corsHandler(request, response, async () => {
        const { account_id, friend_id, changes } = request.query as { account_id: string, friend_id: string, changes: Partial<IFriend> };
    
        if (!account_id) {
            response.json(makeResponse(404, null, "Account id not provided."));
            return;
        }
    
        if (!friend_id) {
            response.json(makeResponse(404, null, "Friend id not provided."));
            return;
        }
    
        if (!changes) {
            response.json(makeResponse(404, null, "Changes do not provided."));
            return;
        }
    
        let parsedChanges: Partial<IFriend> = {};
    
        // TODO: Fix types // Mike
        try {
            // @ts-ignore
            parsedChanges = { ...JSON.parse(changes) };
        } catch (err) {
            response.json(makeResponse(500, null, err.message));
            return;
        }
    
        if (Object.keys(parsedChanges).length <= 0) {
            response.json(makeResponse(404, null, "No changes provided."));
            return;
        }
    
        if (parsedChanges.last_contacted !== undefined && !moment(parsedChanges.last_contacted).isValid()) {
            response.json(makeResponse(404, null, "Last contacted date is invalid."));
            return;
        }
    
        const account = await getAccountById(account_id);
    
        if (!account) {
            response.json(makeResponse(404, null, "Account not found."));
            return;
        }
    
        if (!account.friends || account.friends.length === 0) {
            response.json(makeResponse(404, null, "Got no friends yet."));
            return;
        }
    
        const friends = (account?.friends ?? []).map((_contact: IFriend) => {
            if (_contact.account_id === friend_id) {
                return {
                    ..._contact,
                    favorite: parsedChanges?.favorite ?? _contact.favorite,
                    last_contacted: parsedChanges?.last_contacted ?? _contact.last_contacted
                }
            }
            return _contact;
        });
    
        // @ts-ignore
        delete account.id;
    
        db.collection("users").doc(account_id).set({ ...account, friends }).then(() => {
            response.json(makeResponse(204));
        })
            .catch(err => {
                response.json(makeResponse(500, null, err.message))
            });
    });
});

/**
 * @description Add a contact.
 * @version 2.0.0
 * @argument {string} account_id
 * @argument {string} friend_id
 * @example /account-accountAddContact?account_id=[ACCOUNT_ID]&friend_id=[CONTACT_ACCOUNT_ID]
 */
export const accountAddContact = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    corsHandler(request, response, async () => {
        const { friend_id, account_id } = request.query as { account_id: string, friend_id: string };
    
        if (!account_id) {
            response.json(makeResponse(404, null, "Account id not provided."));
            return;
        }
    
        if (!friend_id) {
            response.json(makeResponse(404, null, "Friend id not provided."));
            return;
        }
    
        const account = await getAccountById(account_id);
    
        if (!account) {
            response.json(makeResponse(404, null, "Account not found."));
            return;
        }
    
        const friends: IFriend[] = [...(account.friends ?? [])]
    
        if (friends.find(contact => contact?.account_id === friend_id)) {
            response.json(makeResponse(404, null, "Friend already added."));
            return;
        }
    
        friends.push({
            account_id: friend_id,
            favorite: false
        })
    
        // @ts-ignore
        delete account.id;
    
        db.collection("users").doc(account_id).set({ ...account, friends }).then(() => {
            response.json(makeResponse(204));
        })
            .catch(err => {
                response.json(makeResponse(500, null, err.message))
            });
    });

});

/**
 * @description Delete a contact.
 * @version 2.0.0
 * @argument {string} account_id
 * @argument {string} friend_id
 * @example /account-accountDeleteContact?account_id=[ACCOUNT_ID]&friend_id=[FRIEND_ACCOUNT_ID]
 */
export const accountDeleteContact = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    corsHandler(request, response, async () => {
        const { friend_id, account_id } = request.query as { account_id: string, friend_id: string };
    
        if (!account_id) {
            response.json(makeResponse(404, null, "Account id not provided."));
            return;
        }
    
        if (!friend_id) {
            response.json(makeResponse(404, null, "Contact id not provided."));
            return;
        }
    
        const account = await getAccountById(account_id);
    
        if (!account) {
            response.json(makeResponse(404, null, "Account not found."));
            return;
        }
    
    
        if ((account.friends ?? []).find(contact => contact?.account_id !== friend_id)) {
            response.json(makeResponse(404, null, "Contact not found."));
            return;
        }
    
        const friends: IFriend[] = [...(account.friends ?? [])].filter(contact => contact.account_id !== friend_id);
    
        // @ts-ignore
        delete account.id;
    
        db.collection("users").doc(account_id).set({ ...account, friends }).then(() => {
            response.json(makeResponse(204));
        })
            .catch(err => {
                response.json(makeResponse(500, null, err.message))
            });
    });

});

/**
 * @description Get list of all accounts.
 * @argument {number} volume 
 * @version 1.0.0
 * @example /account-accountList?volume=5
 */
export const accountList = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    corsHandler(request, response, async () => {
        const { volume } = request.query as { volume?: number };
    
        const accounts = await getAccounts();
    
        if (volume && accounts.length > volume)
            accounts.length = volume;
    
        response.json(makeResponse(200, accounts));
    });
});

/**
 * @description Invite a friend.
 * @version 1.0.0
 * @argument {string} account_id
 * @argument {string} friend_id
 * @example /account-accountInviteFriend?account_id=[ACCOUNT_ID]&friend_id=[FRIEND_ACCOUNT_ID]
 */
export const accountInviteFriend = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    corsHandler(request, response, async () => {
        const { friend_id, account_id } = request.query as { account_id: string, friend_id: string };

        if (!account_id) {
            response.json(makeResponse(404, null, "Account id not provided."));
            return;
        }

        if (!friend_id) {
            response.json(makeResponse(404, null, "Friend id not provided."));
            return;
        }

        const account = await getAccountById(account_id);

        if (!account) {
            response.json(makeResponse(404, null, "Account not found."));
            return;
        }

        const friend_ref: IFriend | undefined = [...(account.friends ?? [])].find(contact => contact?.account_id === friend_id);
        if (friend_ref) {
            response.json(makeResponse(404, null, "Friend already added."));
            return;
        }

        const friend = await getAccountById(friend_id);

        if (!friend) {
            response.json(makeResponse(404, null, "Friend account not found."));
            return;
        }

        const selfInvites = ensureArray(account.invites)
        const friendInvites = ensureArray(account.invites)

        const invite = {
            id: uuid(),
            account_id: friend_id,
            created_at: new Date()
        }

        selfInvites.push({
            ...invite,
            status: "waiting"
        })
        friendInvites.push({
            ...invite,
            status: "pending"
        })

        // @ts-ignore
        delete account.id;

        try {
            await db.collection("users").doc(account_id).set({ ...account, invites: selfInvites });
            await db.collection("users").doc(friend_id).set({ ...friend, invites: friendInvites });
            response.json(makeResponse(200, { invite_id: invite.id }));
        } catch (err) {
            response.json(makeResponse(500, null, err.message));
        }
    });

});

/**
 * @description Answer a friend invite.
 * @version 1.0.0
 * @argument {string} account_id
 * @argument {string} friend_id
 * @argument {string} invite_id
 * @argument {boolean} accept
 * @example /account-accountAnswerInvite?account_id=[ACCOUNT_ID]&friend_id=[FRIEND_ACCOUNT_ID]&invite_id=[INVITE_ID]&accept=[TRUE/FALSE];
 */
export const accountAnswerInvite = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    corsHandler(request, response, async () => {
        const { friend_id, account_id, invite_id, accept } = request.query as unknown as { account_id: string, friend_id: string, invite_id: string, accept: boolean };

        if (!account_id) {
            response.json(makeResponse(404, null, "Account id not provided."));
            return;
        }

        if (!friend_id) {
            response.json(makeResponse(404, null, "Friend id not provided."));
            return;
        }

        if (!invite_id) {
            response.json(makeResponse(404, null, "Invite id not provided."));
            return;
        }

        const account = await getAccountById(account_id);

        if (!account) {
            response.json(makeResponse(404, null, "Account not found."));
            return;
        }

        const friend_ref: IFriend | undefined = [...(account.friends ?? [])].find(contact => contact?.account_id === friend_id);
        if (friend_ref) {
            response.json(makeResponse(404, null, "Friend already added."));
            return;
        }

        const friend = await getAccountById(friend_id);

        if (!friend) {
            response.json(makeResponse(404, null, "Friend account not found."));
            return;
        }

        const selfInvites = ensureArray<TFriendInvite[]>(account.invites)
        const friendInvites = ensureArray<TFriendInvite[]>(account.invites)

        const friendInviteIndex = friendInvites.map(i => i.id).indexOf(invite_id);
        const selfInviteIndex = selfInvites.map(i => i.id).indexOf(invite_id);

        if (friendInviteIndex <= -1 || selfInviteIndex <= -1) {
            response.json(makeResponse(404, null, "Invite not found."))
            return;
        }

        const finalStatus = accept ? "resolved" : "rejected";

        selfInvites[selfInviteIndex].status = finalStatus;
        friendInvites[friendInviteIndex].status = finalStatus;

        const friendFriends = ensureArray(friend.friends);
        const selfFriends = ensureArray(account.friends);

        if (accept) {
            friendFriends.push({
                account_id: account_id,
                favorite: false
            })

            selfFriends.push({
                account_id: friend_id,
                favorite: false
            })
        }

        // @ts-ignore
        delete account.id;
        // @ts-ignore
        delete friend.id;

        try {
            await db.collection("users").doc(account_id).set({ ...account, invites: selfInvites, friends: selfFriends });
            await db.collection("users").doc(friend_id).set({ ...friend, invites: friendInvites, friends: friendFriends });
            response.json(makeResponse(204, null));
        } catch (err) {
            response.json(makeResponse(500, null, err.message));
        }
    });

});


/**
 * @description Get account's storage.
 * @argument {string} account_id (required)
 * @argument {boolean} key (required)
 * @version 1.0.0
 * @example /account-accountStorageGet?account_id=[ACCOUNT_ID]&key=[FIELD_KEY]
 */
export const accountStorageGet = functions.https.onRequest(async (request, response) => {
    corsHandler(request, response, async () => {

        const { account_id, key } = request.query as { account_id: string, key: string };

        if (!account_id) {
            response.json(makeResponse(400, undefined, "Account id not provided."))
            return;
        }

        const account = await getAccountById(account_id);

        if (!account) {
            response.json(makeResponse(409, undefined, "Account not found."))
            return;
        }

        const storage = account.storage ?? {};
        const value = storage[key];

        if (!value) {
            response.json(makeResponse(404, undefined, `Storage field with key ${key} doesn't exist.`));
            return;
        }

        response.json(makeResponse(200, value));
    });
});

/**
 * @description Set account's storage.
 * @argument {string} account_id (required)
 * @argument {boolean} key (required)
 * @argument {boolean} value (required)
 * @version 1.0.0
 * @example /account-accountStorageSet?account_id=[ACCOUNT_ID]&key=[FIELD_NEY]&value=[FIELD_VALUE]
 */
export const accountStorageSet = functions.https.onRequest(async (request, response) => {
    corsHandler(request, response, async () => {

        const { account_id, key, value } = request.query as { account_id: string, key: string, value: any };

        if (!account_id) {
            response.json(makeResponse(400, undefined, "Account id not provided."))
            return;
        }

        const account = await getAccountById(account_id);

        if (!account) {
            response.json(makeResponse(409, undefined, "Account not found."))
            return;
        }

        const storage = account.storage ?? {};
        storage[key] = value;

        if (!value) {
            response.json(makeResponse(404, undefined, `Storage field with key ${key} doesn't exist.`));
            return;
        }

        try {
            await db.collection("users").doc(account_id).set({ ...account, storage });
            response.json(makeResponse(204, null));
        } catch (err) {
            response.json(makeResponse(500, null, err.message));
        }
    });
});