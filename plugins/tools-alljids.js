let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        // Get all groups from the connection
        const groups = Object.values(await conn.groupFetchAllParticipating().catch(_ => ({})))
        
        if (groups.length === 0) {
            return m.reply('❌ No groups found.')
        }

        // Format the output
        let message = `📋 *All Joined Group JIDs*\n\n`
        message += `*Total Groups:* ${groups.length}\n\n`
        
        groups.forEach((group, index) => {
            message += `${index + 1}. *${group.subject}*\n`
            message += `   🆔 \`${group.id}\`\n\n`
        })

        await m.reply(message)
        
    } catch (error) {
        console.error('Error fetching groups:', error)
        m.reply(`❌ Error: ${error.message}`)
    }
}

handler.help = ['alljids', 'alljid']
handler.tags = ['owner', 'tools']
handler.command = /^(alljids|alljid)$/i
handler.owner = true

export default handler
