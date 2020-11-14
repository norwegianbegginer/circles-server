//import { Dictionary } from "./index.d";

type THttpStatus = 
    200 // Success with payload
    | 204 // Success without payload
    | 400 // Request error
    | 403 // Forbiden
    | 404 // Not found
    | 409 // Conflict
    | 500 // Unexpected error
    ;

export const makeResponse = (status: THttpStatus, data?: any, message?: string) => {
    //const stringifiedData = JSON.stringify(data);
    return Object.freeze({ status, message, data })
}

export function validateEmail(email: string) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

export function getAvatarUrl(label:string) {
    return `https://eu.ui-avatars.com/api/?name=${label}`
}

// TODO: Implement!
// export const parseQuery = ( query: Dictionary<string>, types: Dictionary<string> ) => {
//     let parsedQuery: Dictionary<any> = {};

//     Object.keys(query).forEach(arg => {

//         switch(types[arg]) {
//             case "object": 
//                 try {
//                     parsedQuery[arg] = JSON.parse(query[arg]);
//                 } catch(err) {
//                     parsedQuery[arg] = {};
//                 }
//                 break;
//             case "boolean":
//                 parsedQuery[arg] = !!(query[arg] === "true");
//                 break;
//             case "number":
//                 parsedQuery[arg] = Number(query[arg]);
//                 break;
//         }

//     });

//     return parsedQuery as T;
// }