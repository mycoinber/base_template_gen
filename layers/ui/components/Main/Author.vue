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
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
});

</script>

<template>
  <section>
    <div class="container">
      <div class="flex flex-col p-4 rounded-[0.625rem] bg-background-02" style="border: 1px solid var(--border);">
        <div class="flex gap-4 w-full max-[541px]:gap-2">
          <div class="block w-20 min-w-20 h-20 min-h-20 bg-background-02 rounded-full overflow-hidden" style="border: 1px solid var(--border);">
            <NuxtImg
              :src="authorImageSrc"
              :alt="authorPictures?.[0]?.alt || authorName || 'author'"
              sizes="80px"
              class="w-full h-full object-cover"
              @error="onAvatarError"
            />
          </div>

          <div class="flex flex-col gap-2 w-full">
            <div class="flex justify-between gap-8 w-full max-[541px]:flex-col-reverse max-[541px]:justify-start max-[541px]:gap-0">
              <h3 class="m-0 p-0">
                {{ authorName }}
              </h3>

              <time v-if="formattedDate" :datetime="publishedDateISO" class="text-sm text-right opacity-50">{{
                formattedDate
              }}</time>
            </div>

            <div class="flex flex-col gap-2">
              <span v-if="authorRole" class="font-font-02 opacity-50">{{ authorRole }}</span>
            </div>
          </div>
        </div>

        <p v-if="authorBio" class="text-sm opacity-50">{{ authorBio }}</p>
      </div>
    </div>
  </section>
</template>
