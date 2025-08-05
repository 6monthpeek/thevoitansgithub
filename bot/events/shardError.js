// 📁 events/shardError.js
module.exports = {
  name: "shardError",
  execute(error) {
    console.error("Shard hatası:", error);
  },
};