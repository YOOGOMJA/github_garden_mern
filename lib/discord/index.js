import config from "../../db/config.json";
import Discord from "discord.js";
import * as COMMANDS from "./commands";
const bot = new Discord.Client();
bot.commands = new Discord.Collection();

bot.login(config.discord_auth_token);

bot.on("ready", () => {
    console.log("logged in");
    Object.keys(COMMANDS).map((key) => {
        bot.commands.set(COMMANDS[key].name, COMMANDS[key]);
    });
});

bot.on("message", (msg) => {
    const args = msg.content.split(/ +/);
    const command = args.shift().toLowerCase();
    console.info(`Called command: ${command}`);

    if (!bot.commands.has(command)) return;

    try {
        bot.commands.get(command).execute(msg, args);
    } catch (error) {
        console.error(error);
        msg.reply("there was an error trying to execute that command!");
    }
});

export default bot;
