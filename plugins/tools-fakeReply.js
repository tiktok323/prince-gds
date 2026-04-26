
export async function before(m, { conn }) {

  const nam = "🟢 Prince✍🏻"

 
  global.fwc = {
    contextInfo: {
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: id_canal,
        serverMessageId: 100,
        newsletterName: nam
      }
    }
  }

  //---
  
  //global.business =  await conn.getBusinessProfile(conn.user.jid)
  
  //---
  
  
}
