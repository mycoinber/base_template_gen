<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
})

const sharedLogo = useState('siteLogo', () => [])
const langPrefix = useState('siteLangPrefix', () => '')

const navigationLinks = computed(() => {
  return props.data?.pages
    .map((page) => {
      let title = page.title || ''
      if (title.match(/[-–:|]/)) {
        title = title.split(/[-–:|]/)[0].trim()
      }

      return {
        name: page.homePage ? t('home') : title,
        slug: page.homePage ? '' : page.slug,
      }
    })
    .sort((a, b) => {
      if (a.name === t('home')) return -1
      if (b.name === t('home')) return 1
      return 0
    })
})

const isMenuOpen = ref(false)
const isScrolled = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const updateScroll = () => {
  isScrolled.value = window.scrollY > 8
}

onMounted(() => {
  updateScroll()
  window.addEventListener('scroll', updateScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateScroll)
})

// Header CTA mirrors ads/hero logic (use offers.hero data)

const resolvedLogo = computed(() => {
  const fromState = Array.isArray(sharedLogo.value) ? sharedLogo.value : []
  if (fromState.length) {
    return fromState[0]
  }
  const fallback = props.data?.logo
  if (Array.isArray(fallback) && fallback.length) {
    return fallback[0]
  }
  return null
})

const siteTitle = computed(() => {
  return props.data?.siteName || props.data?.name || props.data?.head?.title || 'site'
})

// Header CTA logic moved to components/ads/HeaderCta.vue

const normalizeRoutePath = (value) => {
  if (!value) return ''
  return String(value)
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/')
}

const resolveLink = (slug) => {
  const prefix = normalizeRoutePath(langPrefix.value || '')
  const destination = normalizeRoutePath(slug || '')
  const segments = []
  if (prefix) segments.push(prefix)
  if (destination) segments.push(destination)
  const path = segments.join('/')
  return path ? `/${path}` : '/'
}
</script>

<template>
  <header class="sticky top-0 left-0 z-20 w-full bg-background-01">
    <div class="container">
      <div class="flex items-center justify-between gap-4 py-4">
        <div class="h-16 rounded overflow-hidden max-[541px]:h-10">
          <NuxtLink :to="resolveLink('')" class="flex h-full items-center w-fit">
            <NuxtImg
              v-if="resolvedLogo"
              :src="resolvedLogo?.path || ''"
              :alt="siteTitle"
              class="h-full w-auto object-contain"
            />
          </NuxtLink>
        </div>

        <nav class="max-w-[60%] max-[541px]:hidden">
          <ul class="flex items-center gap-8 list-none m-0 overflow-hidden">
            <li v-for="(link, index) in navigationLinks" :key="index">
              <NuxtLink
                :to="resolveLink(link.slug)"
                external
                class="block text-base font-medium text-color-white transition-colors duration-300 text-center hover:text-color-01 router-link-active:text-color-01"
                >{{ link.name }}</NuxtLink
              >
            </li>
          </ul>
        </nav>

        <div class="max-[541px]:hidden w-[10rem] h-[3.25rem]">
          <AdsHeaderCta :offers="data?.offers" />
        </div>

        <div class="relative hidden max-[541px]:flex w-6 h-6 cursor-pointer" @click="toggleMenu">
          <span
            :class="[
              'absolute left-0 top-1.5 h-0.5 w-full bg-white transition-all duration-300 rounded-sm origin-center',
              { 'top-1/2 -translate-y-1/2 rotate-45': isMenuOpen },
            ]"
          ></span>
          <span
            :class="[
              'absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-white transition-all duration-300 rounded-sm',
              { 'opacity-0': isMenuOpen },
            ]"
          ></span>
          <span
            :class="[
              'absolute left-0 bottom-1.5 h-0.5 w-full bg-white transition-all duration-300 rounded-sm origin-center',
              { 'bottom-auto top-1/2 -translate-y-1/2 -rotate-45': isMenuOpen },
            ]"
          ></span>
        </div>

        <nav
          v-if="isMenuOpen"
          class="absolute top-full left-0 w-full h-screen bg-background-01 pt-20 px-4 opacity-100 translate-y-0 transition-all duration-300 ease-in-out flex flex-col max-[541px]:flex"
        >
          <ul class="list-none m-0 p-0">
            <li v-for="(link, i) in navigationLinks" :key="i" class="mb-4">
              <NuxtLink :to="resolveLink(link.slug)" class="text-white text-base font-medium">{{
                link.name
              }}</NuxtLink>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </header>
</template>
