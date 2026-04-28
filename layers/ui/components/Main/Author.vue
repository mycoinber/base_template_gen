<script setup>
import { computed, ref, watch } from "vue";
import { resolveMediaPath } from "#layers/base/utils/mediaPath";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

const placeholderAvatar = "/avatar-placeholder.svg";
const config = useRuntimeConfig();

const author = computed(() => props.data?.author || props.data?.aiauthor || null);
const siteId = computed(() =>
  props.data?.website?.site || props.data?.siteId || config.public?.siteId || "",
);

const authorName = computed(() => {
  const currentAuthor = author.value;
  if (!currentAuthor) return "";
  const nameValue = currentAuthor?.name;
  if (typeof nameValue === "string" && nameValue.trim()) return nameValue.trim();
  const first = typeof nameValue?.first === "string" ? nameValue.first.trim() : "";
  const last = typeof nameValue?.last === "string" ? nameValue.last.trim() : "";
  const full = typeof nameValue?.full === "string" ? nameValue.full.trim() : "";
  return [first, last].filter(Boolean).join(" ").trim() || full || "";
});

const authorRole = computed(() => {
  const role = author.value?.role;
  return typeof role === "string" ? role.trim() : "";
});

const authorBio = computed(() => {
  const bio = author.value?.bio;
  return typeof bio === "string" ? bio.trim() : "";
});

const authorPictures = computed(() => {
  const currentAuthor = author.value;
  if (!currentAuthor) return [null];

  const picture = currentAuthor?.picture;
  if (Array.isArray(picture) && picture.length) return picture;
  if (picture && typeof picture === "object" && picture.path) return [picture];

  const avatarMedia = currentAuthor?.avatarMedia;
  if (Array.isArray(avatarMedia) && avatarMedia.length) return avatarMedia;
  if (avatarMedia && typeof avatarMedia === "object" && avatarMedia.path) return [avatarMedia];

  const avatar = currentAuthor?.avatar;
  if (avatar && typeof avatar === "object" && avatar.path) return [avatar];

  return [null];
});

const buildCandidatePaths = (rawPath) => {
  if (!rawPath || typeof rawPath !== "string") return [];
  const trimmed = rawPath.trim();
  if (!trimmed) return [];

  const candidates = [trimmed];
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const needsSitePrefix = normalized.startsWith("/resized/") || normalized.startsWith("/uploads/");
  if (needsSitePrefix && siteId.value) {
    candidates.push(`/siteid/${siteId.value}${normalized}`);
  }

  return candidates;
};

const authorImageCandidates = computed(() => {
  const image = authorPictures.value?.[0];
  const rawCandidates = [
    image?.path,
    image?.originalPath,
    ...(Array.isArray(image?.variants) ? image.variants.map((variant) => variant?.path) : []),
  ].filter(Boolean);

  const unique = [];
  for (const rawCandidate of rawCandidates) {
    for (const path of buildCandidatePaths(rawCandidate)) {
      const resolved = resolveMediaPath(path);
      if (resolved && !unique.includes(resolved)) {
        unique.push(resolved);
      }
    }
  }

  return unique;
});

const currentImageIndex = ref(0);
const onAvatarError = () => {
  if (currentImageIndex.value < authorImageCandidates.value.length) {
    currentImageIndex.value += 1;
  }
};

watch(authorImageCandidates, () => {
  currentImageIndex.value = 0;
});

const authorImageSrc = computed(() => {
  return authorImageCandidates.value[currentImageIndex.value] || placeholderAvatar;
});

const publishedDateISO = computed(() => {
  const raw = props.data?.createdAt || props.data?.updatedAt;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
});

const formattedDate = computed(() => {
  const raw = props.data?.createdAt || props.data?.updatedAt;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
});

</script>

<template>
  <section class="my-10 max-[541px]:my-6">
    <div class="container">
      <div class="panel-card flex flex-col gap-4 p-5 max-[541px]:p-4">
        <div class="flex w-full gap-4 max-[541px]:gap-3">
          <div class="block h-20 min-h-20 w-20 min-w-20 overflow-hidden rounded-full border border-border bg-background-02">
            <NuxtImg
              :src="authorImageSrc"
              :alt="authorPictures?.[0]?.alt || authorName || 'author'"
              sizes="80px"
              class="w-full h-full object-cover"
              @error="onAvatarError"
            />
          </div>

          <div class="flex w-full flex-col gap-2">
            <div class="flex w-full justify-between gap-8 max-[541px]:flex-col-reverse max-[541px]:justify-start max-[541px]:gap-1">
              <h3 class="m-0 p-0 text-color-white">
                {{ authorName }}
              </h3>

              <time v-if="formattedDate" :datetime="publishedDateISO" class="text-xs uppercase tracking-[0.08em] text-right text-color-muted">{{
                formattedDate
              }}</time>
            </div>

            <div class="flex flex-col gap-2">
              <span v-if="authorRole" class="eagle-pill w-fit">{{ authorRole }}</span>
            </div>
          </div>
        </div>

        <p v-if="authorBio" class="text-sm text-color-muted">{{ authorBio }}</p>
      </div>
    </div>
  </section>
</template>
