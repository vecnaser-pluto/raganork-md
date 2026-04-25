const { command } = require('../lib');
const { default: makeWASocket, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs');
const pino = require('pino');

command(
    {
        pattern: 'pair ?(.*)',
        fromMe: true, // IMPORTANT: only YOU can run this
        desc: 'Temp pairing code generator',
        type: 'owner'
    },
    async (message, match) => {
        let number = match.replace(/[^0-9]/g, '');
        
        if (!number) return await message.reply('Usage: .pair 919876543210');
        if (number.length < 11) return await message.reply('Use country code bro: .pair 919876543210');
        
        await message.reply(`Generating code for +${number}... 5 sec`);
        
        try {
            let path = './session_temp';
            if (fs.existsSync(path)) fs.rmSync(path, { recursive: true, force: true });
            fs.mkdirSync(path, { recursive: true });
            
            const { state, saveCreds } = await useMultiFileAuthState(path);
            
            let tempSock = makeWASocket({
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false,
                auth: state,
                browser: Browsers.macOS('Desktop')
            });
            
            tempSock.ev.on('creds.update', saveCreds);
            
            setTimeout(async () => {
                try {
                    let code = await tempSock.requestPairingCode(number);
                    await message.reply(`*Pair Code: ${code}*\n\nWhatsApp → Linked Devices → Link with phone number\n\nExp in 20 sec. After linking, delete this plugin + restart bot.`);
                } catch (e) {
                    await message.reply('Failed: ' + e.message);
                }
            }, 3000);
            
            tempSock.ev.on('connection.update', async ({ connection }) => {
                if (connection === 'open') {
                    await message.reply('✅ Linked +'+ number +' successfully!\n\nNow delete /plugins/pair_temp.js and restart bot to remove this command.');
                    tempSock.end();
                }
            });
            
        } catch (e) {
            await message.reply('Error bro: ' + e.message);
        }
    }
);
