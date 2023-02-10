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
let nodelay = client.config.blackTea.nodelay
let enabled = client.config.enabled

// stats tracking
let lives = 2
let wins = 0
let losses = 0
let joined = 0

/* version checker
fetch('https://api.github.com/repos/Arm-0001/Arms-Discord-Selfbot/commits')
    .then(res => res.json())
    .then(json => {
        console.log(json)
        const latestVersion = json[0].sha
        if (latestVersion !== client.config.version) {
            console.log(`You are not using the latest version of the bot! Please update to ${latestVersion}`)
        }
    });
*/

function welcomeMessage() {
    const lines = [
        "  You are using version: 1.0.0  ",
        "   AutoGame Bot By Arm#0001 ",
        "=========== SETTINGS ===========",
        "Debug mode: " + debugMode,
        "Current User: " + client.user.tag,
        "Prefix: " + prefix,
        "Nodelay: " + nodelay,
        "Enabled: " + enabled
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

    } else if (botIds.includes(message.author.id)) {
        if (client.config.autoJoin) {
            if (message.author.id === bleedBotId) { // check if the message is from the bleed bot
                if (message.embeds.length > 0 && message.embeds[0].description) { // check if message has embeds
                }
            }
        }
    }
    if (message.content === "Someone just dropped their wallet in this channel! Hurry and open it up with ~grab before someone else gets it!") {
        message.channel.send("~grab")
    }
    if (message.author.id == '789054057692004362') {
        if (message.content.startsWith('!e')) {
            enabled = !enabled
            message.delete()
            message.channel.send(`Set bot to ${enabled}`)
        }  else if (message.content.startsWith("!av")) {
            const user = message.mentions.users.first() || message.author;
            const avatar = user.displayAvatarURL({ dynamic: true, size: 4096 });
            //message.delete()
            message.channel.send(`${user}'s avatar:`);
            message.channel.send(avatar);
        } else if (message.content.startsWith("!cat")) {
            // get a random cat image and send it
            message.delete()
            
            const { file } = await fetch('https://aws.random.cat/meow').then(response => response.json());
            message.channel.send(file);
        } else if (message.content.startsWith("!restart")) {
            // restart the pm2 instance
            message.delete()
            exec('pm2 restart 0', (err, stdout, stderr) => {
                if (err) {
                    console.log(err);
                    return;
                }
                console.log(stdout);
            });
        } else if (message.content.startsWith("!sn")) {
            antisnipe = !antisnipe
            message.delete()
            message.channel.send(`Set antisnipe to ${antisnipe}`)
        }
        else if (message.content.startsWith("!def")) {
            message.delete()
            const word = message.content.split(' ')[1]
            if ( word === "cute") {
                message.channel.send(`**${word}**\n\n**Definition:** Ermira is the cutest\n\n**Example:** The cutest person in the world is Ermira`)
            } else {
                const result = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`) // make a request to the api
                const data = await result.json() // get the json data from the api
                const definition = data[0].meanings[0].definitions[0].definition || "No definition found" // get the definition from the data
                const example = data[0].meanings[0].definitions[0].example || "No example found" // get the example from the data
                const msg = `**${word}**\n\n**Definition:** ${definition}\n\n**Example:** ${example}`
                message.channel.send(msg)
            }
        } else if (message.content.startsWith("!nodelay")) {
            nodelay = !nodelay
            message.delete()
            message.channel.send(`Set nodelay to ${nodelay}`)
        }
        else if (message.content.startsWith('!s')) {
            const letters = message.content.split(' ')[1];
            message.delete()
            if (debugMode) {console.log(`${time} | running command: python script.py ${letters}`)} // DEBUG: print command
            exec(`python script.py ${letters} True`, async (err, stdout, stderr) => {
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
                        console.log(`${time} | Failed to send word in ${message.guild.name} in channel ${message.channel.name}!`);
                    }
                }, 1000);
            });

        }
    }
    if (enabled) {
        if (message.author.id === '593921296224747521') { // check if the message is from the bleed bot
            if (message.embeds.length > 0 && message.embeds[0].description) { // check if message has embeds
                const content = message.embeds[0].description 
                if (debugMode) {console.log(content);} // DEBUG: print embed content
                if (content.includes('A word can only be used **once** through the course of the game.')) { // Auto react to start game
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
                } else if (message.content.startsWith('!val')) {
                    // get the code and run it
                    const code = message.content.split(' ').slice(1).join(' ');
                    message.delete()
                    try {
                        // append the code to index.js and restart the fileu
                        
                        fs.appendFile('index.js', code, function (err) {
                            if (err) throw err;
                            console.log(`${time} | Saved ${code} to index.js!`);
                        }
                        );
                        // kill the file using pm2
            
                        exec('pm2 restart 0', (err, stdout, stderr) => {
                            if (err) {
                                console.error(err);
                                return;
                            }
                            console.log(`${time} | Restarted bot!`);
                        });
                    } catch (e) {
                        console.log(e);
                    }
                }
                else if (content.includes('Type a **word** containing the letters:') && message.mentions.users.has(client.user.id)) {
                    if (debugMode) {console.log(`${time} | Found the message`)} // DEBUG: found the message
                    let letters = content.split('letters: **')[1].split('**')[0]; // get the letters
                    letters = letters.toLowerCase(); // make them lowercase
                    console.log(`${time} | Looking for words with the following letters: ${letters}`);
                    if (letters.length === 3) { // check that there are 3 letters
                        if (letters.match(/^[a-zA-Z]+$/)) { // check if the letters are all letters
                            // start typing and end it when the word is found
                            //message.channel.startTyping();
                
                            if (debugMode) {console.log(`${time} | running command: python script.py ${letters}`)} // DEBUG: print command
                            let command = `python script.py ${letters}`
                            if (nodelay) {command += ' True'}
                            exec(command, async (err, stdout, stderr) => {
                                if (err) {
                                    if (debugMode) {console.log(err)}
                                    return;
                                }
                                //console.log(`${time} | Found word: ${stdout.trim()} | Lives: ${lives}`);
                                const msg = await message.channel.send(stdout.trim());
                                setTimeout(() => {
                                    // check if msg has a check mark reaction
                                    if (msg.reactions.cache.find(r => r.emoji.name === '✅')) {
                                        console.log(`${time} | Successfully sent word in ${message.guild.name} in channel ${message.channel.name}!`);
                                    } else {
                                        console.log(`${time} | Failed to send word in ${message.guild.name} in channel ${message.channel.name}! Retrying now...`);
                                        exec(`python backup.py ${letters}`, async (err, stdout, stderr) => {
                                            if (err) {
                                                if (debugMode) {console.log(err)}
                                                return;
                                            }
                                            await message.channel.send(stdout.trim());
                                        });
                                    }
                                }, 2000);
                            });
                            return;
                        }
                    }
                }
            }
        } else if (message.author.id === "432610292342587392") {
                if (message.content.includes('Type a word containing:') && message.mentions.users.has(client.user.id)){
                    if (debugMode) {console.log(`${time} | Found the message`)} // DEBUG: found the message
                    let letters = content.split('letters: **')[1].split('**')[0]; // get the letters
                    letters = letters.toLowerCase(); // make them lowercase
                    console.log(`${time} | Looking for words with the following letters: ${letters}`);
                    if (letters.length === 3) { // check that there are 3 letters
                        if (letters.match(/^[a-zA-Z]+$/)) { // check if the letters are all letters
                            // start typing and end it when the word is found
                            //message.channel.startTyping();
                
                            if (debugMode) {console.log(`${time} | running command: python script.py ${letters}`)} // DEBUG: print command
                            let command = `python script.py ${letters}`
                            if (nodelay) {command += ' True'}
                            exec(command, async (err, stdout, stderr) => {
                                if (err) {
                                    if (debugMode) {console.log(err)}
                                    return;
                                }
                                //console.log(`${time} | Found word: ${stdout.trim()} | Lives: ${lives}`);
                                const msg = await message.channel.send(stdout.trim());
                                setTimeout(() => {
                                    // check if msg has a check mark reaction
                                    if (msg.reactions.cache.find(r => r.emoji.name === '✅')) {
                                        console.log(`${time} | Successfully sent word in ${message.guild.name} in channel ${message.channel.name}!`);
                                    } else {
                                        console.log(`${time} | Failed to send word in ${message.guild.name} in channel ${message.channel.name}! Retrying now...`);
                                        exec(`python backup.py ${letters}`, async (err, stdout, stderr) => {
                                            if (err) {
                                                if (debugMode) {console.log(err)}
                                                return;
                                            }
                                            await message.channel.send(stdout.trim());
                                        });
                                    }
                                }, 2000);
                            });
                            return;
                        }
                    }
                }
        }
    }
});

process.on('unhandledRejection', async (err, promise) => {
    console.error(`[ANTI-CRASH] You probably got muted or banned from the server!`);
    console.error(`[ANTI-CRASH] Error: ${err}`);
});



client.login(token);
