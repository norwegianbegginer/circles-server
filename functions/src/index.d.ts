export interface IAccount {
    id: string;
    label: string;
    created_at: Date;
    avatar_url: string;
    email: string;
    name: string;
    surname: string;

    flags?: string[];
    rooms?: IRoom[];
    contacts?: TContact[];
}

export type TContact = {
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