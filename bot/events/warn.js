// 📁 events/warn.js
module.exports = {
  name: "warn",
  execute(info) {
    console.warn("Uyarı:", info);
  },
};