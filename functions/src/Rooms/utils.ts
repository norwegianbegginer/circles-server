import * as admin from "firebase-admin";
import { IRoom } from "../index.d";

/**
 * Get a room by room_id.
 * @param id room_id
 */
export const getRoomById = async (id: string): Promise<IRoom | null> => {
    const db = admin.firestore();
    const room = await db.collection("rooms").doc(id).get();
    
    if(!room || !room.exists) {
        return null;
    }
    
    return room.data() as IRoom;
}

/**
 * Get list of all rooms.
 */
export const getRooms = async (): Promise<IRoom[]> => {
    const db = admin.firestore();
    const rooms: IRoom[] = [];

    (await db.collection("rooms").get()).forEach((room) => {
        if(room && room.exists) 
            rooms.push({id: room.id, ...room.data()} as IRoom);
    });

    return rooms;
}

/**
 * Get list of all rooms an account has access to.
 * @param account_id 
 */
export const getAccountRooms = async (account_id: string): Promise<IRoom[]> => {
    return (await getRooms()).filter(room => room.access.includes(account_id));
}