const WebSocket = require('ws');
const { Rest } = require('./Rest.js');
const { Player } = require('./Player.js');

/**
 * @typedef {Object} JoinOptions Options to join a voice channel with
 * @prop {Boolean} self_deaf Whether or not to join the channel deafened
 * @prop {Boolean} self_mute Whether or not to join the channel muted
 */

class Node {
    /**
     * An interface to manage a lavalink node
     */
    constructor(config, lavalink) {
        this.config = config;
        if (!this.config.host) throw new Error('A host url for a node is required');
        if (!this.config.password) this.config.password = 'youshallnotpass';

        this.lavalink = lavalink;
        this.rest = new Rest(config, this);

        this.ws = new WebSocket(`ws://${this.config.host}`, {
            headers: {
                'Authorization': this.config.password,
                'Num-Shards': this.lavalink.config.shards,
                'User-Id': this.lavalink.config.id
            }
        });

        this.ws.on('message', this._handleMessage.bind(this));
        this.ws.on('close', this._handleClose.bind(this));

        this.stats = {};
        this.players = new Map();
    }

    _handleMessage(message) {
        try {
            message = JSON.parse(message);
        }
        catch (e) { return; }

        switch (message.op) {
            case 'playerUpdate':
                this.players.get(message.guildId).update(message.state);
                break;

            case 'stats':
                delete message.op;
                this.stats = message;
                break;

            case 'event':
                try {
                    this.players.get(message.guildId).event(message.type, message);
                }
                catch (e) { }
                break;
        }
    }

    _handleClose() {
        this.destroy();
    }

    voiceServerUpdate(data, serverId, sessionId) {
        const packet = {
            op: 'voiceUpdate',
            guildId: serverId,
            sessionId: sessionId,
            event: data
        };

        this.ws.send(JSON.stringify(packet));
    }

    /**
     * Joins a channel
     * @param {String} serverId The server id where the voice channel to join is
     * @param {String} channelId The id of the voice channel to join
     * @param {JoinOptions} options The options to join with
     * @returns {Player} The player for the voice channel
     */
    join(serverId, channelId, options = {}) {
        const player = new Player(this, serverId);

        const packet = {
            op: 4,
            d: Object.assign({
                self_deaf: false,
                guild_id: serverId,
                channel_id: channelId,
                self_mute: false
            }, options)
        };

        this.stats.players++;

        this.players.set(serverId, player);
        this.lavalink.players.set(serverId, player);
        this.lavalink.emit('forwardWs', serverId, JSON.stringify(packet));

        return player;
    }

    /**
     * Destroys the node
     */
    destroy() {
        this.players.forEach(p => p.destroy(true));
        this.lavalink.removeNode(this);
    }
}

module.exports = { Node };