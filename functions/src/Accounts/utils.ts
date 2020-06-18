import * as admin from "firebase-admin";
import { IAccount } from "../index.d";

/**
 * Get account by account_id.
 * @param id account_id
 */
export const getAccountById = async (id: string): Promise<IAccount | null> => {
    const db = admin.firestore();
    const account = await db.collection("users").doc(id).get();
    
    if(!account || !account.exists) {
        return null;
    }

    return {id, ...account.data()} as IAccount;
}

/**
 * Get accounts by account_id's.
 * @param id account_id
 */
export const getAccountsByIds = async (ids: string[]): Promise<IAccount[]> => {
    const accounts = (await getAccounts()).filter(account => ids.includes(account.id));

    return accounts ?? [];
}

/**
 * Get account by email.
 * @param email 
 */
export const getAccountByEmail = async (email: string): Promise<IAccount | null> => {
    const db = admin.firestore();
    const accountsQuery = await db.collection("users").where("email", "==", email).get();
    
    if(!accountsQuery || accountsQuery.empty) {
        return null;
    }

    let account: IAccount | null = null;

    accountsQuery.forEach((acc) => { if(acc && !account) { account = ({id: acc.id, ...acc.data()}) as IAccount } } )

    return account;
}

export const verifyAccountToken = (token: string) => {
    return new Promise((resolve, reject) => {
        admin.auth().verifyIdToken(token, true)
            .then(function(decodedToken) {
                let uid = decodedToken.uid;
                resolve(uid);
            }).catch(function(error) {
                console.error(error);
                resolve(null); // TODO: Error handling
            });
    });
}


/**
 * Get list of all accounts.
 */
export const getAccounts = async (): Promise<IAccount[]> => {
    const db = admin.firestore();
    const accounts: IAccount[] = [];
    (await db.collection("users").get()).forEach((account) => {
        if(account && account.exists) 
            accounts.push({id: account.id, ...account.data()} as IAccount);
    });

    return accounts;
}