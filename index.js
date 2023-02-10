const { Client } = require('discord.js-selfbot-v13');
const { exec } = require('child_process');
const fetch = require('node-fetch');
const fs = require('fs');
const client = new Client({
	checkUpdate: false,
});

// load config.json
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
client.config = config;

// bot config
const token = client.config.token;
const debugMode = client.config.debugMode
const prefix = client.config.prefix;
const botIds = [client.config.bleedBotId, client.config.mudaeBotId]
const updateChecker = client.config.updateChecker
const autoGrab = client.config.autoGrab
const autoJoin = client.config.blackTea.autoJoin
const playerTracking = client.config.blackTea.playerTracking
const nodelay = client.config.blackTea.nodelay
const enabled = client.config.enabled
const typingIndicators = client.config.blackTea.typingIndicators

// stats tracking
let lives = 2
let wins = 0
let losses = 0
let joined = 0


if (updateChecker) {
fetch('https://api.github.com/repos/Arm-0001/Arms-selfbot/commits')
    .then(res => res.json())
    .then(json => {
        const latestVersion = json[0].sha
        // get the sha of the current file
        const currentVersion = require('child_process')
            .execSync('git rev-parse HEAD')
            .toString().trim();
        if (latestVersion !== currentVersion) {
            console.log(`You are not using the latest version of the bot! Please update to ${latestVersion}`)
            console.log(`Changelog: ${json[0].commit.message}`)
        } else {
            console.log("You are using the latest version of the bot!")
        }
    });
}

function sendTypingPacket(channelId) {
    fetch(`https://discord.com/api/v9/channels/${channelId}/typing`, {
        "headers": {
            "authorization": token,
        },
        "body": null,
        "method": "POST"
        });
}

function solveLetters(message, content, time) {
    if (debugMode) {console.log(`${time} | Found the message`)} // DEBUG: found the message
    let letters = content.split('letters: **')[1].split('**')[0].toLowerCase(); // get the letters
    console.log(`${time} | Looking for words with the following letters: ${letters}`);
    if (letters.length === 3 && letters.match(/^[a-zA-Z]+$/)) { // check that there are 3 letters
        if (debugMode) {console.log(`${time} | running command: python script.py ${letters}`)} // DEBUG: print command
        let command = `python script.py ${letters}`
        if (nodelay) {command += ' True'}
        if (typingIndicators) {
            sendTypingPacket(message.channel.id)
        }
        exec(command, async (err, stdout, stderr) => {
            if (err) {
                if (debugMode) {console.log(err)}
                return;
            }
            console.log(`${time} | Found word: ${stdout.trim()} | Lives: ${lives}`);
            const msg = await message.channel.send(stdout.trim());
            setTimeout(() => {
                // check if msg has a check mark reaction
                if (msg.reactions.cache.find(r => r.emoji.name === '✅')) {
                    console.log(`${time} | Successfully sent word in ${message.guild.name} in channel ${message.channel.name}!`);
                } else {
                    console.log(`${time} | Failed to send word in ${message.guild.name} in channel ${message.channel.name}! Retrying now...`);
                    exec(`python script.py ${letters} True`, async (err, stdout, stderr) => {
                        if (err) {
                            if (debugMode) {console.log(err)}
                            return;
                        }
                        await message.channel.send(stdout.trim());
                    });
                }
            }, 2000);
        });
    }
}

function welcomeMessage() {
    const lines = [
        "  You are using version: 1.0.0  ",
        "   AutoGame Bot By Arm#0001 ",
        "=========== SETTINGS ===========",
        "Debug mode: " + debugMode,
        "Current User: " + client.user.tag,
        "Prefix: " + prefix,
        "Nodelay: " + nodelay,
        "Enabled: " + enabled,
        "Auto Grab: " + autoGrab,
        "Auto Join: " + autoJoin,
    ];
    const maxLineLength = Math.max(...lines.map(line => line.length));

    console.log("=".repeat(maxLineLength));
    for (const line of lines) {
        console.log(centerText(line, maxLineLength));
    }
    console.log("=".repeat(maxLineLength));
}

function centerText(text, maxLength) {
    const leftPadding = Math.floor((maxLength - text.length) / 2);
    const rightPadding = maxLength - text.length - leftPadding;
    return " ".repeat(leftPadding) + text + " ".repeat(rightPadding);
}

client.on('ready', async () => {
    welcomeMessage()
})

client.on('messageCreate', async (message) => {
    const date = new Date();
    const time = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
    // Command handling
    if (message.author.id == client.config.ownerId) {
        // bot setting commands
        if (message.content.startsWith(prefix + 'nodelay')) {
            nodelay = !nodelay
            console.log(`${time} | Nodelay set to ${nodelay}`)
            message.channel.send(`Nodelay set to ${nodelay}`)
        } else if (message.content.startsWith(prefix + 'enable')) {
            enabled = !enabled
            console.log(`${time} | Enabled set to ${enabled}`)
            message.channel.send(`Enabled set to ${enabled}`)
        } else if (message.content.startsWith(prefix + 'autograb')) {
            autoGrab = !autoGrab
            console.log(`${time} | Autograb set to ${autoGrab}`)
            message.channel.send(`Autograb set to ${autoGrab}`)
        } else if (message.content.startsWith(prefix + 'autojoin')) {
            autoJoin = !autoJoin
            console.log(`${time} | Autojoin set to ${autoJoin}`)
            message.channel.send(`Autojoin set to ${autoJoin}`)
        } else if (message.content.startsWith(prefix + 'debug')) {
            debugMode = !debugMode
            console.log(`${time} | Debug mode set to ${debugMode}`)
            message.channel.send(`Debug mode set to ${debugMode}`)
        } 
    } else if (botIds.includes(message.author.id)) {
        if (message.author.id === client.config.bleedBotId) { // check if the message is from the bleed bot
            if (message.embeds.length > 0 && message.embeds[0].description) { // check if message has embeds
                const content = message.embeds[0].description 
                if (debugMode) {console.log(content);} // DEBUG: print embed content
                if (content.includes('A word can only be used **once** through the course of the game.') && autoJoin) {
                    message.react('✅');
                    joined += 1
                    console.log(`${time} | Successfully joined game in ${message.guild.name} in channel ${message.channel.name}! | ${message.url}`);
                } else if (content.includes('Not enough players joined the game to start.')) {
                    console.log(`${time} | Not enough players in ${message.guild.name} in channel ${message.channel.name}!`);
                    joined -= 1
                } else if (content.includes('💥 Times up, **Arm** has 1 life remaining!')) {
                    lives -= 1
                    console.log(`${time} | Lost a life in ${message.guild.name} in channel ${message.channel.name}! | Lives: ${lives}`)
                }
                else if (content.includes(`🏆 **${client.user.username}** has won the game! 🏆`)) {
                    console.log(`${time} | Won the game in ${message.guild.name} in channel ${message.channel.name}!`)
                    lives = 2
                    wins += 1
                    console.log(`Wins: ${wins}\nLosses: ${losses}\nJoined: ${joined}`)
                } else if (content.includes(`🚪 **${client.user.username}** has been **eliminated**!`)) {
                    console.log(`${time} | Lost the game in ${message.guild.name} in channel ${message.channel.name}!`)
                    lives = 2
                    losses += 1
                    console.log(`Wins: ${wins}\nLosses: ${losses}\nJoined: ${joined}`)
                }
                else if (content.includes('Type a **word** containing the letters:') && message.mentions.users.has(client.user.id)) {
                    solveLetters(message, content, time);
                }
            }
        } else if (message.author.id === client.config.mudaeBotId) { // check if the message is from the mudae bot
            
        }
    } else {
        if (message.content === "Someone just dropped their wallet in this channel! Hurry and open it up with ~grab before someone else gets it!" && autoGrab) {
            message.channel.send("~grab")
        }
    }
});

process.on('unhandledRejection', async (err, promise) => {
    console.error(`[ANTI-CRASH] Prevented crash, Look below for the error and report it to [Arm#0001](https://github.com/Arm-0001/Arms-selfbot/issues)!`);
    console.error(`[ANTI-CRASH] Error: ${err}`);
});



client.login(token);
