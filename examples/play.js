const Discord = require('discord.js');
const client = new Discord.Client();
const { Lavalink, Queue } = require('node-lavalink');

const lavalinkConfig = {
    nodes: [
        {rest: "ip:port", ws: "ip:port"}
    ],
    id: '12345678910',
    shards: 1
};

const link = new Lavalink(lavalinkConfig);

client.on('message', async m => {
    const args = message.content.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command === "play") {
        const voiceChannel = m.guild.members.get(m.author.id).voiceChannelID;

        if (!voiceChannel) return m.channel.send('Not in a voice channel');
    
        await link.join(m.guild.id, voiceChannel);
    
        const songs = await link.rest.search(`ytsearch: ${args.join(" ")}`);

        const queue = new Queue();
        const player = link.players.get(m.guild.id);
        if (!player) return;
    
        if (player.nowPlaying) return player.queue.add(songs[0].track);

        queue.add(songs[0].track);
        player.play(queue);
    };
});

client.login('token');