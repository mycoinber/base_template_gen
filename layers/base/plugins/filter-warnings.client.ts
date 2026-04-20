export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.dev) return

  const vueApp = nuxtApp.vueApp
  vueApp.config.warnHandler = () => {
    // no-op in production
  }
})
