// 📁 events/ready.js
module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`[READY] ${client.user.tag} başarıyla giriş yaptı.`);
  },
};