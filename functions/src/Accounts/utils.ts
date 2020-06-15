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