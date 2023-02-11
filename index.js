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
const prefix = client.config.prefix;
const botIds = [client.config.bleedBotId, client.config.mudaeBotId]
const updateChecker = client.config.updateChecker
let debugMode = client.config.debugMode
let autoGrab = client.config.autoGrab
let nodelay = client.config.bleed.nodelay
let enabled = client.config.enabled
let autoJoinBleed = client.config.bleed.autoJoin
let autoJoinMudae = client.config.mudae.autoJoin
let joinDelayMudae = client.config.mudae.joinDelay
let joinDelayBleed = client.config.bleed.joinDelay
let typingIndicatorsBleed = client.config.bleed.typingIndicators
let typingIndicatorsMudae = client.config.mudae.typingIndicators
let playerTrackingBleed = client.config.bleed.playerTracking
let playerTrackingMudae = client.config.mudae.playerTracking
let currentActiveGame = ""

// stats tracking
let lives = 2
let wins = 0
let losses = 0
let joined = 0


if (updateChecker) {
// get the config.json from the latest commit then check if version is the same
    fetch('https://raw.githubusercontent.com/Arm-0001/Arms-selfbot/main/config.json.example')
        .then(res => res.json())
        .then(json => {
            if (json.version !== config.version) {
                console.log("There is a new version available! Please download the latest version from https://github.com/Arm-0001/Arms-selfbot")
            } else {
                console.log("You are using the latest version!")
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

function solveLetters(message, content, time, bot) {
    if (debugMode) {console.log(`${time} | Found the message`)} // DEBUG: found the message
    let letters = ''
    let command = ''
    if (bot === 'bleed') {
        letters = content.split('letters: **')[1].split('**')[0].toLowerCase(); // get the letters
        command = `python script.py ${letters}`
    } else if (bot === 'mudae' || bot === 'redtea') {
        letters = content.split('containing: **')[1].split('**')[0].toLowerCase(); // get the letters
        command = `python redtea.py ${letters}`
        if (!nodelay) {command += ' True'}
        console.log(`${time} | Found word: ${letters} | Lives: ${lives}`);
    }
    console.log(`${time} | Looking for words with the following letters: ${letters}`);
    if (letters.length === 3 && letters.match(/^[a-zA-Z]+$/)) { // check that there are 3 letters
        if (debugMode) {console.log(`${time} | running command: python script.py ${letters}`)} // DEBUG: print command
        if (nodelay) {command += ' True'}
        if (typingIndicatorsBleed) {
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
        `  You are using version: ${config.version}  `,
        "   AutoGame Bot By Arm#0001 ",
        "=========== SETTINGS ===========",
        "Debug mode: " + debugMode,
        "Current User: " + client.user.tag,
        "Prefix: " + prefix,
        "Nodelay: " + nodelay,
        "Enabled: " + enabled,
        "Auto Grab: " + autoGrab,
        "=========== Bleed ===========",
        "Auto Join: " + autoJoinBleed,
        "Join Delay: " + joinDelayBleed,
        "Typing Indicators: " + typingIndicatorsBleed,
        "Player Tracking: " + playerTrackingBleed,
        "=========== Mudae ===========",
        "Auto Join: " + autoJoinMudae,
        "Join Delay: " + joinDelayMudae,
        "Typing Indicators: " + typingIndicatorsMudae,
        "Player Tracking: " + playerTrackingMudae
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
            // get for which bot (bleed or mudae)
            const bot = message.content.split(' ')[1]
            if (bot === 'bleed') {
                autoJoinBleed = !autoJoinBleed
                console.log(`${time} | Autojoin bleed set to ${autoJoinBleed}`)
                message.channel.send(`Autojoin bleed set to ${autoJoinBleed}`)
            } else if (bot === 'mudae') {
                autoJoinMudae = !autoJoinMudae
                console.log(`${time} | Autojoin mudae set to ${autoJoinMudae}`)
                message.channel.send(`Autojoin mudae set to ${autoJoinMudae}`)
            } else {
                message.channel.send('Please specify which bot you want to autojoin for (bleed or mudae)')
            }
        } else if (message.content.startsWith(prefix + 'debug')) {
            debugMode = !debugMode
            console.log(`${time} | Debug mode set to ${debugMode}`)
            message.channel.send(`Debug mode set to ${debugMode}`)
        } else if (message.content.startsWith(prefix + 'typingindicators')) {
            const bot = message.content.split(' ')[1]
            if (bot === 'bleed') {
                typingIndicatorsBleed = !typingIndicatorsBleed
                console.log(`${time} | Typing indicators bleed set to ${typingIndicatorsBleed}`)
                message.channel.send(`Typing indicators bleed set to ${typingIndicatorsBleed}`)
            } else if (bot === 'mudae') {
                typingIndicatorsMudae = !typingIndicatorsMudae
                console.log(`${time} | Typing indicators mudae set to ${typingIndicatorsMudae}`)
                message.channel.send(`Typing indicators mudae set to ${typingIndicatorsMudae}`)
            } else {
                message.channel.send('Please specify which bot you want to enable typing indicators for (bleed or mudae)')
            }
        }  else if (message.content.startsWith(prefix + 'help')) {
            message.channel.send(`**Commands:**\n\`${prefix}nodelay\` - Toggle nodelay mode\n\`${prefix}enable\` - Toggle bot\n\`${prefix}autograb\` - Toggle autograb\n\`${prefix}autojoin bleed\` - Toggle autojoin for bleed\n\`${prefix}autojoin mudae\` - Toggle autojoin for mudae\n\`${prefix}typingindicators bleed\` - Toggle typing indicators for bleed\n\`${prefix}typingindicators mudae\` - Toggle typing indicators for mudae\n\`${prefix}debug\` - Toggle debug mode`)
        } else if (message.content.startsWith(prefix + 'playertracking')) {
            const bot = message.content.split(' ')[1]
            if (bot === 'bleed') {
                playerTrackingBleed = !playerTrackingBleed
                console.log(`${time} | Player tracking bleed set to ${playerTrackingBleed}`)
                message.channel.send(`Player tracking bleed set to ${playerTrackingBleed}`)
            } else if (bot === 'mudae') {
                playerTrackingMudae = !playerTrackingMudae
                console.log(`${time} | Player tracking mudae set to ${playerTrackingMudae}`)
                message.channel.send(`Player tracking mudae set to ${playerTrackingMudae}`)
            } else {
                message.channel.send('Please specify which bot you want to enable player tracking for (bleed or mudae)')
            }
        } else if (message.content.startsWith(prefix +  'config')) {
            // print the current settings
            message.channel.send(`**Current settings:**\n\`Nodelay:\` ${nodelay}\n\`Enabled:\` ${enabled}\n\`Autograb:\` ${autoGrab}\n\`Autojoin bleed:\` ${autoJoinBleed}\n\`Autojoin mudae:\` ${autoJoinMudae}\n\`Typing indicators bleed:\` ${typingIndicatorsBleed}\n\`Typing indicators mudae:\` ${typingIndicatorsMudae}\n\`Debug mode:\` ${debugMode}\n\`Player tracking bleed:\` ${playerTrackingBleed}\n\`Player tracking mudae:\` ${playerTrackingMudae}`)
        }
    } else if (botIds.includes(message.author.id)) {
        if (message.author.id === client.config.bleedBotId) { // check if the message is from the bleed bot
            if (message.embeds.length > 0 && message.embeds[0].description) { // check if message has embeds
                const content = message.embeds[0].description 
                if (debugMode) {console.log(content);} // DEBUG: print embed content
                if (content.includes('A word can only be used **once** through the course of the game.') && autoJoinBleed) {
                    setTimeout(() => {
                        message.react('✅');
                        joined += 1
                        console.log(`${time} | Successfully joined game in ${message.guild.name} in channel ${message.channel.name}! | ${message.url}`);
                    }, joinDelayBleed * 1000)
                    currentActiveGame = "bleed"
                    joined += 1
                    console.log(`${time} | Successfully joined game in ${message.guild.name} in channel ${message.channel.name}! | ${message.url}`);
                } else if (content.includes('Not enough players joined the game to start.')) {
                    console.log(`${time} | Not enough players in ${message.guild.name} in channel ${message.channel.name}!`);
                    joined -= 1
                    currentActiveGame = ""
                } else if (content.includes('💥 Times up, **Arm** has 1 life remaining!')) {
                    lives -= 1
                    console.log(`${time} | Lost a life in ${message.guild.name} in channel ${message.channel.name}! | Lives: ${lives}`)
                }
                else if (content.includes(`🏆 **${client.user.username}** has won the game! 🏆`)) {
                    console.log(`${time} | Won the game in ${message.guild.name} in channel ${message.channel.name}!`)
                    lives = 2
                    wins += 1
                    currentActiveGame = ""
                    console.log(`Wins: ${wins}\nLosses: ${losses}\nJoined: ${joined}`)
                } else if (content.includes(`🚪 **${client.user.username}** has been **eliminated**!`)) {
                    console.log(`${time} | Lost the game in ${message.guild.name} in channel ${message.channel.name}!`)
                    lives = 2
                    losses += 1
                    currentActiveGame = ""
                    console.log(`Wins: ${wins}\nLosses: ${losses}\nJoined: ${joined}`)
                }
                else if (content.includes('Type a **word** containing the letters:') && message.mentions.users.has(client.user.id)) {
                    solveLetters(message, content, time, "bleed");
                }
            }
        } else if (message.author.id === client.config.mudaeBotId) { // check if the message is from the mudae bot
            if (message.embeds.length > 0 && message.embeds[0].description) { // check if message has embeds
                const content = message.embeds[0].description 
                if (debugMode) {console.log(content);} // DEBUG: print embed content
                if (content.includes('The Black Teaword will start!') && autoJoinMudae) {
                    setTimeout(() => {
                        message.react('✅');
                        joined += 1
                        console.log(`${time} | Successfully joined game in ${message.guild.name} in channel ${message.channel.name}! | ${message.url}`);
                    }, joinDelayMudae * 1000)
                    joined += 1
                    currentActiveGame = "mudae"
                    console.log(`${time} | Successfully joined mudae game in ${message.guild.name} in channel ${message.channel.name}! | ${message.url}`);
                } else if (content.includes("The Red Teaword will start!") && autoJoinMudae) {
                    currentActiveGame = "redtea"
                    setTimeout(() => {
                        message.react('✅');
                        joined += 1
                        console.log(`${time} | Successfully joined game in ${message.guild.name} in channel ${message.channel.name}! | ${message.url}`);
                    }, joinDelayMudae * 1000)
                    joined += 1
                    console.log(`${time} | Successfully joined mudae game in ${message.guild.name} in channel ${message.channel.name}! | ${message.url}`);
                }
            } else if (message.content.includes('No participants... I would have had time to prepare a good tea.')) {
                console.log(`${time} | Not enough players in ${message.guild.name} in channel ${message.channel.name}!`);
                joined -= 1
                currentActiveGame = ""
            } else if (message.content.includes(`${client.user.username} **won the game!**`)) {
                console.log(`${time} | Won the game in ${message.guild.name} in channel ${message.channel.name}!`)
                lives = 2
                wins += 1
                console.log(`Wins: ${wins}\nLosses: ${losses}\nJoined: ${joined}`)
                currentActiveGame = ""
            } else if (message.content.includes('eliminated!') && message.mentions.users.has(client.user.id)) {
                console.log(`${time} | Lost the game in ${message.guild.name} in channel ${message.channel.name}!`)
                lives = 2
                losses += 1
                currentActiveGame = ""
                console.log(`Wins: ${wins}\nLosses: ${losses}\nJoined: ${joined}`)
            } else if (message.content.includes('Type a word containing:') && message.mentions.users.has(client.user.id)) {
                solveLetters(message, message.content, time, "mudae");
            } else if (message.content.includes(':redtea: Type the longest')) {
                solveLetters(message, message.content, time, "redtea");
            }
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
