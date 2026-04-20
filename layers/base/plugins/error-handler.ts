// plugins/error-handler.ts
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("vue:error", (err) => {
    // Здесь вы можете настроить логирование ошибок или другие действия
    void err;
  });
});
