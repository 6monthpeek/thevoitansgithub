// 📁 events/error.js
module.exports = {
  name: "error",
  execute(error) {
    console.error("Bir hata oluştu:", error);
  },
};