import * as functions from 'firebase-functions';
import * as admin from "firebase-admin";
import { makeResponse, validateEmail } from '../utils';
import { getAccountById, getAccounts, getAccountByEmail, verifyAccountToken } from './utils';
import { getAccountRooms } from '../Rooms/utils';
import { IAccount, TContact, TSuggestion } from '../index.d';
import * as moment from "moment";

const db = admin.firestore();

/**
 * @description Create a new account. 
 * @version 1.0.0
 * @example /account-accountCreate?email=[EMAIL-ADDRESS]&password=[PASSWORD]
 */
export const accountCreate = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    const { email, password, label } = request.query as { email: string, password: string, label?: string };

    if (!email) {
        response.json(makeResponse(404, null, "Email not provided"));
        return;
    }
    if (!password) {
        response.json(makeResponse(404, null, "Password not provided"));
        return;
    }

    if (password.length < 12) {
        response.json(makeResponse(404, null, "Password didn't meet requirements."));
        return;
    }

    if (!validateEmail(email)) {
        response.json(makeResponse(404, null, "Email is not valid."));
        return;
    }

    const accounts = await getAccounts();
    if (!!accounts.find(account => account.email !== undefined && account.email === email)) {
        response.json(makeResponse(404, null, "Account with this email already exists."));
        return;
    }

    const new_account = {
        email,
        label: label ?? "Hero",
        created_at: moment().toDate(),
        flags: ["needs_init"],
    };

    const { id: account_id } = await db.collection("users").add(new_account);

    response.json(makeResponse(200, { account_id }));
});

/**
 * @description Edit an account.
 * @version 1.0.0
 * @argument {string} account_id
 * @argument {Partial<IAccount>} changes
 * @example /account-accountChange?account_id=[ACCOUNT_ID]&changes={"name": "Mike", "surname": "Eling", "avatar_url": "https://google.com/", "label": "DRFR0ST"}
 */
export const accountChange = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
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

    if (account?.flags?.includes("needs_init"))
        account.flags.splice(account.flags.indexOf("needs_init"), 1);

    db.collection("users").doc(account_id).set({ ...account, ...parsedChanges }).then(() => {
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
 * @example /account-accountInfo?account_id=[ACCOUNT_ID]
 */
export const accountInfo = functions.https.onRequest(async (request, response) => {
    const { account_id, rooms, flags, contacts } = request.query as { account_id: string, rooms?: boolean, flags?: boolean, contacts?: boolean };

    if (!account_id) {
        response.json(makeResponse(400, undefined, "Account id not provided."))
        return;
    }

    const account = await getAccountById(account_id);

    if (!account) {
        response.json(makeResponse(404, undefined, "Account not found."))
        return;
    }

    if ((!!rooms) === true)
        account.rooms = await getAccountRooms(account_id);

    if ((!!flags) !== true)
        delete account.flags;

    if ((!!contacts) !== true)
        delete account.contacts;

    response.json(makeResponse(200, { ...account }));
});

/**
 * @description Authorize account with token.
 * @argument {string} token
 * @version 1.0.0
 * @example /account-accountLogin?token=[ACCOUNT_ID]
 */
export const accountLogin = functions.https.onRequest(async (request, response) => {
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

/**
 * @description Get personalized suggestions for account.
 * @argument {string} account_id
 * @version 1.0.0
 * @example /account-accountGetSuggestions?account_id=[ACCOUNT_ID]
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
 * @example /account-accountFind?email=[EMAIL-ADDRESS]
 */
export const accountFind = functions.https.onRequest(async (request, response) => {
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

/**
 * @description Update a contact.
 * @version 1.0.0
 * @argument {string} account_id
 * @argument {string} contact_id
 * @argument {Partial<TContact>} changes
 * @example /account-accountUpdateContact?account_id=[ACCOUNT_ID]&contact_id=[CONTACT_ACCOUNT_ID]&changes={last_contacted: [DATE], favorite: true}
 */
export const accountUpdateContact = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    const { account_id, contact_id, changes } = request.query as { account_id: string, contact_id: string, changes: Partial<TContact> };

    if (!account_id) {
        response.json(makeResponse(404, null, "Account id not provided."));
        return;
    }

    if (!contact_id) {
        response.json(makeResponse(404, null, "Contact id not provided."));
        return;
    }

    if (!changes) {
        response.json(makeResponse(404, null, "Changes do not provided."));
        return;
    }

    let parsedChanges: Partial<TContact> = {};

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

    if (!account.contacts || account.contacts.length === 0) {
        response.json(makeResponse(404, null, "Account has no contacts."));
        return;
    }

    const contacts = (account?.contacts ?? []).map((_contact: TContact) => {
        if (_contact.account_id === contact_id) {
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

    db.collection("users").doc(account_id).set({ ...account, contacts }).then(() => {
        response.json(makeResponse(204));
    })
        .catch(err => {
            response.json(makeResponse(500, null, err.message))
        });

});

/**
 * @description Add a contact.
 * @version 1.0.0
 * @argument {string} account_id
 * @argument {string} contact_id
 * @example /account-accountAddContact?account_id=[ACCOUNT_ID]&contact_id=[CONTACT_ACCOUNT_ID]
 */
export const accountAddContact = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    const { contact_id, account_id } = request.query as { account_id: string, contact_id: string };

    if (!account_id) {
        response.json(makeResponse(404, null, "Account id not provided."));
        return;
    }

    if (!contact_id) {
        response.json(makeResponse(404, null, "Contact id not provided."));
        return;
    }

    const account = await getAccountById(account_id);

    if (!account) {
        response.json(makeResponse(404, null, "Account not found."));
        return;
    }

    const contacts: TContact[] = [...(account.contacts ?? [])]

    if (contacts.find(contact => contact?.account_id === contact_id)) {
        response.json(makeResponse(404, null, "Contact already added."));
        return;
    }

    contacts.push({
        account_id: contact_id,
        favorite: false
    })

    // @ts-ignore
    delete account.id;

    db.collection("users").doc(account_id).set({ ...account, contacts }).then(() => {
        response.json(makeResponse(204));
    })
        .catch(err => {
            response.json(makeResponse(500, null, err.message))
        });

});

/**
 * @description Delete a contact.
 * @version 1.0.0
 * @argument {string} account_id
 * @argument {string} contact_id
 * @example /account-accountDeleteContact?account_id=[ACCOUNT_ID]&contact_id=[CONTACT_ACCOUNT_ID]
 */
export const accountDeleteContact = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    const { contact_id, account_id } = request.query as { account_id: string, contact_id: string };

    if (!account_id) {
        response.json(makeResponse(404, null, "Account id not provided."));
        return;
    }

    if (!contact_id) {
        response.json(makeResponse(404, null, "Contact id not provided."));
        return;
    }

    const account = await getAccountById(account_id);

    if (!account) {
        response.json(makeResponse(404, null, "Account not found."));
        return;
    }


    if ((account.contacts ?? []).find(contact => contact?.account_id !== contact_id)) {
        response.json(makeResponse(404, null, "Contact not found."));
        return;
    }

    const contacts: TContact[] = [...(account.contacts ?? [])].filter(contact => contact.account_id !== contact_id);

    // @ts-ignore
    delete account.id;

    db.collection("users").doc(account_id).set({ ...account, contacts }).then(() => {
        response.json(makeResponse(204));
    })
        .catch(err => {
            response.json(makeResponse(500, null, err.message))
        });

});

/**
 * @description Get list of all accounts.
 * @argument {number} volume 
 * @version 1.0.0
 * @example /account-accountList?volume=5
 */
export const accountList = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    const { volume } = request.query as { volume?: number };

    const accounts = await getAccounts();

    if (volume && accounts.length > volume)
        accounts.length = volume;

    response.json(makeResponse(200, accounts));
});