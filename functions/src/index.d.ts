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
}

export interface IRoom {
    id: string;
    label: string;
    created_at: Date;
    access: string[];
}

export type Dictionary<T> = { [key: string]: T };