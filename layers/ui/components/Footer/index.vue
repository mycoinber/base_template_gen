<script setup>
import { useRequestURL } from "#app";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

const sharedLogo = useState("siteLogo", () => []);
const langPrefix = useState("siteLangPrefix", () => "");

const navigationLinks = computed(() => {
  const pages = Array.isArray(props.data?.pages) ? props.data.pages : [];
  return pages
    .map((page) => {
      let title = page.title || "";
      if (title.match(/[-–:|]/)) {
        title = title.split(/[-–:|]/)[0].trim();
      }

      return {
        name: page.homePage ? t("home") : title,
        slug: page.homePage ? "" : page.slug,
      };
    })
    .sort((a, b) => {
      if (a.name === t("home")) return -1;
      if (b.name === t("home")) return 1;
      return 0;
    });
});

const url = useRequestURL();
const siteDomain = `${url.protocol}//${url.host}`;

const resolvedLogo = computed(() => {
  const fromState = Array.isArray(sharedLogo.value) ? sharedLogo.value : [];
  if (fromState.length) {
    return fromState[0];
  }
  const fallback = props.data?.logo;
  if (Array.isArray(fallback) && fallback.length) {
    return fallback[0];
  }
  return null;
});

const siteTitle = computed(() => {
  return props.data?.siteName || props.data?.name || props.data?.head?.title || "site";
});

const normalizeRoutePath = (value) => {
  if (!value) return "";
  return String(value)
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\/{2,}/g, "/");
};

const resolveLink = (slug) => {
  const prefix = normalizeRoutePath(langPrefix.value || "");
  const destination = normalizeRoutePath(slug || "");
  const segments = [];
  if (prefix) segments.push(prefix);
  if (destination) segments.push(destination);
  const path = segments.join("/");
  return path ? `/${path}` : "/";
};
</script>

<template>
  <footer class="mt-16 max-[541px]:mt-10">
    <div class="container">
      <div class="panel-card overflow-hidden px-6 py-8 max-[541px]:px-4 max-[541px]:py-6">
        <div class="mb-8 flex items-start justify-between gap-8 max-[541px]:mb-6 max-[541px]:flex-col max-[541px]:items-start">
          <div class="flex flex-col gap-3">
            <NuxtLink :to="resolveLink('')" class="flex h-14 items-center max-[541px]:h-10">
              <NuxtImg
                v-if="resolvedLogo"
                :src="resolvedLogo?.path || ''"
                :alt="siteTitle"
                class="h-full w-auto object-contain"
              />
            </NuxtLink>
            <span class="text-[0.78rem] uppercase tracking-[0.1em] text-color-muted">Grey Eagle Canada Hub</span>
          </div>

          <nav>
            <ul class="m-0 flex list-none flex-wrap justify-end gap-x-5 gap-y-2 p-0 max-[541px]:justify-start">
              <li v-for="(link, index) in navigationLinks" :key="index" class="m-0">
                <NuxtLink
                  :to="resolveLink(link.slug)"
                  class="font-font-01 text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-color-soft no-underline transition-colors duration-300 hover:text-color-03"
                >{{ link.name }}</NuxtLink>
              </li>
            </ul>
          </nav>

          <div class="w-[10.5rem] h-[3rem] max-[541px]:w-full max-[541px]:h-auto">
            <AdsFooterCta :offers="data?.offers" />
          </div>
        </div>

        <div class="flex items-center justify-between gap-4 border-t border-border pt-4 text-[0.78rem] uppercase tracking-[0.07em] text-color-muted max-[541px]:flex-col max-[541px]:items-start">
          <span>
            &#169; 2026 {{ siteDomain }}
          </span>
          <span>Play responsibly. 21+ only.</span>
        </div>
      </div>
    </div>
  </footer>
</template>
