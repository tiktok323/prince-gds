import { smsg } from './lib/simple.js'
import { format } from 'util' 
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'

/**
 * @type {import('@whiskeysockets/baileys')}
 */
const { proto } = (await import('@whiskeysockets/baileys')).default
const isNumber = x => typeof x === 'number' && !isNaN(x)

const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(function () {
    clearTimeout(this)
    resolve()
}, ms))
 
/**
 * Handle messages upsert
 * @param {import('@whiskeysockets/baileys').BaileysEventMap<unknown>['messages.upsert']} groupsUpdate 
 */
export async function handler(chatUpdate) {

    let settings = {}
    
    // Define opts HERE at the start before any use
    const opts = global.opts || {}

    this.msgqueque = this.msgqueque || []

    if (!chatUpdate)
        return

    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m)
        return
    if (global.db.data == null)
        await global.loadDatabase()

    //--
    global.db.data ||= {}
    global.db.data.users ||= {}
    global.db.data.chats ||= {}
    global.db.data.stats ||= {}
    global.db.data.settings ||= {}
    
    try {
        m = smsg(this, m) || m
        if (!m)
            return
        m.exp = 0
        m.coin = 0
        m.diamond = false

        try {
            // =============================
            // USER INIT
            // =============================

            const userDefaults = {
                exp: 0,
                coin: 0,
                diamond: 20,
                bank: 0,
                registered: false,
                name: m.name,
                age: -1,
                regTime: -1,
                afk: -1,
                afkReason: '',
                banned: false,
                level: 0,
                role: 'Novice',
                autolevelup: false,
                // New fields from handler 2
                lastclaim: 0,
                warn: 0,
                chatbot: false,
                gender: 'Undecided',
                language: 'en',
                prem: false,
                premiumTime: 0,
                namebebot: '',
                isbebot: false,
            }

            if (!global.db.data.users[m.sender])
                global.db.data.users[m.sender] = {}

            let user = global.db.data.users[m.sender]

            for (let key in userDefaults) {
                if (!(key in user) || user[key] === undefined || user[key] === null) {
                    user[key] = userDefaults[key]
                }
            }

            // =============================
            // CHAT INIT
            // =============================

            const chatDefaults = {
                isBanned: false,
                welcome: false,
                detect: false,
                sWelcome: '',
                sBye: '',
                sPromote: '',
                sDemote: '',
                antiLink: false,
                nsfw: false,
                rules: '',
                antiBotClone: false,
                // New fields from handler 2
                antiDelete: true,
                antdeletelinks: false,
                antiSticker: false,
                antiToxic: false,
                antiver: true,
                anticmds: false,
                testf: false,
                antiLink2: false,
                antiTiktok: false,
                antiYoutube: false,
                antiTelegram: false,
                antiFacebook: false,
                antiInstagram: false,
                antiTwitter: false,
                antiDiscord: false,
                antiThreads: false,
                antiTwitch: false,
                antifake: false,
                autoapprove: false,
                getmsg: true,
                simi: false,
                useDocument: false,
                viewOnce: false,
                viewStory: false,
                antiBot: false,
                modoadmin: false,
                chatbot: false,
                princechat: false,
                expired: 0,
            }

            if (!global.db.data.chats[m.chat])
                global.db.data.chats[m.chat] = {}

            let chat = global.db.data.chats[m.chat]

            for (let key in chatDefaults) {
                if (!(key in chat) || chat[key] === undefined || chat[key] === null) {
                    chat[key] = chatDefaults[key]
                }
            }

            // =============================
            // SETTINGS INIT
            // =============================

            if (!global.db.data.settings)
                global.db.data.settings = {}

            if (this.user?.jid) {

                const settingDefaults = {
                    self: false,
                    autoread: false,
                    restrict: false,
                    status: 0,
                    solopv: false,
                    sologp: false,
                    // New fields from handler 2
                    autoread2: false,
                    alwaysonline: false,
                    pconly: false,
                    gconly: false,
                    anticommand: false,
                    antiPrivate: false,
                    antiCall: true,
                    antiSpam: true,
                    modoia: false,
                    jadibotmd: false,
                    statusview: false,
                    like: false,
                    autoreacts: false,
                    ownerreacts: false,
                }

                if (!global.db.data.settings[this.user.jid])
                    global.db.data.settings[this.user.jid] = {}

                settings = global.db.data.settings[this.user.jid]

                for (let key in settingDefaults) {
                    if (!(key in settings)) {
                        settings[key] = settingDefaults[key]
                    }
                }
            }

        } catch (e) {
            console.error('Error initializing data:', e)
        }

        //---- AA  

        // =============================
        // BASIC MESSAGE GUARDS
        // =============================

        const isGroup = m.chat?.endsWith('g.us')
        const text = typeof m.text === 'string' ? m.text : ''

        m.text = text

        // Listen mode (does not respond)
        if (opts.nyimak) return
        // Self mode (only responds to itself)
        if (opts.self && !m.fromMe) return
        // Private only
        if (settings.solopv && isGroup) return
        // Groups only (with allowed exceptions in private)
        if (settings.sologp && !isGroup) {
            const allowedPrivateCmd = [
                'jadibot','bebot','getcode','serbot','bots',
                'stop','support','donate','off','on','s',
                'tiktok','code','newcode','join'
            ]
            const firstWord = text.trim().split(' ')[0]
            const command = firstWord.replace(/^[!./#?]/, '').toLowerCase()
            if (!allowedPrivateCmd.includes(command)) return
        }
        // Status only
        if (opts.swonly && m.chat !== 'status@broadcast') return

        // =============================
        // ENV MODE CHECK (from handler 2)
        // =============================
        if (process.env.MODE?.toLowerCase() === 'private' && !(isROwner || isOwner)) return;

        // =============================
        // SAFE USER INIT (Minimal Fallback)
        // =============================

        if (!global.db.data.users[m.sender]) {
            global.db.data.users[m.sender] = {
                exp: 0,
                diamond: 20,
                level: 0,
                prem: false
            }
        }

        let _user = global.db.data && global.db.data.users && global.db.data.users[m.sender]

        
     const botNumber = this.user?.id?.replace(/:[0-9]+/g, '') || ''
const sender = ((await conn.getJid(m.sender)) || m.sender).split(':')[0] + '@s.whatsapp.net'
const normalize = v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net'

const isROwner = sender === botNumber || global.owner.some(v => sender === normalize(Array.isArray(v) ? v[0] : v))
const isOwner = isROwner || m.fromMe
const isMods = isOwner || global.mods.map(v => normalize(v)).includes(sender)
const isPrems = isROwner || global.prems.map(v => normalize(v)).includes(sender) || (_user?.prem === true)



        
        // =============================
        // GLOBAL BLOCK NUMBERS CHECK (from handler 2)
        // =============================
        if (global.blockNumbers?.includes(m.sender.replace(/[^0-9]/g, ''))) {
            global.db.data.users[m.sender] = global.db.data.users[m.sender] || {};
            global.db.data.users[m.sender].banned = true;
        }

        
if (opts['queque'] && m.text && !(isMods || isPrems)) {
            let queque = this.msgqueque, time = 1000 * 5
            const previousID = queque[queque.length - 1]
            queque.push(m.id || m.key.id)

            if (opts.queque && m.text && !(isMods || isPrems)) {
   let previousID = this.msgqueque[this.msgqueque.length - 1]
   this.msgqueque.push(m.id || m.key.id)

   while (this.msgqueque.includes(previousID)) {
      await delay(5000)
   }
}
}
        
      

        if (m.isBaileys)
            return
        m.exp += Math.ceil(Math.random() * 10)

        let usedPrefix
        const groupMetadata = m.isGroup ? await this.groupMetadata(m.chat).catch(() => null) : null
        const participants = groupMetadata?.participants || []
const user = (m.isGroup ? participants.find(u => { let id = this.decodeJid(u.id || u.jid); return [this.decodeJid(m.sender), this.decodeJid(m.key?.participant), this.decodeJid(m.participant)].filter(Boolean).includes(id) }) : {}) || {}
const bot = (m.isGroup ? participants.find(u => { let id = this.decodeJid(u.id || u.jid); return id === this.decodeJid(this.user.jid) || id === this.decodeJid(this.user.lid) }) : {}) || {}

const isRAdmin = user?.admin === 'superadmin' || this.decodeJid(groupMetadata?.owner) === this.decodeJid(m.sender)
const isAdmin = !!user?.admin || this.decodeJid(groupMetadata?.owner) === this.decodeJid(m.sender)
const isBotAdmin = !!bot?.admin

           

        // =============================
        // ALWAYS ONLINE FEATURE (from handler 2)
        // =============================
        let alwaysOnlineEnv = process.env.AlwaysOnline?.toLowerCase() === 'true';
        if (alwaysOnlineEnv || settings.alwaysonline) {
            conn.sendPresenceUpdate('available', m.chat);
        } else {
            conn.sendPresenceUpdate('unavailable', m.chat);
        }

        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
        
        // MOVED INSIDE LOOP - all plugin-related code inside for loop
        for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin)
                continue
            if (plugin.disabled)
                continue
            const __filename = join(___dirname, name)

            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: ___dirname,
                        __filename
                    })
                } catch (e) {
                    console.error(e)
                }
            }
            if (!opts['restrict'])
                if (plugin.tags && plugin.tags.includes('admin')) {
                    continue
                }
            
            // str2Regex and prefix handling moved INSIDE the loop
            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            let _prefix = plugin.customPrefix ? plugin.customPrefix : conn.prefix ? conn.prefix : global.prefix
            
            let match = (_prefix instanceof RegExp ? // RegExp Mode?
                [[_prefix.exec(m.text), _prefix]] :
                Array.isArray(_prefix) ? // Array?
                    _prefix.map(p => {
                        let re = p instanceof RegExp ? // RegExp in Array?
                            p :
                            new RegExp(str2Regex(p))
                        return [re.exec(m.text), re]
                    }) :
                    typeof _prefix === 'string' ? // String?
                        [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] :
                        [[[], new RegExp]]
            ).find(p => p[1])

            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, {
                    match,
                    conn: this,
                    participants,
                    groupMetadata,
                    user,
                    bot,
                    isROwner,
                    isOwner,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename
                }))
                    continue
            }

            if (typeof plugin !== 'function')
                continue

            if ((usedPrefix = (match[0] || '')[0])) {
                let noPrefix = m.text.replace(usedPrefix, '')
                let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
                args = args || []
                let _args = noPrefix.trim().split` `.slice(1)
                let text = _args.join` `
                command = (command || '').toLowerCase()
                let fail = plugin.fail || global.dfail
                let isAccept = plugin.command instanceof RegExp ?
                    plugin.command.test(command) :
                    Array.isArray(plugin.command) ?
                        plugin.command.some(cmd => cmd instanceof RegExp ?
                            cmd.test(command) :
                            cmd === command
                        ) :
                        typeof plugin.command === 'string' ?
                            plugin.command === command :
                            false

                if (!isAccept)
                    continue
                m.plugin = name
                if (m.chat in global.db.data.chats || m.sender in global.db.data.users) {
                    let chat = global.db.data.chats[m.chat]
                    let user = global.db.data.users[m.sender]
                    if (name != 'owner-unbanchat.js' && chat?.isBanned)
                        return
                    if (name != 'owner-unbanuser.js' && user?.banned)
                        return
                }

                if (global.blockNumbers?.includes(m.sender.replace(/[^0-9]/g, ''))) {
            global.db.data.users[m.sender] = global.db.data.users[m.sender] || {};
            global.db.data.users[m.sender].banned = true;
        }

                
                // =============================
                // MODOADMIN CHECK (from handler 2)
                // =============================
                let adminMode = global.db.data.chats[m.chat]?.modoadmin;
                let prince = `${plugin.botAdmin || plugin.admin || plugin.group || plugin || noPrefix || usedPrefix || m.text.slice(0, 1) == usedPrefix || plugin.command}`;
                if (adminMode && !isOwner && !isROwner && m.isGroup && !isAdmin && prince) return;

                if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) {
                    fail('owner', m, this)
                    continue
                }
                if (plugin.rowner && !isROwner) {
                    fail('rowner', m, this)
                    continue
                }
                if (plugin.owner && !isOwner) {
                    fail('owner', m, this)
                    continue
                }
                if (plugin.mods && !isMods) {
                    fail('mods', m, this)
                    continue
                }
                if (plugin.premium && !isPrems) {
                    fail('premium', m, this)
                    continue
                }
                if (plugin.group && !m.isGroup) {
                    fail('group', m, this)
                    continue
                } else if (plugin.botAdmin && !isBotAdmin) {
                    fail('botAdmin', m, this)
                    continue
                } else if (plugin.admin && !isAdmin) {
                    fail('admin', m, this)
                    continue
                }
                if (plugin.private && m.isGroup) {
                    fail('private', m, this)
                    continue
                }
                if (plugin.register == true && _user.registered == false) {
                    fail('unreg', m, this)
                    continue
                }
                m.isCommand = true
                let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17
                if (xp > 200)
                    m.reply('Nerd -_-')
                else
                    m.exp += xp
                if (!isPrems && plugin.diamond && global.db.data.users[m.sender].diamond < plugin.diamond * 1) {
                    this.reply(m.chat, `✳️ Your diamonds have run out\nuse the following command to buy more diamonds\n\n*${usedPrefix}buy*`, m)
                    continue
                }
                if (plugin.level > _user.level) {
                    this.reply(m.chat, `✳️ Level ${plugin.level} required to use this command. \nYour level ${_user.level}`, m)
                    continue
                }
                let extra = {
                    match,
                    usedPrefix,
                    noPrefix,
                    _args,
                    args,
                    command,
                    text,
                    conn: this,
                    participants,
                    groupMetadata,
                    user,
                    bot,
                    isROwner,
                    isOwner,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename
                }
                try {
                    await plugin.call(this, m, extra)
                    if (!isPrems)
                        m.diamond = m.diamond || plugin.diamond || false
                } catch (e) {
                    m.error = e
                    console.error(e)
                    if (e) {
                        let text = format(e)
                        for (let key of Object.values(global.APIKeys))
                            text = text.replace(new RegExp(key, 'g'), '#HIDDEN#')
                        m.reply(e)
                    }
                } finally {
                    if (typeof plugin.after === 'function') {
                        try {
                            await plugin.after.call(this, m, extra)
                        } catch (e) {
                            console.error(e)
                        }
                    }
                    if (m.diamond)
                        m.reply(`You used *${+m.diamond}* 💎`)
                }
                break
            }
        }
    } catch (e) {
        console.error(e)
    } finally {
        if (opts['queque'] && m.text) {
            const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id)
            if (quequeIndex !== -1)
                this.msgqueque.splice(quequeIndex, 1)
        }
        
        let user, stats = global.db.data.stats
        if (m) {
            if (m.sender && (user = global.db.data.users[m.sender])) {
                user.exp += m.exp
                user.diamond -= m.diamond * 1
            }

            let stat
            if (m.plugin) {
                let now = +new Date
                if (m.plugin in stats) {
                    stat = stats[m.plugin]
                    if (!isNumber(stat.total))
                        stat.total = 1
                    if (!isNumber(stat.success))
                        stat.success = m.error != null ? 0 : 1
                    if (!isNumber(stat.last))
                        stat.last = now
                    if (!isNumber(stat.lastSuccess))
                        stat.lastSuccess = m.error != null ? 0 : now
                } else
                    stat = stats[m.plugin] = {
                        total: 1,
                        success: m.error != null ? 0 : 1,
                        last: now,
                        lastSuccess: m.error != null ? 0 : now
                    }
                stat.total += 1
                stat.last = now
                if (m.error == null) {
                    stat.success += 1
                    stat.lastSuccess = now
                }
            }
        }

        try {
            if (!opts['noprint']) await (await import(`./lib/print.js`)).default(m, this)
        } catch (e) {
            console.log(m, m.quoted, e)
        }
        
        // =============================
        // AUTOREAD SETTINGS (from handler 2)
        // =============================
        let settingsREAD = global.db.data.settings[this.user.jid] || {};
        if (opts['autoread']) await this.readMessages([m.key]);
        if (settingsREAD.autoread2) await this.readMessages([m.key]);

        // =============================
        // STATUS VIEW & REACTIONS LOGIC (from handler 2)
        // =============================
        let bot = global.db.data.settings[this.user.jid] || {};
        let statusViewEnabled = process.env.STATUSVIEW?.toLowerCase() === 'true';
        let defaultEmojis = ['💚', '💛', '💓', '❤️', '💙'];
        let statusEmojis = process.env.StatusEmojies ? process.env.StatusEmojies.split(',') : defaultEmojis;
        let statusLikesEnabled = process.env.StatusLikes?.toLowerCase() === 'true';
        
        if ((statusViewEnabled || bot.statusview) && m.key.remoteJid === 'status@broadcast' && !m.fromMe) {
            await conn.readMessages([m.key]);
            if (bot.like || statusLikesEnabled) {
                const randomEmoji = statusEmojis[Math.floor(Math.random() * statusEmojis.length)];
                const me = await conn.decodeJid(conn.user.id);
                await conn.sendMessage(m.key.remoteJid, { react: { key: m.key, text: randomEmoji } }, { statusJidList: [m.key.participant, me] });
            }
        }

        // =============================
        // AUTO REACTION LOGIC (from handler 2)
        // =============================
        const autoReactionSetting = process.env.AutoReaction?.toLowerCase() || null;
        const dbAutoReact = global.db.data.settings[this.user.jid]?.autoreacts;
        const isGroupChat = typeof m.chat === 'string' && m.chat.endsWith('@g.us');
        const isPrivateChat = typeof m.chat === 'string' && !isGroupChat;
        const shouldReact =
            (autoReactionSetting === 'true' && (isGroupChat || isPrivateChat)) ||
            (autoReactionSetting === 'group' && isGroupChat) ||
            (autoReactionSetting === 'private' && isPrivateChat) ||
            (dbAutoReact && (isGroupChat || isPrivateChat));

        if (shouldReact && m.chat) {
            const emojis = process.env.autoreactions_emojies
                ? process.env.autoreactions_emojies.split(',')
                : ['💛', '🤍', '💗', '♥️', '💞', '💖', '💓', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💟', '🕊️', '🥀', '🦋', '🐣', '❤‍🩹', '♥️', '🌸', '❣️', '✨', '🎀', '🩷', '🖤', '🤍', '🤎', '💛', '💚', '🩵', '💙', '💜', '💟', '💓', '🩶'];

            if (m.text && m.text.match(/(prince|a|ا|م|ي|ء|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z)/gi)) {
                await this.sendMessage(m.chat, {
                    react: {
                        text: m.sender === '923092668108@s.whatsapp.net' ? '👑' : pickRandom(emojis),
                        key: m.key,
                    },
                });
            }

            if (m.message?.imageMessage || m.message?.videoMessage || m.message?.audioMessage) {
                await this.sendMessage(m.chat, {
                    react: {
                        text: pickRandom(emojis),
                        key: m.key,
                    },
                });
            }
        }

        // =============================
        // OWNER REACTS (from handler 2)
        // =============================
        if (m.fromMe && global.db.data.settings[this.user.jid]?.ownerreacts) {
            this.sendMessage(m.chat, {
                react: {
                    text: process.env.owner_react_emojie || '💛',
                    key: m.key,
                },
            });
        }
    }
}

// Utility function for pickRandom
function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

/**
 * Handle groups participants update
 */
export async function participantsUpdate({ id, participants, action }) {
    if (opts['self']) return
    if (global.db.data == null) await loadDatabase()

    let chat = global.db.data.chats[id] || {}
    let text = ''

    // Normalizer for v7
    const normalize = (p) =>
        typeof p === 'string' ? p : p?.id

    switch (action) {
        case 'add':
        case 'remove':
            if (!chat.welcome) break

            let groupMetadata =
                await this.groupMetadata(id).catch(_ => null) ||
                (conn.chats[id] || {}).metadata

            if (!groupMetadata) return

            for (let participant of participants) {
                const user = normalize(participant)
                if (!user) continue

                let pp = 'https://i.ibb.co/1ZxrXKJ/avatar-contact.jpg'
                let ppgp = 'https://i.ibb.co/1ZxrXKJ/avatar-contact.jpg'

                try { pp = await this.profilePictureUrl(user, 'image') } catch {}
                try { ppgp = await this.profilePictureUrl(id, 'image') } catch {}

                text = (action === 'add'
                    ? (chat.sWelcome || this.welcome || conn.welcome || 'Welcome, @user')
                        .replace('@group', await this.getName(id))
                        .replace('@desc', groupMetadata.desc?.toString() || 'Unknown')
                    : (chat.sBye || this.bye || conn.bye || 'Goodbye, @user')
                ).replace('@user', '@' + user.split('@')[0])

                try {
                    let imageUrl = action === 'add'
                        ? API('fgmods', '/api/welcome', {
                            username: await this.getName(user),
                            groupname: await this.getName(id),
                            groupicon: ppgp,
                            membercount: groupMetadata.participants?.length || 0,
                            profile: pp,
                            background: 'https://i.ibb.co/fkFmQC2/eve.jpg'
                        }, 'apikey')
                        : API('fgmods', '/api/goodbye2', {
                            username: await this.getName(user),
                            groupname: await this.getName(id),
                            groupicon: ppgp,
                            membercount: groupMetadata.participants?.length || 0,
                            profile: pp,
                            background: 'https://i.ibb.co/jh9367t/akali.jpg'
                        }, 'apikey')

                    await this.sendFile(id, imageUrl, 'welcome.jpg', text, null, false, {
                        mentions: [user]
                    })
                } catch {
                    await this.sendFile(id, pp, 'profile.jpg', text, null, false, {
                        mentions: [user]
                    })
                }
            }
            break

        case 'promote':
        case 'demote':
            if (!chat.detect) break

            for (let participant of participants) {
                const user = normalize(participant)
                if (!user) continue

                let pp = await this.profilePictureUrl(user, 'image')
                    .catch(_ => 'https://i.ibb.co/1ZxrXKJ/avatar-contact.jpg')

                text = action === 'promote'
                    ? (chat.sPromote || this.spromote || conn.spromote || '@user is now an administrator')
                    : (chat.sDemote || this.sdemote || conn.sdemote || '@user is no longer an administrator')

                text = text.replace('@user', '@' + user.split('@')[0])

                await this.sendFile(id, pp, 'pp.jpg', text, null, false, {
                    mentions: [user]
                })
            }
            break
    }
}

/**
 * Handle groups update
 */
export async function groupsUpdate(groupsUpdate) {
    if (opts['self'])
        return
    for (const groupUpdate of groupsUpdate) {
        const id = groupUpdate.id
        if (!id) continue
        let chats = global.db.data.chats[id], text = ''
        if (!chats?.detect) continue
        if (groupUpdate.desc) text = (chats.sDesc || this.sDesc || conn.sDesc || 'Description changed to \n@desc').replace('@desc', groupUpdate.desc)
        if (groupUpdate.subject) text = (chats.sSubject || this.sSubject || conn.sSubject || 'Group name changed to \n@group').replace('@group', groupUpdate.subject)
        if (groupUpdate.icon) text = (chats.sIcon || this.sIcon || conn.sIcon || 'Group icon changed to').replace('@icon', groupUpdate.icon)
        if (groupUpdate.revoke) text = (chats.sRevoke || this.sRevoke || conn.sRevoke || 'Group link changed to\n@revoke').replace('@revoke', groupUpdate.revoke)
        if (!text) continue
        await this.sendMessage(id, { text, mentions: this.parseMention(text) })
    }
}


//ANTIDELETE WILL BSE HERE🟢 

export async function deleteUpdate(update) {
    try {
        const { key, update: msgUpdate } = update || {}
        if (!key || !msgUpdate) return

        const { remoteJid, id, participant, fromMe } = key
        if (fromMe) return

        // Detect delete
        const isDelete =
            msgUpdate?.message?.protocolMessage?.type === 0 ||
            msgUpdate?.messageStubType === 1

        if (!isDelete) return

        // ✅ Check ENV only
        const isGlobalOn = (process.env.antidelete || 'false').toLowerCase() === 'true'
        if (!isGlobalOn) return

        // Load original message
        let raw = await this.loadMessage(remoteJid, id)
        if (!raw || !raw.message) return

        if (!raw.key) raw.key = {}
        if (raw.key.fromMe === undefined) raw.key.fromMe = false

        let msg = this.serializeM ? this.serializeM(raw) : raw
        let user = participant || remoteJid

        // ===== Info Design =====
        let pushName = msg.pushName || 'Unknown'
        let type = Object.keys(msg.message || {})[0] || 'unknown'
        let text =
            msg.text ||
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            'No text'

        let info = `
╭━━━〔 🛑 Anti Delete Alert 〕━━━⬣
┃ 👤 User  : ${pushName}
┃ 🔢 Number: @${user.split('@')[0]}
┃ 💬 Type  : ${type}
┃ 📝 Message:
┃ ${text}
╰━━━━━━━━━━━━━━━━━━━━⬣
`.trim()

        // ✅ Forward to bot JID only
        let botJid = this.user?.id?.replace(/:[0-9]+/g, '') || ''

        await this.sendMessage(botJid, {
            text: info,
            mentions: [user]
        }).catch(() => {})

        await this.copyNForward(botJid, raw).catch(() => {})

    } catch (e) {
        console.error('AntiDelete Error:', e)
    }
}



// =============================
// PRESENCE UPDATE - from handler 2
// =============================
export async function presenceUpdate(presenceUpdate) {
    const id = presenceUpdate.id;
    const nouser = Object.keys(presenceUpdate.presences);
    const status = presenceUpdate.presences[nouser]?.lastKnownPresence;
    const user = global.db.data.users[nouser[0]];
    if (user?.afk && status === 'composing' && user.afk > -1) {
        if (user.banned) {
            user.afk = -1;
            user.afkReason = 'User Banned Afk';
            return;
        }
        const username = nouser[0].split('@')[0];
        const caption = `\n@${username} has stopped being AFK and is currently typing.\n\nReason: ${user.afkReason || 'No Reason'}\n`;
        this.reply(id, caption, null, { mentions: this.parseMention(caption) });
        user.afk = -1;
        user.afkReason = '';
    }
}

global.dfail = (type, m, conn) => {
    let msg = {
        rowner: `👑 This command can only be used by the *Bot Creator*`,
        owner: `🔱 This command can only be used by the *Owner and Sub Bots*`,
        mods: `🔰 This function is only for *Bot Moderators*`,
        premium: `💠 This command is only for *Premium* members\n\nType */premium* for more info`,
        group: `⚙️ This command can only be used in groups`,
        private: `📮 This command can only be used in the Bot's *private chat*`,
        admin: `🛡️ This command is only for group *Admins*`,
        botAdmin: `💥 To use this command I must be *Administrator!*`,
        unreg: `📇 Register to use this function by typing:\n\n*/reg*`,
        restrict: '🔐 This feature is *disabled*'
    }[type]
    if (msg) return m.reply(msg)
}

//let file = global.__filename(import.meta.url, true)
let file = typeof global.__filename === 'function' ? global.__filename(import.meta.url, true) : fileURLToPath(import.meta.url)
watchFile(file, async () => {
    unwatchFile(file)
    console.log(chalk.magenta("✅  Updated 'handler.js'"))
    if (global.reloadHandler) console.log(await global.reloadHandler())
})
