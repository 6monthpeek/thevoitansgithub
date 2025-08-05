// 📁 events/rateLimit.js
module.exports = {
  name: "rateLimit",
  execute(info) {
    console.warn("Rate limit uyarısı:", info);
  },
};