// export interface IAccount {
//     id: string;
//     label: string;
//     created_at: Date;
//     avatar_url: string;
//     email: string;
//     name: string;
//     surname: string;

//     flags?: string[];
//     rooms?: IRoom[];
//     contacts?: TContact[];
// }

export interface IAccount {
    id: string;
    label: string;
    created_at: Date;
    avatar_url: string;

    contact: TAccountContact,
    details: TAccountDetails;

    flags?: string[];
    rooms?: IRoom[];
    friends?: IFriend[];
}

export type TAccountDetails = {
    first_name: string;
    middle_name: string;
    last_name: string;
    birthdate: Date;
    sex: "M" | "F" | "O";
}

export type TAccountContact = {
    email: string;
    phone?: string;
}

/**
 * @deprecated renamed to IFriend.
 */
export type TContact = {
    account_id: string;
    favorite?: boolean;
    last_contacted?: Date;
}

export interface IFriend {
    account_id: string;
    favorite?: boolean;
    last_contacted?: Date;
}

export type TSuggestion = {
    type: "long-not-messaged"
    | "never-messaged"
    | "verify-email";
    payload?: Dictionary<any>;
}

export interface IRoom {
    id: string;
    label: string;
    created_at: Date;
    access: string[];
    accounts?: IAccount[];
}

export type Dictionary<T> = { [key: string]: T };