import { ChatPayload, EndPayload, MovePayload, RoomJoinPayload, RoomType, StartPayload, UserJoinPayload } from 'types';

interface RoomSettings {
    isPrivate: boolean;
}

export default class Room {
    public id: string;
    public name: string;
    public settings: RoomSettings;
    public type: RoomType;

    private io: SocketIO.Server;

    private clients: Map<string, string>;
    private strokes: any;
    // private layers: any;

    constructor(id: string, io: SocketIO.Server, type: RoomType) {
        this.id = id;
        this.name = "Test room";
        this.settings = {
            isPrivate: true,
        }

        this.clients = new Map<string, string>();
        this.strokes = {};
        // this.layers = [];

        this.io = io;
    }

    public addClient(socket: SocketIO.Socket, username: string): void {
        this.clients[socket.id] = username;
        socket.join(this.id);

        const payload: RoomJoinPayload = {
            clientId: socket.id,
            id: this.id,
            username,
        }
        socket.emit('join', payload);

        // Send user info to all other clients
        const userJoinPayload: UserJoinPayload = {
            id: socket.id,
            username,
        }

        this.broadcast(socket, 'uj', userJoinPayload);

        // Send other clients info to new user
        const users = Object.keys(this.clients).map(key => this.clients[key]);
        users.forEach(user => {
            const newPayload: UserJoinPayload = {
                id: 'user.id',
                username: user,
            }

            socket.emit('uj', newPayload);
        })


        // Give new client all the current strokes
        socket.emit('board_data', {
            strokes: this.strokes,
        });

        console.log('client added!')
    }

    public removeClient(socket: SocketIO.Socket): void {
        this.io.sockets.in(this.id).emit('ul', {
            'id': socket.id,
            'username': this.clients[socket.id]
        });
        delete this.clients[socket.id];
    }

    public startStroke(socket: SocketIO.Socket, data: StartPayload) {
        socket.broadcast.to(this.id).emit('s', data);
        this.strokes[data.uuid] = {};
        this.strokes[data.uuid].layer = data.layer;
        this.strokes[data.uuid].tool = data.tool;
        this.strokes[data.uuid].path = [];
        this.strokes[data.uuid].path.push({ x: data.x, y: data.y, p: data.p });
    }

    public updateStroke(socket: SocketIO.Socket, data: MovePayload) {
        socket.broadcast.to(this.id).emit('u', data);
        for(const point of data.positions) {
            this.strokes[data.uuid].path.push({ x: point.x, y: point.y, p: point.p });
        }
    }

    public endStroke(socket: SocketIO.Socket, data: EndPayload) {
        socket.broadcast.to(this.id).emit('e', data);
    }

    public emit(socket: SocketIO.Socket, type: string, data: any): void {
        this.io.in(this.id).emit(type, data);
    }

    public broadcast(socket: SocketIO.Socket, type: string, data: any): void {
        socket.broadcast.to(this.id).emit(type, data);
    }

    public parseMessage(data: ChatPayload) {
        if(this.type === RoomType.GuessingGame) {
            console.log("Guessing game!");
        }
    }
}