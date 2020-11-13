import * as functions from 'firebase-functions';
import { makeResponse } from '../utils';
import { getAccountsByIds } from '../Accounts/utils';
import { getRooms, getRoomById } from './utils';

/**
 * @description Get list of all rooms.
 * @argument {number} volume 
 * @version 1.0.0
 * @example /room-roomList?volume=5
 */
export const roomList = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    const { volume } = request.query as { volume?: number };

    const rooms = await getRooms();

    if (volume && rooms.length > volume)
        rooms.length = volume;

    response.json(makeResponse(200, rooms));
});

/**
 * @description Get room info by id.
 * @argument {string} room_id 
 * @version 1.0.0
 * @example /room-roomInfo?room_id=[ROOM_ID]
 */
export const roomInfo = functions.https.onRequest(async (request, response) => {
    const { room_id, accounts } = request.query as { room_id: string, accounts?: boolean };

    if (!room_id) {
        response.json(makeResponse(400, undefined, "Room id not provided."))
        return;
    }

    const room = await getRoomById(room_id);

    if (!room) {
        response.json(makeResponse(404, undefined, "Room not found."))
        return;
    }

    if ((!!accounts) == true)
        room.accounts = await getAccountsByIds(room.access);

    response.json(makeResponse(200, { ...room }));
});

/**
 * @description Check if account has access to a room.
 * @argument {string} account_id
 * @argument {string} room_id 
 * @version 1.0.0-beta.1
 * @example /room-checkRoomAccess?account_id=[ACCOUNT_ID]?room_id=[ROOM_ID]
 */
export const checkRoomAccess = functions.https.onRequest(async (request: functions.https.Request, response: functions.Response<any>) => {
    const { account_id, room_id } = request.query as { account_id: string, room_id: string };

    // TODO: Wrap functions with classes for better query parsing.
    if (!account_id) {
        response.json(makeResponse(400, undefined, "Account id not provided."))
        return;
    }

    if (!room_id) {
        response.json(makeResponse(400, undefined, "Room id not provided."))
        return;
    }

    const room = await getRoomById(room_id);

    if (!room) {
        response.json(makeResponse(404, undefined, "Room not found."))
        return;
    }

    const hasAccess = !!room.access.includes(account_id);

    response.json(makeResponse(200, { hasAccess }));
});