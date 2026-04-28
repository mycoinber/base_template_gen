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
  const pages = Array.isArray(props.data?.pages) ? props.data.pages : []
  return pages
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

const closeMenu = () => {
  isMenuOpen.value = false
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
  <header
    class="sticky top-0 left-0 z-30 w-full transition-all duration-300"
    :class="isScrolled ? 'pt-2' : 'pt-4'"
  >
    <div class="container">
      <div
        class="glass-shell relative flex items-center justify-between gap-4 rounded-[1.1rem] px-4 py-3 max-[541px]:rounded-[0.9rem]"
        :class="isScrolled ? 'shadow-[0_1rem_2.2rem_rgba(2,7,16,.48)]' : 'shadow-[0_.75rem_1.8rem_rgba(2,7,16,.32)]'"
      >
        <div class="flex items-center gap-3">
          <NuxtLink :to="resolveLink('')" class="flex h-12 items-center max-[541px]:h-10" @click="closeMenu">
            <NuxtImg
              v-if="resolvedLogo"
              :src="resolvedLogo?.path || ''"
              :alt="siteTitle"
              class="h-full w-auto object-contain"
            />
          </NuxtLink>

          <span class="eagle-pill max-[541px]:hidden">Canada 21+</span>
        </div>

        <nav class="max-w-[58%] max-[541px]:hidden">
          <ul class="m-0 flex list-none items-center gap-6 overflow-hidden p-0">
            <li v-for="(link, index) in navigationLinks" :key="index" class="m-0">
              <NuxtLink
                :to="resolveLink(link.slug)"
                class="font-font-01 block text-[0.88rem] font-semibold uppercase tracking-[0.08em] text-color-soft transition-colors duration-300 hover:text-color-03"
              >{{ link.name }}</NuxtLink>
            </li>
          </ul>
        </nav>

        <div class="max-[541px]:hidden w-[10.5rem] h-[3rem]">
          <AdsHeaderCta :offers="data?.offers" />
        </div>

        <button
          type="button"
          class="relative hidden h-9 w-9 items-center justify-center rounded-[0.55rem] border border-border bg-background-02 max-[541px]:flex"
          @click="toggleMenu"
        >
          <span
            :class="[
              'absolute h-0.5 w-5 bg-color-white transition-all duration-300',
              isMenuOpen ? 'rotate-45' : '-translate-y-1.5',
            ]"
          ></span>
          <span
            :class="[
              'absolute h-0.5 w-5 bg-color-white transition-all duration-300',
              isMenuOpen ? 'opacity-0' : 'opacity-100',
            ]"
          ></span>
          <span
            :class="[
              'absolute h-0.5 w-5 bg-color-white transition-all duration-300',
              isMenuOpen ? '-rotate-45' : 'translate-y-1.5',
            ]"
          ></span>
        </button>

        <div
          v-if="isMenuOpen"
          class="glass-shell absolute left-0 top-[calc(100%+0.6rem)] w-full rounded-[0.95rem] border border-border p-4 max-[541px]:block"
        >
          <ul class="m-0 mb-4 list-none p-0">
            <li v-for="(link, i) in navigationLinks" :key="i" class="mb-2 last:mb-0">
              <NuxtLink
                :to="resolveLink(link.slug)"
                class="font-font-01 block rounded-[0.6rem] px-3 py-2 text-[0.9rem] uppercase tracking-[0.07em] text-color-soft no-underline hover:bg-background-03 hover:text-color-03"
                @click="closeMenu"
              >{{ link.name }}</NuxtLink>
            </li>
          </ul>
          <AdsHeaderCta :offers="data?.offers" />
        </div>
      </div>
    </div>
  </header>
</template>
